import { CronJob } from "cron";
import { 
  getAllSubscriptions, 
  updateSubscriptionPrice, 
  updateBestDates,
  areBestDatesChanged
} from "./modules/subscription";
import { checkFlightPrice, checkFlightPriceRange } from "./modules/price-checker";
import { sendPriceAlert, sendBestDatesAlert, sendMessage } from "./modules/bot";
import TelegramBot from "node-telegram-bot-api";

export const priceCheckJob = (bot: TelegramBot) => new CronJob(
  process.env.CHECK_INTERVAL || '0 */1 * * *',
  async function() {
    try {
      console.log('Проверка цен по всем подписками...');
      const subscriptions = await getAllSubscriptions();
      
      for (const subscription of subscriptions) {
        try {
          console.log(`Проверка подписки ${subscription.id}: ${subscription.origin} -> ${subscription.destination}`);
          
          if (subscription.dateType === 'single' && subscription.date) {
            await checkSingleDateSubscription(bot, subscription);
          } else if (subscription.dateType === 'range' && subscription.startDate && subscription.endDate) {
            await checkDateRangeSubscription(bot, subscription);
          }
        } catch (error) {
          console.error(`Ошибка при проверке подписки ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке цен:', error);
    }
  },
  null,
  true
);

/**
 * Проверяет цены для подписки с конкретной датой
 * @param bot Экземпляр бота
 * @param subscription Подписка
 */
async function checkSingleDateSubscription(
  bot: TelegramBot,
  subscription: any
) {
  const currentPrice = await checkFlightPrice(
    subscription.origin,
    subscription.destination,
    subscription.date
  );
  
  if (currentPrice) {
    console.log(`Получена цена ${currentPrice} для подписки ${subscription.id}`);
    
    // Если это первая проверка для этой подписки
    if (!subscription.lastPrice) {
      await updateSubscriptionPrice(subscription.id, currentPrice);
      
      // Отправляем уведомление о первой проверке
      let message = `🔍 Первая проверка цены для вашей подписки\n\n`;
      message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
      message += `📅 Дата: ${subscription.date}\n`;
      message += `\n💰 Текущая цена: ${currentPrice} руб.\n`;
      message += `\nВы будете получать уведомления при изменении цены.`;
      
      bot.sendMessage(subscription.chatId, message);
    } 
    // Если цена изменилась и это не первая проверка
    else if (currentPrice !== subscription.lastPrice) {
      console.log(`Цена изменилась с ${subscription.lastPrice} на ${currentPrice}`);
      
      // Отправляем уведомление об изменении цены
      sendPriceAlert(bot, subscription, currentPrice, subscription.lastPrice);
      
      // Обновляем сохраненную цену
      await updateSubscriptionPrice(subscription.id, currentPrice);
    } else {
      console.log(`Цена не изменилась для подписки ${subscription.id}: ${currentPrice} руб.`);
    }
  } else {
    console.log(`Не удалось получить цену для подписки ${subscription.id}`);
  }
}

/**
 * Проверяет цены для подписки с диапазоном дат
 * @param bot Экземпляр бота
 * @param subscription Подписка
 */
async function checkDateRangeSubscription(
  bot: TelegramBot,
  subscription: any
) {
  // Получаем цены в диапазоне дат
  const priceRangeInfo = await checkFlightPriceRange(
    subscription.origin,
    subscription.destination,
    subscription.startDate,
    subscription.endDate
  );
  
  if (priceRangeInfo && priceRangeInfo.bestDates.length > 0) {
    const { bestDates, minPrice } = priceRangeInfo;
    console.log(`Получены лучшие даты для подписки ${subscription.id}, минимальная цена: ${minPrice}`);
    
    // Если это первая проверка для этой подписки
    if (!subscription.lastPrice) {
      await updateBestDates(subscription.id, bestDates, minPrice);
      
      // Отправляем уведомление о первой проверке
      let message = `🔍 Первая проверка цен для вашей подписки\n\n`;
      message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
      message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n\n`;
      message += `💰 Минимальная цена: ${minPrice} руб.\n\n`;
      
      if (bestDates.length === 1) {
        message += `📅 Лучшая дата: ${bestDates[0].date}\n`;
      } else {
        message += `📅 Лучшие даты (${bestDates.length}):\n`;
        bestDates.forEach((item, index) => {
          message += `   ${index + 1}. ${item.date}\n`;
        });
      }
      
      message += `\nВы будете получать уведомления при изменении цен.`;
      
      bot.sendMessage(subscription.chatId, message);
    } 
    // Если изменилась минимальная цена или набор лучших дат
    else if (minPrice !== subscription.lastPrice || areBestDatesChanged(subscription.bestDates, bestDates)) {
      console.log(`Обнаружено изменение лучших дат или цены для подписки ${subscription.id}`);
      
      // Отправляем уведомление об изменении
      sendBestDatesAlert(bot, subscription, bestDates, subscription.lastPrice);
      
      // Обновляем информацию о лучших датах
      await updateBestDates(subscription.id, bestDates, minPrice);
    } else {
      console.log(`Лучшие даты и цены не изменились для подписки ${subscription.id}`);
    }
  } else {
    console.log(`Не удалось получить информацию о ценах для подписки ${subscription.id}`);
  }
}