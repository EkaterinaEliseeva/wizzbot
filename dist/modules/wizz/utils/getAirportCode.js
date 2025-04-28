"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAirportCode = getAirportCode;
const config_1 = require("../config");
function getAirportCode(cityOrCode) {
    const normalizedInput = cityOrCode.toLowerCase();
    const directMatch = config_1.AIRPORTS_CODES.find((airport) => airport.iata.toLowerCase() === normalizedInput);
    if (directMatch) {
        return directMatch.iata;
    }
    const cityCodeMatch = config_1.CITY_CODES.find((city) => city.code.toLowerCase() === normalizedInput);
    if (cityCodeMatch && cityCodeMatch.airports.length > 0) {
        return cityCodeMatch.airports[0];
    }
    const byNameMatch = config_1.AIRPORTS_CODES.find((airport) => airport.name.ru.toLowerCase().includes(normalizedInput) ||
        airport.name.en.toLowerCase().includes(normalizedInput));
    return byNameMatch ? byNameMatch.iata : null;
}
