import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { keyOf, makeSlot, candidate, unique } from '../../shared/dutySlotLogic.js';

const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const dayOf = value => new Date(`${value}T12:00:00`).getDay();
const israelNow = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
const upcomingDates = (today, count) => {
  const out = [];
  const cursor = new Date(`${today}T12:00:00Z`);
  while (out.length < count) {
    if (cursor.getUTCDay() <= 4) out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
};

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'נדרשת התחברות' }, { status: 401 });
    const E = base44.asServiceRole.entities;
    const profiles = await E.TeacherProfile.filter({ user_id: user.id }, '-updated_date', 1);
    const teacher = profiles[0];
    if (!teacher || !teacher.is_active) return Response.json({ error: 'לא נמצא פרופיל מורה פעיל' }, { status: 403 });
    const body = await req.json();
    const nowIL = israelNow();
    const today = nowIL.slice(0, 10);
    const nowTime = nowIL.slice(11, 16);

    const notify = async (userId, title, text, type, operational = false, link = '/swaps') => {
      if (!userId) return;
      try { await E.Notification.create({ user_id: userId, title, body: text, type, link, is_operational: operational, created_at: new Date().toISOString() }); } catch (_ignored) { /* התראה אינה חוסמת */ }
    };

    const loadContext = async date => {
      const dow = dayOf(date);
      const [templates, stations, breaks, teachers, schedules, absences, rules, exceptions] = await Promise.all([
        E.FixedDutyTemplate.list('-updated_date', 1),
        E.Station.filter({ is_active: true }, 'sort_order', 100),
        E.Break.filter({ is_active: true }, 'sort_order', 25),
        E.TeacherProfile.filter({ is_active: true }, 'full_name', 500),
        E.WeeklySchedule.filter({ is_active: true, day_of_week: dow }, 'start_time', 1000),
        E.Absence.filter({ status: 'approved' }, '-start_date', 500),
        E.DutyRule.filter({ is_active: true }, 'sort_order', 25),
        E.DutyException.filter({ date }, 'created_date', 200)
      ]);
      const template = templates[0];
      const overridden = new Set(exceptions.map(x => `${dow}|${x.break_type}|${x.station_id}`));
      const assignments = [
        ...((template?.assignments) || []).filter(item => !overridden.has(keyOf(item))),
        ...exceptions.map(x => ({ day_of_week: dow, break_type: x.break_type, station_id: x.station_id, station_name: x.station_name, teacher_ids: x.teacher_ids || [], teacher_names: x.teacher_names || [] }))
      ];
      return { date, dow, template, stations, breaks, teachers, exceptions, data: { teachers, stations, breaks, schedules, absences, rules, assignments } };
    };

    const slotOf = (ctx, duty) => ({ ...makeSlot({ day_of_week: ctx.dow, break_type: duty.break_type, station_id: duty.station_id }, ctx.stations, ctx.breaks), date: ctx.date });
    const slotTeacherIds = (ctx, duty) => ctx.data.assignments.find(a => Number(a.day_of_week) === ctx.dow && a.break_type === duty.break_type && a.station_id === duty.station_id)?.teacher_ids || [];
    const assess = (ctx, person, duty) => {
      const result = candidate(person, slotOf(ctx, duty), ctx.data, `${ctx.dow}|${duty.break_type}|${duty.station_id}`);
      if (result.available && result.warnings.includes('חריגה ממכסת התורנויות')) { result.available = false; result.reasons = ['חריגה ממכסת התורנויות']; }
      return result;
    };

    const dutiesOf = async teacherId => {
      const dates = upcomingDates(today, 14);
      const [templates, breaks, stations, exceptions] = await Promise.all([
        E.FixedDutyTemplate.list('-updated_date', 1),
        E.Break.filter({ is_active: true }, 'sort_order', 25),
        E.Station.filter({ is_active: true }, 'sort_order', 100),
        E.DutyException.filter({ date: { $in: dates } }, 'date', 500)
      ]);
      const template = templates[0];
      const duties = [];
      for (const date of dates) {
        const dow = dayOf(date);
        const dateExceptions = exceptions.filter(x => x.date === date);
        const overridden = new Set(dateExceptions.map(x => `${dow}|${x.break_type}|${x.station_id}`));
        const effective = [
          ...((template?.assignments) || []).filter(item => Number(item.day_of_week) === dow && !overridden.has(keyOf(item))),
          ...dateExceptions
        ];
        for (const slotItem of effective) {
          if (!(slotItem.teacher_ids || []).includes(teacherId)) continue;
          const brk = breaks.find(b => b.break_type === slotItem.break_type && (b.active_days || []).map(Number).includes(dow));
          const station = stations.find(s => s.id === slotItem.station_id);
          if (!brk || !station) continue;
          if (date === today && brk.start_time <= nowTime) continue;
          duties.push({ key: `${date}|${slotItem.break_type}|${slotItem.station_id}`, date, day_of_week: dow, break_type: slotItem.break_type, break_name: brk.name, start_time: brk.start_time, end_time: brk.end_time, station_id: station.id, station_name: station.name });
        }
      }
      return duties.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    };

    const applySwap = async (ctx, duty, fromTeacher, toTeacher) => {
      const ids = unique(slotTeacherIds(ctx, duty).map(id => id === fromTeacher.id ? toTeacher.id : id));
      const names = ids.map(id => ctx.teachers.find(person => person.id === id)?.full_name || '');
      const slot = slotOf(ctx, duty);
      const payload = { date: ctx.date, day_of_week: ctx.dow, break_type: duty.break_type, station_id: duty.station_id, station_name: slot.station_name, teacher_ids: ids, teacher_names: names, source: 'swap', reason: `החלפה: ${toTeacher.full_name} במקום ${fromTeacher.full_name}` };
      const existing = ctx.exceptions.find(x => x.break_type === duty.break_type && x.station_id === duty.station_id);
      if (existing) await E.DutyException.update(existing.id, payload);
      else await E.DutyException.create(payload);
      try {
        const legacy = await E.Assignment.filter({ date: ctx.date, break_type: duty.break_type, teacher_id: fromTeacher.id, plan_status: 'published' }, '-updated_date', 5);
        for (const record of legacy) await E.Assignment.update(record.id, { teacher_id: toTeacher.id, teacher_name: toTeacher.full_name, replacement_teacher_id: fromTeacher.id, replacement_teacher_name: fromTeacher.full_name, source: 'swap', status: 'scheduled' });
      } catch (_ignored) { /* סנכרון לוח ישן — לא חוסם */ }
    };

    if (body.action === 'list') {
      await E.SwapRequest.updateMany({ status: 'pending', date: { $lt: today } }, { $set: { status: 'expired', is_open: false } });
      const [mine, openOnes, directOnes] = await Promise.all([
        E.SwapRequest.filter({ initiator_id: teacher.id }, '-created_at', 50),
        E.SwapRequest.filter({ status: 'pending', is_open: true }, '-created_at', 50),
        E.SwapRequest.filter({ status: 'pending', target_teacher_id: teacher.id }, '-created_at', 50)
      ]);
      const incoming = [...openOnes, ...directOnes].filter((item, index, all) => item.initiator_id !== teacher.id && all.findIndex(other => other.id === item.id) === index);
      return Response.json({ mine, incoming });
    }

    if (body.action === 'my_duties') {
      const [duties, pending] = await Promise.all([
        dutiesOf(teacher.id),
        E.SwapRequest.filter({ initiator_id: teacher.id, status: 'pending' }, '-created_at', 100)
      ]);
      const requested = new Set(pending.map(item => `${item.date}|${item.break_type}|${item.station_id}`));
      return Response.json({ duties: duties.map(item => ({ ...item, has_pending_request: requested.has(item.key) })) });
    }

    if (body.action === 'search_candidates') {
      if (!isoDate(body.date) || dayOf(body.date) > 4 || body.date < today) return Response.json({ error: 'תאריך לא תקין לחיפוש' }, { status: 400 });
      const ctx = await loadContext(body.date);
      const assignedIds = slotTeacherIds(ctx, body);
      const query = String(body.query || '').trim().toLocaleLowerCase('he');
      const pool = ctx.teachers.filter(person =>
        person.id !== teacher.id &&
        !assignedIds.includes(person.id) &&
        (!query || [person.full_name, person.subject, ...(person.additional_subjects || [])].some(value => (value || '').toLocaleLowerCase('he').includes(query)))
      );
      const results = pool.map(person => assess(ctx, person, body))
        .filter(item => item.available)
        .sort((a, b) => b.score - a.score || a.full_name.localeCompare(b.full_name, 'he'))
        .slice(0, 15)
        .map(item => ({ id: item.id, full_name: item.full_name, subject: item.subject, duty_count: item.duty_count, quota: item.quota, warnings: item.warnings }));
      return Response.json({ candidates: results });
    }

    if (body.action === 'partner_duties') {
      if (!body.target_teacher_id) return Response.json({ error: 'יש לבחור מורה' }, { status: 400 });
      const partnerDuties = (await dutiesOf(body.target_teacher_id)).slice(0, 12);
      const contexts = new Map();
      const suitable = [];
      for (const dutyItem of partnerDuties) {
        if (!contexts.has(dutyItem.date)) contexts.set(dutyItem.date, await loadContext(dutyItem.date));
        const check = assess(contexts.get(dutyItem.date), teacher, dutyItem);
        if (check.available) suitable.push(dutyItem);
      }
      return Response.json({ duties: suitable });
    }

    if (body.action === 'create') {
      if (!isoDate(body.date) || dayOf(body.date) > 4) return Response.json({ error: 'תאריך התורנות אינו תקין' }, { status: 400 });
      if (body.date < today) return Response.json({ error: 'לא ניתן להחליף תורנות שכבר עברה' }, { status: 400 });
      const ctx = await loadContext(body.date);
      const slot = slotOf(ctx, body);
      if (!slotTeacherIds(ctx, body).includes(teacher.id)) return Response.json({ error: 'התורנות אינה משובצת לך' }, { status: 400 });
      if (body.date === today && slot.start_time <= nowTime) return Response.json({ error: 'התורנות כבר החלה' }, { status: 400 });
      const duplicates = await E.SwapRequest.filter({ initiator_id: teacher.id, status: 'pending', date: body.date, break_type: body.break_type, station_id: body.station_id }, '-created_at', 5);
      if (duplicates.length) return Response.json({ error: 'כבר קיימת בקשת החלפה פעילה לתורנות זו' }, { status: 409 });

      const swapType = body.swap_type === 'mutual' ? 'mutual' : 'takeover';
      const mode = swapType === 'mutual' || body.mode === 'direct' ? 'direct' : 'open';
      let target = null;
      let offeredFields = {};
      if (mode === 'direct') {
        if (!body.target_teacher_id || body.target_teacher_id === teacher.id) return Response.json({ error: 'יש לבחור מורה אחר לפנייה הישירה' }, { status: 400 });
        target = ctx.teachers.find(person => person.id === body.target_teacher_id);
        const targetCheck = assess(ctx, target, body);
        if (!targetCheck.available) return Response.json({ error: `המורה שנבחר אינו פנוי: ${targetCheck.reasons.join(' · ')}` }, { status: 409 });
      }
      if (swapType === 'mutual') {
        const offered = body.offered || {};
        if (!isoDate(offered.date) || offered.date < today) return Response.json({ error: 'יש לבחור תורנות תקפה להחלפה ההדדית' }, { status: 400 });
        const offeredCtx = await loadContext(offered.date);
        const offeredSlot = slotOf(offeredCtx, offered);
        if (!slotTeacherIds(offeredCtx, offered).includes(target.id)) return Response.json({ error: 'התורנות המוצעת אינה משובצת למורה שנבחר' }, { status: 400 });
        const myCheck = assess(offeredCtx, teacher, offered);
        if (!myCheck.available) return Response.json({ error: `אינך פנוי/ה לתורנות המוצעת: ${myCheck.reasons.join(' · ')}` }, { status: 409 });
        offeredFields = { offered_date: offered.date, offered_break_type: offered.break_type, offered_break_name: offeredSlot.break_name, offered_station_id: offered.station_id, offered_station_name: offeredSlot.station_name, offered_start_time: offeredSlot.start_time, offered_end_time: offeredSlot.end_time };
      }
      const created = await E.SwapRequest.create({
        initiator_id: teacher.id, initiator_name: teacher.full_name, swap_type: swapType,
        target_teacher_id: target?.id || null, target_teacher_name: target?.full_name || null,
        is_open: mode === 'open', status: 'pending', created_at: new Date().toISOString(),
        valid_until: `${body.date}T${slot.start_time}:00`,
        date: body.date, day_of_week: ctx.dow, break_type: slot.break_type, break_name: slot.break_name,
        station_id: slot.station_id, station_name: slot.station_name, start_time: slot.start_time, end_time: slot.end_time,
        ...offeredFields
      });
      if (target) await notify(target.user_id, 'בקשת החלפה חדשה', `${teacher.full_name} מבקש/ת ${swapType === 'mutual' ? 'החלפה הדדית' : 'שתיקח/י את התורנות'} בתאריך ${body.date} בעמדת ${slot.station_name}`, 'swap_request');
      return Response.json({ request: created });
    }

    if (body.action === 'accept') {
      const matches = await E.SwapRequest.filter({ id: body.swapRequestId });
      const swap = matches[0];
      if (!swap) return Response.json({ error: 'בקשת ההחלפה לא נמצאה' }, { status: 404 });
      if (swap.status !== 'pending') return Response.json({ error: 'בקשת ההחלפה כבר טופלה' }, { status: 409 });
      if (swap.initiator_id === teacher.id) return Response.json({ error: 'לא ניתן לאשר בקשה שיצרת' }, { status: 400 });
      if (!swap.is_open && swap.target_teacher_id !== teacher.id) return Response.json({ error: 'הבקשה מיועדת למורה אחר' }, { status: 403 });
      if (swap.date < today || (swap.date === today && (swap.start_time || '23:59') <= nowTime)) {
        await E.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'expired', is_open: false } });
        return Response.json({ error: 'תוקף הבקשה פג' }, { status: 409 });
      }
      const ctx = await loadContext(swap.date);
      const initiator = ctx.teachers.find(person => person.id === swap.initiator_id) || (await E.TeacherProfile.filter({ id: swap.initiator_id }))[0];
      if (!initiator) return Response.json({ error: 'יוזם הבקשה לא נמצא' }, { status: 404 });
      if (!slotTeacherIds(ctx, swap).includes(swap.initiator_id)) {
        await E.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'expired', is_open: false } });
        return Response.json({ error: 'התורנות כבר אינה משובצת ליוזם הבקשה' }, { status: 409 });
      }
      const myCheck = assess(ctx, teacher, swap);
      if (!myCheck.available) return Response.json({ error: `לא ניתן לקבל את ההחלפה: ${myCheck.reasons.join(' · ')}` }, { status: 409 });
      let offeredCtx = null;
      if (swap.swap_type === 'mutual') {
        const offeredDuty = { date: swap.offered_date, break_type: swap.offered_break_type, station_id: swap.offered_station_id };
        offeredCtx = await loadContext(swap.offered_date);
        if (!slotTeacherIds(offeredCtx, offeredDuty).includes(teacher.id)) return Response.json({ error: 'התורנות שהוצעה בתמורה כבר אינה משובצת לך' }, { status: 409 });
        const initiatorCheck = assess(offeredCtx, initiator, offeredDuty);
        if (!initiatorCheck.available) return Response.json({ error: `היוזם אינו פנוי לתורנות שלך: ${initiatorCheck.reasons.join(' · ')}` }, { status: 409 });
      }
      await E.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'accepted', accepted_at: new Date().toISOString(), accepted_by_id: teacher.id, accepted_by_name: teacher.full_name, is_open: false } });
      const claimed = (await E.SwapRequest.filter({ id: swap.id }))[0];
      if (claimed?.status !== 'accepted' || claimed.accepted_by_id !== teacher.id) return Response.json({ error: 'בקשת ההחלפה כבר טופלה על ידי מורה אחר' }, { status: 409 });
      await applySwap(ctx, swap, initiator, teacher);
      if (swap.swap_type === 'mutual') await applySwap(offeredCtx, { break_type: swap.offered_break_type, station_id: swap.offered_station_id }, teacher, initiator);
      await notify(initiator.user_id, 'בקשת ההחלפה שלך התקבלה', `${teacher.full_name} קיבל/ה את ההחלפה לתאריך ${swap.date} בעמדת ${swap.station_name}`, 'swap_accepted', true, '/my-duties');
      await notify(teacher.user_id, 'ההחלפה אושרה', `התורנות בתאריך ${swap.date} בעמדת ${swap.station_name} עברה אליך`, 'swap_accepted', true, '/my-duties');
      try { await E.AuditLog.create({ user_id: user.id, user_name: teacher.full_name, action: 'swap_accepted', entity_type: 'SwapRequest', entity_id: swap.id, new_value: JSON.stringify({ date: swap.date, station: swap.station_name, from: initiator.full_name, to: teacher.full_name }), timestamp: new Date().toISOString() }); } catch (_ignored) { /* לוג אינו חוסם */ }
      return Response.json({ request: claimed });
    }

    if (body.action === 'reject') {
      const matches = await E.SwapRequest.filter({ id: body.swapRequestId });
      const swap = matches[0];
      if (!swap) return Response.json({ error: 'בקשת ההחלפה לא נמצאה' }, { status: 404 });
      if (swap.status !== 'pending') return Response.json({ error: 'בקשת ההחלפה כבר טופלה' }, { status: 409 });
      if (swap.target_teacher_id !== teacher.id) return Response.json({ error: 'רק המורה שאליו נשלחה הבקשה יכול לדחות אותה' }, { status: 403 });
      await E.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'rejected', is_open: false } });
      const updated = (await E.SwapRequest.filter({ id: swap.id }))[0];
      if (updated?.status !== 'rejected') return Response.json({ error: 'הבקשה כבר טופלה' }, { status: 409 });
      const initiator = (await E.TeacherProfile.filter({ id: swap.initiator_id }))[0];
      await notify(initiator?.user_id, 'בקשת החלפה נדחתה', `${teacher.full_name} דחה/תה את בקשת ההחלפה לתאריך ${swap.date}`, 'swap_rejected');
      return Response.json({ request: updated });
    }

    if (body.action === 'cancel') {
      const matches = await E.SwapRequest.filter({ id: body.swapRequestId });
      const swap = matches[0];
      if (!swap) return Response.json({ error: 'בקשת ההחלפה לא נמצאה' }, { status: 404 });
      if (swap.initiator_id !== teacher.id) return Response.json({ error: 'אין הרשאה לבטל בקשה זו' }, { status: 403 });
      await E.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'cancelled', is_open: false } });
      const updated = (await E.SwapRequest.filter({ id: swap.id }))[0];
      if (updated?.status !== 'cancelled') return Response.json({ error: 'הבקשה כבר טופלה ולא ניתן לבטלה' }, { status: 409 });
      if (swap.target_teacher_id) {
        const target = (await E.TeacherProfile.filter({ id: swap.target_teacher_id }))[0];
        await notify(target?.user_id, 'בקשת החלפה בוטלה', `${teacher.full_name} ביטל/ה את בקשת ההחלפה לתאריך ${swap.date}`, 'swap_cancelled');
      }
      return Response.json({ request: updated });
    }

    return Response.json({ error: 'פעולה לא נתמכת' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'שגיאת שרת' }, { status: 500 });
  }
});