"use client";

import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const date = new Date(submission.created_at);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-5 py-3">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {submission.templates?.name ?? "Deleted template"}
            </p>
            {submission.meta_status && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  META_STATUS_STYLES[submission.meta_status] ??
                  "bg-gray-100 text-gray-500"
                }`}
              >
                Meta: {submission.meta_status}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {submission.format_name} &middot;{" "}
            {date.toLocaleDateString()}{" "}
            {date.toLocaleTimeString([], {
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
              Ads Manager
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
            Download
          </Button>
        </a>
      </div>
    </div>
  );
}
