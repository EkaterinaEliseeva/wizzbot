import { 
  getAirportCode,
  getFlightsFromTimetable,
} from '../wizz';
import { ISubscription } from '../subscription/types';
import { convertDateFormat, formatDateForDisplay, getDatesInRange } from '../../utils';

/**
 * Проверяет текущую цену на авиабилеты для заданной подписки 
 * @param origin Город отправления
 * @param destination Город назначения
 * @param date Дата вылета
 * @returns Текущая цена или null в случае ошибки
 */
export async function checkFlightPrice(
  origin: string,
  destination: string,
  date?: string
): Promise<number | null> {
  try {    
    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);

    if (!originCode || !destinationCode) {
      console.error(`Не удалось найти код IATA для ${!originCode ? origin : destination}`);
      return null;
    }

    if (!date) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      date = `${day}.${month}.${year}`;
    }
    
    const formattedDate = convertDateFormat(date);

    console.log(`Проверяем цену для ${origin}(${originCode})-${destination}(${destinationCode}) на дату ${formattedDate}`);
    
    const flightsData = await getFlightsFromTimetable(originCode, destinationCode, formattedDate);
    
    if (flightsData && flightsData.outboundFlights && flightsData.outboundFlights.length > 0) {
      const currentDateFlight = flightsData.outboundFlights.find(flight => {
        if (!flight.departureDate) return false;
        const flightDateStr = flight.departureDate.split('T')[0];
        return flightDateStr === formattedDate;
      });
      
      if (currentDateFlight) {
        const price = Number(currentDateFlight.price.amount);
        console.log(`Найдена цена ${price} для ${origin}-${destination} на дату ${formattedDate}`);
        return price;
      } 
    }
    
    console.log(`Не удалось получить цену для ${origin}-${destination} на дату ${formattedDate}`);
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Проверяет цены на авиабилеты для диапазона дат
 * @param origin Город отправления
 * @param destination Город назначения
 * @param startDate Начальная дата диапазона
 * @param endDate Конечная дата диапазона
 * @param maxDaysToCheck Максимальное количество дней для проверки
 * @returns Информация о минимальных ценах и датах
 */
export async function checkFlightPriceRange(
  origin: string,
  destination: string,
  startDate: string,
  endDate: string,
  maxDaysToCheck = Number(process.env.MAX_DAYS_TO_CHECK || 7)
): Promise<{ bestDates: Array<{date: string, price: number}>, minPrice: number } | null> {
  try {
    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);
    
    if (!originCode || !destinationCode) {
      console.error(`Не удалось найти код IATA для ${!originCode ? origin : destination}`);
      return null;
    }

    const startDateFormatted = convertDateFormat(startDate);
    const endDateFormatted = convertDateFormat(endDate);

    console.log(`Проверка цен в диапазоне ${startDateFormatted} - ${endDateFormatted} для ${origin}-${destination}`);

    const dates = getDatesInRange(startDateFormatted, endDateFormatted, maxDaysToCheck);

    const results: Array<{date: string, price: number}> = [];

    const flightsData = await getFlightsFromTimetable(originCode, destinationCode, startDateFormatted);
    
    if (flightsData && flightsData.outboundFlights && flightsData.outboundFlights.length > 0) {
      for (const dateStr of dates) {
        const currentDateFlight = flightsData.outboundFlights.find(flight => {
          if (!flight.departureDate) return false;
          const flightDateStr = flight.departureDate.split('T')[0];
          return flightDateStr === dateStr;
        });
        
        if (currentDateFlight) {
          const price = Number(currentDateFlight.price.amount);
          const readableDate = formatDateForDisplay(dateStr);
          
          console.log(`${readableDate}: ${price} USD`);
          results.push({ date: readableDate, price });
        }
      }
      
      if (results.length === 0) {
        console.log(`Не найдено рейсов в указанном диапазоне`);
        return null;
      }
      
      const minPrice = Math.min(...results.map(item => item.price));
      const bestDates = results.filter(item => item.price === minPrice);
      
      console.log(`Лучшие даты для ${origin}-${destination}:`);
      bestDates.forEach(item => {
        console.log(`${item.date}: ${item.price} USD`);
      });
      
      return {
        bestDates,
        minPrice
      };
    }
    
    console.log(`Не удалось получить данные о ценах в указанном диапазоне`);
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}



export async function getSubscriptionStatuses(subscriptions: ISubscription[]) {
  let message = '';
  
  if (subscriptions.length === 0) {
    message =  '🔍 У вас пока нет активных подписок. Используйте /subscribe, чтобы создать подписку.';
  } else {
    message = '📋 Ваши подписки на авиабилеты:\n\n';

    for (let index = 0; index < subscriptions.length; index++) {
      let sub = subscriptions[index];

      message += `${index + 1}. ${sub.origin} ➡️ ${sub.destination}\n`;
      
      if (sub.dateType === 'single') {
        message += `   📅 Дата: ${sub.date}\n`;
      } else {
        message += `   📅 Период: ${sub.startDate} - ${sub.endDate}\n`;
        if (sub.bestDate) {
          message += `   🔥 Лучшая дата: ${sub.bestDate}\n`;
        }
      }

      let lastPrice = sub.lastPrice || null
      
      if (!lastPrice) {
        lastPrice = await checkFlightPrice(sub.origin, sub.destination, sub.date)
      }

      if (lastPrice) {
        message += `   💰 Текущая цена: ${lastPrice} руб.\n`;
      }
      
      message += `   🗑 /remove_${sub.id}\n\n`;
    }
  }

  return message;
}