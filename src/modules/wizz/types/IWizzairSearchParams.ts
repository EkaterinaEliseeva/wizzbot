export interface IWizzairSearchParams {
  isRescueFare?: boolean;
  wdc: boolean;
  isFlightChange: boolean;
  dayInterval: number;
  adultCount?: number;
  childCount?: number;
  flightList: {
    departureStation: string;
    arrivalStation: string;
    date: string;
  }[];
}
