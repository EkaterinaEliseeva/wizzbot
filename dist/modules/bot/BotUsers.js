"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotUsers = void 0;
class BotUsers {
    constructor() {
        this.userStates = new Map();
    }
    add(chatId) {
        this.userStates.set(chatId, {
            chatId,
            stage: "waiting_origin" /* UserStageEnum.WAITING_ORIGIN */,
            subscription: {
                chatId,
                id: Date.now().toString(),
            },
        });
    }
    getById(chatId) {
        return this.userStates.get(chatId) ?? null;
    }
    delete(chatId) {
        this.userStates.delete(chatId);
    }
}
exports.BotUsers = BotUsers;
