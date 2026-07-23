import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { dutyEligibility } from "../../shared/dutyEligibility.js";

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const e = base44.asServiceRole.entities;
    const actors = await e.TeacherProfile.filter({ user_id: user.id }, "-updated_date", 1);
    const actor = actors[0];
    if (user.role !== "admin" || actor?.role !== "admin") return Response.json({ error: "Forbidden — נדרשת הרשאת מנהל/ת מערכת" }, { status: 403 });
    const body = await req.json();
    if (body.action !== "update" || !body.teacher_id || !body.data) return Response.json({ error: "בקשה לא תקינה" }, { status: 400 });
    const before = await e.TeacherProfile.get(body.teacher_id);
    if (!before) return Response.json({ error: "המורה לא נמצא" }, { status: 404 });
    const updated = await e.TeacherProfile.update(before.id, body.data);
    const eligibilityChanged = before.role !== updated.role || !!before.is_exempt !== !!updated.is_exempt;
    const eligibility = dutyEligibility(updated);
    let affected = 0;
    if (eligibilityChanged && !eligibility.eligible) {
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", dateStyle: "short" }).format(new Date());
      const [regular, special, exceptions, templates, admins] = await Promise.all([
        e.Assignment.filter({ teacher_id: updated.id, date: { $gte: today } }, "date", 500),
        e.SpecialAssignment.filter({ teacher_id: updated.id, date: { $gte: today }, status: { $ne: "cancelled" } }, "date", 500),
        e.DutyException.filter({ date: { $gte: today } }, "date", 500),
        e.FixedDutyTemplate.list("-updated_date", 5),
        e.TeacherProfile.filter({ role: "admin", is_active: true }, "full_name", 100)
      ]);
      const datedExceptions = exceptions.filter(item => (item.teacher_ids || []).includes(updated.id)).length;
      const fixed = templates.some(template => (template.assignments || []).some(item => (item.teacher_ids || []).includes(updated.id))) ? 1 : 0;
      affected = regular.length + special.length + datedExceptions + fixed;
      if (affected > 0) {
        const notifications = admins.filter(admin => admin.user_id).map(admin => ({
          user_id: admin.user_id,
          title: "שיבוץ קריטי דורש החלפה",
          body: `${updated.full_name} אינו/ה כשיר/ה עוד לתורנות. נמצאו ${affected} שיבוצים עתידיים או קבועים שיש להחליף לפני פרסום.`,
          type: "uncovered_station",
          link: "/schedule",
          is_read: false,
          is_operational: true,
          created_at: new Date().toISOString()
        }));
        if (notifications.length) await e.Notification.bulkCreate(notifications);
      }
    }
    return Response.json({ teacher: updated, eligibility, critical_assignments: affected });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});