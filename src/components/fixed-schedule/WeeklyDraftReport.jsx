import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
const breakNames = { big: "גדולה", medium: "בינונית", small: "קטנה" };

export default function WeeklyDraftReport({ report, onJump }) {
  if (!report) return null;
  const { summary, under_quota: under, over_quota: over, not_assigned: none, unfilled, conflicts, teachers } = report;
  return <section className="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="draft-report-title">
    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /><h2 id="draft-report-title" className="font-bold">דוח שיבוץ אוטומטי שבועי</h2></div>
    <div className="grid grid-cols-3 gap-2 text-center"><Metric label="נדרשו" value={summary.required} /><Metric label="שובצו" value={summary.assigned} /><Metric label="חסרות" value={summary.missing} /></div>
    {(unfilled.length > 0 || conflicts.length > 0) && <ReportList title="עמדות לא מאוישות והתנגשויות" items={[...conflicts, ...unfilled]} onJump={onJump} />}
    {(under.length > 0 || over.length > 0) && <ReportList title="חריגות מכסה" items={[...under, ...over].map(item => ({ ...item, message: `${item.teacher_name}: ${item.assigned} מתוך ${item.quota}${item.reason ? ` · ${item.reason}` : ""}` }))} />}
    {none.length > 0 && <ReportList title="מורים שלא שובצו" items={none.map(item => ({ ...item, message: `${item.teacher_name}: ${item.reason}` }))} />}
    <details><summary className="cursor-pointer text-sm font-semibold">פירוט לכל מורה ({teachers.length})</summary><div className="mt-2 space-y-2">{teachers.filter(item => item.quota > 0).map(item => <div key={item.teacher_id} className="rounded-lg border p-2 text-sm"><p className="font-semibold">{item.teacher_name} · {item.assigned}/{item.quota}</p>{item.duties.length ? item.duties.map((duty, index) => <Button key={`${duty.link}-${index}`} variant="link" className="h-auto px-1 py-1 text-xs" onClick={() => onJump?.(duty)}>{days[duty.day_of_week]}, הפסקה {breakNames[duty.break_type]}, {duty.station_name}</Button>) : <p className="text-xs text-muted-foreground">{item.reason}</p>}</div>)}</div></details>
  </section>;
}

function Metric({ label, value }) { return <div className="rounded-xl bg-muted p-3"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function ReportList({ title, items, onJump }) { return <div><h3 className="flex items-center gap-1 text-sm font-bold text-destructive"><AlertTriangle className="h-4 w-4" />{title} ({items.length})</h3><div className="mt-1 space-y-1">{items.map((item, index) => <div key={`${item.link || item.teacher_id}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted p-2 text-xs"><span>{item.message}</span>{item.link && <Button size="sm" variant="outline" onClick={() => onJump?.(item)}>לתיקון</Button>}</div>)}</div></div>; }