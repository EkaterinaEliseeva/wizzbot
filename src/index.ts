import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { CronJob } from 'cron';
import { initBot, setupCallbackQueryHandlers, sendPriceAlert } from './modules/bot';
import { checkFlightPrice, checkFlightPriceRange } from './modules/price-checker';
import { getAllSubscriptions, updateSubscriptionPrice, updateSubscriptionDetails } from './modules/subscription';
import { testWizzairRoute, testDateRangeRoute } from './routes';

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
            // Для диапазона дат
            const priceInfo = await checkFlightPriceRange(
              subscription.origin,
              subscription.destination,
              subscription.startDate,
              subscription.endDate
            );
            
            if (priceInfo) {
              currentPrice = priceInfo.price;
              bestDate = priceInfo.date;
            }
          }
          
          if (currentPrice) {
            // Если это первая проверка для этой подписки
            if (!subscription.lastPrice) {
              if (bestDate && subscription.dateType === 'range') {
                // Если у нас есть новая лучшая дата для диапазона, обновляем детали
                await updateSubscriptionDetails(subscription.id, {
                  lastPrice: currentPrice,
                  bestDate: bestDate
                });
                
                // Отправляем уведомление о первой проверке с лучшей датой
                let message = `🔍 Первая проверка цены для вашей подписки\n\n`;
                message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
                message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
                message += `📅 Лучшая дата: ${bestDate}\n`;
                message += `\n💰 Текущая цена: ${currentPrice} руб.\n`;
                message += `\nВы будете получать уведомления при снижении цены.`;
                
                bot.sendMessage(subscription.chatId, message);
              } else {
                // Обновляем только цену
                await updateSubscriptionPrice(subscription.id, currentPrice);
                
                // Отправляем стандартное уведомление о первой проверке
                let message = `🔍 Первая проверка цены для вашей подписки\n\n`;
                message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
                
                if (subscription.dateType === 'single') {
                  message += `📅 Дата: ${subscription.date}\n`;
                } else {
                  message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
                }
                
                message += `\n💰 Текущая цена: ${currentPrice} руб.\n`;
                message += `\nВы будете получать уведомления при снижении цены.`;
                
                bot.sendMessage(subscription.chatId, message);
              }
              continue;
            }
            
            // Если цена изменилась
            if (currentPrice !== subscription.lastPrice) {
              if (currentPrice < subscription.lastPrice) {
                // Если есть новая лучшая дата и цена снизилась
                if (bestDate && subscription.dateType === 'range') {
                  // Отправляем уведомление со специальным сообщением о лучшей дате
                  let message = `✅ Снижение цены на билеты!\n\n`;
                  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
                  message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
                  message += `📅 Лучшая дата: ${bestDate}\n\n`;
                  
                  message += `💰 Старая цена: ${subscription.lastPrice} руб.\n`;
                  message += `💰 Новая цена: ${currentPrice} руб.\n`;
                  
                  const priceDiff = subscription.lastPrice - currentPrice;
                  const percentDiff = Math.round(priceDiff / subscription.lastPrice * 100);
                  
                  if (percentDiff >= 20) {
                    message += `💹 Значительное снижение: ${priceDiff} руб. (-${percentDiff}%)! 🔥\n`;
                    message += `\nРекомендуем рассмотреть покупку билетов!`;
                  } else {
                    message += `💹 Снижение: ${priceDiff} руб. (-${percentDiff}%)\n`;
                  }
                  
                  bot.sendMessage(subscription.chatId, message);
                  
                  // Обновляем цену и лучшую дату
                  await updateSubscriptionDetails(subscription.id, {
                    lastPrice: currentPrice,
                    bestDate: bestDate
                  });
                } else {
                  // Стандартное уведомление о снижении цены
                  sendPriceAlert(bot, subscription, currentPrice, subscription.lastPrice);
                  
                  // Обновляем сохраненную цену
                  await updateSubscriptionPrice(subscription.id, currentPrice);
                }
              } else if (currentPrice > subscription.lastPrice) {
                // Если цена выросла значительно (более чем на 20%)
                const priceDiff = currentPrice - subscription.lastPrice;
                const percentDiff = Math.round(priceDiff / subscription.lastPrice * 100);
                
                if (percentDiff > 20) {
                  let message = `⚠️ Значительное повышение цены!\n\n`;
                  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
                  
                  if (subscription.dateType === 'single') {
                    message += `📅 Дата: ${subscription.date}\n`;
                  } else {
                    message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
                    if (bestDate) {
                      message += `📅 Лучшая дата: ${bestDate}\n`;
                    }
                  }
                  
                  message += `\n💰 Старая цена: ${subscription.lastPrice} руб.\n`;
                  message += `💰 Новая цена: ${currentPrice} руб.\n`;
                  message += `📈 Повышение: ${priceDiff} руб. (+${percentDiff}%)\n`;
                  
                  bot.sendMessage(subscription.chatId, message);
                }
                
                // Обновляем цену и лучшую дату, если она есть
                if (bestDate && subscription.dateType === 'range') {
                  await updateSubscriptionDetails(subscription.id, {
                    lastPrice: currentPrice,
                    bestDate: bestDate
                  });
                } else {
                  await updateSubscriptionPrice(subscription.id, currentPrice);
                }
              }
            } else if (bestDate && subscription.dateType === 'range' && bestDate !== subscription.bestDate) {
              // Если цена не изменилась, но изменилась лучшая дата
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

// Маршрут для принудительной проверки цен
app.get('/check-prices', async (_req: Request, res: Response) => {
  try {
    // Запускаем проверку цен
    priceCheckJob.fireOnTick();
    res.send('Проверка цен запущена');
  } catch (error) {
    res.status(500).send('Ошибка при запуске проверки цен');
  }
});

// Запуск сервера
app.get('/', (_req: Request, res: Response) => {
  res.send('Flight Price Tracker работает!');
});

// Тестирование Wizzair API для конкретной даты
app.get('/test-wizzair', testWizzairRoute);

// Тестирование проверки диапазона дат
app.get('/test-date-range', testDateRangeRoute);

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log('Бот запущен и ожидает сообщений');
  console.log(`Проверка цен запланирована: ${process.env.CHECK_INTERVAL || '0 */1 * * *'}`);
});