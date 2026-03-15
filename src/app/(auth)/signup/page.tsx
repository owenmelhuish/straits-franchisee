"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"franchisee" | "admin">("franchisee");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold">Create account</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sign up to start building creative assets
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium">
            Account type
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "franchisee" | "admin")}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="franchisee">Franchisee</option>
            <option value="admin">Corporate Admin</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
