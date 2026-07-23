import { dutyEligibility } from "./dutyEligibility.js";

export const mins = value => { const [h, m] = (value || "00:00").split(":").map(Number); return h * 60 + m; };
export const overlaps = (a, b) => mins(a.start_time) < mins(b.end_time) && mins(b.start_time) < mins(a.end_time);
export const keyOf = item => `${Number(item.day_of_week)}|${item.break_type}|${item.station_id}`;
export const unique = values => [...new Set((values || []).filter(Boolean))];
export const quotaFor = (teacher, rules) => { const rule = rules.find(r => (teacher.weekly_teaching_hours || 0) >= r.min_hours && (teacher.weekly_teaching_hours || 0) <= r.max_hours); return rule ? (rule.big_count || 0) + (rule.medium_count || 0) + (rule.small_count || 0) : 0; };
export const nextDate = day => { const date = new Date(); const add = (day - date.getDay() + 7) % 7; date.setDate(date.getDate() + add); return date.toISOString().slice(0, 10); };

export function makeSlot(body, stations, breaks) {
  const station = stations.find(item => item.id === body.station_id), brk = breaks.find(item => item.break_type === body.break_type && item.active_days?.includes(Number(body.day_of_week)));
  if (!station || !brk) throw new Error("העמדה או ההפסקה אינן פעילות ביום הנבחר");
  return { day_of_week: Number(body.day_of_week), break_type: brk.break_type, break_name: brk.name, start_time: brk.start_time, end_time: brk.end_time, station_id: station.id, station_name: station.name, required: station.staffing_requirements?.[brk.break_type] || 1, area: station.area || "", is_sport_station: station.is_sport_station };
}

export function candidate(teacher, slot, data, ignoreKey) {
  if (!teacher) return { available: false, reasons: ["המורה לא נמצא"], warnings: [], score: -999 };
  const reasons = [], warnings = [], date = slot.date || nextDate(slot.day_of_week), schedule = data.schedules.filter(s => s.teacher_id === teacher.id && s.day_of_week === slot.day_of_week), assigned = data.assignments.filter(a => keyOf(a) !== ignoreKey && a.teacher_ids?.includes(teacher.id));
  const eligibility = dutyEligibility(teacher); if (!eligibility.eligible) reasons.push(eligibility.reason); if (teacher.days_off?.includes(slot.day_of_week)) reasons.push("יום חופשי");
  if (data.absences.some(a => a.teacher_id === teacher.id && date >= a.start_date && date <= a.end_date)) reasons.push("נעדר");
  if (schedule.some(item => overlaps(item, slot))) reasons.push("מלמד בזמן זה");
  if (assigned.some(item => item.day_of_week === slot.day_of_week && item.break_type === slot.break_type)) reasons.push("כבר משובץ באותה הפסקה");
  if (teacher.allowed_stations?.length && !teacher.allowed_stations.includes(slot.station_id)) reasons.push("אינו מורשה לעמדה");
  const dayDuties = assigned.filter(a => a.day_of_week === slot.day_of_week).length, dayMinutes = schedule.reduce((sum, s) => sum + Math.max(0, mins(s.end_time) - mins(s.start_time)), 0), count = assigned.length, quota = quotaFor(teacher, data.rules), repeats = assigned.filter(a => a.station_id === slot.station_id).length;
  if (quota && count >= quota) warnings.push("חריגה ממכסת התורנויות"); if (dayMinutes > 360) warnings.push("יום הוראה עמוס"); if (dayDuties >= 1) warnings.push("תורנות נוספת באותו יום"); if (repeats >= 1) warnings.push("חוסר איזון ברוטציה");
  const preferred = teacher.fixed_stations?.includes(slot.station_id) || teacher.allowed_stations?.includes(slot.station_id), score = 100 + Math.max(0, quota - count) * 12 - count * 6 - dayDuties * 14 - repeats * 9 - Math.round(dayMinutes / 60) + (preferred ? 20 : 0) + (slot.is_sport_station && teacher.is_sport_teacher ? 16 : 0);
  return { id: teacher.id, full_name: teacher.full_name, subject: teacher.subject || "ללא מקצוע", division: teacher.division, duty_count: count, quota, day_load_hours: Math.round(dayMinutes / 6) / 10, available: !reasons.length, reasons, warnings, score };
}