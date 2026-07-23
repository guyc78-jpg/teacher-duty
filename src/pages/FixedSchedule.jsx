import React, { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { manageFixedSchedule } from "@/functions/manageFixedSchedule";
import { Button } from "@/components/ui/button";
import FixedBreakSection from "@/components/fixed-schedule/FixedBreakSection";
import FixedScheduleToolbar from "@/components/fixed-schedule/FixedScheduleToolbar";
import FixedTeacherSheet from "@/components/fixed-schedule/FixedTeacherSheet";
import FixedPublishDialog from "@/components/fixed-schedule/FixedPublishDialog";

export default function FixedSchedule() {
  const [data, setData] = useState(null), [day, setDay] = useState(0), [editing, setEditing] = useState(null), [review, setReview] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const load = () => manageFixedSchedule({ action: "load" }).then(r => setData(r.data)).catch(e => setMessage(e.response?.data?.error || e.message));
  useEffect(() => { load(); }, []);
  const act = async (action, extra = {}) => { setBusy(true); setMessage(""); try { const r = await manageFixedSchedule({ action, expected_updated_date: data.template.updated_date, ...extra }); setData(r.data); setMessage(action === "auto_assign" ? "השיבוץ האוטומטי הושלם" : action === "publish" ? "הלוח הקבוע פורסם" : "הטיוטה נשמרה"); return r.data; } catch (e) { setMessage(e.response?.data?.error || e.message); if (e.response?.data?.validation) setData(current => ({ ...current, validation: e.response.data.validation })); } finally { setBusy(false); } };
  const openReview = async () => { setBusy(true); try { const r = await manageFixedSchedule({ action: "validate", expected_updated_date: data.template.updated_date }); setData(current => ({ ...current, validation: r.data })); setReview(true); } finally { setBusy(false); } };
  if (!data) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  const dayBreaks = data.breaks.filter(brk => brk.active_days?.includes(day));
  return <div className="space-y-4 pb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">לוח קבוע</h1><p className="text-sm text-muted-foreground">תבנית שבועית חוזרת · גרסה {data.template.version} · {data.template.status === "published" ? "פורסם" : "טיוטה"}</p></div><Button onClick={openReview} disabled={busy}><Send />פרסם לוח קבוע</Button></div><FixedScheduleToolbar day={day} setDay={setDay} busy={busy} onSave={() => act("save_draft")} onAuto={() => act("auto_assign")} onClear={() => confirm("לנקות את כל השיבוצים ביום זה?") && act("clear_day", { day_of_week: day })} onCopy={target => act("copy_day", { day_of_week: day, target_day: target })} />{message && <p role="status" className="rounded-lg border bg-card p-3 text-sm">{message}</p>}<div className="space-y-3">{dayBreaks.map(brk => <FixedBreakSection key={brk.id} brk={brk} stations={data.stations} assignments={data.template.assignments || []} day={day} onOpen={setEditing} />)}</div>{editing && <FixedTeacherSheet context={editing} day={day} template={data.template} onClose={() => setEditing(null)} onSaved={next => { setData(next); setEditing(null); setMessage("השיבוץ נשמר בטיוטה"); }} />}{review && <FixedPublishDialog validation={data.validation} busy={busy} onClose={() => setReview(false)} onPublish={async reason => { await act("publish", { override_reason: reason }); setReview(false); }} />}</div>;
}