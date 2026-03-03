import { ChatClient } from 'simplex-chat'
import { T } from '@simplex-chat/types'
import { ALLOWED_PROVIDERS, FEATURED_IDENTIFIERS } from '../../config/assets'
import { s, t } from '../../config/strings'
import { getAssets, getProvidersForPair, searchAssets } from '../../db/tokens'
import { Asset, QuoteRoute, SwapSessionData } from '../../types/context'
import { getAssetPrice, getSwapPrices } from '../../services/prices'
import { fetchQuote } from '../../utils/api'
import { preflightMemoless, registerMemoless } from '../../utils/memoless-api'
import { validateAddress } from '../../utils/addressValidator'
import {
  assetCaption,
  buildProgress,
  buildTrackUrl,
  formatAmount,
  formatTime,
  formatUsd,
  providerLabel,
  providerName,
  shortenAddress,
  truncateToDecimals
} from './helpers'

const S = s('en')
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// --- State machine ---

enum SwapStep {
  SELECT_SEND_ASSET,
  SELECT_RECV_ASSET,
  ENTER_AMOUNT,
  SELECT_ROUTE,
  ENTER_DESTINATION,
  ENTER_REFUND,
  CONFIRM
}

interface SimplexSwapSession {
  step: SwapStep
  assetIn?: Asset
  assetOut?: Asset
  amount?: number
  usdInputAmount?: number
  destinationAddress?: string
  refundAddress?: string
  routes?: QuoteRoute[]
  quote?: QuoteRoute
  menuItems?: Asset[]
  lastActivity: number
}

const sessions = new Map<number, SimplexSwapSession>()

// --- Helpers ---

function amt(value: number | string, decimals?: number | null): string {
  return '`' + formatAmount(value, decimals) + '`'
}

function code(text: string): string {
  return '`' + text + '`'
}

function progress(session: SimplexSwapSession): string {
  return buildProgress(session as unknown as SwapSessionData, S)
    .replace(
      /^(Send: )(.+)/m,
      (_, p, rest) =>
        p +
        rest
          .split(' → ')
          .map((a: string) => code(a))
          .join(' → ')
    )
    .replace(/^(Receive: )(.+)/m, (_, p, a) => p + code(a))
    .replace(/^(Amount: )([\d,.]+) (\S+)/m, (_, p, n, a) => `${p}\`${n}\` \`${a}\``)
}

async function send(client: ChatClient, contactId: number, text: string): Promise<void> {
  try {
    await client.apiSendTextMessage(T.ChatType.Direct, contactId, text)
  } catch (err) {
    console.error(`[SimpleX] Failed to send message to contact ${contactId}:`, err)
  }
}

async function sendImage(client: ChatClient, contactId: number, base64Image: string, caption: string): Promise<void> {
  try {
    await client.apiSendMessages(T.ChatType.Direct, contactId, [
      { msgContent: { type: 'image', text: caption, image: base64Image }, mentions: {} }
    ])
  } catch (err) {
    console.error(`[SimpleX] Failed to send image to contact ${contactId}:`, err)
    await send(client, contactId, caption)
  }
}

const HINT_LABELS: Record<string, string> = {
  s: 's = new swap',
  c: 'c = cancel swap',
  b: 'b = back',
  y: 'y = yes',
  r: 'r = reset search',
  f: 'f = FAQ'
}

function hint(...keys: string[]): string {
  return '\n\n' + keys.map(k => HINT_LABELS[k] ?? k).join('\n')
}

function assetList(assets: Asset[], disabledIdentifier?: string): string {
  return assets
    .map((a, i) => {
      const label = code(assetCaption(a))
      if (a.identifier === disabledIdentifier) return `${i + 1}. ${label} ✓`
      return `${i + 1}. ${label}`
    })
    .join('\n')
}

// --- Show step prompts ---

