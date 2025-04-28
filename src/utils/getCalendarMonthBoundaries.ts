/**
 * Получает первый понедельник и последнее воскресенье полного календарного месяца
 * @param dateStr Дата в формате YYYY-MM-DD
 * @returns Объект с датами начала и конца месяца в формате YYYY-MM-DD
 */
export function getCalendarMonthBoundaries(dateStr: string): { start: string; end: string } {
  // Парсим дату из строки
  const date = new Date(dateStr);

  // Получаем первый день указанного месяца
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

  // Находим первый понедельник (может быть в предыдущем месяце)
  // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Вычисляем первый понедельник, вычитая нужное количество дней
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() - daysToSubtract);

  // Получаем последний день указанного месяца
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  // Находим последнее воскресенье (может быть в следующем месяце)
  const lastDayOfWeek = lastDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

  // Вычисляем последнее воскресенье, добавляя нужное количество дней
  const lastSunday = new Date(lastDay);
  lastSunday.setDate(lastDay.getDate() + daysToAdd);

  // Форматируем даты в YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(firstMonday),
    end: formatDate(lastSunday),
  };
}
