import { PREPARATION_SECONDS } from "../preparation";
import type { BreathingRoute } from "../practices";
import { BreathRouteIcon } from "./BreathRouteIcon";
import type { Language, Translator } from "../i18n";
import { phaseCountdown } from "../countdown";
type Status = "running" | "paused" | "completed";
export function BreathingCircle({
  t,
  status,
  phase,
  preparationProgress,
  language,
  routes,
}: {
  t: Translator;
  status: Status;
  preparationProgress?: number;
  language: Language;
  routes: { inhale: BreathingRoute; exhale: BreathingRoute };
  phase: {
    index: number;
    progress: number;
    remaining: number;
    duration: number;
  };
}) {
  const preparing = preparationProgress !== undefined;
  const hold = !preparing && (phase.index === 1 || phase.index === 3);
  const fill = preparing
    ? 1 - preparationProgress
    : phase.index === 0
      ? phase.progress
      : phase.index === 1
        ? 1
        : phase.index === 2
          ? 1 - phase.progress
          : 0;
  const title =
    status === "completed"
      ? t("complete")
      : status === "paused"
        ? t("paused")
        : preparing
          ? t("preparationInstruction")
          : t(hold ? "hold" : phase.index === 0 ? "inhale" : "exhale");
  return (
    <div
      className={`breath-circle ${status === "running" && !hold ? "moving" : ""}`}
      data-phase={preparing ? "preparation" : phase.index}
      data-status={status}
    >
      <div className="water-clip">
        <div className="water" style={{ height: `${fill * 100}%` }}>
          <div className="wave" />
        </div>
      </div>
      <svg className="hold-ring" viewBox="0 0 320 320" aria-hidden="true">
        <circle cx="160" cy="160" r="155" className="ring-track" />
        {hold && status !== "completed" && (
          <circle
            cx="160"
            cy="160"
            r="155"
            className="ring-progress"
            strokeDasharray={2 * Math.PI * 155}
            strokeDashoffset={2 * Math.PI * 155 * (1 - phase.progress)}
          />
        )}
      </svg>
      <div className="circle-label" dir="auto">
        <h2 aria-live="polite" aria-atomic="true">
          {title}
        </h2>
        {status !== "completed" && (
          <span
            className="phase-count"
            dir="ltr"
            aria-label={t("phaseCountdown")}
          >
            {preparing
              ? Math.max(
                  1,
                  Math.ceil((1 - preparationProgress) * PREPARATION_SECONDS),
                )
              : phaseCountdown(phase.remaining, phase.duration)}
          </span>
        )}
        <div className="breath-route-guidance">
          {!preparing && !hold && status === "running" && (
            <>
              <BreathRouteIcon
                route={phase.index === 0 ? routes.inhale : routes.exhale}
              />
              <span>
                {t(
                  (phase.index === 0 ? routes.inhale : routes.exhale) === "nose"
                    ? "throughNose"
                    : "throughMouth",
                )}
              </span>
            </>
          )}
        </div>
        {/* Japanese uses only the shared short hold label, never a phase subtitle. */}
        {hold && status === "running" && language !== "ja" && (
          <small>{t(phase.index === 1 ? "afterInhale" : "afterExhale")}</small>
        )}
      </div>
    </div>
  );
}
