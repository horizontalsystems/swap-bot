import { MemolessAssetItem, QuoteResponse, TokenListItem } from '../types/context'

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
  destinationAddress: string
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
    destinationAddress: params.destinationAddress,
    providers: params.providers,
    dry: params.dry
  }

  if (params.refundAddress) {
    body.refundAddress = params.refundAddress
  }

  console.log('[API] Requesting quote:', JSON.stringify(body, null, 2))

  return apiRequest<QuoteResponse>('/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

// --- Tokens ---

export async function fetchAllTokens(): Promise<TokenListItem[]> {
  return apiRequest<TokenListItem[]>('/tokens/all')
}

// --- Memoless (no auth) ---

const MEMOLESS_API_BASE = 'https://swap.unstoppable.money/memoless/api/v1'

export async function fetchMemolessAssets(): Promise<string[]> {
  const response = await fetch(`${MEMOLESS_API_BASE}/assets`)
  if (!response.ok) {
    throw new Error(`Memoless API error (${response.status})`)
  }
  const data = (await response.json()) as { success: boolean; assets: MemolessAssetItem[] }
  return data.assets.filter(a => a.status === 'Available').map(a => a.asset)
}

interface MemolessRegisterResponse {
  reference: string
  suggested_in_asset_amount: string
}

interface MemolessPreflightResponse {
  data: {
    qr_code_data_url: string
    inbound_address: string
    seconds_remaining?: number
  }
}

export async function registerMemoless(params: {
  asset: string
  memo: string
  requested_in_asset_amount: string
}): Promise<MemolessRegisterResponse> {
  console.log('[Memoless] Register request:', JSON.stringify(params, null, 2))
  const response = await fetch(`${MEMOLESS_API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const text = await response.text()
  console.log(`[Memoless] Register response (${response.status}):`, text)
  if (!response.ok) {
    throw new Error(`Memoless register error (${response.status}): ${text}`)
  }
  return JSON.parse(text) as MemolessRegisterResponse
}

export async function preflightMemoless(params: {
  asset: string
  reference: string
  amount: string
}): Promise<MemolessPreflightResponse> {
  console.log('[Memoless] Preflight request:', JSON.stringify(params, null, 2))
  const response = await fetch(`${MEMOLESS_API_BASE}/preflight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const text = await response.text()
  console.log(`[Memoless] Preflight response (${response.status}):`, text)
  if (!response.ok) {
    throw new Error(`Memoless preflight error (${response.status}): ${text}`)
  }
  return JSON.parse(text) as MemolessPreflightResponse
}
