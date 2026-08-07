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
  quoteLine: '{index}. {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 تبادل\n\n{progress}\n\n❌ خطا در دریافت قیمت: {error}',

  // --- Receive floor ---
  // `{minLine}` is built in code (see buildMinLine) and carries its own trailing newline,
  // so it collapses to nothing when the route has no floor worth showing.
  minReceiveLine: 'حداقل‌: {amount} {asset} {usd}',
  estimateLine: 'حداقل‌: تضمین‌نشده — مبلغ نهایی هنگام رسیدن واریز شما تعیین می‌شود',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 خلاصه تبادل\n' +
    '━━━━━━━━━━━━━━━\n' +
    'ارسال: {sendAmount} {sendAsset} {sendUsd}\n' +
    'دریافت: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 مقصد: {destination}\n' +
    '↩️ بازگشت: {refund}\n' +
    '🔗 ارائه‌دهنده: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'این تبادل را تأیید می‌کنید؟',
  confirmButton: '✅ تأیید',

  // --- Swap confirmed ---
  swapConfirmed:
    '💱 خلاصه تبادل\n' +
    '━━━━━━━━━━━━━━━\n' +
    'ارسال: {sendAmount} {sendAsset} {sendUsd}\n' +
    'دریافت: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 مقصد: {destination}\n' +
    '↩️ بازگشت: {refund}\n' +
    '🔗 ارائه‌دهنده: {provider} • {time}\n' +
    '⏳ انقضای پیشنهاد: {expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'دقیقاً ارسال کنید:\n' +
    '`{sendAmountRaw}` {sendAsset}\n\n' +
    'به آدرس:\n' +
    '`{inboundAddress}`' +
    '{attachment}' +
    '{warning}' +
    '{links}',
  depositAttachment: '\n\n⚠️ {label} — الزامی است، بدون آن وجه از دست می‌رود:\n`{value}`',
  attachmentTag: 'Destination tag',
  attachmentMemo: 'Memo',

  // --- Swap errors ---
  preparingSwap:
    '📋 خلاصه تبادل\n' +
    '━━━━━━━━━━━━━━━\n' +
    'ارسال: {sendAmount} {sendAsset} {sendUsd}\n' +
    'دریافت: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '{minLine}\n' +
    '📍 مقصد: {destination}\n' +
    '↩️ بازگشت: {refund}\n' +
    '🔗 ارائه‌دهنده: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ در حال آماده‌سازی تبادل...',
  swapFailedNoRoutes: '❌ تبادل ناموفق — مسیری در دسترس نیست.',
  swapNoQr: '❌ تبادل تأیید شد اما دستورالعمل واریز دریافت نشد.\nلطفاً با پشتیبانی تماس بگیرید.',
  swapConfirmError: '❌ خطای تبادل: {error}',
  amlBlocked:
    '⛔ این تبادل قابل انجام نیست — آدرس {address} توسط ارائه‌دهنده انطباق شخص ثالث (Elliptic) پرخطر شناسایی شده است. لطفاً با آدرس دیگری یک تبادل جدید آغاز کنید.',

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
  progressRefund: 'بازگشت: {address}',

  // --- FAQ ---
  faq:
    '❓ *FAQ*\n\n' +
    '*این ربات چیست؟*\n\n' +
    'ربات تبادل رمزارز در تلگرام.\n\n' +
    'انتخاب کنید چه چیزی می‌خواهید ارسال و دریافت کنید، قیمت‌ها را از ارائه‌دهندگان مختلف مقایسه کنید و تبادل را بدون اتصال کیف پول انجام دهید.\n\n' +
    '*کدام ارائه‌دهندگان پشتیبانی می‌شوند؟*\n\n' +
    'ربات هم ارائه‌دهندگان غیرمتمرکز و هم متمرکز را تجمیع می‌کند. ارائه‌دهندگان موجود به جفت دارایی بستگی دارد.\n\n' +
    '*آیا ارائه‌دهندگان می‌توانند دارایی‌ها را مسدود کنند؟*\n\n' +
    'بستگی به نوع ارائه‌دهنده دارد.\n\n' +
    'پروتکل‌های DEX نمی‌توانند وجوه را مسدود کنند. تبادل یا اجرا می‌شود یا ناموفق است (وجوه به طور خودکار بازگردانده می‌شود).\n\n' +
    'ارائه‌دهندگان با نقدینگی خصوصی با ذخایر خود عمل می‌کنند. مسدودسازی بسیار بعید است اما ریسک طرف مقابل وجود دارد.\n\n' +
    'اکثر منابعی که با نقدینگی شخص ثالث کار می‌کنند سیاست‌های AML دارند. در بیشتر موارد تبادل‌ها رد و وجوه بازگردانده می‌شوند اگر مشکلات AML شناسایی شود. در موارد نادر ارائه‌دهنده ممکن است قبل از آزادسازی وجوه درخواست KYC کند.\n\n' +
    'سطح ریسک در کنار هر ارائه‌دهنده قبل از انتخاب نمایش داده می‌شود.\n\n' +
    '*آیا وجوه من را نگه می‌دارید؟*\n\n' +
    'خیر. Unstoppable Swap Bot هرگز وجوه را نگهداری نمی‌کند. تبادل‌ها مستقیماً توسط ارائه‌دهندگان شخص ثالث اجرا می‌شوند.\n\n' +
    'ربات فقط قیمت‌ها را درخواست، گزینه‌ها را نمایش و دستورالعمل‌های تراکنش را ارائه می‌دهد. وجوه مستقیماً بین شما و ارائه‌دهنده جابجا می‌شوند.\n\n' +
    '*آدرس بازگشت چیست؟*\n\n' +
    'آدرسی که در صورت عدم موفقیت تبادل، وجوه به آن بازگردانده می‌شوند. برخی ارائه‌دهندگان آن را به عنوان اقدام امنیتی نیاز دارند.\n\n' +
    'تبادل‌های THORChain DEX به آدرس بازگشت نیاز ندارند.\n\n' +
    '*«مبلغ دقیق ارسال کنید» یعنی چه؟*\n\n' +
    'برخی ارائه‌دهندگان (به‌ویژه THORChain) مبلغ دقیق نشان‌داده‌شده را نیاز دارند. ارسال بیشتر یا کمتر ممکن است منجر به: عدم موفقیت تبادل، تأخیر یا از دست رفتن وجوه شود. همیشه مبلغ دقیق نمایش‌داده‌شده را ارسال کنید.\n\n' +
    '*چگونه تبادل خود را پیگیری کنم؟*\n\n' +
    'پس از تأیید، ربات لینک پیگیری تبادل را ارائه می‌دهد. می‌توانید پیشرفت تبادل و وضعیت اجرا را بررسی کنید.\n\n' +
    '*آیا می‌توانم تبادل را لغو کنم؟*\n\n' +
    'قبل از مرحله تأیید هر زمان می‌توانید لغو کنید. پس از ارسال وجوه به آدرس واریز، تبادل از طریق ربات قابل بازگشت نیست.'
}
