import type { TIataCode } from './TIataCode';

export interface ITimetableFlightInfo {
  departureStation: TIataCode;
  arrivalStation: TIataCode;
  departureDate: string;
  price: {
    amount: number;
    currencyCode: string;
  };
  originalPrice: {
    amount: number;
    currencyCode: string;
  };
  priceType: string;
  departureDates: string[];
  hasMacFlight: boolean;
}
