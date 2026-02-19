import type { Strings } from '../strings'

export const zh: Strings = {
  // --- General buttons ---
  back: '⬅️ 返回',
  cancelSwap: '❌ 取消兑换',

  // --- Search ---
  clearSearch: '📋 清除搜索',
  searchNoResults: '🔄 *兑换*\n\n{progress}❌ 未找到资产。请尝试其他关键词。',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ 暂无可用资产。代币列表可能仍在加载中，请稍后再试。',
  selectSendAsset: '🔄 *兑换*\n\n选择要*发送*的资产或输入搜索：',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *兑换*\n\n{progress}\n\n选择要*接收*的资产或输入搜索：',

  // --- Step 3: Enter amount ---
  enterAmount: '🔄 *兑换*\n\n{progress}\n\n💰 请输入要兑换的 *{asset}* 数量：',
  invalidAmount: '🔄 *兑换*\n\n{progress}\n\n⚠️ 请输入有效的正数。\n\n💰 请输入要兑换的 *{asset}* 数量：',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *兑换*\n\n{progress}\n\n📍 请输入 *{asset}* 接收地址：',
  invalidDestination: '🔄 *兑换*\n\n{progress}\n\n⚠️ 地址无效。{hint}\n\n📍 请输入 *{asset}* 接收地址：',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *兑换*\n\n{progress}\n\n🔙 请输入 *{asset}* 退款地址：',
  invalidRefund: '🔄 *兑换*\n\n{progress}\n\n⚠️ 地址无效。{hint}\n\n🔙 请输入 *{asset}* 退款地址：',

  // --- Quotes ---
  fetchingQuotes: '🔄 *兑换*\n\n{progress}\n\n⏳ 正在获取报价...',
  noProviders: '🔄 *兑换*\n\n{progress}\n\n❌ 没有提供商支持此交易对。',
  noRoutes: '🔄 *兑换*\n\n{progress}\n\n❌ 此交易对没有可用的兑换路线。',
  allProvidersFailed: '🔄 *兑换*\n\n{progress}\n\n❌ 没有提供商能够完成此兑换。请尝试其他金额或交易对。',
  quotesHeader: '🔄 *兑换*\n\n{progress}\n\n📊 *报价* ({count})：\n\n{routes}\n\n',
  quoteLine: '*{index}.* {provider}\n    {amount} {ticker}  ·  {time}',
  quoteError: '🔄 *兑换*\n\n{progress}\n\n❌ 获取报价失败：{error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *兑换摘要*\n\n' +
    '*发送：* {sendAmount} {sendAsset}\n' +
    '*接收：* ~{receiveAmount} {receiveAsset}\n' +
    '*最少接收：* {minReceive} {receiveAsset}\n\n' +
    '*接收地址：*\n`{destination}`\n' +
    '*退款地址：*\n`{refund}`\n\n' +
    '*提供商：* {provider}\n' +
    '*预计时间：* {time}\n\n' +
    '确认此兑换？',
  confirmButton: '✅ 确认',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *兑换已准备！*\n\n' +
    '*发送：* {sendAmount} {sendAsset}\n' +
    '*接收：* ~{receiveAmount} {receiveAsset}\n' +
    '*发送至：*\n`{inboundAddress}`\n\n' +
    '*提供商：* {provider}\n' +
    '*预计时间：* {time}\n' +
    '*过期时间：* {expiration}\n\n' +
    '📱 扫描二维码发送 *{sendAmount} {sendAsset}*',

  // --- Swap errors ---
  preparingSwap:
    '📋 *兑换摘要*\n\n' +
    '*发送：* {sendAmount} {sendAsset}\n' +
    '*接收：* ~{receiveAmount} {receiveAsset}\n' +
    '*最少接收：* {minReceive} {receiveAsset}\n\n' +
    '*接收地址：*\n`{destination}`\n' +
    '*退款地址：*\n`{refund}`\n\n' +
    '*提供商：* {provider}\n' +
    '*预计时间：* {time}\n\n' +
    '⏳ 正在准备兑换...',
  swapFailedNoRoutes: '❌ 兑换失败：没有可用路线。',
  swapNoQr: '❌ 兑换已确认但未收到二维码。请联系客服。',
  swapConfirmError: '❌ 兑换确认失败：{error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ 兑换已取消。',
  sessionExpired: '会话已过期。',
  processingSwap: '正在处理兑换...',
  assetNotFound: '未找到资产',
  alreadySelected: '已选为发送资产',

  // --- Bot-level messages ---
  botError: '❌ 出了点问题。请使用 /swap 重试。',
  botCancelReply: '🚫 当前操作已取消。',

  // --- Progress lines ---
  progressSend: '✅ 发送：*{asset}*',
  progressReceive: '✅ 接收：*{asset}*',
  progressAmount: '✅ 数量：*{amount} {asset}*',
  progressDestination: '✅ 接收地址：`{address}`',
  progressRefund: '✅ 退款地址：`{address}`'
}
