import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'BharatAI',
  description: 'Indian multilingual LLM optimized for education and local knowledge.',
  openGraph: {
    title: 'BharatAI',
    description: 'Indian multilingual LLM optimized for education and local knowledge.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BharatAI',
    description: 'Indian multilingual LLM optimized for education and local knowledge.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
