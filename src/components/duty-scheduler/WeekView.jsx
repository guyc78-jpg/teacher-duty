import React from "react";
import BreakSection from "./BreakSection";
import { heDate } from "@/lib/scheduleViewUtils";

export default function WeekView({ dates, sectionsFor, onAdd, onEdit }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-3">
      {dates.map(date => (
        <div key={date} className="min-w-0 space-y-3">
          <h2 className="text-sm font-bold">{heDate(date)}</h2>
          {sectionsFor(date).map(({ brk, cards }) => (
            <BreakSection key={brk.id} brk={brk} cards={cards} onAdd={() => onAdd(date, brk)} onEdit={card => onEdit(date, brk, card)} />
          ))}
        </div>
      ))}
    </div>
  );
}