import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { appDefaults, chooseBackground, mediaUrl } from "./media";
import { validConfiguredRhythm } from "./duration-controls";
import { loadSettings, type Settings } from "./settings";
import {
  editRhythm,
  selectPreset,
  selectCustom,
  type PresetKey,
} from "./presets";
import { useLanguage } from "./i18n";
import { useBreathingSession } from "./useBreathingSession";
import { useSessionHistory } from "./useSessionHistory";
import { useOfflineSupport } from "./useOfflineSupport";
import { Brand } from "./components/Brand";
import { AdvancedOptions } from "./components/AdvancedOptions";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionPanel } from "./components/SessionPanel";
import "./style.css";
const settingsBackground = mediaUrl("media/backgrounds/3.webp")!;
function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [background, setBackground] = useState(settingsBackground);
  const [failedImage, setFailedImage] = useState("");
  const previousImage = useRef("");
  const { language, setLanguage, t } = useLanguage();
  const session = useBreathingSession(settings),
    active = session.status !== "idle";
  const { offlineStatus, beginPractice } = useOfflineSupport(
    session.status === "running" || session.status === "paused",
  );
  useSessionHistory(active, session.stop);
  const displayedBackground = active ? background : settingsBackground;
  const valid =
    validConfiguredRhythm(settings.rhythm) &&
    Number.isFinite(settings.minutes) &&
    settings.minutes >= 1 &&
    settings.minutes <= 120;
  useEffect(() => {
    if (valid)
      try {
        localStorage.setItem("still-settings", JSON.stringify(settings));
      } catch {}
  }, [settings, valid]);
  function selectBackground(selection: string, starting = false) {
    const asset = chooseBackground(selection, previousImage.current);
    setBackground(asset?.url || "");
    if (asset && (starting || active)) previousImage.current = asset.id;
    setFailedImage("");
  }
  function patch(patch: Partial<Settings>) {
    if (patch.rhythm !== undefined || patch.minutes !== undefined)
      session.cancelPreparation();
    if (patch.sound !== undefined) void session.changeSound(patch.sound);
    if (patch.background !== undefined) selectBackground(patch.background);
    setSettings((value) =>
      patch.rhythm !== undefined
        ? editRhythm({ ...value, ...patch }, patch.rhythm)
        : { ...value, ...patch },
    );
  }
  async function start() {
    if (!valid) return;
    // Close the update/reload race before React commits the running screen.
    beginPractice();
    if (await session.start()) selectBackground(settings.background, true);
  }
  function onPreset(key: PresetKey) {
    session.cancelPreparation();
    setSettings((value) => selectPreset(value, key));
  }
  function onCustom() {
    session.cancelPreparation();
    setSettings(selectCustom);
  }
  function reset() {
    session.cancelPreparation();
    setSettings({ ...appDefaults });
    session.setMuted(false);
    selectBackground(appDefaults.background);
  }
  const advanced = (
    <AdvancedOptions
      t={t}
      settings={settings}
      patch={patch}
      muted={session.muted}
      onMute={() => session.setMuted(!session.muted)}
      onPreview={() => void session.preview()}
      onReset={active ? undefined : reset}
      audioStatus={session.audioStatus}
      disablePreview={session.inPreparation}
      offlineStatus={offlineStatus}
    />
  );
  return (
    <div
      className={`app-page ${active ? "session" : "settings-screen"}`}
      dir={language === "he" ? "rtl" : "ltr"}
      lang={language}
    >
      {displayedBackground && displayedBackground !== failedImage && (
        <img
          className="scenery"
          src={displayedBackground}
          alt=""
          decoding="async"
          onError={() => setFailedImage(displayedBackground)}
        />
      )}
      <div className="scene-overlay" />
      <div className="app-view">
        <Brand
          t={t}
          language={language}
          onLanguage={active ? undefined : setLanguage}
        />
        {session.status === "idle" ? (
          <SettingsPanel
            t={t}
            language={language}
            settings={settings}
            onCustom={onCustom}
            onPreset={onPreset}
            patch={patch}
            advanced={advanced}
            valid={valid}
            preparing={session.preparing}
            start={() => void start()}
          />
        ) : (
          <SessionPanel
            t={t}
            status={session.status}
            phase={session.phase}
            language={language}
            remaining={(session.end - session.elapsed) / 1000}
            preparing={session.preparing}
            preparationProgress={
              session.inPreparation
                ? session.preparationElapsed / 5000
                : undefined
            }
            restart={() => void start()}
            pause={session.pause}
            resume={() => void session.resume()}
            stop={session.stop}
            advanced={advanced}
          />
        )}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
