import { Markup, Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import { ALLOWED_PROVIDERS, FEATURED_IDENTIFIERS } from '../../config/assets'
import { s, t } from '../../config/strings'
import { getAssetByIdentifier, getAssets, getProvidersForPair, searchAssets } from '../../db/tokens'
import { SwapContext } from '../../types/context'
import { getAssetPrice, getSwapPrices } from '../../services/prices'
import { fetchQuote } from '../../utils/api'
import { preflightMemoless, registerMemoless } from '../../utils/memoless-api'
import { validateAddress } from '../../utils/addressValidator'
import {
  assetCaption,
  assetKeyboard,
  backCancelRow,
  buildProgress,
  buildTrackUrl,
  clearSearchCancelRow,
  deleteSwapMessage,
  deleteUserMessage,
  editSwapMessage,
  formatAmount,
  formatTime,
  formatUsd,
  providerName,
  searchResultsKeyboard,
  shortenAddress
} from './helpers'

// --- Helpers ---

/** Detect /start or /swap command in a text message */
function isRestartCommand(ctx: SwapContext): boolean {
  if (!ctx.has(message('text'))) return false
  return /^\/(start|swap)(@\w+)?$/i.test(ctx.message.text.trim())
}

/** Reset wizard and show fresh asset selection (used when /start or /swap sent mid-wizard) */
async function restartWizard(ctx: SwapContext) {
  await deleteSwapMessage(ctx)

  const S = s(ctx.from?.language_code)
  ctx.scene.session.assetIn = undefined
  ctx.scene.session.assetOut = undefined
  ctx.scene.session.amount = undefined
  ctx.scene.session.usdInputAmount = undefined
  ctx.scene.session.destinationAddress = undefined
  ctx.scene.session.refundAddress = undefined
  ctx.scene.session.routes = undefined
  ctx.scene.session.quote = undefined
  ctx.scene.session.searchResults = undefined

  const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

  if (featuredAssets.length === 0) {
    await ctx.reply(S.noAssetsAvailable)
    return ctx.scene.leave()
  }

  const msg = await ctx.reply(S.selectSendAsset, {
    parse_mode: 'Markdown',
    ...assetKeyboard(featuredAssets, S)
  })

  ctx.scene.session.swapMessageId = msg.message_id
  ctx.wizard.selectStep(1)
}

async function fetchAndShowRoutes(ctx: SwapContext): Promise<boolean> {
  const S = s(ctx.from?.language_code)
  const { assetIn, assetOut, amount } = ctx.scene.session
  const progress = buildProgress(ctx.scene.session, S)

  const providers = getProvidersForPair(assetIn!.identifier, assetOut!.identifier).filter(p =>
    ALLOWED_PROVIDERS.includes(p)
  )

  if (providers.length === 0) {
    await editSwapMessage(ctx, t(S.noProviders, { progress }))
    return false
  }

  await editSwapMessage(ctx, t(S.fetchingQuotes, { progress }))

  const quoteResponse = await fetchQuote({
    sellAsset: assetIn!.identifier,
    buyAsset: assetOut!.identifier,
    sellAmount: amount!.toString(),
    providers,
    dry: true
  })

  if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
    const failMsg = quoteResponse.providerErrors?.length
      ? t(S.allProvidersFailed, { progress })
      : t(S.noRoutes, { progress })
    await editSwapMessage(ctx, failMsg, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(S.changeAmount, 'change_amount'), Markup.button.callback(S.newSwap, 'new_swap')]
      ])
    })
    return false
  }

  quoteResponse.routes.sort((a, b) => parseFloat(b.expectedBuyAmount) - parseFloat(a.expectedBuyAmount))
  ctx.scene.session.routes = quoteResponse.routes

  const { outPrice } = await getSwapPrices(assetIn!.coingeckoId, assetOut!.coingeckoId)

  const routeLines = quoteResponse.routes.map((route, i) => {
    const receiveUsdVal = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null
    return t(S.quoteLine, {
      index: i + 1,
      provider: providerName(route.providers[0]),
      amount: formatAmount(route.expectedBuyAmount),
      ticker: assetOut!.ticker,
      receiveUsd: formatUsd(receiveUsdVal),
      time: formatTime(route.estimatedTime.total)
    })
  })

  const routeButtons = quoteResponse.routes.map((route, i) =>
    Markup.button.callback(`${i + 1}. ${providerName(route.providers[0])}`, `route_${i}`)
  )

  const buttonRows = routeButtons.map(btn => [btn])
  buttonRows.push(backCancelRow(S))

  await editSwapMessage(
    ctx,
    t(S.quotesHeader, { progress, count: quoteResponse.routes.length, routes: routeLines.join('\n') }),
    { ...Markup.inlineKeyboard(buttonRows) }
  )

  return true
}

