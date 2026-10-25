import { useEffect, useState } from "react";
import en from "./locales/en.json";
import he from "./locales/he.json";
import ja from "./locales/ja.json";
export type Language = "en" | "he" | "ja";
export type TranslationKey = keyof typeof en;
export type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;
const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  he,
  ja,
};
function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem("breath-flow-language");
    if (saved === "en" || saved === "he" || saved === "ja") return saved;
  } catch {}
  for (const locale of navigator.languages || [navigator.language]) {
    const language = locale.split("-")[0];
    if (language === "en" || language === "he" || language === "ja")
      return language;
  }
  return "en";
}
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(detectLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
    document.title = `Breath Flow — ${dictionaries[language].tagline}`;
    try {
      localStorage.setItem("breath-flow-language", language);
    } catch {}
  }, [language]);
  const t: Translator = (key, values = {}) =>
    dictionaries[language][key].replace(/\{(\w+)\}/g, (_, name) =>
      String(values[name] ?? ""),
    );
  return { language, setLanguage, t };
}
export const phaseKeys: TranslationKey[] = [
  "inhale",
  "holdIn",
  "exhale",
  "holdOut",
];
const sceneKeys: Record<string, TranslationKey> = {
  "mountain-lake": "sceneLake",
  "photo-1": "sceneRiver",
  "photo-2": "sceneSunset",
  "photo-3": "sceneForest",
  "photo-4": "sceneCoast",
  "photo-5": "sceneCave",
  alpine: "sceneAlpine",
  coast: "sceneCoastArt",
};
export const sceneName = (id: string, index: number, t: Translator) =>
  sceneKeys[id] ? t(sceneKeys[id]) : t("sceneOther", { number: index + 1 });
