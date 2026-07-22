import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'נדרשת התחברות' }, { status: 401 });
    const profiles = await base44.entities.TeacherProfile.filter({ user_id: user.id });
    const teacher = profiles[0];
    if (!teacher || !teacher.is_active) return Response.json({ error: 'לא נמצא פרופיל מורה פעיל' }, { status: 403 });
    const body = await req.json();

    const checkAvailability = async (candidate, duty) => {
      if (!candidate?.is_active) return 'המורה שנבחר אינו פעיל';
      const [assignments, lessons, absences] = await Promise.all([
        base44.asServiceRole.entities.Assignment.filter({ teacher_id: candidate.id, date: duty.date, plan_status: 'published' }),
        base44.asServiceRole.entities.WeeklySchedule.filter({ teacher_id: candidate.id, day_of_week: new Date(`${duty.date}T12:00:00`).getDay(), is_active: true }),
        base44.asServiceRole.entities.Absence.filter({ teacher_id: candidate.id, status: 'approved' })
      ]);
      if (assignments.some((item) => item.id !== duty.assignment_id && overlaps(duty.start_time, duty.end_time, item.start_time, item.end_time))) return 'למורה יש תורנות חופפת';
      if (lessons.some((item) => overlaps(duty.start_time, duty.end_time, item.start_time, item.end_time))) return 'למורה יש שיעור בזמן התורנות';
      if (absences.some((item) => duty.date >= item.start_date && duty.date <= item.end_date)) return 'המורה מוגדר כנעדר בתאריך זה';
      return null;
    };

    if (body.action === 'create') {
      const assignmentMatches = await base44.asServiceRole.entities.Assignment.filter({ id: body.assignmentId });
      const assignment = assignmentMatches[0];
      if (!assignment || assignment.teacher_id !== teacher.id || assignment.plan_status !== 'published' || assignment.status !== 'scheduled') return Response.json({ error: 'התורנות אינה זמינה להחלפה' }, { status: 400 });
      if (assignment.date < new Date().toISOString().slice(0, 10)) return Response.json({ error: 'לא ניתן להחליף תורנות שכבר עברה' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.SwapRequest.filter({ assignment_id: assignment.id, initiator_id: teacher.id, status: 'pending' });
      if (existing.length) return Response.json({ error: 'כבר קיימת בקשת החלפה פעילה לתורנות זו' }, { status: 409 });

      const mode = body.mode === 'direct' ? 'direct' : 'open';
      let target = null;
      if (mode === 'direct') {
        if (!body.targetTeacherId || body.targetTeacherId === teacher.id) return Response.json({ error: 'יש לבחור מורה אחר לפנייה הישירה' }, { status: 400 });
        const targetMatches = await base44.asServiceRole.entities.TeacherProfile.filter({ id: body.targetTeacherId });
        target = targetMatches[0];
        const availabilityError = await checkAvailability(target, { ...assignment, assignment_id: assignment.id });
        if (availabilityError) return Response.json({ error: availabilityError }, { status: 409 });
      }

      const created = await base44.asServiceRole.entities.SwapRequest.create({
        assignment_id: assignment.id,
        initiator_id: teacher.id,
        initiator_name: teacher.full_name,
        swap_type: 'takeover',
        target_teacher_id: target?.id || null,
        target_teacher_name: target?.full_name || null,
        is_open: mode === 'open',
        status: 'pending',
        created_at: new Date().toISOString(),
        valid_until: new Date(`${assignment.date}T00:00:00`).toISOString(),
        date: assignment.date,
        break_type: assignment.break_type,
        station_name: assignment.station_name,
        start_time: assignment.start_time,
        end_time: assignment.end_time
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: teacher.user_id,
        title: 'בקשת החלפה נוצרה',
        body: `בקשת החלפה לתורנות בתאריך ${assignment.date} בעמדת ${assignment.station_name}`,
        type: 'swap_request',
        link: '/swaps',
        created_at: new Date().toISOString()
      });
      if (target?.user_id) await base44.asServiceRole.entities.Notification.create({
        user_id: target.user_id,
        title: 'בקשת החלפה חדשה',
        body: `${teacher.full_name} פנה אליך ישירות לגבי תורנות בתאריך ${assignment.date}`,
        type: 'swap_request',
        link: '/swaps',
        created_at: new Date().toISOString()
      });
      return Response.json({ request: created });
    }

    if (body.action === 'cancel') {
      const swapMatches = await base44.asServiceRole.entities.SwapRequest.filter({ id: body.swapRequestId });
      const swap = swapMatches[0];
      if (!swap) return Response.json({ error: 'בקשת ההחלפה לא נמצאה' }, { status: 404 });
      if (swap.initiator_id !== teacher.id) return Response.json({ error: 'אין הרשאה לבטל בקשה זו' }, { status: 403 });
      await base44.asServiceRole.entities.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'cancelled', is_open: false } });
      const updatedMatches = await base44.asServiceRole.entities.SwapRequest.filter({ id: swap.id });
      if (updatedMatches[0]?.status !== 'cancelled') return Response.json({ error: 'הבקשה כבר טופלה ולא ניתן לבטלה' }, { status: 409 });
      return Response.json({ request: updatedMatches[0] });
    }

    if (body.action === 'accept') {
      const swapMatches = await base44.asServiceRole.entities.SwapRequest.filter({ id: body.swapRequestId });
      const swap = swapMatches[0];
      if (!swap) return Response.json({ error: 'בקשת ההחלפה לא נמצאה' }, { status: 404 });
      if (swap.status !== 'pending') return Response.json({ error: 'בקשת ההחלפה כבר טופלה' }, { status: 409 });
      if (swap.initiator_id === teacher.id) return Response.json({ error: 'לא ניתן לאשר בקשה שיצרת' }, { status: 400 });
      if (!swap.is_open && swap.target_teacher_id !== teacher.id) return Response.json({ error: 'הבקשה מיועדת למורה אחר' }, { status: 403 });
      if (swap.valid_until && new Date(swap.valid_until).getTime() < Date.now()) {
        await base44.asServiceRole.entities.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: { status: 'expired', is_open: false } });
        return Response.json({ error: 'תוקף הבקשה פג' }, { status: 409 });
      }
      const availabilityError = await checkAvailability(teacher, { ...swap, assignment_id: swap.assignment_id });
      if (availabilityError) return Response.json({ error: availabilityError }, { status: 409 });

      await base44.asServiceRole.entities.SwapRequest.updateMany({ id: swap.id, status: 'pending' }, { $set: {
        status: 'accepted', accepted_at: new Date().toISOString(), accepted_by_id: teacher.id, accepted_by_name: teacher.full_name, is_open: false
      } });
      const claimedMatches = await base44.asServiceRole.entities.SwapRequest.filter({ id: swap.id });
      const claimed = claimedMatches[0];
      if (claimed?.status !== 'accepted' || claimed.accepted_by_id !== teacher.id) return Response.json({ error: 'בקשת ההחלפה כבר אושרה על ידי מורה אחר' }, { status: 409 });

      const assignmentMatches = await base44.asServiceRole.entities.Assignment.filter({ id: swap.assignment_id });
      const assignment = assignmentMatches[0];
      if (!assignment) return Response.json({ error: 'התורנות המקורית לא נמצאה' }, { status: 404 });
      await base44.asServiceRole.entities.Assignment.update(assignment.id, {
        teacher_id: teacher.id,
        teacher_name: teacher.full_name,
        replacement_teacher_id: assignment.teacher_id,
        replacement_teacher_name: assignment.teacher_name,
        source: 'swap',
        status: 'scheduled'
      });
      const initiatorMatches = await base44.asServiceRole.entities.TeacherProfile.filter({ id: swap.initiator_id });
      const initiator = initiatorMatches[0];
      if (initiator?.user_id) await base44.asServiceRole.entities.Notification.create({
        user_id: initiator.user_id,
        title: 'בקשת החלפה התקבלה',
        body: `${teacher.full_name} קיבל/ה את החלפת התורנות בתאריך ${swap.date}`,
        type: 'swap_accepted',
        link: '/my-duties',
        is_operational: true,
        created_at: new Date().toISOString()
      });
      return Response.json({ request: claimed });
    }

    return Response.json({ error: 'פעולה לא נתמכת' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'שגיאת שרת' }, { status: 500 });
  }
});