"use client";

import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useLocale } from "@/lib/i18n/client";

interface SubmissionRowProps {
  submission: {
    id: string;
    format_name: string;
    file_url: string;
    created_at: string;
    meta_ad_id?: string | null;
    meta_status?: string | null;
    templates: { name: string; slug: string } | null;
  };
}

const META_STATUS_STYLES: Record<string, string> = {
  PAUSED: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export function SubmissionRow({ submission }: SubmissionRowProps) {
  const t = useT();
  const locale = useLocale();
  const date = new Date(submission.created_at);
  const dateLocale = locale === "fr" ? "fr-CA" : "en-US";

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3.5 shadow-[0px_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-[#1A1A1A]">
              {submission.templates?.name ?? t.submissionRow.deletedTemplate}
            </p>
            {submission.meta_status && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  META_STATUS_STYLES[submission.meta_status] ??
                  "bg-gray-100 text-gray-500"
                }`}
              >
                {t.submissionRow.metaPrefix}: {submission.meta_status}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#666666]">
            {submission.format_name} &middot;{" "}
            {date.toLocaleDateString(dateLocale)}{" "}
            {date.toLocaleTimeString(dateLocale, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {submission.meta_ad_id && (
          <a
            href={`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${submission.meta_ad_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              {t.submissionRow.adsManager}
            </Button>
          </a>
        )}
        <a
          href={submission.file_url}
          download
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t.submissionRow.download}
          </Button>
        </a>
      </div>
    </div>
  );
}
