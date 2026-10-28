# Recorded bowl decay review

Reviewed baseline: `6055469`, 2026-10-28. The mapping remains Low → High → Mid → High. The follow-up updates add fixed mix headroom and the requested relative playback boost while retaining the entire eight-second recordings, their natural envelopes, the user volume control, breathing timings and UI.

## Recordings and playback

All three assigned MP3s decode to **8.000 seconds**, stereo, at 48 kHz. The MP3 container reports 8.040 seconds including encoding padding. Each has its original strike followed by a declining resonance; at 6–7 seconds the tail is quiet, and the last half second is almost silent. Physical audibility depends on device volume and background noise.

Half-second RMS windows measured from decoded original PCM, in dBFS:

| Recording | 0–0.5 s | 6–6.5 s | 6.5–7 s | 7.5–8 s |
| --- | ---: | ---: | ---: | ---: |
| low_F3_174Hz.mp3 | -10.8 | -35.6 | -44.0 | -67.7 |
| high_F4_349Hz.mp3 | -11.6 | -37.0 | -41.2 | -67.9 |
| mid_C4_262Hz.mp3 | -11.3 | -35.1 | -41.8 | -67.8 |

The player already runs each independent source to the recording's natural end. It has no phase fade, phase-boundary stop, time stretching, loop, generated tail or per-phase ducking. Normal session completion preserves active tails. Pause, mute, Stop and Restart retain their existing explicit cleanup behavior.

`tests/sample-decay.spec.ts` renders the actual MP3s in Chromium, checks their quiet nonzero 6–7-second tails and silence after the full recording ends, and compares every original waveform against playback with constant master gain. It also compares polyphonic mixes with the direct sum of original samples, including tails after normal completion and exact trigger counts. The existing control and preparation tests remain in place.

## Relative 70% playback increase and clean-output ceiling

The previously deployed mix multiplier was **0.3125** (commit `9955f1e`). The requested new multiplier is **0.3125 × 1.70 = 0.53125**. With the default or saved master volume of 0.35, actual gain increases from **0.109375 to 0.1859375**, exactly 70%. The original recordings and their full eight-second decay are unchanged.

Applying the entire increase at maximum saved volume would clip unusually rapid overlapping custom patterns. A scan of 7,744 short patterns followed by full-rate PCM measurements found a raw peak near 3.19 for 0.6 / 0.05 / 0.5 / 0.001 seconds. These include exact manual/legacy values even though sliders use half-second increments. Measured raw peaks for that pattern:

| Sample rate | Raw mixed peak | Peak with uncapped 0.53125 gain | Peak with 0.307 ceiling |
| --- | ---: | ---: | ---: |
| 24 kHz | 3.18175 | 1.69031 | 0.97680 |
| 44.1 kHz | 3.19046 | 1.69493 | 0.97947 |
| 48 kHz | 3.18420 | 1.69161 | 0.97755 |

The applied effective gain is therefore **`min(requestedVolume × 0.53125, 0.307)`**. The ceiling rounds down the measured clean level with about 2% full-scale clearance. Requested volumes up to approximately 0.578 receive the full increase; higher volumes are capped. At requested volume 1, this is 0.307 versus the previously deployed 0.3125, so that extreme setting cannot receive a clean 70% increase. This limitation is intentional and does not rewrite any saved preference.

The graph remains independent sample gain → selected master gain → fixed mix gain → mute gate. Only initialization and explicit master-volume changes calculate the ceiling. Phase transitions never alter another voice's volume. There is **no compressor, limiter, dynamic ducking, added reverb, looping, stretching or generated tail**. Normal session completion retains all active tails; Pause/Resume preserves offsets and mute/Stop/Restart keep their existing short de-click releases.

Real Web Audio tests render the actual MP3s at **24, 44.1 and 48 kHz**, at maximum requested volume, including the additional stress pattern above. They check finite peaks below 0.99, exact trigger counts, full tails after normal completion and sample-for-sample agreement with constant-gain sums for whole-frame schedules. Real application graph tests restore saved volume in all three languages and verify the effective gain. Unit tests cover both initial and later high-volume settings, independent mute, mapping, zero holds and duplicate prevention.

These measurements establish clean output for the supplied recordings and tested patterns, not every possible device or future recording. New media should be measured again before raising the ceiling. Measurements used FFmpeg decoding to stereo float32 PCM and NumPy analysis; these are review tools only, not application dependencies. Browser tests use native Web Audio. Final subjective loudness and fidelity should be checked on the target phone/headphones.
