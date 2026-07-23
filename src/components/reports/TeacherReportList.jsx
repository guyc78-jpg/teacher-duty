import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { breakNames, dayNames, fixLink } from "@/lib/fixedReportUtils";

export default function TeacherReportList({ teachers }) {
  const [limit, setLimit] = useState(10);
  return <details className="rounded-xl border bg-card"><summary className="cursor-pointer px-4 py-3 font-bold">פירוט השיבוצים לכל מורה ({teachers.length})</summary>
    <div className="space-y-2 border-t p-3">{teachers.slice(0, limit).map(teacher => <div key={teacher.teacher_id} className="rounded-lg border p-3">
      <p className="font-semibold">{teacher.teacher_name} · {teacher.assigned}/{teacher.quota}</p>
      <div className="mt-1 flex flex-wrap gap-1">{teacher.duties.length ? teacher.duties.map((duty, index) => <Button key={`${duty.link}-${index}`} asChild variant="outline" size="sm"><Link to={fixLink(duty)}>{dayNames[duty.day_of_week]} · {breakNames[duty.break_type]} · {duty.station_name}</Link></Button>) : <span className="text-sm text-muted-foreground">{teacher.reason || "לא שובץ"}</span>}</div>
    </div>)}
    {limit < teachers.length && <Button variant="outline" onClick={() => setLimit(value => value + 10)}>טען עוד מורים</Button>}</div>
  </details>;
}