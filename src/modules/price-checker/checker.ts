import { 
  getFlightsFromTimetable,
  getAllAirportCodes
} from '../wizz';
import { ISubscription } from '../subscription/types';
import { convertDateFormat, formatDateForDisplay, getDatesInRange } from '../../utils';

/**
 * Проверяет текущую цену на авиабилеты для заданной подписки, учитывая все возможные аэропорты
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
    // Получаем все возможные коды аэропортов для обоих городов
    const originCodes = getAllAirportCodes(origin);
    const destinationCodes = getAllAirportCodes(destination);
    
    if (originCodes.length === 0 || destinationCodes.length === 0) {
      console.error(`Не удалось найти коды IATA для ${originCodes.length === 0 ? origin : destination}`);
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
    console.log(`Проверяем цену для ${origin} -> ${destination} на дату ${formattedDate}`);
    console.log(`Аэропорты вылета: ${originCodes.join(', ')}`);
    console.log(`Аэропорты прилета: ${destinationCodes.join(', ')}`);
    
    // Проверяем цены для всех возможных комбинаций аэропортов
    const prices: number[] = [];
    
    for (const originCode of originCodes) {
      for (const destinationCode of destinationCodes) {
        console.log(`Проверка комбинации: ${originCode} -> ${destinationCode}`);
        
        const flightsData = await getFlightsFromTimetable(originCode, destinationCode, formattedDate);
        
        if (flightsData && flightsData.outboundFlights && flightsData.outboundFlights.length > 0) {
          const currentDateFlight = flightsData.outboundFlights.find(flight => {
            if (!flight.departureDate) return false;
            const flightDateStr = flight.departureDate.split('T')[0];
            return flightDateStr === formattedDate;
          });
          
          if (currentDateFlight) {
            const price = Number(currentDateFlight.price.amount);
            console.log(`Найдена цена ${price} руб. для ${originCode} -> ${destinationCode} на дату ${formattedDate}`);
            prices.push(price);
          }
        }
      }
    }
    
    if (prices.length > 0) {
      // Находим минимальную цену среди всех комбинаций
      const minPrice = Math.min(...prices);
      console.log(`Минимальная цена среди всех комбинаций: ${minPrice} руб.`);
      return minPrice;
    }
    
    console.log(`Не удалось получить цену для ${origin} -> ${destination} на дату ${formattedDate}`);
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Проверяет цены на авиабилеты для диапазона дат, учитывая все возможные аэропорты
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
): Promise<{ bestDates: Array<{date: string, price: number, originCode?: string, destinationCode?: string}>, minPrice: number } | null> {
  try {
    // Получаем все возможные коды аэропортов для обоих городов
    const originCodes = getAllAirportCodes(origin);
    const destinationCodes = getAllAirportCodes(destination);
    
    if (originCodes.length === 0 || destinationCodes.length === 0) {
      console.error(`Не удалось найти коды IATA для ${originCodes.length === 0 ? origin : destination}`);
      return null;
    }

    const startDateFormatted = convertDateFormat(startDate);
    const endDateFormatted = convertDateFormat(endDate);

    console.log(`Проверка цен в диапазоне ${startDateFormatted} - ${endDateFormatted}`);
    console.log(`Аэропорты вылета: ${originCodes.join(', ')}`);
    console.log(`Аэропорты прилета: ${destinationCodes.join(', ')}`);

    const dates = getDatesInRange(startDateFormatted, endDateFormatted, maxDaysToCheck);
    
    // Для хранения результатов всех комбинаций
    const allResults: Array<{date: string, price: number, originCode: string, destinationCode: string}> = [];
    
    // Проверяем цены для всех возможных комбинаций аэропортов
    for (const originCode of originCodes) {
      for (const destinationCode of destinationCodes) {
        console.log(`Проверка комбинации: ${originCode} -> ${destinationCode}`);
        
        const flightsData = await getFlightsFromTimetable(originCode, destinationCode, startDateFormatted);
        
        if (flightsData && flightsData.outboundFlights && flightsData.outboundFlights.length > 0) {
          // Проверяем цены для каждой даты в диапазоне
          for (const dateStr of dates) {
            const currentDateFlight = flightsData.outboundFlights.find(flight => {
              if (!flight.departureDate) return false;
              const flightDateStr = flight.departureDate.split('T')[0];
              return flightDateStr === dateStr;
            });
            
            if (currentDateFlight) {
              const price = Number(currentDateFlight.price.amount);
              const readableDate = formatDateForDisplay(dateStr);
              
              console.log(`${readableDate}: ${price} руб. (${originCode} -> ${destinationCode})`);
              allResults.push({ 
                date: readableDate, 
                price, 
                originCode, 
                destinationCode 
              });
            }
          }
        }
      }
    }
    
    if (allResults.length === 0) {
      console.log(`Не найдено рейсов в указанном диапазоне`);
      return null;
    }
    
    // Находим минимальную цену среди всех комбинаций
    const minPrice = Math.min(...allResults.map(item => item.price));
    
    // Находим все даты с минимальной ценой
    const bestDates = allResults
      .filter(item => item.price === minPrice)
      .map(item => ({
        date: item.date,
        price: item.price,
        originCode: item.originCode,
        destinationCode: item.destinationCode
      }));
    
    console.log(`Лучшие даты и комбинации аэропортов:`);
    bestDates.forEach(item => {
      console.log(`${item.date}: ${item.price} руб. (${item.originCode} -> ${item.destinationCode})`);
    });
    
    return {
      bestDates,
      minPrice
    };
  } catch (error) {
    console.error('Ошибка при получении данных:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Формирует сообщение со статусами подписок пользователя
 * @param subscriptions Массив подписок
 * @returns Текст сообщения
 */
export async function getSubscriptionStatuses(subscriptions: ISubscription[]) {
  let message = '';
  
  if (subscriptions.length === 0) {
    message = '🔍 У вас пока нет активных подписок. Используйте /subscribe, чтобы создать подписку.';
  } else {
    message = '📋 Ваши подписки на авиабилеты:\n\n';

    for (let index = 0; index < subscriptions.length; index++) {
      let sub = subscriptions[index];

      message += `${index + 1}. ${sub.origin} ➡️ ${sub.destination}\n`;
      
      if (sub.dateType === 'single') {
        message += `   📅 Дата: ${sub.date}\n`;
      } else {
        message += `   📅 Период: ${sub.startDate} - ${sub.endDate}\n`;
        
        if (sub.bestDates && sub.bestDates.length > 0) {
          if (sub.bestDates.length === 1) {
            message += `   🔥 Лучшая дата: ${sub.bestDates[0].date}\n`;
          } else {
            message += `   🔥 Лучшие даты:\n`;
            sub.bestDates.slice(0, 3).forEach((dateInfo, idx) => { // Показываем до 3 лучших дат
              message += `      ${idx + 1}. ${dateInfo.date}\n`;
            });
            if (sub.bestDates.length > 3) {
              message += `      ... и ещё ${sub.bestDates.length - 3}\n`;
            }
          }
        } else if (sub.bestDate) {
          message += `   🔥 Лучшая дата: ${sub.bestDate}\n`;
        }
      }

      let lastPrice = sub.lastPrice || null;
      
      if (!lastPrice) {
        lastPrice = await checkFlightPrice(sub.origin, sub.destination, sub.date);
      }

      if (lastPrice) {
        message += `   💰 Текущая цена: ${lastPrice} руб.\n`;
      } else {
        message += `   💰 Цена: информация недоступна\n`;
      }
      
      message += `   🗑 /remove_${sub.id}\n\n`;
    }
  }

  return message;
}