"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmissionRowProps {
  submission: {
    id: string;
    format_name: string;
    file_url: string;
    created_at: string;
    templates: { name: string; slug: string } | null;
  };
}

export function SubmissionRow({ submission }: SubmissionRowProps) {
  const date = new Date(submission.created_at);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-5 py-3">
      <div className="flex items-center gap-4">
        <div>
          <p className="font-medium">
            {submission.templates?.name ?? "Deleted template"}
          </p>
          <p className="text-sm text-muted-foreground">
            {submission.format_name} &middot;{" "}
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
      <a href={submission.file_url} download target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
      </a>
    </div>
  );
}
