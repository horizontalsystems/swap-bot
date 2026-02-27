import { Context, Scenes } from 'telegraf'

// --- Token types ---

export interface TokenListItem {
  identifier: string
  name: string
  providers: string[]
  decimals?: number
  [key: string]: unknown
}

// --- Memoless asset (THORChain filtering) ---

export interface MemolessAssetItem {
  asset: string
  status: string
}

// --- Asset (shown to user in bot, resolved from DB) ---

export interface Asset {
  identifier: string // e.g. "BTC.BTC", "ETH.ETH"
  name: string // e.g. "Bitcoin", "Ethereum"
  ticker: string // e.g. "BTC", "USDT"
  chain: string // e.g. "BTC", "ETH"
  address: string | null // contract address, null for native tokens
  coingeckoId: string | null // CoinGecko UID for price lookups
  chainId: string | null // e.g. "bitcoin", "ethereum" — used for tracking URLs
  decimals: number | null
}

// --- Quote types ---

export interface QuoteRoute {
  buyAsset: string
  expectedBuyAmount: string
  expectedBuyAmountMaxSlippage: string
  sellAsset: string
  sellAmount: string
  fees: {
    type: string
    chain: string
    asset: string
    amount: string
    protocol: string
  }[]
  targetAddress: string
  inboundAddress: string
  refundAddress?: string
  destinationAddress: string
  expiration: string
  estimatedTime: {
    inbound: number
    swap: number
    outbound: number
    total: number
  }
  providers: string[]
  meta: Record<string, unknown>
  memo?: string
  qrCodeDataURL?: string
  qrCodeStr?: string
  providerSwapId?: string
}

export interface ProviderError {
  provider: string
  error: string
  errorCode?: string
  minimumAmount?: number
}

export interface QuoteResponse {
  routes: QuoteRoute[]
  providerErrors: ProviderError[]
}

// --- Session / Context ---

export interface SwapSessionData extends Scenes.WizardSessionData {
  swapMessageId?: number
  assetIn?: Asset
  assetOut?: Asset
  amount?: number
  usdInputAmount?: number // stores original USD when user types $100
  destinationAddress?: string
  refundAddress?: string
  routes?: QuoteRoute[]
  quote?: QuoteRoute
  searchResults?: Asset[]
}

export interface SwapContext extends Context {
  scene: Scenes.SceneContextScene<SwapContext, SwapSessionData>
  wizard: Scenes.WizardContextWizard<SwapContext>
  session: Scenes.WizardSession<SwapSessionData>
}
