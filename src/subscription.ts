import fs from 'fs/promises';
import path from 'path';

export interface Subscription {
    id: string;
    chatId: number;
    origin: string;
    destination: string;
    dateType: 'single' | 'range';
    date?: string;
    startDate?: string;
    endDate?: string;
    maxPrice: number;
    lastPrice?: number;
    createdAt: Date;
  }
  
  // Путь к файлу с подписками
  const SUBSCRIPTIONS_FILE = path.join(__dirname, '../data/subscriptions.json');
  
  /**
   * Создает директорию для данных, если она не существует
   */
  async function ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(SUBSCRIPTIONS_FILE);
    try {
      await fs.access(dataDir);
    } catch (error) {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }
  
  /**
   * Загружает все подписки из файла
   * @returns Массив подписок
   */
  export async function loadSubscriptions(): Promise<Subscription[]> {
    await ensureDataDir();
    
    try {
      const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Если файл не существует или пуст, возвращаем пустой массив
      return [];
    }
  }
  
  /**
   * Сохраняет все подписки в файл
   * @param subscriptions Массив подписок
   */
  async function saveSubscriptions(subscriptions: Subscription[]): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
  }
  
  /**
   * Добавляет новую подписку
   * @param subscription Данные подписки
   */
  export async function addSubscription(subscription: Partial<Subscription>): Promise<Subscription> {
    const subscriptions = await loadSubscriptions();
    
    const newSubscription: Subscription = {
      id: subscription.id || Date.now().toString(),
      chatId: subscription.chatId!,
      origin: subscription.origin!,
      destination: subscription.destination!,
      dateType: subscription.dateType!,
      maxPrice: subscription.maxPrice!,
      createdAt: new Date(),
      ...(subscription.dateType === 'single' ? { date: subscription.date } : {}),
      ...(subscription.dateType === 'range' ? { 
        startDate: subscription.startDate,
        endDate: subscription.endDate
      } : {})
    };
    
    subscriptions.push(newSubscription);
    await saveSubscriptions(subscriptions);
    
    return newSubscription;
  }
  
  /**
   * Получает подписки конкретного пользователя
   * @param chatId ID чата пользователя
   * @returns Массив подписок пользователя
   */
  export async function getSubscriptions(chatId: number): Promise<Subscription[]> {
    const subscriptions = await loadSubscriptions();
    return subscriptions.filter(sub => sub.chatId === chatId);
  }
  
  /**
   * Получает все активные подписки
   * @returns Массив всех подписок
   */
  export async function getAllSubscriptions(): Promise<Subscription[]> {
    return await loadSubscriptions();
  }
  
  /**
   * Удаляет подписку
   * @param chatId ID чата пользователя
   * @param subscriptionId ID подписки
   */
  export async function removeSubscription(chatId: number, subscriptionId: string): Promise<void> {
    const subscriptions = await loadSubscriptions();
    const updatedSubscriptions = subscriptions.filter(
      sub => !(sub.chatId === chatId && sub.id === subscriptionId)
    );
    
    await saveSubscriptions(updatedSubscriptions);
  }
  
  /**
   * Обновляет информацию о последней цене для подписки
   * @param subscriptionId ID подписки
   * @param price Новая цена
   */
  export async function updateSubscriptionPrice(subscriptionId: string, price: number): Promise<void> {
    const subscriptions = await loadSubscriptions();
    const subscription = subscriptions.find(sub => sub.id === subscriptionId);
    
    if (subscription) {
      subscription.lastPrice = price;
      await saveSubscriptions(subscriptions);
    }
  }