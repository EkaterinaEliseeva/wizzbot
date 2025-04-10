export interface ISubscriptionUpdate {
  lastPrice?: number;
  bestDate?: string;
  bestDates?: Array<{date: string, price: number}>;
  maxPrice?: number;
}