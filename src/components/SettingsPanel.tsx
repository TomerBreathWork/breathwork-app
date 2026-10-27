import { PhaseDurations, SessionLength } from "./BreathingControls";
import { getPractice } from "../practices";
import type { ReactNode } from "react";
import { type Settings } from "../settings";
import { type Translator, type Language } from "../i18n";
import type { PresetKey } from "../presets";
import { SettingsFooter } from "./SettingsFooter";
import { useState } from "react";
import { Icon } from "./Icons";
import { PatternPreview } from "./PatternPreview";
interface Props {
  t: Translator;
  language: Language;
  settings: Settings;
  onCustom: () => void;
  onPreset: (key: PresetKey) => void;
  patch: (patch: Partial<Settings>) => void;
  advanced: ReactNode;
  valid: boolean;
  preparing: boolean;
  start: () => void;
  explore: () => void;
}
export function SettingsPanel({
  t,
  language,
  settings,
  onCustom,
  onPreset,
  patch,
  advanced,
  valid,
  preparing,
  start,
  explore,
}: Props) {
  const [editing, setEditing] = useState(false);
  return (
    <main
      tabIndex={-1}
      className="settings-panel glass-panel"
      data-selected-practice={settings.practiceId}
      aria-label={t("settingsLabel")}
    >
      <section className="presets-section" aria-label={t("presets")}>
        <h2 className="section-title">
          {t(getPractice(settings.practiceId)?.name ?? "presets")}
        </h2>
        <div className="presets home-choices">
          <button
            className={`preset ${settings.practiceId === "coherent" ? "selected" : ""}`}
            aria-pressed={settings.practiceId === "coherent"}
            data-home-choice="coherent"
            onClick={() => onPreset("coherentBreathing")}
          >
            <strong>{t("coherentBreathing")}</strong>
          </button>
          <button
            className={`preset ${settings.preset === "boxBreathing" ? "selected" : ""}`}
            aria-pressed={settings.preset === "boxBreathing"}
            data-home-choice="box"
            onClick={() => onPreset("boxBreathing")}
          >
            <strong>{t("boxBreathing")}</strong>
          </button>
          <button
            className={`preset ${settings.preset === "eveningUnwind" ? "selected" : ""}`}
            aria-pressed={settings.preset === "eveningUnwind"}
            data-home-choice="478"
            onClick={() => onPreset("eveningUnwind")}
          >
            <strong>{t("preset478")}</strong>
          </button>
          <button
            className={`preset ${settings.practiceId === "custom" ? "selected" : ""}`}
            aria-pressed={settings.practiceId === "custom"}
            data-home-choice="custom"
            onClick={onCustom}
          >
            <strong>{t("custom")}</strong>
          </button>
        </div>
      </section>
      <PhaseDurations
        t={t}
        language={language}
        settings={settings}
        patch={patch}
        onEditingChange={setEditing}
      />
      <SessionLength t={t} settings={settings} patch={patch} />
      <div className="settings-secondary">
        <div hidden data-retained-advanced>{advanced}</div>
        <button
          className="explore-choice"
          data-home-choice="explore"
          onClick={explore}
        >
          {t("explore")}
        </button>
      </div>
      {!valid && !editing && (
        <p className="error" role="alert">
          {t("error")}
        </p>
      )}
      <PatternPreview
        key={settings.rhythm.join("/")}
        rhythm={settings.rhythm}
        practiceId={settings.practiceId}
        t={t}
      />
      <button
        className="start-button"
        disabled={!valid || preparing}
        onClick={start}
      >
        <Icon name="play" />
        {t(preparing ? "preparing" : "start")}
      </button>
      <SettingsFooter t={t} />
    </main>
  );
}
