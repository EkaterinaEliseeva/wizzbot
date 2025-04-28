"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChecker = void 0;
const generators_1 = require("../../messages/generators");
const utils_1 = require("../../utils");
const wizz_1 = require("../wizz");
const types_1 = require("./types");
const utils_2 = require("./utils");
class PriceChecker {
    constructor(logger, api, subscriptionManager) {
        this.logger = logger;
        this.api = api;
        this.subscriptionManager = subscriptionManager;
        this.check.bind(this);
    }
    async checkFlightPrice(origin, destination, date) {
        try {
            const originCodes = (0, wizz_1.getAllAirportCodes)(origin);
            const destinationCodes = (0, wizz_1.getAllAirportCodes)(destination);
            if (originCodes.length === 0 || destinationCodes.length === 0) {
                this.logger.error(`Не удалось найти коды IATA для ${originCodes.length === 0 ? origin : destination}`);
                return null;
            }
            if (!date) {
                const currentDate = new Date();
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                date = `${day}.${month}.${year}`;
            }
            const formattedDate = (0, utils_1.convertDateFormat)(date);
            this.logger.log(`Проверяем цену для ${origin} -> ${destination} на дату ${formattedDate}`);
            this.logger.log(`Аэропорты вылета: ${originCodes.join(', ')}`);
            this.logger.log(`Аэропорты прилета: ${destinationCodes.join(', ')}`);
            const prices = [];
            for (const originCode of originCodes) {
                for (const destinationCode of destinationCodes) {
                    this.logger.log(`Проверка комбинации: ${originCode} -> ${destinationCode}`);
                    const flightsData = await this.api.getFlightsFromTimetable(originCode, destinationCode, formattedDate);
                    if (flightsData &&
                        flightsData.outboundFlights &&
                        flightsData.outboundFlights.length > 0) {
                        const currentDateFlight = flightsData.outboundFlights.find((flight) => {
                            if (!flight.departureDate) {
                                return false;
                            }
                            const flightDateStr = flight.departureDate.split('T')[0];
                            return flightDateStr === formattedDate;
                        });
                        if (currentDateFlight) {
                            const price = Number(currentDateFlight.price.amount);
                            this.logger.log(`Найдена цена ${price} USD для ${originCode} -> ${destinationCode} на дату ${formattedDate}`);
                            prices.push({
                                price,
                                originCode,
                                destinationCode,
                            });
                        }
                    }
                }
            }
            if (prices.length > 0) {
                let minPriceInfo = prices[0];
                for (let i = 1; i < prices.length; i++) {
                    if (prices[i].price < minPriceInfo.price) {
                        minPriceInfo = prices[i];
                    }
                }
                this.logger.log(`Минимальная цена среди всех комбинаций: ${minPriceInfo.price} USD (${minPriceInfo.originCode} -> ${minPriceInfo.destinationCode})`);
                return {
                    price: minPriceInfo.price,
                    flightInfo: {
                        originCode: minPriceInfo.originCode,
                        destinationCode: minPriceInfo.destinationCode,
                    },
                };
            }
            this.logger.log(`Не удалось получить цену для ${origin} -> ${destination} на дату ${formattedDate}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Ошибка при получении данных: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    async checkFlightPriceRange(origin, destination, startDate, endDate, maxDaysToCheck = Number(process.env.MAX_DAYS_TO_CHECK || 7)) {
        try {
            const originCodes = (0, wizz_1.getAllAirportCodes)(origin);
            const destinationCodes = (0, wizz_1.getAllAirportCodes)(destination);
            if (originCodes.length === 0 || destinationCodes.length === 0) {
                this.logger.error(`Не удалось найти коды IATA для ${originCodes.length === 0 ? origin : destination}`);
                return null;
            }
            const startDateFormatted = (0, utils_1.convertDateFormat)(startDate);
            const endDateFormatted = (0, utils_1.convertDateFormat)(endDate);
            this.logger.log(`Проверка цен в диапазоне ${startDateFormatted} - ${endDateFormatted}`);
            this.logger.log(`Аэропорты вылета: ${originCodes.join(', ')}`);
            this.logger.log(`Аэропорты прилета: ${destinationCodes.join(', ')}`);
            const dates = (0, utils_1.getDatesInRange)(startDateFormatted, endDateFormatted, maxDaysToCheck);
            const allResults = [];
            for (const originCode of originCodes) {
                for (const destinationCode of destinationCodes) {
                    this.logger.log(`Проверка комбинации: ${originCode} -> ${destinationCode}`);
                    const flightsData = await this.api.getFlightsFromTimetable(originCode, destinationCode, startDateFormatted);
                    if (flightsData &&
                        flightsData.outboundFlights &&
                        flightsData.outboundFlights.length > 0) {
                        for (const dateStr of dates) {
                            const currentDateFlight = flightsData.outboundFlights.find((flight) => {
                                if (!flight.departureDate) {
                                    return false;
                                }
                                const flightDateStr = flight.departureDate.split('T')[0];
                                return flightDateStr === dateStr;
                            });
                            if (currentDateFlight) {
                                const price = Number(currentDateFlight.price.amount);
                                const readableDate = (0, utils_1.formatDateForDisplay)(dateStr);
                                this.logger.log(`${readableDate}: ${price} USD (${originCode} -> ${destinationCode})`);
                                allResults.push({
                                    date: readableDate,
                                    price,
                                    originCode,
                                    destinationCode,
                                });
                            }
                        }
                    }
                }
            }
            if (allResults.length === 0) {
                this.logger.log(`Не найдено рейсов в указанном диапазоне`);
                return null;
            }
            const minPrice = Math.min(...allResults.map((item) => item.price));
            const bestDates = allResults
                .filter((item) => item.price === minPrice)
                .map((item) => ({
                date: item.date,
                price: item.price,
                originCode: item.originCode,
                destinationCode: item.destinationCode,
            }));
            this.logger.log(`Лучшие даты и комбинации аэропортов:`);
            bestDates.forEach((item) => {
                this.logger.log(`${item.date}: ${item.price} USD (${item.originCode} -> ${item.destinationCode})`);
            });
            return {
                bestDates,
                minPrice,
            };
        }
        catch (error) {
            this.logger.error(`Ошибка при получении данных: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    async checkSingleDateSubscriptionPrice(subscription) {
        try {
            if (!subscription.date) {
                return {
                    success: false,
                    message: 'В подписке не указана дата',
                };
            }
            const currentPrice = await this.checkFlightPrice(subscription.origin, subscription.destination, subscription.date);
            if (!currentPrice) {
                return {
                    success: false,
                    message: 'Не удалось получить информацию о цене',
                };
            }
            const oldPrice = subscription.lastPrice;
            const priceChanged = oldPrice !== undefined && currentPrice.price !== oldPrice;
            const flightInfo = currentPrice.flightInfo
                ? {
                    originCode: currentPrice.flightInfo.originCode,
                    destinationCode: currentPrice.flightInfo.destinationCode,
                    date: subscription.date,
                }
                : undefined;
            await this.subscriptionManager.updateSubscriptionPrice(subscription.id, currentPrice.price);
            return {
                success: true,
                oldPrice,
                newPrice: currentPrice.price,
                priceChanged,
                flightInfo,
            };
        }
        catch (error) {
            this.logger.error(`Ошибка при получении данных: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Произошла ошибка при проверке цены',
            };
        }
    }
    async checkDateRangeSubscriptionPrice(subscription) {
        try {
            if (!subscription.startDate || !subscription.endDate) {
                return {
                    success: false,
                    message: 'В подписке не указан диапазон дат',
                };
            }
            const priceRangeInfo = await this.checkFlightPriceRange(subscription.origin, subscription.destination, subscription.startDate, subscription.endDate);
            if (!priceRangeInfo || priceRangeInfo.bestDates.length === 0) {
                return {
                    success: false,
                    message: 'Не удалось получить информацию о ценах в указанном диапазоне',
                };
            }
            const { bestDates, minPrice } = priceRangeInfo;
            const oldPrice = subscription.lastPrice;
            const priceChanged = oldPrice !== undefined && minPrice !== oldPrice;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const datesChanged = (0, utils_2.areBestDatesChanged)(subscription.bestDates, bestDates);
            await this.subscriptionManager.updateBestDates(subscription.id, bestDates, minPrice);
            return {
                success: true,
                oldPrice,
                newPrice: minPrice,
                priceChanged,
                bestDates,
                datesChanged,
            };
        }
        catch (error) {
            this.logger.error(`Ошибка при получении данных: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Произошла ошибка при проверке цен',
            };
        }
    }
    async checkSubscriptionPrice(subscription) {
        if (subscription.dateType === 'single') {
            return this.checkSingleDateSubscriptionPrice(subscription);
        }
        else if (subscription.dateType === 'range') {
            return this.checkDateRangeSubscriptionPrice(subscription);
        }
        else {
            return {
                success: false,
                message: 'Неизвестный тип подписки',
            };
        }
    }
    async check(bot) {
        try {
            const subscriptions = await this.subscriptionManager.getAllSubscriptions();
            for (const subscription of subscriptions) {
                try {
                    this.logger.log(`Check subscription ${subscription.id}: ${subscription.origin} -> ${subscription.destination}`);
                    const result = await this.checkSubscriptionPrice(subscription);
                    if (result.success) {
                        this.logger.log(`Succesfull check for subscription ${subscription.id}`);
                        if ((0, types_1.isSingleDateResult)(result) &&
                            result.priceChanged &&
                            result.newPrice &&
                            result.oldPrice) {
                            const message = (0, generators_1.generatePriceAlertMessage)(subscription, result.newPrice, result.oldPrice);
                            bot.sendMessage(subscription.chatId, message);
                        }
                        else if ((0, types_1.isDateRangeResult)(result) && (result.priceChanged || result.datesChanged)) {
                            const message = (0, generators_1.generateBestDatesAlertMessage)(subscription, result.bestDates, result.oldPrice, true);
                            bot.sendMessage(subscription.chatId, message);
                        }
                        else {
                            this.logger.log(`No changes`);
                        }
                    }
                    else {
                        this.logger.error(`Check failed for subscription ${subscription.id}: ${result.message}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Check failed for subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Error during price check: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.PriceChecker = PriceChecker;
