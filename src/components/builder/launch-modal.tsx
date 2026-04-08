"use client";

import { useState, useEffect } from "react";
import {
  X,
  CalendarDays,
  DollarSign,
  ChevronLeft,
  Loader2,
  Type,
  Link2,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// ── Meta CTA options ──

const META_CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "SHOP_NOW", label: "Shop Now" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "BOOK_NOW", label: "Book Now" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "GET_OFFER", label: "Get Offer" },
  { value: "GET_QUOTE", label: "Get Quote" },
  { value: "ORDER_NOW", label: "Order Now" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "APPLY_NOW", label: "Apply Now" },
  { value: "WATCH_MORE", label: "Watch More" },
  { value: "SEND_MESSAGE", label: "Send Message" },
  { value: "CALL_NOW", label: "Call Now" },
  { value: "GET_DIRECTIONS", label: "Get Directions" },
  { value: "NO_BUTTON", label: "No Button" },
] as const;

// ── Types ──

export interface CampaignData {
  campaignStart: string;
  campaignEnd: string;
  budget: number;
  publishToMeta?: boolean;
  headline: string;
  caption: string;
  linkUrl: string;
  callToAction: string;
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

type Step = "campaign" | "ad-details" | "review";

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
  const [step, setStep] = useState<Step>("campaign");

  // Campaign settings
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [budget, setBudget] = useState(250);

