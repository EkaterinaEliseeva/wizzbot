"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWaitingDateMessage = generateWaitingDateMessage;
function generateWaitingDateMessage(origin, destination) {
    return `🏙 Город отправления: ${origin}\n🏝 Город прибытия: ${destination}\n\nВыберите тип даты:`;
}
