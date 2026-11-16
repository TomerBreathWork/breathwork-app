import { BreathingCircle } from '../components/BreathingCircle';
import { candleAt } from '../flower-candle';
import { flameAnchor, flameLayers, illustrationOpacity } from '../flower-candle-art';
import type { Language, Translator } from '../i18n';
import type { SessionStatus } from '../useBreathingSession';

const art = {
  flower: new URL('./assets/flower.png', import.meta.url).href,
  candle: new URL('./assets/candle_body.png', import.meta.url).href,
  smoke: new URL('./assets/smoke.png', import.meta.url).href,
  flames: [
    new URL('./assets/flame_upright_aligned.png', import.meta.url).href,
    new URL('./assets/flame_bend_1_aligned.png', import.meta.url).href,
    new URL('./assets/flame_bend_2_aligned.png', import.meta.url).href,
    new URL('./assets/flame_bend_3_aligned.png', import.meta.url).href,
    new URL('./assets/flame_bend_4_aligned.png', import.meta.url).href,
  ],
};
/** Shared still artwork for library cards and the text-only introduction. */
export function FlowerCandleStill({ kind }: { kind: "flower" | "candle" }) {
  return <div className="kids-static-art" aria-hidden="true">
    {kind === "flower" ? <img className="kids-flower kids-paint" src={art.flower} alt="" />
      : <div className="kids-candle kids-paint"><img className="kids-candle-body" src={art.candle} alt="" />
        <div className="kids-flame"><img className="kids-flame-stage" src={art.flames[0]} alt="" /></div></div>}
  </div>;
}
export function preloadFlowerCandleArt() {
  for (const src of [art.flower, art.candle, art.smoke, ...art.flames]) {
    const image = new Image(); image.src = src;
    void image.decode().catch(() => { /* Local artwork must never block Start. */ });
  }
}

export function FlowerCandleCircle({ t, language, status, phase, preparationProgress }: {
  t: Translator; language: Language; status: Exclude<SessionStatus, 'idle'>;
  phase: { index: number; progress: number; remaining: number; duration: number };
  preparationProgress?: number;
}) {
  const exhale = preparationProgress === undefined && phase.index === 2;
  const candle = candleAt(phase.progress, phase.duration);
  const layers = flameLayers(candle.bendProgress);
  const opacity = illustrationOpacity(phase.progress);
  const visible = preparationProgress === undefined && status !== 'completed';
  return <div className="kids-circle" data-art={exhale ? 'candle' : 'flower'}>
    <BreathingCircle t={t} language={language} status={status} phase={phase}
      preparationProgress={preparationProgress} routes={{ inhale: 'nose', exhale: 'mouth' }} />
    {visible && <div className="kids-illustration" aria-hidden="true">
      <img className="kids-flower kids-paint" src={art.flower} alt="" draggable={false}
        style={{ opacity: exhale ? 0 : opacity, transform: `scale(${.96 + phase.progress * .055})` }} />
      <div className="kids-candle kids-paint" style={{ opacity: exhale ? opacity : 0 }}>
        <img className="kids-candle-body" src={art.candle} alt="" draggable={false} />
        <div className="kids-flame" style={{ opacity: exhale ? candle.flame : 0 }}>
          {art.flames.map((src, i) => <img key={src} className="kids-flame-stage" src={src} alt="" draggable={false}
            style={{ ...layers[i], transformOrigin: `${flameAnchor.x * 100}% ${flameAnchor.y * 100}%` }} />)}
        </div>
        <img className="kids-smoke" src={art.smoke} alt="" draggable={false} style={{ opacity: exhale ? candle.smoke : 0, transform: `translate(${-candle.smokeDrift * 5}%, ${-candle.smokeDrift * 12}%)` }} />
      </div>
    </div>}
  </div>;
}
