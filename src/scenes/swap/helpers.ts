import { Markup } from 'telegraf'
import { Strings, t } from '../../config/strings'
import {
  ALLOWED_PROVIDERS,
  ZEC_SHIELDED_IDENTIFIER,
  ZEC_SHIELDED_PROVIDERS,
  ZEC_TRANSPARENT_IDENTIFIER
} from '../../config/assets'
import { Asset, Attachment, QuoteRoute, RateResponse, SwapContext, SwapSessionData } from '../../types/context'
import { zecAddressKind } from '../../utils/addressValidator'
import { fetchRate } from '../../utils/api'

export function cancelButtonRow(S: Strings) {
  return [Markup.button.callback(S.cancelSwap, 'cancel_swap')]
}
export function backCancelRow(S: Strings) {
  return [Markup.button.callback(S.back, 'go_back'), Markup.button.callback(S.cancelSwap, 'cancel_swap')]
}
export function clearSearchCancelRow(S: Strings) {
  return [Markup.button.callback(S.clearSearch, 'clear_search'), Markup.button.callback(S.cancelSwap, 'cancel_swap')]
}

export const providerTitles: Record<string, string> = {
  THORCHAIN: 'THORChain',
  NEAR: 'Near',
  SWAPUZ: 'Swapuz',
  STEALTHEX: 'StealthEX',
  QUICKEX: 'QuickEx',
  LETSEXCHANGE: 'LetsExchange',
  EXOLIX: 'Exolix',
  CCE: 'CCE Cash',
  PEGASUS: 'PegasusSwap',
  LIZEX: 'Lizex',
  BITANIA: 'Bitania'
}

export function providerName(id: string): string {
  return providerTitles[id] ?? id
}

const providerRisk: Record<string, string> = {
  THORCHAIN: 'DEX 👌',
  SWAPUZ: 'Private liquidity 👌',
  STEALTHEX: 'AML',
  LETSEXCHANGE: 'AML',
  QUICKEX: 'AML',
  NEAR: 'AML',
  EXOLIX: 'AML',
  CCE: 'AML',
  PEGASUS: 'AML',
  LIZEX: 'AML',
  BITANIA: 'AML'
}

export function providerLabel(id: string): string {
  const name = providerTitles[id] ?? id
  const risk = providerRisk[id]
  return risk ? `${name} · ${risk}` : name
}

// --- Zcash: shielded vs transparent ---

export function isZecIdentifier(identifier: string | undefined): boolean {
  return identifier?.split('.')[0] === 'ZEC'
}

/** Shielded-capable providers that are actually offerable — the rest of the list is documentation. */
export function zecShieldedProviders(buyAssetIdentifier: string): string[] {
  if (buyAssetIdentifier !== ZEC_TRANSPARENT_IDENTIFIER) return []
  return ZEC_SHIELDED_PROVIDERS.filter(p => ALLOWED_PROVIDERS.includes(p))
}

/**
 * Rates for the pair. Receiving ZEC quotes both Zcash catalog entries — `ZEC.ZEC` from the
 * providers that pay transparent addresses, `ZEC.ZECSHIELDED` from the ones that pay
 * shielded — and merges them into one list, so the user compares every route that can
 * actually deliver. Each route carries the identifier it was quoted for in `buyAsset`,
 * which is what the commit and the address check key on afterwards.
 *
 * The shielded catalog is a separate token that a provider (or the aggregator) may not
 * know: that leg failing must never take the transparent quotes down with it.
 */
export async function fetchPairRates(params: {
  sellAsset: string
  buyAsset: string
  sellAmount: string
  providers: string[]
}): Promise<RateResponse> {
  const shielded = zecShieldedProviders(params.buyAsset)
  if (shielded.length === 0) return fetchRate(params)

  const [transparentRates, shieldedRates] = await Promise.all([
    params.providers.length > 0 ? fetchRate(params) : Promise.resolve(emptyRateResponse()),
    fetchRate({ ...params, buyAsset: ZEC_SHIELDED_IDENTIFIER, providers: shielded }).catch(error => {
      console.error('[Swap] Shielded ZEC quote failed:', error)
      return emptyRateResponse()
    })
  ])

  // Pin the identifier we asked for onto each route: everything downstream reads the
  // address family off it, so it must not depend on what the provider echoes back.
  for (const route of shieldedRates.routes) route.buyAsset = ZEC_SHIELDED_IDENTIFIER
  for (const route of transparentRates.routes) route.buyAsset = params.buyAsset

  return {
    routes: [...transparentRates.routes, ...shieldedRates.routes],
    providerErrors: [...transparentRates.providerErrors, ...shieldedRates.providerErrors]
  }
}

