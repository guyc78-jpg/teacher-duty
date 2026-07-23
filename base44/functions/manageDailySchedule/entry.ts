import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { keyOf, mins, unique, makeSlot, candidate } from "../../shared/dutySlotLogic.js";
import { dutyEligibility } from "../../shared/dutyEligibility.js";

const dayOf = value => new Date(`${value}T12:00:00`).getDay();
const isoDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const e = base44.asServiceRole.entities, body = await req.json();
    const profiles = await e.TeacherProfile.filter({ user_id: user.id }, "-updated_date", 1), actor = profiles[0];
    if (!actor || actor.role !== "admin") return Response.json({ error: "נדרשת הרשאת מנהל/ת מערכת" }, { status: 403 });
    const templates = await e.FixedDutyTemplate.list("-updated_date", 1);
    let template = templates[0];
    if (!template) template = await e.FixedDutyTemplate.create({ name: "לוח תורנויות קבוע", status: "saved", version: 1, assignments: [], published_assignments: [] });

    if (body.action === "load") {
      const dates = (body.dates || []).filter(isoDate).slice(0, 7);
      const [stations, breaks, teachers, exceptions, specialDays] = await Promise.all([
        e.Station.filter({ is_active: true }, "sort_order", 100),
        e.Break.filter({ is_active: true }, "sort_order", 25),
        e.TeacherProfile.filter({ is_active: true }, "full_name", 500),
        dates.length ? e.DutyException.filter({ date: { $in: dates } }, "date", 500) : Promise.resolve([]),
        dates.length ? e.SpecialDay.filter({ date: { $in: dates }, status: "published" }, "date", 25) : Promise.resolve([])
      ]);
      return Response.json({
        template_assignments: template.assignments || [],
        template_updated_date: template.updated_date,
        exceptions,
        stations: stations.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        breaks: breaks.sort((a, b) => mins(a.start_time) - mins(b.start_time)),
        teachers: teachers.map(t => ({ id: t.id, full_name: t.full_name, is_homeroom: !!t.is_homeroom })),
        special_days: specialDays.map(d => ({ id: d.id, name: d.name, date: d.date }))
      });
    }

    if (!isoDate(body.date) || dayOf(body.date) > 4) return Response.json({ error: "ניתן לשבץ רק בימים ראשון–חמישי" }, { status: 400 });
    const dow = dayOf(body.date);
    const [teachers, stations, breaks, schedules, absences, rules, exceptions] = await Promise.all([
      e.TeacherProfile.filter({ is_active: true }, "full_name", 500),
      e.Station.filter({ is_active: true }, "sort_order", 100),
      e.Break.filter({ is_active: true }, "sort_order", 25),
      e.WeeklySchedule.filter({ is_active: true, day_of_week: dow }, "start_time", 1000),
      e.Absence.filter({ status: "approved" }, "-start_date", 500),
      e.DutyRule.filter({ is_active: true }, "sort_order", 25),
      e.DutyException.filter({ date: body.date }, "created_date", 200)
    ]);
    const overridden = new Set(exceptions.map(x => `${x.break_type}|${x.station_id}`));
    const effective = [
      ...(template.assignments || []).filter(item => Number(item.day_of_week) === dow && !overridden.has(`${item.break_type}|${item.station_id}`)),
      ...exceptions.map(x => ({ day_of_week: dow, break_type: x.break_type, station_id: x.station_id, teacher_ids: x.teacher_ids || [] }))
    ];
    const data = { teachers, stations, breaks, schedules, absences, rules, assignments: effective };
    const slot = { ...makeSlot({ day_of_week: dow, break_type: body.break_type, station_id: body.station_id }, stations, breaks), date: body.date };

    if (body.action === "candidates") {
      const list = teachers.map(t => candidate(t, slot, data, keyOf(slot))).sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score || a.full_name.localeCompare(b.full_name, "he"));
      return Response.json({ candidates: list, required: slot.required });
    }
    if (body.action === "save_slot") {
      const teacherIds = unique(body.teacher_ids);
      if (teacherIds.length > slot.required) return Response.json({ error: `ניתן לשבץ עד ${slot.required} מורים לעמדה זו` }, { status: 422 });
      const reason = (body.override_reason || "").trim();
      const blocked = teacherIds.map(id => teachers.find(t => t.id === id)).find(item => !dutyEligibility(item).eligible);
      if (blocked) return Response.json({ error: dutyEligibility(blocked).reason, hard_conflict: true, critical: true }, { status: 422 });
      const checks = teacherIds.map(id => candidate(teachers.find(t => t.id === id), slot, data, keyOf(slot)));
      const hard = checks.flatMap(item => item.reasons);
      if (hard.length) return Response.json({ error: hard.join(" · "), hard_conflict: true }, { status: 422 });
      const soft = unique(checks.flatMap(item => item.warnings));
      if (soft.length && !reason) return Response.json({ error: "יש להזין סיבה לעקיפת ההתרעות", warnings: soft, requires_reason: true }, { status: 422 });
      const names = teacherIds.map(id => teachers.find(t => t.id === id)?.full_name || "");
      const scope = body.scope === "fixed" ? "fixed" : "date";
      if (scope === "fixed") {
        if (body.expected_template_updated_date && body.expected_template_updated_date !== template.updated_date) return Response.json({ error: "הלוח הקבוע השתנה במקביל. יש לרענן ולנסות שוב.", code: "concurrent_change" }, { status: 409 });
        const assignments = (template.assignments || []).filter(item => keyOf(item) !== keyOf(slot));
        if (teacherIds.length) assignments.push({ day_of_week: dow, break_type: slot.break_type, station_id: slot.station_id, teacher_ids: teacherIds, teacher_names: names, override_reason: reason });
        await e.FixedDutyTemplate.update(template.id, { status: "saved", version: (template.version || 1) + 1, assignments });
        for (const stale of exceptions.filter(x => x.break_type === slot.break_type && x.station_id === slot.station_id)) await e.DutyException.delete(stale.id);
      } else {
        const existing = exceptions.find(x => x.break_type === slot.break_type && x.station_id === slot.station_id);
        const payload = { date: body.date, day_of_week: dow, break_type: slot.break_type, station_id: slot.station_id, station_name: slot.station_name, teacher_ids: teacherIds, teacher_names: names, source: "manual", reason };
        if (existing) await e.DutyException.update(existing.id, payload); else await e.DutyException.create(payload);
      }
      await e.AuditLog.create({ user_id: user.id, user_name: actor.full_name, action: scope === "fixed" ? "edit_fixed_slot" : "edit_date_slot", entity_type: scope === "fixed" ? "FixedDutyTemplate" : "DutyException", entity_id: template.id, new_value: JSON.stringify({ date: body.date, break_type: slot.break_type, station: slot.station_name, teachers: names, reason }), timestamp: new Date().toISOString() });
      return Response.json({ saved: { scope, date: body.date, day_of_week: dow, break_type: slot.break_type, station_id: slot.station_id, teacher_ids: teacherIds, teacher_names: names } });
    }
    return Response.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});