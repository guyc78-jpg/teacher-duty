import React, { useEffect, useState } from "react";
import { Loader2, Search, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { manageSwapRequest } from "@/functions/manageSwapRequest";

export default function TeacherSearchList({ duty, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setResults(null);
    setError("");
    const timer = setTimeout(() => {
      manageSwapRequest({ action: "search_candidates", date: duty.date, break_type: duty.break_type, station_id: duty.station_id, query })
        .then(response => { if (alive) setResults(response.data.candidates || []); })
        .catch(searchError => { if (alive) { setResults([]); setError(searchError.response?.data?.error || "החיפוש נכשל, נסו שוב"); } });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, duty.key, duty.date, duty.break_type, duty.station_id]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="חיפוש מורה להחלפה" value={query} onChange={event => setQuery(event.target.value)} placeholder="חיפוש לפי שם או מקצוע..." className="pr-9" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {results === null ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : results.length === 0 && !error ? (
        <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          <UserX className="mx-auto mb-1.5 h-6 w-6" />
          {query ? "לא נמצאו מורים פנויים התואמים לחיפוש" : "אין מורים פנויים לתורנות זו"}
        </div>
      ) : (
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {results.map(candidate => (
            <button key={candidate.id} disabled={!candidate.available} onClick={() => onSelect(candidate)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-right hover:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{candidate.full_name}</span>
                <span className="block text-xs text-muted-foreground">{candidate.available ? candidate.subject : candidate.reasons.join(" · ")}</span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{candidate.available ? `${candidate.duty_count}${candidate.quota ? `/${candidate.quota}` : ""} תורנויות` : "חסום"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}