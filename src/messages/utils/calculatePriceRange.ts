export function calculatePriceChange(
  oldPrice: number,
  newPrice: number,
): {
  diff: number;
  percentDiff: number;
  isDecrease: boolean;
  isSignificant: boolean;
} {
  const diff = Math.abs(oldPrice - newPrice);
  const percentDiff = Math.round((diff / oldPrice) * 100);
  const isDecrease = newPrice < oldPrice;
  const isSignificant = percentDiff >= 20;

  return {
    diff,
    percentDiff,
    isDecrease,
    isSignificant,
  };
}
