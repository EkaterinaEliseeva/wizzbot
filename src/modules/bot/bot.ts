import TelegramBot from 'node-telegram-bot-api';
import { checkSubscriptionPrice, formatPriceCheckMessage, getSubscriptionStatuses } from '../price-checker';
import { addSubscription, getSubscriptions, removeSubscription } from '../subscription';
import { IUserState } from './types';
import { ISubscription } from '../subscription/types';


// Хранилище состояний пользователей
const userStates: Map<number, IUserState> = new Map();

/**
 * Инициализирует Telegram бота
 * @param token Токен бота
 * @returns Экземпляр бота
 */
export function initBot(token: string): TelegramBot {
  if (!token) {
    throw new Error('Токен Telegram бота не предоставлен');
  }

  const bot = new TelegramBot(token, { polling: true });
  
  // Обработчик команды /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `👋 Привет! Я буду отслеживать цены на авиабилеты и сообщать, когда они снизятся.
      
Ваш ID чата: ${chatId}

Доступные команды:
/subscribe - Создать подписку на билеты
/subscriptions - Посмотреть свои подписки
/help - Показать справку`
    );
  });

  // Обработчик команды /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `🛠 Доступные команды:

/subscribe - Создать новую подписку на билеты
/subscriptions - Посмотреть список ваших подписок
/help - Показать это сообщение

Чтобы создать подписку, используйте команду /subscribe и следуйте инструкциям.`
    );
  });

  // Обработчик команды /subscribe
  bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;
    
    // Создаем новое состояние для пользователя
    userStates.set(chatId, {
      chatId,
      stage: 'waiting_origin',
      subscription: {
        chatId: chatId,
        id: Date.now().toString()
      }
    });
    
    bot.sendMessage(
      chatId,
      '✈️ Создание новой подписки на авиабилеты!\n\nУкажите пункт отправления (город):',
      {
        reply_markup: {
          force_reply: true
        }
      }
    );
  });

  // Обработчик команды /subscriptions
  bot.onText(/\/subscriptions/, async (msg) => {
    const chatId = msg.chat.id;
    const subscriptions = await getSubscriptions(chatId);
    const message = await getSubscriptionStatuses(subscriptions)
    
    bot.sendMessage(chatId, message);
  });

  // Обработчик команд удаления подписки
  bot.onText(/\/remove_(.+)/, async (msg, match) => {
    if (!match || !match[1]) return;
    
    const chatId = msg.chat.id;
    const subscriptionId = match[1];
    
    await removeSubscription(chatId, subscriptionId);
    bot.sendMessage(chatId, '✅ Подписка успешно удалена!');
  });

  // Обработчик всех сообщений для работы с диалогом создания подписки
  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const userState = userStates.get(chatId);
    
    if (!userState) return;
    
    processUserDialog(bot, userState, msg.text);
  });

  return bot;
}

/**
 * Обрабатывает диалог создания подписки
 * @param bot Экземпляр бота
 * @param state Текущее состояние пользователя
 * @param text Текст сообщения
 */
function processUserDialog(bot: TelegramBot, state: IUserState, text: string): void {
  const { chatId, stage, subscription } = state;
  
  switch (stage) {
    case 'waiting_origin':
      // Сохраняем город отправления
      subscription.origin = text.trim();
      state.stage = 'waiting_destination';
      
      bot.sendMessage(
        chatId,
        `🏙 Город отправления: ${subscription.origin}\n\nУкажите пункт назначения (город):`,
        {
          reply_markup: {
            force_reply: true
          }
        }
      );
      break;
      
    case 'waiting_destination':
      // Сохраняем город назначения
      subscription.destination = text.trim();
      state.stage = 'waiting_date';
      
      bot.sendMessage(
        chatId,
        `🏙 Город отправления: ${subscription.origin}\n🏝 Город прибытия: ${subscription.destination}\n\nВыберите тип даты:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Конкретная дата', callback_data: 'date_single' },
                { text: 'Диапазон дат', callback_data: 'date_range' }
              ]
            ]
          }
        }
      );
      break;
      
    case 'waiting_date':
      // Сохраняем конкретную дату и завершаем создание подписки
      subscription.dateType = 'single';
      subscription.date = text.trim();
      subscription.maxPrice = 1000000; // Устанавливаем высокое значение по умолчанию
      
      // Создаем и сохраняем подписку
      createSubscription(bot, state);
      break;
      
    case 'waiting_date_range':
      // Сохраняем диапазон дат и завершаем создание подписки
      try {
        const [startDate, endDate] = text.split('-').map(d => d.trim());
        if (!startDate || !endDate) throw new Error('Неверный формат');
        
        subscription.dateType = 'range';
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.maxPrice = 1000000; // Устанавливаем высокое значение по умолчанию
        
        // Создаем и сохраняем подписку
        createSubscription(bot, state);
      } catch (e) {
        bot.sendMessage(
          chatId,
          '❌ Неверный формат диапазона дат. Пожалуйста, используйте формат: DD.MM.YYYY - DD.MM.YYYY'
        );
      }
      break;
  }
}

