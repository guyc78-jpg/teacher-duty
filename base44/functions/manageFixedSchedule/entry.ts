import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

import { mins, keyOf, unique, quotaFor, makeSlot, candidate } from "../../shared/dutySlotLogic.js";
import { isDutyEligible } from "../../shared/dutyEligibility.js";

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json(), e = base44.asServiceRole.entities;
    const [profiles, templates] = await Promise.all([e.TeacherProfile.filter({ user_id: user.id }, "-updated_date", 1), e.FixedDutyTemplate.list("-updated_date", 1)]), actor = profiles[0];
    if (!actor || actor.role !== "admin") return Response.json({ error: "נדרשת הרשאת מנהל/ת מערכת" }, { status: 403 });
    let template = templates[0];
    if (!template) template = await e.FixedDutyTemplate.create({ name: "לוח תורנויות קבוע", status: "saved", version: 1, assignments: [], published_assignments: [] });
    if (body.action === "load") {
      const [stations, breaks, settings] = await Promise.all([e.Station.filter({ is_active: true }, "sort_order", 100), e.Break.filter({ is_active: true }, "sort_order", 25), e.SystemSettings.list("-updated_date", 1)]);
      const { published_assignments: ignoredPublished, ...templateView } = template;
      return Response.json({ template: templateView, stations: stations.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), breaks: breaks.sort((a, b) => mins(a.start_time) - mins(b.start_time)), quota_policy: settings[0]?.fixed_quota_policy || "warning" });
    }
    if (body.action === "candidates") {
      const query = String(body.query || "").trim(), selectedIds = unique(body.selected_ids), teacherFilter = query ? { is_active: true, $or: [{ full_name: { $regex: query, $options: "i" } }, { subject: { $regex: query, $options: "i" } }] } : { is_active: true };
      const [matched, selectedProfiles, stations, breaks, rules] = await Promise.all([e.TeacherProfile.filter(teacherFilter, "full_name", query ? 25 : 75), selectedIds.length ? e.TeacherProfile.filter({ id: { $in: selectedIds } }, "full_name", 25) : Promise.resolve([]), e.Station.filter({ id: body.station_id, is_active: true }, "sort_order", 1), e.Break.filter({ break_type: body.break_type, is_active: true }, "sort_order", 10), e.DutyRule.filter({ is_active: true }, "sort_order", 25)]);
      const teachers = [...selectedProfiles, ...matched].filter((item, index, list) => list.findIndex(other => other.id === item.id) === index).slice(0, 25), teacherIds = teachers.map(item => item.id);
      const [schedules, absences] = await Promise.all([teacherIds.length ? e.WeeklySchedule.filter({ is_active: true, teacher_id: { $in: teacherIds }, day_of_week: Number(body.day_of_week) }, "start_time", 250) : Promise.resolve([]), teacherIds.length ? e.Absence.filter({ status: "approved", teacher_id: { $in: teacherIds } }, "-start_date", 250) : Promise.resolve([])]);
      const slot = makeSlot(body, stations, breaks), data = { teachers, stations, breaks, schedules, absences, rules, assignments: template.assignments || [] };
      const list = teachers.map(teacher => candidate(teacher, slot, data, keyOf(slot))).sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score || a.full_name.localeCompare(b.full_name, "he")).slice(0, 25);
      return Response.json({ candidates: list, required: slot.required });
    }
    const [teachers, stations, breaks, schedules, absences, rules, settings] = await Promise.all([e.TeacherProfile.filter({ is_active: true }, "full_name", 500), e.Station.filter({ is_active: true }, "sort_order", 100), e.Break.filter({ is_active: true }, "sort_order", 25), e.WeeklySchedule.filter({ is_active: true }, "start_time", 1000), e.Absence.filter({ status: "approved" }, "-start_date", 500), e.DutyRule.filter({ is_active: true }, "sort_order", 25), e.SystemSettings.list("-updated_date", 1)]);
    const data = { teachers, stations, breaks, schedules, absences, rules, assignments: template.assignments || [] }, quotaPolicy = settings[0]?.fixed_quota_policy || "warning";
    if (body.expected_updated_date && body.expected_updated_date !== template.updated_date) return Response.json({ error: "הלוח השתנה במקביל. יש לרענן ולנסות שוב.", code: "concurrent_change" }, { status: 409 });
    let assignments = [...(template.assignments || [])], overrideReason = (body.override_reason || "").trim(), changedSlot = null;
    if (body.action === "save_slot") {
      const slot = makeSlot(body, stations, breaks), teacherIds = unique(body.teacher_ids); changedSlot = slot;
      const blocked = teacherIds.map(id => teachers.find(t => t.id === id)).find(teacher => !isDutyEligible(teacher));
      if (blocked) return Response.json({ error: "לא ניתן לשבץ מורה זה לתורנות – פטור/מנהל/רכז", hard_conflict: true, critical: true }, { status: 422 });
      if (teacherIds.length > slot.required) return Response.json({ error: `ניתן לבחור עד ${slot.required} מורים` }, { status: 422 });
      const checks = teacherIds.map(id => candidate(teachers.find(t => t.id === id), slot, { ...data, assignments }, keyOf(slot)));
      const hard = checks.flatMap(item => item.reasons); if (hard.length) return Response.json({ error: hard.join(" · "), hard_conflict: true }, { status: 422 });
      const soft = checks.flatMap(item => item.warnings); if (soft.length && !overrideReason) return Response.json({ error: "יש להזין סיבה לעקיפת ההתרעות", warnings: unique(soft), requires_reason: true }, { status: 422 });
      assignments = assignments.filter(item => keyOf(item) !== keyOf(slot));
      if (teacherIds.length) assignments.push({ day_of_week: slot.day_of_week, break_type: slot.break_type, station_id: slot.station_id, teacher_ids: teacherIds, teacher_names: teacherIds.map(id => teachers.find(t => t.id === id)?.full_name || ""), override_reason: overrideReason });
    } else if (body.action === "clear_day") assignments = assignments.filter(item => Number(item.day_of_week) !== Number(body.day_of_week));
    else if (body.action === "copy_day") {
      const source = Number(body.day_of_week), target = Number(body.target_day), copied = assignments.filter(item => item.day_of_week === source).map(item => ({ ...item, day_of_week: target }));
      const trial = [...assignments.filter(item => item.day_of_week !== target), ...copied], validation = validate(trial, { ...data, assignments: trial }, quotaPolicy), hardConflicts = validation.errors.filter(item => ["conflict", "critical_ineligible_teacher"].includes(item.type));
      if (hardConflicts.length) return Response.json({ error: "לא ניתן להעתיק: קיימות התנגשויות קשיחות", validation }, { status: 422 }); assignments = trial;
    } else if (body.action === "import_assignments") {
      if (!Array.isArray(body.assignments)) return Response.json({ error: "קובץ הגיבוי אינו תקין" }, { status: 422 });
      const validBreaks = new Set(breaks.map(item => item.break_type)), validStations = new Set(stations.map(item => item.id)), validTeachers = new Set(teachers.map(item => item.id));
      const valid = body.assignments.every(item => Number.isInteger(item.day_of_week) && item.day_of_week >= 0 && item.day_of_week <= 4 && validBreaks.has(item.break_type) && validStations.has(item.station_id) && Array.isArray(item.teacher_ids) && item.teacher_ids.every(id => validTeachers.has(id)));
      if (!valid) return Response.json({ error: "קובץ הגיבוי מכיל נתוני שיבוץ לא תקינים" }, { status: 422 });
      assignments = body.assignments.map(item => ({ day_of_week: item.day_of_week, break_type: item.break_type, station_id: item.station_id, teacher_ids: unique(item.teacher_ids), teacher_names: unique(item.teacher_ids).map(id => teachers.find(teacher => teacher.id === id)?.full_name || ""), override_reason: item.override_reason || "ייבוא מגיבוי" }));
      const importedValidation = validate(assignments, { ...data, assignments }, quotaPolicy);
      if (importedValidation.errors.some(item => ["conflict", "critical_ineligible_teacher"].includes(item.type))) return Response.json({ error: "לא ניתן לייבא שיבוצים הכוללים מורה חסום", validation: importedValidation }, { status: 422 });
    } else if (body.action === "auto_assign") assignments = autoAssign(data, body.day_of_week);
    else if (body.action === "validate") return Response.json(validate(assignments, data, quotaPolicy));
    else if (body.action === "publish") {
      const validation = validate(assignments, data, quotaPolicy);
      if (validation.errors.length) return Response.json({ error: "לא ניתן לפרסם לוח עם התנגשויות או עמדות חסרות", validation }, { status: 422 });
      if (validation.warnings.length && !overrideReason) return Response.json({ error: "יש להזין סיבה לפרסום עם התרעות", validation, requires_reason: true }, { status: 422 });
      template = await e.FixedDutyTemplate.update(template.id, { status: "published", version: (template.version || 1) + 1, assignments, published_assignments: assignments, published_at: new Date().toISOString(), published_by: actor.full_name, last_override_reason: overrideReason });
      await audit(e, user, actor, template.id, "publish_fixed_schedule", { version: template.version, reason: overrideReason });
      return Response.json(pack(template, { ...data, assignments }, quotaPolicy));
    } else if (body.action !== "save") return Response.json({ error: "פעולה לא מוכרת" }, { status: 400 });
    template = await e.FixedDutyTemplate.update(template.id, { status: "saved", version: (template.version || 1) + 1, assignments, last_override_reason: overrideReason });
    template = await e.FixedDutyTemplate.get(template.id);
    await audit(e, user, actor, template.id, body.action, { day: body.day_of_week, target: body.target_day });
    if (body.action === "save_slot") {
      const { assignments: ignoredAssignments, published_assignments: ignoredPublished, ...templateMeta } = template;
      return Response.json({ template: templateMeta, assignment: assignments.find(item => keyOf(item) === keyOf(changedSlot)) || null, slot_key: { day_of_week: changedSlot.day_of_week, break_type: changedSlot.break_type, station_id: changedSlot.station_id } });
    }
    return Response.json(pack(template, { ...data, assignments }, quotaPolicy));
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});

