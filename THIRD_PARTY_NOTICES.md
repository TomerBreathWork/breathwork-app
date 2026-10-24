# Singing bowl synthesis reference

The paired, inharmonic-partial synthesis approach in `src/bowl-synth.ts` is adapted from Olivier Giulieri's **Tibetan Singing Bowls**:

- Demo: https://evoluteur.github.io/tibetan-singing-bowls/
- Source inspected: https://github.com/evoluteur/tibetan-singing-bowls/blob/main/js/bowls.js
- License: MIT; Copyright (c) 2026 Olivier Giulieri
- Full notice: [third-party/tibetan-singing-bowls-LICENSE.txt](third-party/tibetan-singing-bowls-LICENSE.txt)

The Breathwork version faithfully adapts the upstream struck `makeVoice`, `clink`, `impulse`, dry/wet mixing, and compressor graph. It retains the four partial ratios/amplitudes/beating/decay constants, equal oscillator pairs and random beat jitter, 4 ms partial attack, 0.2 strike gain, 30 ms filtered mallet noise, 35% reverb, 3.6 s stereo impulse (decay 2.6), and compressor threshold −16 dB / ratio 6. The analyzer and upstream UI are not used.

Intentional differences are exact note frequencies (no upstream random pitch drift), a final phase gate after all effects to eliminate outgoing tails, lossless preparation of the linear bowl/reverb mix before playback, and seeking that same signal on resume without replaying the mallet strike. The existing 35% volume setting is calibrated to the upstream 70% default while preserving slider endpoints and stored values. Upstream's natural oscillator stop at 24.3 seconds is retained, with reverb kept alive only until its 3.6-second tail or the phase boundary, whichever comes first.

`tests/reference-strike.js` includes a test-only extraction of the upstream functions. Only the context/random injection, static default mix, and exact pitch are adjusted in that fixture. It is excluded from the production application. Offline browser rendering compares this independent extraction against the production adapter with seeded randomness. MIT copyright and permission notices are retained in the source and production JavaScript.

The original oscillator/envelope/mallet/convolution algorithms are executed in OfflineAudioContext before the session clock starts. Their uncompressed output is cached per note; live volume and the original compressor then process it before the phase gate. Both C4 roles share the same cached model instance. This removes late graph construction and resume randomization artifacts; it does not substitute recordings, loops, new partials, filtering, or a different synthesis algorithm. Note/room randomness is fixed for the page visit instead of reselected at each strike. The native rendering path is compared against the upstream extraction in stereo, with identical random input and exact tuning. Subjective and device-specific listening verification is still required.
