import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {phaseAt, finishAt, validRhythm, labels, type Rhythm} from './engine';
import {appDefaults, mediaAssets, fallbackAssets, selectableBackgrounds, chooseBackground, soundSets, hasRecordings} from './media';
import {BowlAudio} from './audio';
import './style.css';
type Settings = typeof appDefaults;
type Status = 'idle'|'running'|'paused'|'completed';
const presets: {name:string;note:string;rhythm:Rhythm}[] = [
 {name:'Slow & steady',note:'4 · 0 · 6 · 0',rhythm:[4,0,6,0]},
 {name:'Box breathing',note:'4 · 4 · 4 · 4',rhythm:[4,4,4,4]},
 {name:'Evening unwind',note:'4 · 7 · 8 · 0',rhythm:[4,7,8,0]}
];
function load():Settings {try {const s=JSON.parse(localStorage.getItem('still-settings')||'null');if(s && Array.isArray(s.rhythm) && s.rhythm.length===4 && validRhythm(s.rhythm) && s.minutes>=1 && s.minutes<=120 && ['bowls','recordings','silent'].includes(s.sound) && Number.isFinite(s.volume) && s.volume>=0 && s.volume<=1)return {...s,background:['random','gradient',...mediaAssets.map(a=>a.id),...fallbackAssets.map(a=>a.id)].includes(s.background)?s.background:'random'};}catch{}return {...appDefaults};}
const clockText=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
function App(){
 const [settings,setSettings]=useState<Settings>(load);
 const [status,setStatus]=useState<Status>('idle');
 const [elapsed,setElapsed]=useState(0);
 const [more,setMore]=useState(false);
 const [background,setBackground]=useState('');
 const [imageFailed,setImageFailed]=useState(false);
 const [muted,setMuted]=useState(false);
 const [preparing,setPreparing]=useState(false);
 const [audioStatus,setAudioStatus]=useState('Synthesized singing bowls · C4 / G3 / C4 / E4');
 const operation=useRef(0);
 const audio=useRef(new BowlAudio());
 const base=useRef(0), origin=useRef(0),previousImage=useRef('');
 const end=validRhythm(settings.rhythm)?finishAt(settings.minutes,settings.rhythm):0;
 const phase=validRhythm(settings.rhythm)?phaseAt(Math.min(elapsed,Math.max(0,end-0.01)),settings.rhythm):{index:0,progress:0,remaining:0,key:''};
 const valid=validRhythm(settings.rhythm)&&Number.isFinite(settings.minutes)&&settings.minutes>=1&&settings.minutes<=120;
 useEffect(()=>{if(valid)try{localStorage.setItem('still-settings',JSON.stringify(settings))}catch{}},[settings,valid]);
 useEffect(()=>{
  if(status!=='running')return;
  let frame=0;
  const tick=()=>{const now=base.current+performance.now()-origin.current;if(now>=end){setElapsed(end);setStatus('completed');audio.current.stop();return;}setElapsed(now);frame=requestAnimationFrame(tick)};
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[status,end]);
 useEffect(()=>{audio.current.setVolume(settings.volume)},[settings.volume]);
 useEffect(()=>{
  if(status==='running'&&!muted&&settings.sound!=='silent'){
   audio.current.run(soundSets[0],settings.rhythm,base.current+performance.now()-origin.current,end);
  } else audio.current.stop();
  return()=>audio.current.stop();
 },[status,muted,settings.sound]);
 useEffect(()=>{const hide=()=>{if(document.hidden && status==='running'){base.current=Math.min(end,base.current+performance.now()-origin.current);setElapsed(base.current);setStatus(base.current>=end?'completed':'paused');audio.current.stop()}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[status,end]);
 useEffect(()=>()=>{operation.current++;audio.current.stop()},[]);
 function patch(p:Partial<Settings>){if(p.sound!==undefined||p.rhythm!==undefined||p.minutes!==undefined){operation.current++;audio.current.stop();setPreparing(false)}setSettings(s=>({...s,...p}))}
 function selectBackground(selection:string){
  const asset=chooseBackground(selection,previousImage.current);
  setBackground(asset?.url||'');previousImage.current=asset?.id||'';setImageFailed(false);
 }
 async function prepareAudio(){
  await audio.current.unlock();
  await audio.current.prepare(soundSets[0],settings.sound==='recordings'?'recorded':'synthesized');
  const status=audio.current.recordingStatus;
  setAudioStatus(status==='synthesized'?'Synthesized singing bowls · C4 / G3 / C4 / E4':status==='recorded'?'Recorded Tibetan bowls':status==='partial'?'Recordings + synthesized fallback':'Recordings unavailable · synthesized fallback');
 }
 async function start(){
  if(!valid||preparing)return;
  const ticket=++operation.current;setPreparing(true);audio.current.stop();
  if(settings.sound!=='silent')await prepareAudio();
  if(ticket!==operation.current)return;
  selectBackground(settings.background);base.current=0;origin.current=performance.now();setElapsed(0);setStatus('running');setPreparing(false);
 }
 function stop(){operation.current++;audio.current.stop();setPreparing(false);setStatus('idle');setElapsed(0)}
 function pause(){audio.current.stop();base.current+=performance.now()-origin.current;setElapsed(Math.min(base.current,end));setStatus(base.current>=end?'completed':'paused')}
 async function resume(){const ticket=++operation.current;await audio.current.unlock();if(ticket!==operation.current)return;origin.current=performance.now();setStatus('running')}
 async function preview(){const ticket=++operation.current;setPreparing(false);audio.current.stop();await prepareAudio();if(ticket===operation.current&&settings.sound!=='silent')audio.current.preview(soundSets[0])}
 const sceneryOptions=<><option value="random">A new view each session</option>{selectableBackgrounds.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}<option value="gradient">Soft gradient</option></>;
 const isHold=phase.index===1||phase.index===3;
 const fill=phase.index===0?phase.progress:phase.index===1?1:phase.index===2?1-phase.progress:0;
 if(status!=='idle')return <main className="session">
  {background&&!imageFailed&&<img className="scenery" src={background} alt="" onError={()=>setImageFailed(true)}/>}
  <div className="shade"/>
  <header className="session-header"><span className="brand">◌ still</span><label className="session-scenery">Scenery<select aria-label="Session scenery" value={settings.background} onChange={e=>{patch({background:e.target.value});selectBackground(e.target.value)}}>{sceneryOptions}</select></label><button className="icon-button" aria-label="Stop session and return to settings" onClick={stop}>×</button></header>
  <div className="practice">
   <p className="eyebrow">{status==='completed'?'REST IN THIS MOMENT':status==='paused'?'TAKE YOUR TIME':'FOLLOW YOUR OWN RHYTHM'}</p>
   <div className={`breath-circle ${status==='running'?'moving':''}`}>
    <div className="water" style={{height:`${fill*100}%`}}><div className="wave"/></div>
    <svg className="hold-ring" viewBox="0 0 320 320" aria-hidden="true"><circle cx="160" cy="160" r="155" className="ring-track"/>{isHold&&status!=='completed'&&<circle cx="160" cy="160" r="155" className="ring-progress" strokeDasharray={2*Math.PI*155} strokeDashoffset={2*Math.PI*155*(1-phase.progress)}/>}</svg>
    <div className="circle-label"><h1 aria-live="polite">{status==='completed'?'Well done':status==='paused'?'Paused':labels[phase.index]}</h1><span>{status==='completed'?'Take a moment':status==='paused'?'Your breath, your pace':`${Math.ceil(phase.remaining)}`}</span>{isHold&&status==='running'&&<small>{phase.index===1?'after inhale':'after exhale'}</small>}</div>
   </div>
   <p className="phase-guidance">{status==='completed'?'Session Complete – Take a Moment':status==='paused'?'Continue whenever you feel ready.':phase.index===0?'Let the breath arrive, gently.':phase.index===2?'Soften your shoulders. Let go.':'Rest comfortably. Never strain.'}</p>
   <div className="remaining">{clockText(Math.max(0,(end-elapsed)/1000))}<span> REMAINING</span></div>
   <div className="session-controls"><button className="icon-button" aria-label={muted?'Unmute sound':'Mute sound'} onClick={()=>{setMuted(!muted)}}>{muted||settings.sound==='silent'?'♫ Off':'♫ On'}</button>{status==='completed'?<button className="light-button" onClick={stop}>Back to your space</button>:<><button className="light-button" onClick={status==='running'?pause:resume}>{status==='running'?'Pause':'Resume'}</button><button className="icon-button" onClick={stop}>Stop</button></>}</div>
   <label className="session-volume">Volume<input aria-label="Session volume" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e=>patch({volume:Number(e.target.value)})}/></label>
  </div><footer className="session-footer">Nothing to achieve. Just a little room to breathe.</footer>
 </main>;
 return <div className="app-shell">
  <header className="topbar"><a className="brand" href="./">◌ still<span>BREATHING, SIMPLY.</span></a><span className="private-note">✧ A quiet space. All yours.</span></header>
  <main className="settings-layout">
   <section className="intro"><p className="eyebrow">PAUSE. BREATHE. BEGIN AGAIN.</p><h1>A little room<br/> to <em>breathe.</em></h1><p className="intro-copy">Find your rhythm. Let the world slow down.<br/>A few mindful minutes, just for you.</p>
    <div className="landscape-card"><img src={mediaAssets[0].url} alt={mediaAssets[0].description} onError={e=>{if(e.currentTarget.getAttribute('src')!==fallbackAssets[0].url)e.currentTarget.src=fallbackAssets[0].url}}/><div><span>YOUR DAILY EXHALE</span><p>Come back to calm.</p></div><span className="landscape-badge">✧ No account. No distractions.</span></div>
    <p className="safety">Breathe comfortably, without effort. If you feel dizzy or uncomfortable, stop and return to your natural breath.</p>
   </section>
   <section className="settings-card" aria-label="Breathing settings"><div className="card-heading"><span className="step-number">01 / YOUR PRACTICE</span><button className="text-button" onClick={()=>{operation.current++;audio.current.stop();setPreparing(false);setSettings({...appDefaults});setMuted(false)}}>Reset defaults ↺</button></div><h2>Make space for yourself</h2><p className="subtle">Choose a rhythm, or make it your own.</p>
    <div className="presets">{presets.map(p=><button key={p.name} className={`preset ${p.rhythm.every((n,i)=>settings.rhythm[i]===n)?'selected':''}`} onClick={()=>patch({rhythm:[...p.rhythm]})}><strong>{p.name}</strong><span>{p.note}</span></button>)}</div>
    <div className="rhythm-grid">{['Inhale','Hold after inhale','Exhale','Hold after exhale'].map((label,i)=><label key={label}><span>{label}</span><div className="number-field"><input aria-label={`${label} seconds`} type="number" min="0" max="120" step="1" value={Number.isNaN(settings.rhythm[i])?'':settings.rhythm[i]} onChange={e=>{const rhythm=[...settings.rhythm] as Rhythm;rhythm[i]=e.target.value===''?NaN:Number(e.target.value);patch({rhythm})}}/><span>sec</span></div></label>)}</div><p className="field-note">Set a phase to 0 to skip it.</p>
    <div className="duration-row"><label htmlFor="duration">Session length<span>A little time goes a long way.</span></label><div className="number-field"><input id="duration" type="number" min="1" max="120" value={Number.isNaN(settings.minutes)?'':settings.minutes} onChange={e=>patch({minutes:e.target.value===''?NaN:Number(e.target.value)})}/><span>min</span></div></div>
    <button className="preferences-toggle" aria-expanded={more} onClick={()=>setMore(!more)}><span>☷ &nbsp; Atmosphere & sound</span><span>{more?'−':'+'}</span></button>
    {more&&<div className="preferences"><label>Scenery<select value={settings.background} onChange={e=>patch({background:e.target.value})}>{sceneryOptions}</select></label><label>Sound<select value={settings.sound} onChange={e=>{operation.current++;audio.current.stop();setPreparing(false);patch({sound:e.target.value})}}><option value="bowls">Tibetan Bowls · synthesized</option>{hasRecordings&&<option value="recordings">Tibetan Bowls · recordings</option>}<option value="silent">Silent</option></select></label><p className="field-note" role="status">{audioStatus}</p><div className="volume-row"><label htmlFor="volume">Volume</label><input id="volume" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e=>patch({volume:Number(e.target.value)})}/><button className="text-button" disabled={settings.sound==='silent'} onClick={preview}>Preview</button></div></div>}
    {!valid&&<p className="error" role="alert">Use 0–120 seconds per phase, with at least one phase above 0, and a session of 1–120 minutes.</p>}
    <button className="start-button" disabled={!valid||preparing} onClick={start}>{preparing?'Preparing audio…':'Begin your practice'} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></button><p className="end-note">We finish the current phase, so your session may run a little longer.</p>
   </section>
  </main><footer className="page-footer"><span>One breath at a time.</span><span>Free to breathe. Private by nature.</span></footer>
 </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
