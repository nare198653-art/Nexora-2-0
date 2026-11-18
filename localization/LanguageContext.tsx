import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SupportedLanguage, LanguageOption } from '../types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageOption } from './languages';
import { TRANSLATIONS, TranslationKey } from './translations';

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (code: SupportedLanguage) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
  currentLanguage: LanguageOption;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LANGUAGE_STORAGE_KEY = 'nexora_language';

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
  onLanguageChange
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage && SUPPORTED_LANGUAGES.some(l => l.code === initialLanguage)) {
      return initialLanguage;
    }
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage;
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch (_) {}
    return DEFAULT_LANGUAGE;
  });

  // Keep in sync if parent passes an updated profile language
  useEffect(() => {
    if (initialLanguage && initialLanguage !== language && SUPPORTED_LANGUAGES.some(l => l.code === initialLanguage)) {
      setLanguageState(initialLanguage);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
      } catch (_) {}
    }
  }, [initialLanguage]);

  // Synchronize across storage events and custom events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const newLang = e.newValue as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.some(l => l.code === newLang)) {
          setLanguageState(newLang);
        }
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedLanguage>;
      if (customEvent.detail && SUPPORTED_LANGUAGES.some(l => l.code === customEvent.detail)) {
        setLanguageState(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('nexora-language-change', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nexora-language-change', handleCustomChange);
    };
  }, []);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    if (!SUPPORTED_LANGUAGES.some(l => l.code === newLang)) return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      window.dispatchEvent(new CustomEvent('nexora-language-change', { detail: newLang }));
    } catch (_) {}
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  }, [onLanguageChange]);

  const t = useCallback((key: TranslationKey | string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && key in langDict) {
      return langDict[key as TranslationKey];
    }
    // Fallback to English
    const enDict = TRANSLATIONS.en;
    if (enDict && key in enDict) {
      return enDict[key as TranslationKey];
    }
    return fallback !== undefined ? fallback : key;
  }, [language]);

  const currentLanguage = useMemo(() => getLanguageOption(language), [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    currentLanguage,
    languages: SUPPORTED_LANGUAGES
  }), [language, setLanguage, t, currentLanguage]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if invoked outside of provider
    const fallbackT = (key: TranslationKey | string, fallback?: string): string => {
      const enDict = TRANSLATIONS.en;
      if (enDict && key in enDict) return enDict[key as TranslationKey];
      return fallback !== undefined ? fallback : key;
    };
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: fallbackT,
      currentLanguage: SUPPORTED_LANGUAGES[0],
      languages: SUPPORTED_LANGUAGES
    };
  }
  return context;
};

export const useTranslation = () => {
  const { t, language, setLanguage, currentLanguage, languages } = useLanguage();
  return { t, language, setLanguage, currentLanguage, languages };
};
