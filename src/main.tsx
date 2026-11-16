import { PREPARATION_MS } from "./preparation";
import {
  getPractice,
  practiceForPreset,
  type PracticeId,
} from "./practices";
import { useAppNavigation } from "./useAppNavigation";
import { PracticeLibrary } from "./components/PracticeLibrary";
import { PracticeDetails } from "./components/PracticeDetails";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { appDefaults, chooseBackground, mediaUrl } from "./media";
import { validConfiguredRhythm } from "./duration-controls";
import { loadSettings, launchNavigation, type Settings } from "./settings";
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
import { FlowerCandleIntroduction } from "./components/FlowerCandleIntroduction";
import { FlowerCandleSession } from "./components/FlowerCandleSession";
import { preloadFlowerCandleArt } from "./prototypes/FlowerCandleCircle";
import { kidsSessionSettings, loadKidsSettings, normalizeKidsSettings, saveKidsSettings } from "./kids-settings";
import { SessionPanel } from "./components/SessionPanel";
import { InstallInvitation } from "./components/InstallInvitation";
import { AnalyticsConsent } from "./components/AnalyticsConsent";
import { analytics, type AnalyticsView } from "./analytics";
import "./style.css";
import "./prototypes/flower-candle.css";
const FlowerCandlePrototype = import.meta.env.DEV
  ? React.lazy(() => import("./prototypes/FlowerCandlePrototype"))
  : () => null;
