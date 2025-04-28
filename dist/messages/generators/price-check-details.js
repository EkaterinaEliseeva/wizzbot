"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePriceCheckDetailsMessage = generatePriceCheckDetailsMessage;
const utils_1 = require("../utils");
function generatePriceCheckDetailsMessage(subscription, result, includeRouteInfo = true) {
    if (!result.success) {
        return null;
    }
    let message = '';
    message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
    if (subscription.dateType === 'single') {
        message += `📅 Дата: ${subscription.date}\n`;
    }
    else {
        message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
    }
    if ('newPrice' in result && result.newPrice !== undefined) {
        message += `💰 Текущая цена: ${result.newPrice} USD\n`;
        if ('oldPrice' in result && result.oldPrice !== undefined) {
            message += `💰 Предыдущая цена: ${result.oldPrice} USD\n`;
            if (result.priceChanged) {
                message += (0, utils_1.formatPriceChangeText)(result.oldPrice, result.newPrice);
            }
        }
    }
    if ('flightInfo' in result && result.flightInfo && includeRouteInfo) {
        message += `\n✈️ Рейс: ${result.flightInfo.originCode} → ${result.flightInfo.destinationCode}\n`;
    }
    if ('bestDates' in result && result.bestDates && result.bestDates.length > 0) {
        if (result.bestDates.length === 1) {
            message += `\n📅 Лучшая дата: ${result.bestDates[0].date}`;
            if (includeRouteInfo &&
                result.bestDates[0].originCode &&
                result.bestDates[0].destinationCode) {
                message += ` (${result.bestDates[0].originCode} → ${result.bestDates[0].destinationCode})`;
            }
            message += `\n`;
        }
        else {
            message += `\n📅 Лучшие даты:\n`;
            result.bestDates.forEach((item, index) => {
                message += `   ${index + 1}. ${item.date}`;
                if (includeRouteInfo && item.originCode && item.destinationCode) {
                    message += ` (${item.originCode} → ${item.destinationCode})`;
                }
                message += `\n`;
            });
        }
    }
    return message;
}
