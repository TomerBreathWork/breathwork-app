import { useEffect, useId, useRef } from "react";
import type { Translator } from "../i18n";
export function SessionExitDialog({ t, stay, end, settling }: {
  t: Translator; stay: () => void; end: () => void; settling: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId(), body = useId();
  const readyFocused = useRef(false);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => {
      node.close();
      document.querySelector<HTMLButtonElement>(".session-controls .primary-control")?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!settling && !readyFocused.current) {
      readyFocused.current = true;
      dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [settling]);
  return <dialog ref={dialog} className="session-exit-dialog" aria-labelledby={title} aria-describedby={body}
    aria-busy={settling}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = dialog.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }}
    onCancel={event => { event.preventDefault(); if (!settling) stay(); }}>
    <h2 id={title}>{t("leavePracticeTitle")}</h2>
    <p id={body}>{t("leavePracticeBody")}</p>
    <div className="session-exit-actions">
      <button type="button" autoFocus disabled={settling} onClick={stay}>{t("stayInPractice")}</button>
      <button type="button" disabled={settling} onClick={end}>{t("endPractice")}</button>
    </div>
  </dialog>;
}
