import type { Language } from "./i18n";

export const publicAppUrl = "https://tomerbreathwork.github.io/breathwork-app/";
export const contactUrl = (message: string, language: Language = "en") =>
  language === "ja"
    ? "https://line.me/ti/p/dDHE5dIChq"
    : `https://wa.me/972509266969?text=${encodeURIComponent(message)}`;
