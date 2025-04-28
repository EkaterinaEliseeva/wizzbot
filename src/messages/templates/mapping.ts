import { MessagesEnum } from '../types';

import { ACCESS_DENIED_MESSAGE } from './access-denied';
import { ERROR_MESSAGE } from './error';
import { HELP_MESSAGE } from './help';
import { IN_PROGRESS_MESSAGE } from './in-progress';
import { SUBSCRIBE_MESSAGE } from './subscribe';
import { SUBSCRIPTION_ADDING_ERROR_MESSAGE } from './subscription-adding-error';
import { SUBSCRIPTION_DELETED_MESSAGE } from './subscription-deleted';
import { SUBSCRIPTION_NOT_FOUND_MESSAGE } from './subscription-not-found';
import { WELCOME_MESSAGE } from './welcome';
import { WRONG_DATE_FORMAT_MESSAGE } from './wrong-date-format';

export const MESSAGE_TEMPLATES: Record<MessagesEnum, string> = {
  [MessagesEnum.WELCOME]: WELCOME_MESSAGE,
  [MessagesEnum.HELP]: HELP_MESSAGE,
  [MessagesEnum.SUBSCRIBE]: SUBSCRIBE_MESSAGE,
  [MessagesEnum.SUBSCRIPTION_NOT_FOUND]: SUBSCRIPTION_NOT_FOUND_MESSAGE,
  [MessagesEnum.ACCESS_DENIED]: ACCESS_DENIED_MESSAGE,
  [MessagesEnum.IN_PROGRESS]: IN_PROGRESS_MESSAGE,
  [MessagesEnum.ERROR]: ERROR_MESSAGE,
  [MessagesEnum.SUBSCRIPTION_DELETED]: SUBSCRIPTION_DELETED_MESSAGE,
  [MessagesEnum.WRONG_DATE_FORMAT]: WRONG_DATE_FORMAT_MESSAGE,
  [MessagesEnum.SUBSCRIPTION_ADDING_ERROR]: SUBSCRIPTION_ADDING_ERROR_MESSAGE,
};
