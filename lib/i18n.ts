import { AbstractIntlMessages } from 'next-intl';

export type Locale = 'ko' | 'en' | 'zh' | 'ja';

export const defaultLocale: Locale = 'en';

export const locales: Locale[] = ['ko', 'en', 'zh', 'ja'];

export function getLocaleFromCountry(country?: string | null): Locale {
    if (!country) return defaultLocale;

    const normalized = country.toLowerCase().trim();

    if (['korea', 'south korea', 'republic of korea', '대한민국', '한국'].some(c => normalized.includes(c))) {
        return 'ko';
    }

    if (['china', 'china mainland', 'prc', '중국'].some(c => normalized.includes(c))) {
        return 'zh';
    }

    if (['japan', '일본'].some(c => normalized.includes(c))) {
        return 'ja';
    }

    return defaultLocale;
}

export async function loadMessages(locale: Locale): Promise<AbstractIntlMessages> {
    try {
        return (await import(`../messages/${locale}.json`)).default;
    } catch (error) {
        console.error(`Failed to load messages for locale: ${locale}`, error);
        return (await import(`../messages/${defaultLocale}.json`)).default;
    }
}
