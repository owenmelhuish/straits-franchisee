"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Shield, History, ArrowLeftRight, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardNavProps {
  userName: string;
  isAdmin: boolean;
}

export function DashboardNav({ userName, isAdmin }: DashboardNavProps) {
  const router = useRouter();

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
    <nav className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Creative Builder
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <LayoutDashboard className="h-4 w-4" />
          Templates
        </Link>
        <Link
          href="/dashboard/history"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <History className="h-4 w-4" />
          History
        </Link>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {isAdmin ? "Admin" : "Franchisee"}
        </span>
        <span className="text-sm text-muted-foreground">{userName}</span>
        <Button variant="ghost" size="sm" onClick={handleSwitchRole}>
          <ArrowLeftRight className="mr-1.5 h-4 w-4" />
          Switch to {isAdmin ? "Franchisee" : "Admin"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </nav>
  );
}
