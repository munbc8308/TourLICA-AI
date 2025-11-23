import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'TourLICA AI | Responsive Travel Intelligence',
  description:
    'Bootstrap for a responsive travel-planning platform that targets both mobile and desktop experiences.',
  icons: {
    icon: '/favicon.svg'
  }
};

import I18nProvider from '@/components/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import { loadMessages } from '@/lib/i18n';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const messages = await loadMessages('en');

  return (
    <html lang="en">
      <body>
        <I18nProvider messages={messages}>
          <LanguageSwitcher />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
