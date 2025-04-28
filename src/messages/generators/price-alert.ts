import type { ISubscription } from '../../modules/subscription';
import { formatPriceChangeText } from '../utils';

export function generatePriceAlertMessage(
  subscription: ISubscription,
  newPrice: number,
  oldPrice: number,
  flightInfo?: { originCode: string; destinationCode: string },
): string {
  const isDecrease = newPrice < oldPrice;

  let message = isDecrease ? `✅ Снижение цены на билеты!\n\n` : `📈 Изменение цены на билеты!\n\n`;

  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;

  if (subscription.dateType === 'single') {
    message += `📅 Дата: ${subscription.date}\n`;
  } else {
    message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
    if (subscription.bestDate) {
      message += `📅 Лучшая дата: ${subscription.bestDate}\n`;
    }
  }

  if (flightInfo) {
    message += `✈️ Рейс: ${flightInfo.originCode} → ${flightInfo.destinationCode}\n`;
  }

  message += `\n💰 Старая цена: ${oldPrice} USD\n`;
  message += `💰 Новая цена: ${newPrice} USD\n`;

  message += formatPriceChangeText(oldPrice, newPrice);

  return message;
}
