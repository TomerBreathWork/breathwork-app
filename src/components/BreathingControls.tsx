import type { CSSProperties } from "react";
import type { Rhythm } from "../engine";
import { editPhase } from "../presets";
import { phaseKeys, type Language, type Translator } from "../i18n";
import {
  phaseLimits,
  clampPhaseDuration,
  holdDurationToSliderPosition,
  sliderPositionToHoldDuration,
  nextHoldDuration,
} from "../duration-controls";
export function PhaseDurations({
  t,
  language,
  settings,
  patch,
  onEditingChange,
}: {
  t: Translator;
  language: Language;
  settings: { rhythm: Rhythm; preset?: string };
  patch: (p: { rhythm: Rhythm }) => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const box = settings.preset === "boxBreathing";
  return (
    <section className="rhythm-grid" aria-label={t("rhythmLabel")}>
      {phaseKeys.map((key, index) => {
        const value = settings.rhythm[index];
        const hold = index === 1 || index === 3;
        // Equal Box phases must satisfy the inhale/exhale limits as well as
        // the hold limits. Custom and other presets retain their original range.
        const limitIndex = box ? 0 : index;
        const { min, max } = phaseLimits(limitIndex);
        const displayedValue = Number.isFinite(value)
          ? clampPhaseDuration(limitIndex, value)
          : min;
        const sliderMin = hold ? holdDurationToSliderPosition(min) : min;
        const sliderMax = hold ? holdDurationToSliderPosition(max) : max;
        const position = hold
          ? holdDurationToSliderPosition(displayedValue)
          : ((displayedValue - min) / (max - min)) * 100;
        const controlLabel =
          language === "ja" && hold ? `${t(key)} (${index + 1})` : t(key);
        const update = (value: number) => {
          patch({ rhythm: editPhase(settings, index, value) });
        };
        return (
          <div className="phase-row" key={key}>
            <label htmlFor={`phase-${index}`}>{t(key)}</label>
            <input
              id={`phase-${index}`}
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={hold ? "any" : "0.5"}
              value={hold ? position : displayedValue}
              onChange={(e) =>
                update(clampPhaseDuration(limitIndex,
                  hold
                    ? sliderPositionToHoldDuration(Number(e.target.value))
                    : Number(e.target.value),
                ))
              }
              onKeyDown={(event) => {
                if (!hold) return;
                if (
                  [
                    "ArrowUp",
                    "ArrowRight",
                    "ArrowDown",
                    "ArrowLeft",
                    "Home",
                    "End",
                  ].includes(event.key)
                ) {
                  event.preventDefault();
                  update(clampPhaseDuration(limitIndex,
                    event.key === "Home"
                      ? min
                      : event.key === "End"
                        ? max
                        : nextHoldDuration(
                            displayedValue,
                            event.key === "ArrowUp" ||
                              event.key === "ArrowRight"
                              ? 1
                              : -1,
                          ),
                  ));
                }
              }}
              aria-label={controlLabel}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={displayedValue}
              aria-valuetext={`${displayedValue} ${t("seconds")}`}
              style={
                {
                  "--range-progress": `${hold ? ((position - sliderMin) / (sliderMax - sliderMin)) * 100 : position}%`,
                } as CSSProperties
              }
            />
            <label className="duration-chip">
              <input
                type="number"
                inputMode="decimal"
                id={`phase-value-${index}`}
                min={min}
                max={max}
                step="0.5"
                aria-label={t("phaseSeconds", { phase: controlLabel })}
                aria-invalid={
                  !Number.isFinite(value) || value < min || value > max
                }
                onFocus={() => onEditingChange?.(true)}
                onBlur={(event) => {
                  onEditingChange?.(false);
                  if (
                    event.target.value !== "" &&
                    Number.isFinite(Number(event.target.value))
                  )
                    update(
                      clampPhaseDuration(limitIndex, Number(event.target.value)),
                    );
                }}
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
  );
}
export function SessionLength({
  t,
  settings,
  patch,
}: {
  t: Translator;
  settings: { minutes: number };
  patch: (p: { minutes: number }) => void;
}) {
  return (
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
  );
}
