import axios from 'axios';

import { getCalendarMonthBoundaries } from '../../utils';
import { Logger } from '../logger';

import type {
  ITimetableRequestParams,
  ITimetableResponse,
  IWizzairSearchParams,
  IWizzairSearchResponse,
  TIataCode,
} from './types';

export class WizzApi {
  logger: Logger;
  apiUrl: string;

  constructor(apiUrl: string) {
    this.logger = new Logger();
    this.apiUrl = apiUrl; //https://be.wizzair.com/27.7.0/Api
  }

  async getFligtsFromFarechart(
    origin: string,
    destination: string,
    date: string,
  ): Promise<IWizzairSearchResponse | null> {
    try {
      const requestData: IWizzairSearchParams = {
        isRescueFare: false,
        adultCount: 1,
        childCount: 0,
        dayInterval: 7,
        wdc: false,
        isFlightChange: false,
        flightList: [
          {
            departureStation: origin,
            arrivalStation: destination,
            date: date,
          },
        ],
      };

      const response = await axios.post<IWizzairSearchResponse>(
        `${this.apiUrl}/asset/farechart`,
        requestData,
      );

      if (!response.data.outboundFlights || response.data.outboundFlights.length === 0) {
        return null;
      }

      return response.data;
    } catch (error) {
      this.logApiError(error);

      return null;
    }
  }

  async getFlightsFromTimetable(
    origin: TIataCode,
    destination: TIataCode,
    date: string,
  ): Promise<ITimetableResponse | null> {
    const datePlusOneMonth = new Date(date);
    datePlusOneMonth.setMonth(datePlusOneMonth.getMonth() + 1);
    const { start, end } = getCalendarMonthBoundaries(date);

    const requestData: ITimetableRequestParams = {
      flightList: [
        {
          departureStation: origin,
          arrivalStation: destination,
          from: start,
          to: end,
        },
        {
          departureStation: destination,
          arrivalStation: origin,
          from: start,
          to: end,
        },
      ],
      priceType: 'regular',
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
    };

    try {
      const response = await axios.post<ITimetableResponse>(
        `${this.apiUrl}/search/timetable`,
        requestData,
      );

      return {
        ...response.data,
        outboundFlights: response.data.outboundFlights.filter(
          (flight) => flight.departureStation === origin && flight.arrivalStation === destination,
        ),
      };
    } catch (error) {
      this.logApiError(error);

      return null;
    }
  }

  logApiError(error: unknown): void {
    this.logger.error(
      `Error getting data from Wizzair API: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (axios.isAxiosError(error) && error.response) {
      this.logger.error(`Response status: ${error.response.status}`);
      this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
  }
}
