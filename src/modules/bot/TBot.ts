import TelegramBot from 'node-telegram-bot-api';

import { LABELS } from '../../config';
import {
  generatePriceCheckMessage,
  generateSubscriptionCreatedMessage,
  generateSubscriptionStatusesMessage,
  generateWaitingDateMessage,
  generateWaitingDestinationMessage,
  MESSAGE_TEMPLATES,
  MessagesEnum,
} from '../../messages';
import type { PriceChecker } from '../price-checker';
import type { ISubscription, SubscriptionManager } from '../subscription';

import { BotUsers } from './BotUsers';
import type { IUserState } from './types';
import { UserStageEnum } from './types/UserStageEnum';

export class Bot {
  bot: TelegramBot;
  users: BotUsers;
  subscriptionsManager: SubscriptionManager;
  priceChecker: PriceChecker;

  constructor(
    token: string,
    subscriptionsManager: SubscriptionManager,
    priceChecker: PriceChecker,
  ) {
    if (!token) {
      throw new Error('Токен Telegram бота не предоставлен');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.subscriptionsManager = subscriptionsManager;
    this.priceChecker = priceChecker;
    this.users = new BotUsers();
    this.initializeCommands();
  }

  initializeCommands(): void {
    this.bot.onText(/\/start/, this.onStart.bind(this));
    this.bot.onText(/\/help/, this.onHelp.bind(this));
    this.bot.onText(/\/subscribe/, this.onSubscribe.bind(this));
    this.bot.onText(/\/subscriptions/, this.onSubscriptions.bind(this));

    this.bot.onText(/\/check_(.+)/, this.onCheck.bind(this));
    this.bot.onText(/\/remove_(.+)/, this.onRemove.bind(this));

    this.bot.on('message', this.onMessage.bind(this));

    this.setupCallbackQueryHandlers();
  }

  onStart(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;

    this.sendMessageTemplate(chatId, MessagesEnum.WELCOME);
  }

  onHelp(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;

    this.sendMessageTemplate(chatId, MessagesEnum.HELP);
  }

  onSubscribe(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;

    this.users.add(chatId);

    this.sendMessageTemplate(chatId, MessagesEnum.SUBSCRIBE, {
      reply_markup: {
        force_reply: true,
      },
    });
  }

  onSubscriptions(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;

    this.subscriptionsManager
      .getSubscriptionsByChatId(chatId)
      .then(generateSubscriptionStatusesMessage)
      .then((message: string) => this.bot.sendMessage(chatId, message))
      .catch(console.error);
  }

  onCheck(msg: TelegramBot.Message, match: RegExpExecArray | null): void {
    if (!match || !match[1]) {
      return;
    }

    const chatId = msg.chat.id;
    const subscriptionId = match[1];

    this.checkSubscription(subscriptionId, chatId).catch(console.error);
  }

  onRemove(msg: TelegramBot.Message, match: RegExpExecArray | null): void {
    if (!match || !match[1]) {
      return;
    }

    const chatId = msg.chat.id;
    const subscriptionId = match[1];

    this.subscriptionsManager
      .removeSubscription(chatId, subscriptionId)
      .then(() => this.sendMessageTemplate(chatId, MessagesEnum.SUBSCRIPTION_DELETED))
      .catch(console.error);
  }

  onMessage(msg: TelegramBot.Message): void {
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
  async checkSubscription(subscriptionId: string, chatId: TelegramBot.ChatId): Promise<void> {
    try {
      const subscription = await this.subscriptionsManager.getSubscriptionById(subscriptionId);

      if (!subscription) {
        return this.sendMessageTemplate(chatId, MessagesEnum.SUBSCRIPTION_NOT_FOUND);
      }

      if (subscription.chatId !== chatId) {
        return this.sendMessageTemplate(chatId, MessagesEnum.ACCESS_DENIED);
      }

      await this.bot.sendMessage(chatId, MESSAGE_TEMPLATES[MessagesEnum.IN_PROGRESS]);

      const result = await this.priceChecker.checkSubscriptionPrice(subscription);

      if (result.success) {
        const message = generatePriceCheckMessage(subscription, result);

        await this.bot.sendMessage(chatId, message);
      } else {
        await this.bot.sendMessage(chatId, MESSAGE_TEMPLATES[MessagesEnum.ERROR]);
      }
    } catch (error) {
      console.error('Ошибка при проверке цены:', error);

      await this.bot.sendMessage(chatId, MESSAGE_TEMPLATES[MessagesEnum.ERROR]);
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
  async processUserDialog(state: IUserState, text: string): Promise<void> {
    const { chatId, stage, subscription } = state;

    switch (stage) {
      case UserStageEnum.WAITING_ORIGIN:
        subscription.origin = text.trim();
        state.stage = UserStageEnum.WAITING_DESTINATION;

        await this.bot.sendMessage(chatId, generateWaitingDestinationMessage(subscription.origin), {
          reply_markup: {
            force_reply: true,
          },
        });
        break;

      case UserStageEnum.WAITING_DESTINATION:
        subscription.destination = text.trim();
        state.stage = UserStageEnum.WAITING_DATE;

        await this.bot.sendMessage(
          chatId,
          generateWaitingDateMessage(subscription.origin as string, subscription.destination),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: LABELS.dateSingle, callback_data: 'date_single' },
                  { text: LABELS.dateRange, callback_data: 'date_range' },
                ],
              ],
            },
          },
        );
        break;

      case UserStageEnum.WAITING_DATE:
        subscription.dateType = 'single';
        subscription.date = text.trim();

        await this.createSubscription(state);
        break;

      case UserStageEnum.WAITING_DATE_RANGE:
        try {
          const [startDate, endDate] = text.split('-').map((d) => d.trim());

          if (!startDate || !endDate) {
            throw new Error('Неверный формат');
          }

          subscription.dateType = 'range';
          subscription.startDate = startDate;
          subscription.endDate = endDate;

          await this.createSubscription(state);
        } catch (e) {
          this.sendMessageTemplate(chatId, MessagesEnum.WRONG_DATE_FORMAT);
        }
        break;
    }
  }

  /**
   * Finishes subscription creation process, saves subscription to database and sends message about subscription creation
   * @param state - user state with chatId and subscription
   */

  async createSubscription(state: IUserState): Promise<void> {
    const { chatId, subscription } = state;

    try {
      const newSubscription = await this.subscriptionsManager.addSubscription(
        subscription as ISubscription,
      );

      await this.bot.sendMessage(chatId, generateSubscriptionCreatedMessage(newSubscription));

      const result = await this.priceChecker.checkSubscriptionPrice(newSubscription);

      if (result.success) {
        await this.bot.sendMessage(chatId, generatePriceCheckMessage(newSubscription, result));
      } else {
        await this.bot.sendMessage(chatId, MESSAGE_TEMPLATES[MessagesEnum.ERROR]);
      }

      this.users.delete(chatId);
    } catch (error) {
      console.error('Error during subscription creation:', error);

      await this.bot.sendMessage(chatId, MESSAGE_TEMPLATES[MessagesEnum.SUBSCRIPTION_ADDING_ERROR]);
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
  setupCallbackQueryHandlers(): void {
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
        userState.stage = UserStageEnum.WAITING_DATE;

        await this.bot.editMessageText(LABELS.chooseSingleDate, {
          chat_id: chatId,
          message_id: messageId,
        });

        await this.bot.sendMessage(chatId, LABELS.typeDate, {
          reply_markup: { force_reply: true },
        });
      } else if (query.data === 'date_range') {
        userState.stage = UserStageEnum.WAITING_DATE_RANGE;

        await this.bot.editMessageText(LABELS.chooseDateRange, {
          chat_id: chatId,
          message_id: messageId,
        });

        await this.bot.sendMessage(chatId, LABELS.typeDateRange, {
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
  sendMessageTemplate(
    chatId: TelegramBot.ChatId,
    template: MessagesEnum,
    options?: TelegramBot.SendMessageOptions,
  ): void {
    this.sendMessage(chatId, MESSAGE_TEMPLATES[template], options);
  }

  /**
   * Sends a message to a specific chat ID.
   * @param chatId The Telegram chat ID to send the message to
   * @param message The message to send
   * @returns A promise with the sent message
   */
  sendMessage(
    chatId: TelegramBot.ChatId,
    message: string,
    options?: TelegramBot.SendMessageOptions,
  ): void {
    this.bot
      .sendMessage(chatId, message, options)
      .then((msg: TelegramBot.Message) => console.log(JSON.stringify(msg)))
      .catch(console.error);
  }
}
