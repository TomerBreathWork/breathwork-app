import { CompactLabel } from "./CompactLabel";
import { PhaseDurations, SessionLength } from "./BreathingControls";
import { getPractice } from "../practices";
import type { ReactNode } from "react";
import { type Settings } from "../settings";
import { type Translator, type Language, type TranslationKey } from "../i18n";
import type { PresetKey } from "../presets";
import { SettingsFooter } from "./SettingsFooter";
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
interface Props {
  t: Translator;
  language: Language;
  settings: Settings;
  choosing: boolean;
  chooseAnother: () => void;
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
  choosing,
  chooseAnother,
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
  const heading = useRef<HTMLHeadingElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  const previousChoosing = useRef(choosing);
  useLayoutEffect(() => {
    if (previousChoosing.current === choosing) return;
    previousChoosing.current = choosing;
    setEditing(false);
    const choice = choices.current?.querySelector<HTMLButtonElement>(
      `[data-home-choice="${settings.practiceId}"]`,
    ) ?? choices.current?.querySelector<HTMLButtonElement>("button");
    (choosing ? choice : heading.current)?.focus({ preventScroll: true });
    (choosing ? choice : heading.current)?.closest(".app-page")?.scrollTo({ top: 0, behavior: "instant" });
  }, [choosing, settings.practiceId]);
  // Home copy is separate from the library's existing educational descriptions.
  const presetDescriptions: Record<string, TranslationKey> = {
    coherent: "homeCoherentDescription",
    box: "homeBoxDescription",
    "478": "home478Description",
    custom: "homeCustomDescription",
  };
  const description = presetDescriptions[settings.practiceId]
    ?? getPractice(settings.practiceId)?.short
    ?? "homeCustomDescription";
  return (
    <main
      tabIndex={-1}
      className="settings-panel glass-panel"
      data-selected-practice={settings.practiceId}
      data-home-state={choosing ? "choosing" : "selected"}
      aria-label={t("settingsLabel")}
    >
      <section className="presets-section" aria-label={t("presets")}>
        {choosing ? <>
          <header className="home-welcome-header">
            <h2 className="home-welcome"><CompactLabel>{t("homeWelcome")}</CompactLabel></h2>
          </header>
          <div ref={choices} className="presets home-choices">
            {([
              ["coherent", "coherentBreathing", "homeCalmBalance", () => onPreset("coherentBreathing")],
              ["box", "boxBreathing", "homeFocusBalance", () => onPreset("boxBreathing")],
              ["478", "eveningUnwind", "homeRelaxUnwind", () => onPreset("eveningUnwind")],
              ["custom", "custom", "homeOwnRhythm", onCustom],
            ] as const).map(([id, name, subtitle, select]) => (
              <button type="button" className="preset" data-home-choice={id} key={id} onClick={select}>
                <strong><CompactLabel>{t(name)}</CompactLabel></strong>
                <span className="choice-subtitle"><CompactLabel>{t(subtitle)}</CompactLabel></span>
              </button>
            ))}
          </div>
        </> : <>
          <div className="selected-practice-heading">
            <h2 ref={heading} tabIndex={-1}>
              <CompactLabel>{t(getPractice(settings.practiceId)?.name ?? "custom")}</CompactLabel>
            </h2>
            <button type="button" className="choose-another" onClick={chooseAnother}>
              <CompactLabel>{t("chooseAnotherPractice")}</CompactLabel>
            </button>
          </div>
          <p className="selected-explanation" data-layout-copy={t("homeCoherentDescription")}>
            <span>{t(description)}</span>
          </p>
        </>}
      </section>
      {!choosing && <>
        <PhaseDurations t={t} language={language} settings={settings} patch={patch} onEditingChange={setEditing} />
        <SessionLength t={t} settings={settings} patch={patch} />
        {!valid && !editing && <p className="error" role="alert">{t("error")}</p>}
        <button className="start-button" disabled={!valid || preparing} onClick={start}>
          <Icon name="play" />
          <CompactLabel>{t(preparing ? "preparing" : "start")}</CompactLabel>
        </button>
      </>}
      <div className="settings-secondary">
        <div hidden data-retained-advanced>{advanced}</div>
        <button className="explore-choice" data-home-choice="explore" onClick={explore}>
          {choosing ? <>
            <span className="explore-card-copy">
              <span className="explore-card-title"><CompactLabel>{t("exploreMore")}</CompactLabel></span>
              <span className="explore-card-subtitle"><CompactLabel>{t("homeExploreHint")}</CompactLabel></span>
            </span>
            <Icon name="chevron" />
          </> : <CompactLabel>{t("exploreMore")}</CompactLabel>}
        </button>
      </div>
      <SettingsFooter t={t} language={language} />
    </main>
  );
}
