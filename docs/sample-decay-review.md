# Recorded bowl decay review

TEST baseline: `6055469`, 2026-10-28. The mapping remains Low → High → Mid → High. No recording, playback envelope, volume curve, phase timing or UI changes were needed to preserve the requested natural decay.

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

## Measured mix headroom limitation

No loudness was increased. Individual source peaks are approximately 0.608 (-4.3 dBFS). The ordinary presets and tested half-second patterns do not clip at the existing default master volume of 0.35. This does **not** establish that every possible custom pattern is safe at every volume.

Direct 48 kHz PCM mix measurements (1.0 is digital full scale):

| Rhythm in seconds | Peak at volume 1 | Peak at volume 0.35 |
| --- | ---: | ---: |
| 5.5 / 0 / 5.5 / 0 | 0.635 | 0.222 |
| 4 / 4 / 4 / 4 | 0.676 | 0.237 |
| 4 / 7 / 8 / 0 | 0.676 | 0.237 |
| 0.5 / 0.5 / 0.5 / 0.5 | 1.136 | 0.398 |
| 0.5 / 0 / 0.5 / 0.5 | 1.355 | 0.474 |
| 0.5 / 0.001 / 0.5 / 0.001 (exact manual/legacy values) | 3.006 | 1.052 |

This is a **pre-existing summing risk**, not a new tail or gain change. Short overlapping custom patterns can exceed full scale at high volume; extreme exact manual values can also do so at the default volume. Eliminating it while keeping every original waveform and avoiding ducking requires fixed mix headroom (quieter playback), or a separately agreed volume strategy. No such change was applied without resolving that tradeoff. No limiter, compressor or dynamic attenuation was added, because it could change the existing strikes or reduce previous sounds when a new voice starts.

Measurements used FFmpeg decoding to stereo float32 PCM and NumPy summing/half-second RMS analysis. These are review tools only, not application dependencies. The automated browser tests use native Web Audio and require neither tool. Listen on the target phone/headphones for the final subjective check.
