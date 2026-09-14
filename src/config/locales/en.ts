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
  noProvidersSecure:
    '💱 Swap\n\n{progress}\n\n' +
    '❌ No confidential route for this pair.\n' +
    'Turn secure swap off to quote the standard providers.',
  noRoutes: '💱 Swap\n\n{progress}\n\n❌ No swap routes available for this pair.',
  allProvidersFailed:
    '💱 Swap\n\n{progress}\n\n❌ No providers could fulfill this swap. Try a different amount or pair.',
  quotesHeader: '💱 Swap\n\n{progress}\n\n' + '{count} quotes available — select a route 👇\n\n{routes}',
  quoteLine: '{index}. {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 Swap\n\n{progress}\n\n❌ Failed to fetch quote: {error}',

  // --- Zcash address families ---
  // Zcash is quoted as two tokens: ZEC.ZEC pays transparent addresses, ZEC.ZECSHIELDED
  // pays shielded ones. Routes from both show in one list, tagged with what they can pay.
  zecAddressNote:
    'ℹ️ ZEC: routes are tagged by the address family they pay out to — transparent (t1…/t3…) or shielded (zs1…/u1…). Pick the one that matches your wallet.',
  zecRouteTransparent: 'transparent t1/t3',
  zecRouteShielded: 'shielded zs1/u1',
  zecNeedsTransparent:
    '⚠️ {provider} pays out to transparent ZEC addresses only (t1…/t3…).\n' +
    'Enter a transparent address, or go back and pick a shielded route.',
  zecNeedsShielded:
    '⚠️ {provider} pays out to shielded ZEC addresses (zs1…/u1…).\n' +
    'Enter a shielded address, or go back and pick a transparent route.',
  chooseAnotherProvider: '👉 Pick another provider and try again.',

  // --- Receive floor ---
  // `{minLine}` is built in code (see buildMinLine) and carries its own trailing newline,
  // so it collapses to nothing when the route has no floor worth showing.
  minReceiveLine: 'Min: {amount} {asset} {usd}',
  estimateLine: 'Min: Not guaranteed — the final amount is set when your deposit arrives',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 Swap Summary\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Receive: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
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
    '{minLine}\n' +
    '📍 Destination: {destination}\n' +
    '↩️ Refund: {refund}\n' +
    '🔗 Provider: {provider} • {time}\n' +
    '⏳ Offer expires in: {expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send exactly:\n' +
    '`{sendAmountRaw}` {sendAsset}\n\n' +
    'To address:\n' +
    '`{inboundAddress}`' +
    '{attachment}' +
    '{warning}' +
    '{links}',
  depositAttachment: '\n\n⚠️ {label} — required, send without it and the funds are lost:\n`{value}`',
  attachmentTag: 'Destination tag',
  attachmentMemo: 'Memo',

  // --- Swap errors ---
  preparingSwap:
    '📋 Swap Summary\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Send: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Receive: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 Destination: {destination}\n' +
    '↩️ Refund: {refund}\n' +
    '🔗 Provider: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ Preparing swap...',
  swapFailedNoRoutes: '❌ Swap failed — no routes available.',
  swapNoQr: '❌ Swap confirmed but no deposit instructions received.\nPlease contact support.',
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

  // --- Secure (confidential) swap ---
  secureOn: '🔒 Secure swap: ON',
  secureOff: '🔓 Secure swap: OFF',
  secureEnabled: 'Secure swap on — confidential routes only',
  secureDisabled: 'Secure swap off — standard providers',
  splitPayoutNote:
    'ℹ️ This route splits the payout into several transfers sent after a random delay — expect more than one incoming transaction.',

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
  progressSecure: '🔒 Secure swap',

  // --- FAQ ---
  faq:
    '# Unstoppable Swap Bot FAQ\n' +
    '\n' +
    '**What is this bot?**\n' +
    '\n' +
    'Unstoppable is a multi-platform crypto-to-crypto swap bot.\n' +
    '\n' +
    'Choose what you want to send and receive, compare quotes from multiple providers, and select the best option based on price, speed, risk, and privacy.\n' +
    '\n' +
    'You do not need to connect a wallet.\n' +
    '\n' +
    '**Which providers are supported?**\n' +
    '\n' +
    'The bot compares quotes from decentralized exchanges, instant exchange services, and DEX aggregation engines.\n' +
    '\n' +
    'Nearly all major liquidity sources are supported. Available quotes depend on the selected assets, networks, amount, and current liquidity.\n' +
    '\n' +
    '**How are quotes ranked?**\n' +
    '\n' +
    'Quotes are ranked using more than the advertised exchange rate.\n' +
    '\n' +
    'The bot also considers provider risk, expected execution results, and how much each provider has historically delivered compared with what it promised.\n' +
    '\n' +
    'This helps surface the quote that is most likely to produce the best actual result—not simply the most attractive advertised rate.\n' +
    '\n' +
    '**What is price correction?**\n' +
    '\n' +
    'Some providers regularly deliver slightly less than their original quote because of slippage, fees, or inaccurate estimates.\n' +
    '\n' +
    'Unstoppable tracks this behavior. If a provider regularly delivers less than promised, its quote is corrected downward before being placed in the rankings.\n' +
    '\n' +
    'This makes the amount shown before the swap more realistic. As a result, more than 60% of users receive even more than the amount displayed before their swap.\n' +
    '\n' +
    '**How does Unstoppable reduce the risk of frozen funds?**\n' +
    '\n' +
    'Every provider has a carefully defined risk profile. Its risk score is shown with the quote before you select a route.\n' +
    '\n' +
    'Pay close attention to this score when choosing a provider. A better rate may come with a higher risk of AML review, delays, KYC requests, or frozen funds.\n' +
    '\n' +
    'For some providers, Unstoppable can also estimate whether the provider is likely to have concerns about the funds before you create and fund the swap order.\n' +
    '\n' +
    'Unstoppable is designed to minimize the risk of freezes at every stage. However, when you choose a centralized provider, the possibility of a freeze or manual review cannot be eliminated completely.\n' +
    '\n' +
    'Only fully decentralized routes execute solely according to protocol rules rather than at the discretion of a centralized provider. These checks significantly reduce risk, but they cannot guarantee that every provider will accept a transaction.\n' +
    '\n' +
    '**Can providers freeze assets?**\n' +
    '\n' +
    'It depends on the route and provider.\n' +
    '\n' +
    'DEX swaps normally execute or fail according to their smart-contract rules and are not subject to manual review by an exchange operator.\n' +
    '\n' +
    'However, DEX aggregators and intent-based systems may involve routers, solvers, relayers, bridges, or other components. The ability to pause or restrict a transaction depends on the specific route.\n' +
    '\n' +
    'Instant exchanges and private-liquidity providers operate according to their own policies. They may reject and refund a swap following AML screening. Each provider is different.\n' +
    '\n' +
    'In our experience, providers operating with their own private liquidity tend to be more permissive than providers relying on external liquidity sources. In rare cases, a provider may hold funds for review or request KYC before completing or refunding a swap.\n' +
    '\n' +
    'Always check the provider’s risk score before making your selection.\n' +
    '\n' +
    '**How private is my swap?**\n' +
    '\n' +
    'Privacy depends on the route you select.\n' +
    '\n' +
    'A DEX swap is normally public. Wallet addresses, amounts, timing, and swap execution can be visible on the blockchain.\n' +
    '\n' +
    'An instant exchange creates no direct public transaction between the asset you send and the asset you receive. However, the provider knows which deposit funded which payout. Blockchain analytics may also estimate the connection using amounts, timing, and known provider addresses.\n' +
    '\n' +
    'A standard NEAR swap does not use confidential execution. Its entry, settlement, and output activity may be publicly observable or correlated.\n' +
    '\n' +
    'A NEAR confidential swap hides the internal swap execution. However, the deposit and withdrawal remain visible on their respective blockchains and may still be associated.\n' +
    '\n' +
    'No route guarantees anonymity.\n' +
    '\n' +
    '**How does a DEX swap affect my privacy?**\n' +
    '\n' +
    'A DEX swap is executed using public blockchain transactions and smart contracts.\n' +
    '\n' +
    'The wallet addresses, assets, amounts, timing, and transaction path may be visible to anyone. DEX routes can be fast and non-custodial, but they generally provide the least protection from blockchain analysis.\n' +
    '\n' +
    '**How does an instant exchange affect my privacy?**\n' +
    '\n' +
    'With an instant exchange, you send one asset to an address provided by the service. The service then sends the requested asset to your destination address.\n' +
    '\n' +
    'There is normally no direct public transaction connecting the two blockchains. However, the provider knows exactly which deposit funded which payout.\n' +
    '\n' +
    'Blockchain analytics may also estimate the connection using transaction amounts, timing, exchange rates, and known service addresses.\n' +
    '\n' +
    '**Does no KYC mean anonymous?**\n' +
    '\n' +
    'No.\n' +
    '\n' +
    'No KYC means that the provider does not normally require formal identity verification. It does not mean that the swap is invisible, unrecorded, or impossible to analyze.\n' +
    '\n' +
    'A no-KYC provider may still perform AML screening and request information in exceptional cases.\n' +
    '\n' +
    '**What is a NEAR standard swap?**\n' +
    '\n' +
    'A NEAR standard swap uses NEAR’s intent and solver infrastructure to find and execute a quote.\n' +
    '\n' +
    'It does not use confidential execution. Transactions entering and leaving the route remain visible, and their settlement activity may be publicly observable or correlated.\n' +
    '\n' +
    'For privacy purposes, a standard NEAR swap should be treated as publicly observable.\n' +
    '\n' +
    '**What is a NEAR confidential swap?**\n' +
    '\n' +
    'A NEAR confidential swap executes the internal part of the swap inside NEAR’s confidential environment.\n' +
    '\n' +
    'The currently available Basic mode hides the internal swap execution, but it does not hide the public deposit and withdrawal.\n' +
    '\n' +
    'For example, if $1,000 of BTC enters and approximately $1,000 of ETH leaves soon afterward, blockchain analytics may estimate that the transactions are related.\n' +
    '\n' +
    'Confidential mode improves privacy, but it does not make the swap invisible or guarantee anonymity.\n' +
    '\n' +
    '**How is a confidential swap different from an instant exchange?**\n' +
    '\n' +
    'Both routes can remove a direct public connection between the asset you send and the asset you receive.\n' +
    '\n' +
    'With an instant exchange, the provider knows exactly which deposit funded which payout. Your privacy depends partly on how the provider stores and protects that information.\n' +
    '\n' +
    'A NEAR confidential swap hides the internal execution using confidential infrastructure instead of relying only on an exchange provider’s privacy practices.\n' +
    '\n' +
    'However, Basic confidential mode still exposes the public deposit and withdrawal. Blockchain observers may associate them using amounts, timing, and wallet activity.\n' +
    '\n' +
    '**Should I enable confidential mode?**\n' +
    '\n' +
    'Consider enabling it if you want the internal swap execution hidden from public view and more privacy than a standard on-chain swap.\n' +
    '\n' +
    'It does not guarantee anonymity or prevent all blockchain analysis. Confidential mode may also have a different exchange rate, fee, or settlement time.\n' +
    '\n' +
    '**Do you collect or share user data?**\n' +
    '\n' +
    'Unstoppable does not ask for your name, email address, phone number, or identity documents.\n' +
    '\n' +
    'We do not pass user metadata—such as your IP address or platform identifiers—to swap providers or other liquidity sources. Providers receive only the transaction information required to execute the selected swap.\n' +
    '\n' +
    'Any technical metadata temporarily processed by Unstoppable is automatically deleted every 24 hours.\n' +
    '\n' +
    'The platform you use to access the bot may process information according to its own privacy policy.\n' +
    '\n' +
    '**Do you hold my funds?**\n' +
    '\n' +
    'No. Unstoppable never takes custody of your funds.\n' +
    '\n' +
    'Depending on the route, funds may temporarily pass through a smart contract, bridge, solver, or third-party provider while the swap is executed.\n' +
    '\n' +
    'Unstoppable only requests quotes, displays the available options, and provides transaction instructions.\n' +
    '\n' +
    '**What is a refund address?**\n' +
    '\n' +
    'A refund address is where your original funds can be returned if the swap fails.\n' +
    '\n' +
    'Make sure the address supports the correct asset and network and is controlled by you.\n' +
    '\n' +
    'Some routes, including certain THORChain swaps, do not require a separate refund address.\n' +
    '\n' +
    '**What does “Send exact amount” mean?**\n' +
    '\n' +
    'Some providers require the precise amount shown in the instructions.\n' +
    '\n' +
    'Sending more or less may result in a failed swap, a delay, a different exchange result, or loss of funds. Always send the exact amount using the correct asset and network.\n' +
    '\n' +
    '**How do I track my swap?**\n' +
    '\n' +
    'After confirmation, the bot provides a **Track Swap** link.\n' +
    '\n' +
    'You can use it to monitor the swap’s progress, payout, completion, failure, or refund.\n' +
    '\n' +
    '**Can I cancel a swap?**\n' +
    '\n' +
    'You can cancel before confirming and sending funds.\n' +
    '\n' +
    'After funds have been sent to the deposit address, the swap cannot be cancelled or reversed through Unstoppable. If execution fails, refunds are handled according to the selected provider’s rules.'

}
