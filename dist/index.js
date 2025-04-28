"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const bot_1 = require("./modules/bot");
const file_system_1 = require("./modules/file-system");
const logger_1 = require("./modules/logger");
const planner_1 = require("./modules/planner");
const price_checker_1 = require("./modules/price-checker");
const subscription_1 = require("./modules/subscription");
const wizz_1 = require("./modules/wizz");
const routes_1 = require("./routes");
dotenv_1.default.config();
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан в .env файле');
}
if (!process.env.WIZZ_API_URL) {
    throw new Error('WIZZ_API_URL не задан в .env файле');
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
function startApp() {
    const logger = new logger_1.Logger();
    const fileSystemManager = new file_system_1.FileSystemManager();
    const subscriptionsManager = new subscription_1.SubscriptionManager(fileSystemManager);
    const api = new wizz_1.WizzApi(process.env.WIZZ_API_URL);
    const priceChecker = new price_checker_1.PriceChecker(logger, api, subscriptionsManager);
    const bot = new bot_1.Bot(process.env.TELEGRAM_BOT_TOKEN, subscriptionsManager, priceChecker);
    const priceCheckInterval = process.env.CHECK_INTERVAL || '0 */1 * * *';
    new planner_1.Planner().addJob(priceCheckInterval, () => priceChecker.check(bot));
}
startApp();
app.get('/', (_req, res) => {
    res.send('Flight Price Tracker is working!');
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Bot started');
    console.log(`Price check planned: ${process.env.CHECK_INTERVAL || '0 */1 * * *'}`);
});
app.get('/test', routes_1.testRoute);