async function showSummary(ctx: SwapContext) {
  const S = s(ctx.from?.language_code)
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = ctx.scene.session

  const { inPrice, outPrice } = await getSwapPrices(assetIn!.coingeckoId, assetOut!.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount! : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote!.expectedBuyAmount) : null
  const minReceiveUsdVal = outPrice != null ? outPrice * parseFloat(quote!.expectedBuyAmountMaxSlippage) : null

  let summaryText = t(S.swapSummary, {
    sendAmount: formatAmount(amount!),
    sendAsset: assetCaption(assetIn!),
    sendUsd: formatUsd(sendUsdVal),
    receiveAmount: formatAmount(quote!.expectedBuyAmount),
    receiveAsset: assetCaption(assetOut!),
    receiveUsd: formatUsd(receiveUsdVal),
    minReceive: formatAmount(quote!.expectedBuyAmountMaxSlippage),
    minReceiveUsd: formatUsd(minReceiveUsdVal),
    destination: shortenAddress(destinationAddress!),
    refund: refundAddress ? shortenAddress(refundAddress) : '',
    provider: providerName(quote!.providers[0]),
    time: formatTime(quote!.estimatedTime.total)
  })
  if (quote!.expectedBuyAmount === quote!.expectedBuyAmountMaxSlippage)
    summaryText = summaryText.replace(/\n[^\n]+\n(\n📍)/, '\n$1')
  if (!refundAddress) summaryText = summaryText.replace(/↩️.*\n/g, '')

  await editSwapMessage(ctx, summaryText, {
    ...Markup.inlineKeyboard([[Markup.button.callback(S.confirmButton, 'confirm_swap')], backCancelRow(S)])
  })
}

// --- Wizard ---

