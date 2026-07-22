import { base44 } from "@/api/base44Client";

export const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const HEBREW_DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
export const HEBREW_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export const SCHOOL_DAYS = [0, 1, 2, 3, 4]; // ראשון–חמישי
export const BREAK_TYPES = {
  big: { label: "הפסקה גדולה", color: "bg-primary/10 text-primary border-primary/30" },
  medium: { label: "הפסקה בינונית", color: "bg-accent text-accent-foreground border-border" },
  small: { label: "הפסקה קטנה", color: "bg-muted text-muted-foreground border-border" }
};

export const INCIDENT_CATEGORIES = {
  violence: "אלימות",
  vandalism: "ונדליזם",
  smoking: "עישון",
  injury: "פציעה",
  other: "אחר"
};

export const SEVERITY_LABELS = {
  low: { label: "נמוכה", class: "status-muted" },
  medium: { label: "בינונית", class: "status-warning" },
  high: { label: "גבוהה", class: "status-danger" },
  critical: { label: "קריטית", class: "status-danger" }
};

export const STATUS_LABELS = {
  scheduled: { label: "מתוכנן", class: "status-muted" },
  confirmed: { label: "אושר הגעה", class: "status-success" },
  completed: { label: "הושלם", class: "status-success" },
  missed: { label: "הוחמץ", class: "status-danger" },
  swapped: { label: "הוחלף", class: "status-warning" }
};

export const DIVISION_LABELS = { middle: "חטיבת ביניים", high: "חטיבה עליונה", both: "שתי החטיבות" };

const JERUSALEM_TIME_ZONE = "Asia/Jerusalem";
const LTR_ISOLATE = "\u2066";
const POP_DIRECTIONAL_ISOLATE = "\u2069";

function dateValue(dateStr) {
  if (dateStr instanceof Date) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return new Date(`${dateStr}T12:00:00Z`);
  return new Date(dateStr);
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = dateValue(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: JERUSALEM_TIME_ZONE
  }).format(date);
}

export function formatDateWithDay(dateStr) {
  if (!dateStr) return "";
  const date = dateValue(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: JERUSALEM_TIME_ZONE
  }).format(date);
}

export function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = dateValue(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const value = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: JERUSALEM_TIME_ZONE
  }).format(date);
  return `${LTR_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}

export function formatTimeRange(start, end) {
  if (!start || !end) return "";
  return `${LTR_ISOLATE}${start}–${end}${POP_DIRECTIONAL_ISOLATE}`;
}

// בדיקה אם יום שישי (אסור לשבץ)
export function isFriday(date) {
  return new Date(date).getDay() === 5;
}

export function isSchoolDay(date) {
  return SCHOOL_DAYS.includes(new Date(date).getDay());
}

// תאריך בפורמט ISO (YYYY-MM-DD) ללא שעה
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayISO() {
  return toISODate(new Date());
}

// ימי לימוד בטווח (ראשון–חמישי בלבד, ללא שישי/שבת)
export function schoolDaysInRange(startDate, endDate) {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (SCHOOL_DAYS.includes(d.getDay())) {
      days.push(toISODate(d));
    }
  }
  return days;
}

// יום בשבוע 0=ראשון
export function dayOfWeek(dateStr) {
  return new Date(dateStr).getDay();
}

// השוואת שעות HH:MM — מחזיר true אם time1 קטן מ-time2
export function timeBefore(time1, time2) {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return h1 * 60 + m1 < h2 * 60 + m2;
}

export function timeOverlap(s1, e1, s2, e2) {
  return timeBefore(s1, e2) && timeBefore(s2, e1);
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function durationMinutes(start, end) {
  return timeToMinutes(end) - timeToMinutes(start);
}

// טעינת המורה המחובר
export async function getCurrentTeacher() {
  try {
    const me = await base44.auth.me();
    const profiles = await base44.entities.TeacherProfile.filter({ user_id: me.id });
    return profiles[0] || null;
  } catch {
    return null;
  }
}

export function isAdmin(teacher) {
  return teacher?.role === "admin";
}
export function isCoordinator(teacher) {
  return teacher?.role === "coordinator" || teacher?.role === "admin";
}
export function isManagement(teacher) {
  return ["management", "admin", "coordinator"].includes(teacher?.role);
}