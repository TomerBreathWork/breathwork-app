# Breath Flow — Product Context

<!-- impeccable:product-schema 1 -->

This foundation was approved by the product owner. Durable principles below
guide future decisions; the implementation snapshot describes the current
version and does not make every existing detail a permanent requirement.

## Platform

web

Breath Flow is a mobile-first web application and installable, offline-capable
Progressive Web App. Desktop use remains supported. It is not a native iOS or
Android application.

## Users

People who want to pause, regulate their breathing, and make space for calm in
everyday life, including both beginners and experienced users.

Beginners need clear, reassuring guidance and understandable controls.
Returning and experienced users need a quick path into practice without
mandatory discovery, repeated instructions, or unnecessary setup steps.
Do not assume a particular age, diagnosis, or level of breathwork experience.

## Product Purpose

Help people find a comfortable breathing rhythm and create moments of calm.
Success means that someone can understand, begin, adjust, and leave a practice
comfortably. It is not defined by longer sessions, perfect performance,
increased engagement, or a required emotional outcome.

## Positioning

A gentle, self-guided breathing tool combining adjustable rhythms, a water-filled
breathing circle, recorded bowl cues, and concise educational guidance in three
languages. These describe its approach, not a claim of market uniqueness or
clinical effectiveness.

## Operating Context

The main path is Home/settings to practice. An optional library lets people
explore techniques, read details, adjust a suggested rhythm, and start directly.
Exploration and education must support practice rather than become prerequisites.

People may use the app in a browser or from their Home Screen, online or offline
after the required assets are cached. Installation depends on browser support.
No account is required. Share, Contact, and How to Use are secondary actions.

## Product Principles

1. **Breathing comes first.** Keep active practice focused. Additional features
   must support the breathing experience and justify their cognitive cost.
2. **Comfort over performance.** Support personal pacing, optional holds, and
   stopping freely. Do not introduce scores, streaks, pressure, or expectations
   about what someone should feel.
3. **Calm in appearance and interaction.** Keep the experience minimal,
   welcoming, and intuitive. Use restrained motion and familiar controls. Avoid
   unnecessary popups, interruptions, attention-seeking animations, and
   distracting elements, especially during active practice.
4. **Accessible guidance with a fast path to practice.** Help beginners without
   slowing returning or experienced users. Treat mobile usability and Hebrew,
   English, and Japanese as core requirements rather than optional variants.
5. **Continuity and intentional simplicity.** Preserve the approved brand and
   visual direction. Do not add complexity or engagement-driven features merely
   because they are technically possible. Reconsider implementation decisions
   deliberately with product-owner approval.

## Brand Commitments

Preserve the original Natural Brush Circle logo, the name **Breath Flow**, the
byline **BY TOMER BREATHWORK**, and the tagline
**Breathe. Be Present. Feel Better.** The current branding keeps these in English
across all three interface languages.

Maintain the approved calm, organic visual identity: nature photography,
forest-teal branding, warm light, and soft translucent controls. This is a
commitment to continuity, not permission to invent a replacement visual system.
Detailed visual specifications belong in design documentation, not this product
record.

Use warm, clear, non-clinical language. Guidance should reassure without
promising therapeutic outcomes. Preserve approved translations rather than
rewriting them incidentally during design work.

## Accessibility & Inclusion

- Support Hebrew RTL, English LTR, and Japanese LTR with natural typography and
  readable numerical values. Keep the meaning of breathing guidance consistent.
- Prioritize mobile layouts, readable contrast and text, comfortable touch
  targets, keyboard access, visible focus, and accessible control labels.
- Support larger text and reduced-motion preferences. Compact layouts must not
  hide essential controls or make accessibility depend on tiny text.
- Announce meaningful state changes without repeatedly announcing countdowns.
- Explain guidance through text as well as icons, motion, or sound. Practice must
  remain usable with sound muted or unavailable.

No formal accessibility certification or conformance level has been established
by this product foundation; do not claim one without verification.

## Comfort, Safety, and Trust

