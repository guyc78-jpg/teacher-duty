import React from "react";
import { Plus } from "lucide-react";
import DutyCard from "./DutyCard";

const TAGS = { big: "גדולה", medium: "בינונית", small: "קטנה" };

export default function BreakSection({ brk, cards, onAdd, onEdit }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <h3 className="text-sm font-bold">{brk.name || "הפסקה"}</h3>
          <span dir="ltr" className="text-xs text-muted-foreground">{brk.start_time}–{brk.end_time}</span>
        </div>
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">{TAGS[brk.break_type] || ""}</span>
      </header>
      <div className="space-y-2.5 p-3">
        {cards.map(card => <DutyCard key={card.key} {...card} onClick={() => onEdit(card)} />)}
        {!cards.length && <p className="py-2 text-center text-sm text-muted-foreground">אין שיבוצים בהפסקה זו</p>}
        <button type="button" onClick={onAdd} className="flex min-h-11 w-full items-center justify-center gap-1 rounded-[14px] border border-dashed border-input text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Plus className="h-4 w-4" />הוסף שיבוץ
        </button>
      </div>
    </section>
  );
}