import { MemolessAssetItem } from '../types/context'

const MEMOLESS_API_BASE = 'https://swap.unstoppable.money/memoless/api/v1'

export async function fetchMemolessAssets(): Promise<string[]> {
  console.log('[Memoless] Fetching assets...')
  const response = await fetch(`${MEMOLESS_API_BASE}/assets`)
  const text = await response.text()
  console.log(`[Memoless] Assets response (${response.status}):`)
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
  if (!response.ok) {
    throw new Error(`Memoless API error (${response.status}): ${text}`)
  }
  const data = JSON.parse(text) as { success: boolean; assets: MemolessAssetItem[] }
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
  console.log(`[Memoless] Register response (${response.status}):`)
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
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
  console.log(`[Memoless] Preflight response (${response.status}):`)
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
  if (!response.ok) {
    throw new Error(`Memoless preflight error (${response.status}): ${text}`)
  }
  return JSON.parse(text) as MemolessPreflightResponse
}
