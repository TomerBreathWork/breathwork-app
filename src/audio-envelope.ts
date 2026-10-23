export interface Envelope { attack: number; fadeStart: number; end: number; peak: number }
// Offset is the already elapsed part of a phase (resume/unmute). All times are seconds.
export function phaseEnvelope(duration: number, offset = 0, strike = false): Envelope {
 const remaining = Math.max(0, duration-offset);
 const fade = duration < 2 ? duration*0.5 : 1;
 const attack = strike ? (offset<0.03?0:Math.min(0.01,remaining*0.25)) : Math.min(0.15, remaining*0.25);
 const fadeStart = Math.max(attack, remaining-fade);
 return { attack, fadeStart, end:remaining, peak:Math.min(1, remaining/fade) };
}
