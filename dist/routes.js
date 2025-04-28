"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRoute = void 0;
const file_system_1 = require("./modules/file-system");
const logger_1 = require("./modules/logger");
const price_checker_1 = require("./modules/price-checker");
const subscription_1 = require("./modules/subscription");
const wizz_1 = require("./modules/wizz");
const testRoute = (_req, res) => {
    try {
        const priceChecker = new price_checker_1.PriceChecker(new logger_1.Logger(), new wizz_1.WizzApi(process.env.WIZZ_API_URL), new subscription_1.SubscriptionManager(new file_system_1.FileSystemManager()));
        priceChecker
            .checkFlightPriceRange('Ереван', 'Рим', '2025-06-18', '2025-06-25')
            .then(console.log)
            .catch(console.error);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.testRoute = testRoute;
