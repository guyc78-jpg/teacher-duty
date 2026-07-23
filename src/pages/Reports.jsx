import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { manageFixedSchedule } from "@/functions/manageFixedSchedule";
import ReportRunPicker from "@/components/reports/ReportRunPicker";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportSummary from "@/components/reports/ReportSummary";
import ReportSection from "@/components/reports/ReportSection";
import TeacherReportList from "@/components/reports/TeacherReportList";
import { matchesFilters } from "@/lib/fixedReportUtils";

const emptyFilters = { search: "", day: "all", breakType: "all", station: "all", teacher: "all" };
export default function Reports() {
  const requested = new URLSearchParams(window.location.search).get("report"), [week, setWeek] = useState("all"), [selectedId, setSelectedId] = useState(requested), [filters, setFilters] = useState(emptyFilters);
  const list = useQuery({ queryKey: ["fixed-reports"], queryFn: () => manageFixedSchedule({ action: "list_reports" }).then(response => response.data.reports) });
  useEffect(() => { if (!selectedId && list.data?.length) setSelectedId(list.data[0].id); }, [list.data, selectedId]);
  const detail = useQuery({ queryKey: ["fixed-report", selectedId], enabled: Boolean(selectedId), queryFn: () => manageFixedSchedule({ action: "get_report", report_id: selectedId }).then(response => response.data.report) });
  const report = detail.data?.report, filtered = useMemo(() => { if (!report) return null; const teacherMatch = item => (filters.teacher === "all" || item.teacher_id === filters.teacher) && (!filters.search || `${item.teacher_name} ${item.reason || ""}`.toLowerCase().includes(filters.search.toLowerCase())); return { unfilled: report.unfilled.filter(item => matchesFilters(item, filters)), conflicts: report.conflicts.filter(item => matchesFilters(item, filters)), under: report.under_quota.filter(teacherMatch), over: report.over_quota.filter(teacherMatch), none: report.not_assigned.filter(teacherMatch), teachers: report.teachers.map(item => ({ ...item, duties: item.duties.filter(duty => matchesFilters({ ...duty, teacher_id: item.teacher_id, teacher_name: item.teacher_name }, filters)) })).filter(item => teacherMatch(item) && ((filters.day === "all" && filters.breakType === "all" && filters.station === "all") || item.duties.length)) }; }, [report, filters]);
  if (list.isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (list.error) return <p role="alert" className="text-destructive">אין הרשאה לצפות בדוחות</p>;
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">דוחות</h1><p className="text-sm text-muted-foreground">דוח נפרד לכל הרצת שיבוץ אוטומטי</p></div>{list.data?.length ? <><ReportRunPicker reports={list.data} week={week} setWeek={setWeek} selectedId={selectedId} setSelectedId={setSelectedId} />{detail.isLoading ? <Loader2 className="mx-auto animate-spin" /> : report && <><ReportFilters filters={filters} setFilters={setFilters} report={report} /><ReportSummary report={report} /><ReportSection title="עמדות שלא אוישו" items={filtered.unfilled} group /><ReportSection title="מורים מתחת או מעל המכסה" items={[...filtered.under, ...filtered.over].map(item => ({ ...item, message: `${item.teacher_name}: ${item.assigned} מתוך ${item.quota}` }))} /><ReportSection title="מורים שלא שובצו והסיבות" items={filtered.none.map(item => ({ ...item, message: item.reason }))} group /><ReportSection title="התנגשויות וחסימות" items={filtered.conflicts} group /><TeacherReportList teachers={filtered.teachers} /></>}</> : <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">עדיין לא נשמרו דוחות שיבוץ</p>}</div>;
}