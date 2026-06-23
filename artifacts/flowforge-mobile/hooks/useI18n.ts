import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "../locales/en";
import zhCN from "../locales/zh-CN";
import zhTW from "../locales/zh-TW";

const LANG_KEY = "i18nextLng";
const SUPPORTED = ["en", "zh-CN", "zh-TW"] as const;
type SupportedLang = (typeof SUPPORTED)[number];

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      "zh-CN": { translation: zhCN },
      "zh-TW": { translation: zhTW },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED],
    interpolation: { escapeValue: false },
  });
}

export async function loadStoredLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // ignore
  }
}

export async function changeLanguage(lang: SupportedLang): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export { SUPPORTED };
export type { SupportedLang };
export default i18n;
