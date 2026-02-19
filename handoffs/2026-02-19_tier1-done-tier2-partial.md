---
date: 2026-02-19T18:45:00Z
git_commit: a773846
branch: master
project: bubbles
---

# Handoff: Tier 1 complete, Tier 2 half-written (not wired)

## Summary

Committed all 10 Tier 1 creative items as v3. Started Tier 2 implementation — four visual systems (seaweed, jellyfish, grain, bioluminescence) are **coded but NOT wired into the game loop** and NOT tested. Audio features (drone, chime) are not started. User noted Tier 1 changes were "not super discernible" — many were intentionally subtle (low alpha). Tier 2 adds more visible elements.

## Commits This Session

- `9c160a1` — v2.4: SHOULD FIX items + CREATIVE.md
- `a773846` — v3: Tier 1 creative items (10 visual/audio/interaction upgrades)

## Uncommitted State

`app.js` has +263 lines of uncommitted Tier 2 code. No other files changed.

### What's Written (functions exist, ~220 lines)

| Feature | Functions | Lines added | Notes |
|---|---|---|---|
| Seaweed silhouettes | `initSeaweed()`, `drawSeaweed(time)` | ~70 | 6 strands, dual-frequency sway, quadraticCurveTo, two-pass render (thick + thin) |
| Jellyfish | `initJellyfish()`, `drawJellyfish(time)` | ~65 | Deformed semicircle bell, 5 wavy tentacles, Lissajous drift, radial gradient fill |
| Grain texture | `initGrain()` IIFE, `drawGrain()` | ~20 | 256x256 noise canvas tiled at 0.025 alpha |
| Bioluminescence | `spawnBioluminescence(cx,cy)`, `updateBioParticles(dt)`, `drawBioParticles()` | ~60 | 40 pooled particles, additive blending, 5-colour cyan/mint/teal palette |

Constants added at top: `SEAWEED_COUNT=6`, `SEAWEED_SEGMENTS=10`, `BIOLUM_PARTICLE_COUNT=40`.

### What's NOT Done Yet

1. **Wire into game loop** — none of the new draw/update functions are called. Need to add to the main `draw()` and `update()` functions in the correct z-order:
   - `drawSeaweed(time)` — behind bubbles, after god rays
   - `drawJellyfish(time)` — behind bubbles, after seaweed
   - `drawGrain()` — on top of everything (last draw call)
   - `updateBioParticles(dt)` — in update loop
   - `drawBioParticles()` — on top of scene, before grain
2. **Trigger bioluminescence** — `spawnBioluminescence(cx, cy)` should fire on dramatic answer reveals (temperature/shrimp questions), using the bubble's pop position
3. **Ambient underwater drone** (CREATIVE.md 3b) — two detuned triangle oscillators at 50-55 Hz through existing lowpass filter, faded in/out with visibility
4. **Discovery chime** (CREATIVE.md 3c) — C5→E5→G5 ascending sine tones on answer reveal, triggered from `showAnswer()`
5. **Progressive depth** (CREATIVE.md 5a-c) — three zones changing palette as session progresses (not started)
6. **Content stagger refinement** (CREATIVE.md 2e) — already partially implemented in Tier 1 answer renderers
7. **Completion "Dive Report"** (CREATIVE.md 6c) — end-of-session summary screen (not started)
8. **Resize handling** — `initSeaweed()` and `initJellyfish()` use `W`/`H` at init time; need to re-call on resize
9. **Testing** — nothing in Tier 2 has been browser-tested yet

## User Feedback

- Tier 1 changes were described as "not super discernible" — caustics (0.03-0.06 alpha), marine snow (0.08-0.15 alpha), god ray colour shift, and bubble breathing (±2px) are deliberately ambient. Could consider bumping opacities.
- User wants to preview after each tier before proceeding to the next.

## Recommended Next Steps

1. **Wire Tier 2 visuals into the game loop** — add the 6 draw/update calls, add resize hooks, test in browser
2. **Add Tier 2 audio** — ambient drone + discovery chime
3. **Trigger bioluminescence on dramatic answers** — identify which questions qualify, hook into `showAnswer()`
4. **Commit Tier 2** — stage and commit as v3.1
5. **Let user preview Tier 2** — open in browser, walk through all questions
6. **Decide on Tier 3** — progressive depth, attract loop, creature unlocks (higher effort)
7. **Run adversarial reviewer** — `.claude-agents/reviewer.md` to score the upgraded app

## Key File Locations

- `app.js` — all logic (~1600 lines with uncommitted code)
- `styles.css` — layout + animations (~466 lines)
- `index.html` — minimal shell (~42 lines)
- `questions.js` — 6 questions with answer data
- `CREATIVE.md` — full creative direction with 4-tier priority matrix
- `PROJECT_CONTEXT.md` — stable project reference
