"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSubscriptionStatusesMessage = void 0;
const generateSubscriptionStatusesMessage = (subscriptions) => {
    let message = '';
    if (subscriptions.length === 0) {
        message =
            '🔍 У вас пока нет активных подписок. Используйте /subscribe, чтобы создать подписку.';
    }
    else {
        message = '📋 Ваши подписки на авиабилеты:\n\n';
        for (let index = 0; index < subscriptions.length; index++) {
            const sub = subscriptions[index];
            message += `${index + 1}. ${sub.origin} ➡️ ${sub.destination}\n`;
            if (sub.dateType === 'single') {
                message += `   📅 Дата: ${sub.date}\n`;
            }
            else {
                message += `   📅 Период: ${sub.startDate} - ${sub.endDate}\n`;
                if (sub.bestDates && sub.bestDates.length > 0) {
                    if (sub.bestDates.length === 1) {
                        message += `   🔥 Лучшая дата: ${sub.bestDates[0].date}\n`;
                    }
                    else {
                        message += `   🔥 Лучшие даты:\n`;
                        sub.bestDates.forEach((dateInfo, idx) => {
                            message += `      ${idx + 1}. ${dateInfo.date}\n`;
                        });
                    }
                }
                else if (sub.bestDate) {
                    message += `   🔥 Лучшая дата: ${sub.bestDate}\n`;
                }
            }
            if (sub.lastPrice) {
                message += `   💰 Текущая цена: ${sub.lastPrice} USD\n`;
            }
            else {
                message += `   💰 Цена: информация недоступна\n`;
            }
            message += `   🔄 /check_${sub.id} - Проверить цену\n`;
            message += `   🗑 /remove_${sub.id} - Удалить подписку\n\n`;
        }
    }
    return message;
};
exports.generateSubscriptionStatusesMessage = generateSubscriptionStatusesMessage;
