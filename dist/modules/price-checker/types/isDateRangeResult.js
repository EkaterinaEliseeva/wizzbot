"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDateRangeResult = isDateRangeResult;
function isDateRangeResult(result) {
    return result.success && 'bestDates' in result;
}
