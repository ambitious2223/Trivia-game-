// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import your translation files directly
import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: { translation: translationEN },
  ar: { translation: translationAR }
};

i18n
  .use(LanguageDetector) // Automatically detects the user's browser language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // If a language isn't found, default to English
    interpolation: {
      escapeValue: false // React already protects against XSS
    }
  });

export default i18n;