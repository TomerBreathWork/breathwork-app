import { KidsParentInformation, KidsComfort } from './KidsParentInformation';
import { RecordedIntroductionControls } from './RecordedIntroductionControls';
import { useRef } from 'react';
import type { Language, Translator } from '../i18n';
import type { Settings } from '../settings';
import { FlowerCandleStill } from '../prototypes/FlowerCandleCircle';
import { flowerCandleRhythm } from '../flower-candle';
import { SessionLength } from './BreathingControls';
import { CompactLabel } from './CompactLabel';
import { Icon } from './Icons';
import { useRecordedIntroduction } from '../useRecordedIntroduction';

/** Static instructions and a single Start boundary; narration can attach later. */
export function FlowerCandleIntroduction({t,language,settings,patch,start,back,preparing=false,onNarrationBusy,unlockAudio}: {
  t:Translator;language:Language;settings:Settings;patch:(p:Partial<Settings>)=>void;
  start:()=>void;back?:()=>void;preparing?:boolean;onNarrationBusy?:(value:boolean)=>void;unlockAudio?:()=>void;
}) {
  const primary=useRef<HTMLButtonElement>(null);
  const narration=useRecordedIntroduction(language,start,onNarrationBusy,unlockAudio);
  return <main className="discovery-panel glass-panel kids-details settings-panel" data-practice-detail="flower-candle" aria-label={t('kidsTitle')} tabIndex={-1}>
    <div className="discovery-heading">
      {back && <button className="text-button discovery-back" onClick={()=>{narration.controller.cancel();back();}}><CompactLabel>{t('goBack')}</CompactLabel></button>}
      <h2 tabIndex={-1}>{t('kidsTitle')}</h2>
    </div>
    <div className="discovery-scroll kids-intro-content">
      <div className="kids-steps" data-narration-cue={narration.cue}>
        {(['flower','candle'] as const).map((kind,i)=><section className="kids-step" key={kind} data-emphasized={narration.cue===kind}>
          <FlowerCandleStill kind={kind} />
          <div><h3><CompactLabel>{t(i===0?'kidsStep1Title':'kidsStep2Title')}</CompactLabel></h3>
            <p><CompactLabel>{t(i===0?'kidsStep1Body':'kidsStep2Body')}</CompactLabel></p></div>
        </section>)}
      </div>
      <RecordedIntroductionControls narration={narration} t={t} primary={primary} />
      <p className="kids-settings-summary" aria-live="polite">{t('kidsSummary',{inhale:settings.rhythm[0],exhale:settings.rhythm[2],minutes:settings.minutes})}</p>
      <details className="kids-practice-settings">
        <summary>{t('kidsSettings')}</summary>
        <label htmlFor="kids-inhale">{t('kidsRhythm')} <output dir="ltr">{settings.rhythm[0]} {t('seconds')}</output></label>
        <input id="kids-inhale" type="range" min="1" max="6" step="1" value={settings.rhythm[0]}
          onChange={event=>patch({rhythm:flowerCandleRhythm(Number(event.target.value))})} />
        <div className="kids-range-scale" aria-hidden="true"><span>1 {t("seconds")}</span><span>6 {t("seconds")}</span></div>
        <p className="kids-ratio">{t('kidsCalculated',{seconds:settings.rhythm[2]})}</p>
        <SessionLength t={t} settings={settings} patch={patch} />
      </details>
      <KidsParentInformation t={t} body="flowerParentBody" />
      <KidsComfort t={t} />
    </div>
    <button ref={primary} type="button" className="start-button" onClick={narration.active?narration.controller.skip:narration.status==='error'?narration.controller.continueWithout:narration.controller.start} disabled={!narration.active && preparing}><Icon name="play" /><CompactLabel>{t(narration.active?'kidsSkipIntroduction':narration.status==='error'?'kidsStartWithoutIntroduction':'start')}</CompactLabel></button>
    <span className="sr-only" lang={language}>{t('finishHint')}</span>
  </main>;
}
