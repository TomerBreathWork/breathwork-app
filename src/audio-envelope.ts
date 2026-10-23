export interface Envelope { attack: number; fadeStart: number; end: number; peak: number }
// Offset is the already elapsed part of a phase (resume/unmute). All times are seconds.
export function phaseEnvelope(duration: number, offset = 0): Envelope {
 const remaining = Math.max(0, duration-offset);
 const fade = duration < 2 ? duration*0.5 : 1;
 const attack = Math.min(0.15, remaining*0.25);
 const fadeStart = Math.max(attack, remaining-fade);
 return { attack, fadeStart, end:remaining, peak:Math.min(1, remaining/fade) };
}
