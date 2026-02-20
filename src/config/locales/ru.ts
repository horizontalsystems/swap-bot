import type { Strings } from '../strings'

export const ru: Strings = {
  // --- General buttons ---
  back: '⬅️ Назад',
  cancelSwap: '❌ Отменить обмен',

  // --- Search ---
  clearSearch: '📋 Очистить поиск',
  searchNoResults: '🔄 *Обмен*\n\n{progress}\n\n❌ Активы не найдены. Попробуйте другой запрос.',

  // --- Step 0: Select send asset ---
  noAssetsAvailable: '⚠️ Активы ещё недоступны. Списки токенов могут загружаться. Попробуйте позже.',
  selectSendAsset: '🔄 *Обмен*\n\nВыберите актив для *отправки* или введите для поиска:',

  // --- Step 1: Select receive asset ---
  selectReceiveAsset: '🔄 *Обмен*\n\n{progress}\n\nВыберите актив для *получения* или введите для поиска:',

  // --- Step 3: Enter amount ---
  enterAmount:
    '🔄 *Обмен*\n\n{progress}\n\n' +
    '💰 Введите количество *{asset}* для обмена:\n' +
    '_Подсказка: введите_ `$100` _для суммы в USD_',
  invalidAmount:
    '🔄 *Обмен*\n\n{progress}\n\n' +
    '⚠️ *Неверная сумма.* Введите положительное число.\n\n' +
    '💰 Введите количество *{asset}* для обмена:\n' +
    '_Подсказка: введите_ `$100` _для суммы в USD_',

  // --- Step 4: Destination address ---
  enterDestination: '🔄 *Обмен*\n\n{progress}\n\n📍 Введите адрес _назначения_ *{asset}*:',
  invalidDestination:
    '🔄 *Обмен*\n\n{progress}\n\n' + '⚠️ *Неверный адрес.* {hint}\n\n' + '📍 Введите адрес _назначения_ *{asset}*:',

  // --- Step 5: Refund address ---
  enterRefund: '🔄 *Обмен*\n\n{progress}\n\n🔙 Введите адрес _возврата_ *{asset}*:',
  invalidRefund:
    '🔄 *Обмен*\n\n{progress}\n\n' + '⚠️ *Неверный адрес.* {hint}\n\n' + '🔙 Введите адрес _возврата_ *{asset}*:',

  // --- Quotes ---
  fetchingQuotes: '🔄 *Обмен*\n\n{progress}\n\n⏳ _Получение котировок..._',
  noProviders: '🔄 *Обмен*\n\n{progress}\n\n❌ Нет провайдеров для этой пары.',
  noRoutes: '🔄 *Обмен*\n\n{progress}\n\n❌ Нет доступных маршрутов для этой пары.',
  allProvidersFailed:
    '🔄 *Обмен*\n\n{progress}\n\n❌ Ни один провайдер не смог выполнить обмен. Попробуйте другую сумму или пару.',
  quotesHeader:
    '🔄 *Обмен*\n\n{progress}\n\n' + '📊 *{count} Котировок доступно:*\n\n{routes}\n\n' + '_Выберите маршрут ниже:_',
  quoteLine: '*{index}.* {provider}\n      _{amount} {ticker}_ {receiveUsd}  ·  🕐 {time}',
  quoteError: '🔄 *Обмен*\n\n{progress}\n\n❌ *Ошибка получения котировки:* {error}',

  // --- Swap summary (confirm screen) ---
  swapSummary:
    '📋 *Итого по обмену*\n\n' +
    '📤 *Отправка:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *Получение:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *Мин. получение:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *Адрес назначения:*\n`{destination}`\n' +
    '🔙 *Адрес возврата:*\n`{refund}`\n\n' +
    '🏷 *Провайдер:* {provider}\n' +
    '🕐 *Ожид. время:* {time}\n\n' +
    '_Подтвердить обмен?_',
  confirmButton: '✅ Подтвердить',

  // --- Swap confirmed ---
  swapConfirmed:
    '✅ *Обмен подготовлен!*\n\n' +
    '📤 *Отправка:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *Получение:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n\n' +
    '📍 *Отправить на:*\n`{inboundAddress}`\n\n' +
    '🏷 *Провайдер:* {provider}\n' +
    '🕐 *Ожид. время:* {time}\n' +
    '⏳ *Истекает через:* {expiration}\n\n' +
    '📱 Отсканируйте QR для отправки *{sendAmount} {sendAsset}* {sendUsd}',

  // --- Swap errors ---
  preparingSwap:
    '📋 *Итого по обмену*\n\n' +
    '📤 *Отправка:* {sendAmount} {sendAsset} {sendUsd}\n' +
    '📥 *Получение:* ~{receiveAmount} {receiveAsset} {receiveUsd}\n' +
    '🛡 *Мин. получение:* {minReceive} {receiveAsset} {minReceiveUsd}\n\n' +
    '📍 *Адрес назначения:*\n`{destination}`\n' +
    '🔙 *Адрес возврата:*\n`{refund}`\n\n' +
    '🏷 *Провайдер:* {provider}\n' +
    '🕐 *Ожид. время:* {time}\n\n' +
    '⏳ _Подготовка обмена..._',
  swapFailedNoRoutes: '❌ *Обмен не удался* — нет доступных маршрутов.',
  swapNoQr: '❌ *Обмен подтверждён*, но QR-код не получен.\nОбратитесь в поддержку.',
  swapConfirmError: '❌ *Ошибка обмена:* {error}',

  // --- Cancel / misc ---
  swapCancelled: '❌ Обмен отменён.',
  sessionExpired: '⚠️ Сессия истекла.',
  processingSwap: '⏳ Обработка...',
  assetNotFound: 'Актив не найден',
  alreadySelected: 'Уже выбран как актив отправки',
  openInWallet: '💳 Открыть в кошельке',

  // --- Price ---
  priceUnavailable:
    '🔄 *Обмен*\n\n{progress}\n\n' + '⚠️ *Цена недоступна* для *{asset}*.\n' + '_Пожалуйста, введите сумму в токенах._',

  // --- Bot-level messages ---
  botError: '❌ Что-то пошло не так. Попробуйте снова с /swap.',
  botCancelReply: '🚫 Текущая операция отменена.',

  // --- Progress lines ---
  progressSend: '📤 Отправка: *{asset}*',
  progressReceive: '📥 Получение: *{asset}*',
  progressAmount: '🔢 Сумма: *{amount} {asset}* {amountUsd}',
  progressDestination: '📍 Назначение: `{address}`',
  progressRefund: '🔙 Возврат: `{address}`'
}
