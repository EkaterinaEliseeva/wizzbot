import { Request, Response } from 'express';
import { checkFlightPrice, checkFlightPriceRange } from './modules/price-checker';
import { checkWizzairPriceWithPuppeteer } from './modules/wizz';

/**
 * Маршрут для тестирования API Wizzair для конкретной даты
 */
export const testWizzairRoute = async (req: Request, res: Response) => {
  try {    
    // Получаем параметры из запроса или используем значения по умолчанию
    const origin = req.query.origin as string || 'EVN';
    const destination = req.query.destination as string || 'ROM';
    const date = req.query.date as string || '18.06.2025';
    
    console.log(`Тестирование Wizzair API для маршрута ${origin}-${destination} на дату ${date}`);
    
    // Выполняем запрос к Wizzair API
    const price = await checkFlightPrice(origin, destination, date);
    
    // Выводим результат в логи
    console.log('Полученная цена:', price);
    
    // Отправляем ответ клиенту
    if (price !== null) {
      res.json({
        success: true,
        message: 'Проверка цены успешно выполнена',
        data: {
          price: price,
          currency: 'RUB'
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Не удалось получить цену для указанного маршрута и даты',
        data: null
      });
    }
  } catch (error) {
    // Выводим ошибку в логи
    console.error('Ошибка при тестировании Wizzair API:', error);
    
    // Отправляем информацию об ошибке клиенту
    res.status(500).json({
      success: false,
      message: 'Ошибка при обращении к Wizzair API',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Маршрут для тестирования проверки диапазона дат
 */
export const testDateRangeRoute = async (req: Request, res: Response) => {
  try {
    // Получаем параметры из запроса или используем значения по умолчанию
    const origin = req.query.origin as string || 'EVN';
    const destination = req.query.destination as string || 'ROM';
    const startDate = req.query.startDate as string || '15.06.2025';
    const endDate = req.query.endDate as string || '25.06.2025';
    
    console.log(`Тестирование проверки диапазона дат ${startDate}-${endDate} для ${origin}-${destination}`);
    
    // Проверяем цены для диапазона дат
    const result = await checkFlightPriceRange(
      origin,
      destination,
      startDate,
      endDate
    );
    
    // Отправляем ответ клиенту
    if (result) {
      res.json({
        success: true,
        message: 'Проверка диапазона дат успешна',
        data: {
          price: result.price,
          date: result.date,
          currency: 'RUB'
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Не удалось найти рейсы в указанном диапазоне дат',
        data: null
      });
    }
  } catch (error) {
    // Отправляем информацию об ошибке клиенту
    res.status(500).json({
      success: false,
      message: 'Ошибка при проверке диапазона дат',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};