import { generatePriceChangeMessage } from '../../messages/generators';

import { calculatePriceChange } from './calculatePriceRange';

export function formatPriceChangeText(oldPrice: number, newPrice: number): string {
  const { diff, percentDiff, isDecrease, isSignificant } = calculatePriceChange(oldPrice, newPrice);

  return generatePriceChangeMessage(isDecrease, isSignificant, diff, percentDiff);
}
