import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BharatAI',
  description: 'Production-grade, multilingual Indian AI platform with reliable RAG and tool calling.',
  openGraph: {
    title: 'BharatAI',
    description: 'Production-grade, multilingual Indian AI platform with reliable RAG and tool calling.',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html>
      <body suppressHydrationWarning className="bg-slate-50">{children}</body>
    </html>
  );
}
