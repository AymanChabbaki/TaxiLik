import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { storage } from './storage';
import { translations, type TranslationKey } from './translations';

export type Lang = 'fr' | 'en' | 'ar';
export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'fr', label: 'Français', native: 'Français' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

const LANG_KEY = 'taxilik.lang';

interface I18nContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(str: string, params?: Record<string, string | number>) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    storage.get(LANG_KEY).then((saved) => {
      if (saved === 'fr' || saved === 'en' || saved === 'ar') setLangState(saved);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    storage.set(LANG_KEY, l);
  };

  const t = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, string | number>) => {
      const dict = translations[lang] as Record<string, string>;
      const fallback = translations.fr as Record<string, string>;
      return interpolate(dict[key] ?? fallback[key] ?? key, params);
    };
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang, t }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
