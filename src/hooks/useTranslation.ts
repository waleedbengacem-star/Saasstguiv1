'use client';

import { useState, useEffect, useCallback } from 'react';
import { translateText } from '@/lib/translations';

/**
 * Global translation hook. Reads the current UI language from localStorage
 * and re-renders when the language changes via the pms-language-change event.
 */
export function useTranslation() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    // Read current language from localStorage
    const stored = localStorage.getItem('pms_ui_language') || 'en';
    setLang(stored);

    // Listen for language change events dispatched by settings page
    const handleChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };

    window.addEventListener('pms-language-change', handleChange);
    return () => window.removeEventListener('pms-language-change', handleChange);
  }, []);

  const t = useCallback(
    (key: string) => translateText(key, lang),
    [lang]
  );

  return { t, lang };
}
