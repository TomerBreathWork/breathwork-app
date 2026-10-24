import type { ReactNode, CSSProperties } from "react";
import { presets, type Settings } from "../settings";
import { phaseKeys, type Translator } from "../i18n";
import type { Rhythm } from "../engine";
import type { PresetKey } from "../presets";
import { SettingsFooter } from "./SettingsFooter";
import { Icon } from "./Icons";
interface Props {
  t: Translator;
  settings: Settings;
  onCustom: () => void;
  onPreset: (key: PresetKey) => void;
  patch: (patch: Partial<Settings>) => void;
  advanced: ReactNode;
  valid: boolean;
  preparing: boolean;
  start: () => void;
}
export function SettingsPanel({
  t,
  settings,
  onCustom,
  onPreset,
  patch,
  advanced,
  valid,
  preparing,
  start,
}: Props) {
  return (
    <main
      className="settings-panel glass-panel"
      aria-label={t("settingsLabel")}
    >
      <section className="presets-section" aria-label={t("presets")}>
        <h2 className="section-title">{t("presets")}</h2>
        <div className="presets" dir="ltr" lang="en">
          {presets.map((preset) => (
            <button
              className={`preset ${settings.preset === preset.key ? "selected" : ""}`}
              aria-pressed={settings.preset === preset.key}
              key={preset.key}
              onClick={() => onPreset(preset.key)}
            >
              <strong>{t(preset.key)}</strong>
            </button>
          ))}
          <button
            className={`preset ${settings.preset === "custom" ? "selected" : ""}`}
            aria-pressed={settings.preset === "custom"}
            onClick={onCustom}
          >
            <strong>{t("custom")}</strong>
          </button>
        </div>
      </section>
      <section className="rhythm-grid" aria-label={t("rhythmLabel")}>
        {phaseKeys.map((key, index) => {
          const value = settings.rhythm[index];
          const update = (value: number) => {
            const rhythm = [...settings.rhythm] as Rhythm;
            rhythm[index] = value;
            patch({ rhythm });
          };
          return (
            <div className="phase-row" key={key}>
              <label htmlFor={`phase-${index}`}>{t(key)}</label>
              <input
                id={`phase-${index}`}
                type="range"
                min="0"
                max="120"
                step="0.5"
                value={Number.isFinite(value) ? value : 0}
                onChange={(e) => update(Number(e.target.value))}
                aria-label={t(key)}
                style={
                  {
                    "--range-progress": `${((value || 0) / 120) * 100}%`,
                  } as CSSProperties
                }
              />
              <label className="duration-chip">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="120"
                  step="0.5"
                  aria-label={t("phaseSeconds", { phase: t(key) })}
                  value={Number.isNaN(value) ? "" : value}
                  onChange={(e) =>
                    update(e.target.value === "" ? NaN : Number(e.target.value))
                  }
                />
                <span>{t("seconds")}</span>
              </label>
            </div>
          );
        })}
      </section>
      <div className="session-length">
        <label htmlFor="duration">{t("sessionLength")}</label>
        <div className="length-control">
          <input
            id="duration"
            aria-label={t("sessionLength")}
            type="number"
            min="1"
            max="120"
            step="1"
            value={Number.isNaN(settings.minutes) ? "" : settings.minutes}
            onChange={(e) =>
              patch({
                minutes: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
          <span>{t("minutes")}</span>
        </div>
      </div>
      {advanced}
      {!valid && (
        <p className="error" role="alert">
          {t("error")}
        </p>
      )}
      <button
        className="start-button"
        disabled={!valid || preparing}
        onClick={start}
      >
        <Icon name="play" />
        {t(preparing ? "preparing" : "start")}
      </button>
      <p className="safety">{t("safety")}</p>
      <SettingsFooter t={t} />
    </main>
  );
}
