import { ProviderError, QuoteRoute, RateResponse, TokenListItem } from '../types/context'

const API_BASE = 'https://swap-api.unstoppable.money/v2'
const SLIPPAGE = 1
// `/rate` fans out across every provider, so give it room — but a request that never
// answers must fail rather than hold the chat handler (and everything queued behind it).
const REQUEST_TIMEOUT_MS = 30_000

/**
 * Each bot runs as its own process and bills the swap API under its own key, so usage and
 * rate limits stay separable per chat platform. There is no shared key to fall back on:
 * the entrypoint claims its own with `useApiKeyFor()` at startup, which throws right there
 * if the key is missing rather than letting the bot come up and fail on the first quote.
 */
export type BotPlatform = 'telegram' | 'simplex' | 'signal'

const PLATFORM_KEY_ENV: Record<BotPlatform, string> = {
  telegram: 'SWAP_API_KEY_TELEGRAM',
  simplex: 'SWAP_API_KEY_SIMPLEX',
  signal: 'SWAP_API_KEY_SIGNAL'
}

let platform: BotPlatform | undefined

/** Call once at startup, after `dotenv.config()` and before the first API request. */
export function useApiKeyFor(bot: BotPlatform): void {
  const envName = PLATFORM_KEY_ENV[bot]
  if (!process.env[envName]) {
    throw new Error(`${envName} is missing in .env`)
  }

  platform = bot
  console.log(`[API] Using ${envName}`)
}

function getApiKey(): string {
  if (!platform) {
    throw new Error('No swap API key selected — call useApiKeyFor() at startup')
  }

  const envName = PLATFORM_KEY_ENV[platform]
  const apiKey = process.env[envName]
  if (!apiKey) {
    throw new Error(`${envName} is missing in .env`)
  }

  return apiKey
}

/** A non-2xx response. Carries the parsed body so callers can read the provider error. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
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
    response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (networkError) {
    console.error('[API] Network error:', networkError)
    if (networkError instanceof Error && networkError.name === 'TimeoutError') {
      throw new Error(`Network error: API did not respond within ${REQUEST_TIMEOUT_MS / 1000}s`)
    }
    throw new Error(`Network error: ${networkError instanceof Error ? networkError.message : 'Could not reach API'}`)
  }

  const responseText = await response.text()
  console.log(`[API] ${options.method || 'GET'} ${endpoint} — ${response.status}`)

  let parsed: unknown
  let parseFailed = false
  try {
    parsed = JSON.parse(responseText)
    console.log(JSON.stringify(parsed, null, 2))
  } catch {
    parseFailed = true
    console.log(responseText)
  }

  if (!response.ok) {
    throw new ApiError(response.status, parseFailed ? null : parsed, `API error (${response.status}): ${responseText}`)
  }

  if (parseFailed) {
    throw new Error(`Failed to parse API response: ${responseText}`)
  }

  return parsed as T
}

/**
 * Turn a failed commit into something worth showing a user. `/v2/swap` answers with the
 * provider's own error body — `{ error, provider, errorCode?, minimumAmount?, maximumAmount? }` —
 * but a fan-out failure wraps it in `providerErrors`, so read either shape.
 */
function providerErrorMessage(error: ApiError): string {
  const body = error.body as (Partial<ProviderError> & { message?: string; providerErrors?: ProviderError[] }) | null
  const detail = body?.providerErrors?.[0] ?? body

  const base = detail?.error ?? (detail as { message?: string } | null)?.message ?? `API error (${error.status})`

  const bounds: string[] = []
  if (detail?.minimumAmount != null) bounds.push(`min ${detail.minimumAmount}`)
  if (detail?.maximumAmount != null) bounds.push(`max ${detail.maximumAmount}`)

  return bounds.length ? `${base} (${bounds.join(', ')})` : base
}

// --- Rate: compare routes (read-only, creates nothing) ---

interface RateParams {
  sellAsset: string
  buyAsset: string
  sellAmount: string
  providers: string[]
}

export async function fetchRate(params: RateParams): Promise<RateResponse> {
  const body = {
    sellAsset: params.sellAsset,
    buyAsset: params.buyAsset,
    sellAmount: params.sellAmount,
    slippage: SLIPPAGE,
    providers: params.providers
  }

  console.log('[API] Requesting rate:', JSON.stringify(body, null, 2))

  try {
    return await apiRequest<RateResponse>('/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (error) {
    // 404 means every provider declined — the body still says why, so surface that
    // as an empty route list rather than a failure.
    if (error instanceof ApiError && error.status === 404) {
      const errors = (error.body as { providerErrors?: ProviderError[] } | null)?.providerErrors
      return { routes: [], providerErrors: Array.isArray(errors) ? errors : [] }
    }
    throw error
  }
}

// --- Swap: commit with one provider (creates the real order) ---

interface SwapParams {
  sellAsset: string
  buyAsset: string
  sellAmount: string
  provider: string
  destinationAddress: string
  refundAddress?: string
}

/**
 * Commits the swap. Unlike `/rate` this returns the executable route **directly** (no
 * `{ routes }` wrapper), carrying the `execution` block and the `uuid` to track by.
 */
export async function fetchSwap(params: SwapParams): Promise<QuoteRoute> {
  const body: Record<string, unknown> = {
    sellAsset: params.sellAsset,
    buyAsset: params.buyAsset,
    sellAmount: params.sellAmount,
    slippage: SLIPPAGE,
    provider: params.provider,
    destinationAddress: params.destinationAddress
  }

  if (params.refundAddress) {
    body.refundAddress = params.refundAddress
  }

  console.log('[API] Requesting swap:', JSON.stringify(body, null, 2))

  try {
    return await apiRequest<QuoteRoute>('/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(providerErrorMessage(error))
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
const AML_PRECHECK_PROVIDERS = ['QUICKEX']

interface AmlCheckResponse {
  // true = all passed, false = at least one flagged, null = inconclusive
  passedAmlCheck: boolean | null
  results: { address: string; passed?: boolean; completed?: boolean; error?: string }[]
}

export async function checkAddresses(addresses: string[]): Promise<AmlCheckResponse> {
  const query = addresses.map(encodeURIComponent).join(',')
  return apiRequest<AmlCheckResponse>(`/check-addresses?addresses=${query}`)
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
