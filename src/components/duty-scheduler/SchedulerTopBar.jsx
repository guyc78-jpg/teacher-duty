import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted";

export default function SchedulerTopBar({ view, setView, date, onDate, onPrevious, onNext, onToday }) {
  return (
    <div className="sticky top-12 z-30 -mx-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4 lg:top-0 lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-input p-0.5">
          {[{ key: "day", label: "יומי" }, { key: "week", label: "שבועי" }].map(option => (
            <button key={option.key} type="button" onClick={() => setView(option.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === option.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="הקודם" onClick={onPrevious} className={iconButton}><ChevronRight className="h-4 w-4" /></button>
        <input type="date" aria-label="בחירת תאריך" value={date} onChange={e => onDate(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm sm:max-w-44 sm:flex-none" />
        <button type="button" aria-label="הבא" onClick={onNext} className={iconButton}><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={onToday} className="h-9 rounded-lg border border-input px-3 text-sm hover:bg-muted">היום</button>
      </div>
    </div>
  );
}