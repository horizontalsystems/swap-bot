import { ChatClient } from 'simplex-chat'
import { T } from '@simplex-chat/types'
import { FEATURED_IDENTIFIERS } from '../../config/assets'
import { s, t } from '../../config/strings'
import { getAssets, searchAssets } from '../../db/tokens'
import { Asset, Attachment, QuoteRoute, SwapSessionData } from '../../types/context'
import { getAssetPrice, getSwapPrices } from '../../services/prices'
import { amlFlaggedAddress, fetchSwap } from '../../utils/api'
import { preflightMemoless, registerMemoless } from '../../utils/memoless-api'
import { validateAddress } from '../../utils/addressValidator'
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
  /** Secure swap: quote the confidential rails alone (see SECURE_PROVIDERS). */
  secure?: boolean
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

// Amounts and tickers go in backticks so they're tap-to-copy in SimpleX.
const format: AmountFormatter = { amount: amt, asset: a => code(assetCaption(a)) }

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

function simplexProviderLabel(id: string): string {
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

function hint(...keys: string[]): string {
  return '\n\n' + keys.map(k => HINT_LABELS[k] ?? k).join('\n')
}

/** The secure-swap state, for the one screen that has no {progress} block to carry it. */
function secureLine(session: SimplexSwapSession): string {
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

async function showSelectSendAsset(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  const featured = getAssets(FEATURED_IDENTIFIERS)
  if (featured.length === 0) {
    await send(client, contactId, S.noAssetsAvailable)
    sessions.delete(contactId)
    return
  }
  session.menuItems = featured
  await send(client, contactId, S.selectSendAsset + secureLine(session) + '\n\n' + assetList(featured) + hint('c', 'p'))
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
      hint('b', 'c', 'p')
  )
}

async function showEnterAmount(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  await send(
    client,
    contactId,
    t(S.enterAmount, { progress: progress(session), asset: code(assetCaption(session.assetIn!)) }) + hint('b', 'c', 'p')
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

  const secure = session.secure
  const providers = pairProviders(assetIn!.identifier, assetOut!.identifier, secure)

  // Receiving ZEC also pulls in the shielded catalog's providers, which sit outside the
  // pair's own provider list.
  if (providers.length === 0 && zecShieldedProviders(assetOut!.identifier, secure).length === 0) {
    // The confidential catalog is far thinner than the public one, so point at the way out.
    await send(
      client,
      contactId,
      t(secure ? S.noProvidersSecure : S.noProviders, { progress: prog }) + hint('b', 'c', 'p')
    )
    return false
  }

  await send(client, contactId, t(S.fetchingQuotes, { progress: prog }))

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
    await send(client, contactId, failMsg + hint('b', 's'))
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
      `🕐 ${formatTime(route.estimatedTime.total)}, ${simplexProviderLabel(route.providers[0])}${zecTag(route)}`
    )
  })

  const count = quoteResponse.routes.length
  await send(
    client,
    contactId,
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

async function showSummary(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
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

    const secure = session.secure
    const providers = pairProviders(session.assetIn!.identifier, asset.identifier, secure)

    session.assetOut = asset
    session.menuItems = undefined
    if (asset.coingeckoId) getAssetPrice(asset.coingeckoId)

    if (providers.length === 0 && zecShieldedProviders(asset.identifier, secure).length === 0) {
      await send(
        client,
        contactId,
        t(secure ? S.noProvidersSecure : S.noProviders, { progress: progress(session) }) + hint('b', 'c', 'p')
      )
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

  // The route was quoted against one Zcash catalog entry and can only pay that address
  // family — catch a mismatch here instead of letting the provider reject the committed
  // order with a bare "invalid address".
  const provider = session.quote!.providers[0]
  const zecMismatch = zecAddressMismatch(session.quote!, input)
  if (zecMismatch) {
    await send(
      client,
      contactId,
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

  // Refunds go out the same way payouts do — a provider that can't send to a shielded
  // ZEC address can't refund to one either.
  const refundProvider = session.quote!.providers[0]
  if (zecRefundMismatch(session.assetIn!.identifier, input, refundProvider)) {
    await send(
      client,
      contactId,
      t(S.enterRefund, { progress: progress(session), asset }) +
        `\n\n${t(S.zecNeedsTransparent, { provider: providerName(refundProvider) })}` +
        hint('b', 'c')
    )
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

  // AML precheck — block flagged addresses before committing the order
  const flaggedAddress = await amlFlaggedAddress(quote.providers[0], [refundAddress, destinationAddress])
  if (flaggedAddress) {
    await send(client, contactId, t(S.amlBlocked, { address: shortenAddress(flaggedAddress) }))
    sessions.delete(contactId)
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

  await send(client, contactId, preparingText)

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
      const deposit = depositInstructions(route)
      if (!deposit) {
        console.error('[Swap] Route has no transfer execution:', route.execution?.method)
        await send(client, contactId, S.swapNoQr)
        sessions.delete(contactId)
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

    // The QR is a convenience the server skips on chains it can't encode — the address
    // and amount below are what actually matter.
    if (qrDataURL) {
      await sendImage(client, contactId, qrDataURL.replace(/^data:image\/png;base64,/, ''), '')
    }
    await send(client, contactId, caption)
    await send(client, contactId, `\`${sendAmountRaw}\``)
    await send(client, contactId, `\`${inboundAddr}\``)
    // Its own message so the tag/memo is as easy to copy as the address.
    if (attachment) await send(client, contactId, `\`${attachment.value}\``)

    sessions.delete(contactId)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Confirm error:', error)
    await send(client, contactId, t(S.swapConfirmError, { error: errMsg }) + `\n\n${S.chooseAnotherProvider}`)

    // The commit goes to one provider, and a refusal is usually that provider's alone — a
    // shielded ZEC destination is the common case. Re-quote and hand the list back rather
    // than dropping the session and making the user rebuild the swap from scratch.
    session.quote = undefined
    session.destinationAddress = undefined
    session.refundAddress = undefined
    try {
      if (await fetchAndShowRoutes(client, contactId, session)) {
        session.step = SwapStep.SELECT_ROUTE
        return
      }
    } catch (requoteError) {
      console.error('[Swap] Re-quote after a failed commit failed:', requoteError)
    }
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

/**
 * Secure swap on/off. The mode picks the provider list a quote is fanned out to, so it can
 * be flipped up to and including the route list — at that point the routes on screen came
 * from the other rail and have to be re-quoted. Once a route is picked the quote is bound
 * to one provider, so the switch is refused rather than silently ignored.
 */
async function handleToggleSecure(client: ChatClient, contactId: number, session: SimplexSwapSession): Promise<void> {
  if (session.step > SwapStep.SELECT_ROUTE) {
    await send(client, contactId, 'Secure swap can only be changed before you pick a route.' + hint('b', 'c'))
    return
  }

  session.secure = !session.secure
  await send(client, contactId, session.secure ? S.secureEnabled : S.secureDisabled)

  switch (session.step) {
    case SwapStep.SELECT_SEND_ASSET:
      await showSelectSendAsset(client, contactId, session)
      break
    case SwapStep.SELECT_RECV_ASSET:
      await showSelectRecvAsset(client, contactId, session)
      break
    case SwapStep.ENTER_AMOUNT: {
      // The amount prompt doubles as the "no providers" screen the receive-asset step
      // lands on, so re-check the pair against the rail we just switched to.
      const { assetIn, assetOut } = session
      const serves =
        pairProviders(assetIn!.identifier, assetOut!.identifier, session.secure).length > 0 ||
        zecShieldedProviders(assetOut!.identifier, session.secure).length > 0
      if (serves) {
        await showEnterAmount(client, contactId, session)
      } else {
        await send(
          client,
          contactId,
          t(session.secure ? S.noProvidersSecure : S.noProviders, { progress: progress(session) }) + hint('b', 'c', 'p')
        )
      }
      break
    }
    case SwapStep.SELECT_ROUTE:
      session.routes = undefined
      session.quote = undefined
      try {
        await fetchAndShowRoutes(client, contactId, session)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Swap] Quote error:', error)
        await send(client, contactId, t(S.quoteError, { progress: progress(session), error: errMsg }))
        sessions.delete(contactId)
      }
      break
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

  if (lower === 'p') {
    await handleToggleSecure(client, contactId, session)
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
