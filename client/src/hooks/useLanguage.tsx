import React, { createContext, useContext } from "react";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import pt from "../locales/pt.json";
import en from "../locales/en.json";

type Language = "pt" | "en";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

// Initialize i18next
const savedLang = (() => {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("cortex_lang");
    return saved === "pt" || saved === "en" ? saved : "pt";
  }
  return "pt";
})();

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: pt },
        en: { translation: en },
      },
      lng: savedLang,
      fallbackLng: "pt",
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
      react: {
        useSuspense: false,
      },
    });
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const language = (i18nInstance.language || "pt") as Language;

  const setLanguage = (lang: Language) => {
    i18nInstance.changeLanguage(lang);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("cortex_lang", lang);
    }
  };

  const translate = (key: string): string => {
    const res = t(key);
    return typeof res === "string" ? res : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
