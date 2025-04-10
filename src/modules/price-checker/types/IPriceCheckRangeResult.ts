export interface IPriceCheckRangeResult {
    bestDates: Array<{date: string, price: number, originCode?: string, destinationCode?: string}>;
    minPrice: number;
  }