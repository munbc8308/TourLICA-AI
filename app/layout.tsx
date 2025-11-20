import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'TourLICA AI | Responsive Travel Intelligence',
  description:
    'Bootstrap for a responsive travel-planning platform that targets both mobile and desktop experiences.',
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
