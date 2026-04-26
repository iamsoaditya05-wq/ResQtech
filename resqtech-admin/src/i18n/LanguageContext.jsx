import React, { createContext, useContext, useState } from 'react';
import { T, LANGUAGES } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('resqtech_lang') || 'en');

  function changeLang(code) {
    setLang(code);
    localStorage.setItem('resqtech_lang', code);
  }

  const t = (key) => T[lang]?.[key] ?? T.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
