import React from "react";
import { Label } from "@/components/ui/label";
import YesNo from "./YesNo";
import { GRADES, CLASS_NUMBERS } from "./onboardingConstants";

export default function StepHomeroom({ form, set }) {
  return (
    <div className="space-y-4">
      <YesNo label="האם את/ה מחנך/ת כיתה?" value={form.is_homeroom} onChange={v => set("is_homeroom", v)} />
      {form.is_homeroom && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>שכבה *</Label>
            <select value={form.homeroom_grade} onChange={e => set("homeroom_grade", e.target.value)}
              className="w-full h-11 mt-1 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">בחר שכבה</option>
              {GRADES.map(g => <option key={g} value={g}>שכבה {g}</option>)}
            </select>
          </div>
          <div>
            <Label>כיתה *</Label>
            <select value={form.homeroom_class} onChange={e => set("homeroom_class", e.target.value)}
              className="w-full h-11 mt-1 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">בחר כיתה</option>
              {CLASS_NUMBERS.map(n => <option key={n} value={String(n)}>{n}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}