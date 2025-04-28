"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDateFormat = convertDateFormat;
/**
 * Конвертирует дату из формата DD.MM.YYYY в YYYY-MM-DD
 * @param date Дата в формате DD.MM.YYYY
 * @returns Дата в формате YYYY-MM-DD
 */
function convertDateFormat(date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
        const [day, month, year] = date.split('.');
        return `${year}-${month}-${day}`;
    }
    try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    catch (e) {
        console.error(`Ошибка при парсинге даты ${date}:`, e);
    }
    throw new Error(`Не удалось преобразовать дату ${date}`);
}
