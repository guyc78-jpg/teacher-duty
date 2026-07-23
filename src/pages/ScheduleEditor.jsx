import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { manageDailySchedule } from "@/functions/manageDailySchedule";
import { getCurrentTeacher, isManagement } from "@/lib/dutyUtils";
import { fromIso, heDate, iso, moveSchoolDay, schoolDate, weekDates, weekStart } from "@/lib/scheduleViewUtils";
import SchedulerTopBar from "@/components/duty-scheduler/SchedulerTopBar";
import SchedulerMorePanel from "@/components/duty-scheduler/SchedulerMorePanel";
import BreakSection from "@/components/duty-scheduler/BreakSection";
import WeekView from "@/components/duty-scheduler/WeekView";
import SlotEditDialog from "@/components/duty-scheduler/SlotEditDialog";
import { patchSchedulerData } from "@/components/duty-scheduler/patchSchedulerData";

export default function ScheduleEditor({ embedded = false }) {
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["current-teacher"], queryFn: () => getCurrentTeacher() });
  const [view, setView] = useState("day");
  const [date, setDate] = useState(() => { const now = new Date(); while (!schoolDate(now)) now.setDate(now.getDate() + 1); return iso(now); });
  const [week, setWeek] = useState(() => weekStart(iso(new Date())));
  const [filters, setFilters] = useState({ break_type: "", station_id: "", teacher_id: "" });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const visibleDates = view === "day" ? [date] : weekDates(week);
  const queryKey = ["dutyScheduler", visibleDates.join("|")];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => manageDailySchedule({ action: "load", dates: visibleDates }).then(result => result.data), enabled: !!me && isManagement(me), staleTime: 0, refetchOnMount: "always" });
  const teachersById = useMemo(() => new Map((data?.teachers || []).map(item => [item.id, item])), [data?.teachers]);

  const getSlotIds = (day, breakType, sid) => {
    const exception = (data?.exceptions || []).find(item => item.date === day && item.break_type === breakType && item.station_id === sid);
    if (exception) return exception.teacher_ids || [];
    const dow = fromIso(day).getDay();
    return (data?.template_assignments || []).find(item => Number(item.day_of_week) === dow && item.break_type === breakType && item.station_id === sid)?.teacher_ids || [];
  };
  const sectionsFor = day => {
    const dow = fromIso(day).getDay();
    return (data?.breaks || []).filter(brk => (brk.active_days || []).map(Number).includes(dow) && (!filters.break_type || brk.break_type === filters.break_type)).map(brk => ({
      brk,
      cards: (data?.stations || []).filter(station => station.active_break_types?.includes(brk.break_type) && (!filters.station_id || station.id === filters.station_id)).flatMap(station =>
        getSlotIds(day, brk.break_type, station.id).filter(id => !filters.teacher_id || id === filters.teacher_id).map(id => {
          const teacher = teachersById.get(id);
          return { key: `${station.id}|${id}`, teacherId: id, teacherName: teacher?.full_name || "מורה", stationName: station.name, roleLabel: teacher?.is_homeroom ? "מחנך" : "מורה", stationId: station.id };
        }))
    }));
  };
  const onSaved = saved => { queryClient.setQueryData(queryKey, old => patchSchedulerData(old, saved)); setMessage(saved.scope === "fixed" ? "השינוי נשמר ועודכן גם בלוח הקבוע" : "השינוי נשמר לתאריך זה בלבד"); };
  const openCreate = (day, brk, stationId = "") => setEditing({ mode: "create", date: day, brk, stationId });
  const openEdit = (day, brk, card) => setEditing({ mode: "edit", date: day, brk, stationId: card.stationId, teacherId: card.teacherId });

  if (meLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!me || !isManagement(me)) return <p className="py-20 text-center text-muted-foreground">אין הרשאה.</p>;
  const specialForVisible = (data?.special_days || []).filter(item => visibleDates.includes(item.date));

  return (
    <div className="space-y-3 pb-24 lg:pb-6">
      {!embedded && <h1 className="text-xl font-bold">שיבוץ תורנויות</h1>}
      <SchedulerTopBar view={view} setView={setView} date={view === "day" ? date : week}
        onDate={value => { if (!value) return; if (schoolDate(fromIso(value))) { setDate(value); setWeek(weekStart(value)); setMessage(""); } else setMessage("ניתן להציג רק ימים ראשון–חמישי"); }}
        onPrevious={() => view === "day" ? setDate(moveSchoolDay(date, -1)) : setWeek(iso(new Date(fromIso(week).setDate(fromIso(week).getDate() - 7))))}
        onNext={() => view === "day" ? setDate(moveSchoolDay(date, 1)) : setWeek(iso(new Date(fromIso(week).setDate(fromIso(week).getDate() + 7))))}
        onToday={() => { const today = iso(new Date()); const safe = schoolDate(fromIso(today)) ? today : moveSchoolDay(today, 1); setDate(safe); setWeek(weekStart(safe)); }} />
      <SchedulerMorePanel filters={filters} setFilters={setFilters} stations={data?.stations || []} teachers={data?.teachers || []} />
      {specialForVisible.map(item => <Link key={item.id} to={`/special-days/${item.id}`} className="block rounded-lg bg-primary p-3 text-sm font-bold text-primary-foreground">יום מיוחד: {item.name} · {heDate(item.date)}</Link>)}
      {message && <p role="status" className="rounded-lg border border-border bg-card p-2 text-sm">{message}</p>}
      {isLoading || !data ? <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div> : view === "day" ? (
        <>
          <p className="text-sm font-medium text-muted-foreground">{heDate(date)}</p>
          <div className="space-y-4">
            {sectionsFor(date).map(({ brk, cards }) => <BreakSection key={brk.id} brk={brk} cards={cards} onAdd={() => openCreate(date, brk)} onEdit={card => openEdit(date, brk, card)} />)}
          </div>
        </>
      ) : (
        <WeekView dates={visibleDates} breaks={data.breaks || []} stations={data.stations || []} getSlotIds={getSlotIds} teachersById={teachersById} filters={filters} onAdd={openCreate} onEdit={openEdit} />
      )}
      {editing && <SlotEditDialog context={editing} stations={data?.stations || []} getSlotIds={getSlotIds} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}