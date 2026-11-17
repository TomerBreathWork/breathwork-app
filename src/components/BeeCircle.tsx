import {useEffect,useState,type CSSProperties} from 'react';
const garden=new URL('../assets/bee/watercolor-garden.png',import.meta.url).href;
import type {Language,Translator} from '../i18n';
import type {SessionStatus} from '../useBreathingSession';
import {beeAt,beePath} from '../bee-breathing';
import {BreathingCircle} from './BreathingCircle';
import {BeeArtwork} from './BeeArtwork';
export function BeeCircle({t,language,status,phase,preparationProgress}:{
 t:Translator;language:Language;status:Exclude<SessionStatus,'idle'>;phase:{index:number;progress:number;remaining:number;duration:number};preparationProgress?:number;
}){
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 const pose=beeAt(phase.index,phase.progress,reduced);
 const visible=preparationProgress===undefined&&status!=='completed';
 return <div className="kids-circle bee-circle" style={{'--bee-garden':`url("${garden}")`} as CSSProperties}>
  <BreathingCircle t={t} language={language} status={status} phase={phase} preparationProgress={preparationProgress} routes={{inhale:'nose',exhale:'nose'}}/>
  {visible&&<div className="bee-flight-area" aria-hidden="true">
   {phase.index===2&&!reduced&&<svg className="bee-flight-guide" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={beePath}/></svg>}
   <div className="bee-flyer" data-progress={phase.progress} style={{left:`${pose.x}%`,top:`${pose.y}%`}}><BeeArtwork kind="bee"/></div>
  </div>}
 </div>;
}
