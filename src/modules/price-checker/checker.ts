import axios from 'axios';
import cheerio from 'cheerio';
import { 
  convertDateFormat, 
  getAirportCode,
  checkWizzairPrice,
  getWizzairSearchHeaders
} from '../wizz';
import { getSubscriptions } from '../subscription';
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
    // Получаем IATA коды аэропортов
    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);
    
    // Проверяем, что коды аэропортов найдены
    if (!originCode || !destinationCode) {
      console.error(`Не удалось найти код IATA для ${!originCode ? origin : destination}`);
      return null;
    }

    // Если дата не указана, используем текущую дату
    if (!date) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      date = `${year}-${month}-${day}`;
    } else {
      date = convertDateFormat(date);
    }

    console.log(`Проверяем цену для ${origin}-${destination} на дату ${date}`);
    
    // Используем функцию API для получения цены
    const flightsData = await checkWizzairPrice(originCode, destinationCode, date);
    
    if (flightsData) {
      const currentDateFlight = flightsData.outboundFlights.find(flight => {
        const flightDateStr = flight.date?.split('T')[0];

        return flightDateStr === date;
      });
      
      const price = Number(currentDateFlight?.price.amount);
      
      return price;
    }
    
    console.log(`Не удалось получить цену для ${origin}-${destination} на дату ${date}`);
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
// export async function checkFlightPriceRange(
//   origin: string,
//   destination: string,
//   startDate: string,
//   endDate: string
// ): Promise<{ price: number; date: string } | null> {
//   try {
//     // Получаем IATA коды аэропортов
//     const originCode = getAirportCode(origin);
//     const destinationCode = getAirportCode(destination);
    
//     // Проверяем, что коды аэропортов найдены
//     if (!originCode || !destinationCode) {
//       console.error(`Не удалось найти код IATA для ${!originCode ? origin : destination}`);
//       return null;
//     }

//     // Конвертируем даты
//     const startDateFormatted = convertDateFormat(startDate);
//     const endDateFormatted = convertDateFormat(endDate);

//     // Специальный запрос для получения данных за диапазон дат за один раз
//     // Используем модифицированный запрос для получения информации о ценах для всего диапазона
//     const requestData = {
//       isRescueFare: false,
//       adultCount: 1,
//       childCount: 0,
//       dayInterval: 7,
//       wdc: false,
//       isFlightChange: false,
//       flightList: [{
//         departureStation: originCode,
//         arrivalStation: destinationCode,
//         date: startDateFormatted
//       }]
//     };

//     // Пытаемся получить данные о ценах за весь диапазон
//     console.log(`Запрашиваем данные для диапазона ${startDateFormatted} - ${endDateFormatted}`);
//     try {
//       const session = await getWizzairSearchHeaders(originCode, destinationCode);
//       const response = await axios.post<any>(
//         'https://be.wizzair.com/27.6.0/Api/search/search',
//         requestData,
//         {
//           headers: {
//             ...session.headers,
//             'Cookie': session.cookies
//           },
//         }
//       );

//       // Если получены данные за весь диапазон
//       if (response.data.outboundFlights && response.data.outboundFlights.length > 0) {
//         console.log(`Получены данные о ${response.data.outboundFlights.length} рейсах`);
        
//         // Находим минимальную цену в диапазоне дат
//         let bestPrice = Number.MAX_SAFE_INTEGER;
//         let bestDate = '';
        
//         const startDateObj = new Date(startDateFormatted);
//         const endDateObj = new Date(endDateFormatted);
        
//         for (const flight of response.data.outboundFlights) {
//           // Извлекаем дату из JSON
//           const flightDateStr = flight.date?.split('T')[0]; // YYYY-MM-DD
//           if (!flightDateStr) continue;
          
//           const flightDate = new Date(flightDateStr);
          
//           // Проверяем, входит ли дата в заданный диапазон
//           if (flightDate >= startDateObj && flightDate <= endDateObj) {
//             const price = flight.price?.amount;
            
