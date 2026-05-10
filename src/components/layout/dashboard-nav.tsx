"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Shield, History, ArrowLeftRight, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/locale-toggle";
import { useT } from "@/lib/i18n/client";

interface DashboardNavProps {
  userName: string;
  isAdmin: boolean;
}

export function DashboardNav({ userName, isAdmin }: DashboardNavProps) {
  const router = useRouter();
  const t = useT();

  function handleSwitchRole() {
    const newRole = isAdmin ? "franchisee" : "admin";
    document.cookie = `dev-role=${newRole};path=/;max-age=${60 * 60 * 24 * 30}`;
    router.push(newRole === "admin" ? "/dashboard" : "/dashboard");
    router.refresh();
  }

  function handleLogout() {
    document.cookie = "dev-role=;path=/;max-age=0";
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="mx-4 mt-4 flex h-12 items-center justify-between rounded-2xl bg-white px-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-5">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-[#1A1A1A]">
          {t.brand}
        </Link>
        <div className="h-4 w-px bg-[#E0E0E0]" />
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[13px] text-[#666666] transition-colors hover:text-[#1A1A1A]"
        >
          <LayoutDashboard className="h-4 w-4" />
          {t.nav.templates}
        </Link>
        <Link
          href="/dashboard/history"
          className="flex items-center gap-1.5 text-[13px] text-[#666666] transition-colors hover:text-[#1A1A1A]"
        >
          <History className="h-4 w-4" />
          {t.nav.history}
        </Link>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-1.5 text-[13px] text-[#666666] transition-colors hover:text-[#1A1A1A]"
        >
          <BarChart3 className="h-4 w-4" />
          {t.nav.analytics}
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 text-[13px] text-[#666666] transition-colors hover:text-[#1A1A1A]"
        >
          <Settings className="h-4 w-4" />
          {t.nav.settings}
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-[13px] text-[#666666] transition-colors hover:text-[#1A1A1A]"
          >
            <Shield className="h-4 w-4" />
            {t.nav.admin}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <LocaleToggle />
        <span className="rounded-full bg-[#F4F4F4] px-2.5 py-1 text-[11px] font-medium text-[#666666]">
          {isAdmin ? t.roles.admin : t.roles.franchisee}
        </span>
        <span className="text-[13px] text-[#666666]">{userName}</span>
        <Button variant="ghost" size="sm" onClick={handleSwitchRole} className="text-[13px] text-[#666666] hover:text-[#1A1A1A]">
          <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
          {t.nav.switch}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[13px] text-[#666666] hover:text-[#1A1A1A]">
          <LogOut className="mr-1 h-3.5 w-3.5" />
          {t.nav.signOut}
        </Button>
      </div>
    </nav>
  );
}
