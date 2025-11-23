'use client';

import { useState } from 'react';
import { useI18n } from './I18nProvider';
import { Locale } from '@/lib/i18n';

const languages = [
    { code: 'ko' as Locale, flag: '🇰🇷', name: '한국어' },
    { code: 'en' as Locale, flag: '🇺🇸', name: 'English' },
    { code: 'zh' as Locale, flag: '🇨🇳', name: '中文' },
    { code: 'ja' as Locale, flag: '🇯🇵', name: '日本語' }
];

export default function LanguageSwitcher() {
    const { locale, setLocale } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

    const currentLanguage = languages.find(lang => lang.code === locale) || languages[1];

    const handleLanguageChange = async (newLocale: Locale) => {
        await setLocale(newLocale);
        setIsOpen(false);
    };

    return (
        <div className="language-switcher">
            <button
                className="language-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Change language"
            >
                <span className="flag">{currentLanguage.flag}</span>
                <span className="material-icons">expand_more</span>
            </button>

            {isOpen && (
                <>
                    <div className="language-overlay" onClick={() => setIsOpen(false)} />
                    <div className="language-dropdown">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                className={`language-option ${locale === lang.code ? 'active' : ''}`}
                                onClick={() => handleLanguageChange(lang.code)}
                            >
                                <span className="flag">{lang.flag}</span>
                                <span className="name">{lang.name}</span>
                                {locale === lang.code && (
                                    <span className="material-icons check">check</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
