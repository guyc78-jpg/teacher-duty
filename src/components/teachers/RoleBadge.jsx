import React from "react";

// מחשב את התג המוביל היחיד לפי סדר עדיפות:
// מנהל/ת ← רכז/ת ← מחנך/ת ← פטור ← מורה.
// מחושב מחדש בכל רינדור מתוך נתוני המורה, לכן מתעדכן מיד לאחר כל שינוי.
// שאר התפקידים/הסטטוסים נשמרים בנתונים (is_exempt ממשיך להשפיע על מנוע השיבוץ).
export function getRoleTag(teacher) {
  const t = teacher || {};
  if (t.role === "admin" || t.role === "management") return { key: "admin", label: "מנהל/ת", className: "bg-amber-500 text-white" };
  if (t.role === "coordinator") return { key: "coordinator", label: "רכז/ת", className: "bg-emerald-600 text-white" };
  if (t.is_homeroom || t.role === "homeroom") return { key: "homeroom", label: "מחנך/ת", className: "bg-sky-600 text-white" };
  if (t.is_exempt) return { key: "exempt", label: "פטור", className: "bg-rose-600 text-white" };
  return { key: "teacher", label: "מורה", className: "bg-muted text-muted-foreground" };
}

export default function RoleBadge({ teacher, className = "" }) {
  const tag = getRoleTag(teacher);
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${tag.className} ${className}`}>
      {tag.label}
    </span>
  );
}