Encourage gentle, adjustable breathing rather than forced inhalation, exhalation,
or uncomfortable retention. Users may shorten timings, skip holds, stop, or
return to natural breathing. Preserve the accessible safety guidance in How to
Use, including avoiding unsafe contexts and stopping when uncomfortable.

The app supports personal well-being and relaxation. It is not a substitute for
medical advice, diagnosis, or treatment. Do not fabricate evidence, testimonials,
clinical claims, or guaranteed sensations or outcomes.

Analytics is optional. Declining must not restrict practice or installation.
Privacy choices must remain understandable, persistent, and revisitable.
Installation invitations and other secondary requests must be gentle and must
not interrupt active practice.

## Current Implementation Decisions and Constraints

This section is a snapshot, not a list of immutable product principles. Preserve
working behavior during unrelated work; changes require an explicit request or
product-owner approval.

- **Architecture:** Existing React, TypeScript, and Vite application with
  lightweight in-app navigation. Static GitHub Pages deployment uses the
  `/breathwork-app/` base path. Preserve the existing project and deployment
  system rather than rebuilding them.
- **Practice collection:** Coherent Breathing, Box Breathing, 1:1 Breathing,
  Extended Exhale, and 4-7-8, plus Custom configuration. Home provides four preset
  choices and a direct Start action. The Energy category is currently hidden;
  Box Breathing belongs to Focus only.
- **Timing and controls:** Half-second configuration, optional zero-duration
  holds, three-second silent preparation, calm fractional countdowns, and
  completion at a full-cycle boundary. Preparation is separate from session
  duration. Preserve Pause, Resume, Restart, Stop, and sensible Back navigation.
  Current saved settings are restored; absent valid saved configuration, the
  default is Coherent Breathing at 5.5 / 0 / 5.5 / 0 seconds for three requested
  minutes.
- **Practice presentation:** Water rises during inhale, stays high during the
  first hold, falls during exhale, and stays low during the final hold. Holds use
  a delicate outer-ring indicator. Route guidance supports nose/mouth breathing.
  Existing recorded bowl cues, timing, natural decay, overlap, and mute behavior
  are part of the current experience and must not change as a side effect of
  design work.
- **Advanced Options:** Intentionally hidden in the current version. Keep their
  implementation intact and do not restore visible controls without explicit
  product-owner approval. Hiding them is a revisitable implementation decision,
  not a permanent prohibition on all advanced capabilities.
- **Imagery and layout:** Home uses the fixed forest-stream photograph. Practice
  uses the existing real nature photographs. Keep normal mobile Home and
  Practice layouts compact and stable; allow necessary scrolling for long
  educational content, larger text, or unusually small viewports.
- **Privacy and installation:** Existing opt-in GA4 consent, privacy shield, and
  post-practice installation invitation remain secondary. Do not overlap consent
  and installation notices or interrupt the completion screen. Dismissal and
  consent choices persist.
- **Offline and updates:** Preserve cached application/media access and safe
  service-worker updates. Updates must not reload or disrupt running or paused
  practices.

## Evidence on Hand

- `src/main.tsx` and `src/components/`: current screen composition, shared
  branding, practice controls, education, and secondary notices.
- `src/practices.ts`, `src/presets.ts`, `src/engine.ts`, and
  `src/useBreathingSession.ts`: current practice definitions and lifecycle.
- `src/locales/en.json`, `src/locales/he.json`, and `src/locales/ja.json`:
  approved interface, practice, and safety copy.
- `public/brand/`: original logo, icons, manifest, and social-preview assets.
  `public/media/`: existing photographs, recordings, and media manifest.
- `src/style.css`: incumbent visual implementation; preserve it unless changes
  are explicitly requested.
- `src/analytics.ts`, `src/install.ts`, `src/offline.ts`, and
  `src/service-worker.ts`: current privacy, installation, and offline behavior.
- `docs/practice-library-review.md`, `docs/test-corrections.md`, other review
  notes, and automated tests provide historical implementation and verification
  context. Some README and review descriptions are superseded; reconcile them
  against current code and product-owner decisions before relying on them.

This foundation does not establish demographic targeting, clinical validation,
future commercial positioning, or a new visual direction. Leave those decisions
open rather than inventing commitments.
