/** Visual registration only. No breathing clocks, settings or session state. */
export const flameStages = [
  { at: .10, angle: 0, x: 1, y: 1 },
  { at: .22, angle: 13.322, x: .92554, y: .92234 },
  { at: .45, angle: 26.075, x: .84832, y: .84478 },
  { at: .65, angle: 42.029, x: .77677, y: .76675 },
  { at: .84, angle: 58.268, x: .69629, y: .68850 },
] as const;
export const flameAnchor = { x: 130 / 420, y: 330 / 420 };
const smooth = (p: number) => p * p * (3 - 2 * p);
function matrix(angle: number, x: number, y: number) {
  const a = angle * Math.PI / 180;
  return [Math.cos(a) * x, Math.sin(a) * x, -Math.sin(a) * y, Math.cos(a) * y];
}
/** Monotone Hermite slopes retain motion through interior source stages.
 * Endpoint slopes are zero for the initial upright hold and final bent pose. */
function poseCurve(key: "angle" | "x" | "y") {
  const values = flameStages.map(stage => stage[key]);
  const widths = flameStages.slice(1).map((stage, i) => stage.at - flameStages[i].at);
  const secants = widths.map((width, i) => (values[i + 1] - values[i]) / width);
  const slopes = values.map((_, i) => {
    if (i === 0 || i === values.length - 1) return 0;
    const before = secants[i - 1], after = secants[i];
    if (before * after <= 0) return 0;
    const a = 2 * widths[i] + widths[i - 1], b = widths[i] + 2 * widths[i - 1];
    return (a + b) / (a / before + b / after);
  });
  return { values, widths, slopes };
}
const poseCurves = { angle: poseCurve("angle"), x: poseCurve("x"), y: poseCurve("y") };
function stageInterval(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const next = flameStages.findIndex(stage => stage.at > p);
  const left = next < 0 ? 4 : Math.max(0, next - 1), right = Math.min(4, left + 1);
  const start = flameStages[left], end = flameStages[right];
  return { left, right, u: left === right ? 0 : Math.max(0, Math.min(1, (p - start.at) / (end.at - start.at))) };
}
export function flamePose(progress: number) {
  const { left, right, u } = stageInterval(progress);
  function value(key: "angle" | "x" | "y") {
    const { values, widths, slopes } = poseCurves[key];
    if (left === right) return values[left];
    return (2*u**3-3*u**2+1)*values[left] + (u**3-2*u**2+u)*widths[left]*slopes[left]
      + (-2*u**3+3*u**2)*values[right] + (u**3-u**2)*widths[left]*slopes[right];
  }
  return { angle: value("angle"), x: value("x"), y: value("y") };
}
/** Register both images to one continuous pose before blending their pigment.
 * The fitted source rotations/scales were measured from the supplied PNGs.
 * Their shared virtual wick anchor stays fixed; no image resampling is saved.
 */
export function flameLayers(progress: number) {
  const { left, right, u } = stageInterval(progress);
  const mix = smooth(u);
  const pose = flamePose(progress);
  const target = matrix(pose.angle, pose.x, pose.y);
  return flameStages.map((stage, i) => {
    const baked = matrix(stage.angle, stage.x, stage.y);
    const [a, b, c, d] = baked, det = a * d - b * c;
    const [u, v, w, z] = target;
    const transform = `matrix(${(u*d-w*b)/det}, ${(v*d-z*b)/det}, ${(-u*c+w*a)/det}, ${(-v*c+z*a)/det}, 0, 0)`;
    return { opacity: i === left ? 1 - mix : i === right ? mix : 0, transform };
  });
}
/** Phase-owned fades freeze exactly when engine progress freezes. */
export function illustrationOpacity(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return smooth(Math.min(1, p / .06)) * smooth(Math.min(1, (1 - p) / .02));
}
