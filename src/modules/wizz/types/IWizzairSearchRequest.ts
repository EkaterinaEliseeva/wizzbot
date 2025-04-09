import { IFlightInfo } from "./IFlightInfo";

export interface IWizzairSearchRequest {
    isFlightChange: boolean;
    flightList: IFlightInfo[];
    adultCount: number;
    childCount: number;
    infantCount: number;
    wdc: boolean;
  }