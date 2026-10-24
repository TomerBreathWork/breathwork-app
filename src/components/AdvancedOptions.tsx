import { useState } from "react";
import { hasRecordings, selectableBackgrounds } from "../media";
import { sceneName, type TranslationKey, type Translator } from "../i18n";
import type { Settings } from "../settings";
import { Icon } from "./Icons";
interface Props {
  t: Translator;
  settings: Settings;
  patch: (patch: Partial<Settings>) => void;
  muted: boolean;
  onMute: () => void;
  onPreview: () => void;
  onReset?: () => void;
  audioStatus: TranslationKey;
}
export function AdvancedOptions({
  t,
  settings,
  patch,
  muted,
  onMute,
  onPreview,
  onReset,
  audioStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`advanced ${open ? "is-open" : ""}`}>
      <button
        className="advanced-toggle"
        aria-expanded={open}
        aria-controls="advanced-content"
        onClick={() => setOpen(!open)}
      >
        <span>{t("advanced")}</span>
        <Icon name="chevron" />
      </button>
      {open && (
        <div className="advanced-content" id="advanced-content">
          <label>
            {t("background")}
            <select
              aria-label={t("background")}
              value={settings.background}
              onChange={(e) => patch({ background: e.target.value })}
            >
              <option value="random">{t("random")}</option>
              {selectableBackgrounds.map((asset, index) => (
                <option key={asset.id} value={asset.id}>
                  {sceneName(asset.id, index, t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("sound")}
            <select
              aria-label={t("sound")}
              value={settings.sound}
              onChange={(e) => patch({ sound: e.target.value })}
            >
              <option value="bowls">{t("synthesized")}</option>
              {hasRecordings && (
                <option value="recordings">{t("recorded")}</option>
              )}
              <option value="silent">{t("silent")}</option>
            </select>
          </label>
          <div className="audio-actions">
            <button
              className="small-button"
              disabled={settings.sound === "silent"}
              aria-label={t(muted ? "unmute" : "mute")}
              aria-pressed={muted}
              onClick={onMute}
            >
              <Icon name={muted ? "mute" : "sound"} />
              {t(muted ? "unmute" : "mute")}
            </button>
            <button
              className="small-button"
              disabled={settings.sound === "silent"}
              onClick={onPreview}
            >
              {t("preview")}
            </button>
          </div>
          <label className="volume-control">
            {t("volume")}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => patch({ volume: Number(e.target.value) })}
              aria-label={t("volume")}
            />
            <span className="volume-value" dir="ltr" aria-hidden="true">
              {Math.round(settings.volume * 100)}%
            </span>
          </label>
          <p className="helper" role="status">
            {t(audioStatus)}
          </p>
          <p className="helper">
            {t("zeroHint")} {t("finishHint")}
          </p>
          {onReset && (
            <button className="text-button" onClick={onReset}>
              {t("reset")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
