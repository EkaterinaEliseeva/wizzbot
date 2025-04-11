import axios from 'axios';
import { ITimetableRequestParams, ITimetableResponse, IWizzairSearchParams, IWizzairSearchResponse, TIataCode } from './types';
import { getCalendarMonthBoundaries } from '../../utils';

function logApiError(error: unknown) {
    console.error('Ошибка при получении данных из Wizzair API:', 
        error instanceof Error ? error.message : String(error)
      );
      if (axios.isAxiosError(error) && error.response) {
        console.error('Статус ответа:', error.response.status);
        console.error('Данные ответа:', error.response.data);
        
        // Если получаем ошибку 429 (too many requests), возвращаем специальную ошибку
        if (error.response.status === 429) {
          console.error('Получено ограничение запросов (429). Необходимо добавить задержку между запросами.');
        }
      }
}


export async function getFligtsFromFarechart(
    origin: string,
    destination: string,
    date: string
  ): Promise<IWizzairSearchResponse | null> {
    try {
    const requestData: IWizzairSearchParams = {
        isRescueFare: false,
        adultCount: 1,
        childCount: 0,
        dayInterval: 7,
        wdc: false,
        isFlightChange: false,
        flightList: [{
          departureStation: origin,
          arrivalStation: destination,
          date: date
        }]
      };
      
      const response = await axios.post<IWizzairSearchResponse>(
        'https://be.wizzair.com/27.7.0/Api/asset/farechart',
        requestData
      );
  
      if (!response.data.outboundFlights || response.data.outboundFlights.length === 0) {
        return null;
      }
  
        return response.data
    } catch (error) {
      logApiError(error);

      return null;
    }
  }

export async function getFlightsFromTimetable(origin: TIataCode, destination: TIataCode, date: string): Promise<ITimetableResponse | null> {
    const datePlusOneMonth = new Date(date)
    datePlusOneMonth.setMonth(datePlusOneMonth.getMonth() + 1);
    const {start, end} = getCalendarMonthBoundaries(date);

    const requestData: ITimetableRequestParams = {
        flightList: [
            {
                departureStation: origin,
                arrivalStation: destination,
                from: start,
                to: end
            },
            {
                departureStation: destination,
                arrivalStation: origin,
                from: start,
                to: end
            }
        ],
        priceType: 'regular',
        adultCount: 1,
        childCount: 0,
        infantCount: 0
    };

    try {
        const response = await axios.post<ITimetableResponse>(
            'https://be.wizzair.com/27.7.0/Api/search/timetable',
            requestData
          );

          return {
            ...response.data,
            outboundFlights: response.data.outboundFlights.filter(flight => flight.departureStation === origin && flight.arrivalStation === destination),
          }
    } catch(error) {
      logApiError(error);

      return null;
    }
}
