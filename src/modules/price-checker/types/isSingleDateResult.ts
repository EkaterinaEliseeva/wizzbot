import type { ISingleDatePriceCheckResult } from './ISingleDatePriceCheckResult';
import type { TPriceCheckResult } from './TPriceCheckResult';

export function isSingleDateResult(
  result: TPriceCheckResult,
): result is ISingleDatePriceCheckResult {
  return result.success && !('bestDates' in result);
}
