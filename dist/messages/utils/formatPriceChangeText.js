"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPriceChangeText = formatPriceChangeText;
const generators_1 = require("../../messages/generators");
const calculatePriceRange_1 = require("./calculatePriceRange");
function formatPriceChangeText(oldPrice, newPrice) {
    const { diff, percentDiff, isDecrease, isSignificant } = (0, calculatePriceRange_1.calculatePriceChange)(oldPrice, newPrice);
    return (0, generators_1.generatePriceChangeMessage)(isDecrease, isSignificant, diff, percentDiff);
}
