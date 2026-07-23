import React from "react";

const ROLE_STYLES = {
  admin: { block: "bg-amber-500 text-white", badge: "bg-amber-500 text-white" },
  coordinator: { block: "bg-emerald-600 text-white", badge: "bg-emerald-600 text-white" },
  homeroom: { block: "bg-sky-600 text-white", badge: "bg-sky-600 text-white" },
  exempt: { block: "bg-rose-600 text-white", badge: "bg-rose-600 text-white" },
  teacher: { block: "bg-muted text-muted-foreground", badge: "bg-muted text-muted-foreground border border-border" }
};

// מחשב את התג המוביל היחיד לפי סדר עדיפות:
// מנהל/ת ← רכז/ת ← מחנך/ת ← פטור ← מורה.
// מחושב מחדש בכל רינדור מתוך נתוני המורה, לכן מתעדכן מיד לאחר כל שינוי.
// שאר התפקידים/הסטטוסים נשמרים בנתונים (is_exempt ממשיך להשפיע על מנוע השיבוץ).
export function getRoleTag(teacher) {
  const t = teacher || {};
  let key;
  if (t.role === "admin" || t.role === "management") key = "admin";
  else if (t.role === "coordinator") key = "coordinator";
  else if (t.is_homeroom || t.role === "homeroom") key = "homeroom";
  else if (t.is_exempt) key = "exempt";
  else key = "teacher";
  const labels = { admin: "מנהל/ת", coordinator: "רכז/ת", homeroom: "מחנך/ת", exempt: "פטור", teacher: "מורה" };
  return { key, label: labels[key], ...ROLE_STYLES[key] };
}

export default function RoleBadge({ teacher, className = "" }) {
  const tag = getRoleTag(teacher);
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${tag.badge} ${className}`}>
      {tag.label}
    </span>
  );
}