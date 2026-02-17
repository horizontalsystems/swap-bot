import { Markup, Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import { ALLOWED_PROVIDERS, FEATURED_IDENTIFIERS } from '../config/assets'
import { S, t } from '../config/strings'
import { getAssetByIdentifier, getAssets, getProvidersForPair } from '../db/database'
import { Asset, SwapContext, SwapSessionData } from '../types/context'
import { fetchQuote } from '../utils/api'
import { validateAddress } from '../utils/addressValidator'

const cancelButtonRow = [Markup.button.callback(S.cancelSwap, 'cancel_swap')]

// --- Helpers ---

const providerTitles: Record<string, string> = {
  THORCHAIN: 'THORChain',
  MAYACHAIN: 'Maya Protocol',
  NEAR: 'Near',
  SWAPUZ: 'Swapuz',
  STEALTHEX: 'StealthEX',
  QUICKEX: 'QuickEx',
  LETSEXCHANGE: 'LetsExchange'
}

function assetCaption(asset: Asset, includeChain: boolean = true) {
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

function assetKeyboard(assets: Asset[], disabledIdentifier?: string) {
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

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function buildProgress(s: SwapSessionData): string {
  const lines: string[] = []
  if (s.assetIn) lines.push(t(S.progressSend, { asset: assetCaption(s.assetIn) }))
  if (s.assetOut) lines.push(t(S.progressReceive, { asset: assetCaption(s.assetOut) }))
  if (s.amount != null && s.assetIn)
    lines.push(t(S.progressAmount, { amount: s.amount, asset: assetCaption(s.assetIn) }))
  if (s.destinationAddress) lines.push(t(S.progressDestination, { address: s.destinationAddress }))
  if (s.refundAddress) lines.push(t(S.progressRefund, { address: s.refundAddress }))
  return lines.join('\n')
}

async function editSwapMessage(ctx: SwapContext, text: string, extra?: Record<string, unknown>) {
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

async function sendWelcome(ctx: SwapContext) {
  await ctx.reply(S.welcome, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(S.welcomeNewSwap, 'start_swap')],
      [Markup.button.callback(S.welcomeHelp, 'show_help')]
    ])
  })
}

async function deleteUserMessage(ctx: SwapContext) {
  try {
    await ctx.deleteMessage()
  } catch {
    // May lack permission
  }
}

function providerName(id: string): string {
  return providerTitles[id] ?? id
}

// --- Wizard ---

