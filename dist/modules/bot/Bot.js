"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const config_1 = require("../../config");
const messages_1 = require("../../messages");
const BotUsers_1 = require("./BotUsers");
class Bot {
    constructor(token, subscriptionsManager, priceChecker) {
        if (!token) {
            throw new Error('Токен Telegram бота не предоставлен');
        }
        this.bot = new node_telegram_bot_api_1.default(token, { polling: true });
        this.subscriptionsManager = subscriptionsManager;
        this.priceChecker = priceChecker;
        this.users = new BotUsers_1.BotUsers();
        this.initializeCommands();
    }
    initializeCommands() {
        this.bot.onText(/\/start/, this.onStart.bind(this));
        this.bot.onText(/\/help/, this.onHelp.bind(this));
        this.bot.onText(/\/subscribe/, this.onSubscribe.bind(this));
        this.bot.onText(/\/subscriptions/, this.onSubscriptions.bind(this));
        this.bot.onText(/\/check_(.+)/, this.onCheck.bind(this));
        this.bot.onText(/\/remove_(.+)/, this.onRemove.bind(this));
        this.bot.on('message', this.onMessage.bind(this));
        this.setupCallbackQueryHandlers();
    }
    onStart(msg) {
        const chatId = msg.chat.id;
        this.sendMessageTemplate(chatId, "WELCOME" /* MessagesEnum.WELCOME */);
    }
    onHelp(msg) {
        const chatId = msg.chat.id;
        this.sendMessageTemplate(chatId, "HELP" /* MessagesEnum.HELP */);
    }
    onSubscribe(msg) {
        const chatId = msg.chat.id;
        this.users.add(chatId);
        this.sendMessageTemplate(chatId, "SUBSCRIBE" /* MessagesEnum.SUBSCRIBE */, {
            reply_markup: {
                force_reply: true,
            },
        });
    }
    onSubscriptions(msg) {
        const chatId = msg.chat.id;
        this.subscriptionsManager
            .getSubscriptionsByChatId(chatId)
            .then(messages_1.generateSubscriptionStatusesMessage)
            .then((message) => this.bot.sendMessage(chatId, message))
            .catch(console.error);
    }
    onCheck(msg, match) {
        if (!match || !match[1]) {
            return;
        }
        const chatId = msg.chat.id;
        const subscriptionId = match[1];
        this.checkSubscription(subscriptionId, chatId).catch(console.error);
    }
    onRemove(msg, match) {
        if (!match || !match[1]) {
            return;
        }
        const chatId = msg.chat.id;
        const subscriptionId = match[1];
        this.subscriptionsManager
            .removeSubscription(chatId, subscriptionId)
            .then(() => this.sendMessageTemplate(chatId, "SUBSCRIPTION_DELETED" /* MessagesEnum.SUBSCRIPTION_DELETED */))
            .catch(console.error);
    }
    onMessage(msg) {
        if (!msg.text || msg.text.startsWith('/')) {
            return;
        }
        const chatId = msg.chat.id;
        const userState = this.users.getById(chatId);
        if (!userState) {
            return;
        }
        this.processUserDialog(userState, msg.text).catch(console.error);
    }
    /**
     * Checks the price for a given subscription and sends a message to the user with the result.
     * @param subscriptionId The ID of the subscription to check
     * @param chatId The Telegram chat ID to send the result to
     * @returns A promise that resolves when the check is complete and the message is sent
     *
     * If the subscription is not found or the chat ID does not match the subscription's owner,
     * an appropriate error message is sent to the user. If the price check is successful,
     * the result is formatted and sent to the user. In case of an error during the process,
     * a generic error message is sent.
     */
    async checkSubscription(subscriptionId, chatId) {
        try {
            const subscription = await this.subscriptionsManager.getSubscriptionById(subscriptionId);
            if (!subscription) {
                return this.sendMessageTemplate(chatId, "SUBSCRIPTION_NOT_FOUND" /* MessagesEnum.SUBSCRIPTION_NOT_FOUND */);
            }
            if (subscription.chatId !== chatId) {
                return this.sendMessageTemplate(chatId, "ACCESS_DENIED" /* MessagesEnum.ACCESS_DENIED */);
            }
            await this.bot.sendMessage(chatId, messages_1.MESSAGE_TEMPLATES["IN_PROGRESS" /* MessagesEnum.IN_PROGRESS */]);
            const result = await this.priceChecker.checkSubscriptionPrice(subscription);
            if (result.success) {
                const message = (0, messages_1.generatePriceCheckMessage)(subscription, result);
                await this.bot.sendMessage(chatId, message);
            }
            else {
                await this.bot.sendMessage(chatId, messages_1.MESSAGE_TEMPLATES["ERROR" /* MessagesEnum.ERROR */]);
            }
        }
        catch (error) {
            console.error('Ошибка при проверке цены:', error);
            await this.bot.sendMessage(chatId, messages_1.MESSAGE_TEMPLATES["ERROR" /* MessagesEnum.ERROR */]);
        }
    }
    /**
     * Handles the user's dialog for creating a subscription
     * @param state The current state of the user
     * @param text The user's input
     * @returns A promise that resolves when the dialog is complete
     *
     * The function processes the user's input and updates the state accordingly.
     * In case of an error during the dialog, an appropriate error message is sent to the user.
     * When the dialog is complete, the function calls createSubscription() to create the subscription.
     */
    async processUserDialog(state, text) {
        const { chatId, stage, subscription } = state;
        switch (stage) {
            case "waiting_origin" /* UserStageEnum.WAITING_ORIGIN */:
                subscription.origin = text.trim();
                state.stage = "waiting_destination" /* UserStageEnum.WAITING_DESTINATION */;
                await this.bot.sendMessage(chatId, (0, messages_1.generateWaitingDestinationMessage)(subscription.origin), {
                    reply_markup: {
                        force_reply: true,
                    },
                });
                break;
            case "waiting_destination" /* UserStageEnum.WAITING_DESTINATION */:
                subscription.destination = text.trim();
                state.stage = "waiting_date" /* UserStageEnum.WAITING_DATE */;
                await this.bot.sendMessage(chatId, (0, messages_1.generateWaitingDateMessage)(subscription.origin, subscription.destination), {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: config_1.LABELS.dateSingle, callback_data: 'date_single' },
                                { text: config_1.LABELS.dateRange, callback_data: 'date_range' },
                            ],
                        ],
                    },
                });
                break;
            case "waiting_date" /* UserStageEnum.WAITING_DATE */:
                subscription.dateType = 'single';
                subscription.date = text.trim();
                await this.createSubscription(state);
                break;
            case "waiting_date_range" /* UserStageEnum.WAITING_DATE_RANGE */:
                try {
                    const [startDate, endDate] = text.split('-').map((d) => d.trim());
                    if (!startDate || !endDate) {
                        throw new Error('Неверный формат');
                    }
                    subscription.dateType = 'range';
                    subscription.startDate = startDate;
                    subscription.endDate = endDate;
                    await this.createSubscription(state);
                }
                catch (e) {
                    this.sendMessageTemplate(chatId, "WRONG_DATE_FORMAT" /* MessagesEnum.WRONG_DATE_FORMAT */);
                }
                break;
        }
    }
    /**
     * Finishes subscription creation process, saves subscription to database and sends message about subscription creation
     * @param state - user state with chatId and subscription
     */
    async createSubscription(state) {
        const { chatId, subscription } = state;
        try {
            const newSubscription = await this.subscriptionsManager.addSubscription(subscription);
            await this.bot.sendMessage(chatId, (0, messages_1.generateSubscriptionCreatedMessage)(newSubscription));
            const result = await this.priceChecker.checkSubscriptionPrice(newSubscription);
            if (result.success) {
                await this.bot.sendMessage(chatId, (0, messages_1.generatePriceCheckMessage)(newSubscription, result));
            }
            else {
                await this.bot.sendMessage(chatId, messages_1.MESSAGE_TEMPLATES["ERROR" /* MessagesEnum.ERROR */]);
            }
            this.users.delete(chatId);
        }
        catch (error) {
            console.error('Error during subscription creation:', error);
            await this.bot.sendMessage(chatId, messages_1.MESSAGE_TEMPLATES["SUBSCRIPTION_ADDING_ERROR" /* MessagesEnum.SUBSCRIPTION_ADDING_ERROR */]);
            this.users.delete(chatId);
        }
    }
    /**
     * Handles callback queries from user
     *
     * Listens for callback_query event on Telegram bot and processes user's input
     * accordingly. Depending on the user's current state, it either asks for a date
     * or a date range and updates the user's state.
     */
    setupCallbackQueryHandlers() {
        this.bot.on('callback_query', async (query) => {
            if (!query.message || !query.data) {
                return;
            }
            const chatId = query.message.chat.id;
            const userState = this.users.getById(chatId);
            if (!userState) {
                return;
            }
            const messageId = query.message.message_id;
            if (query.data === 'date_single') {
                userState.stage = "waiting_date" /* UserStageEnum.WAITING_DATE */;
                await this.bot.editMessageText(config_1.LABELS.chooseSingleDate, {
                    chat_id: chatId,
                    message_id: messageId,
                });
                await this.bot.sendMessage(chatId, config_1.LABELS.typeDate, {
                    reply_markup: { force_reply: true },
                });
            }
            else if (query.data === 'date_range') {
                userState.stage = "waiting_date_range" /* UserStageEnum.WAITING_DATE_RANGE */;
                await this.bot.editMessageText(config_1.LABELS.chooseDateRange, {
                    chat_id: chatId,
                    message_id: messageId,
                });
                await this.bot.sendMessage(chatId, config_1.LABELS.typeDateRange, {
                    reply_markup: { force_reply: true },
                });
            }
        });
    }
    /**
     * Sends a message to a specific chat ID based on a message template.
     * @param chatId The Telegram chat ID to send the message to
     * @param template The message template to use from the MESSAGE_TEMPLATES object
     * @see MESSAGE_TEMPLATES
     */
    sendMessageTemplate(chatId, template, options) {
        this.sendMessage(chatId, messages_1.MESSAGE_TEMPLATES[template], options);
    }
    /**
     * Sends a message to a specific chat ID.
     * @param chatId The Telegram chat ID to send the message to
     * @param message The message to send
     * @returns A promise with the sent message
     */
    sendMessage(chatId, message, options) {
        this.bot
            .sendMessage(chatId, message, options)
            .then((msg) => console.log(JSON.stringify(msg)))
            .catch(console.error);
    }
}
exports.Bot = Bot;
