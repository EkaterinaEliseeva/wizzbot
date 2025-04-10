// src/modules/price-checker/utils.ts

import { ISubscription } from "../subscription/types";import { TPriceCheckResult } from "./types";
;

/**
 * Вычисляет процентное изменение цены
 * @param oldPrice Старая цена
 * @param newPrice Новая цена
 * @returns Объект с информацией об изменении цены
 */
export function calculatePriceChange(oldPrice: number, newPrice: number): {
  diff: number;
  percentDiff: number;
  isDecrease: boolean;
  isSignificant: boolean;
} {
  const diff = Math.abs(oldPrice - newPrice);
  const percentDiff = Math.round(diff / oldPrice * 100);
  const isDecrease = newPrice < oldPrice;
  const isSignificant = percentDiff >= 20;
  
  return {
    diff,
    percentDiff,
    isDecrease,
    isSignificant
  };
}

/**
 * Генерирует текст о изменении цены
 * @param oldPrice Старая цена
 * @param newPrice Новая цена
 * @returns Текст для отображения пользователю
 */
export function formatPriceChangeText(oldPrice: number, newPrice: number): string {
  const { diff, percentDiff, isDecrease, isSignificant } = calculatePriceChange(oldPrice, newPrice);
  
  let message = '';
  
  if (isDecrease) {
    if (isSignificant) {
      message += `💹 Значительное снижение: ${diff} USD (-${percentDiff}%)! 🔥\n`;
      message += `\nРекомендуем рассмотреть покупку билетов!`;
    } else {
      message += `💹 Снижение: ${diff} USD (-${percentDiff}%)\n`;
    }
  } else {
    if (isSignificant) {
      message += `📈 Значительное повышение: ${diff} USD (+${percentDiff}%) ⚠️\n`;
    } else {
      message += `📈 Повышение: ${diff} USD (+${percentDiff}%)\n`;
    }
  }
  
  return message;
}

/**
 * Создает детальное сообщение с информацией о проверке цены
 * @param subscription Подписка
 * @param result Результат проверки цены
 * @param includeRouteInfo Включать ли информацию о маршруте (аэропортах)
 * @returns Форматированное сообщение
 */
export function createPriceCheckDetailMessage(
  subscription: ISubscription,
  result: TPriceCheckResult,
  includeRouteInfo: boolean = true
): string | null {
  if (!result.success) {
    return null;
  }
  
  let message = '';
  
  // Добавляем общую информацию о маршруте
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  
  // Добавляем информацию о дате или периоде
  if (subscription.dateType === 'single') {
    message += `📅 Дата: ${subscription.date}\n`;
  } else {
    message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
  }
  
  // Добавляем цены
  if ('newPrice' in result && result.newPrice !== undefined) {
    message += `💰 Текущая цена: ${result.newPrice} USD\n`;
    
    if ('oldPrice' in result && result.oldPrice !== undefined) {
      message += `💰 Предыдущая цена: ${result.oldPrice} USD\n`;
      
      if (result.priceChanged) {
        message += formatPriceChangeText(result.oldPrice, result.newPrice);
      }
    }
  }
  
  // Добавляем информацию о конкретном рейсе для одиночной даты
  if ('flightInfo' in result && result.flightInfo && includeRouteInfo) {
    message += `\n✈️ Рейс: ${result.flightInfo.originCode} → ${result.flightInfo.destinationCode}\n`;
  }
  
  // Добавляем информацию о лучших датах для диапазона дат
  if ('bestDates' in result && result.bestDates && result.bestDates.length > 0) {
    if (result.bestDates.length === 1) {
      message += `\n📅 Лучшая дата: ${result.bestDates[0].date}`;
      
      // Добавляем информацию о конкретном рейсе
      if (includeRouteInfo && result.bestDates[0].originCode && result.bestDates[0].destinationCode) {
        message += ` (${result.bestDates[0].originCode} → ${result.bestDates[0].destinationCode})`;
      }
      
      message += `\n`;
    } else {
      message += `\n📅 Лучшие даты:\n`;
      
      result.bestDates.forEach((item, index) => {
        message += `   ${index + 1}. ${item.date}`;
        
        // Добавляем информацию о конкретном рейсе
        if (includeRouteInfo && item.originCode && item.destinationCode) {
          message += ` (${item.originCode} → ${item.destinationCode})`;
        }
        
        message += `\n`;
      });
    }
  }
  
  return message;
}