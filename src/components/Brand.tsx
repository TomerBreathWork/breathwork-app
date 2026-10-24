import type { Language, Translator } from "../i18n";
import { Icon } from "./Icons";
export function Brand({
  t,
  language,
  onLanguage,
}: {
  t: Translator;
  language: Language;
  onLanguage?: (language: Language) => void;
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <img
          className="brand-mark"
          src={`${import.meta.env.BASE_URL}branding/brush-circle.svg`}
          alt=""
        />
        <div dir="ltr">
          <h1>Breath Flow</h1>
          <p className="attribution">BY TOMER BREATHWORK</p>
        </div>
      </div>
      {onLanguage && (
        <label className="language-picker">
          <Icon name="globe" />
          <select
            aria-label={t("language")}
            value={language}
            onChange={(e) => onLanguage(e.target.value as Language)}
          >
            <option value="he">🇮🇱 עברית</option>
            <option value="en">🇬🇧 English</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>
          <span aria-hidden="true">{language.toUpperCase()}</span>
        </label>
      )}
      <p className="tagline">{t("tagline")}</p>
    </header>
  );
}
