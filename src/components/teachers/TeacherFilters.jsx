import React from "react";

const selectClass = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

export default function TeacherFilters({ filters, onChange, subjects }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <select aria-label="סינון לפי חטיבה" value={filters.division} onChange={e => set("division", e.target.value)} className={selectClass}>
        <option value="">כל החטיבות</option>
        <option value="middle">חטיבת ביניים</option>
        <option value="high">חטיבה עליונה</option>
        <option value="both">שתי החטיבות</option>
      </select>
      <select aria-label="סינון לפי מקצוע" value={filters.subject} onChange={e => set("subject", e.target.value)} className={selectClass}>
        <option value="">כל המקצועות</option>
        {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
      </select>
      <select aria-label="סינון לפי פטור" value={filters.exempt} onChange={e => set("exempt", e.target.value)} className={selectClass}>
        <option value="">כל מצבי הפטור</option>
        <option value="yes">פטור מתורנות</option>
        <option value="no">ללא פטור</option>
      </select>
      <select aria-label="סינון לפי סטטוס" value={filters.status} onChange={e => set("status", e.target.value)} className={selectClass}>
        <option value="">כל הסטטוסים</option>
        <option value="active">פעיל</option>
        <option value="inactive">לא פעיל</option>
      </select>
    </div>
  );
}