function emptyRateResponse(): RateResponse {
  return { routes: [], providerErrors: [] }
}

export type ZecFamily = 'transparent' | 'shielded'

/** Which Zcash address family a quoted route can pay out to, or null when ZEC isn't involved. */
export function zecRouteFamily(route: QuoteRoute): ZecFamily | null {
  if (!isZecIdentifier(route.buyAsset)) return null
  return route.buyAsset === ZEC_SHIELDED_IDENTIFIER ? 'shielded' : 'transparent'
}

/**
 * The family a route needs when the address the user typed isn't one it can pay — null
 * when the address fits. Unified (`u1…`) counts as shielded: the exchanges that reject
 * `zs1…` reject it too, having never learned to read its transparent receiver.
 */
export function zecAddressMismatch(route: QuoteRoute, address: string): ZecFamily | null {
  const family = zecRouteFamily(route)
  if (!family) return null

  const kind = zecAddressKind(address)
  const matches = family === 'transparent' ? kind === 'transparent' : kind === 'shielded' || kind === 'unified'
  return matches ? null : family
}

/**
 * Refunds leave a provider the same way payouts do, so a ZEC refund address is bound by
 * the provider rather than by the route's buy side. Returns the family the user has to
 * switch to, or null when the address is fine.
 */
export function zecRefundMismatch(identifier: string, address: string, provider: string): ZecFamily | null {
  if (!isZecIdentifier(identifier)) return null
  if (zecAddressKind(address) === 'transparent') return null
  return ZEC_SHIELDED_PROVIDERS.includes(provider) ? null : 'transparent'
}

/** The tag that tells two ZEC routes apart in the quote list. */
export function zecRouteTag(S: Strings, route: QuoteRoute): string {
  const family = zecRouteFamily(route)
  if (!family) return ''
  return family === 'shielded' ? S.zecRouteShielded : S.zecRouteTransparent
}

/** What a committed swap must buy: the route's own identifier, not the asset the user picked. */
export function buyAssetForRoute(route: QuoteRoute, assetOut: Asset): string {
  return route.buyAsset || assetOut.identifier
}

const chainLabels: Record<string, string> = {
  ETH: 'ERC20',
  BSC: 'BEP20',
  TRON: 'TRC20',
  SOL: 'SPL'
}

export function assetCaption(asset: Asset) {
  if (!asset.address && !(asset.ticker === 'ETH' && asset.chain !== 'ETH')) {
    return asset.ticker
  }
  const label = chainLabels[asset.chain] ?? asset.chain
  return `${asset.ticker}-${label}`
}

export function assetKeyboard(assets: Asset[], S: Strings, disabledIdentifier?: string, showBack: boolean = false) {
  const buttons = assets.map(a => {
    if (a.identifier === disabledIdentifier) {
      return Markup.button.callback(`✓ ${assetCaption(a)}`, 'disabled')
    }
    return Markup.button.callback(assetCaption(a), `select_${a.identifier}`)
  })

  const rows: ReturnType<typeof Markup.button.callback>[][] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }

  rows.push(showBack ? backCancelRow(S) : cancelButtonRow(S))
  return Markup.inlineKeyboard(rows)
}

export function searchResultsKeyboard(assets: Asset[], S: Strings, disabledIdentifier?: string) {
  const buttons = assets.map((a, i) => {
    if (a.identifier === disabledIdentifier) {
      return Markup.button.callback(`✓ ${assetCaption(a)}`, 'disabled')
    }
    return Markup.button.callback(assetCaption(a), `sselect_${i}`)
  })

  const rows: ReturnType<typeof Markup.button.callback>[][] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }

  rows.push(clearSearchCancelRow(S))
  return Markup.inlineKeyboard(rows)
}

/**
 * Shorten an address for display: 0xabcde...12345
 * Keeps prefix (0x, bc1, etc.) + 5 chars ... last 5 chars.
 */
