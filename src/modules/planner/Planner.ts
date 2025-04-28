import { CronJob } from 'cron';

export class Planner {
  addJob(interval: string = '0 */1 * * *', callback: () => Promise<void>): void {
    new CronJob(interval, callback, null, true);
  }
}
