
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import kg from './locales/kg.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kg: { translation: kg }
    },
    lng: 'ru', 
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
