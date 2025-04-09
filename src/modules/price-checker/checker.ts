// src/priceChecker.ts
import axios from 'axios';
import cheerio from 'cheerio';
import { checkWizzairPrice, checkWizzairPriceRange, convertDateFormat, getAirportCode, 
  checkWizzairPriceWithPuppeteer, checkWizzairPriceRangeWithPuppeteer } from '../wizz';

// Флаг, указывающий на использование Puppeteer вместо прямых API-запросов
const USE_PUPPETEER = true;

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

    // Если дата не указана, используем текущую дату + 30 дней
    if (!date) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getDate()).padStart(2, '0');
      date = `${year}-${month}-${day}`;
    } else {
      // Конвертируем дату из формата DD.MM.YYYY в YYYY-MM-DD
      date = convertDateFormat(date);
    }

    // Проверяем цену с использованием предпочтительного метода
    let priceInfo;
    if (USE_PUPPETEER) {
      priceInfo = await checkWizzairPriceWithPuppeteer(originCode, destinationCode, date);
    } else {
      priceInfo = await checkWizzairPrice(originCode, destinationCode, date);
    }
    
    if (priceInfo) {
      // Возвращаем цену, округленную до целого числа
      return Math.round(priceInfo.price);
    }
    
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
): Promise<{ price: number; date: string } | null> {
  try {
    // Получаем IATA коды аэропортов
    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);
    
    // Проверяем, что коды аэропортов найдены
    if (!originCode || !destinationCode) {
      console.error(`Не удалось найти код IATA для ${!originCode ? origin : destination}`);
      return null;
    }

    // Конвертируем даты
    const startDateFormatted = convertDateFormat(startDate);
    const endDateFormatted = convertDateFormat(endDate);

    // Проверяем цены используя предпочтительный метод
    let priceInfo;
    if (USE_PUPPETEER) {
      priceInfo = await checkWizzairPriceRangeWithPuppeteer(
        originCode, 
        destinationCode, 
        startDateFormatted, 
        endDateFormatted
      );
    } else {
      priceInfo = await checkWizzairPriceRange(
        originCode, 
        destinationCode, 
        startDateFormatted, 
        endDateFormatted
      );
    }
    
    if (priceInfo) {
      return {
        price: Math.round(priceInfo.price),
        date: priceInfo.date
      };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных для диапазона дат:', 
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