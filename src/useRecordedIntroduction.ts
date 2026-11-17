import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Language } from './i18n';
import { RecordedIntroduction, type IntroductionRecording } from './recorded-introduction';

const hebrewRecording:IntroductionRecording={
  src:new URL('./assets/narration/miya flower mastered.mp3',import.meta.url).href,
  // Approximate spoken boundaries confirmed by the product owner for this file.
  cues:{flower:8,candle:14,balanced:23},
};
const beeRecording:IntroductionRecording={
  src:new URL('./assets/narration/miya bee master.mp3',import.meta.url).href,
  // Approximate boundaries confirmed by the owner for Miya's Bee recording.
  timeline:[{at:3,cue:'inhale'},{at:7,cue:'ears'},{at:13,cue:'hum'},{at:29,cue:'balanced'}],
};
export function useRecordedIntroduction(language:Language,start:()=>void,busy?:(value:boolean)=>void,unlock?:()=>void,practice:'flower-candle'|'bee-breathing'='flower-candle') {
  const latest=useRef({start,busy,unlock});latest.current={start,busy,unlock};
  const [controller]=useState(()=>{
    let storage:Storage|undefined;try{storage=localStorage;}catch{/* Restricted storage is optional. */}
    return new RecordedIntroduction({start:()=>latest.current.start(),busy:value=>latest.current.busy?.(value),
      unlock:()=>latest.current.unlock?.(),hidden:()=>document.hidden},src=>new Audio(src),storage,practice==='bee-breathing'?'breath-flow-bee-introduction':undefined);
  });
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  useLayoutEffect(()=>{controller.configure(language==='he'?(practice==='bee-breathing'?beeRecording:hebrewRecording):undefined);return controller.cancel;},[controller,language,practice]);
  useEffect(()=>{
    const hide=()=>{if(document.hidden)controller.pause();};
    const pagehide=()=>controller.cancel();
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',pagehide);
    return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',pagehide);};
  },[controller]);
  return {...state,controller,active:['loading','playing','paused'].includes(state.status)};
}
