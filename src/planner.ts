import { CronJob } from "cron";
import { getAllSubscriptions, updateSubscriptionDetails, updateSubscriptionPrice } from "./modules/subscription";
import { checkFlightPrice } from "./modules/price-checker";
import { sendPriceAlert } from "./modules/bot";
import TelegramBot from "node-telegram-bot-api";

export const priceCheckJob =  (bot: TelegramBot) => new CronJob(
    process.env.CHECK_INTERVAL || '0 */1 * * *', // Проверка раз в час по умолчанию
    async function() {
      try {
        console.log('Проверка цен по всем подписками...');
        const subscriptions = await getAllSubscriptions();
        
        for (const subscription of subscriptions) {
          try {
            console.log(`Проверка подписки ${subscription.id}: ${subscription.origin} -> ${subscription.destination}`);
            let currentPrice: number | null = null;
            let bestDate: string | undefined = undefined;
            
            // Проверяем цену в зависимости от типа подписки
            if (subscription.dateType === 'single' && subscription.date) {
              // Для конкретной даты
              currentPrice = await checkFlightPrice(
                subscription.origin,
                subscription.destination,
                subscription.date
              );
            } else if (subscription.dateType === 'range' && subscription.startDate && subscription.endDate) {
              // Для диапазона дат пока просто берем сохраненную лучшую дату или начальную дату диапазона
              const dateToCheck = subscription.bestDate || subscription.startDate;
              currentPrice = await checkFlightPrice(
                subscription.origin,
                subscription.destination,
                dateToCheck
              );
              bestDate = subscription.bestDate || subscription.startDate;
            }
            
            if (currentPrice) {
              console.log(`Получена цена ${currentPrice} для подписки ${subscription.id}`);
              
              // Если это первая проверка для этой подписки
              if (!subscription.lastPrice) {
                // Обновляем информацию о первой проверке
                if (bestDate && subscription.dateType === 'range') {
                  await updateSubscriptionDetails(subscription.id, {
                    lastPrice: currentPrice,
                    bestDate: bestDate
                  });
                } else {
                  await updateSubscriptionPrice(subscription.id, currentPrice);
                }
                
                // Отправляем уведомление о первой проверке
                let message = `🔍 Первая проверка цены для вашей подписки\n\n`;
                message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
                
                if (subscription.dateType === 'single') {
                  message += `📅 Дата: ${subscription.date}\n`;
                } else {
                  message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
                  if (bestDate) {
                    message += `📅 Лучшая дата: ${bestDate}\n`;
                  }
                }
                
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
                if (bestDate && subscription.dateType === 'range') {
                  await updateSubscriptionDetails(subscription.id, {
                    lastPrice: currentPrice,
                    bestDate: bestDate
                  });
                } else {
                  await updateSubscriptionPrice(subscription.id, currentPrice);
                }
              } 
              // Если цена не изменилась, но изменилась лучшая дата (для диапазона)
              else if (bestDate && subscription.dateType === 'range' && bestDate !== subscription.bestDate) {
                // Отправляем уведомление о новой лучшей дате
                let message = `📅 Обновление лучшей даты для поездки!\n\n`;
                message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
                message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
                message += `📅 Новая лучшая дата: ${bestDate}\n`;
                message += `\n💰 Цена: ${currentPrice} руб.\n`;
                
                bot.sendMessage(subscription.chatId, message);
                
                // Обновляем лучшую дату
                await updateSubscriptionDetails(subscription.id, {
                  lastPrice: currentPrice,
                  bestDate: bestDate
                });
              } else {
                console.log(`Цена не изменилась для подписки ${subscription.id}: ${currentPrice} руб.`);
              }
            } else {
              console.log(`Не удалось получить цену для подписки ${subscription.id}`);
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