//             if (price && price < bestPrice) {
//               bestPrice = price;
//               bestDate = flightDateStr;
//             }
//           }
//         }
        
//         if (bestPrice !== Number.MAX_SAFE_INTEGER && bestDate) {
//           // Преобразуем дату обратно в формат DD.MM.YYYY для отображения
//           const [year, month, day] = bestDate.split('-');
//           const formattedBestDate = `${day}.${month}.${year}`;
          
//           console.log(`Найдена лучшая цена для ${origin}-${destination}: ${bestPrice} руб. на дату ${formattedBestDate}`);
          
//           return {
//             price: Math.round(bestPrice),
//             date: formattedBestDate
//           };
//         }
//       }
//     } catch (error) {
//       console.error('Ошибка при запросе диапазона дат:', error);
//       // Если запрос диапазона не удался, продолжаем с проверкой отдельных дат
//     }
    
//     // Если не удалось получить данные за диапазон, проверяем каждую дату отдельно
//     console.log('Проверка отдельных дат в диапазоне...');
    
//     // Создаем массив дат в указанном диапазоне
//     const dates: string[] = [];
//     const currentDate = new Date(startDateFormatted);
//     const endDateObj = new Date(endDateFormatted);
    
//     // Ограничиваем количество проверяемых дат
//     const maxDaysToCheck = parseInt(process.env.MAX_DAYS_TO_CHECK || '7');
//     let daysChecked = 0;
    
//     while (currentDate <= endDateObj && daysChecked < maxDaysToCheck) {
//       const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
//       dates.push(dateStr);
//       currentDate.setDate(currentDate.getDate() + 1);
//       daysChecked++;
//     }
    
//     console.log(`Проверяем ${dates.length} дат в диапазоне ${startDateFormatted} - ${endDateFormatted}`);
    
//     // Проверяем цены для каждой даты
//     let bestPrice = Number.MAX_SAFE_INTEGER;
//     let bestDate = '';
//     let retryCount = 0;
//     const maxRetryAttempts = parseInt(process.env.RETRY_ATTEMPTS || '3');
    
//     for (const dateStr of dates) {
//       try {
//         const priceInfo = await checkWizzairPrice(originCode, destinationCode, dateStr);
        
//         if (priceInfo && priceInfo.price < bestPrice) {
//           bestPrice = priceInfo.price;
//           bestDate = dateStr;
//         }
        
//         // Сбрасываем счетчик попыток при успешном запросе
//         retryCount = 0;
        
//         // Добавляем задержку между запросами
//         if (dates.length > 1) {
//           await new Promise(resolve => setTimeout(resolve, parseInt(process.env.RETRY_DELAY || '2000')));
//         }
//       } catch (error) {
//         console.error(`Ошибка при проверке цены для даты ${dateStr}:`, error);
        
//         // Если превышено количество попыток, прекращаем проверку
//         retryCount++;
//         if (retryCount >= maxRetryAttempts) {
//           console.error(`Превышено количество попыток (${maxRetryAttempts}). Прекращаем проверку.`);
//           break;
//         }
//       }
//     }
    
//     if (bestPrice === Number.MAX_SAFE_INTEGER) {
//       console.log(`Не удалось найти цены для рейсов ${origin}-${destination} в диапазоне ${startDate} - ${endDate}`);
//       return null;
//     }
    
//     // Преобразуем дату обратно в формат DD.MM.YYYY для отображения
//     const [year, month, day] = bestDate.split('-');
//     const formattedBestDate = `${day}.${month}.${year}`;
    
//     console.log(`Найдена лучшая цена для ${origin}-${destination}: ${bestPrice} руб. на дату ${formattedBestDate}`);
    
//     return {
//       price: Math.round(bestPrice),
//       date: formattedBestDate
//     };
//   } catch (error) {
//     console.error('Ошибка при получении данных для диапазона дат:', 
//       error instanceof Error ? error.message : String(error)
//     );
//     return null;
//   }
// }

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