"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const cron_1 = require("cron");
class Planner {
    addJob(interval = '0 */1 * * *', callback) {
        new cron_1.CronJob(interval, callback, null, true);
    }
}
exports.Planner = Planner;
