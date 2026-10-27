import type { Language, Translator } from "../i18n";
import type { Settings } from "../settings";
import { adjustPractice, isAdjusted, type Practice } from "../practices";
import { PhaseDurations, SessionLength } from "./BreathingControls";
import { CategoryIcon } from "./CategoryIcon";
import { Icon } from "./Icons";
export function PracticeDetails({
  practice,
  settings,
  t,
  language,
  patch,
  back,
  start,
  valid,
  preparing,
}: {
  practice: Practice;
  settings: Settings;
  t: Translator;
  language: Language;
  patch: (p: Partial<Settings>) => void;
  back: () => void;
  start: () => void;
  valid: boolean;
  preparing: boolean;
}) {
  const coupled = practice.customization !== "phases";
  return (
    <main
      className="discovery-panel glass-panel practice-details"
      aria-label={t(practice.name)}
      data-practice-detail={practice.id}
    >
      <div className="discovery-heading">
        <button className="text-button discovery-back" onClick={back}>
          {t("goBack")}
        </button>
        <h2 tabIndex={-1}>
          <CategoryIcon category={practice.icon} />
          {t(practice.name)}
        </h2>
      </div>
      <div className="discovery-scroll details-body">
        <p>{t(practice.explanation)}</p>
        <section>
          <h3>{t("whyPractice")}</h3>
          <p>{t(practice.benefit)}</p>
        </section>
        <section>
          <h3>{t("whenPractice")}</h3>
          <p>{t(practice.useCases)}</p>
        </section>
        <section className="suggested-rhythm">
          <h3>{t("suggestedRhythm")}</h3>
          <p>
            <bdi>{practice.rhythm.join(" / ")}</bdi> {t("seconds")}
          </p>
          {isAdjusted(practice, settings.rhythm) && (
            <p className="helper">{t("adjustedRhythm")}</p>
          )}
        </section>
        {coupled ? (
          <div className="coupled-controls">
            <label htmlFor="practice-base">
              {t(
                practice.customization === "equalPhases"
                  ? "commonDuration"
                  : "inhale",
              )}
            </label>
            <input
              id="practice-base"
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              inputMode="decimal"
              value={Number.isNaN(settings.rhythm[0]) ? "" : settings.rhythm[0]}
              onChange={(event) => {
                if (event.target.value === "") {
                  patch({ rhythm: [NaN, 0, NaN, 0] });
                  return;
                }
                patch({
                  rhythm: adjustPractice(practice, Number(event.target.value)),
                });
              }}
              onBlur={() => {
                if (!Number.isFinite(settings.rhythm[0]))
                  patch({ rhythm: adjustPractice(practice, 0.5) });
              }}
            />
            <input
              type="range"
              aria-label={t(
                practice.customization === "equalPhases"
                  ? "commonDuration"
                  : "inhale",
              )}
              min="0.5"
              max="10"
              step="0.5"
              value={
                Number.isFinite(settings.rhythm[0]) ? settings.rhythm[0] : 0.5
              }
              onChange={(e) =>
                patch({
                  rhythm: adjustPractice(practice, Number(e.target.value)),
                })
              }
            />
            <p className="ratio-explanation">
              {t(
                practice.customization === "equalPhases"
                  ? "equalPhasesHint"
                  : "ratioHint",
                { ratio: practice.ratio ?? 1 },
              )}
            </p>
            <output aria-live="polite">
              <bdi>
                {settings.rhythm
                  .map((n) => (Number.isFinite(n) ? n : "—"))
                  .join(" / ")}
              </bdi>{" "}
              {t("seconds")}
            </output>
            {practice.customization === "paired" && (
              <p className="derived-exhale">
                {t("exhale")}:{" "}
                <bdi>
                  {Number.isFinite(settings.rhythm[2])
                    ? settings.rhythm[2]
                    : "—"}
                </bdi>{" "}
                {t("seconds")}
              </p>
            )}
          </div>
        ) : (
          <PhaseDurations
            t={t}
            language={language}
            settings={settings}
            patch={patch}
          />
        )}
        <p className="helper">{t("adjustComfort")}</p>
        {practice.caution && (
          <p className="practice-caution">{t(practice.caution)}</p>
        )}
        <div
          className="quick-lengths"
          role="group"
          aria-label={t("quickLengths")}
        >
          {[3, 5, 10].map((minutes) => (
            <button
              key={minutes}
              aria-pressed={settings.minutes === minutes}
              onClick={() => patch({ minutes })}
            >
              <bdi>{minutes}</bdi> {t("minutes")}
            </button>
          ))}
        </div>
        <SessionLength t={t} settings={settings} patch={patch} />
        <p className="helper">{t("finishHint")}</p>
        <p className="practice-safety">{t("comfortSafety")}</p>
        {!valid && (
          <p className="error" role="alert">
            {t("error")}
          </p>
        )}
      </div>
      <button
        className="start-button"
        disabled={!valid || preparing}
        onClick={start}
      >
        <Icon name="play" />
        {t(preparing ? "preparing" : "start")}
      </button>
    </main>
  );
}