async function showSelectSendAsset(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  const featured = getAssets(FEATURED_IDENTIFIERS)
  if (featured.length === 0) {
    await send(client, contactId, S.noAssetsAvailable)
    sessions.delete(contactId)
    return
  }
  session.menuItems = featured
  await send(client, contactId, S.selectSendAsset + '\n\n' + assetList(featured) + hint('c'))
}

async function showSelectRecvAsset(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  const featured = getAssets(FEATURED_IDENTIFIERS)
  session.menuItems = featured
  await send(
    client,
    contactId,
    t(S.selectReceiveAsset, { progress: progress(session) }) +
      '\n\n' +
      assetList(featured, session.assetIn?.identifier) +
      hint('b', 'c')
  )
}

async function showEnterAmount(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  await send(
    client,
    contactId,
    t(S.enterAmount, { progress: progress(session), asset: code(assetCaption(session.assetIn!)) }) + hint('b', 'c')
  )
}

async function showEnterDestination(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  await send(
    client,
    contactId,
    t(S.enterDestination, { progress: progress(session), asset: code(assetCaption(session.assetOut!)) }) +
      hint('b', 'c')
  )
}

async function showEnterRefund(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  await send(
    client,
    contactId,
    t(S.enterRefund, { progress: progress(session), asset: code(assetCaption(session.assetIn!)) }) + hint('b', 'c')
  )
}

async function fetchAndShowRoutes(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession
): Promise<boolean> {
  const { assetIn, assetOut, amount } = session
  const prog = progress(session)

  const providers = getProvidersForPair(assetIn!.identifier, assetOut!.identifier).filter(p =>
    ALLOWED_PROVIDERS.includes(p)
  )

  if (providers.length === 0) {
    await send(client, contactId, t(S.noProviders, { progress: prog }))
    return false
  }

  await send(client, contactId, t(S.fetchingQuotes, { progress: prog }))

  const quoteResponse = await fetchQuote({
    sellAsset: assetIn!.identifier,
    buyAsset: assetOut!.identifier,
    sellAmount: amount!.toString(),
    providers,
    dry: true
  })

  if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
    const failMsg = quoteResponse.providerErrors?.length
      ? t(S.allProvidersFailed, { progress: prog })
      : t(S.noRoutes, { progress: prog })
    await send(client, contactId, failMsg + hint('b', 's'))
    return false
  }

  quoteResponse.routes.sort((a, b) => parseFloat(b.expectedBuyAmount) - parseFloat(a.expectedBuyAmount))
  session.routes = quoteResponse.routes

  const { outPrice } = await getSwapPrices(assetIn!.coingeckoId, assetOut!.coingeckoId)

  const routeLines = quoteResponse.routes.map((route, i) => {
    const receiveUsdVal = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null
    return (
      t(S.quoteLine, {
        index: i + 1,
        provider: providerName(route.providers[0]),
        amount: amt(route.expectedBuyAmount, assetOut!.decimals),
        ticker: code(assetOut!.ticker),
        receiveUsd: formatUsd(receiveUsdVal),
        time: formatTime(route.estimatedTime.total)
      }) + ` — ${providerLabel(route.providers[0])}`
    )
  })

  await send(
    client,
    contactId,
    t(S.quotesHeader, { progress: prog, count: quoteResponse.routes.length, routes: routeLines.join('\n') }) +
      hint('b', 'c')
  )

  return true
}

