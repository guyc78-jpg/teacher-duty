import React from "react";
import { Switch } from "@/components/ui/switch";

export default function YesNo({ value, onChange, label }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      {label && <span className="text-sm font-medium">{label}</span>}
      <Switch checked={Boolean(value)} aria-checked={Boolean(value)} aria-label={label || "בחירה"} onCheckedChange={onChange} />
    </div>
  );
}