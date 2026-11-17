import type {Language,Translator} from '../i18n';
import type {useBreathingSession} from '../useBreathingSession';
import {PREPARATION_MS} from '../preparation';
import {SessionPanel} from './SessionPanel';
import {BeeCircle} from './BeeCircle';
export function BeeSession({t,language,session,restart,stop,onMute,muted}:{
 t:Translator;language:Language;session:ReturnType<typeof useBreathingSession>;restart:()=>void;stop:()=>void;onMute:()=>void;muted:boolean;
}){
 if(session.status==='idle')return null;
 const guidance:Translator=(key,values)=>key==='intro'?t('beeTitle'):key==='inhaleHint'?t('beeInhaleHint'):key==='exhaleHint'?t('beeExhaleHint'):t(key,values);
 const preparationProgress=session.inPreparation?session.preparationElapsed/PREPARATION_MS:undefined;
 return <><SessionPanel t={guidance} language={language} status={session.status} phase={session.phase} routes={{inhale:'nose',exhale:'nose'}} remaining={(session.end-session.elapsed)/1000}
  preparing={session.preparing} preparationProgress={preparationProgress} circle={<BeeCircle t={t} language={language} status={session.status} phase={session.phase} preparationProgress={preparationProgress}/>}
  restart={restart} stop={stop} pause={session.pause} resume={()=>void session.resume()} muted={muted} onMute={onMute} advanced={null}/>
  <progress className="kids-progress" aria-label={t('kidsProgress')} max={session.end} value={session.elapsed}/></>;
}
