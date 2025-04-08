// src/priceChecker.ts
import axios from 'axios';
import cheerio from 'cheerio';

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
    // В реальном приложении здесь будет код для обращения к API или парсинга сайтов
    // для поиска билетов по заданным параметрам
    
    // Пример реализации с использованием некоторого API для авиабилетов
    // const response = await axios.get('https://api.example.com/flights', {
    //   params: {
    //     from: origin,
    //     to: destination,
    //     date: date
    //   }
    // });
    //
    // return response.data.price;
    
    // Заглушка для демонстрации
    // Возвращает случайную цену в диапазоне 5000-15000 рублей
    return Math.floor(Math.random() * 10000) + 5000;
  } catch (error) {
    console.error('Ошибка при получении данных:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Проверяет текущую цену по URL и селектору из .env
 * Используется для обратной совместимости
 * @returns Текущая цена или null в случае ошибки
 */
export async function checkFlightPrices(): Promise<number | null> {
  if (!process.env.TARGET_URL) {
    console.error('TARGET_URL не задан в .env файле');
    return null;
  }

  if (!process.env.PRICE_ELEMENT_SELECTOR) {
    console.error('PRICE_ELEMENT_SELECTOR не задан в .env файле');
    return null;
  }

  try {
    const response = await axios.get(process.env.TARGET_URL);
    const $ = cheerio.load(response.data);
    
    // Находим элемент с ценой на странице
    const priceElement = $(process.env.PRICE_ELEMENT_SELECTOR);
    
    if (priceElement.length) {
      // Извлекаем текст цены, удаляем все нецифровые символы
      const priceText = priceElement.text().replace(/[^\d]/g, '');
      return parseInt(priceText, 10);
    } else {
      console.error('Элемент с ценой не найден на странице');
      return null;
    }
  } catch (error) {
    console.error('Ошибка при получении данных:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Пример реализации с API реального сервиса авиабилетов
 * @param origin Город отправления (IATA код)
 * @param destination Город назначения (IATA код)
 * @param date Дата в формате YYYY-MM-DD
 */
export async function checkFlightPricesWithAPI(
  origin: string,
  destination: string,
  date: string
): Promise<number | null> {
  try {
    // Это пример API запроса к реальному сервису
    // В реальном приложении вам потребуется зарегистрироваться и получить API ключ
    const response = await axios.get('https://api.example.com/v1/prices/cheap', {
      params: {
        origin,
        destination,
        depart_date: date,
        currency: 'RUB',
        token: process.env.FLIGHT_API_TOKEN
      }
    });
    
    // Обработка ответа от API
    if (response.data && response.data.data && response.data.data[destination]) {
      const flights = response.data.data[destination];
      // Находим самый дешевый рейс
      let minPrice = Number.MAX_SAFE_INTEGER;
      
      Object.values(flights).forEach((flight: any) => {
        if (flight.price < minPrice) {
          minPrice = flight.price;
        }
      });
      
      return minPrice === Number.MAX_SAFE_INTEGER ? null : minPrice;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных из API:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}