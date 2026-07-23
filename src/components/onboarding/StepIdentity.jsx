import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_DIVISIONS, ROLE_LABELS } from "./onboardingConstants";

export default function StepIdentity({ form, set, teacher }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>שם מלא *</Label>
        <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} className="h-11 mt-1" />
      </div>
      <div>
        <Label>דוא״ל *</Label>
        <Input type="email" dir="ltr" value={form.email} onChange={e => set("email", e.target.value)} className="h-11 mt-1 text-left" />
      </div>
      <div>
        <Label>חטיבה *</Label>
        <div className="grid grid-cols-1 gap-2 mt-1">
          {ONBOARDING_DIVISIONS.map(d => (
            <button key={d.value} type="button" onClick={() => set("division", d.value)}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${form.division === d.value ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>תפקיד</Label>
        <div className="h-11 mt-1 rounded-lg border border-border bg-muted/50 px-3 flex items-center text-sm text-muted-foreground">
          {ROLE_LABELS[teacher?.role] || "מורה"} · נקבע ע״י מנהל/ת המערכת
        </div>
      </div>
    </div>
  );
}