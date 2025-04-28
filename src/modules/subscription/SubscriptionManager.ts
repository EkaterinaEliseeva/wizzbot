import type { FileSystemManager } from '../file-system/FileSystemManager';

import { SUBSCRIPTIONS_FILE } from './config';
import type { ISubscription, ISubscriptionUpdate } from './types';

export class SubscriptionManager {
  public static subscriptions: ISubscription[] = [];
  fileSystemManager: FileSystemManager;

  constructor(fileSystemManager: FileSystemManager) {
    this.fileSystemManager = fileSystemManager;
  }

  async addSubscription(subscription: Partial<ISubscription>): Promise<ISubscription> {
    const subscriptions = await this.loadSubscriptions();

    const newSubscription: ISubscription = {
      id: subscription.id || Date.now().toString(),
      chatId: subscription.chatId!,
      origin: subscription.origin!,
      destination: subscription.destination!,
      dateType: subscription.dateType!,
      createdAt: new Date(),
      ...(subscription.dateType === 'single' ? { date: subscription.date } : {}),
      ...(subscription.dateType === 'range'
        ? {
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          }
        : {}),
    };

    subscriptions.push(newSubscription);
    await this.saveSubscriptions(subscriptions);

    return newSubscription;
  }

  async removeSubscription(chatId: number, subscriptionId: string): Promise<void> {
    const subscriptions = await this.loadSubscriptions();
    const updatedSubscriptions = subscriptions.filter(
      (sub) => !(sub.chatId === chatId && sub.id === subscriptionId),
    );

    await this.saveSubscriptions(updatedSubscriptions);
  }

  async getSubscriptionById(subscriptionId: string): Promise<ISubscription | null> {
    const subscriptions = await this.loadSubscriptions();
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId);

    return subscription || null;
  }

  async getSubscriptionsByChatId(chatId: number): Promise<ISubscription[]> {
    const subscriptions = await this.loadSubscriptions();

    return subscriptions.filter((sub) => sub.chatId === chatId);
  }

  async getAllSubscriptions(): Promise<ISubscription[]> {
    return this.loadSubscriptions();
  }

  async updateSubscriptionPrice(subscriptionId: string, price: number): Promise<void> {
    await this.updateSubscriptionDetails(subscriptionId, { lastPrice: price });
  }

  async updateBestDates(
    subscriptionId: string,
    bestDates: Array<{ date: string; price: number }>,
    minPrice: number,
  ): Promise<void> {
    await this.updateSubscriptionDetails(subscriptionId, {
      lastPrice: minPrice,
      bestDate: bestDates[0].date,
      bestDates: bestDates,
    });
  }

  async updateSubscriptionDetails(
    subscriptionId: string,
    updates: ISubscriptionUpdate,
  ): Promise<void> {
    const subscriptions = await this.loadSubscriptions();
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId);

    if (subscription) {
      if (updates.lastPrice !== undefined) {
        subscription.lastPrice = updates.lastPrice;
      }

      if (updates.bestDate !== undefined) {
        subscription.bestDate = updates.bestDate;
      }

      if (updates.bestDates !== undefined) {
        subscription.bestDates = updates.bestDates;
      }

      await this.saveSubscriptions(subscriptions);
    }
  }

  async loadSubscriptions(): Promise<ISubscription[]> {
    try {
      const data = await this.fileSystemManager.readFile(SUBSCRIPTIONS_FILE);

      return JSON.parse(data) as ISubscription[];
    } catch (error) {
      return [];
    }
  }

  async saveSubscriptions(subscriptions: ISubscription[]): Promise<void> {
    await this.fileSystemManager.writeFile(
      SUBSCRIPTIONS_FILE,
      JSON.stringify(subscriptions, null, 2),
    );
  }

  areBestDatesChanged(
    oldDates:
      | Array<{ date: string; price: number; originCode?: string; destinationCode?: string }>
      | undefined,
    newDates: Array<{ date: string; price: number; originCode?: string; destinationCode?: string }>,
  ): boolean {
    if (!oldDates || oldDates.length === 0) {
      return true;
    }

    if (oldDates.length !== newDates.length) {
      return true;
    }

    if (oldDates[0].price !== newDates[0].price) {
      return true;
    }

    const oldDateSet = new Set(oldDates.map((item) => item.date));
    const newDateSet = new Set(newDates.map((item) => item.date));

    if (oldDateSet.size !== newDateSet.size) {
      return true;
    }

    for (const date of oldDateSet) {
      if (!newDateSet.has(date)) {
        return true;
      }
    }

    return false;
  }
}
