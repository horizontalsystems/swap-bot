import type { Strings } from '../strings'

export const zh: Strings = {
  // --- General buttons ---
  back: '⬅️ 返回',
  cancelSwap: '❌ 取消兑换',

  // --- Search ---
  clearSearch: '🗑️ 清除搜索',
  searchNoResults: '🔄 *兑换*\n\n{progress}\n\n⚠️ 未找到资产。请尝试其他关键词。',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ 暂无可用资产。代币列表可能仍在加载中，请稍后再试。',
  selectSendAsset: '🔄 *兑换*\n\n🔘 选择要*发送*的资产：\n\n_提示：输入代币代码或名称进行搜索_',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *兑换*\n\n{progress}\n\n🔘 选择要*接收*的资产：\n\n_提示：输入代币代码或名称进行搜索_',

  // --- Step 3: Enter amount ---
  enterAmount:
    '🔄 *兑换*\n\n{progress}\n\n' + '🔘 请输入要兑换的 *{asset}* 数量：\n\n' + '_提示：使用_ *$* _符号输入美元金额_',
  invalidAmount:
    '🔄 *兑换*\n\n{progress}\n\n' +
    '🔘 请输入要兑换的 *{asset}* 数量：\n\n' +
    '_提示：使用_ *$* _符号输入美元金额_\n\n' +
    '====================\n\n' +
    '⚠️ *金额无效。* 请输入有效的正数。',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *兑换*\n\n{progress}\n\n🔘 请输入 *{asset}* _接收_地址：',
  invalidDestination:
    '🔄 *兑换*\n\n{progress}\n\n' +
    '🔘 请输入 *{asset}* _接收_地址：\n\n' +
    '====================\n\n' +
    '⚠️ *地址无效。* {hint}',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *兑换*\n\n{progress}\n\n🔘 请输入 *{asset}* _退款_地址：',
  invalidRefund:
    '🔄 *兑换*\n\n{progress}\n\n' +
    '🔘 请输入 *{asset}* _退款_地址：\n\n' +
    '====================\n\n' +
    '⚠️ *地址无效。* {hint}',

  // --- Quotes ---
  fetchingQuotes: '🔄 *兑换*\n\n{progress}\n\n⏳ _正在获取报价..._',
  noProviders: '🔄 *兑换*\n\n{progress}\n\n❌ 没有提供商支持此交易对。',
  noRoutes: '🔄 *兑换*\n\n{progress}\n\n❌ 此交易对没有可用的兑换路线。',
  allProvidersFailed: '🔄 *兑换*\n\n{progress}\n\n❌ 没有提供商能够完成此兑换。请尝试其他金额或交易对。',
  quotesHeader: '🔄 *兑换*\n\n{progress}\n\n' + '🔘 {count} 个报价可用：\n\n{routes}\n\n' + '_请选择以下路线：_',
  quoteLine: '{index}. {provider} — *{amount} {ticker} {receiveUsd}* — 🕐 {time}',
  quoteError: '🔄 *兑换*\n\n{progress}\n\n❌ *获取报价失败：* {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *兑换摘要*\n\n' +
    '发送：*{sendAmount} {sendAsset} {sendUsd}*\n' +
    '接收：*~{receiveAmount} {receiveAsset} {receiveUsd}*\n' +
    '保底：*{minReceive} {receiveAsset} {minReceiveUsd}*\n\n' +
    '接收地址：*{destination}*\n' +
    '退款地址：*{refund}*\n\n' +
    '提供商：*{provider}*\n' +
    '预计时间：*{time}*\n\n' +
    '_确认此兑换？_',
  confirmButton: '✅ 确认',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *准备就绪！*\n\n' +
    '发送：{sendAmount} {sendAsset} {sendUsd}\n' +
    '接收：~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '保底：{minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '接收地址：{destination}\n' +
    '退款地址：{refund}\n\n' +
    '提供商：{provider}\n' +
    '预计时间：{time}\n\n' +
    '报价过期时间：{expiration}\n\n' +
    '====================\n' +
    '👇 操作说明 👇\n' +
    '====================\n\n' +
    '🔘 在钱包应用中扫描二维码\n\n' +
    '{orOpenWalletApp}' +
    '🔘 或手动发送 {sendAsset}：\n\n' +
    '• 金额（点击复制）\n\n' +
    '`{sendAmount}`\n\n' +
    '• 收款地址（点击复制）\n\n' +
    '`{inboundAddress}`\n\n' +
    '====================\n\n' +
    '{warning}' +
    '{trackLink}',

  // --- Swap errors ---
  preparingSwap:
    '📋 *兑换摘要*\n\n' +
    '发送：*{sendAmount} {sendAsset} {sendUsd}*\n' +
    '接收：*~{receiveAmount} {receiveAsset} {receiveUsd}*\n' +
    '保底：*{minReceive} {receiveAsset} {minReceiveUsd}*\n\n' +
    '接收地址：*{destination}*\n' +
    '退款地址：*{refund}*\n\n' +
    '提供商：*{provider}*\n' +
    '预计时间：*{time}*\n\n' +
    '⏳ _正在准备兑换..._',
  swapFailedNoRoutes: '❌ *兑换失败* — 没有可用路线。',
  swapNoQr: '❌ *兑换已确认*，但未收到二维码。\n请联系客服。',
  swapConfirmError: '❌ *兑换失败：* {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ 兑换已取消。',
  sessionExpired: '⚠️ 会话已过期。',
  processingSwap: '⏳ 处理中...',
  assetNotFound: '未找到资产',
  alreadySelected: '已选为发送资产',
  orOpenWalletApp: '🔘 或{openWalletApp}\n\n',
  openWalletApp: '打开钱包应用',
  trackSwapHere: '追踪兑换',
  amountWarning: '⚠️ 请准确发送指定金额以避免资金损失',

  // --- Price ---
  priceUnavailable: '🔄 *兑换*\n\n{progress}\n\n' + '⚠️ *价格不可用*：*{asset}*。\n' + '_请直接输入代币数量。_',

  // --- Bot-level messages ---
  botError: '❌ 出了点问题。请使用 /swap 重试。',
  botCancelReply: '🚫 当前操作已取消。',

  // --- Progress lines ---
  progressSend: '发送：*{asset}*',
  progressReceive: '接收：*{asset}*',
  progressAmount: '数量：*{amount} {asset} {amountUsd}*',
  progressDestination: '接收地址：*{address}*',
  progressRefund: '退款地址：*{address}*'
}