async function showSummary(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = session

  const { inPrice, outPrice } = await getSwapPrices(assetIn!.coingeckoId, assetOut!.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount! : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote!.expectedBuyAmount) : null
  const minReceiveUsdVal = outPrice != null ? outPrice * parseFloat(quote!.expectedBuyAmountMaxSlippage) : null

  let summaryText = t(S.swapSummary, {
    sendAmount: amt(amount!, assetIn!.decimals),
    sendAsset: code(assetCaption(assetIn!)),
    sendUsd: formatUsd(sendUsdVal),
    receiveAmount: amt(quote!.expectedBuyAmount, assetOut!.decimals),
    receiveAsset: code(assetCaption(assetOut!)),
    receiveUsd: formatUsd(receiveUsdVal),
    minReceive: amt(quote!.expectedBuyAmountMaxSlippage, assetOut!.decimals),
    minReceiveUsd: formatUsd(minReceiveUsdVal),
    destination: shortenAddress(destinationAddress!),
    refund: refundAddress ? shortenAddress(refundAddress) : '',
    provider: providerName(quote!.providers[0]),
    time: formatTime(quote!.estimatedTime.total)
  })
  if (quote!.expectedBuyAmount === quote!.expectedBuyAmountMaxSlippage)
    summaryText = summaryText.replace(/\n[^\n]+\n(\n📍)/, '\n$1')
  if (!refundAddress) summaryText = summaryText.replace(/↩️.*\n/g, '')

  await send(client, contactId, summaryText + hint('y', 'b', 'c'))
}

// --- Step handlers ---

async function handleSelectSendAsset(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  const num = parseInt(input, 10)
  if (!isNaN(num) && num >= 1 && session.menuItems && num <= session.menuItems.length) {
    const asset = session.menuItems[num - 1]
    session.assetIn = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)
    session.step = SwapStep.SELECT_RECV_ASSET
    await showSelectRecvAsset(client, contactId, session)
    return
  }

  if (input.length >= 2) {
    const results = searchAssets(input)
    if (results.length > 0) {
      session.menuItems = results
      await send(client, contactId, S.selectSendAsset + '\n\n' + assetList(results) + hint('r', 'c'))
    } else {
      await send(client, contactId, 'No assets found. Try a different search.' + hint('r', 'b'))
    }
    return
  }

  await send(client, contactId, 'Enter a number to select, or type a name to search.')
}

async function handleSelectRecvAsset(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  const num = parseInt(input, 10)
  if (!isNaN(num) && num >= 1 && session.menuItems && num <= session.menuItems.length) {
    const asset = session.menuItems[num - 1]

    if (asset.identifier === session.assetIn?.identifier) {
      await send(client, contactId, 'Already selected as send asset. Choose a different one.')
      return
    }

    const providers = getProvidersForPair(session.assetIn!.identifier, asset.identifier).filter(p =>
      ALLOWED_PROVIDERS.includes(p)
    )

    session.assetOut = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    if (providers.length === 0) {
      await send(client, contactId, t(S.noProviders, { progress: progress(session) }) + hint('b', 'c'))
      // Stay at ENTER_AMOUNT so "b" returns to SELECT_RECV_ASSET
      session.step = SwapStep.ENTER_AMOUNT
      return
    }

    session.step = SwapStep.ENTER_AMOUNT
    await showEnterAmount(client, contactId, session)
    return
  }

  if (input.length >= 2) {
    const results = searchAssets(input)
    if (results.length > 0) {
      session.menuItems = results
      await send(
        client,
        contactId,
        t(S.selectReceiveAsset, { progress: progress(session) }) +
          '\n\n' +
          assetList(results, session.assetIn?.identifier) +
          hint('r', 'b')
      )
    } else {
      await send(client, contactId, 'No assets found. Try a different search.' + hint('r', 'b'))
    }
    return
  }

  await send(client, contactId, 'Enter a number to select, or type a name to search.')
}