export function shortenAddress(address: string): string {
  if (address.length <= 16) return address
  const prefix = address.match(/^(0x|bc1|bnb1|cosmos1)/i)?.[0] ?? ''
  const start = prefix + address.slice(prefix.length, prefix.length + 5)
  const end = address.slice(-5)
  return `${start}...${end}`
}

/**
 * Truncate a number to at most `decimals` fractional digits (floor towards zero).
 * Used to ensure token amounts don't exceed the asset's native precision.
 */
export function truncateToDecimals(value: number, decimals: number | null | undefined): number {
  if (decimals == null) return value
  const factor = 10 ** decimals
  return Math.trunc(value * factor) / factor
}

/**
 * Smart number formatting: show ~4 significant digits in the decimal part,
 * reducing precision for larger numbers where decimals matter less.
 */
export function formatAmount(value: number | string, decimals?: number | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return String(value)
  if (num === 0) return '0'

  const abs = Math.abs(num)

  let maxFrac: number
  if (abs >= 10_000) maxFrac = 0
  else if (abs >= 1_000) maxFrac = 1
  else if (abs >= 100) maxFrac = 2
  else if (abs >= 10) maxFrac = 2
  else if (abs >= 1) maxFrac = 4
  else {
    // For numbers < 1: find leading zeros then show 4 significant digits
    const leadingZeros = -Math.floor(Math.log10(abs)) - 1
    maxFrac = Math.min(leadingZeros + 4, 20)
  }

  if (decimals != null) maxFrac = Math.min(maxFrac, decimals)

  return num.toLocaleString('en-US', { maximumFractionDigits: maxFrac })
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null) return ''
  const abs = Math.abs(amount)
  let formatted: string
  if (abs >= 1_000) {
    formatted = amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
  } else if (abs >= 1) {
    formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } else {
    formatted = formatAmount(amount)
  }
  return ` ($${formatted})`
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.ceil((seconds % 3600) / 60)
  if (hours === 0) return `${Math.max(mins, 1)}m`
  const parts: string[] = [`${hours}h`]
  if (mins > 0) parts.push(`${mins}m`)
  return parts.join(' ')
}

export function buildProgress(session: SwapSessionData, S: Strings): string {
  const lines: string[] = []
  if (session.assetIn && session.assetOut) {
    lines.push(t(S.progressSend, { asset: `${assetCaption(session.assetIn)} → ${assetCaption(session.assetOut)}` }))
  } else {
    if (session.assetIn) lines.push(t(S.progressSend, { asset: assetCaption(session.assetIn) }))
    if (session.assetOut) lines.push(t(S.progressReceive, { asset: assetCaption(session.assetOut) }))
  }
  if (session.amount != null && session.assetIn)
    lines.push(
      t(S.progressAmount, {
        amount: formatAmount(session.amount, session.assetIn.decimals),
        asset: assetCaption(session.assetIn),
        amountUsd: formatUsd(session.usdInputAmount)
      })
    )
  if (session.quote) lines.push(t(S.progressProvider, { provider: providerName(session.quote.providers[0]) }))
  if (session.destinationAddress)
    lines.push(t(S.progressDestination, { address: shortenAddress(session.destinationAddress) }))
  if (session.refundAddress) lines.push(t(S.progressRefund, { address: shortenAddress(session.refundAddress) }))
  return lines.join('\n')
}

/**
 * The track page tracks by the committed route's `uuid` (v2 `POST /v2/track`) — everything
 * else is display context it renders alongside the status. No uuid means the swap was
 * recorded without one and cannot be tracked, so there is no link to offer.
 */
export function buildTrackUrl(
  uuid: string | undefined,
  opts: {
    provider: string
    depositAddress?: string
    chainId?: string | null
    fromAsset?: string
    fromAmount?: string
    toAsset?: string
    toAmount?: string
    toAddress?: string
    refundAddress?: string
  }
): string | null {
  if (!uuid) return null

  const base = 'https://swap.unstoppable.money/track'
  const params = new URLSearchParams()
  params.set('uuid', uuid)
  params.set('provider', opts.provider)

  if (opts.depositAddress) params.set('depositAddress', opts.depositAddress)
  if (opts.chainId) params.set('chainId', opts.chainId)
  if (opts.fromAsset) params.set('fromAsset', opts.fromAsset)
  if (opts.fromAmount) params.set('fromAmount', opts.fromAmount)
  if (opts.toAsset) params.set('toAsset', opts.toAsset)
  if (opts.toAmount) params.set('toAmount', opts.toAmount)
  if (opts.toAddress) params.set('toAddress', opts.toAddress)
  if (opts.refundAddress) params.set('refundAddress', opts.refundAddress)

  return `${base}?${params.toString()}`
}

