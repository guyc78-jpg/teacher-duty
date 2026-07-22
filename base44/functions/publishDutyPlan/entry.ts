import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isSchoolDate } from '../../shared/schoolDays.js';

// פרסום תוכנית שיבוץ — הופך טיוטה לפעילה, שולח התראות למורים שהשתבצו

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter({ user_id: user.id });
    const teacher = profiles[0];
    if (!teacher || teacher.role !== "admin") {
      return Response.json({ error: "Forbidden — נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const { plan_id } = body;
    if (!plan_id) return Response.json({ error: "נדרש מזהה תוכנית" }, { status: 400 });

    // בדיקות תקינות לפני פרסום
    const assignments = await base44.asServiceRole.entities.Assignment.filter({ plan_id });
    const conflicts = [];

    // חסימה קשיחה בצד השרת: אין לפרסם שיבוץ בשישי או בשבת
    assignments.filter(a => !isSchoolDate(a.date)).forEach(a => {
      conflicts.push({ type: "weekend_assignment", date: a.date, teacher: a.teacher_name });
    });

    // בדיקת עמדות ללא כיסוי
    const stations = await base44.asServiceRole.entities.Station.filter({ is_active: true });
    const breaks = await base44.asServiceRole.entities.Break.filter({ is_active: true });

    // בדיקת התנגשויות — מורה בשתי עמדות באותה הפסקה
    const byTeacherBreak = {};
    assignments.forEach(a => {
      const key = `${a.teacher_id}_${a.date}_${a.break_type}`;
      if (!byTeacherBreak[key]) byTeacherBreak[key] = [];
      byTeacherBreak[key].push(a);
    });
    Object.entries(byTeacherBreak).forEach(([key, asgn]) => {
      if (asgn.length > 1) {
        conflicts.push({ type: "double_booking", date: asgn[0].date, teacher: asgn[0].teacher_name });
      }
    });

    if (conflicts.length > 0) {
      return Response.json({ error: "נמצאו התנגשויות — לא ניתן לפרסם", conflicts }, { status: 400 });
    }

    // עדכון סטטוס התוכנית
    await base44.asServiceRole.entities.DutyPlan.update(plan_id, {
      status: "published",
      published_at: new Date().toISOString()
    });

    // עדכון כל השיבוצים ל־published
    await base44.asServiceRole.entities.Assignment.updateMany(
      { plan_id },
      { $set: { plan_status: "published" } }
    );

    // שליחת התראות למורים
    const teacherIds = [...new Set(assignments.map(a => a.teacher_id))];
    const teacherProfiles = await base44.asServiceRole.entities.TeacherProfile.filter({});
    const notified = new Set();
    for (const tid of teacherIds) {
      const tp = teacherProfiles.find(t => t.id === tid);
      if (!tp || !tp.user_id) continue;
      if (notified.has(tp.user_id)) continue;
      notified.add(tp.user_id);
      const myAssignments = assignments.filter(a => a.teacher_id === tid);
      await base44.asServiceRole.entities.Notification.create({
        user_id: tp.user_id,
        title: "לוח תורנויות פורסם",
        body: `פורסם לוח תורנויות חדש. יש לך ${myAssignments.length} תורנויות.`,
        type: "plan_published",
        link: "/my-duties",
        is_operational: true,
        created_at: new Date().toISOString()
      });
    }

    // יומן ביקורת
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: teacher.full_name,
      action: "publish_plan",
      entity_type: "DutyPlan",
      entity_id: plan_id,
      new_value: JSON.stringify({ assignments: assignments.length, notified: notified.size }),
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, published: assignments.length, notified: notified.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});