async function handleEnterAmount(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  const asset = code(assetCaption(session.assetIn!))

  const isUsdInput = input.startsWith('$') || input.endsWith('$')
  const numStr = input.replace(/\$/g, '')

  if (!/^\d*\.?\d+$/.test(numStr)) {
    await send(client, contactId, t(S.invalidAmount, { progress: progress(session), asset }))
    return
  }

  const parsedAmount = parseFloat(numStr)
  if (parsedAmount <= 0) {
    await send(client, contactId, t(S.invalidAmount, { progress: progress(session), asset }))
    return
  }

  if (isUsdInput) {
    const price = await getAssetPrice(session.assetIn!.coingeckoId)
    if (price == null) {
      await send(client, contactId, t(S.priceUnavailable, { progress: progress(session), asset }))
      return
    }
    session.amount = truncateToDecimals(parsedAmount / price, session.assetIn!.decimals)
    session.usdInputAmount = parsedAmount
  } else {
    session.amount = truncateToDecimals(parsedAmount, session.assetIn!.decimals)
    const price = await getAssetPrice(session.assetIn!.coingeckoId)
    session.usdInputAmount = price != null ? parsedAmount * price : undefined
  }

  try {
    await fetchAndShowRoutes(client, contactId, session)
    session.step = SwapStep.SELECT_ROUTE
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Quote error:', error)
    await send(client, contactId, t(S.quoteError, { progress: progress(session), error: errMsg }))
    sessions.delete(contactId)
  }
}

async function handleSelectRoute(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  const num = parseInt(input, 10)
  if (isNaN(num) || !session.routes || num < 1 || num > session.routes.length) {
    await send(client, contactId, `Enter a route number (1-${session.routes?.length ?? '?'}).` + hint('b', 'c'))
    return
  }

  session.quote = session.routes[num - 1]
  session.step = SwapStep.ENTER_DESTINATION
  await showEnterDestination(client, contactId, session)
}

async function handleEnterDestination(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  const asset = code(assetCaption(session.assetOut!))
  const addressError = validateAddress(session.assetOut!.identifier, input)
  if (addressError) {
    await send(client, contactId, t(S.invalidDestination, { progress: progress(session), asset, hint: addressError }))
    return
  }

  session.destinationAddress = input

  const isThorChain = session.quote!.providers[0] === 'THORCHAIN'
  if (isThorChain) {
    session.step = SwapStep.CONFIRM
    await showSummary(client, contactId, session)
    return
  }

  session.step = SwapStep.ENTER_REFUND
  await showEnterRefund(client, contactId, session)
}

async function handleEnterRefund(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  const asset = code(assetCaption(session.assetIn!))
  const refundError = validateAddress(session.assetIn!.identifier, input)
  if (refundError) {
    await send(client, contactId, t(S.invalidRefund, { progress: progress(session), asset, hint: refundError }))
    return
  }

  session.refundAddress = input
  session.step = SwapStep.CONFIRM
  await showSummary(client, contactId, session)
}

async function handleConfirm(
  client: ChatClient,
  contactId: number,
  session: SimplexSwapSession,
  input: string
): Promise<void> {
  if (input.toLowerCase() !== 'y') {
    await send(client, contactId, hint('y', 'b', 'c').trim())
    return
  }
  await executeSwap(client, contactId, session)
}

// --- Execute swap ---

