export const en = {
  // --- General buttons ---
  back: '⬅️ Back',
  cancelSwap: '❌ Cancel Swap',

  // --- Search ---
  clearSearch: '📋 Clear search',
  searchNoResults: '🔄 *Swap*\n\n{progress}\n\n❌ No assets found. Try a different search.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ No assets available yet. Token lists may still be loading. Please try again later.',
  selectSendAsset: '🔄 *Swap*\n\nSelect the asset you want to *send* or type to search:',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *Swap*\n\n{progress}\n\nSelect the asset you want to *receive* or type to search:',

  // --- Step 3: Enter amount ---
  enterAmount:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '💰 Enter the amount of *{asset}* to swap:\n\n' +
    '_Tip: type_ `$100` _to enter a USD value_',
  invalidAmount:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '⚠️ *Invalid amount.* Please enter a positive number.\n\n' +
    '💰 Enter the amount of *{asset}* to swap:\n\n' +
    '_Tip: type_ `$100` _to enter a USD value_',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *Swap*\n\n{progress}\n\n📍 Enter your *{asset}* _destination_ address:',
  invalidDestination:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '⚠️ *Invalid address.* {hint}\n\n' +
    '📍 Enter your *{asset}* _destination_ address:',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *Swap*\n\n{progress}\n\n🔙 Enter your *{asset}* _refund_ address:',
  invalidRefund:
    '🔄 *Swap*\n\n{progress}\n\n' + '⚠️ *Invalid address.* {hint}\n\n' + '🔙 Enter your *{asset}* _refund_ address:',

  // --- Quotes ---
  fetchingQuotes: '🔄 *Swap*\n\n{progress}\n\n⏳ _Fetching quotes..._',
  noProviders: '🔄 *Swap*\n\n{progress}\n\n❌ No providers support this pair.',
  noRoutes: '🔄 *Swap*\n\n{progress}\n\n❌ No swap routes available for this pair.',
  allProvidersFailed:
    '🔄 *Swap*\n\n{progress}\n\n❌ No providers could fulfill this swap. Try a different amount or pair.',
  quotesHeader:
    '🔄 *Swap*\n\n{progress}\n\n' + '📊 *{count} Quotes available:*\n\n{routes}\n\n' + '_Select a route below:_',
  quoteLine: '*{index}. {provider}* — 💵 {amount} {ticker} {receiveUsd} — 🕐 {time}',
  quoteError: '🔄 *Swap*\n\n{progress}\n\n❌ *Failed to fetch quote:* {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *Swap Summary*\n\n' +
    '📤 *Send:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *Receive:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *Min receive:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *Destination:* {destination}\n' +
    '🔙 *Refund:* {refund}\n\n' +
    '🏷 *Provider:* {provider}\n' +
    '🕐 *Est. time:* {time}\n\n' +
    '_Confirm this swap?_',
  confirmButton: '✅ Confirm',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *Swap Prepared!*\n\n' +
    '📤 *Send:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *Receive:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *Min receive:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *Destination:* {destination}\n' +
    '🔙 *Refund:* {refund}\n\n' +
    '🏷 *Provider:* {provider}\n' +
    '🕐 *Est. time:* {time}\n\n' +
    '==============================\n\n' +
    '📍 Send exactly `{sendAmount}` {sendAsset} to:\n\n`{inboundAddress}`\n\n' +
    '📱 Or scan QR in your wallet app to send funds\n\n' +
    '_Please note that this swap expires in {expiration}_',

  // --- Swap errors ---
  preparingSwap:
    '📋 *Swap Summary*\n\n' +
    '📤 *Send:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *Receive:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *Min receive:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *Destination:* {destination}\n' +
    '🔙 *Refund:* {refund}\n\n' +
    '🏷 *Provider:* {provider}\n' +
    '🕐 *Est. time:* {time}\n\n' +
    '⏳ _Preparing swap..._',
  swapFailedNoRoutes: '❌ *Swap failed* — no routes available.',
  swapNoQr: '❌ *Swap confirmed* but no QR code received.\nPlease contact support.',
  swapConfirmError: '❌ *Swap failed:* {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ Swap cancelled.',
  sessionExpired: '⚠️ Session expired.',
  processingSwap: '⏳ Processing...',
  assetNotFound: 'Asset not found',
  alreadySelected: 'Already selected as send asset',
  openInWallet: '💳 Open in Wallet',

  // --- Price ---
  priceUnavailable:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '⚠️ *Price unavailable* for *{asset}*.\n' +
    '_Please enter the amount in tokens instead._',

  // --- Bot-level messages ---
  botError: '❌ Something went wrong. Try again with /swap.',
  botCancelReply: '🚫 Current operation cancelled.',

  // --- Progress lines ---
  progressSend: '📤 Send: *{asset}*',
  progressReceive: '📥 Receive: *{asset}*',
  progressAmount: '🔢 Amount: *{amount} {asset}* {amountUsd}',
  progressDestination: '📍 Destination: {address}',
  progressRefund: '🔙 Refund: {address}'
}
