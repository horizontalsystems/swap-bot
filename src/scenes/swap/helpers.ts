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
  MAYACHAIN: 'Maya Protocol',
  NEAR: 'Near',
  SWAPUZ: 'Swapuz',
  STEALTHEX: 'StealthEX',
  QUICKEX: 'QuickEx',
  LETSEXCHANGE: 'LetsExchange'
}

export function providerName(id: string): string {
  return providerTitles[id] ?? id
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
  return `${asset.ticker} (${label})`
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

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null) return ''
  return `(~$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (secs > 0 && hours === 0) parts.push(`${secs}s`)
  return parts.join(' ')
}

export function buildProgress(session: SwapSessionData, S: Strings): string {
  const lines: string[] = []
  if (session.assetIn) lines.push(t(S.progressSend, { asset: assetCaption(session.assetIn) }))
  if (session.assetOut) lines.push(t(S.progressReceive, { asset: assetCaption(session.assetOut) }))
  if (session.amount != null && session.assetIn)
    lines.push(
      t(S.progressAmount, {
        amount: session.amount,
        asset: assetCaption(session.assetIn),
        amountUsd: formatUsd(session.usdInputAmount)
      })
    )
  if (session.destinationAddress) lines.push(t(S.progressDestination, { address: session.destinationAddress }))
  if (session.refundAddress) lines.push(t(S.progressRefund, { address: session.refundAddress }))
  return lines.join('\n')
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
