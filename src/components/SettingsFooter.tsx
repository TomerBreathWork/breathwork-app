import { useRef, useState } from "react";
import type { Translator } from "../i18n";
import { publicAppUrl, contactUrl } from "../links";
import { Icon } from "./Icons";
import { HelpDialog } from "./HelpDialog";
export function SettingsFooter({ t }: { t: Translator }) {
  const [help, setHelp] = useState(false),
    [fallback, setFallback] = useState(false),
    [sharing, setSharing] = useState(false),
    [status, setStatus] = useState<"linkCopied" | "copyManually" | "">("");
  const link = useRef<HTMLInputElement>(null);
  async function share() {
    setStatus("");
    setFallback(false);
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("appName"),
          text: t("shareMessage"),
          url: publicAppUrl,
        });
        return;
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
        return;
    } finally {
      setSharing(false);
    }
    setFallback(true);
  }
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(publicAppUrl);
      setStatus("linkCopied");
    } catch {
      setStatus("copyManually");
      link.current?.focus();
      link.current?.select();
    }
  }
  return (
    <footer className="settings-footer" aria-label={t("footerActions")}>
      <div className="footer-actions">
        <button
          type="button"
          className="footer-action"
          disabled={sharing}
          onClick={() => void share()}
        >
          <Icon name="share" />
          <span>{t("share")}</span>
        </button>
        <a
          className="footer-action"
          href={contactUrl(t("contactMessage"))}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="message" />
          <span>{t("contact")}</span>
        </a>
        <button
          type="button"
          className="footer-action"
          onClick={() => setHelp(true)}
        >
          <Icon name="help" />
          <span>{t("howToUse")}</span>
        </button>
      </div>
      {fallback && (
        <div className="share-fallback">
          <p>{t("shareFallback")}</p>
          <input
            ref={link}
            aria-label={t("appLink")}
            dir="ltr"
            value={publicAppUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            className="small-button"
            onClick={() => void copy()}
          >
            {t("copyLink")}
          </button>
        </div>
      )}
      <p className="footer-status" role="status">
        {status ? t(status) : ""}
      </p>
      {help && <HelpDialog t={t} onClose={() => setHelp(false)} />}
    </footer>
  );
}
