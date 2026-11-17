import {useEffect,useRef,useState} from 'react';
import type {Language,Translator} from '../i18n';
import type {Settings} from '../settings';
import {beeIntroductionStep,type BeeIntroductionStep} from '../bee-introduction';
import {beeRhythm} from '../bee-breathing';
import {useRecordedIntroduction} from '../useRecordedIntroduction';
import {BeeArtwork,type BeeArtworkKind} from './BeeArtwork';
import {RecordedIntroductionControls} from './RecordedIntroductionControls';
import {KidsParentInformation,KidsComfort} from './KidsParentInformation';
import {CompactLabel} from './CompactLabel';
import {SessionLength} from './BreathingControls';
import {Icon} from './Icons';
export function BeeIntroduction({t,language,settings,patch,start,back,preparing=false,onNarrationBusy,unlockAudio}:{
 t:Translator;language:Language;settings:Settings;patch:(p:Partial<Settings>)=>void;start:()=>void;back:()=>void;
 preparing?:boolean;onNarrationBusy?:(value:boolean)=>void;unlockAudio?:()=>void;
}){
 const primary=useRef<HTMLButtonElement>(null);
 const narration=useRecordedIntroduction(language,start,onNarrationBusy,unlockAudio,'bee-breathing');
 const [shownStep,setShownStep]=useState<BeeIntroductionStep>('inhale');
 useEffect(()=>{setShownStep(previous=>narration.active?beeIntroductionStep(narration.cue,previous):'inhale');},[narration.active,narration.cue]);
 const steps:[BeeArtworkKind,'beeStep1Title'|'beeStep2Title'|'beeStep3Title','beeStep1Body'|'beeStep2Body'|'beeStep3Body'][]=[
  ['inhale','beeStep1Title','beeStep1Body'],['ears','beeStep2Title','beeStep2Body'],['hum','beeStep3Title','beeStep3Body']];
 return <main className="discovery-panel glass-panel kids-details bee-details settings-panel" data-practice-detail="bee-breathing" data-narrating={narration.active} data-narration-paused={narration.status==='paused'} aria-label={t('beeTitle')} tabIndex={-1}>
  <div className="discovery-heading"><button type="button" className="text-button discovery-back" onClick={()=>{narration.controller.cancel();back();}}><CompactLabel>{t('goBack')}</CompactLabel></button><h2 tabIndex={-1}>{t('beeTitle')}</h2></div>
  <div className="discovery-scroll kids-intro-content">
   <div className={`kids-steps ${narration.active?'bee-narration-stage':''}`} data-narration-cue={narration.cue} data-shown-step={narration.active?shownStep:undefined}>
    {steps.map(([kind,title,body])=><section className="kids-step" key={kind} data-emphasized={false} data-visible={!narration.active||shownStep===kind} aria-hidden={narration.active&&shownStep!==kind}>
     <div className="kids-static-art"><BeeArtwork kind={kind} hummingText={kind==='hum'?t('beeHumCue'):undefined}/></div><div className="bee-step-copy"><h3><CompactLabel>{t(title)}</CompactLabel></h3><p><CompactLabel>{t(body)}</CompactLabel></p></div>
    </section>)}
   </div>
   <RecordedIntroductionControls narration={narration} t={t} primary={primary}/>
   <div className="bee-overview-controls" hidden={narration.active}>
   <p className="kids-settings-summary">{t('kidsSummary',{inhale:settings.rhythm[0],exhale:settings.rhythm[2],minutes:settings.minutes})}</p>
   <KidsParentInformation t={t} body="beeParentBody"/>
   <details className="kids-practice-settings"><summary>{t('kidsSettings')}</summary>
    {([0,2]as const).map(index=><div key={index} className="bee-timing-control"><label htmlFor={`bee-phase-${index}`}>{t(index===0?'kidsRhythm':'beeExhaleTime')}<output dir="ltr">{settings.rhythm[index]} {t('seconds')}</output></label>
     <input id={`bee-phase-${index}`} type="range" min={index===0?2:4} max={index===0?6:12} step="1" value={settings.rhythm[index]} onChange={event=>{const next=[...settings.rhythm];next[index]=Number(event.target.value);patch({rhythm:beeRhythm(next)});}}/>
     <div className="kids-range-scale" aria-hidden="true"><span>{index===0?2:4} {t('seconds')}</span><span>{index===0?6:12} {t('seconds')}</span></div></div>)}
    <SessionLength t={t} settings={settings} patch={patch}/>
   </details>
   <KidsComfort t={t}/>
   </div>
  </div>
  <button ref={primary} type="button" className="start-button" disabled={!narration.active&&preparing} onClick={narration.active?narration.controller.skip:narration.status==='error'?narration.controller.continueWithout:narration.controller.start}>
   <Icon name="play"/><CompactLabel>{t(narration.active?'kidsSkipIntroduction':narration.status==='error'?'kidsStartWithoutIntroduction':'start')}</CompactLabel>
  </button>
 </main>;
}
