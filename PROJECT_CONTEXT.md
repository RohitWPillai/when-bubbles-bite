# Bubble Quiz — Project Context

Stable reference for session handoffs. Only update when architecture, key files, or anti-patterns change.

## What This Is

Interactive web app for the "When Bubbles Bite: The Hidden Power of Cavitation" exhibit at Edinburgh Science Festival (April 2026, Dynamic Earth). Fills the 10-15 min gap between balloon-burst demonstrations. Visitors (especially kids) tap question bubbles in an underwater scene to learn about cavitation.

## Deployment

- **Live site**: https://rohitwpillai.github.io/when-bubbles-bite/
- **Repo**: https://github.com/RohitWPillai/when-bubbles-bite (GitHub Pages, legacy build)
- **Target device**: iPad in Safari kiosk mode (Guided Access)
- **Trigger rebuild**: `gh api repos/RohitWPillai/when-bubbles-bite/pages/builds -X POST`

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Canvas + DOM overlay + splash screen + iPad meta tags |
| `styles.css` | Full-screen canvas, answer overlays (bar-chart, big-reveal, icon-grid, badges) |
| `app.js` | All logic: bubbles, fish, god rays, particles, audio, game loop (~1070 lines) |
| `questions.js` | Question/answer data (6 questions, separate for easy editing by non-developers) |
| `.claude-agents/reviewer.md` | Adversarial reviewer rubric (5 dimensions, 100-point scale) |
| `CREATIVE.md` | Creative direction document with priority matrix (research-backed, v3) |

## Architecture

Static web app: HTML + CSS + JS. No framework, no build step, no external dependencies.

- **Canvas** renders: underwater gradient background, god rays, 5 fish, ~50 decorative bubbles, 4 question bubbles, burst/ripple particles
- **DOM overlay** renders: answer content after a bubble is tapped (bar charts, big reveals with stat badges, icon grids)
- **IIFE wrapper** with `'use strict'`, no globals except `window.QUESTIONS`

### App States

1. **SPLASH** — "Tap to explore!" with animated bubbles behind semi-transparent overlay
2. **BUBBLES** — Main scene: decorative + question bubbles rising, fish swimming, tappable
3. **ANSWER** — Overlay showing answer; canvas keeps animating behind backdrop

### Key Technical Details

- `pointerdown` events (not `click`) for instant touch response
- Object pooling for bubbles (50 decorative + 4 question) and particles (80 max)
- Delta-time normalization for frame-rate-independent physics
- `devicePixelRatio` capped at 1.5
- Web Audio API synthesized pop sounds (no external files), AudioContext created on user gesture (iOS), wrapped in try-catch
- Idle reset at 45s returns to splash (covers both BUBBLES and ANSWER states)
- Question bubble respawn via ID-based lookup with pending queue; timers tracked and cancelled on splash/idle reset
- God rays use fractional x-positions (resize-safe)

### Question/Answer Types

| Type | Used by | Description |
|------|---------|-------------|
| `bar-chart` | Speed | Horizontal bars with staggered CSS animation, fun fact fade-in |
| `big-reveal` | Temperature, Shrimp | Large number/word scales up, optional stat badges row |
| `icon-grid` | Destruction, Useful, Where | 2x2 grid of emoji + label cells, bounce-in animation |

## Build-Review-Fix Workflow

Adversarial reviewer agent scores the app across 5 dimensions (20 pts each). Loop until >= 85/100 with zero MUST FIX items.

```
Build/fix code
  → Run reviewer (spawn general-purpose agent with .claude-agents/reviewer.md rubric)
  → Fix [MUST FIX] items, then [SHOULD FIX] as needed
  → Re-run reviewer
  → Repeat until: score >= 85/100 AND zero [MUST FIX]
```

### Review Dimensions

1. Visual & Animation Quality (20 pts)
2. Interaction & Usability (20 pts)
3. Scientific Content & Exhibit Connection (20 pts)
4. Code Quality & Performance (20 pts)
5. Festival Readiness (20 pts)

## Creative Ideas Backlog (from .claude-agents/creative.md)

- **P1 (high impact)**: Fish (done), god rays (done), visual answers (done), attract screen animation
- **P2 (medium)**: Marine snow/particles, seaweed, jellyfish, tap ripples (done), progressive depth
- **P3 (nice-to-have)**: Exit/thank-you screen, dynamic difficulty, ambient audio drone

## Anti-Patterns

- **Don't use `click` events** — `pointerdown` is mandatory for instant touch response on iPad. `click` has a 300ms delay.
- **Don't create objects in the game loop** — all bubbles and particles are pre-allocated pools. `new Bubble()` in the hot path causes GC jank.
- **Don't use `Date.now()` for animation timing** — store the `requestAnimationFrame` timestamp in a module-scoped variable (`animTime`) and use that everywhere, including hit detection. Mixing time sources causes wobble mismatch.
- **Don't use index-based respawn** — question bubble respawn uses ID-based lookup (`respawnQuestionBubbleById`) because `initQuestionBubbles()` can reset the array, making old indices stale.
- **Don't forget to cancel timers on state transitions** — respawn `setTimeout` handles are tracked in `respawnTimerIds[]` and cancelled in `showSplash()`. Orphaned timers cause ghost state.
- **GitHub Pages uses legacy build mode** — no workflow file. Trigger rebuild manually: `gh api repos/RohitWPillai/when-bubbles-bite/pages/builds -X POST`

## How to Test / Deploy

```bash
# Test locally
python3 -m http.server 8000   # from project directory
# Open http://localhost:8000

# Deploy
git add app.js styles.css questions.js index.html
git commit -m "description"
git push origin master
gh api repos/RohitWPillai/when-bubbles-bite/pages/builds -X POST
```
