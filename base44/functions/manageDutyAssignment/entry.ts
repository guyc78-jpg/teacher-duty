import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { isSchoolDate } from "../../shared/schoolDays.js";
import { teacherAvailability, validateDutyPlan } from "../../shared/dutyPlanValidation.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter({ user_id: user.id });
    const actor = profiles[0];
    if (!actor || actor.role !== "admin") return Response.json({ error: "Forbidden — נדרשת הרשאת מנהל" }, { status: 403 });

    const body = await req.json();
    const { action, plan_id } = body;
    if (!plan_id) return Response.json({ error: "נדרש מזהה תוכנית" }, { status: 400 });
    const plan = await base44.asServiceRole.entities.DutyPlan.get(plan_id);
    if (!plan) return Response.json({ error: "התוכנית לא נמצאה" }, { status: 404 });

    const [assignments, teachers, schedules, absences, stations, breaks, rules] = await Promise.all([
      base44.asServiceRole.entities.Assignment.filter({ plan_id }),
      base44.asServiceRole.entities.TeacherProfile.filter({ is_active: true }),
      base44.asServiceRole.entities.WeeklySchedule.filter({ is_active: true }),
      base44.asServiceRole.entities.Absence.filter({ status: "approved" }),
      base44.asServiceRole.entities.Station.filter({ is_active: true }),
      base44.asServiceRole.entities.Break.filter({ is_active: true }),
      base44.asServiceRole.entities.DutyRule.filter({ is_active: true })
    ]);
    const data = { assignments, teachers, schedules, absences, stations, breaks, rules };

    if (action === "validate") {
      return Response.json(validateDutyPlan(assignments, data, { includeUnderQuota: body.include_under_quota === true }));
    }

    if (action === "candidates") {
      const assignment = body.assignment_id
        ? assignments.find(item => item.id === body.assignment_id)
        : buildSlot(body, stations, breaks);
      if (!assignment) return Response.json({ error: "השיבוץ לא נמצא" }, { status: 404 });
      const candidates = teachers.map(teacher => ({ teacher, ...teacherAvailability(teacher, assignment, data) }))
        .sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score)
        .map(item => ({ id: item.teacher.id, full_name: item.teacher.full_name, available: item.available, reasons: item.reasons, warnings: item.warnings, score: item.score }));
      return Response.json({ candidates });
    }

    if (plan.status !== "draft") return Response.json({ error: "ניתן לערוך טיוטה בלבד" }, { status: 409 });
    if (body.expected_plan_updated_date && plan.updated_date !== body.expected_plan_updated_date) {
      return Response.json({ error: "הטיוטה השתנתה על ידי משתמש אחר. יש לרענן לפני שמירה.", code: "concurrent_change" }, { status: 409 });
    }

    if (action === "restore") {
      const target = Number(body.version);
      if (!Number.isInteger(target) || target < 1 || target >= (plan.version || 1)) return Response.json({ error: "גרסה לא תקינה" }, { status: 400 });
      const revisions = await base44.asServiceRole.entities.AssignmentRevision.filter({ plan_id });
      const toUndo = revisions.filter(item => item.version > target).sort((a, b) => b.version - a.version);
      for (const revision of toUndo) {
        if (revision.action === "add") await base44.asServiceRole.entities.Assignment.delete(revision.assignment_id);
        else await base44.asServiceRole.entities.Assignment.update(revision.assignment_id, { teacher_id: revision.previous_teacher_id || null, teacher_name: revision.previous_teacher_name || "", source: "manual" });
      }
      const nextPlan = await base44.asServiceRole.entities.DutyPlan.update(plan_id, { version: (plan.version || 1) + 1, notes: `שוחזרה גרסה ${target}` });
      await writeAudit(base44, user, actor, plan_id, "restore_version", { target, changes: toUndo.length });
      return Response.json({ success: true, plan: nextPlan, restored_changes: toUndo.length });
    }

    if (!isSchoolDate(body.date || assignments.find(item => item.id === body.assignment_id)?.date)) {
      return Response.json({ error: "אין ליצור או לערוך שיבוץ ביום שישי או שבת" }, { status: 400 });
    }

    let assignment = assignments.find(item => item.id === body.assignment_id);
    if (assignment && body.expected_assignment_updated_date && assignment.updated_date !== body.expected_assignment_updated_date) {
      return Response.json({ error: "השיבוץ השתנה במקביל. יש לרענן ולנסות שוב.", code: "concurrent_change" }, { status: 409 });
    }
    if (!assignment) assignment = buildSlot(body, stations, breaks);
    if (!assignment) return Response.json({ error: "נתוני העמדה או ההפסקה חסרים" }, { status: 400 });

    const previous = assignment.id ? { ...assignment } : null;
    let teacher = null;
    if (body.teacher_id) {
      teacher = teachers.find(item => item.id === body.teacher_id);
      const availability = teacherAvailability(teacher, assignment, data);
      if (!availability.available) return Response.json({ error: availability.reasons.join(", "), unavailable: true }, { status: 422 });
      if (availability.warnings.length && !body.override_reason?.trim()) return Response.json({ error: "נדרשת סיבת חריגה", warnings: availability.warnings, requires_reason: true }, { status: 422 });
    }

    const payload = { ...assignment, teacher_id: teacher?.id || null, teacher_name: teacher?.full_name || "", source: "manual", plan_status: "draft" };
    delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
    const saved = previous
      ? await base44.asServiceRole.entities.Assignment.update(previous.id, payload)
      : await base44.asServiceRole.entities.Assignment.create(payload);
    const nextVersion = (plan.version || 1) + 1;
    const nextPlan = await base44.asServiceRole.entities.DutyPlan.update(plan_id, { version: nextVersion });
    const editAction = previous ? (teacher ? "assign" : "remove") : "add";
    await base44.asServiceRole.entities.AssignmentRevision.create({
      plan_id, assignment_id: saved.id, version: nextVersion, action: editAction,
      previous_teacher_id: previous?.teacher_id || null, previous_teacher_name: previous?.teacher_name || "",
      new_teacher_id: teacher?.id || null, new_teacher_name: teacher?.full_name || "",
      override_reason: body.override_reason?.trim() || "", changed_by_id: user.id,
      changed_by_name: actor.full_name, changed_at: new Date().toISOString(), assignment_snapshot: previous || {}
    });
    await writeAudit(base44, user, actor, saved.id, "edit_assignment", { previous_teacher: previous?.teacher_name || "", new_teacher: teacher?.full_name || "", reason: body.override_reason || "" });
    return Response.json({ success: true, assignment: saved, plan: nextPlan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildSlot(body, stations, breaks) {
  const station = stations.find(item => item.id === body.station_id);
  const brk = breaks.find(item => item.break_type === body.break_type && item.active_days?.includes(new Date(`${body.date}T12:00:00`).getDay()));
  if (!station || !brk) return null;
  return { plan_id: body.plan_id, date: body.date, day_of_week: new Date(`${body.date}T12:00:00`).getDay(), break_type: brk.break_type, break_name: brk.name, start_time: brk.start_time, end_time: brk.end_time, station_id: station.id, station_name: station.name, is_sport_station: station.is_sport_station, status: "scheduled" };
}

async function writeAudit(base44, user, actor, entityId, action, value) {
  await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_name: actor.full_name, action, entity_type: "Assignment", entity_id: entityId, new_value: JSON.stringify(value), timestamp: new Date().toISOString() });
}