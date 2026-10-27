import { useId } from "react";
import type { Rhythm } from "../engine";
import { patternPreview } from "../pattern-preview";
import { getPractice } from "../practices";
import { phaseKeys, type Translator } from "../i18n";
export function PatternPreview({ rhythm, practiceId, t }: { rhythm: Rhythm; practiceId: string; t: Translator }) {
  const animation = `pattern-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const preview = patternPreview(rhythm);
  const practice = getPractice(practiceId);
  return (
    <section className="selected-pattern" aria-label={t("suggestedRhythm")}>
      <p className="selected-explanation" title={t(practice?.short ?? "customHint")}>{t(practice?.short ?? "customHint")}</p>
      <p className="pattern-rhythm">
        {rhythm.flatMap((value, index) => value > 0 ? [
          <span key={index} title={t(phaseKeys[index])}>
            {t(index === 1 || index === 3 ? "hold" : phaseKeys[index])} <bdi>{value}</bdi>
          </span>,
        ] : [])}
        <span className="pattern-unit">{t("seconds")}</span>
      </p>
      {preview && <>
        <style>{`@keyframes ${animation} {${preview.frames.map(frame => `${frame.percent}% { transform: scaleX(${frame.fill}); }`).join(" ")}}`}</style>
        <div className="pattern-track" aria-hidden="true" data-cycle-ms={preview.duration}>
          <span style={{ animation: `${animation} ${preview.duration}ms linear infinite` }} />
        </div>
      </>}
    </section>
  );
}
