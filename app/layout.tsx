import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BharatAI — Indian AI Assistant",
  description: "A multilingual AI assistant platform with grounded knowledge, tools and streaming conversations.",
  themeColor: "#0B0D10",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
