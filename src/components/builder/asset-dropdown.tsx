"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AssetBank } from "@/types/template";

interface AssetDropdownProps {
  bank: AssetBank;
  value: string;
  onChange: (value: string) => void;
}

export function AssetDropdown({ bank, value, onChange }: AssetDropdownProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium capitalize text-[#A5A5A5]">
        {bank.name}
      </Label>
      <Select value={value} onValueChange={(val) => { if (val) onChange(val); }}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {bank.items.map((item) => (
            <SelectItem key={item.id} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
