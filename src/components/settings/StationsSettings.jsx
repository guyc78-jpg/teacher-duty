import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StationRow from "@/components/settings/StationRow";

const selectClass = "h-10 rounded-lg border border-input bg-background px-2 text-sm";

export default function StationsSettings({ StationModal }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", division: "", level: "", type: "" });
  const load = useCallback(async () => {
    setStations(await base44.entities.Station.list("sort_order", 100));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const levels = useMemo(() => [...new Set(stations.map(item => item.level).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he")), [stations]);
  const filtered = stations.filter(item => {
    if (filters.search && !item.name.toLocaleLowerCase("he").includes(filters.search.toLocaleLowerCase("he"))) return false;
    if (filters.division && item.division !== filters.division && item.division !== "both") return false;
    if (filters.level && item.level !== filters.level) return false;
    if (filters.type === "sport" && !item.is_sport_station) return false;
    if (filters.type === "general" && item.is_sport_station) return false;
    return true;
  });
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card p-2.5">
        <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="חיפוש עמדה" value={filters.search} onChange={event => setFilter("search", event.target.value)} placeholder="חיפוש עמדה..." className="pr-9" /></div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select aria-label="סינון לפי חטיבה" value={filters.division} onChange={event => setFilter("division", event.target.value)} className={selectClass}><option value="">כל החטיבות</option><option value="middle">חטיבת ביניים</option><option value="high">חטיבה עליונה</option></select>
          <select aria-label="סינון לפי מפלס" value={filters.level} onChange={event => setFilter("level", event.target.value)} className={selectClass}><option value="">כל המפלסים</option>{levels.map(level => <option key={level} value={level}>{level}</option>)}</select>
          <select aria-label="סינון לפי סוג עמדה" value={filters.type} onChange={event => setFilter("type", event.target.value)} className={`${selectClass} col-span-2 sm:col-span-1`}><option value="">כל סוגי העמדות</option><option value="general">עמדה רגילה</option><option value="sport">עמדת ספורט</option></select>
        </div>
      </div>
      <p className="px-1 text-xs text-muted-foreground">{filtered.length} עמדות</p>
      <div className="space-y-1.5">{filtered.map(station => <StationRow key={station.id} station={station} onEdit={setEditing} />)}</div>
      {!filtered.length && <p className="py-8 text-center text-sm text-muted-foreground">לא נמצאו עמדות מתאימות.</p>}
      <Button variant="outline" className="w-full" onClick={() => setEditing({})}><Plus className="ml-1 h-4 w-4" />הוסף עמדה</Button>
      {editing && <StationModal station={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}