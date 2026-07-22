import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, body, url, target_user_id } = await req.json();
    if (!title || !body) return Response.json({ error: 'title and body are required' }, { status: 400 });

    // שליחה למשתמש אחר מותרת רק למנהל מערכת
    let userId = user.id;
    if (target_user_id && target_user_id !== user.id) {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      userId = target_user_id;
    }

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!publicKey || !privateKey) return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
    webpush.setVapidDetails('mailto:admin@school.app', publicKey, privateKey);

    const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: userId });
    if (subs.length === 0) return Response.json({ sent: 0, message: 'No push subscriptions for this user' });

    const payload = JSON.stringify({ title, body, url: url || '/' });
    let sent = 0;
    const errors = [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        // מנוי שפג תוקפו — מחיקה
        if (err.statusCode === 404 || err.statusCode === 410) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
        } else {
          errors.push(err.message);
        }
      }
    }
    return Response.json({ sent, total: subs.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});