import React from "react";
import { Label } from "@/components/ui/label";
import YesNo from "./YesNo";
import { WEEK_DAYS } from "./onboardingConstants";

export default function StepDaysOff({ form, set, teacher }) {
  const toggleDay = (d) => {
    set("days_off", form.days_off.includes(d) ? form.days_off.filter(x => x !== d) : [...form.days_off, d]);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>ימי חופש קבועים (ניתן לבחור יותר מיום אחד)</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {WEEK_DAYS.map(d => (
            <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
              className={`h-12 rounded-lg border text-sm font-medium transition-colors ${form.days_off.includes(d.value) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      {teacher?.is_exempt ? (
        <p className="text-sm rounded-lg p-3 border status-success">קיים לך פטור מתורנות מאושר.</p>
      ) : (
        <>
          <YesNo label="האם קיים לך פטור מתורנות?" value={form.request_exemption} onChange={v => set("request_exemption", v)} />
          {form.request_exemption && (
            <p className="text-sm rounded-lg p-3 border status-warning">
              הבקשה תסומן כ„ממתינה לאימות מנהל”. עד לאישור המנהל, הפטור לא יוחל בשיבוץ.
            </p>
          )}
        </>
      )}
    </div>
  );
}