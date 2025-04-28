"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatesInRange = getDatesInRange;
/**
 * Получает массив дат в диапазоне в формате YYYY-MM-DD
 * @param startDate Начальная дата
 * @param endDate Конечная дата
 * @param maxDays Максимальное количество дней для проверки
 * @returns Массив дат
 */
function getDatesInRange(startDate, endDate, maxDays) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const limitEnd = new Date(start);
    limitEnd.setDate(start.getDate() + maxDays - 1);
    const finalEnd = end < limitEnd ? end : limitEnd;
    const dates = [];
    const currentDate = new Date(start);
    while (currentDate <= finalEnd) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}
