import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  AppLanguage,
  TranslationDictionary,
  LanguageMeta,
  AVAILABLE_LANGUAGES,
  translations,
} from '../data/translations';

export type { AppLanguage, TranslationDictionary, LanguageMeta };
export { AVAILABLE_LANGUAGES };

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  strings: TranslationDictionary;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | number) => string;
}

const STORAGE_KEY = 'esp32_ir_language_v1';

const defaultContext: LanguageContextType = {
  language: 'pt',
  setLanguage: () => {},
  strings: translations.pt,
  t: (key) => key,
  formatDate: (d) => String(d),
  formatTime: (d) => String(d),
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage;
      if (saved && AVAILABLE_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
      return 'pt';
    } catch {
      return 'pt';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
    const currentMeta = AVAILABLE_LANGUAGES.find((l) => l.code === language);
    document.documentElement.lang = currentMeta?.locale || 'pt-BR';
    document.documentElement.dir = currentMeta?.dir || 'ltr';
  }, [language]);

  const setLanguage = (newLang: AppLanguage) => {
    setLanguageState(newLang);
  };

  const strings = useMemo(() => {
    return translations[language] || translations.pt;
  }, [language]);

  const localeStr = useMemo(() => {
    const currentMeta = AVAILABLE_LANGUAGES.find((l) => l.code === language);
    return currentMeta?.locale || 'pt-BR';
  }, [language]);

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    let current: any = strings;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Portuguese or keyPath
        let fallback: any = translations.pt;
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = keyPath;
            break;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return keyPath;
    }

    if (params) {
      return Object.entries(params).reduce((acc, [paramKey, paramVal]) => {
        return acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, current);
    }

    return current;
  };

  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(localeStr, options);
    } catch {
      return '';
    }
  };

  const formatTime = (date: Date | string | number): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        strings,
        t,
        formatDate,
        formatTime,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
