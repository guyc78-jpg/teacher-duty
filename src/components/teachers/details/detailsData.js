import { base44 } from "@/api/base44Client";
import { todayISO, HEBREW_DAYS, BREAK_TYPES } from "@/lib/dutyUtils";

const memo = new Map();
const cached = (key, fn) => { if (!memo.has(key)) memo.set(key, fn().catch(err => { memo.delete(key); throw err; })); return memo.get(key); };
export const clearDetailsCache = () => memo.clear();

const loadTemplate = () => cached("template", async () => (await base44.entities.FixedDutyTemplate.list("-updated_date", 1))[0] || { assignments: [] });
const loadBreaks = () => cached("breaks", () => base44.entities.Break.filter({ is_active: true }, "sort_order", 25));
const loadStations = () => cached("stations", () => base44.entities.Station.filter({ is_active: true }, "sort_order", 100));
const loadRules = () => cached("rules", () => base44.entities.DutyRule.filter({ is_active: true }, "sort_order", 25));

export async function loadFixedDuties(teacherId) {
  const [template, breaks, stations] = await Promise.all([loadTemplate(), loadBreaks(), loadStations()]);
  return (template.assignments || [])
    .filter(a => (a.teacher_ids || []).includes(teacherId))
    .map(a => {
      const day = Number(a.day_of_week);
      const brk = breaks.find(b => b.break_type === a.break_type && (b.active_days || []).map(Number).includes(day));
      const station = stations.find(s => s.id === a.station_id);
      return { key: `${day}|${a.break_type}|${a.station_id}`, day, day_name: HEBREW_DAYS[day], break_label: BREAK_TYPES[a.break_type]?.label || a.break_type, start_time: brk?.start_time, end_time: brk?.end_time, station_name: station?.name || a.station_name || "עמדה", area: station?.area || "" };
    })
    .sort((a, b) => a.day - b.day || (a.start_time || "").localeCompare(b.start_time || ""));
}

export async function loadRecurringDuties(teacherId) {
  const [template, breaks, stations] = await Promise.all([loadTemplate(), loadBreaks(), loadStations()]);
  const list = template.published_assignments && template.published_assignments.length ? template.published_assignments : (template.assignments || []);
  return list.filter(a => (a.teacher_ids || []).includes(teacherId)).map(a => {
    const day = Number(a.day_of_week);
    const brk = breaks.find(b => b.break_type === a.break_type && (b.active_days || []).map(Number).includes(day));
    const station = stations.find(s => s.id === a.station_id);
    return { key: `${day}|${a.break_type}|${a.station_id}`, day, day_name: HEBREW_DAYS[day], break_type: a.break_type, break_label: BREAK_TYPES[a.break_type]?.label || a.break_type, station_id: a.station_id, start_time: brk?.start_time, end_time: brk?.end_time, station_name: station?.name || a.station_name || "עמדה", area: station?.area || "" };
  }).sort((a, b) => a.day - b.day || (a.start_time || "").localeCompare(b.start_time || ""));
}

