"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Shield, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface DashboardNavProps {
  userName: string;
  isAdmin: boolean;
}

export function DashboardNav({ userName, isAdmin }: DashboardNavProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
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
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </nav>
  );
}