// --- Committed route → what the user must send ---

export interface DepositInstructions {
  depositAddress: string
  /** The amount the provider expects, authoritative over what the user typed. */
  amount: string
  qrDataURL?: string
  qrStr?: string
  attachment?: Attachment
}

/**
 * Reads a committed route's `execution` block. Only `transfer` routes resolve here — a
 * THORChain route's memo has to be bound to the deposit, which a user sending from a
 * plain wallet can't do, so those run through the memoless flow instead (utils/memoless-api).
 * The remaining methods need a wallet to sign with and never reach the bot.
 */
export function depositInstructions(route: QuoteRoute): DepositInstructions | null {
  const execution = route.execution
  if (!execution || execution.method !== 'transfer') return null

  return {
    depositAddress: execution.depositAddress,
    amount: execution.amount,
    qrDataURL: execution.qr?.dataURL,
    qrStr: execution.qr?.str,
    attachment: execution.attachment
  }
}

/** The memo a THORChain route needs bound to its deposit, for the memoless flow. */
export function thorchainMemo(route: QuoteRoute): string | null {
  const execution = route.execution
  if (!execution || execution.method !== 'thorchain_deposit') return null
  return execution.memo
}

/** Seconds left on the route's rate lock — `expiresAt` is epoch **milliseconds** in v2. */
export function expiresInSeconds(route: QuoteRoute): number | undefined {
  if (route.expiresAt == null) return undefined
  return Math.max(0, Math.floor((route.expiresAt - Date.now()) / 1000))
}

export function attachmentLabel(attachment: Attachment, S: Strings): string {
  return attachment.type === 'destination_tag' ? S.attachmentTag : S.attachmentMemo
}

/** How a scene renders amounts — plain on Telegram, backticked on SimpleX/Signal. */
export interface AmountFormatter {
  amount(value: number | string, decimals?: number | null): string
  asset(asset: Asset): string
}

/**
 * The row between "Receive" and the destination block. Three outcomes, because v2's
 * `minBuyAmount` is only present when something actually enforces a floor:
 *   absent  → the quote is an estimate, re-priced when the deposit lands — say so
 *   equal   → nothing to add beyond the expected amount
 *   lower   → the guaranteed minimum
 * Carries its own trailing newline so an omitted row collapses cleanly — see the
 * `{minLine}` slot in the locales.
 */
export function buildMinLine(
  S: Strings,
  route: QuoteRoute,
  assetOut: Asset,
  outPrice: number | null,
  format: AmountFormatter
): string {
  const min = route.minBuyAmount
  if (min == null) return `${S.estimateLine}\n`
  if (min === route.expectedBuyAmount) return ''

  return `${t(S.minReceiveLine, {
    amount: format.amount(min, assetOut.decimals),
    asset: format.asset(assetOut),
    usd: formatUsd(outPrice != null ? outPrice * parseFloat(min) : null)
  })}\n`
}

export async function editSwapMessage(ctx: SwapContext, text: string, extra?: Record<string, unknown>) {
  const messageId = ctx.scene.session.swapMessageId
  if (!messageId || !ctx.chat) return
  try {
    await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, text, {
      parse_mode: 'Markdown',
      ...extra
    })
  } catch {
    // Message may have been deleted or content unchanged
  }
}

export async function deleteSwapMessage(ctx: SwapContext) {
  const messageId = ctx.scene.session.swapMessageId
  if (!messageId || !ctx.chat) return
  try {
    await ctx.telegram.deleteMessage(ctx.chat.id, messageId)
  } catch {
    // Message may have been already deleted
  }
}

export async function deleteUserMessage(ctx: SwapContext) {
  try {
    await ctx.deleteMessage()
  } catch {
    // May lack permission
  }
}
