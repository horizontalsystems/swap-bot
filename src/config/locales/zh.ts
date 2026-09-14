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
  noProvidersSecure:
    '💱 兑换\n\n{progress}\n\n' + '❌ 此交易对没有机密路线。\n' + '关闭安全兑换即可获取常规提供商的报价。',
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

  // --- Secure (confidential) swap ---
  secureOn: '🔒 安全兑换：开',
  secureOff: '🔓 安全兑换：关',
  secureEnabled: '已开启安全兑换 — 仅显示机密路线',
  secureDisabled: '已关闭安全兑换 — 使用常规提供商',
  splitPayoutNote: 'ℹ️ 此路线会将付款拆分为多笔转账，并在随机延迟后发送 — 请预期收到多笔入账交易。',

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
  progressSecure: '🔒 安全兑换',

  // --- FAQ ---
  faq:
    '# Unstoppable Swap Bot FAQ\n' +
    '\n' +
    '**这个机器人是什么？**\n' +
    '\n' +
    'Unstoppable 是一个多平台加密货币对加密货币兑换机器人。\n' +
    '\n' +
    '你可以选择要发送和接收的资产，比较多个提供商的报价，并根据价格、速度、风险和隐私选择最佳方案。\n' +
    '\n' +
    '你不需要连接钱包。\n' +
    '\n' +
    '**支持哪些提供商？**\n' +
    '\n' +
    '机器人会比较去中心化交易所、即时兑换服务和 DEX 聚合引擎的报价。\n' +
    '\n' +
    '几乎所有主流流动性来源都受支持。可用报价取决于所选资产、网络、金额以及当前流动性。\n' +
    '\n' +
    '**报价如何排序？**\n' +
    '\n' +
    '报价排序不只看表面汇率。\n' +
    '\n' +
    '机器人还会考虑提供商风险、预期执行结果，以及每个提供商历史上实际交付与承诺相比的表现。\n' +
    '\n' +
    '这样可以优先显示更有可能带来最佳实际结果的报价，而不只是看起来最吸引人的报价。\n' +
    '\n' +
    '**什么是价格修正？**\n' +
    '\n' +
    '有些提供商因为滑点、手续费或估算不准，通常会比最初报价少交付一点。\n' +
    '\n' +
    'Unstoppable 会跟踪这种行为。如果某个提供商经常少于承诺金额，系统会在排序前向下修正它的报价。\n' +
    '\n' +
    '这能让兑换前显示的金额更接近真实结果。因此，超过 60% 的用户最终拿到的金额会比兑换前显示的金额还要多。\n' +
    '\n' +
    '**Unstoppable 如何降低资金被冻结的风险？**\n' +
    '\n' +
    '每个提供商都有经过仔细定义的风险画像。你在选择路线前会看到它的风险评分。\n' +
    '\n' +
    '选择提供商时请特别注意这个评分。更好的汇率可能伴随着更高的 AML 审查、延迟、KYC 请求或资金冻结风险。\n' +
    '\n' +
    '对于某些提供商，Unstoppable 还可以在你创建并注资兑换订单之前，估计他们是否可能对这笔资金有顾虑。\n' +
    '\n' +
    'Unstoppable 的设计目标是在各个阶段尽量降低冻结风险。不过，当你选择中心化提供商时，无法完全消除冻结或人工审核的可能性。\n' +
    '\n' +
    '只有完全去中心化的路线才会严格按照协议规则执行，而不是由中心化提供商自行决定。这些检查能显著降低风险，但不能保证每个提供商都会接受某笔交易。\n' +
    '\n' +
    '**提供商会冻结资产吗？**\n' +
    '\n' +
    '这取决于路线和提供商。\n' +
    '\n' +
    'DEX 兑换通常会按照智能合约规则执行或失败，不受交易所人工审核影响。\n' +
    '\n' +
    '不过，DEX 聚合器和 intent-based 系统可能涉及路由器、求解器、转发器、桥或其他组件。是否可以暂停或限制交易，取决于具体路线。\n' +
    '\n' +
    '即时兑换和私有流动性提供商会按照各自的政策运作。它们可能在 AML 审查后拒绝交易并退回资金。每个提供商都不同。\n' +
    '\n' +
    '根据我们的经验，使用自有私有流动性的提供商通常比依赖外部流动性的提供商更宽松。少数情况下，提供商可能会暂时保留资金以供审查，或在完成/退款前要求 KYC。\n' +
    '\n' +
    '选择前请务必查看提供商的风险评分。\n' +
    '\n' +
    '**我的兑换隐私如何？**\n' +
    '\n' +
    '隐私取决于你选择的路线。\n' +
    '\n' +
    'DEX 兑换通常是公开的。钱包地址、金额、时间和兑换执行过程都可能在区块链上可见。\n' +
    '\n' +
    '即时兑换不会在你发送的资产和你收到的资产之间建立直接的公开链上交易。不过，提供商会知道哪笔存款对应哪笔支付。区块链分析也可能通过金额、时间和已知提供商地址推断关联。\n' +
    '\n' +
    '标准 NEAR 兑换不使用机密执行。其进入、结算和输出活动可能是公开可见或可关联的。\n' +
    '\n' +
    'NEAR 机密兑换会隐藏内部兑换执行。不过，存款和提款在各自的区块链上仍然可见，也可能仍然被关联起来。\n' +
    '\n' +
    '没有任何路线能保证匿名。\n' +
    '\n' +
    '**DEX 兑换如何影响我的隐私？**\n' +
    '\n' +
    'DEX 兑换是通过公开的区块链交易和智能合约执行的。\n' +
    '\n' +
    '钱包地址、资产、金额、时间和交易路径都可能被任何人看到。DEX 路线可能快速且非托管，但通常对区块链分析的保护最弱。\n' +
    '\n' +
    '**即时兑换如何影响我的隐私？**\n' +
    '\n' +
    '使用即时兑换时，你把一种资产发送到服务提供的地址，然后服务把你要的资产发送到你的目标地址。\n' +
    '\n' +
    '通常不会有一笔直接连接两条区块链的公开交易。不过，提供商会准确知道哪笔存款对应哪笔支付。\n' +
    '\n' +
    '区块链分析还可能通过交易金额、时间、汇率以及已知服务地址推断关联。\n' +
    '\n' +
    '**“没有 KYC”就等于匿名吗？**\n' +
    '\n' +
    '不等于。\n' +
    '\n' +
    '没有 KYC 只是表示提供商通常不要求正式身份验证，并不表示兑换是不可见、未记录或无法分析的。\n' +
    '\n' +
    '无 KYC 的提供商在特殊情况下仍可能进行 AML 审查并要求提供信息。\n' +
    '\n' +
    '**什么是 NEAR 标准兑换？**\n' +
    '\n' +
    'NEAR 标准兑换使用 NEAR 的 intent 和 solver 基础设施来寻找并执行报价。\n' +
    '\n' +
    '它不使用机密执行。进入和离开该路线的交易仍然可见，其结算活动也可能是公开可见或可关联的。\n' +
    '\n' +
    '从隐私角度看，标准 NEAR 兑换应视为公开可见。\n' +
    '\n' +
    '**什么是 NEAR 机密兑换？**\n' +
    '\n' +
    'NEAR 机密兑换会在 NEAR 的机密环境中执行兑换内部部分。\n' +
    '\n' +
    '当前可用的 Basic 模式会隐藏内部兑换执行，但不会隐藏公开的存款和提款。\n' +
    '\n' +
    '例如，如果有 1,000 美元的 BTC 进入，随后大约 1,000 美元的 ETH 输出，区块链分析可能会推断这些交易相关。\n' +
    '\n' +
    '机密模式能提升隐私，但不会让兑换不可见，也不能保证匿名。\n' +
    '\n' +
    '**机密兑换和即时兑换有什么区别？**\n' +
    '\n' +
    '这两种路线都可以移除你发送资产和接收资产之间的直接公开连接。\n' +
    '\n' +
    '在即时兑换中，提供商会准确知道哪笔存款对应哪笔支付。你的隐私部分取决于提供商如何存储和保护这些信息。\n' +
    '\n' +
    'NEAR 机密兑换通过机密基础设施隐藏内部执行，而不只是依赖某个兑换提供商的隐私政策。\n' +
    '\n' +
    '不过，Basic 机密模式仍会暴露公开的存款和提款。区块链观察者仍可能通过金额、时间和钱包活动将它们关联起来。\n' +
    '\n' +
    '**我应该开启机密模式吗？**\n' +
    '\n' +
    '如果你希望内部兑换执行不对公众可见，并且比普通链上兑换有更高的隐私保护，可以考虑开启。\n' +
    '\n' +
    '它不能保证匿名，也不能防止所有区块链分析。机密模式的汇率、费用或结算时间也可能不同。\n' +
    '\n' +
    '**你们会收集或分享用户数据吗？**\n' +
    '\n' +
    'Unstoppable 不会要求你的姓名、邮箱、电话号码或身份证明文件。\n' +
    '\n' +
    '我们不会把用户元数据——例如你的 IP 地址或平台标识——传给兑换提供商或其他流动性来源。提供商只会收到执行所选兑换所需的交易信息。\n' +
    '\n' +
    'Unstoppable 临时处理的任何技术元数据都会在 24 小时后自动删除。\n' +
    '\n' +
    '你用于访问机器人的平台，可能会按照其自己的隐私政策处理信息。\n' +
    '\n' +
    '**你们会持有我的资金吗？**\n' +
    '\n' +
    '不会。Unstoppable 从不托管你的资金。\n' +
    '\n' +
    '根据路线不同，资金在兑换过程中可能会暂时经过智能合约、桥、solver 或第三方提供商。\n' +
    '\n' +
    'Unstoppable 只负责请求报价、展示可选方案并提供交易指令。\n' +
    '\n' +
    '**什么是退款地址？**\n' +
    '\n' +
    '退款地址是兑换失败时，原始资金返回到的地址。\n' +
    '\n' +
    '请确保该地址支持正确的资产和网络，并且由你控制。\n' +
    '\n' +
    '某些路线（包括部分 THORChain 兑换）不需要单独的退款地址。\n' +
    '\n' +
    '**“发送准确金额”是什么意思？**\n' +
    '\n' +
    '某些提供商要求发送指令里写明的精确金额。\n' +
    '\n' +
    '发送多了或少了，可能导致兑换失败、延迟、不同的兑换结果，甚至资金损失。请始终按正确的资产和网络发送准确金额。\n' +
    '\n' +
    '**如何追踪我的兑换？**\n' +
    '\n' +
    '确认后，机器人会提供一个 **Track Swap** 链接。\n' +
    '\n' +
    '你可以用它来查看兑换进度、支付、完成、失败或退款状态。\n' +
    '\n' +
    '**我可以取消兑换吗？**\n' +
    '\n' +
    '你可以在确认并发送资金之前取消。\n' +
    '\n' +
    '一旦资金发送到存款地址，就无法通过 Unstoppable 取消或撤销兑换。如果执行失败，退款将按照所选提供商的规则处理。'

}
