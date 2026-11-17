import type { IntroductionCue } from './recorded-introduction.ts';
export type BeeIntroductionStep='inhale'|'ears'|'hum';
/** Opening shows inhale; the final invitation retains the last single step. */
export function beeIntroductionStep(cue:IntroductionCue,previous:BeeIntroductionStep='inhale'):BeeIntroductionStep {
 return cue==='inhale'||cue==='ears'||cue==='hum'?cue:previous;
}
