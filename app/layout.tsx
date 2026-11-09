import type {Metadata} from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['500', '600', '700'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Socratica — Multimodal AI Tutor Studio',
  description: 'Interactive multimodal AI tutor workspace featuring pedagogical configuration, live Web Speech synthesis and recognition, interactive concept modules, understanding checkpoints, and a real-time JSON contract inspector.',
  openGraph: {
    title: 'Socratica — Multimodal AI Tutor Studio',
    description: 'Interactive multimodal AI tutor workspace featuring pedagogical configuration, live Web Speech synthesis and recognition, interactive concept modules, understanding checkpoints, and a real-time JSON contract inspector.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Socratica — Multimodal AI Tutor Studio',
    description: 'Interactive multimodal AI tutor workspace featuring pedagogical configuration, live Web Speech synthesis and recognition, interactive concept modules, understanding checkpoints, and a real-time JSON contract inspector.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
