import { IBasePriceCheckResult } from "./IBasePriceCheckResult";

export interface ISingleDatePriceCheckResult extends IBasePriceCheckResult {
    oldPrice?: number;
    newPrice?: number;
    priceChanged?: boolean;
    flightInfo?: {
      originCode: string;
      destinationCode: string;
      date: string;
    };
  }