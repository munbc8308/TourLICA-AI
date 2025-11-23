'use client';

import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import { useEffect, useState, createContext, useContext } from 'react';
import { getLocaleFromCountry, defaultLocale, Locale } from '@/lib/i18n';

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;
}

const I18nContext = createContext<I18nContextType>({
    locale: defaultLocale,
    setLocale: async () => { }
});

export const useI18n = () => useContext(I18nContext);

export default function I18nProvider({ children, messages: initialMessages }: { children: React.ReactNode, messages: AbstractIntlMessages }) {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale);
    const [messages, setMessages] = useState<AbstractIntlMessages>(initialMessages);

    const changeLocale = async (newLocale: Locale) => {
        if (newLocale === locale) return;

        try {
            const res = await fetch(`/api/messages?locale=${newLocale}`);
            if (res.ok) {
                const msgs = await res.json();
                setLocaleState(newLocale);
                setMessages(msgs);

                // Persist to sessionStorage
                if (typeof window !== 'undefined') {
                    const stored = window.sessionStorage.getItem('tourlica.account');
                    let account = {};
                    if (stored) {
                        try {
                            account = JSON.parse(stored);
                        } catch { }
                    }
                    // We might want to update the account country if we were strictly following that, 
                    // but for now let's just use a separate key for explicit language preference if needed,
                    // or assume this overrides until reload. 
                    // Actually, let's update a specific preference key.
                    window.sessionStorage.setItem('tourlica.locale', newLocale);
                }
            }
        } catch (error) {
            console.error('Failed to switch locale', error);
        }
    };

    useEffect(() => {
        async function init() {
            if (typeof window !== 'undefined') {
                // Check for explicit preference first
                const explicitLocale = window.sessionStorage.getItem('tourlica.locale') as Locale;
                if (explicitLocale && ['ko', 'en', 'zh', 'ja'].includes(explicitLocale)) {
                    if (explicitLocale !== defaultLocale) {
                        await changeLocale(explicitLocale);
                    }
                    return;
                }

                const stored = window.sessionStorage.getItem('tourlica.account');
                if (stored) {
                    try {
                        const account = JSON.parse(stored);
                        const currentLocale = getLocaleFromCountry(account.country);
                        if (currentLocale !== defaultLocale) {
                            await changeLocale(currentLocale);
                        }
                    } catch {
                        // ignore
                    }
                }
            }
        }

        init();
    }, []);

    return (
        <I18nContext.Provider value={{ locale, setLocale: changeLocale }}>
            <NextIntlClientProvider
                locale={locale}
                messages={messages}
                timeZone="Asia/Seoul"
            >
                {children}
            </NextIntlClientProvider>
        </I18nContext.Provider>
    );
}
