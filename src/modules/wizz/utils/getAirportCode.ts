import { AIRPORTS_CODES, CITY_CODES } from '../config';

export function getAirportCode(cityOrCode: string): string | null {
  const normalizedInput = cityOrCode.toLowerCase();

  const directMatch = AIRPORTS_CODES.find(
    (airport) => airport.iata.toLowerCase() === normalizedInput,
  );

  if (directMatch) {
    return directMatch.iata;
  }

  const cityCodeMatch = CITY_CODES.find((city) => city.code.toLowerCase() === normalizedInput);

  if (cityCodeMatch && cityCodeMatch.airports.length > 0) {
    return cityCodeMatch.airports[0];
  }

  const byNameMatch = AIRPORTS_CODES.find(
    (airport) =>
      airport.name.ru.toLowerCase().includes(normalizedInput) ||
      airport.name.en.toLowerCase().includes(normalizedInput),
  );

  return byNameMatch ? byNameMatch.iata : null;
}
