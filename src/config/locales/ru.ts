import type { Strings } from '../strings'

export const ru: Strings = {
  // --- General buttons ---
  back: '⬅️ Назад',
  cancelSwap: '❌ Отменить обмен',

  // --- Search ---
  clearSearch: '📋 Очистить поиск',
  searchNoResults: '🔄 *Обмен*\n\n{progress}❌ Активы не найдены. Попробуйте другой запрос.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ Активы ещё недоступны. Списки токенов могут загружаться. Попробуйте позже.',
  selectSendAsset: '🔄 *Обмен*\n\nВыберите актив для *отправки* или введите для поиска:',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *Обмен*\n\n{progress}\n\nВыберите актив для *получения* или введите для поиска:',

  // --- Step 3: Enter amount ---
  enterAmount: '🔄 *Обмен*\n\n{progress}\n\n💰 Введите количество *{asset}* для обмена:',
  invalidAmount:
    '🔄 *Обмен*\n\n{progress}\n\n⚠️ Введите корректное положительное число.\n\n💰 Введите количество *{asset}* для обмена:',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *Обмен*\n\n{progress}\n\n📍 Введите адрес назначения *{asset}*:',
  invalidDestination: '🔄 *Обмен*\n\n{progress}\n\n⚠️ Неверный адрес. {hint}\n\n📍 Введите адрес назначения *{asset}*:',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *Обмен*\n\n{progress}\n\n🔙 Введите адрес возврата *{asset}*:',
  invalidRefund: '🔄 *Обмен*\n\n{progress}\n\n⚠️ Неверный адрес. {hint}\n\n🔙 Введите адрес возврата *{asset}*:',

  // --- Quotes ---
  fetchingQuotes: '🔄 *Обмен*\n\n{progress}\n\n⏳ Получение котировок...',
  noProviders: '🔄 *Обмен*\n\n{progress}\n\n❌ Нет провайдеров для этой пары.',
  noRoutes: '🔄 *Обмен*\n\n{progress}\n\n❌ Нет доступных маршрутов для этой пары.',
  allProvidersFailed:
    '🔄 *Обмен*\n\n{progress}\n\n❌ Ни один провайдер не смог выполнить обмен. Попробуйте другую сумму или пару.',
  quotesHeader: '🔄 *Обмен*\n\n{progress}\n\n📊 *Котировки* ({count}):\n\n{routes}\n\n',
  quoteLine: '*{index}.* {provider}\n    {amount} {ticker}  ·  {time}',
  quoteError: '🔄 *Обмен*\n\n{progress}\n\n❌ Ошибка получения котировки: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *Итого по обмену*\n\n' +
    '*Отправка:* {sendAmount} {sendAsset}\n' +
    '*Получение:* ~{receiveAmount} {receiveAsset}\n' +
    '*Мин. получение:* {minReceive} {receiveAsset}\n\n' +
    '*Адрес назначения:*\n`{destination}`\n' +
    '*Адрес возврата:*\n`{refund}`\n\n' +
    '*Провайдер:* {provider}\n' +
    '*Ожидаемое время:* {time}\n\n' +
    'Подтвердить обмен?',
  confirmButton: '✅ Подтвердить',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *Обмен подготовлен!*\n\n' +
    '*Отправка:* {sendAmount} {sendAsset}\n' +
    '*Получение:* ~{receiveAmount} {receiveAsset}\n' +
    '*Отправить на:*\n`{inboundAddress}`\n\n' +
    '*Провайдер:* {provider}\n' +
    '*Ожидаемое время:* {time}\n' +
    '*Истекает через:* {expiration}\n\n' +
    '📱 Отсканируйте QR для отправки *{sendAmount} {sendAsset}*',

  // --- Swap errors ---
  preparingSwap:
    '📋 *Итого по обмену*\n\n' +
    '*Отправка:* {sendAmount} {sendAsset}\n' +
    '*Получение:* ~{receiveAmount} {receiveAsset}\n' +
    '*Мин. получение:* {minReceive} {receiveAsset}\n\n' +
    '*Адрес назначения:*\n`{destination}`\n' +
    '*Адрес возврата:*\n`{refund}`\n\n' +
    '*Провайдер:* {provider}\n' +
    '*Ожидаемое время:* {time}\n\n' +
    '⏳ Подготовка обмена...',
  swapFailedNoRoutes: '❌ Обмен не удался: нет доступных маршрутов.',
  swapNoQr: '❌ Обмен подтверждён, но QR-код не получен. Обратитесь в поддержку.',
  swapConfirmError: '❌ Ошибка подтверждения обмена: {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ Обмен отменён.',
  sessionExpired: 'Сессия истекла.',
  processingSwap: 'Обработка обмена...',
  assetNotFound: 'Актив не найден',
  alreadySelected: 'Уже выбран как актив отправки',
  openInWallet: '💳 Открыть в кошельке',

  // --- Bot-level messages ---
  botError: '❌ Что-то пошло не так. Попробуйте снова с /swap.',
  botCancelReply: '🚫 Текущая операция отменена.',

  // --- Progress lines ---
  progressSend: '✅ Отправка: *{asset}*',
  progressReceive: '✅ Получение: *{asset}*',
  progressAmount: '✅ Сумма: *{amount} {asset}*',
  progressDestination: '✅ Назначение: `{address}`',
  progressRefund: '✅ Возврат: `{address}`'
}
