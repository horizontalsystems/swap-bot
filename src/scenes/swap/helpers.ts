import { Markup } from 'telegraf'
import { S, t } from '../../config/strings'
import { Asset, SwapContext, SwapSessionData } from '../../types/context'

export const cancelButtonRow = [Markup.button.callback(S.cancelSwap, 'cancel_swap')]

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

export function assetCaption(asset: Asset, includeChain: boolean = true) {
  const map: Record<string, string> = {
    ETH: 'ERC20',
    TRON: 'TRC20',
    SOL: 'SPL'
  }

  const [chain, token] = asset.identifier.split('.')
  const [ticker, ref] = token.split('-')

  let caption = ticker

  if (ref && map[chain] && includeChain) {
    caption += ` (${map[chain]})`
  }

  return caption
}

export function assetKeyboard(assets: Asset[], disabledIdentifier?: string) {
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

  rows.push(cancelButtonRow)
  return Markup.inlineKeyboard(rows)
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
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

export async function sendWelcome(ctx: SwapContext) {
  await ctx.reply(S.welcome, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(S.welcomeNewSwap, 'start_swap')],
      [Markup.button.callback(S.welcomeHelp, 'show_help')]
    ])
  })
}

export async function deleteUserMessage(ctx: SwapContext) {
  try {
    await ctx.deleteMessage()
  } catch {
    // May lack permission
  }
}
