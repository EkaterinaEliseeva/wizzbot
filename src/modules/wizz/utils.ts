import { AIRPORTS_CODES } from './config';

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