import { ISubscription } from "../../subscription/types";

export interface IUserState {
    chatId: number;
    stage: 'idle' | 'waiting_origin' | 'waiting_destination' | 'waiting_date' | 'waiting_date_range' | 'confirm';
    subscription: Partial<ISubscription>;
  }
  