"use client";

import { useRouter } from "next/navigation";
import { Shield, User } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { useT } from "@/lib/i18n/client";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();

  function selectRole(role: "admin" | "franchisee") {
    document.cookie = `dev-role=${role};path=/;max-age=${60 * 60 * 24 * 30}`;
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative">
      <div className="absolute -top-12 right-0">
        <LocaleToggle variant="floating" />
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
        <h1 className="mb-1 text-[16px] font-semibold text-[#1A1A1A]">{t.brand}</h1>
        <p className="mb-6 text-[13px] text-[#666666]">{t.login.selectRole}</p>

        <div className="space-y-3">
          <button
            className="flex w-full items-center gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-4 py-4 text-left transition-all hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
            onClick={() => selectRole("admin")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F4F4]">
              <Shield className="h-5 w-5 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#1A1A1A]">{t.roles.admin}</div>
              <div className="text-[13px] text-[#666666]">{t.login.adminDesc}</div>
            </div>
          </button>

          <button
            className="flex w-full items-center gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-4 py-4 text-left transition-all hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
            onClick={() => selectRole("franchisee")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F4F4]">
              <User className="h-5 w-5 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#1A1A1A]">{t.roles.franchisee}</div>
              <div className="text-[13px] text-[#666666]">{t.login.franchiseeDesc}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
