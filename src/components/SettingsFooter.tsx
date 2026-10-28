import { CompactLabel } from "./CompactLabel";
import { useRef, useState } from "react";
import type { Translator } from "../i18n";
import { publicAppUrl, contactUrl } from "../links";
import { Icon } from "./Icons";
import { HelpDialog } from "./HelpDialog";
const helpSeenKey = "breath-flow-help-seen";
let helpOpenedThisVisit = false;
function firstVisitAttention() {
  if (helpOpenedThisVisit) return false;
  try {
    return localStorage.getItem(helpSeenKey) !== "1";
  } catch {
    return true;
  }
}
export function SettingsFooter({ t }: { t: Translator }) {
  const [attention, setAttention] = useState(firstVisitAttention);
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
          <span><CompactLabel>{t("share")}</CompactLabel></span>
        </button>
        <a
          className="footer-action"
          href={contactUrl(t("contactMessage"))}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="message" />
          <span><CompactLabel>{t("contact")}</CompactLabel></span>
        </a>
        <button
          type="button"
          className={`footer-action help-action ${attention ? "help-attention" : ""}`}
          onClick={() => {
            helpOpenedThisVisit = true;
            setAttention(false);
            try {
              localStorage.setItem(helpSeenKey, "1");
            } catch { /* Keep the current visit calm even with restricted storage. */ }
            setHelp(true);
          }}
        >
          <Icon name="help" />
          <span><CompactLabel>{t("howToUse")}</CompactLabel></span>
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
            <CompactLabel>{t("copyLink")}</CompactLabel>
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
