import fs from 'fs'
import os from 'os'
import path from 'path'
import { ALLOWED_PROVIDERS, FEATURED_IDENTIFIERS } from '../../config/assets'
import { s, t } from '../../config/strings'
import { getAssets, getProvidersForPair, searchAssets } from '../../db/tokens'
import { Asset, QuoteRoute, SwapSessionData } from '../../types/context'
import { getAssetPrice, getSwapPrices } from '../../services/prices'
import { fetchQuote } from '../../utils/api'
import { preflightMemoless, registerMemoless } from '../../utils/memoless-api'
import { validateAddress } from '../../utils/addressValidator'
import { SignalRpcClient } from '../../utils/signal-rpc'
import {
  assetCaption,
  buildProgress,
  buildTrackUrl,
  formatAmount,
  formatTime,
  formatUsd,
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

interface SignalSwapSession {
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

// Keyed by the sender's Signal identifier (phone number or UUID).
const sessions = new Map<string, SignalSwapSession>()

// --- Helpers ---

// Signal renders plain text — Telegram/SimpleX markdown (backticks, `[label](url)`
// links, `*bold*`) would show literally. Strip it so messages read cleanly, while
// keeping the message-building code identical to the SimpleX flow.
function toPlainText(text: string): string {
  return text
    .replace(/\[([^\]]*)]\(([^)]+)\)/g, (_, label: string, url: string) => (label ? `${label}: ${url}` : url))
    .replace(/`/g, '')
    .replace(/\*(.+?)\*/g, '$1')
}

function amt(value: number | string, decimals?: number | null): string {
  return '`' + formatAmount(value, decimals) + '`'
}

function code(text: string): string {
  return '`' + text + '`'
}

function progress(session: SignalSwapSession): string {
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

async function send(client: SignalRpcClient, recipient: string, text: string): Promise<void> {
  try {
    await client.sendMessage(recipient, toPlainText(text))
  } catch (err) {
    console.error(`[Signal] Failed to send message to ${recipient}:`, err)
  }
}

async function sendImage(
  client: SignalRpcClient,
  recipient: string,
  base64Image: string,
  caption: string
): Promise<void> {
  let filePath: string | undefined
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
    filePath = path.join(os.tmpdir(), `swap-qr-${recipient.replace(/[^\w+]/g, '')}-${process.hrtime.bigint()}.png`)
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))
    await client.sendMessage(recipient, toPlainText(caption), [filePath])
  } catch (err) {
    console.error(`[Signal] Failed to send image to ${recipient}:`, err)
    if (caption) await send(client, recipient, caption)
  } finally {
    if (filePath) {
      fs.promises.unlink(filePath).catch(() => {})
    }
  }
}

const PROVIDER_RISK: Record<string, string> = {
  THORCHAIN: 'DEX 👌',
  SWAPUZ: 'Private Liq 👌',
  STEALTHEX: 'AML, External Liq',
  LETSEXCHANGE: 'AML, External Liq',
  QUICKEX: 'AML, External Liq',
  NEAR: 'AML, External Liq',
  EXOLIX: 'AML, External Liq',
  CCE: 'AML, External Liq',
  PEGASUS: 'AML, External Liq'
}

function signalProviderLabel(id: string): string {
  return PROVIDER_RISK[id] ?? id
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

async function showSelectSendAsset(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession
): Promise<void> {
  const featured = getAssets(FEATURED_IDENTIFIERS)
  if (featured.length === 0) {
    await send(client, recipient, S.noAssetsAvailable)
    sessions.delete(recipient)
    return
  }
  session.menuItems = featured
  await send(client, recipient, S.selectSendAsset + '\n\n' + assetList(featured) + hint('c'))
}

async function showSelectRecvAsset(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession
): Promise<void> {
  const featured = getAssets(FEATURED_IDENTIFIERS)
  session.menuItems = featured
  await send(
    client,
    recipient,
    t(S.selectReceiveAsset, { progress: progress(session) }) +
      '\n\n' +
      assetList(featured, session.assetIn?.identifier) +
      hint('b', 'c')
  )
}

async function showEnterAmount(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
  await send(
    client,
    recipient,
    t(S.enterAmount, { progress: progress(session), asset: code(assetCaption(session.assetIn!)) }) + hint('b', 'c')
  )
}

async function showEnterDestination(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession
): Promise<void> {
  await send(
    client,
    recipient,
    t(S.enterDestination, { progress: progress(session), asset: code(assetCaption(session.assetOut!)) }) +
      hint('b', 'c')
  )
}

async function showEnterRefund(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
  await send(
    client,
    recipient,
    t(S.enterRefund, { progress: progress(session), asset: code(assetCaption(session.assetIn!)) }) + hint('b', 'c')
  )
}

async function fetchAndShowRoutes(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession
): Promise<boolean> {
  const { assetIn, assetOut, amount } = session
  const prog = progress(session)

  const providers = getProvidersForPair(assetIn!.identifier, assetOut!.identifier).filter(p =>
    ALLOWED_PROVIDERS.includes(p)
  )

  if (providers.length === 0) {
    await send(client, recipient, t(S.noProviders, { progress: prog }))
    return false
  }

  await send(client, recipient, t(S.fetchingQuotes, { progress: prog }))

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
    await send(client, recipient, failMsg + hint('b', 's'))
    return false
  }

  quoteResponse.routes.sort((a, b) => parseFloat(b.expectedBuyAmount) - parseFloat(a.expectedBuyAmount))
  session.routes = quoteResponse.routes

  const { outPrice } = await getSwapPrices(assetIn!.coingeckoId, assetOut!.coingeckoId)

  const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

  const routeLines = quoteResponse.routes.map((route, i) => {
    const receiveUsdVal = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null
    const num = numEmojis[i] ?? `${i + 1}.`
    return (
      `${num} ${amt(route.expectedBuyAmount, assetOut!.decimals)} ${code(assetOut!.ticker)} ${formatUsd(receiveUsdVal)}\n` +
      `🕐 ${formatTime(route.estimatedTime.total)}, ${signalProviderLabel(route.providers[0])}`
    )
  })

  const count = quoteResponse.routes.length
  await send(
    client,
    recipient,
    prog +
      `\n\n${count} quote${count > 1 ? 's' : ''} available 👇\n\n` +
      routeLines.join('\n\n') +
      `\n\n${count === 1 ? '1 = select route' : `1-${count} = select route`}\n` +
      hint('b', 'c').trimStart()
  )

  return true
}

async function showSummary(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
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

  await send(client, recipient, summaryText + hint('y', 'b', 'c'))
}

// --- Step handlers ---

async function handleSelectSendAsset(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const num = parseInt(input, 10)
  if (!isNaN(num) && num >= 1 && session.menuItems && num <= session.menuItems.length) {
    const asset = session.menuItems[num - 1]
    session.assetIn = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)
    session.step = SwapStep.SELECT_RECV_ASSET
    await showSelectRecvAsset(client, recipient, session)
    return
  }

  if (input.length >= 2) {
    const results = searchAssets(input)
    if (results.length > 0) {
      session.menuItems = results
      await send(client, recipient, S.selectSendAsset + '\n\n' + assetList(results) + hint('r', 'c'))
    } else {
      await send(client, recipient, 'No assets found. Try a different search.' + hint('r', 'b'))
    }
    return
  }

  await send(client, recipient, 'Enter a number to select, or type a name to search.')
}

async function handleSelectRecvAsset(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const num = parseInt(input, 10)
  if (!isNaN(num) && num >= 1 && session.menuItems && num <= session.menuItems.length) {
    const asset = session.menuItems[num - 1]

    if (asset.identifier === session.assetIn?.identifier) {
      await send(client, recipient, 'Already selected as send asset. Choose a different one.')
      return
    }

    const providers = getProvidersForPair(session.assetIn!.identifier, asset.identifier).filter(p =>
      ALLOWED_PROVIDERS.includes(p)
    )

    session.assetOut = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    if (providers.length === 0) {
      await send(client, recipient, t(S.noProviders, { progress: progress(session) }) + hint('b', 'c'))
      // Stay at ENTER_AMOUNT so "b" returns to SELECT_RECV_ASSET
      session.step = SwapStep.ENTER_AMOUNT
      return
    }

    session.step = SwapStep.ENTER_AMOUNT
    await showEnterAmount(client, recipient, session)
    return
  }

  if (input.length >= 2) {
    const results = searchAssets(input)
    if (results.length > 0) {
      session.menuItems = results
      await send(
        client,
        recipient,
        t(S.selectReceiveAsset, { progress: progress(session) }) +
          '\n\n' +
          assetList(results, session.assetIn?.identifier) +
          hint('r', 'b')
      )
    } else {
      await send(client, recipient, 'No assets found. Try a different search.' + hint('r', 'b'))
    }
    return
  }

  await send(client, recipient, 'Enter a number to select, or type a name to search.')
}

async function handleEnterAmount(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const asset = code(assetCaption(session.assetIn!))

  const isUsdInput = input.startsWith('$') || input.endsWith('$')
  const numStr = input.replace(/\$/g, '')

  if (!/^\d*\.?\d+$/.test(numStr)) {
    await send(client, recipient, t(S.invalidAmount, { progress: progress(session), asset }))
    return
  }

  const parsedAmount = parseFloat(numStr)
  if (parsedAmount <= 0) {
    await send(client, recipient, t(S.invalidAmount, { progress: progress(session), asset }))
    return
  }

  if (isUsdInput) {
    const price = await getAssetPrice(session.assetIn!.coingeckoId)
    if (price == null) {
      await send(client, recipient, t(S.priceUnavailable, { progress: progress(session), asset }))
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
    await fetchAndShowRoutes(client, recipient, session)
    session.step = SwapStep.SELECT_ROUTE
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Quote error:', error)
    await send(client, recipient, t(S.quoteError, { progress: progress(session), error: errMsg }))
    sessions.delete(recipient)
  }
}

async function handleSelectRoute(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const num = parseInt(input, 10)
  if (isNaN(num) || !session.routes || num < 1 || num > session.routes.length) {
    await send(client, recipient, `Enter a route number (1-${session.routes?.length ?? '?'}).` + hint('b', 'c'))
    return
  }

  session.quote = session.routes[num - 1]
  session.step = SwapStep.ENTER_DESTINATION
  await showEnterDestination(client, recipient, session)
}

async function handleEnterDestination(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const asset = code(assetCaption(session.assetOut!))
  const addressError = validateAddress(session.assetOut!.identifier, input)
  if (addressError) {
    await send(client, recipient, t(S.invalidDestination, { progress: progress(session), asset, hint: addressError }))
    return
  }

  session.destinationAddress = input

  const isThorChain = session.quote!.providers[0] === 'THORCHAIN'
  if (isThorChain) {
    session.step = SwapStep.CONFIRM
    await showSummary(client, recipient, session)
    return
  }

  session.step = SwapStep.ENTER_REFUND
  await showEnterRefund(client, recipient, session)
}

async function handleEnterRefund(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const asset = code(assetCaption(session.assetIn!))
  const refundError = validateAddress(session.assetIn!.identifier, input)
  if (refundError) {
    await send(client, recipient, t(S.invalidRefund, { progress: progress(session), asset, hint: refundError }))
    return
  }

  session.refundAddress = input
  session.step = SwapStep.CONFIRM
  await showSummary(client, recipient, session)
}

async function handleConfirm(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  if (input.toLowerCase() !== 'y') {
    await send(client, recipient, hint('y', 'b', 'c').trim())
    return
  }
  await executeSwap(client, recipient, session)
}

// --- Execute swap ---

async function executeSwap(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = session
  const isThorChain = quote?.providers[0] === 'THORCHAIN'

  if (!assetIn || !assetOut || !amount || !destinationAddress || !quote || (!isThorChain && !refundAddress)) {
    await send(client, recipient, S.sessionExpired)
    sessions.delete(recipient)
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

  await send(client, recipient, preparingText)

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
      await send(client, recipient, S.swapFailedNoRoutes)
      sessions.delete(recipient)
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
        await send(client, recipient, S.swapNoQr)
        sessions.delete(recipient)
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
      await send(client, recipient, S.swapNoQr)
      sessions.delete(recipient)
      return
    }

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

    // Send the QR as an image, then the details, then the raw amount and inbound
    // address as their own messages so they're easy to copy on Signal.
    await sendImage(client, recipient, qrDataURL, '')
    await send(client, recipient, caption)
    await send(client, recipient, sendAmountRaw)
    await send(client, recipient, inboundAddr ?? '')

    sessions.delete(recipient)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Confirm error:', error)
    await send(client, recipient, t(S.swapConfirmError, { error: errMsg }))
    sessions.delete(recipient)
  }
}

// --- Back navigation ---

async function handleBack(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
  switch (session.step) {
    case SwapStep.SELECT_SEND_ASSET:
      sessions.delete(recipient)
      await send(client, recipient, 'Swap cancelled.')
      break

    case SwapStep.SELECT_RECV_ASSET:
      session.assetIn = undefined
      session.step = SwapStep.SELECT_SEND_ASSET
      await showSelectSendAsset(client, recipient, session)
      break

    case SwapStep.ENTER_AMOUNT:
      session.assetOut = undefined
      session.step = SwapStep.SELECT_RECV_ASSET
      await showSelectRecvAsset(client, recipient, session)
      break

    case SwapStep.SELECT_ROUTE:
      session.amount = undefined
      session.usdInputAmount = undefined
      session.routes = undefined
      session.quote = undefined
      session.step = SwapStep.ENTER_AMOUNT
      await showEnterAmount(client, recipient, session)
      break

    case SwapStep.ENTER_DESTINATION:
      session.destinationAddress = undefined
      session.quote = undefined
      session.routes = undefined
      session.step = SwapStep.SELECT_ROUTE
      try {
        await fetchAndShowRoutes(client, recipient, session)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Swap] Quote error:', error)
        await send(client, recipient, t(S.quoteError, { progress: progress(session), error: errMsg }))
        sessions.delete(recipient)
      }
      break

    case SwapStep.ENTER_REFUND:
      session.destinationAddress = undefined
      session.refundAddress = undefined
      session.step = SwapStep.ENTER_DESTINATION
      await showEnterDestination(client, recipient, session)
      break

    case SwapStep.CONFIRM: {
      const isThorChain = session.quote?.providers[0] === 'THORCHAIN'
      if (isThorChain) {
        session.destinationAddress = undefined
        session.step = SwapStep.ENTER_DESTINATION
        await showEnterDestination(client, recipient, session)
      } else {
        session.refundAddress = undefined
        session.step = SwapStep.ENTER_REFUND
        await showEnterRefund(client, recipient, session)
      }
      break
    }
  }
}

// --- Public API ---

export async function handleSwapMessage(client: SignalRpcClient, recipient: string, text: string): Promise<void> {
  const input = text.trim()
  const lower = input.toLowerCase()

  // Global commands (with shortcuts)
  if (lower === 'c') {
    sessions.delete(recipient)
    await send(client, recipient, 'Swap cancelled.')
    return
  }

  if (lower === 's' || lower === '/start') {
    sessions.delete(recipient)
    const session: SignalSwapSession = {
      step: SwapStep.SELECT_SEND_ASSET,
      lastActivity: Date.now()
    }
    sessions.set(recipient, session)
    await showSelectSendAsset(client, recipient, session)
    return
  }

  if (lower === 'f') {
    await send(client, recipient, S.faq)
    return
  }

  const session = sessions.get(recipient)
  if (!session) {
    await send(client, recipient, 'Commands:\n\ns = start a new swap\nf = FAQ')
    return
  }

  session.lastActivity = Date.now()

  if (lower === 'b') {
    await handleBack(client, recipient, session)
    return
  }

  if (lower === 'r') {
    if (session.step === SwapStep.SELECT_SEND_ASSET) {
      await showSelectSendAsset(client, recipient, session)
    } else if (session.step === SwapStep.SELECT_RECV_ASSET) {
      await showSelectRecvAsset(client, recipient, session)
    }
    return
  }

  switch (session.step) {
    case SwapStep.SELECT_SEND_ASSET:
      await handleSelectSendAsset(client, recipient, session, input)
      break
    case SwapStep.SELECT_RECV_ASSET:
      await handleSelectRecvAsset(client, recipient, session, input)
      break
    case SwapStep.ENTER_AMOUNT:
      await handleEnterAmount(client, recipient, session, input)
      break
    case SwapStep.SELECT_ROUTE:
      await handleSelectRoute(client, recipient, session, input)
      break
    case SwapStep.ENTER_DESTINATION:
      await handleEnterDestination(client, recipient, session, input)
      break
    case SwapStep.ENTER_REFUND:
      await handleEnterRefund(client, recipient, session, input)
      break
    case SwapStep.CONFIRM:
      await handleConfirm(client, recipient, session, input)
      break
  }
}

export function cleanupSessions(): void {
  const now = Date.now()
  for (const [recipient, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(recipient)
      console.log(`[Signal] Session expired for ${recipient}`)
    }
  }
}
