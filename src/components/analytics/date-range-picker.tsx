"use client";

import { useT } from "@/lib/i18n/client";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
}: DateRangePickerProps) {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">{t.analytics.dateFrom}</label>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onChange(e.target.value, dateTo)}
        className="rounded-md border px-2 py-1 text-sm"
      />
      <label className="text-sm text-muted-foreground">{t.analytics.dateTo}</label>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onChange(dateFrom, e.target.value)}
        className="rounded-md border px-2 py-1 text-sm"
      />
    </div>
  );
}
