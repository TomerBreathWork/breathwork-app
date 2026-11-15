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
import { SessionExitDialog } from "./components/SessionExitDialog";
import { useOfflineSupport } from "./useOfflineSupport";
import { Brand } from "./components/Brand";
import { AdvancedOptions } from "./components/AdvancedOptions";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionPanel } from "./components/SessionPanel";
import { InstallInvitation } from "./components/InstallInvitation";
import { AnalyticsConsent } from "./components/AnalyticsConsent";
import { analytics, type AnalyticsView } from "./analytics";
import "./style.css";
const settingsBackground = mediaUrl("media/backgrounds/3.webp")!;
function App() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [category, setCategory] = useState<Category | "all">("all");
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const [background, setBackground] = useState(settingsBackground);
  const [failedImage, setFailedImage] = useState("");
  const previousImage = useRef("");
  const { language, setLanguage, t } = useLanguage();
  const session = useBreathingSession(settings, language),
    active = session.status !== "idle";
  const navigation = useAppNavigation(session, settings, setSettings);
  const choosingPractice = navigation.screen.name === "home" && navigation.screen.mode !== "selected";
  const analyticsView: AnalyticsView = active
    ? session.status === "completed" ? "completed" : session.inPreparation ? "preparation" : "practice"
    : navigation.screen.name === "details" ? `details/${navigation.screen.id}`
      : navigation.screen.name === "library" ? "library" : "settings";
  useEffect(() => {
    analytics.open(analyticsView, language, import.meta.env.PROD);
  }, [analyticsView, language]);
  const { offlineStatus, beginPractice } = useOfflineSupport(
    session.status === "running" || session.status === "paused" || navigation.settling || navigation.exitPending,
    settings,
    navigation.snapshotForUpdate,
  );

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
    if (session.start()) {
      navigation.beginSession(settings);
      selectBackground(settings.background, true);
    }
  }
  function onPreset(key: PresetKey) {
    if (choosingPractice || settings.practiceId !== practiceForPreset(key))
      analytics.selectPractice(practiceForPreset(key), language);
    session.cancelPreparation();
    const next = { ...(settings.practiceId === practiceForPreset(key) ? settings : selectPreset(settings, key)),
      homePracticeSelected: true, practiceId: practiceForPreset(key) };
    setSettings(next);
    navigation.open({ name: "home", mode: "selected" }, next);
  }
  function onCustom() {
    if (choosingPractice || settings.practiceId !== "custom") analytics.selectPractice("custom", language);
    session.cancelPreparation();
    const next = { ...selectCustom(settings), homePracticeSelected: true, practiceId: "custom" };
    setSettings(next);
    navigation.open({ name: "home", mode: "selected" }, next);
  }
  function openPractice(id: PracticeId) {
    analytics.selectPractice(id, language);
    const practice = getPractice(id)!;
    session.cancelPreparation();
    const next = settings.practiceId === id ? { ...settings, homePracticeSelected: true } : {
      ...settings, homePracticeSelected: true, practiceId: id, preset: practice.preset, rhythm: [...practice.rhythm] as Settings["rhythm"], minutes: 3,
    };
    setSettings(next);
    navigation.open({ name: "details", id }, next);
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
      <AnalyticsConsent t={t} active={active} onVisibility={setPrivacyOpen} />
      <InstallInvitation t={t} home={!active && navigation.screen.name === "home"} privacyOpen={privacyOpen} />
      {navigation.exitPending && <SessionExitDialog t={t} stay={navigation.stay} end={navigation.endSession} settling={navigation.settling} />}
      <div className="app-view">
        <p className="sr-only" data-offline-status={offlineStatus} aria-live="polite">
          {t(offlineStatus)}
        </p>
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
            choosing={choosingPractice}
            chooseAnother={navigation.chooseHome}
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
            stop={navigation.endSession}
            muted={session.muted || settings.sound === "silent"}
            onMute={() => {
              if (settings.sound === "silent") {
                session.setMuted(false);
                patch({ sound: appDefaults.sound });
              } else session.setMuted(!session.muted);
            }}
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
