"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSingleDateResult = isSingleDateResult;
function isSingleDateResult(result) {
    return result.success && !('bestDates' in result);
}
