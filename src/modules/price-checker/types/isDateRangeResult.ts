import type { IDateRangePriceCheckResult } from './IDateRangePriceCheckResult';
import type { TPriceCheckResult } from './TPriceCheckResult';

export function isDateRangeResult(result: TPriceCheckResult): result is IDateRangePriceCheckResult {
  return result.success && 'bestDates' in result;
}
