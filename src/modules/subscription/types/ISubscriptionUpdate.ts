export interface ISubscriptionUpdate {
  lastPrice?: number;
  bestDate?: string;
  bestDates?: Array<{
    date: string;
    price: number;
    originCode?: string;
    destinationCode?: string;
  }>;
  maxPrice?: number;
}
