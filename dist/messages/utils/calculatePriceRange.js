"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePriceChange = calculatePriceChange;
function calculatePriceChange(oldPrice, newPrice) {
    const diff = Math.abs(oldPrice - newPrice);
    const percentDiff = Math.round((diff / oldPrice) * 100);
    const isDecrease = newPrice < oldPrice;
    const isSignificant = percentDiff >= 20;
    return {
        diff,
        percentDiff,
        isDecrease,
        isSignificant,
    };
}
