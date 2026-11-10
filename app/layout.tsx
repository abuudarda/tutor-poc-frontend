import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Socratica — Multimodal AI Tutor Studio',
  description:
    'Interactive multimodal AI tutor workspace featuring pedagogical configuration, live Web Speech synthesis and recognition, interactive concept modules, understanding checkpoints, and a real-time JSON contract inspector.',
  openGraph: {
    title: 'Socratica — Multimodal AI Tutor Studio',
    description:
      'Interactive multimodal AI tutor workspace featuring pedagogical configuration, live Web Speech synthesis and recognition, interactive concept modules, understanding checkpoints, and a real-time JSON contract inspector.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Socratica — Multimodal AI Tutor Studio',
    description:
      'Interactive multimodal AI tutor workspace featuring pedagogical configuration, live Web Speech synthesis and recognition, interactive concept modules, understanding checkpoints, and a real-time JSON contract inspector.',
  },
};

const fontVariables = {
  '--font-bricolage': '"Bricolage Grotesque", sans-serif',
  '--font-plus-jakarta': '"Plus Jakarta Sans", sans-serif',
  '--font-jetbrains-mono': '"JetBrains Mono", monospace',
} as React.CSSProperties;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={fontVariables} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#F7F6F2] text-zinc-900 dark:bg-[#111110] dark:text-stone-100 antialiased selection:bg-[#D95D39]/20 selection:text-[#D95D39] dark:selection:text-[#E87A5A]"
        suppressHydrationWarning
      >
        {children}
        <div
          id="copyright-signature"
          aria-label="Copyright ABU Darda"
          className="fixed bottom-1.5 right-3 z-40 pointer-events-none select-none text-[10px] font-mono tracking-wider text-stone-400/80 dark:text-zinc-600"
        >
          © ABU Darda
        </div>
      </body>
    </html>
  );
}