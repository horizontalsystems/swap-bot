import { FEATURED_IDENTIFIERS } from '../../config/assets'
import { s, t } from '../../config/strings'
import { resolveAssetInput } from './asset-input'
import { getAssets, searchAssets } from '../../db/tokens'
import { Asset, Attachment, QuoteRoute, SwapSessionData } from '../../types/context'
import { getAssetPrice, getSwapPrices } from '../../services/prices'
import { amlFlaggedAddress, fetchSwap } from '../../utils/api'
import { preflightMemoless, registerMemoless } from '../../utils/memoless-api'
import { validateAddress } from '../../utils/addressValidator'
import { SignalRpcClient } from '../../utils/signal-rpc'
import { normalizeImageDataUri } from '../../utils/image-data-uri'
import {
  AmountFormatter,
  assetCaption,
  attachmentLabel,
  buyAssetForRoute,
  buildMinLine,
  buildProgress,
  buildTrackUrl,
  depositInstructions,
  expiresInSeconds,
  fetchPairRates,
  formatAmount,
  formatTime,
  formatUsd,
  isSplitPayoutRoute,
  isZecIdentifier,
  pairProviders,
  providerName,
  shortenAddress,
  thorchainMemo,
  truncateToDecimals,
  zecAddressMismatch,
  zecRefundMismatch,
  zecRouteTag,
  zecShieldedProviders
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
  /** Secure swap: quote the confidential rails alone (see SECURE_PROVIDERS). */
  secure?: boolean
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

// Built with the same backticks as the SimpleX flow; toPlainText strips them on send.
const format: AmountFormatter = { amount: amt, asset: a => code(assetCaption(a)) }

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
    console.error('[Signal] Failed to send message:', err instanceof Error ? err.name : 'UnknownError')
  }
}

async function sendImage(
  client: SignalRpcClient,
  recipient: string,
  base64Image: string,
  caption: string
): Promise<void> {
  try {
    // signal-cli accepts RFC 2397 data URIs directly. This preserves the provider's
    // real MIME type and avoids temporary-file format/cleanup failures.
    const attachment = normalizeImageDataUri(base64Image)
    await client.sendMessage(recipient, toPlainText(caption), [attachment])
  } catch (err) {
    console.error('[Signal] Failed to send image:', err instanceof Error ? err.name : 'UnknownError')
    if (caption) await send(client, recipient, caption)
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
  PEGASUS: 'AML, External Liq',
  LIZEX: 'AML, External Liq',
  BITANIA: 'AML, External Liq'
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
  f: 'f = FAQ',
  p: 'p = secure swap on/off'
}

// Full-word aliases for the single-letter commands, so "cancel" works like "c".
const COMMAND_ALIASES: Record<string, string> = {
  cancel: 'c',
  start: 's',
  '/start': 's',
  back: 'b',
  reset: 'r',
  yes: 'y',
  faq: 'f',
  secure: 'p',
  private: 'p'
}

const COMMANDS_HELP =
  '⌨️ *Commands*\n\n' +
  's / start — new swap\n' +
  'b / back — previous step\n' +
  'c / cancel — cancel swap\n' +
  'r / reset — reset search\n' +
  'y / yes — confirm swap\n' +
  'p / secure — secure swap on/off\n' +
  'f / faq — show this FAQ'

function hint(...keys: string[]): string {
  return '\n\n' + keys.map(k => HINT_LABELS[k] ?? k).join('\n')
}

/** The secure-swap state, for the one screen that has no {progress} block to carry it. */
function secureLine(session: SignalSwapSession): string {
  return session.secure ? '\n\n' + S.progressSecure : ''
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
  await send(client, recipient, S.selectSendAsset + secureLine(session) + '\n\n' + assetList(featured) + hint('c', 'p'))
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
      hint('b', 'c', 'p')
  )
}

