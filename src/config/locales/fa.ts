import type { Strings } from '../strings'

export const fa: Strings = {
  // --- General buttons ---
  back: '⬅️ بازگشت',
  cancelSwap: '❌ لغو تبادل',

  // --- Search ---
  clearSearch: '🗑️ پاک کردن جستجو',
  searchNoResults: '💱 تبادل\n\n{progress}\n\n⚠️ دارایی یافت نشد. عبارت دیگری را امتحان کنید.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ هنوز دارایی در دسترس نیست. لیست توکن‌ها ممکن است در حال بارگذاری باشد. لطفاً بعداً تلاش کنید.',
  selectSendAsset: '💱 تبادل\n\nکدام دارایی را می‌خواهید ارسال کنید?\nکد یا نام ارز را برای جستجو وارد کنید 👇',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset:
    '💱 تبادل\n\n{progress}\n\nکدام دارایی را می‌خواهید دریافت کنید?\nکد یا نام ارز را برای جستجو وارد کنید 👇',

  // --- Step 3: Enter amount ---
  enterAmount:
    '💱 تبادل\n\n{progress}\n\n' +
    'چقدر {asset} می‌خواهید تبادل کنید?\n' +
    'راهنما: از علامت $ برای وارد کردن مبلغ دلاری استفاده کنید 👇',
  invalidAmount:
    '💱 تبادل\n\n{progress}\n\n' +
    'چقدر {asset} می‌خواهید تبادل کنید?\n' +
    'راهنما: از علامت $ برای وارد کردن مبلغ دلاری استفاده کنید 👇\n\n' +
    '⚠️ مقدار نامعتبر — لطفاً یک عدد مثبت وارد کنید.',

  // --- Step 4: Destination address ---
  enterDestination: '💱 تبادل\n\n{progress}\n\nآدرس مقصد {asset} را وارد کنید 👇',
  invalidDestination:
    '💱 تبادل\n\n{progress}\n\n' + 'آدرس مقصد {asset} را وارد کنید 👇\n\n' + '⚠️ آدرس نامعتبر — {hint}',

  // --- Step 5: Refund address ---
  enterRefund: '💱 تبادل\n\n{progress}\n\nآدرس بازگشت {asset} را وارد کنید 👇',
  invalidRefund: '💱 تبادل\n\n{progress}\n\n' + 'آدرس بازگشت {asset} را وارد کنید 👇\n\n' + '⚠️ آدرس نامعتبر — {hint}',

  // --- Quotes ---
  fetchingQuotes: '💱 تبادل\n\n{progress}\n\n⏳ در حال دریافت قیمت‌ها...',
  noProviders: '💱 تبادل\n\n{progress}\n\n❌ هیچ ارائه‌دهنده‌ای از این جفت پشتیبانی نمی‌کند.',
  noRoutes: '💱 تبادل\n\n{progress}\n\n❌ مسیر تبادلی برای این جفت موجود نیست.',
  allProvidersFailed:
    '💱 تبادل\n\n{progress}\n\n❌ هیچ ارائه‌دهنده‌ای نتوانست این تبادل را انجام دهد. مبلغ یا جفت دیگری را امتحان کنید.',
  quotesHeader: '💱 تبادل\n\n{progress}\n\n' + '{count} قیمت موجود — یک مسیر انتخاب کنید 👇\n\n{routes}',
  quoteLine: '{index}. {provider} — {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 تبادل\n\n{progress}\n\n❌ خطا در دریافت قیمت: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 خلاصه تبادل\n' +
    '━━━━━━━━━━━━━━━\n' +
    'ارسال: {sendAmount} {sendAsset} {sendUsd}\n' +
    'دریافت: ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'حداقل‌: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 مقصد: {destination}\n' +
    '↩️ بازگشت: {refund}\n' +
    '🔗 ارائه‌دهنده: {provider} • ~{time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'این تبادل را تأیید می‌کنید؟',
  confirmButton: '✅ تأیید',

  // --- Swap confirmed ---
  swapConfirmed:
    '💱 خلاصه تبادل\n' +
    '━━━━━━━━━━━━━━━\n' +
    'ارسال: {sendAmount} {sendAsset} {sendUsd}\n' +
    'دریافت: ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'حداقل‌: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 مقصد: {destination}\n' +
    '↩️ بازگشت: {refund}\n' +
    '🔗 ارائه‌دهنده: {provider} • ~{time}\n' +
    '⏳ انقضای پیشنهاد: {expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'دقیقاً ارسال کنید:\n' +
    '`{sendAmount}` {sendAsset}\n\n' +
    'به آدرس:\n' +
    '`{inboundAddress}`' +
    '{warning}' +
    '{links}',

  // --- Swap errors ---
  preparingSwap:
    '📋 خلاصه تبادل\n' +
    '━━━━━━━━━━━━━━━\n' +
    'ارسال: {sendAmount} {sendAsset} {sendUsd}\n' +
    'دریافت: ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'حداقل‌: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 مقصد: {destination}\n' +
    '↩️ بازگشت: {refund}\n' +
    '🔗 ارائه‌دهنده: {provider} • ~{time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ در حال آماده‌سازی تبادل...',
  swapFailedNoRoutes: '❌ تبادل ناموفق — مسیری در دسترس نیست.',
  swapNoQr: '❌ تبادل تأیید شد اما کد QR دریافت نشد.\nلطفاً با پشتیبانی تماس بگیرید.',
  swapConfirmError: '❌ خطای تبادل: {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ تبادل لغو شد.',
  sessionExpired: '⚠️ نشست منقضی شده است.',
  processingSwap: '⏳ در حال پردازش...',
  assetNotFound: 'دارایی یافت نشد',
  alreadySelected: 'قبلاً به عنوان دارایی ارسال انتخاب شده',
  openWalletApp: 'باز کردن کیف پول',
  trackSwap: 'پیگیری تبادل',
  amountWarning: '⚠️ مبلغ دقیق را ارسال کنید تا از دست رفتن وجوه جلوگیری شود',
  changeAmount: '💰 تغییر مبلغ',
  newSwap: '🔄 تبادل جدید',

  // --- Price ---
  priceUnavailable:
    '💱 تبادل\n\n{progress}\n\n' + '⚠️ قیمت در دسترس نیست برای {asset}.\n' + 'لطفاً مقدار را به صورت توکن وارد کنید.',

  // --- Bot-level messages ---
  botError: '❌ مشکلی پیش آمد. لطفاً دوباره با /swap تلاش کنید.',
  botCancelReply: '🚫 عملیات فعلی لغو شد.',

  // --- Progress lines ---
  progressSend: 'ارسال: {asset}',
  progressReceive: 'دریافت: {asset}',
  progressAmount: 'مقدار: {amount} {asset} {amountUsd}',
  progressProvider: 'ارائه‌دهنده: {provider}',
  progressDestination: 'مقصد: {address}',
  progressRefund: 'بازگشت: {address}'
}
