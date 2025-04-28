"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePriceAlertMessage = generatePriceAlertMessage;
const utils_1 = require("../utils");
function generatePriceAlertMessage(subscription, newPrice, oldPrice, flightInfo) {
    const isDecrease = newPrice < oldPrice;
    let message = isDecrease ? `✅ Снижение цены на билеты!\n\n` : `📈 Изменение цены на билеты!\n\n`;
    message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
    if (subscription.dateType === 'single') {
        message += `📅 Дата: ${subscription.date}\n`;
    }
    else {
        message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
        if (subscription.bestDate) {
            message += `📅 Лучшая дата: ${subscription.bestDate}\n`;
        }
    }
    if (flightInfo) {
        message += `✈️ Рейс: ${flightInfo.originCode} → ${flightInfo.destinationCode}\n`;
    }
    message += `\n💰 Старая цена: ${oldPrice} USD\n`;
    message += `💰 Новая цена: ${newPrice} USD\n`;
    message += (0, utils_1.formatPriceChangeText)(oldPrice, newPrice);
    return message;
}
