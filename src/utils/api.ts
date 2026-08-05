import { QuoteResponse, TokenListItem } from '../types/context'

const API_BASE = 'https://swap-api.unstoppable.money/v1'
const SLIPPAGE = 1

function getApiKey(): string {
  const apiKey = process.env.SWAP_API_KEY
  if (!apiKey) {
    throw new Error('SWAP_API_KEY is missing in .env')
  }
  return apiKey
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey()
  const url = `${API_BASE}${endpoint}`

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    ...((options.headers as Record<string, string>) || {})
  }

  let response: Response

  try {
    response = await fetch(url, { ...options, headers })
  } catch (networkError) {
    console.error('[API] Network error:', networkError)
    throw new Error(`Network error: ${networkError instanceof Error ? networkError.message : 'Could not reach API'}`)
  }

  const responseText = await response.text()
  console.log(`[API] ${options.method || 'GET'} ${endpoint} — ${response.status}`)
  try {
    console.log(JSON.stringify(JSON.parse(responseText), null, 2))
  } catch {
    console.log(responseText)
  }

  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${responseText}`)
  }

  try {
    return JSON.parse(responseText) as T
  } catch {
    throw new Error(`Failed to parse API response: ${responseText}`)
  }
}

// --- Quote ---

interface QuoteParams {
  sellAsset: string
  buyAsset: string
  sellAmount: string
  destinationAddress?: string
  providers: string[]
  dry: boolean
  refundAddress?: string
}

export async function fetchQuote(params: QuoteParams): Promise<QuoteResponse> {
  const body: Record<string, unknown> = {
    sellAsset: params.sellAsset,
    buyAsset: params.buyAsset,
    sellAmount: params.sellAmount,
    slippage: SLIPPAGE,
    providers: params.providers,
    dry: params.dry
  }

  if (params.destinationAddress) {
    body.destinationAddress = params.destinationAddress
  }

  if (params.refundAddress) {
    body.refundAddress = params.refundAddress
  }

  console.log('[API] Requesting quote:', JSON.stringify(body, null, 2))

  try {
    return await apiRequest<QuoteResponse>('/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (error) {
    // 404 means all providers failed — parse provider errors instead of throwing raw response
    if (error instanceof Error && error.message.includes('API error (404)')) {
      const jsonStart = error.message.indexOf('{')
      if (jsonStart !== -1) {
        try {
          const parsed = JSON.parse(error.message.slice(jsonStart))
          const providerErrors = Array.isArray(parsed.providerErrors) ? parsed.providerErrors : []
          return { routes: [], providerErrors }
        } catch {
          /* fall through */
        }
      }
    }
    throw error
  }
}

// --- Tokens ---

export async function fetchAllTokens(): Promise<TokenListItem[]> {
  return apiRequest<TokenListItem[]>('/tokens/all')
}

// --- AML precheck ---

// QUICKEX is the only provider that exposes the AML address precheck
const AML_PRECHECK_PROVIDERS = ['QUICKEX', 'THORCHAIN']

interface AmlCheckResponse {
  // true = all passed, false = at least one flagged, null = inconclusive
  passedAmlCheck: boolean | null
  results: { address: string; passed?: boolean; completed?: boolean; error?: string }[]
}

export async function checkAddresses(addresses: string[]): Promise<AmlCheckResponse> {
  const query = addresses.map(encodeURIComponent).join(',')
  return apiRequest<AmlCheckResponse>(`/quote/check-addresses?addresses=${query}`)
}

// Returns the flagged address when the swap must be blocked, otherwise null.
// Non-precheck providers, an inconclusive (null) result, or a service error never block.
export async function amlFlaggedAddress(provider: string, addresses: (string | undefined)[]): Promise<string | null> {
  if (!AML_PRECHECK_PROVIDERS.includes(provider)) return null

  const list = addresses.filter((a): a is string => !!a)
  if (list.length === 0) return null

  try {
    const { passedAmlCheck, results } = await checkAddresses(list)
    if (passedAmlCheck !== false) return null
    // the server stops at the first failed address, so it's the one to surface
    return results.find(r => r.passed === false)?.address ?? list[0]
  } catch (error) {
    console.error('[AML] precheck failed, allowing swap:', error)
    return null
  }
}
