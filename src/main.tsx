import { PREPARATION_MS } from "./preparation";
import {
  getPractice,
  practiceForPreset,
  type PracticeId,
  type Category,
} from "./practices";
import { useAppNavigation } from "./useAppNavigation";
import { PracticeLibrary } from "./components/PracticeLibrary";
import { PracticeDetails } from "./components/PracticeDetails";
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
  const [category, setCategory] = useState<Category | "all">("all");
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [background, setBackground] = useState(settingsBackground);
  const [failedImage, setFailedImage] = useState("");
  const previousImage = useRef("");
  const { language, setLanguage, t } = useLanguage();
  const session = useBreathingSession(settings),
    active = session.status !== "idle";
  const navigation = useAppNavigation(active);
  const { offlineStatus, beginPractice } = useOfflineSupport(
    session.status === "running" || session.status === "paused",
    settings,
  );
  useSessionHistory(active, session.stop);
  useEffect(() => {
    if (navigation.screen.name !== "details" || active) return;
    const practice = getPractice(navigation.screen.id)!;
    setSettings((value) =>
      value.practiceId === practice.id
        ? value
        : {
            ...value,
            practiceId: practice.id,
            preset: practice.preset,
            rhythm: [...practice.rhythm],
            minutes: 3,
          },
    );
  }, [navigation.screen, active]);

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
  function patch(patch: Partial<Settings>, keepPractice = false) {
    if (patch.rhythm !== undefined || patch.minutes !== undefined)
      session.cancelPreparation();
    if (patch.sound !== undefined) void session.changeSound(patch.sound);
    if (patch.background !== undefined) selectBackground(patch.background);
    setSettings((value) => {
      const next =
        patch.rhythm !== undefined
          ? editRhythm({ ...value, ...patch }, patch.rhythm)
          : { ...value, ...patch };
      return patch.rhythm !== undefined && !keepPractice
        ? { ...next, practiceId: practiceForPreset(next.preset) }
        : next;
    });
  }
  async function start() {
    if (!valid) return;
    // Close the update/reload race before React commits the running screen.
    beginPractice();
    if (await session.start()) selectBackground(settings.background, true);
  }
  function onPreset(key: PresetKey) {
    session.cancelPreparation();
    setSettings((value) => ({
      ...selectPreset(value, key),
      practiceId: practiceForPreset(key),
    }));
  }
  function onCustom() {
    session.cancelPreparation();
    setSettings((value) => ({ ...selectCustom(value), practiceId: "custom" }));
  }
  function openPractice(id: PracticeId) {
    const practice = getPractice(id)!;
    session.cancelPreparation();
    setSettings((value) =>
      value.practiceId === id
        ? value
        : {
            ...value,
            practiceId: id,
            preset: practice.preset,
            rhythm: [...practice.rhythm],
            minutes: 3,
          },
    );
    navigation.open({ name: "details", id });
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
      className={`app-page ${active ? "session" : "settings-screen"} ${!active && navigation.screen.name !== "home" ? "discovery-screen" : ""}`}
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
        {!active && navigation.screen.name === "library" ? (
          <PracticeLibrary
            t={t}
            category={category}
            onCategory={setCategory}
            onSelect={openPractice}
            back={navigation.back}
          />
        ) : !active && navigation.screen.name === "details" ? (
          <PracticeDetails
            practice={getPractice(navigation.screen.id)!}
            t={t}
            language={language}
            settings={settings}
            patch={(p) => patch(p, true)}
            back={navigation.back}
            start={() => void start()}
            valid={valid}
            preparing={session.preparing}
          />
        ) : session.status === "idle" ? (
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
            explore={() => navigation.open({ name: "library" })}
            start={() => void start()}
          />
        ) : (
          <SessionPanel
            t={t}
            status={session.status}
            phase={session.phase}
            language={language}
            routes={
              getPractice(settings.practiceId)?.routes ?? {
                inhale: "nose",
                exhale: "nose",
              }
            }
            remaining={(session.end - session.elapsed) / 1000}
            preparing={session.preparing}
            preparationProgress={
              session.inPreparation
                ? session.preparationElapsed / PREPARATION_MS
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
