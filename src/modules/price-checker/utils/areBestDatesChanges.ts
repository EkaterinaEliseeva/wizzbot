import type { TBestDates } from '../../../modules/subscription';

export function areBestDatesChanged(
  oldDates: Array<TBestDates> | undefined,
  newDates: Array<TBestDates>,
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
