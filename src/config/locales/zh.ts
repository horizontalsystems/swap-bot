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
  quoteLine: '{index}. {provider} — {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 兑换\n\n{progress}\n\n❌ 获取报价失败: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 兑换摘要\n' +
    '━━━━━━━━━━━━━━━\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '最少: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 接收地址：{destination}\n' +
    '↩️ 退款地址：{refund}\n' +
    '🔗 提供商：{provider} • ~{time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '确认此兑换？',
  confirmButton: '✅ 确认',

  // --- Swap confirmed ---
  swapConfirmed:
    '💱 兑换摘要\n' +
    '━━━━━━━━━━━━━━━\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '最少: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 接收地址：{destination}\n' +
    '↩️ 退款地址：{refund}\n' +
    '🔗 提供商：{provider} • ~{time}\n' +
    '⏳ 报价过期时间：{expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '请准确发送：\n' +
    '`{sendAmount}` {sendAsset}\n\n' +
    '至地址：\n' +
    '`{inboundAddress}`' +
    '{warning}' +
    '{links}',

  // --- Swap errors ---
  preparingSwap:
    '📋 兑换摘要\n' +
    '━━━━━━━━━━━━━━━\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '最少: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 接收地址：{destination}\n' +
    '↩️ 退款地址：{refund}\n' +
    '🔗 提供商：{provider} • ~{time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ 正在准备兑换...',
  swapFailedNoRoutes: '❌ 兑换失败 — 没有可用路线。',
  swapNoQr: '❌ 兑换已确认，但未收到二维码。\n请联系客服。',
  swapConfirmError: '❌ 兑换失败: {error}',

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
  progressRefund: '退款地址：{address}'
}