/**
 * Завершает создание подписки, проверяет цену и уведомляет пользователя
 * @param bot Экземпляр бота
 * @param state Состояние пользователя
 */
async function createSubscription(bot: TelegramBot, state: IUserState): Promise<void> {
  const { chatId, subscription } = state;
  
  try {
    // Создаем и сохраняем подписку
    const newSubscription = await addSubscription(subscription as ISubscription);
    
    // Отправляем начальное сообщение о создании подписки
    let message = '✅ Подписка успешно создана!\n\n';
    message += `🏙 Откуда: ${subscription.origin}\n`;
    message += `🏝 Куда: ${subscription.destination}\n`;
    
    if (subscription.dateType === 'single') {
      message += `📅 Дата: ${subscription.date}\n`;
    } else {
      message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
    }
    
    message += '\nЗапускаю проверку цен...';
    
    // Отправляем первое сообщение
    await bot.sendMessage(chatId, message);
    
    // Проверяем цену
    const result = await checkSubscriptionPrice(newSubscription);
    
    if (result.success) {
      // Используем общую функцию для форматирования сообщения
      const resultMessage = formatPriceCheckMessage(newSubscription, result);
      await bot.sendMessage(chatId, resultMessage);
    } else {
      // Если не удалось получить цену
      await bot.sendMessage(
        chatId, 
        `⚠️ ${result.message || 'Не удалось получить информацию о ценах. Проверка будет повторена по расписанию.'}`
      );
    }
    
    // Сбрасываем состояние пользователя
    userStates.delete(chatId);
  } catch (error) {
    console.error('Ошибка при создании подписки:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при создании подписки. Попробуйте еще раз.');
    userStates.delete(chatId);
  }
}

/**
 * Обработчик кнопок
 * @param bot Экземпляр бота
 */
export function setupCallbackQueryHandlers(bot: TelegramBot): void {
  bot.on('callback_query', (query) => {
    if (!query.message || !query.data) return;
    
    const chatId = query.message.chat.id;
    const userState = userStates.get(chatId);
    
    if (!userState) return;
    
    const messageId = query.message.message_id;
    
    if (query.data === 'date_single') {
      userState.stage = 'waiting_date';
      bot.editMessageText('Укажите конкретную дату в формате ДД.ММ.ГГГГ:', {
        chat_id: chatId,
        message_id: messageId
      });
      bot.sendMessage(chatId, 'Введите дату в формате ДД.ММ.ГГГГ:', {
        reply_markup: { force_reply: true }
      });
    } else if (query.data === 'date_range') {
      userState.stage = 'waiting_date_range';
      bot.editMessageText('Укажите диапазон дат:', {
        chat_id: chatId,
        message_id: messageId
      });
      bot.sendMessage(chatId, 'Введите диапазон дат в формате ДД.ММ.ГГГГ - ДД.ММ.ГГГГ:', {
        reply_markup: { force_reply: true }
      });
    }
  });
}