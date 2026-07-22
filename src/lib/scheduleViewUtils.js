export const BREAKS = [
  { key: "big", label: "הפסקה גדולה" },
  { key: "medium", label: "הפסקה בינונית" },
  { key: "small", label: "הפסקה קטנה" }
];

export const iso = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
export const fromIso = value => new Date(`${value}T12:00:00`);
export const schoolDate = date => { const day = date.getDay(); return day >= 0 && day <= 4; };
export const moveSchoolDay = (value, amount) => {
  const date = fromIso(value);
  do date.setDate(date.getDate() + amount); while (!schoolDate(date));
  return iso(date);
};
export const weekStart = value => {
  const date = fromIso(value);
  date.setDate(date.getDate() - date.getDay());
  return iso(date);
};
export const weekDates = start => Array.from({ length: 5 }, (_, index) => { const date = fromIso(start); date.setDate(date.getDate() + index); return iso(date); });
export const heDate = value => new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fromIso(value));