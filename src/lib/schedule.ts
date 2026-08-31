// Единый источник истины для расписания приёма.
export const WORKING_HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00"
];

// 0 - Воскресенье, 1 - Понедельник, ..., 6 - Суббота
// Пока рабочие часы одинаковы для всех дней, так как реальное расписание не предоставлено.
export const WEEKLY_SCHEDULE: Record<number, string[]> = {
  0: WORKING_HOURS,
  1: WORKING_HOURS,
  2: WORKING_HOURS,
  3: WORKING_HOURS,
  4: WORKING_HOURS,
  5: WORKING_HOURS,
  6: WORKING_HOURS,
};

export function getWorkingHoursForDate(dateString: string): string[] {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return [];
  const [year, month, day] = dateString.split("-").map(Number);
  // Используем UTC, чтобы избежать смещения часовых поясов
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  return WEEKLY_SCHEDULE[dayOfWeek] || [];
}
