const PALETTE = [
  "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900",
  "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900",
  "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900",
  "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900",
  "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900",
  "bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900",
  "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:border-fuchsia-900",
  "bg-lime-50 border-lime-200 dark:bg-lime-950/40 dark:border-lime-900",
  "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900",
  "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900"
];

export function teacherColor(id) {
  let hash = 0;
  for (const ch of String(id || "")) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}