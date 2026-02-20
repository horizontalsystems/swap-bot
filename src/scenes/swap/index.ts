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

async function fetchAndShowRoutes(ctx: SwapContext): Promise<boolean> {
  const S = s(ctx.from?.language_code)
  const { assetIn, assetOut, amount, destinationAddress } = ctx.scene.session
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
    destinationAddress: destinationAddress!,
    providers,
    dry: true
  })

  if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
    if (quoteResponse.providerErrors && quoteResponse.providerErrors.length > 0) {
      await editSwapMessage(ctx, t(S.allProvidersFailed, { progress }))
    } else {
      await editSwapMessage(ctx, t(S.noRoutes, { progress }))
    }
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

  const buttonRows: ReturnType<typeof Markup.button.callback>[][] = []
  for (let i = 0; i < routeButtons.length; i += 2) {
    buttonRows.push(routeButtons.slice(i, i + 2))
  }
  buttonRows.push(backCancelRow(S))

  await editSwapMessage(
    ctx,
    t(S.quotesHeader, { progress, count: quoteResponse.routes.length, routes: routeLines.join('\n\n') }),
    { ...Markup.inlineKeyboard(buttonRows) }
  )

  return true
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
        await editSwapMessage(ctx, t(S.searchNoResults, { progress: '' }), {
          ...Markup.inlineKeyboard([clearSearchCancelRow(S)])
        })
      }
      return
    }
    await deleteUserMessage(ctx)
  },

  // Step 2: Waiting for assetOut callback or search text
  async ctx => {
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

  // Step 3: Handle amount input
  async ctx => {
    if (!ctx.has(message('text'))) return

    const S = s(ctx.from?.language_code)
    await deleteUserMessage(ctx)

    const text = ctx.message.text.trim()
    const asset = assetCaption(ctx.scene.session.assetIn!)
    const isUsdInput = text.startsWith('$')

    if (isUsdInput) {
      const usdAmount = parseFloat(text.slice(1))
      if (isNaN(usdAmount) || usdAmount <= 0) {
        const progress = buildProgress(ctx.scene.session, S)
        await editSwapMessage(ctx, t(S.invalidAmount, { progress, asset }), {
          ...Markup.inlineKeyboard([backCancelRow(S)])
        })
        return
      }

      const price = await getAssetPrice(ctx.scene.session.assetIn!.coingeckoId)
      if (price == null) {
        const progress = buildProgress(ctx.scene.session, S)
        await editSwapMessage(ctx, t(S.priceUnavailable, { progress, asset }), {
          ...Markup.inlineKeyboard([backCancelRow(S)])
        })
        return
      }

      ctx.scene.session.amount = usdAmount / price
      ctx.scene.session.usdInputAmount = usdAmount
    } else {
      const amount = parseFloat(text)
      if (isNaN(amount) || amount <= 0) {
        const progress = buildProgress(ctx.scene.session, S)
        await editSwapMessage(ctx, t(S.invalidAmount, { progress, asset }), {
          ...Markup.inlineKeyboard([backCancelRow(S)])
        })
        return
      }

      ctx.scene.session.amount = amount
      const price = await getAssetPrice(ctx.scene.session.assetIn!.coingeckoId)
      ctx.scene.session.usdInputAmount = price != null ? amount * price : undefined
    }

    const progress = buildProgress(ctx.scene.session, S)
    const outAsset = assetCaption(ctx.scene.session.assetOut!)
    await editSwapMessage(ctx, t(S.enterDestination, { progress, asset: outAsset }), {
      ...Markup.inlineKeyboard([backCancelRow(S)])
    })

    return ctx.wizard.next()
  },

  // Step 4: Handle destination address
  async ctx => {
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

    const progress = buildProgress(ctx.scene.session, S)
    const inAsset = assetCaption(ctx.scene.session.assetIn!)
    await editSwapMessage(ctx, t(S.enterRefund, { progress, asset: inAsset }), {
      ...Markup.inlineKeyboard([backCancelRow(S)])
    })

    return ctx.wizard.next()
  },

  // Step 5: Handle refund address, fetch quotes, show route options
  async ctx => {
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

    try {
      const success = await fetchAndShowRoutes(ctx)
      if (!success) return ctx.scene.leave()
      return ctx.wizard.next()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Swap] Quote error:', error)
      const progress = buildProgress(ctx.scene.session, S)
      await editSwapMessage(ctx, t(S.quoteError, { progress, error: errMsg }))
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

    ctx.scene.session.assetOut = asset
    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

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
    ctx.scene.session.assetOut = asset
    ctx.scene.session.searchResults = undefined
    await ctx.answerCbQuery(`Selected ${assetCaption(asset)}`)
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    const progress = buildProgress(ctx.scene.session, S)
    await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([backCancelRow(S)])
    })

    return ctx.wizard.next()
  }
})

// Route selection
swapWizard.action(/^route_(\d+)$/, async ctx => {
  const S = s(ctx.from?.language_code)
  const index = parseInt(ctx.match[1], 10)
  const { routes, assetIn, assetOut, amount, destinationAddress, refundAddress } = ctx.scene.session

  if (!routes || !routes[index] || !assetIn || !assetOut || !amount || !destinationAddress || !refundAddress) {
    await ctx.answerCbQuery(S.sessionExpired)
    return ctx.scene.leave()
  }

  const route = routes[index]
  ctx.scene.session.quote = route

  await ctx.answerCbQuery(`Selected ${providerName(route.providers[0])}`)

  const { inPrice, outPrice } = await getSwapPrices(assetIn.coingeckoId, assetOut.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null
  const minReceiveUsdVal = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmountMaxSlippage) : null

  await ctx.editMessageText(
    t(S.swapSummary, {
      sendAmount: formatAmount(amount),
      sendAsset: assetCaption(assetIn),
      sendUsd: formatUsd(sendUsdVal),
      receiveAmount: formatAmount(route.expectedBuyAmount),
      receiveAsset: assetCaption(assetOut),
      receiveUsd: formatUsd(receiveUsdVal),
      minReceive: formatAmount(route.expectedBuyAmountMaxSlippage),
      minReceiveUsd: formatUsd(minReceiveUsdVal),
      destination: shortenAddress(destinationAddress),
      refund: shortenAddress(refundAddress),
      provider: providerName(route.providers[0]),
      time: formatTime(route.estimatedTime.total)
    }),
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(S.confirmButton, 'confirm_swap')], backCancelRow(S)])
    }
  )

  return ctx.wizard.next()
})

