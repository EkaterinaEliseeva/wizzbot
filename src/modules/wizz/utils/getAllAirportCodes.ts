import { AIRPORTS_CODES, CITY_CODES } from '../config';

/**
 * Получает все возможные коды аэропортов для города или код аэропорта
 * @param cityOrCode Название города или код аэропорта
 * @returns Массив IATA кодов аэропортов
 */
export function getAllAirportCodes(cityOrCode: string): string[] {
  const normalizedInput = cityOrCode.toLowerCase();
  const results: string[] = [];

  // Проверяем, является ли ввод прямым IATA кодом аэропорта
  const directMatch = AIRPORTS_CODES.find(
    (airport) => airport.iata.toLowerCase() === normalizedInput,
  );

  if (directMatch) {
    return [directMatch.iata];
  }

  // Проверяем, является ли ввод кодом города
  const cityCodeMatch = CITY_CODES.find((city) => city.code.toLowerCase() === normalizedInput);

  if (cityCodeMatch && cityCodeMatch.airports.length > 0) {
    return [...cityCodeMatch.airports];
  }

  // Проверяем соответствие по имени города или аэропорта
  const airportNameMatches = AIRPORTS_CODES.filter(
    (airport) =>
      airport.name.ru.toLowerCase().includes(normalizedInput) ||
      airport.name.en.toLowerCase().includes(normalizedInput),
  );

  if (airportNameMatches.length > 0) {
    return airportNameMatches.map((airport) => airport.iata);
  }

  // Проверяем название города
  const cityNameMatch = CITY_CODES.find(
    (city) =>
      city.name.ru.toLowerCase().includes(normalizedInput) ||
      city.name.en.toLowerCase().includes(normalizedInput),
  );

  if (cityNameMatch && cityNameMatch.airports.length > 0) {
    return [...cityNameMatch.airports];
  }

  return results;
}
