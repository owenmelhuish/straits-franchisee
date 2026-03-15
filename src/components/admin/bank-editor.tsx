"use client";

import { useState } from "react";
import { AssetBank, AssetBankItem } from "@/types/template";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BankEditorProps {
  banks: AssetBank[];
  onBanksChange: (banks: AssetBank[]) => void;
}

export function BankEditor({ banks, onBanksChange }: BankEditorProps) {
  const [newBankName, setNewBankName] = useState("");
  const [newBankType, setNewBankType] = useState<"image" | "text">("image");

  function addBank() {
    if (!newBankName.trim()) return;
    onBanksChange([
      ...banks,
      { name: newBankName.trim(), type: newBankType, items: [] },
    ]);
    setNewBankName("");
  }

  function removeBank(index: number) {
    onBanksChange(banks.filter((_, i) => i !== index));
  }

  function updateBankItems(bankIndex: number, items: AssetBankItem[]) {
    const updated = [...banks];
    updated[bankIndex] = { ...updated[bankIndex], items };
    onBanksChange(updated);
  }

  function addItem(bankIndex: number) {
    const bank = banks[bankIndex];
    const newItem: AssetBankItem = {
      id: `item-${Date.now()}`,
      label: "",
      value: "",
    };
    updateBankItems(bankIndex, [...bank.items, newItem]);
  }

  function updateItem(
    bankIndex: number,
    itemIndex: number,
    updates: Partial<AssetBankItem>
  ) {
    const bank = banks[bankIndex];
    const items = [...bank.items];
    items[itemIndex] = { ...items[itemIndex], ...updates };
    updateBankItems(bankIndex, items);
  }

  function removeItem(bankIndex: number, itemIndex: number) {
    const bank = banks[bankIndex];
    updateBankItems(
      bankIndex,
      bank.items.filter((_, i) => i !== itemIndex)
    );
  }

  async function handleImageUpload(
    bankIndex: number,
    itemIndex: number,
    file: File
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "templates");
    formData.append(
      "path",
      `banks/${banks[bankIndex].name}/${file.name}`
    );

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      updateItem(bankIndex, itemIndex, { value: url });
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Asset Banks
      </h3>

      {banks.map((bank, bi) => (
        <div key={bi} className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{bank.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">({bank.type})</span>
            </div>
            <button onClick={() => removeBank(bi)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {bank.items.map((item, ii) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(bi, ii, { label: e.target.value })}
                  placeholder="Label"
                  className="w-28 rounded border px-2 py-1 text-xs"
                />
                {bank.type === "image" ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => updateItem(bi, ii, { value: e.target.value })}
                      placeholder="Image URL"
                      className="flex-1 rounded border px-2 py-1 text-xs"
                    />
                    <label className="cursor-pointer rounded border p-1 hover:bg-accent">
                      <Upload className="h-3 w-3" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(bi, ii, f);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => updateItem(bi, ii, { value: e.target.value })}
                    placeholder="Text value"
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  />
                )}
                <button
                  onClick={() => removeItem(bi, ii)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addItem(bi)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add item
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newBankName}
          onChange={(e) => setNewBankName(e.target.value)}
          placeholder="Bank name"
          className="flex-1 rounded border px-2 py-1.5 text-sm"
        />
        <select
          value={newBankType}
          onChange={(e) => setNewBankType(e.target.value as "image" | "text")}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="image">Image</option>
          <option value="text">Text</option>
        </select>
        <Button size="sm" onClick={addBank} disabled={!newBankName.trim()}>
          <Plus className="mr-1 h-3 w-3" /> Add Bank
        </Button>
      </div>
    </div>
  );
}
