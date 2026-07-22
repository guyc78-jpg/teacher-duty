import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import BreakModal from "@/components/settings/BreakModal";
import BreakRow from "@/components/settings/BreakRow";

export default function BreaksSettings({ Modal }) {
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const load = useCallback(async () => {
    const all = await base44.entities.Break.list("sort_order", 50);
    setBreaks(all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.start_time.localeCompare(b.start_time)));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const move = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= breaks.length) return;
    const reordered = [...breaks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await base44.entities.Break.bulkUpdate(reordered.map((item, sortOrder) => ({ id: item.id, sort_order: sortOrder })));
    await load();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  const nextOrder = Math.max(-1, ...breaks.map(item => item.sort_order ?? 0)) + 1;
  return (
    <div className="space-y-1.5">
      {breaks.map((item, index) => <BreakRow key={item.id} item={item} index={index} total={breaks.length} onEdit={setEditing} onMove={move} />)}
      <Button variant="outline" className="w-full" onClick={() => setEditing({})}><Plus className="ml-1 h-4 w-4" />הוסף הפסקה</Button>
      {editing && <BreakModal item={editing} breaks={breaks} nextOrder={nextOrder} Modal={Modal} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}