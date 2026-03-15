"use client";

import { useState } from "react";
import { X, CalendarDays, DollarSign, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export interface CampaignData {
  campaignStart: string;
  campaignEnd: string;
  budget: number;
}

interface LaunchModalProps {
  templateName: string;
  formatName: string;
  formatSize: string;
  selections: Record<string, string>;
  assetBanks: { name: string; type: string }[];
  layers: { id: string; name: string; linkedBank?: string }[];
  isPublishing?: boolean;
  onPublish: (campaign: CampaignData) => void;
  onClose: () => void;
}

export function LaunchModal({
  templateName,
  formatName,
  formatSize,
  selections,
  assetBanks,
  layers,
  isPublishing = false,
  onPublish,
  onClose,
}: LaunchModalProps) {
  const [step, setStep] = useState<"campaign" | "review">("campaign");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [budget, setBudget] = useState(250);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Build ad content rows from selections
  const adContentRows = layers
    .filter((l) => l.linkedBank && selections[l.id])
    .map((l) => {
      const bank = assetBanks.find((b) => b.name === l.linkedBank);
      const value = selections[l.id];
      // For images, show just the filename
      const displayValue =
        bank?.type === "image"
          ? decodeURIComponent(value.split("/").pop() || value)
              .replace(/[-_]\d+\.png$/, "")
              .replace(/[-_]/g, " ")
          : value;
      return {
        label: l.name,
        value: displayValue,
        isImage: bank?.type === "image",
        imageSrc: bank?.type === "image" ? value : undefined,
      };
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {step === "campaign" ? (
          <CampaignStep
            startDate={startDate}
            endDate={endDate}
            budget={budget}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onBudgetChange={setBudget}
            onNext={() => setStep("review")}
            onClose={onClose}
          />
        ) : (
          <ReviewStep
            templateName={templateName}
            formatName={formatName}
            formatSize={formatSize}
            adContentRows={adContentRows}
            startDate={formatDateDisplay(startDate)}
            endDate={formatDateDisplay(endDate)}
            budget={budget}
            isPublishing={isPublishing}
            onBack={() => setStep("campaign")}
            onPublish={() =>
              onPublish({
                campaignStart: startDate,
                campaignEnd: endDate,
                budget,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

/* ── Step 1: Campaign Settings ── */

function CampaignStep({
  startDate,
  endDate,
  budget,
  onStartDateChange,
  onEndDateChange,
  onBudgetChange,
  onNext,
  onClose,
}: {
  startDate: string;
  endDate: string;
  budget: number;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onBudgetChange: (v: number) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const dateError =
    startDate && endDate && endDate < startDate
      ? "End date must be on or after start date"
      : null;
  const budgetError = budget <= 0 ? "Budget must be greater than $0" : null;
  const hasErrors = !!dateError || !!budgetError;

  return (
    <div className="p-6">
      <h2 className="mb-6 text-xl font-bold">Campaign Settings</h2>

      {/* Flight Dates */}
      <div className="mb-6">
        <label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Flight Dates
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        {dateError && (
          <p className="mt-1.5 text-xs text-red-500">{dateError}</p>
        )}
      </div>

      {/* Budget */}
      <div className="mb-8">
        <label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Budget
        </label>
        <div className="mb-2 text-2xl font-bold">${budget}</div>
        <Slider
          value={budget}
          onValueChange={(v: number | readonly number[]) =>
            onBudgetChange(typeof v === "number" ? v : v[0])
          }
          min={0}
          max={1000}
          step={10}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>$0</span>
          <span>$1,000</span>
        </div>
        {budgetError && (
          <p className="mt-1.5 text-xs text-red-500">{budgetError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
        <Button onClick={onNext} className="w-full" disabled={hasErrors}>
          Review
        </Button>
      </div>
    </div>
  );
}

/* ── Step 2: Review & Publish ── */

function ReviewStep({
  templateName,
  formatName,
  formatSize,
  adContentRows,
  startDate,
  endDate,
  budget,
  isPublishing,
  onBack,
  onPublish,
}: {
  templateName: string;
  formatName: string;
  formatSize: string;
  adContentRows: {
    label: string;
    value: string;
    isImage: boolean;
    imageSrc?: string;
  }[];
  startDate: string;
  endDate: string;
  budget: number;
  isPublishing: boolean;
  onBack: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="mb-6 text-xl font-bold">Review & Publish</h2>

      {/* Ad Content */}
      <h3 className="mb-2 text-sm font-semibold">Ad Content</h3>
      <div className="mb-6 rounded-lg bg-[#F8F7F7] p-4">
        <div className="space-y-3">
          {adContentRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="flex items-center gap-2 text-right font-medium">
                {row.isImage && row.imageSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.imageSrc}
                    alt=""
                    className="h-5 w-5 rounded object-cover"
                  />
                )}
                <span className="max-w-[200px] truncate">{row.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Details */}
      <h3 className="mb-2 text-sm font-semibold">Campaign Details</h3>
      <div className="mb-6 rounded-lg bg-[#F8F7F7] p-4">
        <div className="space-y-3">
          <DetailRow label="Template" value={templateName} />
          <DetailRow label="Format" value={formatName} />
          <DetailRow label="Size" value={formatSize} />
          <DetailRow label="Budget" value={`$${budget}`} />
          <DetailRow label="Dates" value={`${startDate} – ${endDate}`} />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onBack} className="w-full">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onPublish}
          className="w-full"
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish"
          )}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
