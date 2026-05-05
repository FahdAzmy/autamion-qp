import type { LocalStatusCode } from "@/lib/status";

const statusClasses: Record<LocalStatusCode, string> = {
  0: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  1: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
  2: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  3: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  4: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  5: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200",
  6: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
};

export function StatusBadge({ code, label }: { code: LocalStatusCode; label: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${
        statusClasses[code] ?? statusClasses[0]
      }`}
    >
      {label}
    </span>
  );
}
