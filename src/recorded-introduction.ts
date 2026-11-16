/** Recorded introduction only: never owns a breathing clock or bowl scheduler. */
export type IntroductionCue = 'balanced' | 'flower' | 'candle';
export type IntroductionStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface IntroductionRecording {
  src: string;
  cues?: { flower: number; candle: number; balanced: number };
}
export const introductionPreferenceKey = 'breath-flow-flower-candle-introduction';
export interface IntroductionPreference { enabled: boolean; acknowledged: boolean }
export function readIntroductionPreference(storage?: Pick<Storage,'getItem'>): IntroductionPreference {
  try {
    const value=JSON.parse(storage?.getItem(introductionPreferenceKey)??'null')?.he;
    return {enabled: value?.enabled!==false, acknowledged:value?.acknowledged===true};
  } catch { return {enabled:true,acknowledged:false}; }
}
export function introductionCueAt(time: number, cues?: IntroductionRecording['cues']): IntroductionCue {
  if(!cues || time<cues.flower || time>=cues.balanced)return 'balanced';
  return time<cues.candle?'flower':'candle';
}
export interface IntroductionSnapshot extends IntroductionPreference {
  available: boolean; status: IntroductionStatus; cue: IntroductionCue; continuesToPractice: boolean;
}
interface Actions { start:()=>void; busy:(value:boolean)=>void; unlock:()=>void; hidden:()=>boolean }
/** Generation checks and detached handlers make Start/Skip/ended mutually exclusive. */
export class RecordedIntroduction {
  private value:IntroductionSnapshot;
  private listeners=new Set<()=>void>();
  private recording?:IntroductionRecording;
  private audio?:HTMLAudioElement;
  private detach?:()=>void;
  private serial=0;
  private handedOff=false;
  private actions:Actions;
  private createAudio:(src:string)=>HTMLAudioElement;
  private storage?:Pick<Storage,'getItem'|'setItem'>;
  constructor(actions:Actions,createAudio:(src:string)=>HTMLAudioElement,
    storage?:Pick<Storage,'getItem'|'setItem'>) {
    this.actions=actions;this.createAudio=createAudio;this.storage=storage;
    this.value={...readIntroductionPreference(storage),available:false,status:'idle',cue:'balanced',continuesToPractice:false};
  }
  getSnapshot=()=>this.value;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private update(patch:Partial<IntroductionSnapshot>) {
    this.value={...this.value,...patch};this.listeners.forEach(listener=>listener());
  }
  private save(patch:Partial<IntroductionPreference>) {
    this.update(patch);
    try {this.storage?.setItem(introductionPreferenceKey,JSON.stringify({version:1,he:{enabled:this.value.enabled,acknowledged:this.value.acknowledged}}));}catch{/* Storage restrictions never block practice. */}
  }
  configure(recording?:IntroductionRecording) {
    if(this.recording===recording)return;
    this.cancel();this.recording=recording;this.update({available:!!recording});
  }
  private stopAudio() {
    this.serial++;this.detach?.();this.detach=undefined;
    const audio=this.audio;this.audio=undefined;
    if(audio){audio.pause();audio.removeAttribute('src');audio.load();}
  }
  cancel=()=>{this.stopAudio();this.handedOff=false;this.update({status:'idle',cue:'balanced',continuesToPractice:false});this.actions.busy(false);};
  setEnabled=(enabled:boolean)=>{this.cancel();this.save({enabled});};
  private handoff() {
    if(this.handedOff || this.actions.hidden())return;
    this.handedOff=true;this.actions.busy(true);this.actions.unlock();this.actions.start();
  }
  start=()=>{
    if(this.handedOff || ['loading','playing','paused'].includes(this.value.status))return;
    if(!this.recording || !this.value.enabled || this.value.acknowledged){this.handoff();return;}
    this.play(true);
  };
  replay=()=>{if(!this.handedOff && this.recording && !['loading','playing','paused'].includes(this.value.status))this.play(false);};
  private play(continuesToPractice:boolean) {
    this.stopAudio();this.handedOff=false;this.actions.busy(true);this.actions.unlock();
    this.update({status:'loading',cue:'balanced',continuesToPractice});
    const ticket=this.serial;
    let audio:HTMLAudioElement;
    try {audio=this.createAudio(this.recording!.src);}catch{this.fail(ticket);return;}
    this.audio=audio;audio.preload='auto';audio.volume=1;
    const valid=()=>ticket===this.serial && audio===this.audio;
    const time=()=>{if(valid())this.update({cue:introductionCueAt(audio.currentTime,this.recording?.cues)});};
    const ended=()=>{
      if(!valid() || !['playing','loading'].includes(this.value.status))return;
      this.complete();
    };
    const error=()=>{if(valid())this.fail(ticket);};
    const externalPause=()=>{if(valid() && !audio.ended && this.value.status==='playing')this.update({status:'paused'});};
    audio.addEventListener('timeupdate',time);audio.addEventListener('ended',ended);audio.addEventListener('error',error);audio.addEventListener('pause',externalPause);
    this.detach=()=>{audio.removeEventListener('timeupdate',time);audio.removeEventListener('ended',ended);audio.removeEventListener('error',error);audio.removeEventListener('pause',externalPause);};
    this.playAudio(ticket,audio);
  }
  private complete() {
    if(this.actions.hidden()){this.pause();return;}
    const proceed=this.value.continuesToPractice;
    this.stopAudio();this.save({acknowledged:true});this.update({status:'idle',cue:'balanced',continuesToPractice:false});
    if(proceed)this.handoff();else this.actions.busy(false);
  }
  private playAudio(ticket:number,audio:HTMLAudioElement) {
    if(this.actions.hidden()){this.update({status:'paused'});return;}
    this.update({status:'playing'});
    try {void audio.play().then(()=>{
      if(ticket!==this.serial || this.audio!==audio)return;
      if(this.actions.hidden() || this.value.status==='paused'){audio.pause();this.update({status:'paused'});}
    }).catch(()=>{if(ticket===this.serial && this.audio===audio)this.fail(ticket);});}
    catch{this.fail(ticket);}
  }
  private fail(ticket:number) {
    if(ticket!==this.serial)return;
    this.stopAudio();this.update({status:'error',cue:'balanced'});this.actions.busy(false);
  }
  pause=()=>{if(this.audio && ['playing','loading'].includes(this.value.status)){this.update({status:'paused'});this.audio.pause();}};
  resume=()=>{if(this.audio && this.value.status==='paused'){this.actions.unlock();if(this.audio.ended)this.complete();else this.playAudio(this.serial,this.audio);}};
  skip=()=>{
    if(!['loading','playing','paused','error'].includes(this.value.status))return;
    const proceed=this.value.continuesToPractice;
    this.stopAudio();this.save({acknowledged:true});this.update({status:'idle',cue:'balanced',continuesToPractice:false});
    if(proceed)this.handoff();else this.actions.busy(false);
  };
  continueWithout=()=>{this.stopAudio();this.save({acknowledged:true});this.update({status:'idle',cue:'balanced',continuesToPractice:false});this.handoff();};
}
