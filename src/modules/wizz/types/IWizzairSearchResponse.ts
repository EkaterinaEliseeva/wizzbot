import { IWizzairFlightPrice } from "./IWizzairFlightPrice";

export interface IWizzairSearchResponse {
    outboundFlights: {
      departureDateTime: string;
      arrivalDateTime: string;
      fares: {
        basePrice: IWizzairFlightPrice;
        discountedPrice: IWizzairFlightPrice;
        bundle: string;
      }[];
    }[];
  }