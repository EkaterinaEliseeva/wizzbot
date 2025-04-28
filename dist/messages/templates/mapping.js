"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TEMPLATES = void 0;
const access_denied_1 = require("./access-denied");
const error_1 = require("./error");
const help_1 = require("./help");
const in_progress_1 = require("./in-progress");
const subscribe_1 = require("./subscribe");
const subscription_adding_error_1 = require("./subscription-adding-error");
const subscription_deleted_1 = require("./subscription-deleted");
const subscription_not_found_1 = require("./subscription-not-found");
const welcome_1 = require("./welcome");
const wrong_date_format_1 = require("./wrong-date-format");
exports.MESSAGE_TEMPLATES = {
    ["WELCOME" /* MessagesEnum.WELCOME */]: welcome_1.WELCOME_MESSAGE,
    ["HELP" /* MessagesEnum.HELP */]: help_1.HELP_MESSAGE,
    ["SUBSCRIBE" /* MessagesEnum.SUBSCRIBE */]: subscribe_1.SUBSCRIBE_MESSAGE,
    ["SUBSCRIPTION_NOT_FOUND" /* MessagesEnum.SUBSCRIPTION_NOT_FOUND */]: subscription_not_found_1.SUBSCRIPTION_NOT_FOUND_MESSAGE,
    ["ACCESS_DENIED" /* MessagesEnum.ACCESS_DENIED */]: access_denied_1.ACCESS_DENIED_MESSAGE,
    ["IN_PROGRESS" /* MessagesEnum.IN_PROGRESS */]: in_progress_1.IN_PROGRESS_MESSAGE,
    ["ERROR" /* MessagesEnum.ERROR */]: error_1.ERROR_MESSAGE,
    ["SUBSCRIPTION_DELETED" /* MessagesEnum.SUBSCRIPTION_DELETED */]: subscription_deleted_1.SUBSCRIPTION_DELETED_MESSAGE,
    ["WRONG_DATE_FORMAT" /* MessagesEnum.WRONG_DATE_FORMAT */]: wrong_date_format_1.WRONG_DATE_FORMAT_MESSAGE,
    ["SUBSCRIPTION_ADDING_ERROR" /* MessagesEnum.SUBSCRIPTION_ADDING_ERROR */]: subscription_adding_error_1.SUBSCRIPTION_ADDING_ERROR_MESSAGE,
};
