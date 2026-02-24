export const en = {
  // --- General buttons ---
  back: '⬅️ Back',
  cancelSwap: '❌ Cancel Swap',

  // --- Search ---
  clearSearch: '🗑️ Clear search',
  searchNoResults: '🔄 *Swap*\n\n{progress}\n\n⚠️ No assets found. Try a different search.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ No assets available yet. Token lists may still be loading. Please try again later.',
  selectSendAsset: '🔄 *Swap*\n\n🔘 Select the asset you want to *send*:\n\n_Tip: type coin code or name to search_',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset:
    '🔄 *Swap*\n\n{progress}\n\n🔘 Select the asset you want to *receive*:\n\n_Tip: type coin code or name to search_',

  // --- Step 3: Enter amount ---
  enterAmount:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '🔘 Enter the amount of *{asset}* to swap:\n\n' +
    '_Tip: use_ *$* _sign to enter a USD value_',
  invalidAmount:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '🔘 Enter the amount of *{asset}* to swap:\n\n' +
    '_Tip: use_ *$* _sign to enter a USD value_\n\n' +
    '====================\n\n' +
    '⚠️ *Invalid amount.* Please enter a positive number.',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *Swap*\n\n{progress}\n\n🔘 Enter your *{asset}* _destination_ address:',
  invalidDestination:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '🔘 Enter your *{asset}* _destination_ address:\n\n' +
    '====================\n\n' +
    '⚠️ *Invalid address.* {hint}',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *Swap*\n\n{progress}\n\n🔘 Enter your *{asset}* _refund_ address:',
  invalidRefund:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '🔘 Enter your *{asset}* _refund_ address:\n\n' +
    '====================\n\n' +
    '⚠️ *Invalid address.* {hint}',

  // --- Quotes ---
  fetchingQuotes: '🔄 *Swap*\n\n{progress}\n\n⏳ _Fetching quotes..._',
  noProviders: '🔄 *Swap*\n\n{progress}\n\n❌ No providers support this pair.',
  noRoutes: '🔄 *Swap*\n\n{progress}\n\n❌ No swap routes available for this pair.',
  allProvidersFailed:
    '🔄 *Swap*\n\n{progress}\n\n❌ No providers could fulfill this swap. Try a different amount or pair.',
  quotesHeader:
    '🔄 *Swap*\n\n{progress}\n\n' + '🔘 {count} Quotes available:\n\n{routes}\n\n' + '_Select a route below:_',
  quoteLine: '{index}. {provider} — *{amount} {ticker} {receiveUsd}* — 🕐 {time}',
  quoteError: '🔄 *Swap*\n\n{progress}\n\n❌ *Failed to fetch quote:* {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *Swap Summary*\n\n' +
    'Send: *{sendAmount} {sendAsset} {sendUsd}*\n' +
    'Receive: *~{receiveAmount} {receiveAsset} {receiveUsd}*\n' +
    'Guaranteed: *{minReceive} {receiveAsset} {minReceiveUsd}*\n\n' +
    'Destination: *{destination}*\n' +
    'Refund: *{refund}*\n\n' +
    'Provider: *{provider}*\n' +
    'Est. time: *{time}*\n\n' +
    '_Confirm this swap?_',
  confirmButton: '✅ Confirm',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *Ready!*\n\n' +
    'Send: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Receive: ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Guaranteed: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    'Destination: {destination}\n' +
    'Refund: {refund}\n\n' +
    'Provider: {provider}\n' +
    'Est. time: {time}\n\n' +
    'Offer expiration: {expiration}\n\n' +
    '====================\n' +
    '👇 INSTRUCTIONS 👇\n' +
    '====================\n\n' +
    '🔘 Scan QR in wallet app\n\n' +
    '{orOpenWalletApp}' +
    '🔘 Or send {sendAsset} manually:\n\n' +
    '• Amount (click to copy)\n\n' +
    '`{sendAmount}`\n\n' +
    '• Recipient (click copy)\n\n' +
    '`{inboundAddress}`\n\n' +
    '====================\n\n' +
    '{warning}' +
    '{trackLink}',

  // --- Swap errors ---
  preparingSwap:
    '📋 *Swap Summary*\n\n' +
    'Send: *{sendAmount} {sendAsset} {sendUsd}*\n' +
    'Receive: *~{receiveAmount} {receiveAsset} {receiveUsd}*\n' +
    'Guaranteed: *{minReceive} {receiveAsset} {minReceiveUsd}*\n\n' +
    'Destination: *{destination}*\n' +
    'Refund: *{refund}*\n\n' +
    'Provider: *{provider}*\n' +
    'Est. time: *{time}*\n\n' +
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
  orOpenWalletApp: '🔘 Or {openWalletApp}',
  openWalletApp: 'open wallet app',
  trackSwapHere: 'Track swap here',
  amountWarning: '⚠️ Send exactly specified amount to avoid loss of funds',

  // --- Price ---
  priceUnavailable:
    '🔄 *Swap*\n\n{progress}\n\n' +
    '⚠️ *Price unavailable* for *{asset}*.\n' +
    '_Please enter the amount in tokens instead._',

  // --- Bot-level messages ---
  botError: '❌ Something went wrong. Try again with /swap.',
  botCancelReply: '🚫 Current operation cancelled.',

  // --- Progress lines ---
  progressSend: 'Send: *{asset}*',
  progressReceive: 'Receive: *{asset}*',
  progressAmount: 'Amount: *{amount} {asset} {amountUsd}*',
  progressDestination: 'Destination: *{address}*',
  progressRefund: 'Refund: *{address}*'
}
