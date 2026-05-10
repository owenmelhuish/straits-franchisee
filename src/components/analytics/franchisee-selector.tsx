"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FranchiseeBreakdown } from "@/types/analytics";
import { useT } from "@/lib/i18n/client";

interface FranchiseeSelectorProps {
  franchisees: FranchiseeBreakdown[];
  value: string;
  onChange: (value: string) => void;
}

export function FranchiseeSelector({
  franchisees,
  value,
  onChange,
}: FranchiseeSelectorProps) {
  const t = useT();
  const allLabel = t.analytics.allFranchisees;
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger>
        <SelectValue>
          {value === "all" ? allLabel : franchisees.find((f) => f.userId === value)?.name || allLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {franchisees.map((f) => (
          <SelectItem key={f.userId} value={f.userId}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
