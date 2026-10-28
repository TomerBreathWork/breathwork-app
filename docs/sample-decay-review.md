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

## Low-output diagnosis (deployed baseline `ba71129`)

The recordings themselves are not unusually quiet. FFmpeg analysis of the original 48 kHz stereo MP3s:

| Recording | Peak | Full-file RMS | Approx. integrated loudness | First 0.5 s RMS |
| --- | ---: | ---: | ---: | ---: |
| Low F3 | -4.32 dBFS | -19.19 dBFS | -15.3 LUFS | -10.83 dBFS |
| High F4 | -4.32 dBFS | -19.34 dBFS | -15.5 LUFS | -11.63 dBFS |
| Mid C4 | -4.32 dBFS | -19.29 dBFS | -15.3 LUFS | -11.25 dBFS |

The full-file averages include intentionally quiet decay. No MP3 normalization, re-encoding or new envelope is needed.

The deployed graph applied `min(savedVolume × 0.53125, 0.307)`. Its usual saved volume of 0.35 produced **0.1859375** effective gain, a **14.61 dB attenuation**. That lowered individual strikes from -4.32 to roughly -18.94 dBFS and approximate integrated levels to -29.9…-30.1 LUFS. The 0.307 ceiling was selected for rare extreme rapid overlaps and unnecessarily constrained ordinary practices too. Repeated percentage increases left this gain structure and hidden saved attenuation in place.

## Calibrated output, with fixed overlap headroom

The graph is now **independent source gain → unity master → calibrated rhythm gain → mute gate → destination**. It contains no additional hidden percentage multiplier or global 0.307 cap. The master is 1 for new users. `audioOutputVersion: 1` migrates legacy hidden numeric volume to 1 once, preserving all other saved preferences, including explicit silence. Subsequent versioned explicit volume preferences remain supported without exposing a new slider.

`src/sample-level.ts` analyses every decoded frame/channel into millisecond absolute-peak envelopes. A one-bin fractional-frame guard and a 260 ms delay margin cover resampling edges, an audio rendering quantum and the existing scheduler's accepted 250 ms late cues. Folding all active phase envelopes into one cycle bounds steady-state overlaps, startup, any session length and final tails, without relying on waveform cancellation. Zero-duration phases contribute nothing.

The player chooses **0.90 / boundedMixedPeak** once for the selected rhythm. Analysis happens silently during preload/preparation and is cached. The gain is installed before playback and stays fixed through all phase transitions and Pause/Resume. It is not a compressor or limiter and does not react to live amplitude, voice counts or new strikes. A short rhythm with dense overlaps receives more fixed headroom than a slow rhythm; no earlier sound is ducked when a later sound begins. Original per-sample balance, strike, eight-second waveform and quiet 6–7-second resonance remain unchanged.

Real Chromium OfflineAudioContext tests check the supplied MP3s at 24, 44.1 and 48 kHz, including Coherent, Box, 4-7-8, half-second patterns and exact short legacy holds. They also independently delay cues by 0/100/250 ms and verify finite clean peaks below the 0.90 bound, exact trigger counts, full final tails and constant-gain waveform sums for whole-frame starts. Standard preset mixes must exceed 0.85 peak. Measurements are attached to the tests as JSON (`--reporter=json` retains their bodies).

Existing browser tests cover preload, actual application routing, all languages, mute, pause offsets, Stop/Restart and silent three-second preparation. Additional tests check one-time legacy volume migration, versioned preference persistence and calibrated real playback after an offline reload. Unit tests check conservative stereo bounds, delayed polyphony, fractional timing, skipped holds, missing media and gain independence at phase transitions.


Measured actual Chromium graph output at 48 kHz, with the original decoded MP3s (previous output uses the deployed default effective gain of 0.1859375):

| Practice | Previous mixed peak | New fixed effective gain | New mixed peak |
| --- | ---: | ---: | ---: |
| Coherent (5.5 / 0 / 5.5 / 0) | 0.1181 (-18.55 dBFS) | 1.383189 | 0.8787 (-1.12 dBFS) |
| Box (4 / 4 / 4 / 4) | 0.1257 (-18.01 dBFS) | 1.274258 | 0.8614 (-1.30 dBFS) |
| 4-7-8 (4 / 7 / 8 / 0) | 0.1257 (-18.01 dBFS) | 1.274576 | 0.8616 (-1.29 dBFS) |

Across all three tested sample rates, ordinary preset mixed peaks were **0.861–0.879**. Dense short patterns receive more conservative headroom, with tested peaks approximately 0.305–0.582. Neither the 0.90 design bound nor digital full scale was exceeded, including delayed-cue stress cases. The default Coherent signal increases by approximately **17.4 dB** over the previously deployed output; this follows measured overlap calibration rather than another arbitrary percentage multiplier.

## Offline updates

The MP3 files are unchanged, so cached copies are valid. Vite's content-hashed application bundle and Workbox's generated precache revision change with the new code. The existing worker uses `updateViaCache: "none"`, checks on reconnect/focus and periodically, and activates/reloads only when every open tab is idle. Preparation, active and paused sessions continue without interruption. No cache clearing or new service-worker lifecycle policy is needed. Reconnect an old offline installation and return to Settings to allow its update; a completely offline installation cannot fetch a new release.

Measurements use FFmpeg PCM/EBU R128 analysis only as review tools, not application dependencies. Digital peak targets are not percentages of a phone speaker's acoustic loudness. Smartphone speaker/headphone audibility and subjective fidelity still require listening on the actual device; the app cannot override system media volume.
