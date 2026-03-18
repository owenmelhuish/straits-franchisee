"use client";

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
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">From</label>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onChange(e.target.value, dateTo)}
        className="rounded-md border px-2 py-1 text-sm"
      />
      <label className="text-sm text-muted-foreground">To</label>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onChange(dateFrom, e.target.value)}
        className="rounded-md border px-2 py-1 text-sm"
      />
    </div>
  );
}
