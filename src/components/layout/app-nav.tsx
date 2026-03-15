"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/database";

interface AppNavProps {
  profile: Profile;
}

export function AppNav({ profile }: AppNavProps) {
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
          Dashboard
        </Link>
        {profile.role === "admin" && (
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
        <span className="text-sm text-muted-foreground">
          {profile.full_name || profile.email}
        </span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </nav>
  );
}
