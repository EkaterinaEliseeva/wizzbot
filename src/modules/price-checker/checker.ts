;import { 
  getFlightsFromTimetable,
} from '../wizz';
import { 
  getAllAirportCodes
} from '../wizz/utils/getAllAirportCodes';
import { ISubscription, updateSubscriptionPrice, 
  updateBestDates, 
  areBestDatesChanged,  } from '../subscription';
import { convertDateFormat, formatDateForDisplay, getDatesInRange } from '../../utils';
import { IDateRangePriceCheckResult, IPriceCheckRangeResult, IPriceCheckResponse, ISingleDatePriceCheckResult, TPriceCheckResult } from './types';

/**
 * Проверяет текущую цену на авиабилеты для заданной подписки, учитывая все возможные аэропорты
 * @param origin Город отправления
 * @param destination Город назначения
 * @param date Дата вылета
 * @returns Текущая цена и информация о рейсе или null в случае ошибки
 */
export async function checkFlightPrice(
  origin: string,
  destination: string,
  date?: string
): Promise<IPriceCheckResponse | null> {
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
    const prices: {price: number, originCode: string, destinationCode: string}[] = [];
    
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
            console.log(`Найдена цена ${price} USD для ${originCode} -> ${destinationCode} на дату ${formattedDate}`);
            prices.push({
              price,
              originCode,
              destinationCode
            });
          }
        }
      }
    }
    
    if (prices.length > 0) {
      // Находим минимальную цену среди всех комбинаций
      let minPriceInfo = prices[0];
      for (let i = 1; i < prices.length; i++) {
        if (prices[i].price < minPriceInfo.price) {
          minPriceInfo = prices[i];
        }
      }
      
      console.log(`Минимальная цена среди всех комбинаций: ${minPriceInfo.price} USD (${minPriceInfo.originCode} -> ${minPriceInfo.destinationCode})`);
      return {
        price: minPriceInfo.price,
        flightInfo: {
          originCode: minPriceInfo.originCode,
          destinationCode: minPriceInfo.destinationCode
        }
      };
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
): Promise<IPriceCheckRangeResult | null> {
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
              
              console.log(`${readableDate}: ${price} USD (${originCode} -> ${destinationCode})`);
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
      console.log(`${item.date}: ${item.price} USD (${item.originCode} -> ${item.destinationCode})`);
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
            sub.bestDates.forEach((dateInfo, idx) => {
              message += `      ${idx + 1}. ${dateInfo.date}\n`;
            });
          }
        } else if (sub.bestDate) {
          message += `   🔥 Лучшая дата: ${sub.bestDate}\n`;
        }
      }

      let lastPrice = sub.lastPrice || null;
      
      if (!lastPrice) {
        const priceResult = await checkFlightPrice(sub.origin, sub.destination, sub.date);
        lastPrice = priceResult ? priceResult.price : null;
      }

      if (lastPrice) {
        message += `   💰 Текущая цена: ${lastPrice} USD\n`;
      } else {
        message += `   💰 Цена: информация недоступна\n`;
      }
      
      message += `   🔄 /check_${sub.id} - Проверить цену\n`;
      message += `   🗑 /remove_${sub.id} - Удалить подписку\n\n`;
    }
  }

  return message;
}

/**
 * Проверяет цену для подписки на конкретную дату и обновляет информацию в базе данных
 * @param subscription Подписка
 * @returns Результат проверки цены
 */
