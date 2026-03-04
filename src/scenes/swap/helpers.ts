import { Markup } from 'telegraf'
import { Strings, t } from '../../config/strings'
import { Asset, SwapContext, SwapSessionData } from '../../types/context'

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
  EXOLIX: 'Exolix'
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
  EXOLIX: 'AML'
}

export function providerLabel(id: string): string {
  const name = providerTitles[id] ?? id
  const risk = providerRisk[id]
  return risk ? `${name} · ${risk}` : name
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

export function buildTrackUrl(
  provider: string,
  opts: {
    inboundAddr?: string
    chainId?: string | null
    providerSwapId?: string
    fromAsset?: string
    fromAmount?: string
    toAsset?: string
    toAmount?: string
    toAddress?: string
    refundAddress?: string
  }
): string | null {
  const base = 'https://swap.unstoppable.money/track'
  const params = new URLSearchParams()
  params.set('provider', provider)

  if (provider === 'THORCHAIN' || provider === 'NEAR') {
    if (!opts.inboundAddr) return null
    params.set('depositAddress', opts.inboundAddr)
  } else {
    if (!opts.providerSwapId) return null
    params.set('providerSwapId', opts.providerSwapId)
  }

  if (opts.chainId) params.set('chainId', opts.chainId)
  if (opts.fromAsset) params.set('fromAsset', opts.fromAsset)
  if (opts.fromAmount) params.set('fromAmount', opts.fromAmount)
  if (opts.toAsset) params.set('toAsset', opts.toAsset)
  if (opts.toAmount) params.set('toAmount', opts.toAmount)
  if (opts.toAddress) params.set('toAddress', opts.toAddress)
  if (opts.refundAddress) params.set('refundAddress', opts.refundAddress)

  return `${base}?${params.toString()}`
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