async function executeSwap(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = session
  const isThorChain = quote?.providers[0] === 'THORCHAIN'

  if (!assetIn || !assetOut || !amount || !destinationAddress || !quote || (!isThorChain && !refundAddress)) {
    await send(client, contactId, S.sessionExpired)
    sessions.delete(contactId)
    return
  }

  const { inPrice, outPrice } = await getSwapPrices(assetIn.coingeckoId, assetOut.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmount) : null
  const minReceiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmountMaxSlippage) : null

  let preparingText = t(S.preparingSwap, {
    sendAmount: amt(amount, assetIn.decimals),
    sendAsset: code(assetCaption(assetIn)),
    sendUsd: formatUsd(sendUsdVal),
    receiveAmount: amt(quote.expectedBuyAmount, assetOut.decimals),
    receiveAsset: code(assetCaption(assetOut)),
    receiveUsd: formatUsd(receiveUsdVal),
    minReceive: amt(quote.expectedBuyAmountMaxSlippage, assetOut.decimals),
    minReceiveUsd: formatUsd(minReceiveUsdVal),
    destination: shortenAddress(destinationAddress),
    refund: refundAddress ? shortenAddress(refundAddress) : '',
    provider: providerName(quote.providers[0]),
    time: formatTime(quote.estimatedTime.total)
  })
  if (quote.expectedBuyAmount === quote.expectedBuyAmountMaxSlippage)
    preparingText = preparingText.replace(/\n[^\n]+\n(\n📍)/, '\n$1')
  if (!refundAddress) preparingText = preparingText.replace(/↩️.*\n/g, '')

  await send(client, contactId, preparingText)

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
      await send(client, contactId, S.swapFailedNoRoutes)
      sessions.delete(contactId)
      return
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
        await send(client, contactId, S.swapNoQr)
        sessions.delete(contactId)
        return
      }

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
      await send(client, contactId, S.swapNoQr)
      sessions.delete(contactId)
      return
    }

    const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '')

    const confirmSendUsd = inPrice != null ? inPrice * sendAmount : null
    const confirmReceiveUsd = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null
    const confirmMinReceiveUsd = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmountMaxSlippage) : null

    const warning = isThorchain ? `\n\n${S.amountWarning}` : ''

    const links: string[] = []
    const paymentLink = paymentUri ? `https://swap.unstoppable.money/pay?uri=${encodeURIComponent(paymentUri)}` : null
    if (paymentLink) links.push(`📲 [${S.openWalletApp}](${paymentLink})`)

    const provider = route.providers[0]
    const trackUrl = buildTrackUrl(provider, {
      inboundAddr,
      chainId: assetIn.chainId,
      providerSwapId: route.providerSwapId,
      fromAsset: assetIn.identifier,
      fromAmount: sendAmount.toString(),
      toAsset: assetOut.identifier,
      toAmount: route.expectedBuyAmount,
      toAddress: destinationAddress,
      refundAddress
    })
    if (trackUrl) links.push(`🔍 [${S.trackSwap}](${trackUrl})`)

    let caption = t(S.swapConfirmed, {
      sendAmount: amt(sendAmount, assetIn.decimals),
      sendAmountRaw,
      sendAsset: code(assetCaption(assetIn)),
      sendUsd: formatUsd(confirmSendUsd),
      receiveAmount: amt(route.expectedBuyAmount, assetOut.decimals),
      receiveAsset: code(assetCaption(assetOut)),
      receiveUsd: formatUsd(confirmReceiveUsd),
      minReceive: amt(route.expectedBuyAmountMaxSlippage, assetOut.decimals),
      minReceiveUsd: formatUsd(confirmMinReceiveUsd),
      destination: shortenAddress(destinationAddress),
      refund: refundAddress ? shortenAddress(refundAddress) : '',
      inboundAddress: inboundAddr ?? '',
      provider: route.providers.map(p => providerName(p)).join(', '),
      time: formatTime(route.estimatedTime.total),
      expiration: expiresIn != null ? formatTime(expiresIn) : 'N/A',
      warning,
      links: links.length ? `\n\n${links.join('\n')}\n\n` : ''
    })
    if (route.expectedBuyAmount === route.expectedBuyAmountMaxSlippage)
      caption = caption.replace(/\n[^\n]+\n(\n📍)/, '\n$1')
    if (!refundAddress) caption = caption.replace(/↩️.*\n/g, '')

    await sendImage(client, contactId, base64Data, '')
    await send(client, contactId, caption)
    await send(client, contactId, `\`${sendAmountRaw}\``)
    await send(client, contactId, `\`${inboundAddr}\``)

    sessions.delete(contactId)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Confirm error:', error)
    await send(client, contactId, t(S.swapConfirmError, { error: errMsg }))
    sessions.delete(contactId)
  }
}

// --- Back navigation ---