const swapWizard = new Scenes.WizardScene<SwapContext>(
  'swap-wizard',

  // Step 0: Send swap message with assetIn keyboard
  async ctx => {
    const S = s(ctx.from?.language_code)
    ctx.scene.session.swapMessageId = undefined
    ctx.scene.session.assetIn = undefined
    ctx.scene.session.assetOut = undefined
    ctx.scene.session.amount = undefined
    ctx.scene.session.usdInputAmount = undefined
    ctx.scene.session.destinationAddress = undefined
    ctx.scene.session.refundAddress = undefined
    ctx.scene.session.routes = undefined
    ctx.scene.session.quote = undefined

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

    if (featuredAssets.length === 0) {
      await ctx.reply(S.noAssetsAvailable)
      return ctx.scene.leave()
    }

    const msg = await ctx.reply(S.selectSendAsset, {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, S)
    })

    ctx.scene.session.swapMessageId = msg.message_id

    return ctx.wizard.next()
  },

  // Step 1: Waiting for assetIn callback or search text
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    const S = s(ctx.from?.language_code)
    if (ctx.has(message('text'))) {
      await deleteUserMessage(ctx)
      if (ctx.message.text.trim().length < 2) return
      const results = searchAssets(ctx.message.text)
      ctx.scene.session.searchResults = results
      if (results.length > 0) {
        await editSwapMessage(ctx, S.selectSendAsset, {
          ...searchResultsKeyboard(results, S)
        })
      } else {
        await editSwapMessage(ctx, t(S.searchNoResults, { progress: '' }).replace(/\n{3,}/g, '\n\n'), {
          ...Markup.inlineKeyboard([clearSearchCancelRow(S)])
        })
      }
      return
    }
    await deleteUserMessage(ctx)
  },

  // Step 2: Waiting for assetOut callback or search text
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    const S = s(ctx.from?.language_code)
    if (ctx.has(message('text'))) {
      await deleteUserMessage(ctx)
      if (ctx.message.text.trim().length < 2) return
      const results = searchAssets(ctx.message.text)
      ctx.scene.session.searchResults = results
      const progress = buildProgress(ctx.scene.session, S)
      if (results.length > 0) {
        await editSwapMessage(ctx, t(S.selectReceiveAsset, { progress }), {
          ...searchResultsKeyboard(results, S, ctx.scene.session.assetIn?.identifier)
        })
      } else {
        await editSwapMessage(ctx, t(S.searchNoResults, { progress }), {
          ...Markup.inlineKeyboard([clearSearchCancelRow(S)])
        })
      }
      return
    }
    await deleteUserMessage(ctx)
  },

  // Step 3: Handle amount input → fetch quotes
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    if (!ctx.has(message('text'))) return

    const S = s(ctx.from?.language_code)
    await deleteUserMessage(ctx)

    const raw = ctx.message.text.trim()
    const asset = assetCaption(ctx.scene.session.assetIn!)

    // Accept: $123, 123$, $123.45, 123.45$, 123, 123.45, .5, $.5
    const isUsdInput = raw.startsWith('$') || raw.endsWith('$')
    const numStr = raw.replace(/\$/g, '')

    if (!/^\d*\.?\d+$/.test(numStr)) {
      const progress = buildProgress(ctx.scene.session, S)
      await editSwapMessage(ctx, t(S.invalidAmount, { progress, asset }), {
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      return
    }

    const parsedAmount = parseFloat(numStr)
    if (parsedAmount <= 0) {
      const progress = buildProgress(ctx.scene.session, S)
      await editSwapMessage(ctx, t(S.invalidAmount, { progress, asset }), {
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      return
    }

    if (isUsdInput) {
      const price = await getAssetPrice(ctx.scene.session.assetIn!.coingeckoId)
      if (price == null) {
        const progress = buildProgress(ctx.scene.session, S)
        await editSwapMessage(ctx, t(S.priceUnavailable, { progress, asset }), {
          ...Markup.inlineKeyboard([backCancelRow(S)])
        })
        return
      }

      ctx.scene.session.amount = parsedAmount / price
      ctx.scene.session.usdInputAmount = parsedAmount
    } else {
      ctx.scene.session.amount = parsedAmount
      const price = await getAssetPrice(ctx.scene.session.assetIn!.coingeckoId)
      ctx.scene.session.usdInputAmount = price != null ? parsedAmount * price : undefined
    }

    try {
      const success = await fetchAndShowRoutes(ctx)
      if (success) return ctx.wizard.next()
      ctx.wizard.selectStep(4)
      return
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Swap] Quote error:', error)
      const progress = buildProgress(ctx.scene.session, S)
      await editSwapMessage(ctx, t(S.quoteError, { progress, error: errMsg }))
      return ctx.scene.leave()
    }
  },

  // Step 4: Waiting for route selection
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    await deleteUserMessage(ctx)
  },

  // Step 5: Handle destination address
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    if (!ctx.has(message('text'))) return

    const S = s(ctx.from?.language_code)
    await deleteUserMessage(ctx)

    const address = ctx.message.text.trim()
    const asset = assetCaption(ctx.scene.session.assetOut!)

    const addressError = validateAddress(ctx.scene.session.assetOut!.identifier, address)
    if (addressError) {
      const progress = buildProgress(ctx.scene.session, S)
      await editSwapMessage(ctx, t(S.invalidDestination, { progress, asset, hint: addressError }), {
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      return
    }

    ctx.scene.session.destinationAddress = address

    const isThorChain = ctx.scene.session.quote!.providers[0] === 'THORCHAIN'
    if (isThorChain) {
      await showSummary(ctx)
      ctx.wizard.selectStep(7)
      return
    }

    const progress = buildProgress(ctx.scene.session, S)
    const inAsset = assetCaption(ctx.scene.session.assetIn!)
    await editSwapMessage(ctx, t(S.enterRefund, { progress, asset: inAsset }), {
      ...Markup.inlineKeyboard([backCancelRow(S)])
    })

    return ctx.wizard.next()
  },

  // Step 6: Handle refund address
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    if (!ctx.has(message('text'))) return

    const S = s(ctx.from?.language_code)
    await deleteUserMessage(ctx)

    const refundAddress = ctx.message.text.trim()
    const inAsset = assetCaption(ctx.scene.session.assetIn!)

    const refundError = validateAddress(ctx.scene.session.assetIn!.identifier, refundAddress)
    if (refundError) {
      const progress = buildProgress(ctx.scene.session, S)
      await editSwapMessage(ctx, t(S.invalidRefund, { progress, asset: inAsset, hint: refundError }), {
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      return
    }

    ctx.scene.session.refundAddress = refundAddress

    await showSummary(ctx)
    return ctx.wizard.next()
  },

  // Step 7: Waiting for confirm/cancel
  async ctx => {
    if (isRestartCommand(ctx)) return restartWizard(ctx)
    await deleteUserMessage(ctx)
  }
)

// --- /cancel command inside wizard ---
swapWizard.command('cancel', async ctx => {
  const S = s(ctx.from?.language_code)
  await deleteUserMessage(ctx)
  await editSwapMessage(ctx, S.swapCancelled)
  return ctx.scene.leave()
})

// --- Actions ---

// AssetIn / AssetOut selection
swapWizard.action(/^select_(.+)$/, async ctx => {
  const S = s(ctx.from?.language_code)
  if (ctx.wizard.cursor === 1) {
    const identifier = ctx.match[1]
    const asset = getAssetByIdentifier(identifier)

    if (!asset) {
      await ctx.answerCbQuery(S.assetNotFound)
      return
    }

    ctx.scene.session.assetIn = asset
    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

    const progress = buildProgress(ctx.scene.session, S)
    await ctx.editMessageText(t(S.selectReceiveAsset, { progress }), {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, S, asset.identifier, true)
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

    const providers = getProvidersForPair(ctx.scene.session.assetIn!.identifier, identifier).filter(p =>
      ALLOWED_PROVIDERS.includes(p)
    )
    ctx.scene.session.assetOut = asset
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    if (providers.length === 0) {
      await ctx.answerCbQuery()
      const progress = buildProgress(ctx.scene.session, S)
      await ctx.editMessageText(t(S.noProviders, { progress }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(3)
      return
    }

    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)

    const progress = buildProgress(ctx.scene.session, S)
    await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([backCancelRow(S)])
    })

    return ctx.wizard.next()
  }
})

// Search result selection (index-based to avoid callback data length limits)
swapWizard.action(/^sselect_(\d+)$/, async ctx => {
  const S = s(ctx.from?.language_code)
  const index = parseInt(ctx.match[1], 10)
  const results = ctx.scene.session.searchResults
  if (!results || !results[index]) {
    await ctx.answerCbQuery(S.assetNotFound)
    return
  }
  const asset = results[index]

  if (ctx.wizard.cursor === 1) {
    ctx.scene.session.assetIn = asset
    ctx.scene.session.searchResults = undefined
    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)
    const progress = buildProgress(ctx.scene.session, S)
    await ctx.editMessageText(t(S.selectReceiveAsset, { progress }), {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, S, asset.identifier, true)
    })

    return ctx.wizard.next()
  }

  if (ctx.wizard.cursor === 2) {
    const providers = getProvidersForPair(ctx.scene.session.assetIn!.identifier, asset.identifier).filter(p =>
      ALLOWED_PROVIDERS.includes(p)
    )

    ctx.scene.session.assetOut = asset
    ctx.scene.session.searchResults = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    if (providers.length === 0) {
      await ctx.answerCbQuery()
      const progress = buildProgress(ctx.scene.session, S)
      await ctx.editMessageText(t(S.noProviders, { progress }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(3)
      return
    }

    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)

    const progress = buildProgress(ctx.scene.session, S)
    await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([backCancelRow(S)])
    })

    return ctx.wizard.next()
  }
})

