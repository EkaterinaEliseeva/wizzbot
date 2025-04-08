import TelegramBot from 'node-telegram-bot-api';
import { checkFlightPrices } from './priceChecker';
import { Subscription, addSubscription, getSubscriptions, removeSubscription } from './subscription';

// Состояния диалога для пользователей
interface UserState {
  chatId: number;
  stage: 'idle' | 'waiting_origin' | 'waiting_destination' | 'waiting_date' | 'waiting_date_range' | 'confirm';
  subscription: Partial<Subscription>;
}

// Хранилище состояний пользователей
const userStates: Map<number, UserState> = new Map();

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
/status - Проверить текущую цену
/subscribe - Создать подписку на билеты
/subscriptions - Посмотреть свои подписки
/help - Показать справку`
    );
  });

  // Обработчик команды /status
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const currentPrice = await checkFlightPrices();
      if (currentPrice !== null) {
        bot.sendMessage(
          chatId,
          `📊 Текущая цена: ${currentPrice} руб.
Желаемая цена: ${process.env.DESIRED_PRICE || 'не задана'} руб.`
        );
      } else {
        bot.sendMessage(
          chatId,
          '❌ Не удалось получить текущую цену. Проверьте настройки селектора и URL.'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      bot.sendMessage(chatId, `❌ Ошибка при получении текущей цены: ${errorMessage}`);
    }
  });

  // Обработчик команды /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `🛠 Доступные команды:

/status - Проверить текущую цену на авиабилеты
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
    
    if (subscriptions.length === 0) {
      bot.sendMessage(chatId, '🔍 У вас пока нет активных подписок. Используйте /subscribe, чтобы создать подписку.');
      return;
    }
    
    let message = '📋 Ваши подписки на авиабилеты:\n\n';
    
    subscriptions.forEach((sub, index) => {
      message += `${index + 1}. ${sub.origin} ➡️ ${sub.destination}\n`;
      message += `   📅 ${sub.dateType === 'single' ? 'Дата: ' + sub.date : 'Период: ' + sub.startDate + ' - ' + sub.endDate}\n`;
      message += `   💰 Макс. цена: ${sub.maxPrice} руб.\n`;
      message += `   🗑 /remove_${sub.id}\n\n`;
    });
    
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
function processUserDialog(bot: TelegramBot, state: UserState, text: string): void {
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
      // Сохраняем конкретную дату
      subscription.dateType = 'single';
      subscription.date = text.trim();
      state.stage = 'confirm';
      
      // Запрашиваем максимальную цену
      bot.sendMessage(
        chatId,
        `🏙 Город отправления: ${subscription.origin}\n🏝 Город прибытия: ${subscription.destination}\n📅 Дата: ${subscription.date}\n\nУкажите максимальную цену в рублях:`,
        {
          reply_markup: {
            force_reply: true
          }
        }
      );
      break;
      
    case 'waiting_date_range':
      // Сохраняем диапазон дат (формат: dd.mm.yyyy - dd.mm.yyyy)
      try {
        const [startDate, endDate] = text.split('-').map(d => d.trim());
        if (!startDate || !endDate) throw new Error('Неверный формат');
        
        subscription.dateType = 'range';
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        state.stage = 'confirm';
        
        // Запрашиваем максимальную цену
        bot.sendMessage(
          chatId,
          `🏙 Город отправления: ${subscription.origin}\n🏝 Город прибытия: ${subscription.destination}\n📅 Период: ${subscription.startDate} - ${subscription.endDate}\n\nУкажите максимальную цену в рублях:`,
          {
            reply_markup: {
              force_reply: true
            }
          }
        );
      } catch (e) {
        bot.sendMessage(
          chatId,
          '❌ Неверный формат диапазона дат. Пожалуйста, используйте формат: DD.MM.YYYY - DD.MM.YYYY'
        );
      }
      break;
      
    case 'confirm':
      // Сохраняем максимальную цену и завершаем подписку
      const maxPrice = parseInt(text.trim(), 10);
      
      if (isNaN(maxPrice)) {
        bot.sendMessage(chatId, '❌ Пожалуйста, введите корректное числовое значение для цены.');
        return;
      }
      
      subscription.maxPrice = maxPrice;
      
      // Создаем и сохраняем подписку
      addSubscription(subscription as Subscription)
        .then(() => {
          let message = '✅ Подписка успешно создана!\n\n';
          message += `🏙 Откуда: ${subscription.origin}\n`;
          message += `🏝 Куда: ${subscription.destination}\n`;
          
          if (subscription.dateType === 'single') {
            message += `📅 Дата: ${subscription.date}\n`;
          } else {
            message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
          }
          
          message += `💰 Максимальная цена: ${subscription.maxPrice} руб.\n\n`;
          message += 'Вы получите уведомление, когда найдутся билеты по подходящей цене.';
          
          bot.sendMessage(chatId, message);
          
          // Сбрасываем состояние пользователя
          userStates.delete(chatId);
        })
        .catch(error => {
          console.error('Ошибка при создании подписки:', error);
          bot.sendMessage(chatId, '❌ Произошла ошибка при создании подписки. Попробуйте еще раз.');
          userStates.delete(chatId);
        });
      break;
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

/**
 * Отправляет сообщение пользователю
 * @param bot Экземпляр бота
 * @param chatId ID чата
 * @param message Текст сообщения
 */
export function sendMessage(bot: TelegramBot, chatId: string | number, message: string): void {
  bot.sendMessage(chatId, message);
}

/**
 * Отправляет уведомление о снижении цены
 * @param bot Экземпляр бота
 * @param subscription Подписка
 * @param newPrice Новая цена
 * @param oldPrice Старая цена
 */
export function sendPriceAlert(
  bot: TelegramBot, 
  subscription: Subscription, 
  newPrice: number, 
  oldPrice: number
): void {
  const priceDiff = oldPrice - newPrice;
  
  let message = `✅ Снижение цены на подписку!\n\n`;
  message += `${subscription.origin} ➡️ ${subscription.destination}\n`;
  
  if (subscription.dateType === 'single') {
    message += `📅 Дата: ${subscription.date}\n`;
  } else {
    message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
  }
  
  message += `\n💰 Старая цена: ${oldPrice} руб.\n`;
  message += `💰 Новая цена: ${newPrice} руб.\n`;
  message += `💹 Снижение: ${priceDiff} руб. (-${Math.round(priceDiff / oldPrice * 100)}%)\n\n`;
  
  if (newPrice <= subscription.maxPrice) {
    message += `🔥 Цена ниже вашего порога (${subscription.maxPrice} руб.)!`;
  }
  
  sendMessage(bot, subscription.chatId, message);
}