import type { IDatePriceInfo } from '../../modules/price-checker';
import type { ISubscription } from '../../modules/subscription';
import { formatPriceChangeText } from '../utils';

export function generateBestDatesAlertMessage(
  subscription: ISubscription,
  bestDates: IDatePriceInfo[],
  oldPrice?: number,
  includeRouteInfo: boolean = true,
): string {
  const newPrice = bestDates[0].price;
  const priceChanged = oldPrice !== undefined && oldPrice !== newPrice;

  let title;
  if (priceChanged) {
    title = newPrice < oldPrice ? `✅ Снижение цены на билеты!` : `📈 Изменение цены на билеты!`;
  } else {
    title = `📅 Обновление лучших дат для поездки!`;
  }

  let message = `${title}\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n\n`;

  message += `💰 ${priceChanged ? 'Новая минимальная цена' : 'Минимальная цена'}: ${newPrice} USD\n`;

  if (priceChanged && oldPrice !== undefined) {
    message += `💰 Предыдущая минимальная цена: ${oldPrice} USD\n`;
    message += formatPriceChangeText(oldPrice, newPrice) + '\n';
  }

  if (bestDates.length === 1) {
    message += `\n📅 Лучшая дата: ${bestDates[0].date}`;

    if (includeRouteInfo && bestDates[0].originCode && bestDates[0].destinationCode) {
      message += ` (${bestDates[0].originCode} → ${bestDates[0].destinationCode})`;
    }

    message += `\n`;
  } else {
    message += `\n📅 Лучшие даты (${bestDates.length}):\n`;

    bestDates.forEach((item, index) => {
      message += `   ${index + 1}. ${item.date}`;

      if (includeRouteInfo && item.originCode && item.destinationCode) {
        message += ` (${item.originCode} → ${item.destinationCode})`;
      }

      message += `\n`;
    });
  }

  return message;
}
