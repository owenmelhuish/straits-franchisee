"use client";

import { useRouter } from "next/navigation";
import { Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();

  function selectRole(role: "admin" | "franchisee") {
    document.cookie = `dev-role=${role};path=/;max-age=${60 * 60 * 24 * 30}`;
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold">Creative Builder</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Select a role to continue
      </p>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="flex w-full items-center justify-start gap-3 h-14 text-left"
          onClick={() => selectRole("admin")}
        >
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Admin</div>
            <div className="text-xs text-muted-foreground">Manage templates &amp; submissions</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="flex w-full items-center justify-start gap-3 h-14 text-left"
          onClick={() => selectRole("franchisee")}
        >
          <User className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Franchisee</div>
            <div className="text-xs text-muted-foreground">Build creatives from templates</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
