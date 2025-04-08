import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { CronJob } from 'cron';
import { initBot, setupCallbackQueryHandlers, sendPriceAlert } from './bot';
import { checkFlightPrice } from './priceChecker';
import { getAllSubscriptions, updateSubscriptionPrice } from './subscription';

// Загружаем переменные окружения
dotenv.config();

// Проверка наличия обязательных переменных окружения
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN не задан в .env файле');
}

// Инициализация Express сервера
const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация Telegram бота
const bot = initBot(process.env.TELEGRAM_BOT_TOKEN);
setupCallbackQueryHandlers(bot);

// Настройка запланированной проверки цен для всех подписок
const priceCheckJob = new CronJob(
  process.env.CHECK_INTERVAL || '0 */1 * * *', // Проверка раз в час по умолчанию
  async function() {
    try {
      console.log('Проверка цен по всем подписками...');
      const subscriptions = await getAllSubscriptions();
      
      for (const subscription of subscriptions) {
        try {
          // Проверяем цену для конкретной подписки
          // В реальном приложении здесь будет поиск по параметрам подписки
          const currentPrice = await checkFlightPrice(
            subscription.origin,
            subscription.destination,
            subscription.dateType === 'single' ? subscription.date : subscription.startDate
          );
          
          if (currentPrice) {
            // Если это первая проверка для этой подписки
            if (!subscription.lastPrice) {
              await updateSubscriptionPrice(subscription.id, currentPrice);
              console.log(`Первая проверка для подписки ${subscription.id}: ${currentPrice} руб.`);
              continue;
            }
            
            // Если цена изменилась
            if (currentPrice !== subscription.lastPrice) {
              if (currentPrice < subscription.lastPrice) {
                // Если цена снизилась
                sendPriceAlert(bot, subscription, currentPrice, subscription.lastPrice);
              }
              
              // Обновляем сохраненную цену
              await updateSubscriptionPrice(subscription.id, currentPrice);
            }
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

// Запуск сервера
app.get('/', (_req: Request, res: Response) => {
  res.send('Flight Price Tracker работает!');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log('Бот запущен и ожидает сообщений');
  console.log(`Проверка цен запланирована: ${process.env.CHECK_INTERVAL || '0 */1 * * *'}`);
});