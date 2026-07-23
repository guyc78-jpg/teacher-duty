import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const e = base44.asServiceRole.entities, now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`, nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const days = await e.SpecialDay.filter({ date, status: "published" });
    let created = 0, pushed = 0;
    for (const day of days) {
      const assignments = await e.SpecialAssignment.filter({ special_day_id: day.id, plan_status: "published", status: "scheduled" });
      const morning = (day.morning_reminder_time || "08:00").split(":").map(Number), morningMinutes = morning[0] * 60 + morning[1];
      for (const assignment of assignments) {
        const teacher = await e.TeacherProfile.get(assignment.teacher_id); if (!teacher?.user_id) continue;
        const start = assignment.start_time.split(":").map(Number), preMinutes = start[0] * 60 + start[1] - (day.pre_shift_reminder_minutes ?? 10);
        const dueMorning = nowMinutes >= morningMinutes && nowMinutes < morningMinutes + 5;
        const duePre = nowMinutes >= preMinutes && nowMinutes < preMinutes + 5;
        const kind = duePre ? "pre" : dueMorning ? "morning" : null; if (!kind) continue;
        const key = kind === "morning" ? `${day.id}:${teacher.id}:morning:${date}` : `${day.id}:${assignment.id}:pre:${date}`;
        if ((await e.Notification.filter({ reminder_key: key })).length) continue;
        const title = kind === "morning" ? `היום: ${day.name}` : `תורנות בעוד ${day.pre_shift_reminder_minutes ?? 10} דקות`;
        const text = kind === "morning" ? `יש לך תורנות ב-${assignment.start_time}, ${assignment.position_name}.` : `${assignment.position_name} · ${assignment.start_time}–${assignment.end_time}`;
        await e.Notification.create({ user_id: teacher.user_id, title, body: text, type: "special_day", link: "/my-duties", reference_id: assignment.id, reminder_key: key, is_read: false, is_operational: true, created_at: now.toISOString() }); created++;
        try { const result = await base44.functions.invoke("sendPushNotification", { title, body: text, url: "/my-duties", target_user_id: teacher.user_id }); pushed += result?.data?.sent || 0; } catch {}
      }
    }
    return Response.json({ date, checked_days: days.length, created, pushed });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});