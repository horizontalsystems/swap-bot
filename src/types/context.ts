import { Context, Scenes } from 'telegraf'

// --- Token types ---

export interface TokenListItem {
  identifier: string
  name: string
  providers: string[]
  [key: string]: unknown
}

// --- Asset (shown to user in bot, resolved from DB) ---

export interface Asset {
  identifier: string // e.g. "BTC.BTC", "ETH.ETH"
  name: string // e.g. "Bitcoin", "Ethereum"
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
  qrCodeDataURL?: string
}

export interface QuoteResponse {
  routes: QuoteRoute[]
  providerErrors: unknown[]
}

// --- Session / Context ---

export interface SwapSessionData extends Scenes.WizardSessionData {
  assetIn?: Asset
  assetOut?: Asset
  amount?: number
  destinationAddress?: string
  refundAddress?: string
  routes?: QuoteRoute[]
  quote?: QuoteRoute
}

export interface SwapContext extends Context {
  scene: Scenes.SceneContextScene<SwapContext, SwapSessionData>
  wizard: Scenes.WizardContextWizard<SwapContext>
  session: Scenes.WizardSession<SwapSessionData>
}
