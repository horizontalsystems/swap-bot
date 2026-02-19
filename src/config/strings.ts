// All user-visible text in one place.
// Template placeholders use {name} syntax and are replaced at runtime.

export const S = {
  // --- General buttons ---
  back: '⬅️ Back',
  cancelSwap: '❌ Cancel Swap',

  // --- Search ---
  clearSearch: '📋 Clear search',
  searchNoResults: '🔄 *Swap*\n\n{progress}❌ No assets found. Try a different query.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ No assets available yet. Token lists may still be loading. Please try again later.',
  selectSendAsset: '🔄 *Swap*\n\nSelect the asset you want to *send* or type to search:',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *Swap*\n\n{progress}\n\nSelect the asset you want to *receive* or type to search:',

  // --- Step 3: Enter amount ---
  enterAmount: '🔄 *Swap*\n\n{progress}\n\n💰 Enter the amount of *{asset}* you want to swap:',
  invalidAmount:
    '🔄 *Swap*\n\n{progress}\n\n⚠️ Please enter a valid positive number.\n\n💰 Enter the amount of *{asset}* you want to swap:',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *Swap*\n\n{progress}\n\n📍 Enter your *{asset}* destination address:',
  invalidDestination:
    '🔄 *Swap*\n\n{progress}\n\n⚠️ Invalid address. {hint}\n\n📍 Enter your *{asset}* destination address:',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *Swap*\n\n{progress}\n\n🔙 Enter your *{asset}* refund address:',
  invalidRefund: '🔄 *Swap*\n\n{progress}\n\n⚠️ Invalid address. {hint}\n\n🔙 Enter your *{asset}* refund address:',

  // --- Quotes ---
  fetchingQuotes: '🔄 *Swap*\n\n{progress}\n\n⏳ Fetching quotes...',
  noProviders: '🔄 *Swap*\n\n{progress}\n\n❌ No providers support this pair.',
  noRoutes: '🔄 *Swap*\n\n{progress}\n\n❌ No swap routes available for this pair.',
  allProvidersFailed:
    '🔄 *Swap*\n\n{progress}\n\n❌ No providers could fulfill this swap. Try a different amount or pair.',
  quotesHeader: '🔄 *Swap*\n\n{progress}\n\n📊 *Quotes* ({count}):\n\n{routes}\n\n',
  quoteLine: '*{index}.* {provider}\n    {amount} {ticker}  ·  {time}',
  quoteError: '🔄 *Swap*\n\n{progress}\n\n❌ Failed to fetch quote: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *Swap Summary*\n\n' +
    '*Send:* {sendAmount} {sendAsset}\n' +
    '*Receive:* ~{receiveAmount} {receiveAsset}\n' +
    '*Min receive:* {minReceive} {receiveAsset}\n\n' +
    '*Destination:*\n`{destination}`\n' +
    '*Refund:*\n`{refund}`\n\n' +
    '*Provider:* {provider}\n' +
    '*Estimated time:* {time}\n\n' +
    'Confirm this swap?',
  confirmButton: '✅ Confirm',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *Swap Prepared!*\n\n' +
    '*Send:* {sendAmount} {sendAsset}\n' +
    '*Receive:* ~{receiveAmount} {receiveAsset}\n' +
    '*Send to:*\n`{inboundAddress}`\n\n' +
    '*Provider:* {provider}\n' +
    '*Estimated time:* {time}\n' +
    '*Expires in:* {expiration}\n\n' +
    '📱 Scan QR to send *{sendAmount} {sendAsset}*',

  // --- Swap errors ---
  preparingSwap:
    '📋 *Swap Summary*\n\n' +
    '*Send:* {sendAmount} {sendAsset}\n' +
    '*Receive:* ~{receiveAmount} {receiveAsset}\n' +
    '*Min receive:* {minReceive} {receiveAsset}\n\n' +
    '*Destination:*\n`{destination}`\n' +
    '*Refund:*\n`{refund}`\n\n' +
    '*Provider:* {provider}\n' +
    '*Estimated time:* {time}\n\n' +
    '⏳ Preparing swap...',
  swapFailedNoRoutes: '❌ Swap failed: no routes available.',
  swapNoQr: '❌ Swap confirmed but no QR code received. Please contact support.',
  swapConfirmError: '❌ Swap confirmation failed: {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ Swap cancelled.',
  sessionExpired: 'Session expired.',
  processingSwap: 'Processing swap...',
  assetNotFound: 'Asset not found',
  alreadySelected: 'Already selected as send asset',

  // --- Progress lines ---
  progressSend: '✅ Send: *{asset}*',
  progressReceive: '✅ Receive: *{asset}*',
  progressAmount: '✅ Amount: *{amount} {asset}*',
  progressDestination: '✅ Destination: `{address}`',
  progressRefund: '✅ Refund: `{address}`'
}

export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}
