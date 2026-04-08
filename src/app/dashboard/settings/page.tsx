"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const metaConnected = searchParams.get("meta_connected") === "true";
  const metaError = searchParams.get("meta_error");

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/meta/status");
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.connected);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    if (metaConnected) {
      setIsConnected(true);
      setLoading(false);
    } else {
      checkStatus();
    }
  }, [metaConnected]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-[16px] font-semibold text-[#1A1A1A]">Settings</h1>

      {/* Meta Connection Status */}
      {metaError && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-[14px] font-medium text-red-800">Connection failed</p>
            <p className="text-[13px] text-red-600">{metaError}</p>
          </div>
        </div>
      )}

      {metaConnected && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="text-[14px] font-medium text-green-800">
              Meta account connected successfully
            </p>
            <p className="text-[13px] text-green-600">
              You can now publish ads directly from the builder.
            </p>
          </div>
        </div>
      )}

      {/* Meta Ads Integration Card */}
      <div className="rounded-3xl bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[14px] font-medium text-[#1A1A1A]">Meta Ads</h2>
            <p className="mt-1 text-[13px] text-[#666666]">
              Connect your Meta ad account to publish creatives directly as ads.
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
              Not connected
            </span>
          )}
        </div>

        <div className="mt-6">
          {isConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your Meta ad account is connected. Ads will be created in{" "}
                <strong>PAUSED</strong> status so you can review them in Ads
                Manager before going live.
              </p>
              <div className="flex gap-3">
                <a href="/api/meta/auth">
                  <Button variant="outline" size="sm">
                    Reconnect Account
                  </Button>
                </a>
                <a
                  href="https://adsmanager.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open Ads Manager
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <a href="/api/meta/auth">
              <Button>Connect Meta Account</Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
