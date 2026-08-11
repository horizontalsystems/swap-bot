import type { Strings } from '../strings'

export const zh: Strings = {
  // --- General buttons ---
  back: '⬅️ 返回',
  cancelSwap: '❌ 取消兑换',

  // --- Search ---
  clearSearch: '🗑️ 清除搜索',
  searchNoResults: '💱 兑换\n\n{progress}\n\n⚠️ 未找到资产。请尝试其他关键词。',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ 暂无可用资产。代币列表可能仍在加载中，请稍后再试。',
  selectSendAsset: '💱 兑换\n\n您想发送哪种资产？\n输入代币代码或名称搜索 👇',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '💱 兑换\n\n{progress}\n\n您想接收哪种资产？\n输入代币代码或名称搜索 👇',

  // --- Step 3: Enter amount ---
  enterAmount: '💱 兑换\n\n{progress}\n\n' + '您想兑换多少 {asset}？\n' + '提示：输入 $ 前缀可按美元金额兑换 👇',
  invalidAmount:
    '💱 兑换\n\n{progress}\n\n' +
    '您想兑换多少 {asset}？\n' +
    '提示：输入 $ 前缀可按美元金额兑换 👇\n\n' +
    '⚠️ 金额无效 — 请输入有效的正数。',

  // --- Step 4: Destination address ---
  enterDestination: '💱 兑换\n\n{progress}\n\n请输入 {asset} 接收地址 👇',
  invalidDestination: '💱 兑换\n\n{progress}\n\n' + '请输入 {asset} 接收地址 👇\n\n' + '⚠️ 地址无效 — {hint}',

  // --- Step 5: Refund address ---
  enterRefund: '💱 兑换\n\n{progress}\n\n请输入 {asset} 退款地址 👇',
  invalidRefund: '💱 兑换\n\n{progress}\n\n' + '请输入 {asset} 退款地址 👇\n\n' + '⚠️ 地址无效 — {hint}',

  // --- Quotes ---
  fetchingQuotes: '💱 兑换\n\n{progress}\n\n⏳ 正在获取报价...',
  noProviders: '💱 兑换\n\n{progress}\n\n❌ 没有提供商支持此交易对。',
  noRoutes: '💱 兑换\n\n{progress}\n\n❌ 此交易对没有可用的兑换路线。',
  allProvidersFailed: '💱 兑换\n\n{progress}\n\n❌ 没有提供商能够完成此兑换。请尝试其他金额或交易对。',
  quotesHeader: '💱 兑换\n\n{progress}\n\n' + '{count} 个报价可用 — 请选择路线 👇\n\n{routes}',
  quoteLine: '{index}. {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 兑换\n\n{progress}\n\n❌ 获取报价失败: {error}',

  // --- Zcash address families ---
  zecAddressNote:
    'ℹ️ ZEC: 每条路线都标注了可提现的地址类型 — 透明地址 (t1…/t3…) 或屏蔽地址 (zs1…/u1…)。请选择与您钱包匹配的路线。',
  zecRouteTransparent: '透明 t1/t3',
  zecRouteShielded: '屏蔽 zs1/u1',
  zecNeedsTransparent:
    '⚠️ {provider} 只能提现到透明 ZEC 地址 (t1…/t3…)。\n' + '请输入透明地址，或返回上一步选择屏蔽路线。',
  zecNeedsShielded: '⚠️ {provider} 提现到屏蔽 ZEC 地址 (zs1…/u1…)。\n' + '请输入屏蔽地址，或返回上一步选择透明路线。',
  chooseAnotherProvider: '👉 请选择其他提供商重试。',

  // --- Receive floor ---
  // `{minLine}` is built in code (see buildMinLine) and carries its own trailing newline,
  // so it collapses to nothing when the route has no floor worth showing.
  minReceiveLine: '最少: {amount} {asset} {usd}',
  estimateLine: '最少: 不保证 — 最终金额将在您的存款到账时确定',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 兑换摘要\n' +
    '━━━━━━━━━━━━━━━\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 接收地址：{destination}\n' +
    '↩️ 退款地址：{refund}\n' +
    '🔗 提供商：{provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '确认此兑换？',
  confirmButton: '✅ 确认',

  // --- Swap confirmed ---
  swapConfirmed:
    '💱 兑换摘要\n' +
    '━━━━━━━━━━━━━━━\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 接收地址：{destination}\n' +
    '↩️ 退款地址：{refund}\n' +
    '🔗 提供商：{provider} • {time}\n' +
    '⏳ 报价过期时间：{expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '请准确发送：\n' +
    '`{sendAmountRaw}` {sendAsset}\n\n' +
    '至地址：\n' +
    '`{inboundAddress}`' +
    '{attachment}' +
    '{warning}' +
    '{links}',
  depositAttachment: '\n\n⚠️ {label} — 必填，缺少将导致资金丢失:\n`{value}`',
  attachmentTag: 'Destination tag',
  attachmentMemo: 'Memo',

  // --- Swap errors ---
  preparingSwap:
    '📋 兑换摘要\n' +
    '━━━━━━━━━━━━━━━\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 接收地址：{destination}\n' +
    '↩️ 退款地址：{refund}\n' +
    '🔗 提供商：{provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ 正在准备兑换...',
  swapFailedNoRoutes: '❌ 兑换失败 — 没有可用路线。',
  swapNoQr: '❌ 兑换已确认，但未收到存款说明。\n请联系客服。',
  swapConfirmError: '❌ 兑换失败: {error}',
  amlBlocked:
    '⛔ 无法进行此兑换 — 地址 {address} 被第三方合规服务商 (Elliptic) 标记为高风险。请使用其他地址重新发起兑换。',

  // --- Cancel / misc ---
  swapCancelled: '❌ 兑换已取消。',
  sessionExpired: '⚠️ 会话已过期。',
  processingSwap: '⏳ 处理中...',
  assetNotFound: '未找到资产',
  alreadySelected: '已选为发送资产',
  openWalletApp: '打开钱包应用',
  trackSwap: '追踪兑换',
  amountWarning: '⚠️ 请发送准确金额以避免资金损失',
  changeAmount: '💰 修改金额',
  newSwap: '🔄 新兑换',

  // --- Price ---
  priceUnavailable: '💱 兑换\n\n{progress}\n\n' + '⚠️ 价格不可用：{asset}。\n' + '请直接输入代币数量。',

  // --- Bot-level messages ---
  botError: '❌ 出了点问题。请使用 /swap 重试。',
  botCancelReply: '🚫 当前操作已取消。',

  // --- Progress lines ---
  progressSend: '发送：{asset}',
  progressReceive: '接收：{asset}',
  progressAmount: '数量：{amount} {asset} {amountUsd}',
  progressProvider: '提供商：{provider}',
  progressDestination: '接收地址：{address}',
  progressRefund: '退款地址：{address}',

  // --- FAQ ---
  faq:
    '❓ *FAQ*\n\n' +
    '*这个机器人是什么？*\n\n' +
    'Telegram 内的加密货币兑换机器人。\n\n' +
    '选择要发送和接收的资产，比较多个提供商的报价，无需连接钱包即可完成兑换。\n\n' +
    '*支持哪些提供商？*\n\n' +
    '机器人同时聚合去中心化和中心化提供商。可用提供商取决于资产对。\n\n' +
    '*提供商能否冻结资产？*\n\n' +
    '取决于提供商类型。\n\n' +
    'DEX 协议无法冻结资金。兑换要么执行，要么失败（资金自动退回）。\n\n' +
    '自有流动性提供商使用自己的储备运营。冻结极其不可能，但交易对手风险仍然存在。\n\n' +
    '大多数使用第三方流动性的来源都有 AML 政策。大多数情况下，如果检测到 AML 问题，兑换会被拒绝并退款。在极少数情况下，提供商可能在释放资金前要求 KYC。\n\n' +
    '风险等级在选择前显示在每个提供商旁边。\n\n' +
    '*你们会持有我的资金吗？*\n\n' +
    '不会。Unstoppable Swap Bot 从不托管资金。兑换由第三方提供商直接执行。\n\n' +
    '机器人仅请求报价、显示选项并提供交易指令。资金直接在您和提供商之间流转。\n\n' +
    '*什么是退款地址？*\n\n' +
    '退款地址是兑换失败时资金退回的地址。某些提供商将其作为安全措施要求提供。\n\n' +
    'THORChain DEX 兑换不需要退款地址。\n\n' +
    '*"发送准确金额"是什么意思？*\n\n' +
    '某些提供商（尤其是 THORChain）要求发送精确的指定金额。发送多于或少于指定金额可能导致：兑换失败、延迟或资金损失。请始终发送显示的准确金额。\n\n' +
    '*如何追踪我的兑换？*\n\n' +
    '确认后，机器人会提供追踪兑换链接。您可以监控：兑换进度和执行状态。\n\n' +
    '*可以取消兑换吗？*\n\n' +
    '确认前可以随时取消。资金发送到存款地址后，无法通过机器人撤销兑换。'
}
