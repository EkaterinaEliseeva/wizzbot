import TelegramBot from "node-telegram-bot-api";
import { ISubscription } from "../subscription";
import { IDatePriceInfo } from "../price-checker";
import { 
  formatPriceAlertMessage, 
  formatBestDatesAlertMessage,
  formatFirstCheckMessage 
} from "./formatter";

/**
 * Отправляет сообщение пользователю
 * @param bot Экземпляр бота
 * @param chatId ID чата
 * @param message Текст сообщения
 * @returns Promise с результатом отправки
 */
export async function sendMessage(
  bot: TelegramBot, 
  chatId: string | number, 
  message: string
): Promise<TelegramBot.Message> {
  return bot.sendMessage(chatId, message);
}

/**
 * Отправляет уведомление о снижении или повышении цены
 * @param bot Экземпляр бота
 * @param subscription Подписка
 * @param newPrice Новая цена
 * @param oldPrice Старая цена
 * @param flightInfo Информация о рейсе (если доступна)
 * @returns Promise с результатом отправки
 */
export async function sendPriceAlert(
  bot: TelegramBot, 
  subscription: ISubscription, 
  newPrice: number, 
  oldPrice: number,
  flightInfo?: { originCode: string; destinationCode: string }
): Promise<TelegramBot.Message> {
  const message = formatPriceAlertMessage(subscription, newPrice, oldPrice, flightInfo);
  return sendMessage(bot, subscription.chatId, message);
}

/**
 * Отправляет уведомление об изменении лучших дат
 * @param bot Экземпляр бота
 * @param subscription Подписка
 * @param bestDates Массив лучших дат с ценами
 * @param oldPrice Предыдущая цена (если есть)
 * @param includeRouteInfo Включать ли информацию о маршруте
 * @returns Promise с результатом отправки
 */
export async function sendBestDatesAlert(
  bot: TelegramBot, 
  subscription: ISubscription, 
  bestDates: IDatePriceInfo[],
  oldPrice?: number,
  includeRouteInfo: boolean = true
): Promise<TelegramBot.Message> {
  const message = formatBestDatesAlertMessage(subscription, bestDates, oldPrice, includeRouteInfo);
  return sendMessage(bot, subscription.chatId, message);
}

/**
 * Отправляет уведомление о первой проверке цены
 * @param bot Экземпляр бота
 * @param subscription Подписка
 * @param price Цена
 * @param bestDates Лучшие даты (для диапазона дат)
 * @returns Promise с результатом отправки
 */
export async function sendFirstCheckAlert(
  bot: TelegramBot, 
  subscription: ISubscription, 
  price: number,
  bestDates?: IDatePriceInfo[]
): Promise<TelegramBot.Message> {
  const message = formatFirstCheckMessage(subscription, price, bestDates);
  return sendMessage(bot, subscription.chatId, message);
}

/**
 * Отправляет сообщение об ошибке
 * @param bot Экземпляр бота
 * @param chatId ID чата
 * @param errorMessage Сообщение об ошибке
 * @returns Promise с результатом отправки
 */
export async function sendErrorMessage(
  bot: TelegramBot, 
  chatId: string | number, 
  errorMessage: string
): Promise<TelegramBot.Message> {
  return sendMessage(bot, chatId, `❌ ${errorMessage}`);
}