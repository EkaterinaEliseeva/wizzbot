import type { TBestDates } from './TBestDates';

export interface ISubscription {
  id: string;
  chatId: number;
  origin: string;
  destination: string;
  dateType: 'single' | 'range';
  date?: string;
  startDate?: string;
  endDate?: string;
  lastPrice?: number;
  bestDate?: string;
  bestDates?: Array<TBestDates>;
  createdAt: Date;
}
