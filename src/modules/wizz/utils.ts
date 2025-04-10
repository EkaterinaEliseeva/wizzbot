import { AIRPORTS_CODES, CITY_CODES } from './config';

/**
 * Конвертирует дату из формата DD.MM.YYYY в YYYY-MM-DD
 * @param date Дата в формате DD.MM.YYYY
 * @returns Дата в формате YYYY-MM-DD
 */
export function convertDateFormat(date: string): string {
  const [day, month, year] = date.split('.');
  return `${year}-${month}-${day}`;
}

export function getAirportCode(cityOrCode: string): string | null {
  const normalizedInput = cityOrCode.toLowerCase();
  
  const directMatch = AIRPORTS_CODES.find(airport => 
    airport.iata.toLowerCase() === normalizedInput
  );

  if (directMatch) {
    return directMatch.iata;
  }

  const cityCodeMatch = CITY_CODES.find(city => 
    city.code.toLowerCase() === normalizedInput
  );

  if (cityCodeMatch && cityCodeMatch.airports.length > 0) {
    return cityCodeMatch.airports[0];
  }

  const byNameMatch = AIRPORTS_CODES.find(airport => 
    airport.name.ru.toLowerCase().includes(normalizedInput) || 
    airport.name.en.toLowerCase().includes(normalizedInput)
  );
  
  return byNameMatch ? byNameMatch.iata : null;
}

/**
 * Получает первый понедельник и последнее воскресенье полного календарного месяца
 * @param dateStr Дата в формате YYYY-MM-DD
 * @returns Объект с датами начала и конца месяца в формате YYYY-MM-DD
 */
export function getCalendarMonthBoundaries(dateStr: string): { start: string, end: string } {
  // Парсим дату из строки
  const date = new Date(dateStr);
  
  // Получаем первый день указанного месяца
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  
  // Находим первый понедельник (может быть в предыдущем месяце)
  // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Вычисляем первый понедельник, вычитая нужное количество дней
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() - daysToSubtract);
  
  // Получаем последний день указанного месяца
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  // Находим последнее воскресенье (может быть в следующем месяце)
  const lastDayOfWeek = lastDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  
  // Вычисляем последнее воскресенье, добавляя нужное количество дней
  const lastSunday = new Date(lastDay);
  lastSunday.setDate(lastDay.getDate() + daysToAdd);
  
  // Форматируем даты в YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    start: formatDate(firstMonday),
    end: formatDate(lastSunday)
  };
}