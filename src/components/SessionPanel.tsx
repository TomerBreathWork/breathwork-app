import type { ReactNode } from "react";
import type { Translator } from "../i18n";
import { clockText } from "../settings";
import type { SessionStatus } from "../useBreathingSession";
import { BreathingCircle } from "./BreathingCircle";
import { Icon } from "./Icons";
interface Props {
  t: Translator;
  status: Exclude<SessionStatus, "idle">;
  phase: { index: number; progress: number; remaining: number };
  remaining: number;
  preparing: boolean;
  preparationProgress?: number;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  advanced: ReactNode;
}
export function SessionPanel({
  t,
  status,
  phase,
  remaining,
  preparing,
  preparationProgress,
  restart,
  pause,
  resume,
  stop,
  advanced,
}: Props) {
  return (
    <main
      className="session-panel"
      aria-label={t("sessionLabel")}
      aria-busy={preparing}
    >
      <div className="practice">
        <p className="session-intro">{t("intro")}</p>
        <BreathingCircle
          t={t}
          status={status}
          phase={phase}
          preparationProgress={preparationProgress}
        />
        <p className="phase-guidance">
          {t(
            status === "completed"
              ? "completeMessage"
              : status === "paused"
                ? "pausedHint"
                : preparationProgress !== undefined
                  ? "preparationHint"
                  : phase.index === 0
                    ? "inhaleHint"
                    : phase.index === 2
                      ? "exhaleHint"
                      : "holdHint",
          )}
        </p>
        <div className="remaining">
          <span
            className="remaining-value"
            dir="ltr"
            aria-label={t("sessionTimer")}
          >
            {clockText(Math.ceil(Math.max(0, remaining)))}
          </span>
          <span>{t("remaining")}</span>
        </div>
        <div className="session-controls">
          <button
            className="side-button"
            disabled={preparing && preparationProgress === undefined}
            onClick={restart}
          >
            <Icon name="restart" />
            {t("restart")}
          </button>
          {status === "completed" ? (
            <button className="primary-control" onClick={stop}>
              {t("back")}
            </button>
          ) : (
            <button
              className="primary-control"
              disabled={preparing && preparationProgress === undefined}
              onClick={status === "running" ? pause : resume}
            >
              <Icon name={status === "running" ? "pause" : "play"} />
              {t(
                preparing && preparationProgress === undefined
                  ? "preparing"
                  : status === "running"
                    ? "pause"
                    : "resume",
              )}
            </button>
          )}
          <button className="side-button" onClick={stop}>
            <Icon name="stop" />
            {t("stop")}
          </button>
        </div>
      </div>
      <div className="session-advanced glass-panel">{advanced}</div>
    </main>
  );
}
