import type { ISubscription } from '../../subscription/types';

import type { UserStageEnum } from './UserStageEnum';

export interface IUserState {
  chatId: number;
  stage: UserStageEnum;
  subscription: Partial<ISubscription>;
}
