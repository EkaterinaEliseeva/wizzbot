"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateForDisplay = formatDateForDisplay;
/**
 * Преобразует дату из формата YYYY-MM-DD в ДД.ММ.ГГГГ
 * @param dateStr Дата в формате YYYY-MM-DD
 * @returns Дата в формате ДД.ММ.ГГГГ
 */
function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}
