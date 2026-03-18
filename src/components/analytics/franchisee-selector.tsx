"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FranchiseeBreakdown } from "@/types/analytics";

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
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger>
        <SelectValue>
          {value === "all" ? "All Franchisees" : franchisees.find((f) => f.userId === value)?.name || "All Franchisees"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Franchisees</SelectItem>
        {franchisees.map((f) => (
          <SelectItem key={f.userId} value={f.userId}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
