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

// --- Quote types (aggregator API v2) ---

export interface Fee {
  type: string
  protocol: string
  chain: string
  asset: string
  amount: string
}

/**
 * An order identifier the receiving side needs to match an incoming deposit to the order.
 * Present ⟺ required — if it is there and the user omits it, the deposit is unrecoverable.
 * `destination_tag` goes in the chain's dedicated tag field (XRP), `text` in the memo /
 * comment field (Cosmos, TON, RUNE); the two are not interchangeable.
 */
export type Attachment = { type: 'destination_tag' | 'text'; value: string }

/** Plain transfer to a deposit address — every P2P provider and NEAR. */
export interface TransferExecution {
  method: 'transfer'
  chain: string
  depositAddress: string
  amount: string
  asset: string
  attachment?: Attachment
  /** Server-rendered deposit QR. Optional — the server skips it on chains it can't encode. */
  qr?: { str: string; dataURL: string }
}

/** Deposit to a THORChain-family vault with the swap memo bound to it. */
export interface ThorchainDepositExecution {
  method: 'thorchain_deposit'
  protocol: string
  chain: string
  inboundAddress: string
  amount: string
  asset: string
  memo: string
  expiry?: string
}

/**
 * Methods the bot cannot execute — both need a wallet to sign with, and the bot only
 * relays deposit instructions. Providers using them are kept out of ALLOWED_PROVIDERS;
 * the branch exists so `execution.method` still narrows if one ever slips through.
 */
export interface UnsupportedExecution {
  method: 'signed_transaction' | 'stellar_broker'
  chain: string
}

export type Execution = TransferExecution | ThorchainDepositExecution | UnsupportedExecution

export interface QuoteRoute {
  providers: string[]
  sellAsset: string
  sellAmount: string
  buyAsset: string
  /** Already net of every fee — rank routes on this. */
  expectedBuyAmount: string
  /**
   * The ENFORCED floor, or null/absent when nothing enforces one: floating-rate P2P
   * quotes are re-priced when the deposit lands, so the user can receive more or less
   * than `expectedBuyAmount`. Never present it as a guarantee when it is null.
   */
  minBuyAmount?: string | null
  fees: Fee[]
  estimatedTime: {
    inbound: number
    swap: number
    outbound: number
    total: number
  }
  /** Rate-lock expiry, epoch **milliseconds**. */
  expiresAt?: number
  rate?: { id: string; floating: boolean }
  amlPolicy?: string
  meta?: Record<string, unknown>
  /** Committed routes (`POST /v2/swap`) only — a rate quote has nothing to execute yet. */
  execution?: Execution
  /** Committed routes only — the tracking handle. */
  uuid?: string
}

export interface ProviderError {
  provider: string
  error: string
  errorCode?: string
  minimumAmount?: number
  maximumAmount?: number
}

export interface RateResponse {
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
  /** Secure swap: quote the confidential rails alone (see SECURE_PROVIDERS). */
  secure?: boolean
}

export interface SwapContext extends Context {
  scene: Scenes.SceneContextScene<SwapContext, SwapSessionData>
  wizard: Scenes.WizardContextWizard<SwapContext>
  session: Scenes.WizardSession<SwapSessionData>
}
