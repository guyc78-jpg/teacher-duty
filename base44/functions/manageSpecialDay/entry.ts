import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const min = t => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };
const overlap = (a, b, c, d) => min(a) < min(d) && min(c) < min(b);
const duration = s => Math.max(0, min(s.end_time) - min(s.start_time));
const roleAllowed = (teacher, position) => {
  if (position.restriction_type === "management") return ["admin", "management", "coordinator"].includes(teacher.role);
  if (position.restriction_type === "sport") return !!teacher.is_sport_teacher;
  if (position.restriction_type === "division") return position.division === "both" || teacher.division === position.division || teacher.division === "both";
  if (position.restriction_type === "group") return (position.allowed_teacher_ids || []).includes(teacher.id);
  return true;
};
const issue = (type, message, extra = {}) => ({ type, message, ...extra });

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter({ user_id: user.id });
    const actor = profiles[0];
    const isAdmin = user.role === "admin" && actor?.role === "admin";
    const e = base44.asServiceRole.entities;

    if (body.action === "my_assignments") {
      if (!actor) return Response.json({ assignments: [] });
      const assignments = await e.SpecialAssignment.filter({ teacher_id: actor.id, plan_status: "published" }, "date", 200);
      const dayIds = [...new Set(assignments.map(a => a.special_day_id))];
      const days = [];
      for (const id of dayIds) { const day = await e.SpecialDay.get(id); if (day?.status === "published") days.push(day); }
      return Response.json({ assignments, days });
    }
    if (!isAdmin) return Response.json({ error: "Forbidden — נדרשת הרשאת מנהל/ת מערכת" }, { status: 403 });

    const loadPack = async dayId => {
      const [day, slots, positions, requirements, assignments, revisions] = await Promise.all([
        e.SpecialDay.get(dayId), e.SpecialTimeSlot.filter({ special_day_id: dayId }, "sort_order", 200),
        e.SpecialPosition.filter({ special_day_id: dayId }, "sort_order", 200), e.SpecialPositionRequirement.filter({ special_day_id: dayId }, "created_date", 500),
        e.SpecialAssignment.filter({ special_day_id: dayId }, "start_time", 500), e.SpecialDayRevision.filter({ special_day_id: dayId }, "-version", 50)
      ]);
      return { day, slots, positions, requirements, assignments, revisions };
    };
    const snapshot = async (dayId, action) => {
      const pack = await loadPack(dayId);
      const next = (pack.day.version || 1) + 1;
      const day = await e.SpecialDay.update(dayId, { version: next });
      const snap = { day: { ...day }, slots: pack.slots, positions: pack.positions, requirements: pack.requirements, assignments: pack.assignments };
      await e.SpecialDayRevision.create({ special_day_id: dayId, version: next, action, actor_id: user.id, actor_name: actor.full_name, snapshot: snap, created_at: new Date().toISOString() });
      await e.AuditLog.create({ user_id: user.id, user_name: actor.full_name, action, entity_type: "SpecialDay", entity_id: dayId, new_value: JSON.stringify({ version: next }), timestamp: new Date().toISOString() });
      return day;
    };
    const checkVersion = async dayId => {
      const day = await e.SpecialDay.get(dayId);
      if (!day) throw new Error("היום המיוחד לא נמצא");
      if (day.status !== "draft" && !["archive"].includes(body.action)) throw new Error("ניתן לערוך טיוטה בלבד");
      if (body.expected_updated_date && day.updated_date !== body.expected_updated_date) {
        const err = new Error("הטיוטה השתנתה במקביל. יש לרענן ולנסות שוב."); err.code = "concurrent_change"; throw err;
      }
      return day;
    };
    const teacherReason = ({ teacher, day, slot, position, absences, schedules, regular, special, current = [] }) => {
      const reasons = [], dow = new Date(`${day.date}T12:00:00`).getDay();
      if (!teacher.is_active) reasons.push("המורה אינו פעיל");
      if (teacher.is_exempt) reasons.push("קיים פטור מתורנות");
      if ((teacher.days_off || []).includes(dow)) reasons.push("זהו יום חופשי קבוע");
      if (absences.some(a => a.teacher_id === teacher.id && day.date >= a.start_date && day.date <= a.end_date)) reasons.push("קיימת היעדרות מאושרת");
      if (!roleAllowed(teacher, position)) reasons.push("אינו עומד במגבלת התפקיד של העמדה");
      if (day.respect_regular_schedule && schedules.some(s => s.teacher_id === teacher.id && s.day_of_week === dow && overlap(slot.start_time, slot.end_time, s.start_time, s.end_time))) reasons.push("מלמד/ת בזמן זה");
      if (regular.some(a => a.teacher_id === teacher.id && a.date === day.date && overlap(slot.start_time, slot.end_time, a.start_time, a.end_time))) reasons.push("חפיפה עם תורנות רגילה");
      if (special.some(a => a.teacher_id === teacher.id && a.special_day_id !== day.id && a.date === day.date && overlap(slot.start_time, slot.end_time, a.start_time, a.end_time))) reasons.push("חפיפה עם יום מיוחד אחר");
      if (current.some(a => a.teacher_id === teacher.id && overlap(slot.start_time, slot.end_time, a.start_time, a.end_time))) reasons.push("כבר משובץ/ת בזמן חופף");
      const shifts = current.filter(a => a.teacher_id === teacher.id).length;
      if (!day.allow_multiple_shifts && shifts > 0) reasons.push("כבר שובץ/ה למשמרת ביום זה");
      if (day.allow_multiple_shifts && shifts >= (day.max_shifts_per_teacher || 1)) reasons.push("הגיע/ה למספר המשמרות המרבי");
      return reasons;
    };
    const context = async day => {
      const [teachers, absences, schedules, regular, special] = await Promise.all([
        e.TeacherProfile.filter({ is_active: true }), e.Absence.filter({ status: "approved" }), e.WeeklySchedule.filter({ is_active: true }),
        e.Assignment.filter({ date: day.date, plan_status: "published" }), e.SpecialAssignment.filter({ date: day.date, plan_status: "published" })
      ]);
      return { teachers, absences, schedules, regular, special };
    };
    const validate = async pack => {
      const { day, slots, positions, requirements, assignments } = pack;
      const errors = [], warnings = [];
      if (!day.name || !day.date || !day.type) errors.push(issue("required", "חסרים שם, סוג או תאריך"));
      if (!slots.length) errors.push(issue("required", "לא הוגדרו מקטעי זמן"));
      if (!positions.filter(p => p.is_active).length) errors.push(issue("required", "לא הוגדרו עמדות פעילות"));
      slots.forEach(s => { if (!s.name || !s.start_time || !s.end_time || min(s.start_time) >= min(s.end_time)) errors.push(issue("invalid_slot", `מקטע הזמן ${s.name || "ללא שם"} אינו תקין`, { slot_id: s.id })); });
      for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) if (overlap(slots[i].start_time, slots[i].end_time, slots[j].start_time, slots[j].end_time)) errors.push(issue("overlapping_slots", `${slots[i].name} חופף ל-${slots[j].name}`));
      for (const r of requirements) { const count = assignments.filter(a => a.position_id === r.position_id && a.time_slot_id === r.time_slot_id && a.status !== "cancelled").length; if (count < r.required_count) errors.push(issue("understaffed", `חסרים ${r.required_count - count} תורנים`, { position_id: r.position_id, time_slot_id: r.time_slot_id, required: r.required_count, assigned: count })); }
      const ctx = await context(day);
      for (const a of assignments.filter(x => x.status !== "cancelled")) {
        const teacher = ctx.teachers.find(t => t.id === a.teacher_id), slot = slots.find(s => s.id === a.time_slot_id), position = positions.find(p => p.id === a.position_id);
        if (!teacher || !slot || !position) { errors.push(issue("broken_assignment", "שיבוץ מפנה לנתון חסר", { assignment_id: a.id })); continue; }
        const others = assignments.filter(x => x.id !== a.id);
        teacherReason({ teacher, day, slot, position, ...ctx, current: others }).forEach(message => errors.push(issue("teacher_unavailable", `${teacher.full_name}: ${message}`, { assignment_id: a.id, teacher_id: teacher.id })));
      }
      if (ctx.regular.length && !day.replace_regular_schedule && !day.allow_regular_overlap) errors.push(issue("parallel_schedule", "לוח רגיל ויום מיוחד פעילים במקביל ללא אישור מפורש"));
      const counts = ctx.teachers.map(t => assignments.filter(a => a.teacher_id === t.id).length).filter(Boolean);
      if (counts.length > 1 && Math.max(...counts) - Math.min(...counts) > 2) warnings.push(issue("imbalance", "קיים חוסר איזון משמעותי בין המורים"));
      for (const t of ctx.teachers) { const mine = assignments.filter(a => a.teacher_id === t.id), total = mine.reduce((sum, a) => sum + Math.max(0, min(a.end_time) - min(a.start_time)), 0); if (mine.length > (day.max_shifts_per_teacher || 1)) warnings.push(issue("too_many_shifts", `${t.full_name} שובץ/ה ליותר משמרות מהמותר`)); if (total > 120) warnings.push(issue("unusual_minutes", `${t.full_name} שובץ/ה לזמן מצטבר חריג`)); }
      return { errors, warnings, missing: errors.filter(x => x.type === "understaffed"), is_valid: errors.length === 0 };
    };

    if (body.action === "list") {
      const [days, templates] = await Promise.all([e.SpecialDay.list("-date", 100), e.SpecialDayTemplate.list("-created_date", 100)]);
      return Response.json({ days, templates });
    }
    if (body.action === "get") {
      const pack = await loadPack(body.special_day_id); const teachers = await e.TeacherProfile.filter({ is_active: true }); const validation = await validate(pack);
      return Response.json({ ...pack, teachers: teachers.sort((a, b) => a.full_name.localeCompare(b.full_name, "he")), validation });
    }
    if (body.action === "create") {
      const data = body.data || {};
      const day = await e.SpecialDay.create({ name: data.name, type: data.type || "other", date: data.date, description: data.description || "", instructions: data.instructions || "", status: "draft", replace_regular_schedule: data.replace_regular_schedule !== false, allow_regular_overlap: false, respect_regular_schedule: data.respect_regular_schedule !== false, quota_mode: data.quota_mode || "full", allow_multiple_shifts: !!data.allow_multiple_shifts, max_shifts_per_teacher: data.max_shifts_per_teacher || 1, morning_reminder_time: data.morning_reminder_time || "08:00", pre_shift_reminder_minutes: data.pre_shift_reminder_minutes ?? 10, version: 1, created_by_id: user.id, created_by_name: actor.full_name });
      let source = null;
      if (body.mode === "template" && body.source_id) source = await e.SpecialDayTemplate.get(body.source_id);
      if (body.mode === "duplicate" && body.source_id) source = await loadPack(body.source_id);
      if (source) {
        const oldSlots = source.time_slots || source.slots || [], oldPositions = source.positions || [], oldReqs = source.requirements || [];
        const newSlots = oldSlots.length ? await e.SpecialTimeSlot.bulkCreate(oldSlots.map((s, i) => ({ special_day_id: day.id, name: s.name, start_time: s.start_time, end_time: s.end_time, sort_order: s.sort_order ?? i }))) : [];
        const newPositions = oldPositions.length ? await e.SpecialPosition.bulkCreate(oldPositions.map((p, i) => ({ special_day_id: day.id, name: p.name, area: p.area || "", instructions: p.instructions || "", restriction_type: p.restriction_type || "all", division: p.division, allowed_teacher_ids: p.allowed_teacher_ids || [], is_active: p.is_active !== false, sort_order: p.sort_order ?? i }))) : [];
        const slotMap = new Map(oldSlots.map((s, i) => [s.id || i, newSlots[i]?.id])), posMap = new Map(oldPositions.map((p, i) => [p.id || i, newPositions[i]?.id]));
        const reqs = oldReqs.map(r => ({ special_day_id: day.id, time_slot_id: slotMap.get(r.time_slot_id) || newSlots[r.time_slot_index]?.id, position_id: posMap.get(r.position_id) || newPositions[r.position_index]?.id, required_count: r.required_count || 1 })).filter(r => r.time_slot_id && r.position_id);
        if (reqs.length) await e.SpecialPositionRequirement.bulkCreate(reqs);
      }
      await snapshot(day.id, "create_special_day");
      return Response.json({ day: await e.SpecialDay.get(day.id) });
    }

    const day = await checkVersion(body.special_day_id);
    if (body.action === "save_day") { const source = body.data || {}, allowed = ["name", "type", "date", "description", "instructions", "replace_regular_schedule", "allow_regular_overlap", "respect_regular_schedule", "quota_mode", "allow_multiple_shifts", "max_shifts_per_teacher", "morning_reminder_time", "pre_shift_reminder_minutes"], updates = Object.fromEntries(allowed.filter(k => source[k] !== undefined).map(k => [k, source[k]])); await e.SpecialDay.update(day.id, updates); await snapshot(day.id, "update_special_day"); return Response.json(await loadPack(day.id)); }
    if (body.action === "add_slot") { await e.SpecialTimeSlot.create({ special_day_id: day.id, ...body.data }); await snapshot(day.id, "add_time_slot"); return Response.json(await loadPack(day.id)); }
    if (body.action === "update_slot") { await e.SpecialTimeSlot.update(body.id, body.data); await snapshot(day.id, "update_time_slot"); return Response.json(await loadPack(day.id)); }
    if (body.action === "delete_slot") { await e.SpecialAssignment.deleteMany({ special_day_id: day.id, time_slot_id: body.id }); await e.SpecialPositionRequirement.deleteMany({ special_day_id: day.id, time_slot_id: body.id }); await e.SpecialTimeSlot.delete(body.id); await snapshot(day.id, "delete_time_slot"); return Response.json(await loadPack(day.id)); }
    if (body.action === "add_position") { await e.SpecialPosition.create({ special_day_id: day.id, ...body.data }); await snapshot(day.id, "add_position"); return Response.json(await loadPack(day.id)); }
    if (body.action === "update_position") { await e.SpecialPosition.update(body.id, body.data); await snapshot(day.id, "update_position"); return Response.json(await loadPack(day.id)); }
    if (body.action === "delete_position") { await e.SpecialAssignment.deleteMany({ special_day_id: day.id, position_id: body.id }); await e.SpecialPositionRequirement.deleteMany({ special_day_id: day.id, position_id: body.id }); await e.SpecialPosition.delete(body.id); await snapshot(day.id, "delete_position"); return Response.json(await loadPack(day.id)); }
    if (body.action === "set_requirement") { const found = await e.SpecialPositionRequirement.filter({ special_day_id: day.id, position_id: body.position_id, time_slot_id: body.time_slot_id }); if (found[0]) await e.SpecialPositionRequirement.update(found[0].id, { required_count: Math.max(0, Number(body.required_count) || 0) }); else await e.SpecialPositionRequirement.create({ special_day_id: day.id, position_id: body.position_id, time_slot_id: body.time_slot_id, required_count: Math.max(0, Number(body.required_count) || 0) }); await snapshot(day.id, "set_requirement"); return Response.json(await loadPack(day.id)); }
    if (body.action === "candidates") { const pack = await loadPack(day.id), slot = pack.slots.find(s => s.id === body.time_slot_id), position = pack.positions.find(p => p.id === body.position_id), ctx = await context(day); const candidates = ctx.teachers.map(teacher => { const reasons = teacherReason({ teacher, day, slot, position, ...ctx, current: pack.assignments }); const count = pack.assignments.filter(a => a.teacher_id === teacher.id).length, minutes = pack.assignments.filter(a => a.teacher_id === teacher.id).reduce((s, a) => s + duration(a), 0); return { id: teacher.id, full_name: teacher.full_name, available: !reasons.length, reasons, count, minutes }; }).sort((a, b) => Number(b.available) - Number(a.available) || a.count - b.count || a.minutes - b.minutes || a.full_name.localeCompare(b.full_name, "he")); return Response.json({ candidates }); }
    if (body.action === "assign") { const pack = await loadPack(day.id), slot = pack.slots.find(s => s.id === body.time_slot_id), position = pack.positions.find(p => p.id === body.position_id), ctx = await context(day), teacher = ctx.teachers.find(t => t.id === body.teacher_id); if (!slot || !position || !teacher) return Response.json({ error: "נתוני השיבוץ חסרים" }, { status: 400 }); const reasons = teacherReason({ teacher, day, slot, position, ...ctx, current: pack.assignments }); if (reasons.length) return Response.json({ error: reasons.join("; "), reasons }, { status: 409 }); await e.SpecialAssignment.create({ special_day_id: day.id, special_day_name: day.name, date: day.date, time_slot_id: slot.id, time_slot_name: slot.name, start_time: slot.start_time, end_time: slot.end_time, position_id: position.id, position_name: position.name, position_instructions: [day.instructions, position.instructions].filter(Boolean).join("\n"), teacher_id: teacher.id, teacher_name: teacher.full_name, status: "scheduled", source: body.source || "manual", plan_status: "draft" }); await snapshot(day.id, "assign_teacher"); return Response.json(await loadPack(day.id)); }
    if (body.action === "unassign") { await e.SpecialAssignment.delete(body.assignment_id); await snapshot(day.id, "unassign_teacher"); return Response.json(await loadPack(day.id)); }
    if (body.action === "generate") { const pack = await loadPack(day.id), ctx = await context(day); await e.SpecialAssignment.deleteMany({ special_day_id: day.id, plan_status: "draft" }); const current = []; for (const r of pack.requirements) { const slot = pack.slots.find(s => s.id === r.time_slot_id), position = pack.positions.find(p => p.id === r.position_id); if (!slot || !position || !position.is_active) continue; for (let n = 0; n < r.required_count; n++) { const ranked = ctx.teachers.map(teacher => ({ teacher, reasons: teacherReason({ teacher, day, slot, position, ...ctx, current }), count: current.filter(a => a.teacher_id === teacher.id).length, minutes: current.filter(a => a.teacher_id === teacher.id).reduce((s, a) => s + duration(a), 0) })).filter(x => !x.reasons.length).sort((a, b) => a.count - b.count || a.minutes - b.minutes || a.teacher.full_name.localeCompare(b.teacher.full_name, "he")); if (!ranked[0]) continue; const t = ranked[0].teacher; current.push({ special_day_id: day.id, special_day_name: day.name, date: day.date, time_slot_id: slot.id, time_slot_name: slot.name, start_time: slot.start_time, end_time: slot.end_time, position_id: position.id, position_name: position.name, position_instructions: position.instructions || "", teacher_id: t.id, teacher_name: t.full_name, status: "scheduled", source: "smart", plan_status: "draft" }); } } if (current.length) await e.SpecialAssignment.bulkCreate(current); await snapshot(day.id, "generate_smart_draft"); return Response.json({ ...(await loadPack(day.id)), created: current.length }); }
    if (body.action === "validate") return Response.json(await validate(await loadPack(day.id)));
    if (body.action === "publish") { const pack = await loadPack(day.id), result = await validate(pack); if (result.errors.length) return Response.json({ error: "נמצאו שגיאות חוסמות", ...result }, { status: 400 }); if (result.warnings.length && !body.override_reason?.trim()) return Response.json({ error: "נדרשת סיבה לפרסום עם אזהרות", requires_reason: true, ...result }, { status: 422 }); await e.SpecialAssignment.updateMany({ special_day_id: day.id, plan_status: "draft" }, { $set: { plan_status: "published" } }); const published = await e.SpecialDay.update(day.id, { status: "published", published_at: new Date().toISOString() }); const ids = [...new Set(pack.assignments.map(a => a.teacher_id))], notifications = []; for (const id of ids) { const t = (await e.TeacherProfile.filter({ id }))[0]; if (t?.user_id) notifications.push({ user_id: t.user_id, title: `יום מיוחד: ${day.name}`, body: `פורסם עבורך שיבוץ ל-${day.date}. יש להיכנס לצפייה בפרטים.`, type: "special_day", link: "/my-duties", is_read: false, is_operational: true, created_at: new Date().toISOString() }); } if (notifications.length) await e.Notification.bulkCreate(notifications); await snapshot(day.id, "publish_special_day"); return Response.json({ day: published, notified: notifications.length, validation: result }); }
    if (body.action === "save_template") { const pack = await loadPack(day.id); const slotIndex = new Map(pack.slots.map((s, i) => [s.id, i])), posIndex = new Map(pack.positions.map((p, i) => [p.id, i])); const template = await e.SpecialDayTemplate.create({ name: body.name || day.name, type: day.type, description: day.description || "", instructions: day.instructions || "", settings: { replace_regular_schedule: day.replace_regular_schedule, respect_regular_schedule: day.respect_regular_schedule, quota_mode: day.quota_mode, allow_multiple_shifts: day.allow_multiple_shifts, max_shifts_per_teacher: day.max_shifts_per_teacher }, time_slots: pack.slots.map(({ id, ...s }) => s), positions: pack.positions.map(({ id, ...p }) => p), requirements: pack.requirements.map(r => ({ time_slot_index: slotIndex.get(r.time_slot_id), position_index: posIndex.get(r.position_id), required_count: r.required_count })), created_by_id: user.id }); return Response.json({ template }); }
    if (body.action === "restore") { const revision = await e.SpecialDayRevision.get(body.revision_id); if (!revision || revision.special_day_id !== day.id) return Response.json({ error: "גרסה לא נמצאה" }, { status: 404 }); const snap = revision.snapshot; await Promise.all([e.SpecialAssignment.deleteMany({ special_day_id: day.id }), e.SpecialPositionRequirement.deleteMany({ special_day_id: day.id }), e.SpecialTimeSlot.deleteMany({ special_day_id: day.id }), e.SpecialPosition.deleteMany({ special_day_id: day.id })]); const slots = snap.slots.length ? await e.SpecialTimeSlot.bulkCreate(snap.slots.map(({ id, ...s }) => ({ ...s, special_day_id: day.id }))) : [], positions = snap.positions.length ? await e.SpecialPosition.bulkCreate(snap.positions.map(({ id, ...p }) => ({ ...p, special_day_id: day.id }))) : []; const sm = new Map(snap.slots.map((s, i) => [s.id, slots[i]?.id])), pm = new Map(snap.positions.map((p, i) => [p.id, positions[i]?.id])); if (snap.requirements.length) await e.SpecialPositionRequirement.bulkCreate(snap.requirements.map(({ id, ...r }) => ({ ...r, special_day_id: day.id, time_slot_id: sm.get(r.time_slot_id), position_id: pm.get(r.position_id) }))); if (snap.assignments.length) await e.SpecialAssignment.bulkCreate(snap.assignments.map(({ id, ...a }) => ({ ...a, special_day_id: day.id, time_slot_id: sm.get(a.time_slot_id), position_id: pm.get(a.position_id), plan_status: "draft" }))); await e.SpecialDay.update(day.id, { name: snap.day.name, type: snap.day.type, date: snap.day.date, description: snap.day.description || "", instructions: snap.day.instructions || "", status: "draft" }); await snapshot(day.id, "restore_version"); return Response.json(await loadPack(day.id)); }
    if (body.action === "archive") { const archived = await e.SpecialDay.update(day.id, { status: "archived" }); await e.SpecialAssignment.updateMany({ special_day_id: day.id }, { $set: { status: "cancelled" } }); return Response.json({ day: archived }); }
    return Response.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (error) {
    const status = error.code === "concurrent_change" ? 409 : 500;
    return Response.json({ error: error.message, code: error.code || "server_error" }, { status });
  }
});