async function handleBack(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  switch (session.step) {
    case SwapStep.SELECT_SEND_ASSET:
      sessions.delete(contactId)
      await send(client, contactId, 'Swap cancelled.')
      break

    case SwapStep.SELECT_RECV_ASSET:
      session.assetIn = undefined
      session.step = SwapStep.SELECT_SEND_ASSET
      await showSelectSendAsset(client, contactId, session)
      break

    case SwapStep.ENTER_AMOUNT:
      session.assetOut = undefined
      session.step = SwapStep.SELECT_RECV_ASSET
      await showSelectRecvAsset(client, contactId, session)
      break

    case SwapStep.SELECT_ROUTE:
      session.amount = undefined
      session.usdInputAmount = undefined
      session.routes = undefined
      session.quote = undefined
      session.step = SwapStep.ENTER_AMOUNT
      await showEnterAmount(client, contactId, session)
      break

    case SwapStep.ENTER_DESTINATION:
      session.destinationAddress = undefined
      session.quote = undefined
      session.routes = undefined
      session.step = SwapStep.SELECT_ROUTE
      try {
        await fetchAndShowRoutes(client, contactId, session)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Swap] Quote error:', error)
        await send(client, contactId, t(S.quoteError, { progress: progress(session), error: errMsg }))
        sessions.delete(contactId)
      }
      break

    case SwapStep.ENTER_REFUND:
      session.destinationAddress = undefined
      session.refundAddress = undefined
      session.step = SwapStep.ENTER_DESTINATION
      await showEnterDestination(client, contactId, session)
      break

    case SwapStep.CONFIRM: {
      const isThorChain = session.quote?.providers[0] === 'THORCHAIN'
      if (isThorChain) {
        session.destinationAddress = undefined
        session.step = SwapStep.ENTER_DESTINATION
        await showEnterDestination(client, contactId, session)
      } else {
        session.refundAddress = undefined
        session.step = SwapStep.ENTER_REFUND
        await showEnterRefund(client, contactId, session)
      }
      break
    }
  }
}

// --- Public API ---

export async function handleSwapMessage(client: ChatClient, contactId: number, text: string): Promise<void> {
  const input = text.trim()
  const lower = input.toLowerCase()

  // Global commands (with shortcuts)
  if (lower === 'c') {
    sessions.delete(contactId)
    await send(client, contactId, 'Swap cancelled.')
    return
  }

  if (lower === 's' || lower === '/start') {
    sessions.delete(contactId)
    const session: SimplexSwapSession = {
      step: SwapStep.SELECT_SEND_ASSET,
      lastActivity: Date.now()
    }
    sessions.set(contactId, session)
    await showSelectSendAsset(client, contactId, session)
    return
  }

  if (lower === 'f') {
    await send(client, contactId, S.faq)
    return
  }

  const session = sessions.get(contactId)
  if (!session) {
    await send(client, contactId, 'Commands:\n\ns = start a new swap\nf = FAQ')
    return
  }

  session.lastActivity = Date.now()

  if (lower === 'b') {
    await handleBack(client, contactId, session)
    return
  }

  if (lower === 'r') {
    if (session.step === SwapStep.SELECT_SEND_ASSET) {
      await showSelectSendAsset(client, contactId, session)
    } else if (session.step === SwapStep.SELECT_RECV_ASSET) {
      await showSelectRecvAsset(client, contactId, session)
    }
    return
  }

  switch (session.step) {
    case SwapStep.SELECT_SEND_ASSET:
      await handleSelectSendAsset(client, contactId, session, input)
      break
    case SwapStep.SELECT_RECV_ASSET:
      await handleSelectRecvAsset(client, contactId, session, input)
      break
    case SwapStep.ENTER_AMOUNT:
      await handleEnterAmount(client, contactId, session, input)
      break
    case SwapStep.SELECT_ROUTE:
      await handleSelectRoute(client, contactId, session, input)
      break
    case SwapStep.ENTER_DESTINATION:
      await handleEnterDestination(client, contactId, session, input)
      break
    case SwapStep.ENTER_REFUND:
      await handleEnterRefund(client, contactId, session, input)
      break
    case SwapStep.CONFIRM:
      await handleConfirm(client, contactId, session, input)
      break
  }
}

export function cleanupSessions(): void {
  const now = Date.now()
  for (const [contactId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(contactId)
      console.log(`[SimpleX] Session expired for contact ${contactId}`)
    }
  }
}
