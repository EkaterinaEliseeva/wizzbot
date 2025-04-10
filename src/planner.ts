import { CronJob } from "cron";
import { getAllSubscriptions } from "./modules/subscription";
import { 
  checkSubscriptionPrice, 
  isSingleDateResult,
  isDateRangeResult 
} from "./modules/price-checker";
import { sendPriceAlert, sendBestDatesAlert } from "./modules/bot";
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
          
          // Проверяем цену
          const result = await checkSubscriptionPrice(subscription);
          
          if (result.success) {
            console.log(`Успешно проверена цена для подписки ${subscription.id}`);
            
            // Используем type guards для определения типа результата
            if (isSingleDateResult(result) && result.priceChanged) {
              // Для конкретной даты
              console.log(`Цена изменилась: ${result.oldPrice} -> ${result.newPrice}`);
              sendPriceAlert(bot, subscription, result.newPrice!, result.oldPrice!);
            } else if (isDateRangeResult(result) && (result.priceChanged || result.datesChanged)) {
              // Для диапазона дат
              if (result.priceChanged) {
                console.log(`Минимальная цена изменилась: ${result.oldPrice} -> ${result.newPrice}`);
              }
              if (result.datesChanged) {
                console.log(`Изменился список лучших дат`);
              }
              sendBestDatesAlert(bot, subscription, result.bestDates!, result.oldPrice);
            } else {
              console.log(`Изменений нет, уведомления не отправляются`);
            }
          } else {
            console.error(`Не удалось проверить цену для подписки ${subscription.id}: ${result.message}`);
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