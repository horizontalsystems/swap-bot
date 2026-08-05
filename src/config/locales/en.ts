export const en = {
  // --- General buttons ---
  back: '⬅️ Back',
  cancelSwap: '❌ Cancel Swap',

  // --- Search ---
  clearSearch: '🗑️ Clear search',
  searchNoResults: '💱 Swap\n\n{progress}\n\n⚠️ No assets found. Try a different search.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ No assets available yet. Token lists may still be loading. Please try again later.',
  selectSendAsset: '💱 Swap\n\nWhich asset do you want to send?\nType a coin name or ticker to search 👇',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset:
    '💱 Swap\n\n{progress}\n\nWhich asset do you want to receive?\nType a coin name or ticker to search 👇',

  // --- Step 3: Enter amount ---
  enterAmount:
    '💱 Swap\n\n{progress}\n\n' +
    'How much {asset} do you want to swap?\n' +
    'Tip: prefix with $ to enter a USD value 👇',
  invalidAmount:
    '💱 Swap\n\n{progress}\n\n' +
    'How much {asset} do you want to swap?\n' +
    'Tip: prefix with $ to enter a USD value 👇\n\n' +
    '⚠️ Invalid amount — please enter a positive number.',

  // --- Step 4: Destination address ---
  enterDestination: '💱 Swap\n\n{progress}\n\nEnter your {asset} destination address 👇',
  invalidDestination:
    '💱 Swap\n\n{progress}\n\n' + 'Enter your {asset} destination address 👇\n\n' + '⚠️ Invalid address — {hint}',

  // --- Step 5: Refund address ---
  enterRefund: '💱 Swap\n\n{progress}\n\nEnter your {asset} refund address 👇',
  invalidRefund:
    '💱 Swap\n\n{progress}\n\n' + 'Enter your {asset} refund address 👇\n\n' + '⚠️ Invalid address — {hint}',

  // --- Quotes ---
  fetchingQuotes: '💱 Swap\n\n{progress}\n\n⏳ Fetching quotes...',
  noProviders: '💱 Swap\n\n{progress}\n\n❌ No providers support this pair.',
  noRoutes: '💱 Swap\n\n{progress}\n\n❌ No swap routes available for this pair.',
  allProvidersFailed:
    '💱 Swap\n\n{progress}\n\n❌ No providers could fulfill this swap. Try a different amount or pair.',
  quotesHeader: '💱 Swap\n\n{progress}\n\n' + '{count} quotes available — select a route 👇\n\n{routes}',
  quoteLine: '{index}. {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 Swap\n\n{progress}\n\n❌ Failed to fetch quote: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 Swap Summary\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Receive: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Min: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 Destination: {destination}\n' +
    '↩️ Refund: {refund}\n' +
    '🔗 Provider: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Confirm this swap?',
  confirmButton: '✅ Confirm',

  // --- Swap confirmed ---
  swapConfirmed:
    '💱 Swap Summary\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Receive: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Min: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 Destination: {destination}\n' +
    '↩️ Refund: {refund}\n' +
    '🔗 Provider: {provider} • {time}\n' +
    '⏳ Offer expires in: {expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send exactly:\n' +
    '`{sendAmountRaw}` {sendAsset}\n\n' +
    'To address:\n' +
    '`{inboundAddress}`' +
    '{warning}' +
    '{links}',

  // --- Swap errors ---
  preparingSwap:
    '📋 Swap Summary\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Receive: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Min: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 Destination: {destination}\n' +
    '↩️ Refund: {refund}\n' +
    '🔗 Provider: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ Preparing swap...',
  swapFailedNoRoutes: '❌ Swap failed — no routes available.',
  swapNoQr: '❌ Swap confirmed but no QR code received.\nPlease contact support.',
  swapConfirmError: '❌ Swap failed: {error}',
  amlBlocked:
    "⛔ This swap can't proceed — the address {address} is flagged as high-risk by a third-party compliance provider (Elliptic). Please start a new swap with a different address.",

  // --- Cancel / misc ---
  swapCancelled: '❌ Swap cancelled.',
  sessionExpired: '⚠️ Session expired.',
  processingSwap: '⏳ Processing...',
  assetNotFound: 'Asset not found',
  alreadySelected: 'Already selected as send asset',
  openWalletApp: 'Open Wallet App',
  trackSwap: 'Track Swap',
  amountWarning: '⚠️ Send exact amount to avoid loss of funds',
  changeAmount: '💰 Change Amount',
  newSwap: '🔄 New Swap',

  // --- Price ---
  priceUnavailable:
    '💱 Swap\n\n{progress}\n\n' + '⚠️ Price unavailable for {asset}.\n' + 'Please enter the amount in tokens instead.',

  // --- Bot-level messages ---
  botError: '❌ Something went wrong. Try again with /swap.',
  botCancelReply: '🚫 Current operation cancelled.',

  // --- Progress lines ---
  progressSend: 'Send: {asset}',
  progressReceive: 'Receive: {asset}',
  progressAmount: 'Amount: {amount} {asset} {amountUsd}',
  progressProvider: 'Provider: {provider}',
  progressDestination: 'Destination: {address}',
  progressRefund: 'Refund: {address}',

  // --- FAQ ---
  faq:
    '❓ *FAQ*\n\n' +
    '*What is this bot?*\n\n' +
    'A crypto-to-crypto swap bot inside Telegram.\n\n' +
    'Choose what you want to send and receive, compare quotes from multiple providers, and complete the swap without connecting a wallet.\n\n' +
    '*Which providers are supported?*\n\n' +
    'The bot aggregates both decentralized and centralized providers. Available providers depend on the asset pair.\n\n' +
    '*Can providers freeze assets?*\n\n' +
    'It depends on the provider type.\n\n' +
    'DEX protocols cannot freeze funds. The swap either executes or fails (funds are refunded automatically).\n\n' +
    'Private-liquity providers operate using their own liquidity. Freezes are very and very unlikely but counterparty risk still exists.\n\n' +
    'Majority of sources that operate with third party liquidity have AML policies. In most cases swaps are rejected and refunded if any AML issues are detected. In rare situations a provider may request KYC before releasing funds.\n\n' +
    'Risk level is shown next to each provider before you choose.\n\n' +
    '*Do you hold my funds?*\n\n' +
    'No. Unstoppable Swap Bot never custody funds. Swaps are executed directly by third-party providers.\n\n' +
    'The bot only requests quotes, shows options and provides transaction instructions. Funds move directly between you and the provider.\n\n' +
    '*What is a refund address?*\n\n' +
    'A refund address is where funds are returned if a swap fails. Some providers require it as a safety measure.\n\n' +
    'THORChain DEX swaps do not require a refund address.\n\n' +
    '*What does "Send exact amount" mean?*\n\n' +
    'Some providers (especially THORChain) require the precise amount shown. Sending more or less may cause: swap failure, delays or loss of funds. Always send the exact amount displayed.\n\n' +
    '*How do I track my swap?*\n\n' +
    'After confirmation, the bot provides a Track Swap link. You can monitor: swap progress and execution status.\n\n' +
    '*Can I cancel a swap?*\n\n' +
    'You can cancel anytime before confirmation step. After the funds are sent to the deposit address, swaps cannot be reversed through the bot.'
}