  // Meta toggle
  const [publishToMeta, setPublishToMeta] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);

  // Ad details
  const [headline, setHeadline] = useState(templateName);
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");

  useEffect(() => {
    fetch("/api/meta/status")
      .then((r) => r.json())
      .then((d) => setMetaConnected(d.connected))
      .catch(() => {});
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const adContentRows = layers
    .filter((l) => l.linkedBank && selections[l.id])
    .map((l) => {
      const bank = assetBanks.find((b) => b.name === l.linkedBank);
      const value = selections[l.id];
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

  const handlePublish = () =>
    onPublish({
      campaignStart: startDate,
      campaignEnd: endDate,
      budget,
      publishToMeta,
      headline,
      caption,
      linkUrl,
      callToAction,
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-3xl bg-white shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 text-[#A5A5A5] transition-colors hover:text-[#1A1A1A]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-6 pt-6 pb-2">
          {(["campaign", "ad-details", "review"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ["campaign", "ad-details", "review"].indexOf(step)
                  ? "bg-[#1A1A1A]"
                  : "bg-[#E0E0E0]"
              }`}
            />
          ))}
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {step === "campaign" && (
            <CampaignStep
              startDate={startDate}
              endDate={endDate}
              budget={budget}
              publishToMeta={publishToMeta}
              metaConnected={metaConnected}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onBudgetChange={setBudget}
              onPublishToMetaChange={setPublishToMeta}
              onNext={() => setStep("ad-details")}
              onClose={onClose}
            />
          )}

          {step === "ad-details" && (
            <AdDetailsStep
              headline={headline}
              caption={caption}
              linkUrl={linkUrl}
              callToAction={callToAction}
              onHeadlineChange={setHeadline}
              onCaptionChange={setCaption}
              onLinkUrlChange={setLinkUrl}
              onCallToActionChange={setCallToAction}
              onBack={() => setStep("campaign")}
              onNext={() => setStep("review")}
            />
          )}

          {step === "review" && (
            <ReviewStep
              templateName={templateName}
              formatName={formatName}
              formatSize={formatSize}
              adContentRows={adContentRows}
              startDate={formatDateDisplay(startDate)}
              endDate={formatDateDisplay(endDate)}
              budget={budget}
              headline={headline}
              caption={caption}
              linkUrl={linkUrl}
              callToAction={callToAction}
              publishToMeta={publishToMeta}
              isPublishing={isPublishing}
              onBack={() => setStep("ad-details")}
              onPublish={handlePublish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Campaign Settings ── */

function CampaignStep({
  startDate,
  endDate,
  budget,
  publishToMeta,
  metaConnected,
  onStartDateChange,
  onEndDateChange,
  onBudgetChange,
  onPublishToMetaChange,
  onNext,
  onClose,
}: {
  startDate: string;
  endDate: string;
  budget: number;
  publishToMeta: boolean;
  metaConnected: boolean;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onBudgetChange: (v: number) => void;
  onPublishToMetaChange: (v: boolean) => void;
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
      <h2 className="mb-1 text-xl font-bold">Campaign Settings</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Set your budget, schedule, and publishing destination.
      </p>

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
      <div className="mb-6">
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

      {/* Publish to Meta Toggle */}
      <div className="mb-8 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Publish to Meta Ads</p>
            <p className="text-xs text-muted-foreground">
              {metaConnected
                ? "Create a paused ad in your Meta Ad Account"
                : "Connect your Meta account in Settings first"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={publishToMeta}
            disabled={!metaConnected}
            onClick={() => onPublishToMetaChange(!publishToMeta)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              publishToMeta ? "bg-primary" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                publishToMeta ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {!metaConnected && (
          <a
            href="/dashboard/settings"
            className="mt-2 inline-block text-xs text-primary underline"
          >
            Go to Settings
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
        <Button onClick={onNext} className="w-full" disabled={hasErrors}>
          Next
        </Button>
      </div>
    </div>
  );
}

/* ── Step 2: Ad Details ── */

function AdDetailsStep({
  headline,
  caption,
  linkUrl,
  callToAction,
  onHeadlineChange,
  onCaptionChange,
  onLinkUrlChange,
  onCallToActionChange,
  onBack,
  onNext,
}: {
  headline: string;
  caption: string;
  linkUrl: string;
  callToAction: string;
  onHeadlineChange: (v: string) => void;
  onCaptionChange: (v: string) => void;
  onLinkUrlChange: (v: string) => void;
  onCallToActionChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="mb-1 text-xl font-bold">Ad Details</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Add the copy and link for your ad.
      </p>

      {/* Headline */}
      <div className="mb-5">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Type className="h-4 w-4 text-muted-foreground" />
          Headline
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="Your ad headline"
          maxLength={40}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {headline.length}/40
        </p>
      </div>

      {/* Caption / Primary Text */}
      <div className="mb-5">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Type className="h-4 w-4 text-muted-foreground" />
          Caption
        </label>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Write your ad caption..."
          maxLength={2200}
          rows={4}
          className="w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {caption.length}/2,200
        </p>
      </div>

      {/* Link URL */}
      <div className="mb-5">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Destination URL
        </label>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => onLinkUrlChange(e.target.value)}
          placeholder="https://your-website.com/landing-page"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Call to Action */}
      <div className="mb-8">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          Call to Action
        </label>
        <select
          value={callToAction}
          onChange={(e) => onCallToActionChange(e.target.value)}
          className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          {META_CTA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onBack} className="w-full">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="w-full">
          Review
        </Button>
      </div>
    </div>
  );
}

/* ── Step 3: Review & Publish ── */

function ReviewStep({
  templateName,
  formatName,
  formatSize,
  adContentRows,
  startDate,
  endDate,
  budget,
  headline,
  caption,
  linkUrl,
  callToAction,
  publishToMeta,
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
  headline: string;
  caption: string;
  linkUrl: string;
  callToAction: string;
  publishToMeta: boolean;
  isPublishing: boolean;
  onBack: () => void;
  onPublish: () => void;
}) {
  const ctaLabel =
    META_CTA_OPTIONS.find((o) => o.value === callToAction)?.label ??
    callToAction;

  return (
    <div className="p-6">
      <h2 className="mb-6 text-xl font-bold">Review & Publish</h2>

      {/* Creative Content */}
      {adContentRows.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-semibold">Creative</h3>
          <div className="mb-5 rounded-lg bg-[#F4F4F4] p-4">
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
        </>
      )}

      {/* Ad Copy */}
      <h3 className="mb-2 text-sm font-semibold">Ad Copy</h3>
      <div className="mb-5 rounded-lg bg-[#F4F4F4] p-4">
        <div className="space-y-3">
          <DetailRow label="Headline" value={headline || "—"} />
          {caption && (
            <div className="text-sm">
              <span className="text-muted-foreground">Caption</span>
              <p className="mt-1 font-medium leading-relaxed">
                {caption.length > 120
                  ? caption.slice(0, 120) + "..."
                  : caption}
              </p>
            </div>
          )}
          <DetailRow label="CTA Button" value={ctaLabel} />
          <DetailRow label="Link" value={linkUrl || "—"} />
        </div>
      </div>

      {/* Campaign Details */}
      <h3 className="mb-2 text-sm font-semibold">Campaign</h3>
      <div className="mb-6 rounded-lg bg-[#F4F4F4] p-4">
        <div className="space-y-3">
          <DetailRow label="Template" value={templateName} />
          <DetailRow label="Format" value={`${formatName} (${formatSize})`} />
          <DetailRow label="Budget" value={`$${budget}`} />
          <DetailRow label="Dates" value={`${startDate} – ${endDate}`} />
          {publishToMeta && (
            <DetailRow label="Destination" value="Meta Ads (paused)" />
          )}
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
      <span className="max-w-[220px] truncate font-medium">{value}</span>
    </div>
  );
}
