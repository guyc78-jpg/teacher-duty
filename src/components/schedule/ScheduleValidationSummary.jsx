import React from "react";
import { AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";

export default function ScheduleValidationSummary({ validation }) {
  const coverage = validation.total ? Math.round((validation.covered / validation.total) * 100) : 0;
  return (
    <section className="rounded-xl border border-border bg-card p-3" aria-labelledby="coverage-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="coverage-title" className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-primary" />סיכום ולידציה</h2>
        <span className={`text-xs font-semibold ${validation.isValid ? "text-success" : "text-warning"}`}>{validation.isValid ? "מוכן לפרסום" : "נדרש טיפול"}</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border text-center">
        <div><p className="text-lg font-bold">{coverage}%</p><p className="text-[11px] text-muted-foreground">כיסוי</p></div>
        <div><p className="text-lg font-bold">{validation.uncovered.length}</p><p className="text-[11px] text-muted-foreground">ללא כיסוי</p></div>
        <div><p className="text-lg font-bold">{validation.conflicts.length}</p><p className="text-[11px] text-muted-foreground">התנגשויות</p></div>
      </div>
      {validation.isValid ? <p className="mt-3 flex items-center gap-1.5 text-xs text-success"><CheckCircle className="h-4 w-4" />כל השיבוצים מכוסים וללא התנגשויות.</p> : <p className="mt-3 flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="h-4 w-4" />יש להשלים כיסוי ולפתור התנגשויות לפני פרסום.</p>}
    </section>
  );
}