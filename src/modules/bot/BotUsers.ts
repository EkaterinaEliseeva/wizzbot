import type { IUserState } from './types';
import { UserStageEnum } from './types/UserStageEnum';

export class BotUsers {
  userStates: Map<number, IUserState>;

  constructor() {
    this.userStates = new Map();
  }

  add(chatId: number): void {
    this.userStates.set(chatId, {
      chatId,
      stage: UserStageEnum.WAITING_ORIGIN,
      subscription: {
        chatId,
        id: Date.now().toString(),
      },
    });
  }

  getById(chatId: number): IUserState | null {
    return this.userStates.get(chatId) ?? null;
  }

  delete(chatId: number): void {
    this.userStates.delete(chatId);
  }
}
