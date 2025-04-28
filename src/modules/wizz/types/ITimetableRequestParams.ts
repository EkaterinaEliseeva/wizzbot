import type { TIataCode } from './TIataCode';

export interface ITimetableRequestParams {
  flightList: {
    departureStation: TIataCode;
    arrivalStation: TIataCode;
    from: string; // "2025-05-26",
    to: string; // "2025-07-06"
  }[];
  priceType: string; // 'regular';
  adultCount: number;
  childCount: number;
  infantCount: number;
}
