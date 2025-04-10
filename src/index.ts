import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { CronJob } from 'cron';
import { initBot, setupCallbackQueryHandlers } from './modules/bot';
import { testRoute } from './routes';
import { priceCheckJob } from './planner';

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

const cron = priceCheckJob(bot);

// Маршрут для принудительной проверки цен
app.get('/check-prices', async (_req: Request, res: Response) => {
  try {
    cron.fireOnTick();
    res.send('Проверка цен запущена');
  } catch (error) {
    res.status(500).send('Ошибка при запуске проверки цен');
  }
});

// Запуск сервера
app.get('/', (_req: Request, res: Response) => {
  res.send('Flight Price Tracker работает!');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log('Бот запущен и ожидает сообщений');
  console.log(`Проверка цен запланирована: ${process.env.CHECK_INTERVAL || '0 */1 * * *'}`);
});

app.get('/test', testRoute);