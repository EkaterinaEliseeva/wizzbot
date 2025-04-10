export interface IPriceCheckResponse {
    price: number;
    flightInfo?: {
      originCode: string;
      destinationCode: string;
    };
  }