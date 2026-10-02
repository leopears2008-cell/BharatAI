"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="min-h-screen grid place-items-center bg-[var(--background)] text-[var(--foreground)] p-6"><div className="text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-2 text-[var(--muted)]">BharatAI could not complete this request.</p><button onClick={reset} className="mt-6 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-white">Try again</button></div></main>;
}
