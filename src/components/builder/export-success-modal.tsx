"use client";

import { CheckCircle, Download, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ExportSuccessModalProps {
  fileUrl: string;
  onClose: () => void;
}

export function ExportSuccessModal({ fileUrl, onClose }: ExportSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>

        <h3 className="mb-1 text-center text-lg font-semibold">Export Successful</h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Your creative has been exported and saved.
        </p>

        <div className="space-y-2">
          <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Again
            </Button>
          </a>

          <Link href="/dashboard/history">
            <Button variant="outline" className="w-full">
              <History className="mr-2 h-4 w-4" />
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
