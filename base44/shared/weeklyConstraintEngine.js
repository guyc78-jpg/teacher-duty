import { dutyEligibility } from "./dutyEligibility.js";
import { mins, overlaps, quotaFor, unique } from "./dutySlotLogic.js";

const DAYS = [0, 1, 2, 3, 4];
const sportNames = ["חצר אחורית מזרחית", "חצר אחורית מערבית"];
const slotKey = slot => `${slot.day_of_week}|${slot.break_type}|${slot.station_id}`;
const issueLink = slot => `#fixed-slot-${slot.day_of_week}-${slot.break_type}-${slot.station_id}`;
const ruleFor = (teacher, rules) => rules.find(rule => (teacher.weekly_teaching_hours || 0) >= rule.min_hours && (teacher.weekly_teaching_hours || 0) <= rule.max_hours);
const limitsFor = (teacher, rules) => { if (!dutyEligibility(teacher).eligible) return { big: 0, medium: 0, small: 0, total: 0 }; const rule = ruleFor(teacher, rules); return { big: rule?.big_count || 0, medium: rule?.medium_count || 0, small: rule?.small_count || 0, total: quotaFor(teacher, rules) }; };

function gradeGroup(teacher) {
  const value = String(teacher.homeroom_grade || teacher.homeroom_class || "").replace(/[\s׳״'\"]/g, "");
  if (/^(7|ז)/.test(value)) return "grade7";
  if (/^(8|9|ח|ט)/.test(value)) return "middle";
  if (/^(10|11|12|י)/.test(value)) return "high";
  return "unknown";
}

function stationRule(teacher, station) {
  const name = `${station.name || ""} ${station.area || ""} ${station.level || ""}`;
  if (teacher.allowed_stations?.length && !teacher.allowed_stations.includes(station.id)) return "העמדה אינה ברשימת העמדות המותרות";
  if (station.allowed_teachers?.length && !station.allowed_teachers.includes(teacher.id)) return "המורה אינו ברשימת המורים המותרים לעמדה";
  if (teacher.is_sport_teacher) return sportNames.some(label => name.includes(label)) ? "" : "מורי חנ״ג מותרים רק בשתי עמדות הספורט האחוריות";
  if (teacher.is_homeroom || teacher.role === "homeroom") {
    const group = gradeGroup(teacher);
    if (group === "unknown") return "שכבת החינוך של המחנך אינה מוגדרת";
    if (group === "grade7") return /ז׳|שכבת ז|מפלס ז/.test(name) ? "" : "מחנכי ז׳ מותרים במבנה ז׳ בלבד";
    if (group === "middle") return station.division === "middle" ? "" : "מחנכי ח׳–ט׳ מותרים בעמדות חטיבת הביניים בלבד";
    return station.division === "high" ? "" : "מחנכי י׳–י״ב מותרים בעמדות החטיבה העליונה בלבד";
  }
  return /לובי|חצר/.test(name) ? "" : "מורים מקצועיים מותרים בעמדות הלובי והחצר בלבד";
}

function loadMetrics(teacher, day, scheduleIndex, brk) {
  const lessons = scheduleIndex.get(`${teacher.id}|${day}`) || [];
  const minutes = lessons.reduce((sum, item) => sum + Math.max(0, mins(item.end_time) - mins(item.start_time)), 0);
  let consecutive = 0, windows = 0;
  for (let index = 1; index < lessons.length; index++) { const gap = mins(lessons[index].start_time) - mins(lessons[index - 1].end_time); if (gap <= 10) consecutive++; else windows += Math.max(0, gap); }
  const length = lessons.length ? mins(lessons[lessons.length - 1].end_time) - mins(lessons[0].start_time) : 0;
  const near = lessons.some(item => Math.abs(mins(item.end_time) - mins(brk.start_time)) <= 20 || Math.abs(mins(item.start_time) - mins(brk.end_time)) <= 20);
  return { lessons: lessons.length, minutes, consecutive, windows, length, near, score: lessons.length * 12 + consecutive * 9 + length / 30 - windows / 25 + (minutes > 360 ? 100 : 0) - (near ? 12 : 0) };
}

function hardReason(teacher, slot, data, state, allowSecondDuty) {
  const eligibility = dutyEligibility(teacher); if (!eligibility.eligible) return eligibility.reason;
  if (teacher.days_off?.map(Number).includes(slot.day_of_week)) return "יום חופשי";
  const schedule = data.scheduleIndex.get(`${teacher.id}|${slot.day_of_week}`) || [];
  if (schedule.some(item => overlaps(item, slot))) return "שיעור חופף להפסקה";
  if (state.sameBreak.has(`${teacher.id}|${slot.day_of_week}|${slot.break_type}`)) return "כבר משובץ בעמדה אחרת באותה הפסקה";
  if (!allowSecondDuty && (state.days[teacher.id]?.[slot.day_of_week] || 0) > 0) return "כבר שובץ לתורנות באותו יום";
  const stationReason = stationRule(teacher, slot.station); if (stationReason) return stationReason;
  const limits = state.limits[teacher.id], byType = state.types[teacher.id]?.[slot.break_type] || 0;
  if (!limits?.total) return "מכסת התורנויות היא אפס";
  if ((state.counts[teacher.id] || 0) >= limits.total || byType >= limits[slot.break_type]) return "מכסת התורנויות הושלמה";
  return "";
}

function chooseTeacher(slot, data, state) {
  const evaluate = allowSecondDuty => data.teachers.map(teacher => ({ teacher, reason: hardReason(teacher, slot, data, state, allowSecondDuty) })).filter(item => !item.reason).map(({ teacher }) => {
    const load = loadMetrics(teacher, slot.day_of_week, data.scheduleIndex, slot);
    const quota = state.limits[teacher.id].total || 1, ratio = (state.counts[teacher.id] || 0) / quota;
    const dayCount = state.days[teacher.id]?.[slot.day_of_week] || 0, stationCount = state.stations[teacher.id]?.[slot.station_id] || 0;
    return { teacher, score: ratio * 120 + load.score + dayCount * 90 + stationCount * 24 };
  }).sort((a, b) => a.score - b.score || a.teacher.full_name.localeCompare(b.teacher.full_name, "he"));
  return evaluate(false)[0]?.teacher || evaluate(true)[0]?.teacher || null;
}

function addDuty(state, teacherId, slot) {
  state.counts[teacherId] = (state.counts[teacherId] || 0) + 1;
  state.types[teacherId][slot.break_type] = (state.types[teacherId][slot.break_type] || 0) + 1;
  state.days[teacherId][slot.day_of_week] = (state.days[teacherId][slot.day_of_week] || 0) + 1;
  state.stations[teacherId][slot.station_id] = (state.stations[teacherId][slot.station_id] || 0) + 1;
  state.sameBreak.add(`${teacherId}|${slot.day_of_week}|${slot.break_type}`);
}

export function buildWeeklyDraft(data, lockedAssignments = []) {
  const activeTeachers = data.teachers.filter(teacher => teacher.is_active !== false), teacherById = new Map(activeTeachers.map(teacher => [teacher.id, teacher]));
  const scheduleIndex = new Map();
  for (const lesson of data.schedules) { const key = `${lesson.teacher_id}|${Number(lesson.day_of_week)}`; if (!scheduleIndex.has(key)) scheduleIndex.set(key, []); scheduleIndex.get(key).push(lesson); }
  for (const lessons of scheduleIndex.values()) lessons.sort((a, b) => mins(a.start_time) - mins(b.start_time));
  const engineData = { ...data, teachers: activeTeachers, scheduleIndex };
  const slots = [];
  for (const day of DAYS) for (const brk of [...data.breaks].sort((a, b) => mins(a.start_time) - mins(b.start_time))) if (brk.active_days?.map(Number).includes(day)) for (const station of data.stations.filter(item => item.active_break_types?.includes(brk.break_type))) {
    const required = station.staffing_requirements?.[brk.break_type] || 1;
    slots.push({ day_of_week: day, break_type: brk.break_type, break_name: brk.name, start_time: brk.start_time, end_time: brk.end_time, station_id: station.id, station_name: station.name, station, required });
  }
  const state = { limits: {}, counts: {}, types: {}, days: {}, stations: {}, sameBreak: new Set() };
  activeTeachers.forEach(teacher => { state.limits[teacher.id] = limitsFor(teacher, data.rules); state.counts[teacher.id] = 0; state.types[teacher.id] = {}; state.days[teacher.id] = {}; state.stations[teacher.id] = {}; });
  const assignments = [], blocking = [];
  for (const locked of lockedAssignments) {
    const slot = slots.find(item => slotKey(item) === slotKey(locked)); if (!slot) continue;
    const ids = unique(locked.teacher_ids);
    for (const id of ids) { const teacher = teacherById.get(id), reason = teacher ? hardReason(teacher, slot, engineData, state, true) : "המורה לא נמצא"; if (reason) blocking.push({ type: "locked_conflict", day_of_week: slot.day_of_week, break_type: slot.break_type, station_id: slot.station_id, station_name: slot.station_name, teacher_id: id, teacher_name: teacher?.full_name || "מורה", message: `${teacher?.full_name || "מורה"}: ${reason}`, link: issueLink(slot) }); else addDuty(state, id, slot); }
    assignments.push({ day_of_week: slot.day_of_week, break_type: slot.break_type, station_id: slot.station_id, teacher_ids: ids, teacher_names: ids.map(id => teacherById.get(id)?.full_name || ""), override_reason: locked.override_reason || "שיבוץ נעול מהלוח הקבוע", locked: true });
  }
  if (blocking.length) return { assignments: lockedAssignments, blocking, report: makeReport(slots, assignments, activeTeachers, state, blocking, engineData) };
  const openSlots = slots.flatMap(slot => { const existing = assignments.find(item => slotKey(item) === slotKey(slot)); return Array.from({ length: Math.max(0, slot.required - (existing?.teacher_ids?.length || 0)) }, () => slot); });
  openSlots.sort((a, b) => legalCount(a, engineData, state) - legalCount(b, engineData, state) || a.day_of_week - b.day_of_week || mins(a.start_time) - mins(b.start_time));
  for (const slot of openSlots) { const teacher = chooseTeacher(slot, engineData, state); if (!teacher) continue; let item = assignments.find(value => slotKey(value) === slotKey(slot)); if (!item) { item = { day_of_week: slot.day_of_week, break_type: slot.break_type, station_id: slot.station_id, teacher_ids: [], teacher_names: [], override_reason: "שיבוץ אוטומטי שבועי" }; assignments.push(item); } item.teacher_ids.push(teacher.id); item.teacher_names.push(teacher.full_name); addDuty(state, teacher.id, slot); }
  return { assignments, blocking: [], report: makeReport(slots, assignments, activeTeachers, state, [], engineData) };
}

function legalCount(slot, data, state) { return data.teachers.reduce((count, teacher) => count + (hardReason(teacher, slot, data, state, true) ? 0 : 1), 0); }
function reasonSummary(reasons) { const counts = reasons.reduce((map, reason) => ({ ...map, [reason]: (map[reason] || 0) + 1 }), {}); const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3); return ranked.length ? ranked.map(([reason, count]) => `${reason} (${count})`).join(" · ") : "לא נמצא מועמד חוקי"; }
function makeReport(slots, assignments, teachers, state, conflicts, data) {
  const unfilled = slots.flatMap(slot => { const item = assignments.find(value => slotKey(value) === slotKey(slot)), missing = Math.max(0, slot.required - (item?.teacher_ids?.length || 0)); const reason = reasonSummary(teachers.map(teacher => hardReason(teacher, slot, data, state, true)).filter(Boolean)); return Array.from({ length: missing }, () => ({ type: "unfilled", day_of_week: slot.day_of_week, break_type: slot.break_type, break_name: slot.break_name, station_id: slot.station_id, station_name: slot.station_name, message: `יום ${["ראשון", "שני", "שלישי", "רביעי", "חמישי"][slot.day_of_week]} · ${slot.break_name} · ${slot.station_name}: ${reason}`, link: issueLink(slot) })); });
  const teacherRows = teachers.map(teacher => { const quota = state.limits[teacher.id]?.total || 0, duties = assignments.flatMap(item => item.teacher_ids?.map((id, index) => ({ id, day_of_week: item.day_of_week, break_type: item.break_type, station_id: item.station_id, station_name: slots.find(slot => slotKey(slot) === slotKey(item))?.station_name || "", teacher_name: item.teacher_names?.[index], link: issueLink(item) })) || []).filter(item => item.id === teacher.id); const count = duties.length; let reason = ""; if (quota > count) { const eligibility = dutyEligibility(teacher); reason = !eligibility.eligible ? eligibility.reason : quota === 0 ? "מכסה אפס" : duties.length ? "לא נותרו עמדות חוקיות ללא חריגה מאילוצים" : "לא נמצאה עמדה חוקית בהתאם לתפקיד, למערכת ולימים החופשיים"; } return { teacher_id: teacher.id, teacher_name: teacher.full_name, quota, assigned: count, status: count < quota ? "under" : count > quota ? "over" : "ok", reason, duties }; });
  const required = slots.reduce((sum, slot) => sum + slot.required, 0), assigned = assignments.reduce((sum, item) => sum + (item.teacher_ids?.length || 0), 0);
  return { summary: { required, assigned, missing: Math.max(0, required - assigned) }, teachers: teacherRows, under_quota: teacherRows.filter(item => item.status === "under"), over_quota: teacherRows.filter(item => item.status === "over"), not_assigned: teacherRows.filter(item => item.quota > 0 && item.assigned === 0), unfilled, conflicts };
}