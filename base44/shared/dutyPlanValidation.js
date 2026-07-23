import { isSchoolDate } from "./schoolDays.js";
import { dutyEligibility } from "./dutyEligibility.js";

const mins = value => { const [h, m] = (value || "00:00").split(":").map(Number); return h * 60 + m; };
const overlaps = (a, b) => mins(a.start_time) < mins(b.end_time) && mins(b.start_time) < mins(a.end_time);
const push = (list, type, assignment, message) => list.push({ type, assignment_id: assignment?.id, date: assignment?.date, message });

export function teacherAvailability(teacher, assignment, data) {
  const reasons = [];
  if (!teacher) return { available: false, reasons: ["נתוני המורה חסרים"], warnings: [], score: -999 };
  const eligibility = dutyEligibility(teacher);
  if (!eligibility.eligible) reasons.push(eligibility.reason);
  if (teacher.days_off?.includes(assignment.day_of_week)) reasons.push("יום חופשי");
  if (data.absences.some(item => item.teacher_id === teacher.id && assignment.date >= item.start_date && assignment.date <= item.end_date)) reasons.push("בהיעדרות");
  const schedule = data.schedules.filter(item => item.teacher_id === teacher.id && item.day_of_week === assignment.day_of_week);
  if (!schedule.length || !(teacher.weekly_teaching_hours > 0)) reasons.push("נתוני מורה או מערכת שעות חסרים");
  if (schedule.some(item => overlaps(item, assignment))) reasons.push("מלמד בזמן זה");
  if (data.assignments.some(item => item.id !== assignment.id && item.teacher_id === teacher.id && item.date === assignment.date && item.break_type === assignment.break_type)) reasons.push("כבר משובץ בהפסקה");
  if (teacher.allowed_stations?.length && !teacher.allowed_stations.includes(assignment.station_id)) reasons.push("אינו מורשה לעמדה");
  const duties = data.assignments.filter(item => item.teacher_id === teacher.id && item.id !== assignment.id);
  const dayDuties = duties.filter(item => item.date === assignment.date).length;
  const dayMinutes = schedule.reduce((sum, item) => sum + Math.max(0, mins(item.end_time) - mins(item.start_time)), 0);
  const repeats = duties.filter(item => item.station_id === assignment.station_id).length;
  const weekStart = new Date(`${assignment.date}T12:00:00`); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 4);
  const weekDuties = duties.filter(item => { const date = new Date(`${item.date}T12:00:00`); return date >= weekStart && date <= weekEnd; }).length;
  const rule = data.rules.find(item => (teacher.weekly_teaching_hours || 0) >= item.min_hours && (teacher.weekly_teaching_hours || 0) <= item.max_hours);
  const quota = rule ? (rule.big_count || 0) + (rule.medium_count || 0) + (rule.small_count || 0) : 0;
  const warnings = [];
  if (dayDuties >= 1) warnings.push("תורנות נוספת באותו יום");
  if (dayMinutes > 360) warnings.push("יותר משש שעות הוראה ביום");
  if (repeats >= 2) warnings.push("חזרה על אותה עמדה");
  if (quota && weekDuties >= quota) warnings.push("חריגה ממפתח התורנויות");
  const preferred = teacher.fixed_stations?.includes(assignment.station_id) || teacher.allowed_stations?.includes(assignment.station_id);
  const quotaNeed = Math.max(0, quota - weekDuties);
  const score = 100 + quotaNeed * 10 - duties.length * 5 - dayDuties * 12 - repeats * 8 - Math.round(dayMinutes / 60) + (preferred ? 18 : 0) + (assignment.is_sport_station && teacher.is_sport_teacher ? 15 : 0);
  return { available: reasons.length === 0, reasons, warnings, score };
}

export function validateDutyPlan(assignments, data, options = {}) {
  const errors = [], warnings = [];
  for (const item of assignments) {
    if (!isSchoolDate(item.date)) push(errors, "weekend_assignment", item, "שיבוץ ביום שישי או שבת");
    if (!item.teacher_id) push(errors, "uncovered", item, "עמדה אינה מאוישת");
    if (item.teacher_id) {
      const teacher = data.teachers.find(t => t.id === item.teacher_id);
      const result = teacherAvailability(teacher, item, { ...data, assignments });
      const eligibility = dutyEligibility(teacher);
      result.reasons.forEach(message => push(errors, !eligibility.eligible && message === eligibility.reason ? "critical_ineligible_teacher" : "teacher_unavailable", item, `${teacher?.full_name || "מורה"}: ${message}`));
      result.warnings.forEach(message => push(warnings, "teacher_warning", item, message));
    }
  }
  const seen = new Map();
  assignments.filter(item => item.teacher_id).forEach(item => {
    const key = `${item.teacher_id}|${item.date}|${item.break_type}`;
    if (seen.has(key)) push(errors, "double_booking", item, "אותו מורה משובץ בשתי עמדות באותה הפסקה");
    else seen.set(key, item.id);
  });
  const groups = new Map();
  assignments.forEach(item => { const key = `${item.date}|${item.break_type}|${item.station_id}`; groups.set(key, (groups.get(key) || 0) + (item.teacher_id ? 1 : 0)); });
  for (const date of [...new Set(assignments.map(item => item.date))]) for (const station of data.stations) for (const brk of data.breaks) {
    if (!brk.active_days?.includes(new Date(`${date}T12:00:00`).getDay()) || !station.active_break_types?.includes(brk.break_type)) continue;
    const required = station.staffing_requirements?.[brk.break_type] || 1;
    const actual = groups.get(`${date}|${brk.break_type}|${station.id}`) || 0;
    if (actual !== required) errors.push({ type: "staffing_mismatch", date, station_id: station.id, break_type: brk.break_type, message: `${station.name}: נדרשים ${required}, שובצו ${actual}` });
  }
  const weekKey = value => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() - date.getDay()); return date.toISOString().slice(0, 10); };
  const weeks = [...new Set(assignments.map(item => weekKey(item.date)))];
  for (const week of weeks) {
    const weeklyCounts = new Map(data.teachers.map(teacher => [teacher.id, assignments.filter(item => item.teacher_id === teacher.id && weekKey(item.date) === week).length]));
    for (const teacher of data.teachers) {
      const rule = data.rules.find(item => (teacher.weekly_teaching_hours || 0) >= item.min_hours && (teacher.weekly_teaching_hours || 0) <= item.max_hours);
      if (!rule) continue;
      const quota = (rule.big_count || 0) + (rule.medium_count || 0) + (rule.small_count || 0);
      const actual = weeklyCounts.get(teacher.id) || 0;
      if (actual > quota) warnings.push({ type: "over_quota", teacher_id: teacher.id, message: `${teacher.full_name}: ${actual} תורנויות מול מכסה ${quota}` });
      if (options.includeUnderQuota && actual < quota) warnings.push({ type: "under_quota", teacher_id: teacher.id, message: `${teacher.full_name}: ${actual} תורנויות מול מכסה ${quota}` });
    }
    for (const rule of data.rules) {
      const peers = data.teachers.filter(teacher => (teacher.weekly_teaching_hours || 0) >= rule.min_hours && (teacher.weekly_teaching_hours || 0) <= rule.max_hours);
      const counts = peers.map(teacher => weeklyCounts.get(teacher.id) || 0);
      if (counts.length > 1 && Math.max(...counts) - Math.min(...counts) > 2) warnings.push({ type: "fairness_imbalance", message: `${rule.name}: חוסר איזון בין מורים בעלי היקף שעות דומה` });
    }
  }
  return { errors, warnings, isValid: assignments.length > 0 && errors.length === 0 };
}