const swapWizard = new Scenes.WizardScene<SwapContext>(
  'swap-wizard',

  // Step 0: Send swap message with assetIn keyboard
  async ctx => {
    ctx.scene.session.swapMessageId = undefined
    ctx.scene.session.assetIn = undefined
    ctx.scene.session.assetOut = undefined
    ctx.scene.session.amount = undefined
    ctx.scene.session.destinationAddress = undefined
    ctx.scene.session.refundAddress = undefined
    ctx.scene.session.routes = undefined
    ctx.scene.session.quote = undefined

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

    if (featuredAssets.length === 0) {
      await ctx.reply(S.noAssetsAvailable)
      await sendWelcome(ctx)
      return ctx.scene.leave()
    }

    const msg = await ctx.reply(S.selectSendAsset, {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets)
    })

    ctx.scene.session.swapMessageId = msg.message_id

    return ctx.wizard.next()
  },

  // Step 1: Waiting for assetIn callback
  async ctx => {
    await deleteUserMessage(ctx)
  },

  // Step 2: Waiting for assetOut callback
  async ctx => {
    await deleteUserMessage(ctx)
  },

  // Step 3: Handle amount input
  async ctx => {
    if (!ctx.has(message('text'))) return

    await deleteUserMessage(ctx)

    const amount = parseFloat(ctx.message.text)
    const asset = assetCaption(ctx.scene.session.assetIn!)

    if (isNaN(amount) || amount <= 0) {
      const progress = buildProgress(ctx.scene.session)
      await editSwapMessage(ctx, t(S.invalidAmount, { progress, asset }), {
        ...Markup.inlineKeyboard([cancelButtonRow])
      })
      return
    }

    ctx.scene.session.amount = amount

    const progress = buildProgress(ctx.scene.session)
    const outAsset = assetCaption(ctx.scene.session.assetOut!)
    await editSwapMessage(ctx, t(S.enterDestination, { progress, asset: outAsset }), {
      ...Markup.inlineKeyboard([cancelButtonRow])
    })

    return ctx.wizard.next()
  },

  // Step 4: Handle destination address
  async ctx => {
    if (!ctx.has(message('text'))) return

    await deleteUserMessage(ctx)

    const address = ctx.message.text.trim()
    const asset = assetCaption(ctx.scene.session.assetOut!)

    const addressError = validateAddress(ctx.scene.session.assetOut!.identifier, address)
    if (addressError) {
      const progress = buildProgress(ctx.scene.session)
      await editSwapMessage(ctx, t(S.invalidDestination, { progress, asset, hint: addressError }), {
        ...Markup.inlineKeyboard([cancelButtonRow])
      })
      return
    }

    ctx.scene.session.destinationAddress = address

    const progress = buildProgress(ctx.scene.session)
    const inAsset = assetCaption(ctx.scene.session.assetIn!)
    await editSwapMessage(ctx, t(S.enterRefund, { progress, asset: inAsset }), {
      ...Markup.inlineKeyboard([cancelButtonRow])
    })

    return ctx.wizard.next()
  },

  // Step 5: Handle refund address, fetch quotes, show route options
  async ctx => {
    if (!ctx.has(message('text'))) return

    await deleteUserMessage(ctx)

    const refundAddress = ctx.message.text.trim()
    const inAsset = assetCaption(ctx.scene.session.assetIn!)

    const refundError = validateAddress(ctx.scene.session.assetIn!.identifier, refundAddress)
    if (refundError) {
      const progress = buildProgress(ctx.scene.session)
      await editSwapMessage(ctx, t(S.invalidRefund, { progress, asset: inAsset, hint: refundError }), {
        ...Markup.inlineKeyboard([cancelButtonRow])
      })
      return
    }

    ctx.scene.session.refundAddress = refundAddress

    const { assetIn, assetOut, amount, destinationAddress } = ctx.scene.session
    const progress = buildProgress(ctx.scene.session)

    const providers = getProvidersForPair(assetIn!.identifier, assetOut!.identifier).filter(p =>
      ALLOWED_PROVIDERS.includes(p)
    )

    if (providers.length === 0) {
      await editSwapMessage(ctx, t(S.noProviders, { progress }))
      await sendWelcome(ctx)
      return ctx.scene.leave()
    }

    await editSwapMessage(ctx, t(S.fetchingQuotes, { progress }))

    try {
      const quoteResponse = await fetchQuote({
        sellAsset: assetIn!.identifier,
        buyAsset: assetOut!.identifier,
        sellAmount: amount!.toString(),
        destinationAddress: destinationAddress!,
        providers,
        dry: true
      })

      if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
        await editSwapMessage(ctx, t(S.noRoutes, { progress }))
        await sendWelcome(ctx)
        return ctx.scene.leave()
      }

      quoteResponse.routes.sort((a, b) => parseFloat(b.expectedBuyAmount) - parseFloat(a.expectedBuyAmount))
      ctx.scene.session.routes = quoteResponse.routes

      const outTicker = assetCaption(assetOut!, false)
      const routeLines = quoteResponse.routes.map((route, i) => {
        return t(S.quoteLine, {
          index: i + 1,
          provider: providerName(route.providers[0]),
          amount: route.expectedBuyAmount,
          ticker: outTicker,
          time: formatTime(route.estimatedTime.total)
        })
      })

      const routeButtons = quoteResponse.routes.map((route, i) =>
        Markup.button.callback(`${i + 1}. ${providerName(route.providers[0])}`, `route_${i}`)
      )

      const buttonRows: ReturnType<typeof Markup.button.callback>[][] = []
      for (let i = 0; i < routeButtons.length; i += 2) {
        buttonRows.push(routeButtons.slice(i, i + 2))
      }
      buttonRows.push(cancelButtonRow)

      await editSwapMessage(
        ctx,
        t(S.quotesHeader, { progress, count: quoteResponse.routes.length, routes: routeLines.join('\n\n') }),
        { ...Markup.inlineKeyboard(buttonRows) }
      )

      return ctx.wizard.next()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Swap] Quote error:', error)
      await editSwapMessage(ctx, t(S.quoteError, { progress, error: errMsg }))
      await sendWelcome(ctx)
      return ctx.scene.leave()
    }
  },

  // Step 6: Waiting for route selection
  async ctx => {
    await deleteUserMessage(ctx)
  },

  // Step 7: Waiting for confirm/cancel
  async ctx => {
    await deleteUserMessage(ctx)
  }
)

// --- /cancel command inside wizard ---
swapWizard.command('cancel', async ctx => {
  await deleteUserMessage(ctx)
  await editSwapMessage(ctx, S.swapCancelled)
  await sendWelcome(ctx)
  return ctx.scene.leave()
})

// --- Actions ---

