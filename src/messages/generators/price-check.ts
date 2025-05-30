import {
  isDateRangeResult,
  isSingleDateResult,
  type IDateRangePriceCheckResult,
  type ISingleDatePriceCheckResult,
  type TPriceCheckResult,
} from '../../modules/price-checker';
import type { ISubscription } from '../../modules/subscription';

function generateSingleDatePriceMessage(
  subscription: ISubscription,
  result: ISingleDatePriceCheckResult,
): string {
  let message = `✅ Проверка цены завершена!\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  message += `📅 Дата: ${subscription.date}\n\n`;

  if (result.flightInfo) {
    message += `✈️ Рейс: ${result.flightInfo.originCode} → ${result.flightInfo.destinationCode}\n\n`;
  }

  message += `💰 Текущая цена: ${result.newPrice} USD\n`;

  if (result.oldPrice !== undefined) {
    message += `💰 Предыдущая цена: ${result.oldPrice} USD\n`;

    if (result.priceChanged) {
      const priceDiff = Math.abs(result.oldPrice - result.newPrice!);
      const percentDiff = Math.round((priceDiff / result.oldPrice) * 100);

      if (result.newPrice! < result.oldPrice) {
        message += `💹 Снижение: ${priceDiff} USD (-${percentDiff}%)\n`;

        if (percentDiff >= 20) {
          message += `\n🔥 Рекомендуем рассмотреть покупку билетов!\n`;
        }
      } else {
        message += `📈 Повышение: ${priceDiff} USD (+${percentDiff}%)\n`;
      }
    } else {
      message += `⏸ Цена не изменилась\n`;
    }
  }

  return message;
}

function generatetDateRangePriceMessage(
  subscription: ISubscription,
  result: IDateRangePriceCheckResult,
): string {
  let message = `✅ Проверка цен завершена!\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n\n`;
  message += `💰 Минимальная цена: ${result.newPrice} USD\n`;

  if (result.oldPrice !== undefined) {
    message += `💰 Предыдущая минимальная цена: ${result.oldPrice} USD\n`;

    if (result.priceChanged) {
      const priceDiff = Math.abs(result.oldPrice - result.newPrice!);
      const percentDiff = Math.round((priceDiff / result.oldPrice) * 100);

      if (result.newPrice! < result.oldPrice) {
        message += `💹 Снижение: ${priceDiff} USD (-${percentDiff}%)\n`;

        if (percentDiff >= 20) {
          message += `\n🔥 Рекомендуем рассмотреть покупку билетов!\n`;
        }
      } else {
        message += `📈 Повышение: ${priceDiff} USD (+${percentDiff}%)\n`;
      }
    } else {
      message += `⏸ Минимальная цена не изменилась\n`;
    }
  }

  if (result.bestDates && result.bestDates.length > 0) {
    message += `\n📅 Лучшие даты:\n`;

    result.bestDates.forEach((item, index) => {
      message += `   ${index + 1}. ${item.date}`;

      if (item.originCode && item.destinationCode) {
        message += ` (${item.originCode} → ${item.destinationCode})`;
      }

      message += `\n`;
    });
  }

  return message;
}

export function generatePriceCheckMessage(
  subscription: ISubscription,
  result: TPriceCheckResult,
): string {
  if (!result.success) {
    return `❌ Ошибка: ${result.message || 'Неизвестная ошибка при проверке цен'}`;
  }

  if (subscription.dateType === 'single' && isSingleDateResult(result)) {
    return generateSingleDatePriceMessage(subscription, result);
  } else if (subscription.dateType === 'range' && isDateRangeResult(result)) {
    return generatetDateRangePriceMessage(subscription, result);
  } else {
    return 'Не удалось сформировать сообщение: некорректный тип подписки или отсутствуют данные';
  }
}
