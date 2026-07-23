export const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
export const breakNames = { big: "גדולה", medium: "בינונית", small: "קטנה" };

export function matchesFilters(item, filters) {
  if (filters.day !== "all" && Number(item.day_of_week) !== Number(filters.day)) return false;
  if (filters.breakType !== "all" && item.break_type !== filters.breakType) return false;
  if (filters.station !== "all" && item.station_id !== filters.station) return false;
  if (filters.teacher !== "all" && item.teacher_id !== filters.teacher) return false;
  const text = `${item.message || ""} ${item.teacher_name || ""} ${item.station_name || ""}`.toLowerCase();
  return !filters.search || text.includes(filters.search.toLowerCase());
}

export function groupIdentical(items) {
  const groups = new Map();
  items.forEach(item => { const key = item.reason || item.message || "ללא סיבה"; const current = groups.get(key) || { ...item, message: key, count: 0, teacherNames: [] }; current.count += 1; if (item.teacher_name) current.teacherNames.push(item.teacher_name); groups.set(key, current); });
  return [...groups.values()].map(item => ({ ...item, message: item.teacherNames.length ? `${item.message} — ${item.teacherNames.join(", ")}` : item.message }));
}

export function fixLink(item) {
  return `/duty-management?tab=fixed&day=${item.day_of_week}&break=${item.break_type}&station=${item.station_id}`;
}