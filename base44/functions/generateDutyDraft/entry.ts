import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { buildWeeklyDraft } from "../../shared/weeklyConstraintEngine.js";
import { loadAll } from "../../shared/entityPaging.js";

const toDate = value => new Date(`${value}T12:00:00Z`);
const iso = date => date.toISOString().slice(0, 10);

Deno.serve(async req => {
  let planId = null;
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const e = base44.asServiceRole.entities, body = await req.json();
    const profiles = await e.TeacherProfile.filter({ user_id: user.id }, "-updated_date", 1), actor = profiles[0];
    if (!actor || actor.role !== "admin") return Response.json({ error: "נדרשת הרשאת מנהל/ת מערכת" }, { status: 403 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.start_date || "")) return Response.json({ error: "נדרש תאריך יום ראשון תקין" }, { status: 400 });
    const start = toDate(body.start_date);
    if (start.getUTCDay() !== 0) return Response.json({ error: "תאריך ההתחלה חייב להיות יום ראשון" }, { status: 422 });
    const dates = Array.from({ length: 5 }, (_, day) => { const date = new Date(start); date.setUTCDate(date.getUTCDate() + day); return iso(date); });
    const [teachers, stations, breaks, schedules, rules, templates, settings] = await Promise.all([
      e.TeacherProfile.filter({ is_active: true }, "full_name", 500), e.Station.filter({ is_active: true }, "sort_order", 100),
      e.Break.filter({ is_active: true }, "sort_order", 25), loadAll(e.WeeklySchedule, { is_active: true }, "start_time"),
      e.DutyRule.filter({ is_active: true }, "sort_order", 25), e.FixedDutyTemplate.list("-updated_date", 1), Promise.resolve([])
    ]);
    const activeTeachers = teachers;
    const template = templates[0], locked = template?.published_assignments?.length ? template.published_assignments : template?.assignments || [];
    const generated = buildWeeklyDraft({ teachers: activeTeachers, stations, breaks, schedules, rules }, locked);
    if (generated.blocking.length) return Response.json({ error: "שיבוצים נעולים מפרים כלל חובה. לא נשמרה טיוטה.", blocking_sample: generated.blocking.slice(0, 10), draft_report: generated.report }, { status: 422 });
    const plan = await e.DutyPlan.create({ name: body.plan_name || `טיוטת שבוע ${dates[0]}`, start_date: dates[0], end_date: dates[4], version: 1, status: "saved", is_management: false, created_by: actor.full_name, notes: "טיוטה אוטומטית — לא פורסמה" });
    planId = plan.id;
    const assignments = generated.assignments.flatMap(item => (item.teacher_ids || []).map((teacherId, index) => ({
      plan_id: plan.id, date: dates[Number(item.day_of_week)], day_of_week: Number(item.day_of_week), break_type: item.break_type,
      break_name: breaks.find(brk => brk.break_type === item.break_type)?.name || item.break_type,
      start_time: breaks.find(brk => brk.break_type === item.break_type)?.start_time || "", end_time: breaks.find(brk => brk.break_type === item.break_type)?.end_time || "",
      station_id: item.station_id, station_name: stations.find(station => station.id === item.station_id)?.name || "",
      teacher_id: teacherId, teacher_name: item.teacher_names?.[index] || activeTeachers.find(teacher => teacher.id === teacherId)?.full_name || "",
      source: item.locked ? "manual" : "auto", status: "scheduled", plan_status: "saved"
    })));
    if (assignments.length) await e.Assignment.bulkCreate(assignments);
    await e.AuditLog.create({ user_id: user.id, user_name: actor.full_name, action: "create_weekly_constraint_draft", entity_type: "DutyPlan", entity_id: plan.id, new_value: JSON.stringify({ required: generated.report.summary.required, assigned: generated.report.summary.assigned, missing: generated.report.summary.missing }), timestamp: new Date().toISOString() });
    return Response.json({ plan_id: plan.id, status: "saved", start_date: dates[0], end_date: dates[4], assignments_created: assignments.length, draft_report: generated.report });
  } catch (error) {
    if (planId) {
      try { const rollback = createClientFromRequest(req).asServiceRole.entities; await rollback.Assignment.deleteMany({ plan_id: planId }); await rollback.DutyPlan.delete(planId); } catch (_) { /* rollback best effort */ }
    }
    return Response.json({ error: error.message, atomic_rollback: !!planId }, { status: 500 });
  }
});