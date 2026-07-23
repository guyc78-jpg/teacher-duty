import React from "react";
import { User } from "lucide-react";
import DetailSection from "./DetailSection";
import { DIVISION_LABELS } from "@/lib/dutyUtils";

const roleLabels = { management: "הנהלה", admin: "מנהל/ת מערכת", coordinator: "רכז/ת", teacher: "מורה", homeroom: "מחנך/ת" };

export default function PersonalDetailsSection({ teacher }) {
  const show = v => v || "לא הוזן";
  const fields = [
    ["שם מלא", show(teacher.full_name)],
    ["מקצוע", show(teacher.subject)],
    ["חטיבה", show(DIVISION_LABELS[teacher.division])],
    ["תפקיד", show(roleLabels[teacher.role] || teacher.role)],
    ["טלפון", show(teacher.phone)],
    ["דוא״ל", show(teacher.email)]
  ];
  return (
    <DetailSection icon={User} title="פרטים אישיים" defaultOpen>
      {() => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`mt-0.5 break-words text-sm font-medium ${value === "לא הוזן" ? "text-muted-foreground/70" : ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </DetailSection>
  );
}