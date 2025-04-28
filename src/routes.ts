import type { Request, Response } from 'express';

import { FileSystemManager } from './modules/file-system';
import { Logger } from './modules/logger';
import { PriceChecker } from './modules/price-checker';
import { SubscriptionManager } from './modules/subscription';
import { WizzApi } from './modules/wizz';

export const testRoute = (_req: Request, res: Response): void => {
  try {
    const priceChecker = new PriceChecker(
      new Logger(),
      new WizzApi(process.env.WIZZ_API_URL as string),
      new SubscriptionManager(new FileSystemManager()),
    );
    priceChecker
      .checkFlightPriceRange('Ереван', 'Рим', '2025-06-18', '2025-06-25')
      .then(console.log)
      .catch(console.error);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
