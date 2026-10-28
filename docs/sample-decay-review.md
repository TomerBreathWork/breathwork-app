# Recorded bowl decay review

Reviewed baseline: `6055469`, 2026-10-28. The mapping remains Low → High → Mid → High. The follow-up update adds the requested fixed mix headroom while retaining the entire eight-second recordings, their natural envelopes, the user volume control, breathing timings and UI.

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

## Fixed headroom update

A dedicated GainNode now applies **0.3125 gain (-10.10 dB)** to the mixed recordings. This is exactly 25% above the previous 0.25 gain and applies to both default and saved master volumes without rewriting preferences. It is initialized once, separately from master volume and mute. It never follows signal level, phase transitions or the number of voices. There is no compressor, limiter, dynamic ducking, added reverb or sample processing. The result is uniformly quieter; master volume and mute still work independently.

The previous direct sum could exceed digital full scale (1.0), including with exact short manual/legacy holds. Fixed headroom reduces every sample by the same constant factor without altering its original strike or eight-second decay. Original 48 kHz PCM mix measurements and the resulting fixed-gain levels:

| Rhythm in seconds | Previous peak at volume 1 | With headroom at volume 1 | With headroom at volume 0.35 |
| --- | ---: | ---: | ---: |
| 5.5 / 0 / 5.5 / 0 | 0.635 | 0.198 | 0.069 |
| 4 / 4 / 4 / 4 | 0.676 | 0.211 | 0.074 |
| 4 / 7 / 8 / 0 | 0.676 | 0.211 | 0.074 |
| 0.5 / 0.5 / 0.5 / 0.5 | 1.136 | 0.355 | 0.124 |
| 0.5 / 0 / 0.5 / 0.5 | 1.355 | 0.423 | 0.148 |
| 0.5 / 0.001 / 0.5 / 0.001 (exact manual/legacy values) | 3.006 | 0.939 | 0.329 |

Real Web Audio tests render the supplied MP3s at **24, 44.1 and 48 kHz**, at maximum user volume, including fast overlapping cycles and 1 ms legacy holds. They check finite peaks below 0.95, exact trigger counts and survival of all tails after normal completion. Whole-frame schedules also compare against the direct sum of the complete original recordings multiplied only by master volume and fixed headroom. A separate test verifies that neither volume/mute controls nor new phase cues ever automate the headroom node.

All recordings continue playing for their full **8.000 decoded seconds**, including the quiet final tail. No looping, stretching, artificial sustain or phase-duration gate was introduced. Pause/resume preserves offsets; explicit mute/Stop/Restart retain their existing short de-click releases. Tests establish headroom for the supplied recordings and tested patterns; new media should be measured again before changing the fixed gain.

Measurements used FFmpeg decoding to stereo float32 PCM and NumPy summing/half-second RMS analysis. These are review tools only, not application dependencies. The automated browser tests use native Web Audio and require neither tool. Listen on the target phone/headphones for the final subjective check.
