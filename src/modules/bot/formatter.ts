import { ISubscription } from "../subscription";
import { formatPriceChangeText } from "../price-checker";
import { IDatePriceInfo } from "../price-checker";

/**
 * Формирует сообщение уведомления о снижении/повышении цены для конкретной даты
 * @param subscription Подписка
 * @param newPrice Новая цена
 * @param oldPrice Старая цена
 * @param flightInfo Информация о рейсе (если доступна)
 * @returns Текст уведомления
 */
export function formatPriceAlertMessage(
  subscription: ISubscription,
  newPrice: number,
  oldPrice: number,
  flightInfo?: { originCode: string; destinationCode: string }
): string {
  const isDecrease = newPrice < oldPrice;
  
  let message = isDecrease 
    ? `✅ Снижение цены на билеты!\n\n`
    : `📈 Изменение цены на билеты!\n\n`;
    
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

/**
 * Формирует сообщение уведомления об изменении лучших дат
 * @param subscription Подписка
 * @param bestDates Массив лучших дат с ценами
 * @param oldPrice Предыдущая цена (если есть)
 * @param includeRouteInfo Включать ли информацию о маршруте
 * @returns Текст уведомления
 */
export function formatBestDatesAlertMessage(
  subscription: ISubscription,
  bestDates: IDatePriceInfo[],
  oldPrice?: number,
  includeRouteInfo: boolean = true
): string {
  const newPrice = bestDates[0].price;
  const priceChanged = oldPrice !== undefined && oldPrice !== newPrice;
  
  let title;
  if (priceChanged) {
    title = newPrice < oldPrice!
      ? `✅ Снижение цены на билеты!`
      : `📈 Изменение цены на билеты!`;
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
    
    // Показываем максимум 5 дат
    const displayDates = bestDates.slice(0, 5);
    displayDates.forEach((item, index) => {
      message += `   ${index + 1}. ${item.date}`;
      
      if (includeRouteInfo && item.originCode && item.destinationCode) {
        message += ` (${item.originCode} → ${item.destinationCode})`;
      }
      
      message += `\n`;
    });
    
    if (bestDates.length > 5) {
      message += `   ... и ещё ${bestDates.length - 5} дат\n`;
    }
  }
  
  return message;
}

/**
 * Формирует сообщение с результатами первой проверки цены
 * @param subscription Подписка
 * @param price Цена
 * @param bestDates Лучшие даты (для диапазона дат)
 * @returns Текст сообщения
 */
export function formatFirstCheckMessage(
  subscription: ISubscription,
  price: number,
  bestDates?: IDatePriceInfo[]
): string {
  let message = `🔍 Первая проверка цены для вашей подписки\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  
  if (subscription.dateType === 'single') {
    message += `📅 Дата: ${subscription.date}\n`;
  } else {
    message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
    
    if (bestDates && bestDates.length > 0) {
      if (bestDates.length === 1) {
        message += `📅 Лучшая дата: ${bestDates[0].date}`;
        
        if (bestDates[0].originCode && bestDates[0].destinationCode) {
          message += ` (${bestDates[0].originCode} → ${bestDates[0].destinationCode})`;
        }
        
        message += `\n`;
      } else {
        message += `📅 Лучшие даты:\n`;
        
        // Показываем максимум 3 даты для первого сообщения
        const displayDates = bestDates.slice(0, 3);
        displayDates.forEach((item, index) => {
          message += `   ${index + 1}. ${item.date}`;
          
          if (item.originCode && item.destinationCode) {
            message += ` (${item.originCode} → ${item.destinationCode})`;
          }
          
          message += `\n`;
        });
        
        if (bestDates.length > 3) {
          message += `   ... и ещё ${bestDates.length - 3}\n`;
        }
      }
    }
  }
  
  message += `\n💰 Текущая цена: ${price} USD\n`;
  message += `\nВы будете получать уведомления при изменении цены.`;
  
  return message;
}