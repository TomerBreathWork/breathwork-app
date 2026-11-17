import type { RefObject } from 'react';
import type { Translator } from '../i18n';
import type { useRecordedIntroduction } from '../useRecordedIntroduction';
export function RecordedIntroductionControls({narration,t,primary}:{
 narration:ReturnType<typeof useRecordedIntroduction>;t:Translator;primary:RefObject<HTMLButtonElement|null>;
}) {
 return <>{narration.available && <div className="kids-voice-controls">
        <label className="kids-voice-preference"><input type="checkbox" checked={narration.enabled}
          onChange={event=>narration.controller.setEnabled(event.target.checked)} />{t('kidsVoice')}</label>
        {!narration.active && (narration.acknowledged || !narration.enabled || narration.status==='error') &&
          <button type="button" className="text-button" onClick={()=>{narration.controller.replay();primary.current?.focus({preventScroll:true});}}>{t('kidsReplayIntroduction')}</button>}
        {narration.active && <div className="kids-narration-playback" role="group" aria-label={t('kidsNarrationPlaying')}>
          <span role="status">{t(narration.status==='paused'?'kidsNarrationPaused':'kidsNarrationPlaying')}</span>
          <button type="button" className="text-button" onClick={narration.status==='paused'?narration.controller.resume:narration.controller.pause}>
            {t(narration.status==='paused'?'resume':'pause')}</button>
        </div>}
        {narration.status==='error' && <p role="status">{t('kidsNarrationUnavailable')}</p>}
      </div>}</>;
}
