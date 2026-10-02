"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html><body className="bg-[#0B0D10] text-white"><main className="min-h-screen grid place-items-center p-6"><div className="text-center"><h2 className="text-2xl font-semibold">BharatAI is unavailable</h2><button className="mt-6 rounded-xl bg-white px-5 py-2.5 text-black" onClick={() => reset()}>Try again</button></div></main></body></html>;
}
