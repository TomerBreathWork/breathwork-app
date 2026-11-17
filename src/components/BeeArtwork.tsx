import {useId} from 'react';
const atlas=new URL('../assets/bee/miya-bee-atlas.png',import.meta.url).href;
export type BeeArtworkKind='inhale'|'ears'|'hum'|'bee';
const boxes={inhale:'0 0 627 627',ears:'627 0 627 627',hum:'0 627 627 627',bee:'690 710 510 430'};
/** Source-derived transparent atlas: viewport crops retain each prepared asset. */
export function BeeArtwork({kind,className='',hummingText}:{kind:BeeArtworkKind;className?:string;hummingText?:string}) {
 const clip=useId();
 if(kind==='hum'&&hummingText)return <svg className={`bee-artwork bee-hum-artwork ${className}`} viewBox="0 0 800 627" aria-hidden="true" focusable="false">
  <defs><clipPath id={clip}><rect width="627" height="627"/></clipPath></defs>
  <image href={atlas} y="-627" width="1254" height="1254" clipPath={`url(#${clip})`}/>
  <g transform="rotate(-7 560 365)">
   <text x="552" y="367" fontSize="60" fontWeight="700" fontFamily="inherit" fill="#19484a" stroke="#fff9ed" strokeWidth="3" paintOrder="stroke" direction="ltr">{hummingText}</text>
   <path d="M550 395 Q570 412 590 395 T630 395 T670 395 T710 395 T750 395" fill="none" stroke="#d6ad38" strokeWidth="8" strokeLinecap="round"/>
  </g>
 </svg>;
 const [x,y,width,height]=boxes[kind].split(' ').map(Number);
 return <svg className={`bee-artwork ${className}`} viewBox={boxes[kind]} aria-hidden="true" focusable="false"><defs><clipPath id={clip}><rect x={x} y={y} width={width} height={height}/></clipPath></defs><image href={atlas} width="1254" height="1254" clipPath={`url(#${clip})`} /></svg>;
}
