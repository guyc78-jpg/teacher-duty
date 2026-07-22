import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// שמירת נתוני קליטה ועדכוני פרופיל של המורה המחובר בלבד.
// רשימת שדות מותרים — לעולם לא role / is_exempt / הרשאות.
const ALLOWED_FIELDS = ["full_name", "email", "division", "subject", "additional_subjects", "is_sport_teacher", "is_homeroom", "homeroom_grade", "homeroom_class", "days_off", "phone", "preferences"];
const RESTRICTED_FIELDS = ["subject", "additional_subjects", "is_sport_teacher", "is_homeroom", "homeroom_grade", "homeroom_class", "days_off"];
const DIVISIONS = ["middle", "high", "both"];

function pickFields(data, keys) {
  const out = {};
  for (const k of keys) if (data[k] !== undefined) out[k] = data[k];
  return out;
}

function sanitize(updates) {
  if (updates.division !== undefined && !DIVISIONS.includes(updates.division)) delete updates.division;
  if (updates.days_off !== undefined) {
    updates.days_off = Array.isArray(updates.days_off)
      ? updates.days_off.map(Number).filter(d => [0, 1, 2, 3, 4].includes(d))
      : [];
  }
  if (updates.additional_subjects !== undefined && !Array.isArray(updates.additional_subjects)) delete updates.additional_subjects;
  if (updates.preferences !== undefined && typeof updates.preferences !== "string") delete updates.preferences;
  if (updates.is_homeroom === false) { updates.homeroom_grade = ""; updates.homeroom_class = ""; }
  return updates;
}

function validateComplete(d) {
  if (!d.full_name || !String(d.full_name).trim()) return "נדרש שם מלא";
  if (!d.email || !String(d.email).includes("@")) return "נדרשת כתובת דוא״ל תקינה";
  if (!DIVISIONS.includes(d.division)) return "נדרשת בחירת חטיבה";
  if (d.is_homeroom && (!d.homeroom_grade || !d.homeroom_class)) return "נדרשת בחירת שכבה וכיתה";
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ error: "לא נמצא פרופיל מורה לחשבון זה" }, { status: 404 });

    const body = await req.json();
    const { action, step, data = {} } = body;

    if (action === "step" || action === "complete") {
      if (profile.onboarding_completed) {
        return Response.json({ error: "תהליך הקליטה כבר הושלם" }, { status: 409 });
      }
      const updates = sanitize(pickFields(data, ALLOWED_FIELDS));

      // בקשת פטור — לעולם לא מפעילה פטור בפועל, רק מסמנת לאימות מנהל
      if (data.request_exemption === true && profile.exemption_status !== "approved") {
        updates.exemption_status = "pending";
      } else if (data.request_exemption === false && profile.exemption_status === "pending") {
        updates.exemption_status = "none";
      }

      if (action === "complete") {
        const merged = { ...profile, ...updates };
        const err = validateComplete(merged);
        if (err) return Response.json({ error: err }, { status: 400 });
        updates.onboarding_completed = true;
        updates.onboarding_step = 5;
      } else {
        updates.onboarding_step = Math.max(profile.onboarding_step || 0, Number(step) || 0);
      }

      await base44.asServiceRole.entities.TeacherProfile.update(profile.id, updates);
      return Response.json({ ok: true, completed: action === "complete" });
    }

    if (action === "preferences") {
      if (typeof data.preferences !== "string") return Response.json({ error: "נתונים לא תקינים" }, { status: 400 });
      await base44.asServiceRole.entities.TeacherProfile.update(profile.id, { preferences: data.preferences });
      return Response.json({ ok: true });
    }

    if (action === "request_change") {
      const changes = sanitize(pickFields(data, RESTRICTED_FIELDS));
      if (data.request_exemption !== undefined) changes.request_exemption = !!data.request_exemption;
      if (Object.keys(changes).length === 0) return Response.json({ error: "לא נבחרו שינויים" }, { status: 400 });

      const pending = await base44.asServiceRole.entities.ProfileChangeRequest.filter({ teacher_id: profile.id, status: "pending" });
      if (pending.length > 0) return Response.json({ error: "כבר קיימת בקשה הממתינה לאישור מנהל" }, { status: 409 });

      await base44.asServiceRole.entities.ProfileChangeRequest.create({
        teacher_id: profile.id,
        teacher_name: profile.full_name,
        changes: JSON.stringify(changes),
        status: "pending"
      });
      if (changes.request_exemption === true && !profile.is_exempt) {
        await base44.asServiceRole.entities.TeacherProfile.update(profile.id, { exemption_status: "pending" });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});