export async function checkSingleDateSubscriptionPrice(
  subscription: ISubscription
): Promise<ISingleDatePriceCheckResult> {
  try {
    if (!subscription.date) {
      return {
        success: false,
        message: 'В подписке не указана дата'
      };
    }

    // Проверяем текущую цену
    const currentPrice = await checkFlightPrice(
      subscription.origin,
      subscription.destination,
      subscription.date
    );

    if (!currentPrice) {
      return {
        success: false,
        message: 'Не удалось получить информацию о цене'
      };
    }

    const oldPrice = subscription.lastPrice;
    const priceChanged = oldPrice !== undefined && currentPrice.price !== oldPrice;

    // Получаем информацию о рейсе, если доступна
    const flightInfo = currentPrice.flightInfo ? {
      originCode: currentPrice.flightInfo.originCode,
      destinationCode: currentPrice.flightInfo.destinationCode,
      date: subscription.date
    } : undefined;

    // Обновляем цену в базе данных
    await updateSubscriptionPrice(subscription.id, currentPrice.price);

    return {
      success: true,
      oldPrice,
      newPrice: currentPrice.price,
      priceChanged,
      flightInfo
    };
  } catch (error) {
    console.error('Ошибка при проверке цены:', error);
    return {
      success: false,
      message: 'Произошла ошибка при проверке цены'
    };
  }
}

/**
 * Проверяет цены для подписки на диапазон дат и обновляет информацию в базе данных
 * @param subscription Подписка
 * @returns Результат проверки цен
 */
export async function checkDateRangeSubscriptionPrice(
  subscription: ISubscription
): Promise<IDateRangePriceCheckResult> {
  try {
    if (!subscription.startDate || !subscription.endDate) {
      return {
        success: false,
        message: 'В подписке не указан диапазон дат'
      };
    }

    // Проверяем цены в диапазоне дат
    const priceRangeInfo = await checkFlightPriceRange(
      subscription.origin,
      subscription.destination,
      subscription.startDate,
      subscription.endDate
    );

    if (!priceRangeInfo || priceRangeInfo.bestDates.length === 0) {
      return {
        success: false,
        message: 'Не удалось получить информацию о ценах в указанном диапазоне'
      };
    }

    const { bestDates, minPrice } = priceRangeInfo;
    const oldPrice = subscription.lastPrice;
    
    // Проверяем, изменилась ли цена или набор лучших дат
    const priceChanged = oldPrice !== undefined && minPrice !== oldPrice;
    const datesChanged = areBestDatesChanged(subscription.bestDates, bestDates);

    // Обновляем информацию в базе данных
    await updateBestDates(subscription.id, bestDates, minPrice);

    return {
      success: true,
      oldPrice,
      newPrice: minPrice,
      priceChanged,
      bestDates,
      datesChanged
    };
  } catch (error) {
    console.error('Ошибка при проверке цен:', error);
    return {
      success: false,
      message: 'Произошла ошибка при проверке цен'
    };
  }
}

/**
 * Проверяет цены для подписки любого типа и обновляет информацию в базе данных
 * @param subscription Подписка
 * @returns Результат проверки цен
 */
export async function checkSubscriptionPrice(
  subscription: ISubscription
): Promise<TPriceCheckResult> {
  // Выбираем функцию проверки в зависимости от типа подписки
  if (subscription.dateType === 'single') {
    return checkSingleDateSubscriptionPrice(subscription);
  } else if (subscription.dateType === 'range') {
    return checkDateRangeSubscriptionPrice(subscription);
  } else {
    return {
      success: false,
      message: 'Неизвестный тип подписки'
    };
  }
}

/**
 * Проверяет, является ли результат результатом проверки конкретной даты
 * @param result Результат проверки цены
 * @returns true, если результат относится к конкретной дате
 */
export function isSingleDateResult(result: TPriceCheckResult): result is ISingleDatePriceCheckResult {
  return result.success && !('bestDates' in result);
}

/**
 * Проверяет, является ли результат результатом проверки диапазона дат
 * @param result Результат проверки цены
 * @returns true, если результат относится к диапазону дат
 */
export function isDateRangeResult(result: TPriceCheckResult): result is IDateRangePriceCheckResult {
  return result.success && 'bestDates' in result;
}

/**
 * Формирует сообщение с результатами проверки цены для конкретной даты
 * @param subscription Подписка
 * @param result Результат проверки цены
 * @returns Текст сообщения
 */
