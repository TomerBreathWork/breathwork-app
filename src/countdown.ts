/** Display only the initial fraction, then count down in whole seconds.
 * The precise remaining time still drives all phase timing and animation.
 * Active phases are positive; the timer skips zero-duration phases entirely.
 */
export function phaseCountdown(remaining: number, duration: number): number {
  return Math.min(duration, Math.max(1, Math.ceil(remaining)));
}
