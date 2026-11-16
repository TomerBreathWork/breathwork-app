import { useEffect, useState } from 'react';
import { Brand } from '../components/Brand';
import { SessionExitDialog } from '../components/SessionExitDialog';
import { FlowerCandleIntroduction } from '../components/FlowerCandleIntroduction';
import { FlowerCandleSession } from '../components/FlowerCandleSession';
import { useLanguage } from '../i18n';
import { useBreathingSession } from '../useBreathingSession';
import { useAppNavigation } from '../useAppNavigation';
import { useOfflineSupport } from '../useOfflineSupport';
import { loadSettings, type Settings } from '../settings';
import { kidsSessionSettings, loadKidsSettings, normalizeKidsSettings, saveKidsSettings } from '../kids-settings';
import { mediaUrl } from '../media';
import { preloadFlowerCandleArt } from './FlowerCandleCircle';
import './flower-candle.css';

/** Retained development entry uses the same introduction, renderer and engine. */
export default function FlowerCandlePrototype() {
  const {language,setLanguage,t}=useLanguage();
  const [adult]=useState(loadSettings);
  const [settings,setSettings]=useState(()=>kidsSessionSettings(adult,loadKidsSettings()));
  useEffect(preloadFlowerCandleArt,[]);
  useEffect(()=>saveKidsSettings(normalizeKidsSettings(settings)),[settings]);
  const session=useBreathingSession(settings,language);
  const navigation=useAppNavigation({...session,stop:()=>session.stop(session.status==='completed')},settings,setSettings,
    (_view,draft)=>{if(draft?.practiceId==='flower-candle')setSettings(kidsSessionSettings(adult,normalizeKidsSettings(draft)));return true;});
  const [narrationBusy,setNarrationBusy]=useState(false);
  const active=session.status!=='idle';
  const {beginPractice}=useOfflineSupport(narrationBusy||active||navigation.settling||navigation.exitPending,adult,navigation.snapshotForUpdate);
  useEffect(()=>{if(session.status==='completed')navigation.endSession();},[session.status,navigation.endSession]);
  const start=()=>{beginPractice();if(session.start())navigation.beginSession(settings);};
  const patch=(p:Partial<Settings>)=>setSettings(value=>kidsSessionSettings(adult,normalizeKidsSettings({...value,...p})));
  return <div className={`app-page kids-prototype ${active?'session':'settings-screen discovery-screen'}`} lang={language} dir={language==='he'?'rtl':'ltr'}>
    <img className="scenery" src={mediaUrl('media/backgrounds/3.webp')??undefined} alt="" /><div className="scene-overlay" />
    {navigation.exitPending&&<SessionExitDialog t={t} stay={navigation.stay} end={navigation.endSession} settling={navigation.settling} />}
    <div className="app-view"><Brand t={t} language={language} onLanguage={active?undefined:setLanguage} />
      {!active?<FlowerCandleIntroduction t={t} language={language} settings={settings} patch={patch} start={start} preparing={session.preparing}
        onNarrationBusy={value=>{if(value)beginPractice();setNarrationBusy(value);}}
        unlockAudio={()=>{session.cancelPreparation();void session.unlockAudio();}} />
        :<FlowerCandleSession t={t} language={language} session={session} restart={start} stop={navigation.endSession}
          muted={session.muted||settings.sound==='silent'} onMute={()=>{
            if(settings.sound==='silent'){session.setMuted(false);setSettings(value=>({...value,sound:'recordings'}));}
            else session.setMuted(!session.muted);
          }} />}
    </div>
  </div>;
}