// Confirm swap — call API with dry: false
swapWizard.action('confirm_swap', async ctx => {
  const S = s(ctx.from?.language_code)
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = ctx.scene.session

  if (!assetIn || !assetOut || !amount || !destinationAddress || !refundAddress || !quote) {
    await ctx.answerCbQuery(S.sessionExpired)
    return ctx.scene.leave()
  }

  await ctx.answerCbQuery(S.processingSwap)

  const { inPrice, outPrice } = await getSwapPrices(assetIn.coingeckoId, assetOut.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmount) : null
  const minReceiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmountMaxSlippage) : null

  await ctx.editMessageText(
    t(S.preparingSwap, {
      sendAmount: formatAmount(amount),
      sendAsset: assetCaption(assetIn),
      sendUsd: formatUsd(sendUsdVal),
      receiveAmount: formatAmount(quote.expectedBuyAmount),
      receiveAsset: assetCaption(assetOut),
      receiveUsd: formatUsd(receiveUsdVal),
      minReceive: formatAmount(quote.expectedBuyAmountMaxSlippage),
      minReceiveUsd: formatUsd(minReceiveUsdVal),
      destination: shortenAddress(destinationAddress),
      refund: shortenAddress(refundAddress),
      provider: providerName(quote.providers[0]),
      time: formatTime(quote.estimatedTime.total)
    }),
    { parse_mode: 'Markdown' }
  )

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
      return ctx.scene.leave()
    }

    const route = quoteResponse.routes[0]
    const isThorchain = route.providers[0] === 'THORCHAIN'

    let qrDataURL: string | undefined
    let inboundAddr: string | undefined
    let sendAmount: number = amount
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
      expiresIn = preflightData.data.seconds_remaining
      console.log('[Swap] Memoless flow complete — inbound:', inboundAddr, 'sendAmount:', sendAmount)
    } else {
      qrDataURL = route.qrCodeDataURL
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

    const caption = t(S.swapConfirmed, {
      sendAmount: formatAmount(sendAmount),
      sendAsset: assetCaption(assetIn),
      sendUsd: formatUsd(confirmSendUsd),
      receiveAmount: formatAmount(route.expectedBuyAmount),
      receiveAsset: assetCaption(assetOut),
      receiveUsd: formatUsd(confirmReceiveUsd),
      minReceive: formatAmount(route.expectedBuyAmountMaxSlippage),
      minReceiveUsd: formatUsd(confirmMinReceiveUsd),
      destination: shortenAddress(destinationAddress),
      refund: shortenAddress(refundAddress),
      inboundAddress: inboundAddr ?? '',
      provider: route.providers.map(p => providerName(p)).join(', '),
      time: formatTime(route.estimatedTime.total),
      expiration: expiresIn != null ? formatTime(expiresIn) : 'N/A'
    })

    // const paymentUri = buildPaymentUri(assetIn.chain, inboundAddr!, sendAmount, assetIn.address)
    // const fullCaption = paymentUri ? caption + `\n\n${S.openInWallet}:\n\`${paymentUri}\`` : caption
    const fullCaption = caption

    await deleteSwapMessage(ctx)
    await ctx.replyWithPhoto({ source: qrBuffer }, { caption: fullCaption, parse_mode: 'Markdown' })

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
      // At destination input → back to amount
      ctx.scene.session.amount = undefined
      ctx.scene.session.usdInputAmount = undefined
      const progress = buildProgress(ctx.scene.session, S)
      await ctx.editMessageText(t(S.enterAmount, { progress, asset: assetCaption(ctx.scene.session.assetIn!) }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(3)
      break
    }
    case 5: {
      // At refund input → back to destination
      ctx.scene.session.destinationAddress = undefined
      const progress = buildProgress(ctx.scene.session, S)
      const outAsset = assetCaption(ctx.scene.session.assetOut!)
      await ctx.editMessageText(t(S.enterDestination, { progress, asset: outAsset }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(4)
      break
    }
    case 6: {
      // At route selection → back to refund
      ctx.scene.session.refundAddress = undefined
      ctx.scene.session.routes = undefined
      const progress = buildProgress(ctx.scene.session, S)
      const inAsset = assetCaption(ctx.scene.session.assetIn!)
      await ctx.editMessageText(t(S.enterRefund, { progress, asset: inAsset }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([backCancelRow(S)])
      })
      ctx.wizard.selectStep(5)
      break
    }
    case 7: {
      // At confirm → back to route selection (re-fetch quotes)
      ctx.scene.session.quote = undefined
      ctx.scene.session.routes = undefined
      try {
        const success = await fetchAndShowRoutes(ctx)
        if (!success) return ctx.scene.leave()
        ctx.wizard.selectStep(6)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Swap] Quote error:', error)
        const progress = buildProgress(ctx.scene.session, S)
        await editSwapMessage(ctx, t(S.quoteError, { progress, error: errMsg }))
        return ctx.scene.leave()
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

export { swapWizard }
