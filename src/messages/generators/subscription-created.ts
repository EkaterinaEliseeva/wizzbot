import type { ISubscription } from '../../modules/subscription';

export function generateSubscriptionCreatedMessage(subscription: ISubscription): string {
  let message = '✅ Подписка успешно создана!\n\n';
  message += `🏙 Откуда: ${subscription.origin}\n`;
  message += `🏝 Куда: ${subscription.destination}\n`;

  if (subscription.dateType === 'single') {
    message += `📅 Дата: ${subscription.date}\n`;
  } else {
    message += `📅 Период: ${subscription.startDate} - ${subscription.endDate}\n`;
  }

  message += '\nЗапускаю проверку цен...';

  return message;
}