// AssetIn / AssetOut selection
swapWizard.action(/^select_(.+)$/, async ctx => {
  if (ctx.wizard.cursor === 1) {
    const identifier = ctx.match[1]
    const asset = getAssetByIdentifier(identifier)

    if (!asset) {
      await ctx.answerCbQuery(S.assetNotFound)
      return
    }

    ctx.scene.session.assetIn = asset
    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

    const progress = buildProgress(ctx.scene.session)
    await ctx.editMessageText(t(S.selectReceiveAsset, { progress }), {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, asset.identifier)
    })

    return ctx.wizard.next()
  }

  if (ctx.wizard.cursor === 2) {
    const identifier = ctx.match[1]
    const asset = getAssetByIdentifier(identifier)

    if (!asset) {
      await ctx.answerCbQuery(S.assetNotFound)
      return
    }

    ctx.scene.session.assetOut = asset
    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)

    const progress = buildProgress(ctx.scene.session)
    await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([cancelButtonRow])
    })

    return ctx.wizard.next()
  }
})

// Route selection
swapWizard.action(/^route_(\d+)$/, async ctx => {
  const index = parseInt(ctx.match[1], 10)
  const { routes, assetIn, assetOut, amount, destinationAddress, refundAddress } = ctx.scene.session

  if (!routes || !routes[index] || !assetIn || !assetOut || !amount || !destinationAddress || !refundAddress) {
    await ctx.answerCbQuery(S.sessionExpired)
    await sendWelcome(ctx)
    return ctx.scene.leave()
  }

  const route = routes[index]
  ctx.scene.session.quote = route

  await ctx.answerCbQuery(`Selected ${providerName(route.providers[0])}`)

  await ctx.editMessageText(
    t(S.swapSummary, {
      sendAmount: amount,
      sendAsset: assetCaption(assetIn),
      receiveAmount: route.expectedBuyAmount,
      receiveAsset: assetCaption(assetOut),
      minReceive: route.expectedBuyAmountMaxSlippage,
      destination: destinationAddress,
      refund: refundAddress,
      provider: providerName(route.providers[0]),
      time: formatTime(route.estimatedTime.total)
    }),
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(S.confirmButton, 'confirm_swap')], cancelButtonRow])
    }
  )

  return ctx.wizard.next()
})

// Confirm swap — call API with dry: false
swapWizard.action('confirm_swap', async ctx => {
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = ctx.scene.session

  if (!assetIn || !assetOut || !amount || !destinationAddress || !refundAddress || !quote) {
    await ctx.answerCbQuery(S.sessionExpired)
    await sendWelcome(ctx)
    return ctx.scene.leave()
  }

  await ctx.answerCbQuery(S.processingSwap)
  await ctx.editMessageText(S.confirmingSwap)

  try {
    const quoteResponse = await fetchQuote({
      sellAsset: assetIn.identifier,
      buyAsset: assetOut.identifier,
      sellAmount: amount.toString(),
      destinationAddress,
      refundAddress,
      providers: quote.providers,
      dry: false
    })

    if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
      await ctx.editMessageText(S.swapFailedNoRoutes)
      await sendWelcome(ctx)
      return ctx.scene.leave()
    }

    const route = quoteResponse.routes[0]

    if (!route.qrCodeDataURL) {
      await ctx.editMessageText(S.swapNoQr)
      await sendWelcome(ctx)
      return ctx.scene.leave()
    }

    // Convert data URL to Buffer
    const base64Data = route.qrCodeDataURL.replace(/^data:image\/png;base64,/, '')
    const qrBuffer = Buffer.from(base64Data, 'base64')

    const inboundAddress = route.inboundAddress || route.targetAddress

    await ctx.editMessageText(
      t(S.swapConfirmed, {
        sendAmount: amount,
        sendAsset: assetCaption(assetIn),
        receiveAmount: route.expectedBuyAmount,
        receiveAsset: assetCaption(assetOut),
        inboundAddress: inboundAddress ?? '',
        provider: route.providers.map(p => providerName(p)).join(', '),
        time: formatTime(route.estimatedTime.total)
      }),
      { parse_mode: 'Markdown' }
    )

    await ctx.replyWithPhoto(
      { source: qrBuffer },
      {
        caption: t(S.qrCaption, { sendAmount: amount, sendAsset: assetCaption(assetIn) }),
        parse_mode: 'Markdown'
      }
    )

    await sendWelcome(ctx)
    return ctx.scene.leave()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Confirm error:', error)
    await ctx.editMessageText(t(S.swapConfirmError, { error: errMsg }))
    await sendWelcome(ctx)
    return ctx.scene.leave()
  }
})

// Disabled button (already selected asset)
swapWizard.action('disabled', async ctx => {
  await ctx.answerCbQuery(S.alreadySelected)
})

// Cancel swap (inline button)
swapWizard.action('cancel_swap', async ctx => {
  await ctx.answerCbQuery(S.swapCancelled)
  await ctx.editMessageText(S.swapCancelled)
  await sendWelcome(ctx)
  return ctx.scene.leave()
})

export { swapWizard }