function autoAssign(data, requestedDay) {
  const targetDay = Number(requestedDay);
  if (!Number.isInteger(targetDay) || targetDay < 0 || targetDay > 4) throw new Error("יש לבחור יום תקין לשיבוץ אוטומטי");
  const assignments = (data.assignments || []).map(item => ({ ...item, day_of_week: Number(item.day_of_week) }));
  const sortedBreaks = [...data.breaks].sort((a, b) => mins(a.start_time) - mins(b.start_time));
  for (const brk of sortedBreaks.filter(item => (item.active_days || []).map(Number).includes(targetDay))) for (const station of data.stations.filter(item => item.active_break_types?.includes(brk.break_type))) {
    const slot = makeSlot({ day_of_week: targetDay, break_type: brk.break_type, station_id: station.id }, data.stations, data.breaks);
    const existing = assignments.find(item => keyOf(item) === keyOf(slot));
    const ids = unique(existing?.teacher_ids).filter(id => isDutyEligible(data.teachers.find(teacher => teacher.id === id)));
    while (ids.length < slot.required) {
      const liveAssignments = assignments.filter(item => keyOf(item) !== keyOf(slot));
      liveAssignments.push({ ...slot, teacher_ids: ids });
      const live = { ...data, assignments: liveAssignments };
      const best = data.teachers.map(teacher => candidate(teacher, slot, live, keyOf(slot))).filter(item => item.available && !ids.includes(item.id)).sort((a, b) => b.score - a.score)[0];
      if (!best) break;
      ids.push(best.id);
    }
    const next = { day_of_week: targetDay, break_type: slot.break_type, station_id: slot.station_id, teacher_ids: ids, teacher_names: ids.map(id => data.teachers.find(teacher => teacher.id === id)?.full_name || ""), override_reason: existing?.override_reason || "שיבוץ אוטומטי" };
    const index = assignments.findIndex(item => keyOf(item) === keyOf(slot));
    if (index >= 0) assignments[index] = next;
    else if (ids.length) assignments.push(next);
  }
  return assignments;
}
function validate(assignments, data, quotaPolicy) {
  const errors = [], warnings = [], missing = []; let conflicts = 0;
  for (let day = 0; day <= 4; day++) for (const brk of data.breaks.filter(b => b.active_days?.includes(day))) for (const station of data.stations.filter(s => s.active_break_types?.includes(brk.break_type))) {
    const slot = makeSlot({ day_of_week: day, break_type: brk.break_type, station_id: station.id }, data.stations, data.breaks), item = assignments.find(a => keyOf(a) === keyOf(slot)), actual = item?.teacher_ids?.length || 0;
    if (actual < slot.required) { const issue = { type: "missing", day_of_week: day, break_type: brk.break_type, station_id: station.id, message: `${station.name}: שובצו ${actual} מתוך ${slot.required}` }; errors.push(issue); missing.push(issue); }
    for (const id of item?.teacher_ids || []) { const teacher = data.teachers.find(t => t.id === id), check = candidate(teacher, slot, { ...data, assignments }, keyOf(slot)), eligible = isDutyEligible(teacher); check.reasons.forEach(message => { const critical = !eligible && message === "לא ניתן לשבץ מורה זה לתורנות – פטור/מנהל/רכז"; errors.push({ type: critical ? "critical_ineligible_teacher" : "conflict", teacher_id: id, message: critical ? `${teacher?.full_name || "מורה"}: ${message}` : message }); conflicts++; }); check.warnings.forEach(message => warnings.push({ type: "teacher_warning", teacher_id: id, message })); }
  }
  const under = [], over = [];
  for (const teacher of data.teachers) { const count = assignments.filter(a => a.teacher_ids?.includes(teacher.id)).length, quota = quotaFor(teacher, data.rules); if (!quota) continue; const item = { teacher_id: teacher.id, teacher_name: teacher.full_name, count, quota }; if (count < quota) under.push(item); if (count > quota) over.push(item); }
  [...under.map(i => ({ ...i, type: "under_quota", message: `${i.teacher_name}: ${i.count} מתוך ${i.quota}` })), ...over.map(i => ({ ...i, type: "over_quota", message: `${i.teacher_name}: ${i.count} מתוך ${i.quota}` }))].forEach(item => (quotaPolicy === "block" ? errors : warnings).push(item));
  return { errors, warnings, isValid: errors.length === 0, summary: { missing_stations: missing.length, teachers_under_quota: under.length, teachers_over_quota: over.length, conflicts } };
}
function pack(template, data, quotaPolicy) { return { template, stations: data.stations.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), breaks: data.breaks.sort((a, b) => mins(a.start_time) - mins(b.start_time)), validation: validate(template.assignments || [], data, quotaPolicy), quota_policy: quotaPolicy }; }
async function audit(e, user, actor, id, action, value) { await e.AuditLog.create({ user_id: user.id, user_name: actor.full_name, action, entity_type: "FixedDutyTemplate", entity_id: id, new_value: JSON.stringify(value), timestamp: new Date().toISOString() }); }