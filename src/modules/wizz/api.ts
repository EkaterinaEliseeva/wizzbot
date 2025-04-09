import axios from 'axios';
import { AIRPORTS_CODES } from './config';
import { IWizzairSearchRequest, IWizzairSearchResponse } from './types';

/**
 * Проверяет цену на авиабилеты через Wizzair API
 * @param origin Код аэропорта отправления (IATA)
 * @param destination Код аэропорта назначения (IATA)
 * @param date Дата вылета в формате YYYY-MM-DD
 * @returns Минимальная цена на билеты или null в случае ошибки
 */
export async function checkWizzairPrice(
  origin: string,
  destination: string,
  date: string
): Promise<{ price: number; currency: string } | null> {
  try {
    const requestData: IWizzairSearchRequest = {
      isFlightChange: false,
      flightList: [
        {
          departureStation: origin,
          arrivalStation: destination,
          departureDate: date
        }
      ],
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      wdc: true
    };

    const response = await axios.post<IWizzairSearchResponse>(
      'https://be.wizzair.com/27.6.0/Api/search/search',
      requestData,
      {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://wizzair.com',
            'Referer': 'https://wizzair.com/',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
          },
      }
    );

    if (!response.data.outboundFlights || response.data.outboundFlights.length === 0) {
      console.log(`Рейсы по направлению ${origin}-${destination} на дату ${date} не найдены`);
      return null;
    }

    let minPrice = Number.MAX_SAFE_INTEGER;
    let currency = '';

    response.data.outboundFlights.forEach(flight => {
      flight.fares.forEach(fare => {
        // Используем discountedPrice, если доступна, иначе basePrice
        const price = fare.discountedPrice?.amount || fare.basePrice?.amount;
        const curr = fare.discountedPrice?.currencyCode || fare.basePrice?.currencyCode;
        
        if (price && price < minPrice) {
          minPrice = price;
          currency = curr;
        }
      });
    });

    if (minPrice === Number.MAX_SAFE_INTEGER) {
      console.log(`Не удалось найти цены для рейсов ${origin}-${destination} на дату ${date}`);
      return null;
    }

    return {
      price: minPrice,
      currency: currency
    };
  } catch (error) {
    console.error('Ошибка при получении данных из Wizzair API:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Проверяет цены на авиабилеты в диапазоне дат
 * @param origin Код аэропорта отправления (IATA)
 * @param destination Код аэропорта назначения (IATA)
 * @param startDate Начальная дата диапазона (YYYY-MM-DD)
 * @param endDate Конечная дата диапазона (YYYY-MM-DD)
 * @returns Объект с минимальной ценой и соответствующей датой или null
 */
export async function checkWizzairPriceRange(
  origin: string,
  destination: string,
  startDate: string,
  endDate: string
): Promise<{ price: number; currency: string; date: string } | null> {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dates: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    let minPrice = Number.MAX_SAFE_INTEGER;
    let bestDate = '';
    let currency = '';

    for (const date of dates) {
      const result = await checkWizzairPrice(origin, destination, date);
      
      if (result && result.price < minPrice) {
        minPrice = result.price;
        currency = result.currency;
        bestDate = date;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (minPrice === Number.MAX_SAFE_INTEGER) {
      return null;
    }

    return {
      price: minPrice,
      currency: currency,
      date: bestDate
    };
  } catch (error) {
    console.error('Ошибка при проверке цен в диапазоне дат:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Конвертирует дату из формата DD.MM.YYYY в YYYY-MM-DD
 * @param date Дата в формате DD.MM.YYYY
 * @returns Дата в формате YYYY-MM-DD
 */
export function convertDateFormat(date: string): string {
  const [day, month, year] = date.split('.');
  return `${year}-${month}-${day}`;
}

/**
 * Получает код IATA аэропорта по названию города
 * @param city Название города
 * @returns Код IATA или null
 */
export function getAirportCode(city: string): string | null {
  // Нормализуем название города (приводим к нижнему регистру)
  const normalizedCity = city.toLowerCase();
  
  // Возвращаем код IATA или null, если город не найден
  return AIRPORTS_CODES[normalizedCity] || null;
}