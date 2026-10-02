import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BharatAI",
  description: "Multilingual Indian AI assistant platform.",
  openGraph: {
    title: "BharatAI",
    description: "Multilingual Indian AI assistant platform.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0D10",
};

// Runs before paint so the saved theme never flashes. Dark is the default.
const themeInit = `(function(){try{var p=localStorage.getItem('bharatai-theme')||'dark';var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
