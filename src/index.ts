import dotenv from 'dotenv';
import type { Request, Response } from 'express';
import express from 'express';

import { Bot } from './modules/bot';
import { FileSystemManager } from './modules/file-system';
import { Logger } from './modules/logger';
import { Planner } from './modules/planner';
import { PriceChecker } from './modules/price-checker';
import { SubscriptionManager } from './modules/subscription';
import { WizzApi } from './modules/wizz';
import { testRoute } from './routes';

dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN не задан в .env файле');
}

if (!process.env.WIZZ_API_URL) {
  throw new Error('WIZZ_API_URL не задан в .env файле');
}

const app = express();
const PORT = process.env.PORT || 3000;

function startApp(): void {
  const logger = new Logger();
  const fileSystemManager = new FileSystemManager();
  const subscriptionsManager = new SubscriptionManager(fileSystemManager);
  const api = new WizzApi(process.env.WIZZ_API_URL as string);
  const priceChecker = new PriceChecker(logger, api, subscriptionsManager);

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string, subscriptionsManager, priceChecker);
  const priceCheckInterval = process.env.CHECK_INTERVAL || '0 */1 * * *';

  new Planner().addJob(priceCheckInterval, () => priceChecker.check(bot));
}

startApp();

app.get('/', (_req: Request, res: Response) => {
  res.send('Flight Price Tracker is working!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Bot started');
  console.log(`Price check planned: ${process.env.CHECK_INTERVAL || '0 */1 * * *'}`);
});

app.get('/test', testRoute);
