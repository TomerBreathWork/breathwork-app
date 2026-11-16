import type { Language, Translator } from '../i18n';
import type { useBreathingSession } from '../useBreathingSession';
import { SessionPanel } from './SessionPanel';
import { FlowerCandleCircle } from '../prototypes/FlowerCandleCircle';
import { PREPARATION_MS } from '../preparation';

export function FlowerCandleSession({t,language,session,restart,stop,onMute,muted}: {
 t:Translator;language:Language;session:ReturnType<typeof useBreathingSession>;
 restart:()=>void;stop:()=>void;onMute:()=>void;muted:boolean;
}) {
 const guidance:Translator=(key,values)=>key==='intro'?t('kidsTitle')
   :key==='inhaleHint'?`${t('kidsInhale')}\n${t('kidsNose')}`
   :key==='exhaleHint'?`${t('kidsExhale')}\n${t('kidsMouth')}`:t(key,values);
 if(session.status==='idle')return null;
 const preparationProgress=session.inPreparation?session.preparationElapsed/PREPARATION_MS:undefined;
 return <>
   <SessionPanel t={guidance} language={language} status={session.status} phase={session.phase}
     routes={{inhale:'nose',exhale:'mouth'}} remaining={(session.end-session.elapsed)/1000}
     preparing={session.preparing} preparationProgress={preparationProgress}
     circle={<FlowerCandleCircle t={t} language={language} status={session.status} phase={session.phase} preparationProgress={preparationProgress} />}
     restart={restart} stop={stop} pause={session.pause} resume={()=>void session.resume()}
     muted={muted} onMute={onMute} advanced={null} />
   <progress className="kids-progress" aria-label={t('kidsProgress')} max={session.end} value={session.elapsed} />
 </>;
}