// Route selection → show destination address prompt
swapWizard.action(/^route_(\d+)$/, async ctx => {
  const S = s(ctx.from?.language_code)
  const index = parseInt(ctx.match[1], 10)
  const { routes, assetIn, assetOut, amount } = ctx.scene.session

  if (!routes || !routes[index] || !assetIn || !assetOut || !amount) {
    await ctx.answerCbQuery(S.sessionExpired)
    return ctx.scene.leave()
  }

  const route = routes[index]
  ctx.scene.session.quote = route

  await ctx.answerCbQuery(`Selected ${providerName(route.providers[0])}`)

  const progress = buildProgress(ctx.scene.session, S)
  const outAsset = assetCaption(assetOut)
  await editSwapMessage(ctx, t(S.enterDestination, { progress, asset: outAsset }), {
    ...Markup.inlineKeyboard([backCancelRow(S)])
  })

  return ctx.wizard.next()
})

// Confirm swap — call API with dry: false
swapWizard.action('confirm_swap', async ctx => {
  const S = s(ctx.from?.language_code)
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = ctx.scene.session

  const isThorChain = quote?.providers[0] === 'THORCHAIN'
  if (!assetIn || !assetOut || !amount || !destinationAddress || !quote || (!isThorChain && !refundAddress)) {
    await ctx.answerCbQuery(S.sessionExpired)
    return ctx.scene.leave()
  }

  await ctx.answerCbQuery(S.processingSwap)

  const { inPrice, outPrice } = await getSwapPrices(assetIn.coingeckoId, assetOut.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmount) : null
  const minReceiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmountMaxSlippage) : null

  let preparingText = t(S.preparingSwap, {
    sendAmount: formatAmount(amount),
    sendAsset: assetCaption(assetIn),
    sendUsd: formatUsd(sendUsdVal),
    receiveAmount: formatAmount(quote.expectedBuyAmount),
    receiveAsset: assetCaption(assetOut),
    receiveUsd: formatUsd(receiveUsdVal),
    minReceive: formatAmount(quote.expectedBuyAmountMaxSlippage),
    minReceiveUsd: formatUsd(minReceiveUsdVal),
    destination: shortenAddress(destinationAddress),
    refund: refundAddress ? shortenAddress(refundAddress) : '',
    provider: providerName(quote.providers[0]),
    time: formatTime(quote.estimatedTime.total)
  })
  if (quote.expectedBuyAmount === quote.expectedBuyAmountMaxSlippage)
    preparingText = preparingText.replace(/\n[^\n]+\n(\n📍)/, '\n$1')
  if (!refundAddress) preparingText = preparingText.replace(/↩️.*\n/g, '')

  await ctx.editMessageText(preparingText, { parse_mode: 'Markdown' })

  try {
    const quoteParams: Parameters<typeof fetchQuote>[0] = {
      sellAsset: assetIn.identifier,
      buyAsset: assetOut.identifier,
      sellAmount: amount.toString(),
      destinationAddress,
      providers: quote.providers,
      dry: false
    }
    if (refundAddress) quoteParams.refundAddress = refundAddress

    const quoteResponse = await fetchQuote(quoteParams)

    if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
      await ctx.editMessageText(S.swapFailedNoRoutes)
      return ctx.scene.leave()
    }

    const route = quoteResponse.routes[0]
    const isThorchain = route.providers[0] === 'THORCHAIN'

    let qrDataURL: string | undefined
    let inboundAddr: string | undefined
    let paymentUri: string | undefined
    let sendAmount: number = amount
    let sendAmountRaw: string = amount.toString()
    let expiresIn: number | undefined

    if (isThorchain) {
      console.log('[Swap] THORChain route detected, using memoless flow')

      const memo = route.memo
      if (!memo) {
        console.error('[Swap] No memo found in route for THORChain')
        await ctx.editMessageText(S.swapNoQr)
        return ctx.scene.leave()
      }

      console.log('[Swap] Memo:', memo)

      const registerData = await registerMemoless({
        asset: assetIn.identifier,
        memo,
        requested_in_asset_amount: amount.toString()
      })

      const preflightData = await preflightMemoless({
        asset: assetIn.identifier,
        reference: registerData.reference,
        amount: registerData.suggested_in_asset_amount
      })

      qrDataURL = preflightData.data.qr_code_data_url
      inboundAddr = preflightData.data.inbound_address
      sendAmount = parseFloat(registerData.suggested_in_asset_amount)
      sendAmountRaw = registerData.suggested_in_asset_amount
      expiresIn = preflightData.data.seconds_remaining
      paymentUri = preflightData.data.qr_code
      console.log('[Swap] Memoless flow complete — inbound:', inboundAddr, 'sendAmount:', sendAmount)
    } else {
      qrDataURL = route.qrCodeDataURL
      paymentUri = route.qrCodeStr
      inboundAddr = route.inboundAddress || route.targetAddress
      if (route.expiration) {
        expiresIn = Math.max(0, Math.floor(parseInt(route.expiration, 10) - Date.now() / 1000))
      }
    }

    if (!qrDataURL) {
      await ctx.editMessageText(S.swapNoQr)
      return ctx.scene.leave()
    }

    // Convert data URL to Buffer
    const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '')
    const qrBuffer = Buffer.from(base64Data, 'base64')

    const confirmSendUsd = inPrice != null ? inPrice * sendAmount : null
    const confirmReceiveUsd = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null

    const confirmMinReceiveUsd = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmountMaxSlippage) : null

    const warning = isThorchain ? `\n\n${S.amountWarning}` : ''

    const links: string[] = []

    const paymentLink = paymentUri ? `https://swap.unstoppable.money/pay?uri=${encodeURIComponent(paymentUri)}` : null
    if (paymentLink) links.push(`📲 [${S.openWalletApp}](${paymentLink})`)

    const provider = route.providers[0]
    const trackUrl = buildTrackUrl(provider, {
      inboundAddr: inboundAddr,
      chainId: assetIn.chainId,
      providerSwapId: route.providerSwapId,
      fromAsset: assetIn.identifier,
      fromAmount: sendAmount.toString(),
      toAsset: assetOut.identifier,
      toAmount: route.expectedBuyAmount,
      toAddress: destinationAddress,
      refundAddress: refundAddress
    })
    if (trackUrl) links.push(`🔍 [${S.trackSwap}](${trackUrl})`)

    let caption = t(S.swapConfirmed, {
      sendAmount: formatAmount(sendAmount),
      sendAmountRaw: sendAmountRaw,
      sendAsset: assetCaption(assetIn),
      sendUsd: formatUsd(confirmSendUsd),
      receiveAmount: formatAmount(route.expectedBuyAmount),
      receiveAsset: assetCaption(assetOut),
      receiveUsd: formatUsd(confirmReceiveUsd),
      minReceive: formatAmount(route.expectedBuyAmountMaxSlippage),
      minReceiveUsd: formatUsd(confirmMinReceiveUsd),
      destination: shortenAddress(destinationAddress),
      refund: refundAddress ? shortenAddress(refundAddress) : '',
      inboundAddress: inboundAddr ?? '',
      provider: route.providers.map(p => providerName(p)).join(', '),
      time: formatTime(route.estimatedTime.total),
      expiration: expiresIn != null ? formatTime(expiresIn) : 'N/A',
      warning,
      links: links.length ? `\n\n${links.join(' • ')}` : ''
    })
    if (route.expectedBuyAmount === route.expectedBuyAmountMaxSlippage)
      caption = caption.replace(/\n[^\n]+\n(\n📍)/, '\n$1')
    if (!refundAddress) caption = caption.replace(/↩️.*\n/g, '')

    await deleteSwapMessage(ctx)
    await ctx.replyWithPhoto({ source: qrBuffer }, { caption, parse_mode: 'Markdown' })

    return ctx.scene.leave()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Confirm error:', error)
    try {
      await ctx.editMessageText(t(S.swapConfirmError, { error: errMsg }))
    } catch {
      // Swap message already deleted — send as new message
      await ctx.reply(t(S.swapConfirmError, { error: errMsg }))
    }
    return ctx.scene.leave()
  }
})

