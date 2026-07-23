import React from "react";

export default function FixedTeacherSkeleton() {
  return <div className="mt-3 space-y-2" aria-label="טוען מורים">
    {[0, 1, 2, 3].map(item => <div key={item} className="rounded-xl border p-3"><div className="h-4 w-2/5 animate-pulse rounded bg-muted" /><div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-muted" /><div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-muted" /></div>)}
  </div>;
}