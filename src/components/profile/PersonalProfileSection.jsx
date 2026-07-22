import React from "react";
import { DIVISION_LABELS } from "@/lib/dutyUtils";
import { ROLE_LABELS } from "@/components/onboarding/onboardingConstants";

export default function PersonalProfileSection({ teacher }) {
  const rows = [
    ["שם מלא", teacher.full_name],
    ["דוא״ל", teacher.email],
    ["מזהה עובד", teacher.employee_id],
    ["חטיבה", DIVISION_LABELS[teacher.division] || "—"],
    ["תפקיד", ROLE_LABELS[teacher.role] || "מורה"],
    ["שעות הוראה", teacher.weekly_teaching_hours ?? 0]
  ];

  return (
    <section className="rounded-xl border border-border bg-card px-4">
      <h2 className="border-b border-border py-3 text-base font-bold">פרטים אישיים</h2>
      <div className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate font-medium" dir={label === "דוא״ל" ? "ltr" : undefined}>{value || "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}