"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizzApi = void 0;
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../../utils");
const logger_1 = require("../logger");
class WizzApi {
    constructor(apiUrl) {
        this.logger = new logger_1.Logger();
        this.apiUrl = apiUrl; //https://be.wizzair.com/27.7.0/Api
    }
    async getFligtsFromFarechart(origin, destination, date) {
        try {
            const requestData = {
                isRescueFare: false,
                adultCount: 1,
                childCount: 0,
                dayInterval: 7,
                wdc: false,
                isFlightChange: false,
                flightList: [
                    {
                        departureStation: origin,
                        arrivalStation: destination,
                        date: date,
                    },
                ],
            };
            const response = await axios_1.default.post(`${this.apiUrl}/asset/farechart`, requestData);
            if (!response.data.outboundFlights || response.data.outboundFlights.length === 0) {
                return null;
            }
            return response.data;
        }
        catch (error) {
            this.logApiError(error);
            return null;
        }
    }
    async getFlightsFromTimetable(origin, destination, date) {
        const datePlusOneMonth = new Date(date);
        datePlusOneMonth.setMonth(datePlusOneMonth.getMonth() + 1);
        const { start, end } = (0, utils_1.getCalendarMonthBoundaries)(date);
        const requestData = {
            flightList: [
                {
                    departureStation: origin,
                    arrivalStation: destination,
                    from: start,
                    to: end,
                },
                {
                    departureStation: destination,
                    arrivalStation: origin,
                    from: start,
                    to: end,
                },
            ],
            priceType: 'regular',
            adultCount: 1,
            childCount: 0,
            infantCount: 0,
        };
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/search/timetable`, requestData);
            return {
                ...response.data,
                outboundFlights: response.data.outboundFlights.filter((flight) => flight.departureStation === origin && flight.arrivalStation === destination),
            };
        }
        catch (error) {
            this.logApiError(error);
            return null;
        }
    }
    logApiError(error) {
        this.logger.error(`Error getting data from Wizzair API: ${error instanceof Error ? error.message : String(error)}`);
        if (axios_1.default.isAxiosError(error) && error.response) {
            this.logger.error(`Response status: ${error.response.status}`);
            this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
    }
}
exports.WizzApi = WizzApi;
