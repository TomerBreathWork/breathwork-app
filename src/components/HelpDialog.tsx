import { useEffect, useId, useRef } from "react";
import type { Translator, TranslationKey } from "../i18n";
const steps: [TranslationKey, TranslationKey][] = [
  ["helpChooseTitle", "helpChooseBody"],
  ["helpAdjustTitle", "helpAdjustBody"],
  ["helpLengthTitle", "helpLengthBody"],
  ["helpStartTitle", "helpStartBody"],
];
const additionalSections: [TranslationKey, TranslationKey][] = [
  ["helpInstallTitle", "helpInstallBody"],
  ["helpFutureTitle", "helpFutureBody"],
  ["helpContactTitle", "helpContactBody"],
];
function Paragraphs({ text }: { text: string }) {
  return text.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>);
}
export function HelpDialog({
  t,
  onClose,
}: {
  t: Translator;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    title = useId(),
    intro = useId();
  const [titleStart, titleEnd] = t("helpTitle").split("Breath Flow");
  useEffect(() => {
    const node = dialog.current!,
      previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby={title}
      aria-describedby={intro}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        // The dialog has two focus targets: Close and its scrollable content.
        const first =
          dialog.current!.querySelector<HTMLButtonElement>("button")!;
        const last = dialog.current!.querySelector<HTMLElement>(".help-body")!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="help-header">
        <h2 id={title}>
          {titleStart}
          <bdi dir="ltr">Breath Flow</bdi>
          {titleEnd}
        </h2>
        <button type="button" autoFocus onClick={onClose}>
          {t("close")}
        </button>
      </header>
      <div className="help-body" tabIndex={0}>
        <p id={intro}>{t("helpIntro")}</p>
        <ol>
          {steps.map(([heading, body]) => (
            <li key={heading}>
              <h3>{t(heading)}</h3>
              <Paragraphs text={t(body)} />
            </li>
          ))}
        </ol>
        <h3>{t("helpImportantTitle")}</h3>
        <Paragraphs text={t("helpImportantBody")} />
        <section className="help-safety" aria-labelledby={`${title}-safety`}>
          <h3 id={`${title}-safety`}>{t("helpSafetyTitle")}</h3>
          <Paragraphs text={t("helpSafetyBody")} />
        </section>
        {additionalSections.map(([heading, body]) => (
          <section key={heading} aria-labelledby={`${title}-${heading}`}>
            <h3 id={`${title}-${heading}`}>{t(heading)}</h3>
            <Paragraphs text={t(body)} />
          </section>
        ))}
      </div>
    </dialog>
  );
}
