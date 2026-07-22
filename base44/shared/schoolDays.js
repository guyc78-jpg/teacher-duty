export const SCHOOL_DAYS = [0, 1, 2, 3, 4];

export function isSchoolDate(dateStr) {
  if (!dateStr) return false;
  const date = new Date(`${dateStr}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && SCHOOL_DAYS.includes(date.getUTCDay());
}