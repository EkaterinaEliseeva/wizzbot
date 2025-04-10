import { IBasePriceCheckResult } from "./IBasePriceCheckResult";
import { IDatePriceInfo } from "./IDatePriceInfo";

export interface IDateRangePriceCheckResult extends IBasePriceCheckResult {
    oldPrice?: number;
    newPrice?: number;
    priceChanged?: boolean;
    bestDates?: IDatePriceInfo[];
    datesChanged?: boolean;
  }