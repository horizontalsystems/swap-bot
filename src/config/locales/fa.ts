import type { Strings } from '../strings'

export const fa: Strings = {
  // --- General buttons ---
  back: '⬅️ بازگشت',
  cancelSwap: '❌ لغو تبادل',

  // --- Search ---
  clearSearch: '📋 پاک کردن جستجو',
  searchNoResults: '🔄 *تبادل*\n\n{progress}\n\n❌ دارایی یافت نشد. عبارت دیگری را امتحان کنید.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ هنوز دارایی در دسترس نیست. لیست توکن‌ها ممکن است در حال بارگذاری باشد. لطفاً بعداً تلاش کنید.',
  selectSendAsset: '🔄 *تبادل*\n\nدارایی مورد نظر برای *ارسال* را انتخاب کنید یا جستجو کنید:',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *تبادل*\n\n{progress}\n\nدارایی مورد نظر برای *دریافت* را انتخاب کنید یا جستجو کنید:',

  // --- Step 3: Enter amount ---
  enterAmount:
    '🔄 *تبادل*\n\n{progress}\n\n' +
    '💰 مقدار *{asset}* را برای تبادل وارد کنید:\n\n' +
    '_راهنما: برای وارد کردن مبلغ دلاری_ `$100` _تایپ کنید_',
  invalidAmount:
    '🔄 *تبادل*\n\n{progress}\n\n' +
    '⚠️ *مقدار نامعتبر.* لطفاً یک عدد مثبت وارد کنید.\n\n' +
    '💰 مقدار *{asset}* را برای تبادل وارد کنید:\n\n' +
    '_راهنما: برای وارد کردن مبلغ دلاری_ `$100` _تایپ کنید_',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *تبادل*\n\n{progress}\n\n📍 آدرس _مقصد_ *{asset}* را وارد کنید:',
  invalidDestination:
    '🔄 *تبادل*\n\n{progress}\n\n' + '⚠️ *آدرس نامعتبر.* {hint}\n\n' + '📍 آدرس _مقصد_ *{asset}* را وارد کنید:',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *تبادل*\n\n{progress}\n\n🔙 آدرس _بازگشت_ *{asset}* را وارد کنید:',
  invalidRefund:
    '🔄 *تبادل*\n\n{progress}\n\n' + '⚠️ *آدرس نامعتبر.* {hint}\n\n' + '🔙 آدرس _بازگشت_ *{asset}* را وارد کنید:',

  // --- Quotes ---
  fetchingQuotes: '🔄 *تبادل*\n\n{progress}\n\n⏳ _در حال دریافت قیمت‌ها..._',
  noProviders: '🔄 *تبادل*\n\n{progress}\n\n❌ هیچ ارائه‌دهنده‌ای از این جفت پشتیبانی نمی‌کند.',
  noRoutes: '🔄 *تبادل*\n\n{progress}\n\n❌ مسیر تبادلی برای این جفت موجود نیست.',
  allProvidersFailed:
    '🔄 *تبادل*\n\n{progress}\n\n❌ هیچ ارائه‌دهنده‌ای نتوانست این تبادل را انجام دهد. مبلغ یا جفت دیگری را امتحان کنید.',
  quotesHeader: '🔄 *تبادل*\n\n{progress}\n\n' + '📊 *{count} قیمت موجود:*\n\n{routes}\n\n' + '_یک مسیر انتخاب کنید:_',
  quoteLine: '*{index}. {provider}* — 💵 {amount} {ticker} {receiveUsd} — 🕐 {time}',
  quoteError: '🔄 *تبادل*\n\n{progress}\n\n❌ *خطا در دریافت قیمت:* {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *خلاصه تبادل*\n\n' +
    '📤 *ارسال:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *دریافت:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *حداقل دریافت:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *مقصد:* {destination}\n' +
    '🔙 *بازگشت:* {refund}\n\n' +
    '🏷 *ارائه‌دهنده:* {provider}\n' +
    '🕐 *زمان تخمینی:* {time}\n\n' +
    '_این تبادل را تأیید می‌کنید؟_',
  confirmButton: '✅ تأیید',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *تبادل آماده شد!*\n\n' +
    '📤 *ارسال:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *دریافت:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *حداقل دریافت:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *مقصد:* {destination}\n' +
    '🔙 *بازگشت:* {refund}\n\n' +
    '🏷 *ارائه‌دهنده:* {provider}\n' +
    '🕐 *زمان تخمینی:* {time}\n\n' +
    '==============================\n\n' +
    '📍 دقیقاً `{sendAmount}` {sendAsset} را به آدرس زیر ارسال کنید:\n\n`{inboundAddress}`\n\n' +
    '📱 یا کد QR را در کیف پول اسکن کنید\n\n' +
    '_توجه: این تبادل پس از {expiration} منقضی می‌شود_',

  // --- Swap errors ---
  preparingSwap:
    '📋 *خلاصه تبادل*\n\n' +
    '📤 *ارسال:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *دریافت:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *حداقل دریافت:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *مقصد:* {destination}\n' +
    '🔙 *بازگشت:* {refund}\n\n' +
    '🏷 *ارائه‌دهنده:* {provider}\n' +
    '🕐 *زمان تخمینی:* {time}\n\n' +
    '⏳ _در حال آماده‌سازی تبادل..._',
  swapFailedNoRoutes: '❌ *تبادل ناموفق* — مسیری در دسترس نیست.',
  swapNoQr: '❌ *تبادل تأیید شد* اما کد QR دریافت نشد.\nلطفاً با پشتیبانی تماس بگیرید.',
  swapConfirmError: '❌ *خطای تبادل:* {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ تبادل لغو شد.',
  sessionExpired: '⚠️ نشست منقضی شده است.',
  processingSwap: '⏳ در حال پردازش...',
  assetNotFound: 'دارایی یافت نشد',
  alreadySelected: 'قبلاً به عنوان دارایی ارسال انتخاب شده',
  openInWallet: '💳 باز کردن در کیف پول',

  // --- Price ---
  priceUnavailable:
    '🔄 *تبادل*\n\n{progress}\n\n' +
    '⚠️ *قیمت در دسترس نیست* برای *{asset}*.\n' +
    '_لطفاً مقدار را به صورت توکن وارد کنید._',

  // --- Bot-level messages ---
  botError: '❌ مشکلی پیش آمد. لطفاً دوباره با /swap تلاش کنید.',
  botCancelReply: '🚫 عملیات فعلی لغو شد.',

  // --- Progress lines ---
  progressSend: '📤 ارسال: *{asset}*',
  progressReceive: '📥 دریافت: *{asset}*',
  progressAmount: '🔢 مقدار: *{amount} {asset}* {amountUsd}',
  progressDestination: '📍 مقصد: {address}',
  progressRefund: '🔙 بازگشت: {address}'
}
