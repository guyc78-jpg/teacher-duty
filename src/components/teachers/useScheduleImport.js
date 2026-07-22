import { useState } from "react";
import { base44 } from "@/api/base44Client";

const DAY_MAP = { "א": 0, "א׳": 0, "ראשון": 0, "ב": 1, "ב׳": 1, "שני": 1, "ג": 2, "ג׳": 2, "שלישי": 2, "ד": 3, "ד׳": 3, "רביעי": 3, "ה": 4, "ה׳": 4, "חמישי": 4, sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4 };
const clean = value => String(value ?? "").trim().replace(/\s+/g, " ");
const dayNumber = value => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 4 ? Number(value) : DAY_MAP[clean(value).toLowerCase()];
const timeValue = value => { const match = clean(value).match(/^(\d{1,2}):(\d{2})/); return match ? `${match[1].padStart(2, "0")}:${match[2]}` : ""; };

const extractionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      teacher_name: { type: "string", description: "שם המורה המלא" },
      day_of_week: { type: ["number", "string"], description: "יום בשבוע, ראשון עד חמישי או 0 עד 4" },
      start_time: { type: "string", description: "שעת התחלה בפורמט HH:MM" },
      end_time: { type: "string", description: "שעת סיום בפורמט HH:MM" },
      lesson_number: { type: ["number", "null"] },
      class_name: { type: ["string", "null"] },
      division: { type: ["string", "null"], description: "middle לחטיבת ביניים או high לחטיבה עליונה" },
      valid_from: { type: ["string", "null"], description: "תאריך YYYY-MM-DD אם קיים" },
      valid_until: { type: ["string", "null"], description: "תאריך YYYY-MM-DD אם קיים" }
    },
    required: ["teacher_name", "day_of_week", "start_time", "end_time"]
  }
};

export default function useScheduleImport(teachers) {
  const [state, setState] = useState({ status: "idle", rows: [], unmatched: [], error: "", imported: 0 });

  const analyze = async file => {
    setState({ status: "analyzing", rows: [], unmatched: [], error: "", imported: 0 });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: extractionSchema });
      if (result.status !== "success") throw new Error(result.details || "לא ניתן לקרוא את הקובץ");
      const source = Array.isArray(result.output) ? result.output : [];
      const byName = new Map(teachers.map(teacher => [clean(teacher.full_name).toLowerCase(), teacher]));
      const unmatched = new Set();
      const rows = source.flatMap(item => {
        const teacher = byName.get(clean(item.teacher_name).toLowerCase());
        if (!teacher) { if (item.teacher_name) unmatched.add(clean(item.teacher_name)); return []; }
        const day = dayNumber(item.day_of_week), start = timeValue(item.start_time), end = timeValue(item.end_time);
        if (day === undefined || !start || !end) return [];
        return [{ teacher_id: teacher.id, teacher_name: teacher.full_name, day_of_week: day, start_time: start, end_time: end, lesson_number: item.lesson_number || undefined, class_name: item.class_name || undefined, division: item.division === "middle" || item.division === "high" ? item.division : teacher.division, valid_from: item.valid_from || undefined, valid_until: item.valid_until || undefined, is_active: true }];
      });
      setState({ status: "preview", rows, unmatched: [...unmatched], error: "", imported: 0 });
    } catch (error) {
      setState({ status: "idle", rows: [], unmatched: [], error: error.message || "הייבוא נכשל", imported: 0 });
    }
  };

  const importRows = async () => {
    setState(current => ({ ...current, status: "importing", error: "" }));
    try {
      const teacherIds = [...new Set(state.rows.map(row => row.teacher_id))];
      await Promise.all(teacherIds.map(teacher_id => base44.entities.WeeklySchedule.deleteMany({ teacher_id })));
      for (let index = 0; index < state.rows.length; index += 500) await base44.entities.WeeklySchedule.bulkCreate(state.rows.slice(index, index + 500));
      setState(current => ({ ...current, status: "done", imported: current.rows.length }));
    } catch (error) {
      setState(current => ({ ...current, status: "preview", error: error.message || "שמירת המערכות נכשלה" }));
    }
  };

  return { ...state, analyze, importRows };
}