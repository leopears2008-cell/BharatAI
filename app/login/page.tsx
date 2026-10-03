"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : data?.error?.message;
        throw new Error(msg || "Sign-in failed. Please try again.");
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))]">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <Sparkles size={26} className="text-accent" aria-hidden />
          </div>
          <h1 className="brand-gradient mt-5 text-3xl font-medium">Welcome to BharatAI</h1>
          <p className="mt-2 text-sm text-muted">Sign in to continue</p>
        </div>

        <form className="space-y-4 rounded-3xl bg-surface p-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-2 block h-12 w-full rounded-full border border-line bg-background px-5 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-danger/40 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <>Continue <ArrowRight size={18} aria-hidden /></>}
            <span className="sr-only">{loading ? "Signing in" : ""}</span>
          </button>

          <p className="pt-1 text-center text-xs text-muted">
            Demo mode: no password is required, and any email creates an account or signs in.
          </p>
        </form>
      </div>
    </div>
  );
}
