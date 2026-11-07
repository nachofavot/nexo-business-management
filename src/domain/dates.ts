const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Lee el texto de un <input type="date"> ("2026-11-05") como la medianoche local de ese día.
 * new Date('2026-11-05') lo interpretaría en UTC, que en Argentina es el 4 a las 21:00.
 */
export function parseDateInput(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText = '', monthText = '', dayText = ''] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  // new Date(2026, 1, 30) no falla: pasa al 2 de marzo. Si cambió algún dato, la fecha no existe.
  const isSameDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isSameDay ? date : null;
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
