import type { Strings } from '../strings'

export const ru: Strings = {
  // --- General buttons ---
  back: '⬅️ Назад',
  cancelSwap: '❌ Отменить обмен',

  // --- Search ---
  clearSearch: '🗑️ Очистить поиск',
  searchNoResults: '💱 Обмен\n\n{progress}\n\n⚠️ Активы не найдены. Попробуйте другой запрос.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ Активы ещё недоступны. Списки токенов могут загружаться. Попробуйте позже.',
  selectSendAsset: '💱 Обмен\n\nКакой актив вы хотите отправить?\nВведите код или название монеты для поиска 👇',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset:
    '💱 Обмен\n\n{progress}\n\nКакой актив вы хотите получить?\nВведите код или название монеты для поиска 👇',

  // --- Step 3: Enter amount ---
  enterAmount:
    '💱 Обмен\n\n{progress}\n\n' +
    'Сколько {asset} вы хотите обменять?\n' +
    'Подсказка: добавьте $ для ввода суммы в USD 👇',
  invalidAmount:
    '💱 Обмен\n\n{progress}\n\n' +
    'Сколько {asset} вы хотите обменять?\n' +
    'Подсказка: добавьте $ для ввода суммы в USD 👇\n\n' +
    '⚠️ Неверная сумма — введите положительное число.',

  // --- Step 4: Destination address ---
  enterDestination: '💱 Обмен\n\n{progress}\n\nВведите адрес назначения {asset} 👇',
  invalidDestination:
    '💱 Обмен\n\n{progress}\n\n' + 'Введите адрес назначения {asset} 👇\n\n' + '⚠️ Неверный адрес — {hint}',

  // --- Step 5: Refund address ---
  enterRefund: '💱 Обмен\n\n{progress}\n\nВведите адрес возврата {asset} 👇',
  invalidRefund: '💱 Обмен\n\n{progress}\n\n' + 'Введите адрес возврата {asset} 👇\n\n' + '⚠️ Неверный адрес — {hint}',

  // --- Quotes ---
  fetchingQuotes: '💱 Обмен\n\n{progress}\n\n⏳ Получение котировок...',
  noProviders: '💱 Обмен\n\n{progress}\n\n❌ Нет провайдеров для этой пары.',
  noRoutes: '💱 Обмен\n\n{progress}\n\n❌ Нет доступных маршрутов для этой пары.',
  allProvidersFailed:
    '💱 Обмен\n\n{progress}\n\n❌ Ни один провайдер не смог выполнить обмен. Попробуйте другую сумму или пару.',
  quotesHeader: '💱 Обмен\n\n{progress}\n\n' + '{count} котировок доступно — выберите маршрут 👇\n\n{routes}',
  quoteLine: '{index}. {amount} {ticker} {receiveUsd} • 🕐 {time}',
  quoteError: '💱 Обмен\n\n{progress}\n\n❌ Ошибка получения котировки: {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 Итого по обмену\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Отправка: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Получение: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Мин: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 Назначение: {destination}\n' +
    '↩️ Возврат: {refund}\n' +
    '🔗 Провайдер: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Подтвердить обмен?',
  confirmButton: '✅ Подтвердить',

  // --- Swap confirmed ---
  swapConfirmed:
    '💱 Итого по обмену\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Отправка: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Получение: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Мин: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 Назначение: {destination}\n' +
    '↩️ Возврат: {refund}\n' +
    '🔗 Провайдер: {provider} • {time}\n' +
    '⏳ Предложение истекает через: {expiration}\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Отправьте ровно:\n' +
    '`{sendAmountRaw}` {sendAsset}\n\n' +
    'На адрес:\n' +
    '`{inboundAddress}`' +
    '{warning}' +
    '{links}',

  // --- Swap errors ---
  preparingSwap:
    '📋 Итого по обмену\n' +
    '━━━━━━━━━━━━━━━\n' +
    'Отправка: {sendAmount} {sendAsset} {sendUsd}\n' +
    'Получение: {receiveAmount} {receiveAsset} {receiveUsd}\n' +
    'Мин: {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 Назначение: {destination}\n' +
    '↩️ Возврат: {refund}\n' +
    '🔗 Провайдер: {provider} • {time}\n' +
    '━━━━━━━━━━━━━━━\n' +
    '⏳ Подготовка обмена...',
  swapFailedNoRoutes: '❌ Обмен не удался — нет доступных маршрутов.',
  swapNoQr: '❌ Обмен подтверждён, но QR-код не получен.\nОбратитесь в поддержку.',
  swapConfirmError: '❌ Ошибка обмена: {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ Обмен отменён.',
  sessionExpired: '⚠️ Сессия истекла.',
  processingSwap: '⏳ Обработка...',
  assetNotFound: 'Актив не найден',
  alreadySelected: 'Уже выбран как актив отправки',
  openWalletApp: 'Открыть кошелёк',
  trackSwap: 'Отследить обмен',
  amountWarning: '⚠️ Отправьте точную сумму, чтобы избежать потери средств',
  changeAmount: '💰 Изменить сумму',
  newSwap: '🔄 Новый обмен',

  // --- Price ---
  priceUnavailable:
    '💱 Обмен\n\n{progress}\n\n' + '⚠️ Цена недоступна для {asset}.\n' + 'Пожалуйста, введите сумму в токенах.',

  // --- Bot-level messages ---
  botError: '❌ Что-то пошло не так. Попробуйте снова с /swap.',
  botCancelReply: '🚫 Текущая операция отменена.',

  // --- Progress lines ---
  progressSend: 'Отправка: {asset}',
  progressReceive: 'Получение: {asset}',
  progressAmount: 'Сумма: {amount} {asset} {amountUsd}',
  progressProvider: 'Провайдер: {provider}',
  progressDestination: 'Назначение: {address}',
  progressRefund: 'Возврат: {address}'
}
