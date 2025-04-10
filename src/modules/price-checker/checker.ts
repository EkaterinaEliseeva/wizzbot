import { 
  convertDateFormat, 
  getAirportCode,
  getFlightsFromTimetable,
} from '../wizz';
import { ISubscription } from '../subscription/types';

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
 * @returns Объект с минимальной ценой и датой или null
 */
export async function checkFlightPriceRange(
  origin: string,
  destination: string,
  startDate: string,
  endDate: string
) {
    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);
    
    if (!originCode || !destinationCode) {
      console.error(`Не удалось найти код IATA для ${!originCode ? origin : destination}`);
      return null;
    }

    const startDateFormatted = convertDateFormat(startDate);
    const endDateFormatted = convertDateFormat(endDate);

    // TODO
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