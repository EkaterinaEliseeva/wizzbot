"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const config_1 = require("./config");
class SubscriptionManager {
    constructor(fileSystemManager) {
        this.fileSystemManager = fileSystemManager;
    }
    async addSubscription(subscription) {
        const subscriptions = await this.loadSubscriptions();
        const newSubscription = {
            id: subscription.id || Date.now().toString(),
            chatId: subscription.chatId,
            origin: subscription.origin,
            destination: subscription.destination,
            dateType: subscription.dateType,
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
    async removeSubscription(chatId, subscriptionId) {
        const subscriptions = await this.loadSubscriptions();
        const updatedSubscriptions = subscriptions.filter((sub) => !(sub.chatId === chatId && sub.id === subscriptionId));
        await this.saveSubscriptions(updatedSubscriptions);
    }
    async getSubscriptionById(subscriptionId) {
        const subscriptions = await this.loadSubscriptions();
        const subscription = subscriptions.find((sub) => sub.id === subscriptionId);
        return subscription || null;
    }
    async getSubscriptionsByChatId(chatId) {
        const subscriptions = await this.loadSubscriptions();
        return subscriptions.filter((sub) => sub.chatId === chatId);
    }
    async getAllSubscriptions() {
        return this.loadSubscriptions();
    }
    async updateSubscriptionPrice(subscriptionId, price) {
        await this.updateSubscriptionDetails(subscriptionId, { lastPrice: price });
    }
    async updateBestDates(subscriptionId, bestDates, minPrice) {
        await this.updateSubscriptionDetails(subscriptionId, {
            lastPrice: minPrice,
            bestDate: bestDates[0].date,
            bestDates: bestDates,
        });
    }
    async updateSubscriptionDetails(subscriptionId, updates) {
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
    async loadSubscriptions() {
        try {
            const data = await this.fileSystemManager.readFile(config_1.SUBSCRIPTIONS_FILE);
            return JSON.parse(data);
        }
        catch (error) {
            return [];
        }
    }
    async saveSubscriptions(subscriptions) {
        await this.fileSystemManager.writeFile(config_1.SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    }
    areBestDatesChanged(oldDates, newDates) {
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
exports.SubscriptionManager = SubscriptionManager;
SubscriptionManager.subscriptions = [];
