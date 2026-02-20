import type { Strings } from '../strings'

export const fa: Strings = {
  // --- General buttons ---
  back: '⬅️ بازگشت',
  cancelSwap: '❌ لغو تبادل',

  // --- Search ---
  clearSearch: '📋 پاک کردن جستجو',
  searchNoResults: '🔄 *تبادل*\n\n{progress}❌ دارایی یافت نشد. عبارت دیگری را امتحان کنید.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ هنوز دارایی در دسترس نیست. لیست توکن‌ها ممکن است در حال بارگذاری باشد. لطفاً بعداً تلاش کنید.',
  selectSendAsset: '🔄 *تبادل*\n\nدارایی مورد نظر برای *ارسال* را انتخاب کنید یا جستجو کنید:',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *تبادل*\n\n{progress}\n\nدارایی مورد نظر برای *دریافت* را انتخاب کنید یا جستجو کنید:',

  // --- Step 3: Enter amount ---
  enterAmount:
    '🔄 *تبادل*\n\n{progress}\n\n💰 مقدار *{asset}* را برای تبادل وارد کنید\nیا از `$` برای دلار استفاده کنید (مثلاً `$100`):',
  invalidAmount:
    '🔄 *تبادل*\n\n{progress}\n\n⚠️ لطفاً یک عدد مثبت معتبر وارد کنید.\n\n💰 مقدار *{asset}* را برای تبادل وارد کنید:',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *تبادل*\n\n{progress}\n\n📍 آدرس مقصد *{asset}* را وارد کنید:',
  invalidDestination: '🔄 *تبادل*\n\n{progress}\n\n⚠️ آدرس نامعتبر است. {hint}\n\n📍 آدرس مقصد *{asset}* را وارد کنید:',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *تبادل*\n\n{progress}\n\n🔙 آدرس بازگشت *{asset}* را وارد کنید:',
  invalidRefund: '🔄 *تبادل*\n\n{progress}\n\n⚠️ آدرس نامعتبر است. {hint}\n\n🔙 آدرس بازگشت *{asset}* را وارد کنید:',

  // --- Quotes ---
  fetchingQuotes: '🔄 *تبادل*\n\n{progress}\n\n⏳ در حال دریافت قیمت‌ها...',
  noProviders: '🔄 *تبادل*\n\n{progress}\n\n❌ هیچ ارائه‌دهنده‌ای از این جفت پشتیبانی نمی‌کند.',
  noRoutes: '🔄 *تبادل*\n\n{progress}\n\n❌ مسیر تبادلی برای این جفت موجود نیست.',
  allProvidersFailed:
    '🔄 *تبادل*\n\n{progress}\n\n❌ هیچ ارائه‌دهنده‌ای نتوانست این تبادل را انجام دهد. مبلغ یا جفت دیگری را امتحان کنید.',
  quotesHeader: '🔄 *تبادل*\n\n{progress}\n\n📊 *قیمت‌ها* ({count}):\n\n{routes}\n\n',
  quoteLine: '*{index}.* {provider}\n    {amount} {ticker} {receiveUsd}  ·  {time}',
  quoteError: '🔄 *تبادل*\n\n{progress}\n\n❌ خطا در دریافت قیمت: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *خلاصه تبادل*\n\n' +
    '*ارسال:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '*دریافت:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '*حداقل دریافت:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '*آدرس مقصد:*\n`{destination}`\n' +
    '*آدرس بازگشت:*\n`{refund}`\n\n' +
    '*ارائه‌دهنده:* {provider}\n' +
    '*زمان تخمینی:* {time}\n\n' +
    'این تبادل را تأیید می‌کنید؟',
  confirmButton: '✅ تأیید',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *تبادل آماده شد!*\n\n' +
    '*ارسال:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '*دریافت:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '*ارسال به:*\n`{inboundAddress}`\n\n' +
    '*ارائه‌دهنده:* {provider}\n' +
    '*زمان تخمینی:* {time}\n' +
    '*انقضا:* {expiration}\n\n' +
    '📱 کد QR را برای ارسال *{sendAmount} {sendAsset}* {sendUsd} اسکن کنید',

  // --- Swap errors ---
  preparingSwap:
    '📋 *خلاصه تبادل*\n\n' +
    '*ارسال:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '*دریافت:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '*حداقل دریافت:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '*آدرس مقصد:*\n`{destination}`\n' +
    '*آدرس بازگشت:*\n`{refund}`\n\n' +
    '*ارائه‌دهنده:* {provider}\n' +
    '*زمان تخمینی:* {time}\n\n' +
    '⏳ در حال آماده‌سازی تبادل...',
  swapFailedNoRoutes: '❌ تبادل ناموفق: مسیری در دسترس نیست.',
  swapNoQr: '❌ تبادل تأیید شد اما کد QR دریافت نشد. لطفاً با پشتیبانی تماس بگیرید.',
  swapConfirmError: '❌ خطا در تأیید تبادل: {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ تبادل لغو شد.',
  sessionExpired: 'نشست منقضی شده است.',
  processingSwap: 'در حال پردازش تبادل...',
  assetNotFound: 'دارایی یافت نشد',
  alreadySelected: 'قبلاً به عنوان دارایی ارسال انتخاب شده',
  openInWallet: '💳 باز کردن در کیف پول',

  // --- Price ---
  priceUnavailable:
    '🔄 *تبادل*\n\n{progress}\n\n⚠️ اطلاعات قیمت برای *{asset}* در دسترس نیست. لطفاً مقدار را به صورت توکن وارد کنید.',

  // --- Bot-level messages ---
  botError: '❌ مشکلی پیش آمد. لطفاً دوباره با /swap تلاش کنید.',
  botCancelReply: '🚫 عملیات فعلی لغو شد.',

  // --- Progress lines ---
  progressSend: '✅ ارسال: *{asset}*',
  progressReceive: '✅ دریافت: *{asset}*',
  progressAmount: '✅ مقدار: *{amount} {asset}* {amountUsd}',
  progressDestination: '✅ مقصد: `{address}`',
  progressRefund: '✅ بازگشت: `{address}`'
}
