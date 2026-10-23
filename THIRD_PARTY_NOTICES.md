# Singing bowl synthesis reference

The paired, inharmonic-partial synthesis approach in `src/bowl-synth.ts` is adapted from Olivier Giulieri's **Tibetan Singing Bowls**:

- Demo: https://evoluteur.github.io/tibetan-singing-bowls/
- Source inspected: https://github.com/evoluteur/tibetan-singing-bowls/blob/main/js/bowls.js
- License: MIT; Copyright (c) 2026 Olivier Giulieri
- Full notice: [third-party/tibetan-singing-bowls-LICENSE.txt](third-party/tibetan-singing-bowls-LICENSE.txt)

The Breathwork version retunes amplitudes, beating and decay; keeps a quieter sustained floor for long phases; uses the app's existing strict phase envelopes and cancellation; and omits strike noise, reverb, random tuning, and sound-bath/UI code. No external code or assets are fetched at runtime.
