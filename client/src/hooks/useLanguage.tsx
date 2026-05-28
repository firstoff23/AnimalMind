import React, { createContext, useContext, useState, useEffect } from "react";
import { pt } from "../locales/pt";
import { en } from "../locales/en";

type Language = "pt" | "en";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const translations: Record<Language, any> = { pt, en };

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("cortex_lang") as Language | null;
      return saved === "pt" || saved === "en" ? saved : "pt";
    }
    return "pt";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("cortex_lang", lang);
    }
  };

  const t = (key: string): string => {
    const parts = key.split(".");
    let result = translations[language];

    for (const part of parts) {
      if (result && result[part] !== undefined) {
        result = result[part];
      } else {
        // Fallback to 'pt' if the key isn't found in current language
        let fallbackResult = translations["pt"];
        for (const fbPart of parts) {
          if (fallbackResult && fallbackResult[fbPart] !== undefined) {
            fallbackResult = fallbackResult[fbPart];
          } else {
            return key; // return key string if absolutely not found
          }
        }
        return typeof fallbackResult === "string" ? fallbackResult : key;
      }
    }

    return typeof result === "string" ? result : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