async function showEnterAmount(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
  await send(
    client,
    recipient,
    t(S.enterAmount, { progress: progress(session), asset: code(assetCaption(session.assetIn!)) }) + hint('b', 'c', 'p')
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

  const secure = session.secure
  const providers = pairProviders(assetIn!.identifier, assetOut!.identifier, secure)

  // Receiving ZEC also pulls in the shielded catalog's providers, which sit outside the
  // pair's own provider list.
  if (providers.length === 0 && zecShieldedProviders(assetOut!.identifier, secure).length === 0) {
    // The confidential catalog is far thinner than the public one, so point at the way out.
    await send(
      client,
      recipient,
      t(secure ? S.noProvidersSecure : S.noProviders, { progress: prog }) + hint('b', 'c', 'p')
    )
    return false
  }

  await send(client, recipient, t(S.fetchingQuotes, { progress: prog }))

  const quoteResponse = await fetchPairRates({
    sellAsset: assetIn!.identifier,
    buyAsset: assetOut!.identifier,
    sellAmount: amount!.toString(),
    providers,
    secure
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

  // Two ZEC routes can differ only in the address family they pay out to — say which
  const zecTag = (route: QuoteRoute) => {
    const tag = zecRouteTag(S, route)
    return tag ? ` · ${tag}` : ''
  }

  const routeLines = quoteResponse.routes.map((route, i) => {
    const receiveUsdVal = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null
    const num = numEmojis[i] ?? `${i + 1}.`
    return (
      `${num} ${amt(route.expectedBuyAmount, assetOut!.decimals)} ${code(assetOut!.ticker)} ${formatUsd(receiveUsdVal)}\n` +
      `🕐 ${formatTime(route.estimatedTime.total)}, ${signalProviderLabel(route.providers[0])}${zecTag(route)}`
    )
  })

  const count = quoteResponse.routes.length
  await send(
    client,
    recipient,
    prog +
      `\n\n${count} quote${count > 1 ? 's' : ''} available 👇\n\n` +
      routeLines.join('\n\n') +
      // Receiving ZEC: the address family decides which of these routes can pay out at all
      (isZecIdentifier(assetOut!.identifier) ? `\n\n${S.zecAddressNote}` : '') +
      `\n\n${count === 1 ? '1 = select route' : `1-${count} = select route`}\n` +
      hint('b', 'c', 'p').trimStart()
  )

  return true
}

async function showSummary(client: SignalRpcClient, recipient: string, session: SignalSwapSession): Promise<void> {
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = session

  const { inPrice, outPrice } = await getSwapPrices(assetIn!.coingeckoId, assetOut!.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount! : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote!.expectedBuyAmount) : null

  let summaryText = t(S.swapSummary, {
    sendAmount: amt(amount!, assetIn!.decimals),
    sendAsset: code(assetCaption(assetIn!)),
    sendUsd: formatUsd(sendUsdVal),
    receiveAmount: amt(quote!.expectedBuyAmount, assetOut!.decimals),
    receiveAsset: code(assetCaption(assetOut!)),
    receiveUsd: formatUsd(receiveUsdVal),
    minLine: buildMinLine(S, quote!, assetOut!, outPrice, format),
    destination: shortenAddress(destinationAddress!),
    refund: refundAddress ? shortenAddress(refundAddress) : '',
    provider: providerName(quote!.providers[0]),
    time: formatTime(quote!.estimatedTime.total)
  })
  if (!refundAddress) summaryText = summaryText.replace(/↩️.*\n/g, '')
  if (isSplitPayoutRoute(quote)) summaryText += `\n\n${S.splitPayoutNote}`

  await send(client, recipient, summaryText + hint('y', 'b', 'c'))
}

// --- Step handlers ---

async function handleSelectSendAsset(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession,
  input: string
): Promise<void> {
  const resolution = resolveAssetInput(input, session.menuItems ?? [], searchAssets)
  if (resolution.type === 'selected') {
    const asset = resolution.asset
    session.assetIn = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)
    session.step = SwapStep.SELECT_RECV_ASSET
    await showSelectRecvAsset(client, recipient, session)
    return
  }

  if (resolution.type === 'search') {
    if (resolution.results.length > 0) {
      session.menuItems = resolution.results
      await send(client, recipient, S.selectSendAsset + '\n\n' + assetList(resolution.results) + hint('r', 'c'))
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
  const resolution = resolveAssetInput(input, session.menuItems ?? [], searchAssets)
  if (resolution.type === 'selected') {
    const asset = resolution.asset

    if (asset.identifier === session.assetIn?.identifier) {
      await send(client, recipient, 'Already selected as send asset. Choose a different one.')
      return
    }

    const secure = session.secure
    const providers = pairProviders(session.assetIn!.identifier, asset.identifier, secure)

    session.assetOut = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    if (providers.length === 0 && zecShieldedProviders(asset.identifier, secure).length === 0) {
      await send(
        client,
        recipient,
        t(secure ? S.noProvidersSecure : S.noProviders, { progress: progress(session) }) + hint('b', 'c', 'p')
      )
      session.step = SwapStep.ENTER_AMOUNT
      return
    }

    session.step = SwapStep.ENTER_AMOUNT
    await showEnterAmount(client, recipient, session)
    return
  }

  if (resolution.type === 'search') {
    if (resolution.results.length > 0) {
      session.menuItems = resolution.results
      await send(
        client,
        recipient,
        t(S.selectReceiveAsset, { progress: progress(session) }) +
          '\n\n' +
          assetList(resolution.results, session.assetIn?.identifier) +
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
    console.error('[Swap] Quote failed:', error instanceof Error ? error.name : 'UnknownError')
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

  // The route was quoted against one Zcash catalog entry and can only pay that address
  // family — catch a mismatch here instead of letting the provider reject the committed
  // order with a bare "invalid address".
  const provider = session.quote!.providers[0]
  const zecMismatch = zecAddressMismatch(session.quote!, input)
  if (zecMismatch) {
    await send(
      client,
      recipient,
      t(S.enterDestination, { progress: progress(session), asset }) +
        `\n\n${t(zecMismatch === 'transparent' ? S.zecNeedsTransparent : S.zecNeedsShielded, {
          provider: providerName(provider)
        })}` +
        hint('b', 'c')
    )
    return
  }

  session.destinationAddress = input

  const isThorChain = provider === 'THORCHAIN'
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

  // Refunds go out the same way payouts do — a provider that can't send to a shielded
  // ZEC address can't refund to one either.
  const refundProvider = session.quote!.providers[0]
  if (zecRefundMismatch(session.assetIn!.identifier, input, refundProvider)) {
    await send(
      client,
      recipient,
      t(S.enterRefund, { progress: progress(session), asset }) +
        `\n\n${t(S.zecNeedsTransparent, { provider: providerName(refundProvider) })}` +
        hint('b', 'c')
    )
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
  const answer = input.toLowerCase()
  if (answer !== 'y' && answer !== 'yes') {
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

  // AML precheck — block flagged addresses before committing the order
  const flaggedAddress = await amlFlaggedAddress(quote.providers[0], [refundAddress, destinationAddress])
  if (flaggedAddress) {
    await send(client, recipient, t(S.amlBlocked, { address: shortenAddress(flaggedAddress) }))
    sessions.delete(recipient)
    return
  }

  const { inPrice, outPrice } = await getSwapPrices(assetIn.coingeckoId, assetOut.coingeckoId)
  const sendUsdVal = inPrice != null ? inPrice * amount : null
  const receiveUsdVal = outPrice != null ? outPrice * parseFloat(quote.expectedBuyAmount) : null

  let preparingText = t(S.preparingSwap, {
    sendAmount: amt(amount, assetIn.decimals),
    sendAsset: code(assetCaption(assetIn)),
    sendUsd: formatUsd(sendUsdVal),
    receiveAmount: amt(quote.expectedBuyAmount, assetOut.decimals),
    receiveAsset: code(assetCaption(assetOut)),
    receiveUsd: formatUsd(receiveUsdVal),
    minLine: buildMinLine(S, quote, assetOut, outPrice, format),
    destination: shortenAddress(destinationAddress),
    refund: refundAddress ? shortenAddress(refundAddress) : '',
    provider: providerName(quote.providers[0]),
    time: formatTime(quote.estimatedTime.total)
  })
  if (!refundAddress) preparingText = preparingText.replace(/↩️.*\n/g, '')

  await send(client, recipient, preparingText)

  try {
    const swapParams: Parameters<typeof fetchSwap>[0] = {
      sellAsset: assetIn.identifier,
      // A shielded route buys a different Zcash catalog entry than the asset the user picked
      buyAsset: buyAssetForRoute(quote, assetOut),
      sellAmount: amount.toString(),
      destinationAddress,
      provider: quote.providers[0]
    }
    if (refundAddress) swapParams.refundAddress = refundAddress

    const route = await fetchSwap(swapParams)
    const isThorchain = route.providers[0] === 'THORCHAIN'

    let qrDataURL: string | undefined
    let inboundAddr: string | undefined
    let paymentUri: string | undefined
    let sendAmount: number = amount
    let sendAmountRaw: string = amount.toString()
    let expiresIn: number | undefined
    let attachment: Attachment | undefined

    if (isThorchain) {
      console.log('[Swap] THORChain route detected, using memoless flow')

      // The user can't bind the swap memo to a plain transfer, so memoless encodes it
      // in the amount and relays the deposit for them.
      const memo = thorchainMemo(route)
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
      console.log('[Swap] Memoless flow completed')
    } else {
      const deposit = depositInstructions(route)
      if (!deposit) {
        console.error('[Swap] Route has no transfer execution:', route.execution?.method)
        await send(client, recipient, S.swapNoQr)
        sessions.delete(recipient)
        return
      }

      qrDataURL = deposit.qrDataURL
      paymentUri = deposit.qrStr
      inboundAddr = deposit.depositAddress
      sendAmount = parseFloat(deposit.amount)
      sendAmountRaw = deposit.amount
      expiresIn = expiresInSeconds(route)
      // An order identifier the provider matches the deposit by. Present ⟺ required:
      // a transfer that omits it arrives unattributed and is normally unrecoverable.
      attachment = deposit.attachment
    }

    const confirmSendUsd = inPrice != null ? inPrice * sendAmount : null
    const confirmReceiveUsd = outPrice != null ? outPrice * parseFloat(route.expectedBuyAmount) : null

    // THORChain needs the exact amount; a split-settlement route pays out more than once.
    const warning = isThorchain ? `\n\n${S.amountWarning}` : isSplitPayoutRoute(route) ? `\n\n${S.splitPayoutNote}` : ''

    const links: string[] = []
    const paymentLink = paymentUri ? `https://swap.unstoppable.money/pay?uri=${encodeURIComponent(paymentUri)}` : null
    if (paymentLink) links.push(`📲 [${S.openWalletApp}](${paymentLink})`)

    const provider = route.providers[0]
    const trackUrl = buildTrackUrl(route.uuid, {
      provider,
      depositAddress: inboundAddr,
      chainId: assetIn.chainId,
      fromAsset: assetIn.identifier,
      fromAmount: sendAmount.toString(),
      toAsset: buyAssetForRoute(route, assetOut),
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
      minLine: buildMinLine(S, route, assetOut, outPrice, format),
      destination: shortenAddress(destinationAddress),
      refund: refundAddress ? shortenAddress(refundAddress) : '',
      inboundAddress: inboundAddr ?? '',
      provider: route.providers.map(p => providerName(p)).join(', '),
      time: formatTime(route.estimatedTime.total),
      expiration: expiresIn != null ? formatTime(expiresIn) : 'N/A',
      attachment: attachment
        ? t(S.depositAttachment, { label: attachmentLabel(attachment, S), value: attachment.value })
        : '',
      warning,
      links: links.length ? `\n\n${links.join('\n')}\n\n` : ''
    })
    if (!refundAddress) caption = caption.replace(/↩️.*\n/g, '')

    // Send the QR as an image, then the details, then the raw amount and inbound
    // address as their own messages so they're easy to copy on Signal. The QR is a
    // convenience the server skips on chains it can't encode.
    if (qrDataURL) await sendImage(client, recipient, qrDataURL, '')
    await send(client, recipient, caption)
    await send(client, recipient, sendAmountRaw)
    await send(client, recipient, inboundAddr ?? '')
    // Its own message so the tag/memo is as easy to copy as the address.
    if (attachment) await send(client, recipient, attachment.value)

    sessions.delete(recipient)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    await send(client, recipient, t(S.swapConfirmError, { error: errMsg }) + `\n\n${S.chooseAnotherProvider}`)

    // The commit goes to one provider, and a refusal is usually that provider's alone — a
    // shielded ZEC destination is the common case. Re-quote and hand the list back rather
    // than dropping the session and making the user rebuild the swap from scratch.
    session.quote = undefined
    session.destinationAddress = undefined
    session.refundAddress = undefined
    try {
      if (await fetchAndShowRoutes(client, recipient, session)) {
        session.step = SwapStep.SELECT_ROUTE
        return
      }
    } catch (requoteError) {
      console.error('[Swap] Re-quote after a failed commit failed:', requoteError)
    }
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
        console.error('[Swap] Quote failed:', error instanceof Error ? error.name : 'UnknownError')
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

/**
 * Secure swap on/off. The mode picks the provider list a quote is fanned out to, so it can
 * be flipped up to and including the route list — at that point the routes on screen came
 * from the other rail and have to be re-quoted. Once a route is picked the quote is bound
 * to one provider, so the switch is refused rather than silently ignored.
 */
async function handleToggleSecure(
  client: SignalRpcClient,
  recipient: string,
  session: SignalSwapSession
): Promise<void> {
  if (session.step > SwapStep.SELECT_ROUTE) {
    await send(client, recipient, 'Secure swap can only be changed before you pick a route.' + hint('b', 'c'))
    return
  }

  session.secure = !session.secure
  await send(client, recipient, session.secure ? S.secureEnabled : S.secureDisabled)

  switch (session.step) {
    case SwapStep.SELECT_SEND_ASSET:
      await showSelectSendAsset(client, recipient, session)
      break
    case SwapStep.SELECT_RECV_ASSET:
      await showSelectRecvAsset(client, recipient, session)
      break
    case SwapStep.ENTER_AMOUNT: {
      // The amount prompt doubles as the "no providers" screen the receive-asset step
      // lands on, so re-check the pair against the rail we just switched to.
      const { assetIn, assetOut } = session
      const serves =
        pairProviders(assetIn!.identifier, assetOut!.identifier, session.secure).length > 0 ||
        zecShieldedProviders(assetOut!.identifier, session.secure).length > 0
      if (serves) {
        await showEnterAmount(client, recipient, session)
      } else {
        await send(
          client,
          recipient,
          t(session.secure ? S.noProvidersSecure : S.noProviders, { progress: progress(session) }) + hint('b', 'c', 'p')
        )
      }
      break
    }
    case SwapStep.SELECT_ROUTE:
      session.routes = undefined
      session.quote = undefined
      try {
        await fetchAndShowRoutes(client, recipient, session)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Swap] Quote error:', error)
        await send(client, recipient, t(S.quoteError, { progress: progress(session), error: errMsg }))
        sessions.delete(recipient)
      }
      break
  }
}

// --- Public API ---

export async function handleSwapMessage(client: SignalRpcClient, recipient: string, text: string): Promise<void> {
  const input = text.trim()
  const lower = input.toLowerCase()
  // Accept full words ("cancel", "back", "start") as well as single letters.
  const cmd = COMMAND_ALIASES[lower] ?? lower

  // Global commands (with shortcuts)
  if (cmd === 'c') {
    sessions.delete(recipient)
    await send(client, recipient, 'Swap cancelled.')
    return
  }

  if (cmd === 's') {
    sessions.delete(recipient)
    const session: SignalSwapSession = {
      step: SwapStep.SELECT_SEND_ASSET,
      lastActivity: Date.now()
    }
    sessions.set(recipient, session)
    await showSelectSendAsset(client, recipient, session)
    return
  }

  if (cmd === 'f') {
    await send(client, recipient, S.faq + '\n\n' + COMMANDS_HELP)
    return
  }

  const session = sessions.get(recipient)
  if (!session) {
    await send(client, recipient, COMMANDS_HELP)
    return
  }

  session.lastActivity = Date.now()

  if (cmd === 'b') {
    await handleBack(client, recipient, session)
    return
  }

  if (cmd === 'p') {
    await handleToggleSecure(client, recipient, session)
    return
  }

  if (cmd === 'r') {
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
      console.log('[Signal] Session expired')
    }
  }
}
