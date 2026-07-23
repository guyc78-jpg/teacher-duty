import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { SCHOOL_DAYS, isSchoolDate } from '../../shared/schoolDays.js';
import { isDutyEligible } from '../../shared/dutyEligibility.js';

// מנוע שיבוץ אוטומטי — יוצר ושומר לוח שיבוצים ללא פרסום
// כללים: ימים א׳–ה׳ בלבד, בדיקת התנגשויות, עומס יומי, רוטציה, הוגנות
const BREAK_ORDER = { big: 1, medium: 2, small: 3 };

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeOverlap(s1, e1, s2, e2) {
  return timeToMin(s1) < timeToMin(e2) && timeToMin(s2) < timeToMin(e1);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // בדיקת הרשאת מנהל
    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter({ user_id: user.id });
    const teacher = profiles[0];
    if (!teacher || teacher.role !== "admin") {
      return Response.json({ error: "Forbidden — נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const { start_date, end_date, plan_name, is_management = false, approve_incomplete = false } = body;
    if (!start_date || !end_date) return Response.json({ error: "נדרש טווח תאריכים" }, { status: 400 });

    // טעינת נתונים
    const [teachers, breaks, stations, rules, absences, calendarExceptions, allSchedules, fixedTemplates, specialDays] = await Promise.all([
      base44.asServiceRole.entities.TeacherProfile.filter({ is_active: true }),
      base44.asServiceRole.entities.Break.filter({ is_active: true }),
      base44.asServiceRole.entities.Station.filter({ is_active: true }),
      base44.asServiceRole.entities.DutyRule.filter({ is_active: true }),
      base44.asServiceRole.entities.Absence.filter({ status: "approved" }),
      base44.asServiceRole.entities.CalendarException.filter({ is_active: true }),
      base44.asServiceRole.entities.WeeklySchedule.filter({ is_active: true }),
      base44.asServiceRole.entities.FixedDutyTemplate.list(),
      base44.asServiceRole.entities.SpecialDay.filter({ status: "published" })
    ]);

    // סינון מורים לפי מצב הרצה
    const settings = await base44.asServiceRole.entities.SystemSettings.list();
    const s = settings[0] || {};
    let eligibleTeachers = teachers.filter(isDutyEligible);
    if (s.pilot_mode_enabled && s.pilot_teacher_ids?.length > 0) {
      eligibleTeachers = teachers.filter(t => s.pilot_teacher_ids.includes(t.id));
    }
    if (is_management) eligibleTeachers = [];

    // חסימה: מורים ללא מערכת שעות או עם 0 שעות — נדרש אישור מנהל מפורש
    const teacherIdsWithSchedule = new Set(allSchedules.map(s => s.teacher_id));
    const incompleteTeachers = eligibleTeachers.filter(t => !teacherIdsWithSchedule.has(t.id) || !(t.weekly_teaching_hours > 0));
    if (incompleteTeachers.length > 0 && !approve_incomplete) {
      return Response.json({
        error: "קיימים מורים עם מערכת שעות חסרה או 0 שעות הוראה — נדרש אישור מנהל",
        requires_approval: true,
        incomplete_teachers: incompleteTeachers.map(t => t.full_name)
      }, { status: 422 });
    }

    // יצירת תוכנית שמורה
    const plan = await base44.asServiceRole.entities.DutyPlan.create({
      name: plan_name || `לוח ${toISODate(new Date())}`,
      start_date,
      end_date,
      version: 1,
      status: "saved",
      is_management,
      created_by: teacher.full_name,
      notes: "נוצר אוטומטית ע״י מנוע השיבוץ"
    });

    // חישוב ימי לימוד בטווח (ראשון–חמישי בלבד)
    const start = new Date(start_date);
    const end = new Date(end_date);
    const schoolDates = [];
    const exceptionDates = new Set(calendarExceptions.map(e => e.date));
    const specialReplacementDates = new Set(specialDays.filter(item => item.replace_regular_schedule !== false).map(item => item.date));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toISODate(d);
      if (isSchoolDate(dateStr) && !exceptionDates.has(dateStr) && !specialReplacementDates.has(dateStr)) {
        schoolDates.push(dateStr);
      }
    }

    const assignments = [];
    const conflicts = [];
    const fairnessTracker = {}; // teacher_id -> { count, minutes }

    eligibleTeachers.forEach(t => { fairnessTracker[t.id] = { count: 0, minutes: 0, stations: {}, weeks: {} }; });

    // מפתח תורנויות: שבוע לועזי מתחיל ביום ראשון
    const weekKeyOf = (dateStr) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - d.getDay());
      return toISODate(d);
    };

    const sortedBreaks = breaks.sort((a, b) => BREAK_ORDER[a.break_type] - BREAK_ORDER[b.break_type]);
    const fixedAssignments = fixedTemplates[0]?.published_assignments || [];

    for (const dateStr of schoolDates) {
      const dow = new Date(dateStr).getDay();
      const weekKey = weekKeyOf(dateStr);

      for (const brk of sortedBreaks) {
        if (!brk.active_days.includes(dow)) continue;

        // עמדות פעילות להפסקה זו
        const activeStations = stations.filter(st => st.active_break_types.includes(brk.break_type));

        for (const station of activeStations) {
          const req = station.staffing_requirements?.[brk.break_type] || 1;
          const fixedSlot = fixedAssignments.find(item => item.day_of_week === dow && item.break_type === brk.break_type && item.station_id === station.id);
          for (let slot = 0; slot < req; slot++) {
            // תבנית קבועה שפורסמה היא הבסיס; בהיעדרה מופעל מנגנון האיזון הרגיל
            const preferredTeacherId = fixedSlot ? fixedSlot.teacher_ids?.[slot] || "__missing__" : null;
            const candidate = findBestCandidate({
              teachers: eligibleTeachers,
              schedules: allSchedules,
              absences,
              rules,
              weekKey,
              dateStr,
              dow,
              brk,
              station,
              fairnessTracker,
              assignments,
              preferredTeacherId
            });

            if (candidate) {
              assignments.push({
                plan_id: plan.id,
                date: dateStr,
                day_of_week: dow,
                break_type: brk.break_type,
                break_name: brk.name,
                start_time: brk.start_time,
                end_time: brk.end_time,
                station_id: station.id,
                station_name: station.name,
                teacher_id: candidate.id,
                teacher_name: candidate.full_name,
                source: fixedSlot ? "manual" : "auto",
                status: "scheduled",
                plan_status: "saved"
              });
              fairnessTracker[candidate.id].count++;
              fairnessTracker[candidate.id].minutes += (timeToMin(brk.end_time) - timeToMin(brk.start_time));
              fairnessTracker[candidate.id].stations[station.id] = (fairnessTracker[candidate.id].stations[station.id] || 0) + 1;
              const weekCounts = fairnessTracker[candidate.id].weeks[weekKey] || (fairnessTracker[candidate.id].weeks[weekKey] = {});
              weekCounts[brk.break_type] = (weekCounts[brk.break_type] || 0) + 1;
            } else {
              conflicts.push({
                date: dateStr,
                break_type: brk.break_type,
                break_name: brk.name,
                station_name: station.name,
                issue: "לא נמצא מורה זמין"
              });
            }
          }
        }
      }
    }

    // שמירת שיבוצים
    if (assignments.length > 0) {
      await base44.asServiceRole.entities.Assignment.bulkCreate(assignments);
    }

    // יומן ביקורת
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: teacher.full_name,
      action: "create_saved_plan",
      entity_type: "DutyPlan",
      entity_id: plan.id,
      new_value: JSON.stringify({ dates: schoolDates.length, assignments: assignments.length, conflicts: conflicts.length }),
      timestamp: new Date().toISOString()
    });

    return Response.json({
      plan_id: plan.id,
      school_days: schoolDates.length,
      assignments_created: assignments.length,
      conflicts,
      fairness: Object.entries(fairnessTracker)
        .filter(([id]) => fairnessTracker[id].count > 0)
        .map(([id, v]) => ({ teacher_id: id, teacher_name: teachers.find(t => t.id === id)?.full_name, count: v.count, minutes: v.minutes }))
        .sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function findBestCandidate({ teachers, schedules, absences, rules, weekKey, dateStr, dow, brk, station, fairnessTracker, assignments, preferredTeacherId = null }) {
  // סינון מועמדים
  let candidates = teachers.filter(t => {
    // עמדות מותרות
    if (t.allowed_stations?.length > 0 && !t.allowed_stations.includes(station.id)) return false;
    // יום חופש קבוע
    if (t.days_off?.includes(dow)) return false;
    // היעדרות
    const absent = absences.some(a => a.teacher_id === t.id && dateStr >= a.start_date && dateStr <= a.end_date);
    if (absent) return false;
    // שיעור בזמן ההפסקה
    const teacherSchedule = schedules.filter(s => s.teacher_id === t.id && s.day_of_week === dow);
    const teachingConflict = teacherSchedule.some(s => timeOverlap(brk.start_time, brk.end_time, s.start_time, s.end_time));
    if (teachingConflict) return false;
    // כבר משובץ באותה הפסקה (עמדה אחרת)
    const alreadyAssigned = assignments.some(a => a.teacher_id === t.id && a.date === dateStr && a.break_type === brk.break_type);
    if (alreadyAssigned) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  if (preferredTeacherId) return candidates.find(teacher => teacher.id === preferredTeacherId) || null;

  // העדפת מורי ספורט לעמדות ספורט
  if (station.is_sport_station) {
    const sportTeachers = candidates.filter(t => t.is_sport_teacher);
    if (sportTeachers.length > 0) candidates = sportTeachers;
  }

  // עמדות קבועות
  const fixedForStation = candidates.filter(t => t.fixed_stations?.includes(station.id));
  if (fixedForStation.length > 0) candidates = fixedForStation;

  // חישוב עומס יומי — יום עם >6 שעות הוראה
  const dayLoad = (t) => {
    const daySchedule = schedules.filter(s => s.teacher_id === t.id && s.day_of_week === dow);
    const totalMin = daySchedule.reduce((sum, s) => sum + (timeToMin(s.end_time) - timeToMin(s.start_time)), 0);
    return totalMin / 60;
  };

  // כמות תורנויות כבר באותו יום
  const dutiesToday = (t) => assignments.filter(a => a.teacher_id === t.id && a.date === dateStr).length;

  // סינון: הימנעות מיום עמוס (>6 שעות) ומשתי תורנויות ביום עמוס
  const nonBusy = candidates.filter(t => dayLoad(t) <= 6);
  if (nonBusy.length > 0) candidates = nonBusy;

  // מי שכבר יש לו תורנות באותו יום — רק ביום לא עמוס וללא התנגשות
  const oneDutyToday = candidates.filter(t => dutiesToday(t) < 2);
  if (oneDutyToday.length > 0) candidates = oneDutyToday;

  // מפתח תורנויות — מכסה שבועית לפי שעות ההוראה של המורה
  const ruleFor = (t) => rules.find(r => (t.weekly_teaching_hours || 0) >= r.min_hours && (t.weekly_teaching_hours || 0) <= r.max_hours);
  const underQuota = candidates.filter(t => {
    const rule = ruleFor(t);
    if (!rule) return true;
    const quota = rule[`${brk.break_type}_count`] || 0;
    const used = fairnessTracker[t.id]?.weeks?.[weekKey]?.[brk.break_type] || 0;
    return used < quota;
  });
  if (underQuota.length > 0) candidates = underQuota;

  // רוטציה — הימנעות מאותה עמדה
  const notSameStation = candidates.filter(t => !(fairnessTracker[t.id]?.stations?.[station.id] > 0));
  if (notSameStation.length > 0) candidates = notSameStation;

  // מי שעדיין לא מילא את מכסת התורנויות לפי מפתח — עדיפות למי עם פחות תורנויות
  candidates.sort((a, b) => (fairnessTracker[a.id]?.count || 0) - (fairnessTracker[b.id]?.count || 0));

  return candidates[0];
}