export function formatSingleDatePriceMessage(
  subscription: ISubscription,
  result: ISingleDatePriceCheckResult
): string {
  let message = `✅ Проверка цены завершена!\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  message += `📅 Дата: ${subscription.date}\n\n`;

  // Добавляем информацию о конкретном рейсе, если доступна
  if (result.flightInfo) {
    message += `✈️ Рейс: ${result.flightInfo.originCode} → ${result.flightInfo.destinationCode}\n\n`;
  }
  
  message += `💰 Текущая цена: ${result.newPrice} USD\n`;

  if (result.oldPrice !== undefined) {
    message += `💰 Предыдущая цена: ${result.oldPrice} USD\n`;

    if (result.priceChanged) {
      const priceDiff = Math.abs(result.oldPrice - result.newPrice!);
      const percentDiff = Math.round(priceDiff / result.oldPrice * 100);

      if (result.newPrice! < result.oldPrice) {
        message += `💹 Снижение: ${priceDiff} USD (-${percentDiff}%)\n`;
        
        if (percentDiff >= 20) {
          message += `\n🔥 Рекомендуем рассмотреть покупку билетов!\n`;
        }
      } else {
        message += `📈 Повышение: ${priceDiff} USD (+${percentDiff}%)\n`;
      }
    } else {
      message += `⏸ Цена не изменилась\n`;
    }
  }

  return message;
}

/**
 * Формирует сообщение с результатами проверки цен для диапазона дат
 * @param subscription Подписка
 * @param result Результат проверки цен
 * @returns Текст сообщения
 */
export function formatDateRangePriceMessage(
  subscription: ISubscription,
  result: IDateRangePriceCheckResult
): string {
  let message = `✅ Проверка цен завершена!\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n\n`;
  message += `💰 Минимальная цена: ${result.newPrice} USD\n`;

  if (result.oldPrice !== undefined) {
    message += `💰 Предыдущая минимальная цена: ${result.oldPrice} USD\n`;

    if (result.priceChanged) {
      const priceDiff = Math.abs(result.oldPrice - result.newPrice!);
      const percentDiff = Math.round(priceDiff / result.oldPrice * 100);

      if (result.newPrice! < result.oldPrice) {
        message += `💹 Снижение: ${priceDiff} USD (-${percentDiff}%)\n`;
        
        if (percentDiff >= 20) {
          message += `\n🔥 Рекомендуем рассмотреть покупку билетов!\n`;
        }
      } else {
        message += `📈 Повышение: ${priceDiff} USD (+${percentDiff}%)\n`;
      }
    } else {
      message += `⏸ Минимальная цена не изменилась\n`;
    }
  }

  if (result.bestDates && result.bestDates.length > 0) {
    message += `\n📅 Лучшие даты:\n`;

    result.bestDates.forEach((item, index) => {
      message += `   ${index + 1}. ${item.date}`;

      if (item.originCode && item.destinationCode) {
        message += ` (${item.originCode} → ${item.destinationCode})`;
      }

      message += `\n`;
    });
  }

  return message;
}

/**
 * Формирует сообщение с результатами проверки цен для подписки любого типа
 * @param subscription Подписка
 * @param result Результат проверки цен
 * @returns Текст сообщения
 */
export function formatPriceCheckMessage(
  subscription: ISubscription,
  result: TPriceCheckResult
): string {
  if (!result.success) {
    return `❌ Ошибка: ${result.message || 'Неизвестная ошибка при проверке цен'}`;
  }
  
  if (subscription.dateType === 'single' && isSingleDateResult(result)) {
    return formatSingleDatePriceMessage(subscription, result);
  } else if (subscription.dateType === 'range' && isDateRangeResult(result)) {
    return formatDateRangePriceMessage(subscription, result);
  } else {
    return 'Не удалось сформировать сообщение: некорректный тип подписки или отсутствуют данные';
  }
}