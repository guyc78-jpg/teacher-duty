export const GRADES = ["ז", "ח", "ט", "י", "יא", "יב"];
export const CLASS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const WEEK_DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" }
];

export const ROLE_LABELS = {
  management: "הנהלה",
  admin: "מנהל/ת מערכת",
  coordinator: "רכז/ת",
  homeroom: "מחנך/ת",
  teacher: "מורה"
};

export const ONBOARDING_DIVISIONS = [
  { value: "middle", label: "חטיבת ביניים" },
  { value: "high", label: "חטיבה עליונה" },
  { value: "both", label: "שתי החטיבות" }
];

export const NOTIF_PREF_LABELS = {
  notify_duty_reminder: { label: "תזכורת תורנות", operational: true },
  notify_plan_published: { label: "פרסום לוח", operational: false },
  notify_assignment_change: { label: "שינוי שיבוץ", operational: true },
  notify_swap_request: { label: "בקשת החלפה", operational: false },
  notify_swap_accepted: { label: "החלפה התקבלה", operational: false },
  notify_swap_rejected: { label: "החלפה נדחתה/בוטלה", operational: false },
  notify_uncovered_station: { label: "עמדה ללא כיסוי", operational: false, roles: ["management", "admin", "coordinator"] },
  notify_missing_arrival: { label: "אי־אישור הגעה", operational: true, roles: ["management", "admin", "coordinator"] },
  notify_incident: { label: "אירוע חריג", operational: true, roles: ["management", "admin", "coordinator"] }
};

export const DEFAULT_PREFS = Object.fromEntries(
  Object.entries(NOTIF_PREF_LABELS).map(([k, v]) => [k, v.operational ? true : k !== "notify_uncovered_station"])
);

export const CHANGE_LABELS = {
  subject: "מקצוע ראשי",
  additional_subjects: "מקצועות נוספים",
  is_sport_teacher: "מורה לספורט",
  is_homeroom: "מחנך/ת",
  homeroom_grade: "שכבה",
  homeroom_class: "כיתה",
  days_off: "ימי חופש",
  request_exemption: "בקשת פטור מתורנות"
};

export function formatChangeValue(key, val) {
  if (key === "days_off") return (val || []).map(d => WEEK_DAYS.find(w => w.value === Number(d))?.label).filter(Boolean).join(", ") || "ללא";
  if (key === "additional_subjects") return (val || []).join(", ") || "ללא";
  if (typeof val === "boolean") return val ? "כן" : "לא";
  return String(val || "—");
}

export const EXEMPTION_STATUS_LABELS = {
  none: null,
  pending: { label: "פטור ממתין לאימות מנהל/ת", class: "status-warning" },
  approved: { label: "פטור מאושר", class: "status-success" },
  rejected: { label: "בקשת פטור נדחתה", class: "status-danger" }
};