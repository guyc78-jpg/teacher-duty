import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import YesNo from "./YesNo";

export default function StepProfessional({ form, set }) {
  const [newSubject, setNewSubject] = useState("");

  const addSubject = () => {
    const s = newSubject.trim();
    if (!s || form.additional_subjects.includes(s) || s === form.subject) { setNewSubject(""); return; }
    set("additional_subjects", [...form.additional_subjects, s]);
    setNewSubject("");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>מקצוע ראשי</Label>
        <Input value={form.subject} onChange={e => set("subject", e.target.value)} className="h-11 mt-1" placeholder="לדוגמה: מתמטיקה" />
      </div>
      <div>
        <Label>מקצועות נוספים</Label>
        <div className="flex gap-2 mt-1">
          <Input value={newSubject} onChange={e => setNewSubject(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
            className="h-11" placeholder="הוסף מקצוע נוסף" />
          <Button type="button" variant="outline" className="h-11" onClick={addSubject}><Plus className="w-4 h-4" /></Button>
        </div>
        {form.additional_subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.additional_subjects.map(s => (
              <span key={s} className="inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {s}
                <button type="button" onClick={() => set("additional_subjects", form.additional_subjects.filter(x => x !== s))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <YesNo label="האם את/ה מורה לספורט?" value={form.is_sport_teacher} onChange={v => set("is_sport_teacher", v)} />
    </div>
  );
}