const settingsBackground = mediaUrl("media/backgrounds/3.webp")!;
function App() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [narrationBusy,setNarrationBusy]=useState(false);
  const [adultSettings, setAdultSettings] = useState<Settings>(loadSettings);
  const launchView = launchNavigation?.current.view;
  const launchSetup = launchView?.name === "session" ? launchView.returnTo : launchView;
  const launchKids = launchSetup?.name === "details" && launchSetup.id === "flower-candle";
  const [kidsSelected, setKidsSelected] = useState(!!launchKids);
  const [kidsSettings, setKidsSettings] = useState(() => launchKids && launchNavigation?.current.draft?.practiceId === "flower-candle"
    ? normalizeKidsSettings(launchNavigation.current.draft) : loadKidsSettings());
  const settings = useMemo(() => kidsSelected ? kidsSessionSettings(adultSettings,kidsSettings) : adultSettings,
    [adultSettings,kidsSettings,kidsSelected]);
  useEffect(() => saveKidsSettings(kidsSettings),[kidsSettings]);
  useEffect(() => { if (kidsSelected) preloadFlowerCandleArt(); },[kidsSelected]);

  const [background, setBackground] = useState(settingsBackground);
  const [failedImage, setFailedImage] = useState("");
  const previousImage = useRef("");
  const { language, setLanguage, t } = useLanguage();
  const session = useBreathingSession(settings, language),
    active = session.status !== "idle";
  const navigation = useAppNavigation({ ...session, stop: () => session.stop(kidsSelected && session.status === "completed") }, settings, setAdultSettings,
    (view,draft) => {
      const kids = view.name === "details" && view.id === "flower-candle";
      setKidsSelected(kids);
      if (kids) {
        if (draft?.practiceId === "flower-candle") setKidsSettings(normalizeKidsSettings(draft));
        return true;
      }
      return false;
    });
  const category = navigation.screen.name === "library" ? navigation.screen.filter ?? "all" : "all";
  useEffect(() => {
    if (kidsSelected && session.status === "completed") navigation.endSession();
  },[kidsSelected,session.status,navigation.endSession]);
  const choosingPractice = navigation.screen.name === "home" && navigation.screen.mode !== "selected";
  const analyticsView: AnalyticsView = active
    ? session.status === "completed" ? "completed" : session.inPreparation ? "preparation" : "practice"
    : navigation.screen.name === "details" ? `details/${navigation.screen.id}`
      : navigation.screen.name === "library" ? "library" : "settings";
  useEffect(() => {
    analytics.open(analyticsView, language, import.meta.env.PROD);
  }, [analyticsView, language]);
  const { offlineStatus, beginPractice } = useOfflineSupport(
    narrationBusy || session.status === "running" || session.status === "paused" || navigation.settling || navigation.exitPending,
    adultSettings,
    navigation.snapshotForUpdate,
  );

  const displayedBackground = kidsSelected ? settingsBackground : active ? background : settingsBackground;
  const valid =
    validConfiguredRhythm(settings.rhythm) &&
    Number.isFinite(settings.minutes) &&
    settings.minutes >= 1 &&
    settings.minutes <= 120;
  useEffect(() => {
    if (validConfiguredRhythm(adultSettings.rhythm) && Number.isFinite(adultSettings.minutes) && adultSettings.minutes >= 1 && adultSettings.minutes <= 120)
      try { localStorage.setItem("still-settings",JSON.stringify(adultSettings)); } catch {}
  },[adultSettings]);
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
    if (kidsSelected) {
      if (patch.rhythm !== undefined || patch.minutes !== undefined)
        setKidsSettings(value => normalizeKidsSettings({...value,...patch}));
      const {rhythm: _rhythm, minutes: _minutes, practiceId: _id, preset: _preset, customRhythm: _custom, homePracticeSelected: _selected, ...shared} = patch;
      if (Object.keys(shared).length) setAdultSettings(value=>({...value,...shared}));
      return;
    }
    setAdultSettings((value) => {
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
      if (!kidsSelected) selectBackground(settings.background, true);
    }
  }
  function onPreset(key: PresetKey) {
    if (choosingPractice || settings.practiceId !== practiceForPreset(key))
      analytics.selectPractice(practiceForPreset(key), language);
    session.cancelPreparation();
    const next = { ...(adultSettings.practiceId === practiceForPreset(key) ? adultSettings : selectPreset(adultSettings, key)),
      homePracticeSelected: true, practiceId: practiceForPreset(key) };
    setKidsSelected(false);
    setAdultSettings(next);
    navigation.open({ name: "home", mode: "selected" }, next);
  }
  function onCustom() {
    if (choosingPractice || settings.practiceId !== "custom") analytics.selectPractice("custom", language);
    session.cancelPreparation();
    const next = { ...selectCustom(adultSettings), homePracticeSelected: true, practiceId: "custom" };
    setKidsSelected(false);
    setAdultSettings(next);
    navigation.open({ name: "home", mode: "selected" }, next);
  }
  function openPractice(id: PracticeId) {
    analytics.selectPractice(id, language);
    const practice = getPractice(id)!;
    session.cancelPreparation();
    if (practice.audience === "kids") {
      navigation.open({name:"details",id},kidsSessionSettings(adultSettings,kidsSettings));
      return;
    }
    const next = adultSettings.practiceId === id ? { ...adultSettings, homePracticeSelected: true } : {
      ...adultSettings, homePracticeSelected: true, practiceId: id, preset: practice.preset, rhythm: [...practice.rhythm] as Settings["rhythm"], minutes: 3,
    };
    setAdultSettings(next);
    navigation.open({ name: "details", id }, next);
  }
  function reset() {
    session.cancelPreparation();
    setAdultSettings({ ...appDefaults });
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
      className={`app-page ${active ? "session" : "settings-screen"} ${!active && navigation.screen.name !== "home" ? "discovery-screen" : ""} ${kidsSelected ? "kids-prototype" : ""}`}
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
      <AnalyticsConsent t={t} active={active || narrationBusy} onVisibility={setPrivacyOpen} />
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
            onCategory={navigation.filterLibrary}
            onSelect={openPractice}
            back={navigation.back}
          />
        ) : !active && navigation.screen.name === "details" && navigation.screen.id === "flower-candle" ? (
          <FlowerCandleIntroduction t={t} language={language} settings={settings} patch={patch}
            back={navigation.back} start={() => void start()} preparing={session.preparing}
            onNarrationBusy={value=>{if(value)beginPractice();setNarrationBusy(value);}}
            unlockAudio={()=>{session.cancelPreparation();void session.unlockAudio();}} />
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
        ) : kidsSelected ? (
          <FlowerCandleSession t={t} language={language} session={session} restart={() => void start()}
            stop={navigation.endSession} muted={session.muted || settings.sound === "silent"}
            onMute={() => { if (settings.sound === "silent") { session.setMuted(false);patch({sound:appDefaults.sound}); }
              else session.setMuted(!session.muted); }} />
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
    {import.meta.env.DEV && new URLSearchParams(location.search).get("prototype") === "flower-candle"
      ? <React.Suspense fallback={null}><FlowerCandlePrototype /></React.Suspense>
      : <App />}
  </React.StrictMode>,
);
