import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

const DAY_MAP = { "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3, "חמישי": 4 };

const LESSON_TIMES = {
  0: ["07:30", "08:15"], 1: ["08:15", "09:00"], 2: ["09:00", "09:45"], 3: ["10:00", "10:45"],
  4: ["11:00", "11:45"], 5: ["11:50", "12:35"], 6: ["13:00", "13:45"], 7: ["13:50", "14:35"],
  8: ["14:40", "15:25"], 9: ["15:30", "16:15"], 10: ["16:20", "17:05"], 11: ["17:10", "17:55"]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    const workbook = XLSX.read(new Uint8Array(await fileResponse.arrayBuffer()), { type: 'array' });

    const lessons = [];
    const teacherNames = new Set();
    const nameRegex = /מערכת\s+שעות\s+למורה\s+[-–:]?\s*(.+)/;

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
      let currentTeacher = null;
      let dayColumns = {}; // column index -> day_of_week

      for (const row of rows) {
        const first = String(row[0] ?? '').trim();
        const nameMatch = row.map(cell => String(cell ?? '').match(nameRegex)).find(Boolean);
        if (nameMatch) {
          currentTeacher = nameMatch[1].trim();
          teacherNames.add(currentTeacher);
          dayColumns = {};
          continue;
        }
        // header row mapping columns to days
        if (row.some(cell => DAY_MAP[String(cell ?? '').trim()] !== undefined)) {
          dayColumns = {};
          row.forEach((cell, index) => {
            const day = DAY_MAP[String(cell ?? '').trim()];
            if (day !== undefined) dayColumns[index] = day;
          });
          continue;
        }
        // lesson row: first cell is the lesson number
        if (currentTeacher && /^\d{1,2}$/.test(first) && Object.keys(dayColumns).length) {
          const lessonNumber = Number(first);
          const times = LESSON_TIMES[lessonNumber];
          if (!times) continue;
          for (const [index, day] of Object.entries(dayColumns)) {
            if (![0, 1, 2, 3, 4].includes(day)) continue;
            const content = String(row[index] ?? '').trim();
            if (!content) continue;
            lessons.push({
              teacher_name: currentTeacher,
              day_of_week: day,
              lesson_number: lessonNumber,
              start_time: times[0],
              end_time: times[1],
              class_name: content.split('\n')[0].trim()
            });
          }
        }
      }
    }

    return Response.json({ lessons, teacher_names: [...teacherNames] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});