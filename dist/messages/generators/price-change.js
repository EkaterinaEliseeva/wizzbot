"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePriceChangeMessage = generatePriceChangeMessage;
function generatePriceChangeMessage(isDecrease, isSignificant, diff, percentDiff) {
    let message = '';
    if (isDecrease) {
        if (isSignificant) {
            message += `💹 Значительное снижение: ${diff} USD (-${percentDiff}%)! 🔥\n`;
            message += `\nРекомендуем рассмотреть покупку билетов!`;
        }
        else {
            message += `💹 Снижение: ${diff} USD (-${percentDiff}%)\n`;
        }
    }
    else {
        if (isSignificant) {
            message += `📈 Значительное повышение: ${diff} USD (+${percentDiff}%) ⚠️\n`;
        }
        else {
            message += `📈 Повышение: ${diff} USD (+${percentDiff}%)\n`;
        }
    }
    return message;
}
