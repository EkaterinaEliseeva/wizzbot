/**
 * Преобразует дату из формата YYYY-MM-DD в ДД.ММ.ГГГГ
 * @param dateStr Дата в формате YYYY-MM-DD
 * @returns Дата в формате ДД.ММ.ГГГГ
 */
export function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}
