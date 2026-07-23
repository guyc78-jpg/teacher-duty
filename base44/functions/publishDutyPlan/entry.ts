import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { validateDutyPlan } from "../../shared/dutyPlanValidation.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter({ user_id: user.id });
    const actor = profiles[0];
    if (!actor || actor.role !== "admin") return Response.json({ error: "Forbidden — נדרשת הרשאת מנהל" }, { status: 403 });
    const body = await req.json();
    if (!body.plan_id) return Response.json({ error: "נדרש מזהה תוכנית" }, { status: 400 });
    const plan = await base44.asServiceRole.entities.DutyPlan.get(body.plan_id);
    if (!plan || plan.status !== "saved") return Response.json({ error: "התוכנית השמורה אינה זמינה לפרסום" }, { status: 409 });
    if (body.expected_updated_date && plan.updated_date !== body.expected_updated_date) return Response.json({ error: "התוכנית השתנתה במקביל. יש לרענן לפני פרסום.", code: "concurrent_change" }, { status: 409 });

    const [assignments, teachers, schedules, absences, stations, breaks, rules, published] = await Promise.all([
      base44.asServiceRole.entities.Assignment.filter({ plan_id: plan.id }),
      base44.asServiceRole.entities.TeacherProfile.filter({ is_active: true }),
      base44.asServiceRole.entities.WeeklySchedule.filter({ is_active: true }),
      base44.asServiceRole.entities.Absence.filter({ status: "approved" }),
      base44.asServiceRole.entities.Station.filter({ is_active: true }),
      base44.asServiceRole.entities.Break.filter({ is_active: true }),
      base44.asServiceRole.entities.DutyRule.filter({ is_active: true }),
      base44.asServiceRole.entities.Assignment.filter({ plan_status: "published" })
    ]);
    const validation = validateDutyPlan(assignments, { assignments, teachers, schedules, absences, stations, breaks, rules }, { includeUnderQuota: true });
    if (validation.errors.length) return Response.json({ error: "נמצאו שגיאות חוסמות", conflicts: validation.errors, warnings: validation.warnings }, { status: 400 });
    if (validation.warnings.length && !body.override_reason?.trim()) return Response.json({ error: "נדרשת סיבה לפרסום עם אזהרות", warnings: validation.warnings, requires_reason: true }, { status: 422 });

    const oldBySlot = new Map(published.filter(item => item.plan_id !== plan.id).map(item => [`${item.date}|${item.break_type}|${item.station_id}`, item.teacher_id]));
    const changedTeacherIds = new Set();
    assignments.forEach(item => { if (oldBySlot.get(`${item.date}|${item.break_type}|${item.station_id}`) !== item.teacher_id) changedTeacherIds.add(item.teacher_id); });
    await base44.asServiceRole.entities.Assignment.updateMany({ plan_id: plan.id }, { $set: { plan_status: "published" } });
    const publishedPlan = await base44.asServiceRole.entities.DutyPlan.update(plan.id, { status: "published", published_at: new Date().toISOString(), notes: body.override_reason?.trim() || plan.notes || "" });

    let notified = 0;
    for (const teacherId of [...changedTeacherIds].filter(Boolean)) {
      const teacher = teachers.find(item => item.id === teacherId);
      if (!teacher?.user_id) continue;
      await base44.asServiceRole.entities.Notification.create({ user_id: teacher.user_id, title: "לוח התורנויות עודכן", body: "נוסף או השתנה שיבוץ שלך. יש להיכנס למערכת לצפייה בפרטים.", type: "assignment_change", link: "/my-duties", is_operational: true, created_at: new Date().toISOString() });
      notified++;
    }
    await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_name: actor.full_name, action: "publish_plan", entity_type: "DutyPlan", entity_id: plan.id, new_value: JSON.stringify({ assignments: assignments.length, notified, warning_reason: body.override_reason || "" }), timestamp: new Date().toISOString() });
    return Response.json({ success: true, plan: publishedPlan, published: assignments.length, notified, warnings: validation.warnings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});