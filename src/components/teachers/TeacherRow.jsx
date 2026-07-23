import React from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { getRoleTag } from "@/components/teachers/RoleBadge";

function initialsOf(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "");
}

export default function TeacherRow({ teacher, onOpen, onDelete }) {
  const tag = getRoleTag(teacher);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(teacher)}
      onKeyDown={e => { if (e.key === "Enter") onOpen(teacher); }}
      className="flex w-full cursor-pointer items-center gap-3 overflow-visible rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm transition-colors last:border-b-0 hover:bg-muted/50"
    >
      <div className="relative mt-1 shrink-0 overflow-visible pt-1">
        <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-lg text-base font-bold ${tag.block}`}>
          {initialsOf(teacher.full_name)}
        </div>
        <span className={`absolute -left-1 top-0 z-20 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm ${tag.badge}`}>
          {tag.label}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight break-words">{teacher.full_name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {teacher.subject || "—"} · {teacher.weekly_teaching_hours || 0} שעות/שבוע
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onDelete && (
          <button
            aria-label={`מחיקת ${teacher.full_name}`}
            onClick={e => { e.stopPropagation(); onDelete(teacher); }}
            className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}