// Back button
swapWizard.action('go_back', async ctx => {
  const S = s(ctx.from?.language_code)
  await ctx.answerCbQuery()
  const cursor = ctx.wizard.cursor

  switch (cursor) {
    case 2: {
      // At assetOut selection → back to assetIn
      ctx.scene.session.assetIn = undefined
      const featuredAssets = getAssets(FEATURED_IDENTIFIERS)
      await ctx.editMessageText(S.selectSendAsset, {
        parse_mode: 'Markdown',
        ...assetKeyboard(featuredAssets, S)
      })
      ctx.wizard.selectStep(1)
      break
    }
    case 3: {
      // At amount input → back to assetOut
      ctx.scene.session.assetOut = undefined
      const featuredAssets = getAssets(FEATURED_IDENTIFIERS)
      const progress = buildProgress(ctx.scene.session, S)
      await ctx.editMessageText(t(S.selectReceiveAsset, { progress }), {
        parse_mode: 'Markdown',
        ...assetKeyboard(featuredAssets, S, ctx.scene.session.assetIn!.identifier, true)
      })
      ctx.wizard.selectStep(2)
      break
    }
    case 4: {
      // At route selection → back to amount
      ctx.scene.session.amount = undefined
      ctx.scene.session.usdInputAmount = undefined
      ctx.scene.session.routes = undefined
      ctx.scene.session.quote = undefined
      const progress = buildProgress(ctx.scene.session, S)
      await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(3)
      break
    }
    case 5: {
      // At destination input → re-fetch quotes (clear destination)
      ctx.scene.session.destinationAddress = undefined
      ctx.scene.session.quote = undefined
      ctx.scene.session.routes = undefined
      try {
        const success = await fetchAndShowRoutes(ctx)
        ctx.wizard.selectStep(4)
        if (!success) return
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Swap] Quote error:', error)
        const progress = buildProgress(ctx.scene.session, S)
        await editSwapMessage(ctx, t(S.quoteError, { progress, error: errMsg }))
        return ctx.scene.leave()
      }
      break
    }
    case 6: {
      // At refund input → back to destination
      ctx.scene.session.destinationAddress = undefined
      ctx.scene.session.refundAddress = undefined
      const progress = buildProgress(ctx.scene.session, S)
      const outAsset = assetCaption(ctx.scene.session.assetOut!)
      await ctx.editMessageText(t(S.enterDestination, { progress, asset: outAsset }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(5)
      break
    }
    case 7: {
      // At confirm → back depends on provider
      const isThorChain = ctx.scene.session.quote?.providers[0] === 'THORCHAIN'
      if (isThorChain) {
        // THORChain: back to destination (step 5)
        ctx.scene.session.destinationAddress = undefined
        const progress = buildProgress(ctx.scene.session, S)
        const outAsset = assetCaption(ctx.scene.session.assetOut!)
        await ctx.editMessageText(t(S.enterDestination, { progress, asset: outAsset }), {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([backCancelRow(S)])
        })
        ctx.wizard.selectStep(5)
      } else {
        // Other: back to refund (step 6)
        ctx.scene.session.refundAddress = undefined
        const progress = buildProgress(ctx.scene.session, S)
        const inAsset = assetCaption(ctx.scene.session.assetIn!)
        await ctx.editMessageText(t(S.enterRefund, { progress, asset: inAsset }), {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([backCancelRow(S)])
        })
        ctx.wizard.selectStep(6)
      }
      break
    }
  }
})

// Clear search — return to featured list
swapWizard.action('clear_search', async ctx => {
  const S = s(ctx.from?.language_code)
  await ctx.answerCbQuery()
  ctx.scene.session.searchResults = undefined
  const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

  if (ctx.wizard.cursor === 1) {
    await ctx.editMessageText(S.selectSendAsset, {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, S)
    })
  } else if (ctx.wizard.cursor === 2) {
    const progress = buildProgress(ctx.scene.session, S)
    await ctx.editMessageText(t(S.selectReceiveAsset, { progress }), {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, S, ctx.scene.session.assetIn?.identifier, true)
    })
  }
})

// Disabled button (already selected asset)
swapWizard.action('disabled', async ctx => {
  const S = s(ctx.from?.language_code)
  await ctx.answerCbQuery(S.alreadySelected)
})

// Cancel swap (inline button)
swapWizard.action('cancel_swap', async ctx => {
  const S = s(ctx.from?.language_code)
  await ctx.answerCbQuery(S.swapCancelled)
  await ctx.editMessageText(S.swapCancelled)
  return ctx.scene.leave()
})

// Change amount — go back to amount input (step 3)
swapWizard.action('change_amount', async ctx => {
  const S = s(ctx.from?.language_code)
  await ctx.answerCbQuery()
  ctx.scene.session.amount = undefined
  ctx.scene.session.usdInputAmount = undefined
  ctx.scene.session.destinationAddress = undefined
  ctx.scene.session.refundAddress = undefined
  ctx.scene.session.routes = undefined
  ctx.scene.session.quote = undefined
  const progress = buildProgress(ctx.scene.session, S)
  await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([backCancelRow(S)])
  })
  ctx.wizard.selectStep(3)
})

// New swap — restart wizard
swapWizard.action('new_swap', async ctx => {
  await ctx.answerCbQuery()
  return restartWizard(ctx)
})

export { swapWizard }