export async function loadUpcomingChanges(teacher) {
  const today = todayISO();
  const [exceptions, absences] = await Promise.all([
    base44.entities.DutyException.filter({ date: { $gte: today } }, "date", 200),
    base44.entities.Absence.filter({ teacher_id: teacher.id, end_date: { $gte: today } }, "start_date", 50)
  ]);
  const items = [];
  exceptions.filter(x => (x.teacher_ids || []).includes(teacher.id)).forEach(x => items.push({
    id: `x-${x.id}`, date: x.date,
    title: `${x.station_name || "עמדה"} · ${BREAK_TYPES[x.break_type]?.label || ""}`,
    note: x.reason || "",
    status: x.source === "swap" ? "החלפה" : "שיבוץ חד־פעמי",
    tone: x.source === "swap" ? "status-warning" : "status-success"
  }));
  absences.forEach(a => items.push({
    id: `a-${a.id}`, date: a.start_date,
    title: a.end_date && a.end_date !== a.start_date ? `היעדרות עד ${a.end_date}` : "היעדרות",
    note: a.reason || "",
    status: a.status === "approved" ? "מאושרת" : "ממתינה",
    tone: "status-danger"
  }));
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadBalance(teacher) {
  const [rules, template] = await Promise.all([loadRules(), loadTemplate()]);
  const hours = teacher.weekly_teaching_hours || 0;
  const rule = rules.find(r => hours >= r.min_hours && hours <= r.max_hours) || null;
  const mine = (template.assignments || []).filter(a => (a.teacher_ids || []).includes(teacher.id));
  const rows = ["big", "medium", "small"].map(type => ({ type, label: BREAK_TYPES[type].label, required: rule?.[`${type}_count`] || 0, assigned: mine.filter(a => a.break_type === type).length }));
  const required = rows.reduce((sum, row) => sum + row.required, 0);
  return { rule_name: rule?.name || null, rows, required, assigned: mine.length, diff: mine.length - required };
}

export async function loadAvailability(teacher) {
  const stations = await loadStations();
  const names = ids => (ids || []).map(id => stations.find(s => s.id === id)?.name).filter(Boolean);
  return { days_off: (teacher.days_off || []).map(d => HEBREW_DAYS[d]), busy_days: (teacher.busy_days || []).map(d => HEBREW_DAYS[d]), allowed: names(teacher.allowed_stations), fixed: names(teacher.fixed_stations) };
}

export async function loadSwaps(teacherId) {
  const today = todayISO();
  const [initiated, accepted] = await Promise.all([
    base44.entities.SwapRequest.filter({ initiator_id: teacherId }, "-created_at", 50),
    base44.entities.SwapRequest.filter({ accepted_by_id: teacherId }, "-created_at", 50)
  ]);
  const all = [...initiated, ...accepted].filter((s, i, arr) => arr.findIndex(o => o.id === s.id) === i);
  return { open: all.filter(s => s.status === "pending"), future: all.filter(s => s.status === "accepted" && s.date >= today) };
}

export async function loadAlerts(teacher) {
  const [duties, balance, lessons] = await Promise.all([
    loadFixedDuties(teacher.id),
    loadBalance(teacher),
    base44.entities.WeeklySchedule.filter({ teacher_id: teacher.id, is_active: true }, "start_time", 200)
  ]);
  const alerts = [];
  if (teacher.is_exempt && duties.length) alerts.push({ tone: "status-danger", text: "המורה פטור/ה מתורנות אך משובץ/ת בלוח הקבוע" });
  duties.filter(d => (teacher.days_off || []).includes(d.day)).forEach(d => alerts.push({ tone: "status-danger", text: `תורנות ${d.station_name} ביום ${d.day_name} — יום חופשי של המורה` }));
  duties.forEach(d => {
    if (d.start_time && lessons.some(l => l.day_of_week === d.day && l.start_time < d.end_time && d.start_time < l.end_time))
      alerts.push({ tone: "status-danger", text: `התנגשות: תורנות ${d.station_name} ביום ${d.day_name} חופפת לשיעור` });
  });
  if (balance.diff < 0) alerts.push({ tone: "status-warning", text: `מכסה חסרה: משובץ ${balance.assigned} מתוך ${balance.required} תורנויות נדרשות` });
  if (balance.diff > 0) alerts.push({ tone: "status-warning", text: `עומס חריג: ${balance.assigned} תורנויות מול ${balance.required} נדרשות` });
  const byDay = {};
  duties.forEach(d => { byDay[d.day] = (byDay[d.day] || 0) + 1; });
  Object.entries(byDay).filter(([, count]) => count > 1).forEach(([day, count]) => alerts.push({ tone: "status-warning", text: `${count} תורנויות ביום ${HEBREW_DAYS[day]}` }));
  if (!teacher.phone) alerts.push({ tone: "status-muted", text: "חסר מספר טלפון" });
  if (!teacher.weekly_teaching_hours) alerts.push({ tone: "status-muted", text: "לא הוזנו שעות הוראה שבועיות" });
  if (!lessons.length) alerts.push({ tone: "status-muted", text: "לא הוזנה מערכת שעות" });
  return alerts;
}