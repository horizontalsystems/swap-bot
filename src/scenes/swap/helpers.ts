import { Markup } from 'telegraf'
import { S, t } from '../../config/strings'
import { Asset, SwapContext, SwapSessionData } from '../../types/context'

export const cancelButtonRow = [Markup.button.callback(S.cancelSwap, 'cancel_swap')]
export const backCancelRow = [
  Markup.button.callback(S.back, 'go_back'),
  Markup.button.callback(S.cancelSwap, 'cancel_swap')
]
export const clearSearchCancelRow = [
  Markup.button.callback(S.clearSearch, 'clear_search'),
  Markup.button.callback(S.cancelSwap, 'cancel_swap')
]

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

export function assetKeyboard(assets: Asset[], disabledIdentifier?: string, showBack: boolean = false) {
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

  rows.push(showBack ? backCancelRow : cancelButtonRow)
  return Markup.inlineKeyboard(rows)
}

export function searchResultsKeyboard(assets: Asset[], disabledIdentifier?: string) {
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

  rows.push(clearSearchCancelRow)
  return Markup.inlineKeyboard(rows)
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

export function buildProgress(s: SwapSessionData): string {
  const lines: string[] = []
  if (s.assetIn) lines.push(t(S.progressSend, { asset: assetCaption(s.assetIn) }))
  if (s.assetOut) lines.push(t(S.progressReceive, { asset: assetCaption(s.assetOut) }))
  if (s.amount != null && s.assetIn)
    lines.push(t(S.progressAmount, { amount: s.amount, asset: assetCaption(s.assetIn) }))
  if (s.destinationAddress) lines.push(t(S.progressDestination, { address: s.destinationAddress }))
  if (s.refundAddress) lines.push(t(S.progressRefund, { address: s.refundAddress }))
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
