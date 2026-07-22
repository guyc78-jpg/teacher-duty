import React from "react";

export default function YesNo({ value, onChange, label }) {
  return (
    <div>
      {label && <p className="text-sm font-medium mb-2">{label}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange(true)}
          className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors ${value === true ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}>
          כן
        </button>
        <button type="button" onClick={() => onChange(false)}
          className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors ${value === false ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}>
          לא
        </button>
      </div>
    </div>
  );
}