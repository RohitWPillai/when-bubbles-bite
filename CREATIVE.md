# Creative Direction: "When Bubbles Bite" Exhibit App — v3

Living ideas document for making the Bubble Quiz app a standout interactive at Edinburgh Science Festival 2026 (Dynamic Earth, April).

**Last updated:** 2026-02-19
**Status:** Researched & prioritised. Ready for implementation.
**Sources:** Deep research across museum kiosk design, children's apps (Sago Mini, Tinybop, Toca Boca, MarcoPolo), children's book illustration (Klassen, Teckentrup, Carle, Blackall), animated film art direction (Finding Nemo, Song of the Sea, Ponyo, ABZU, Moana), gamification research, and Canvas 2D technical references.

---

## Design Philosophy

**This is not a quiz. It is an underwater expedition.**

Every design decision flows from this reframe:
- The child is an **explorer**, not a test-taker
- Questions are **discoveries**, not interrogations
- Answers are **reveals**, not corrections
- Wrong taps are **exploration**, not failure
- The session is a **dive**, not a score

Language to use: "expedition," "discover," "explore," "reveal"
Language to ban: "quiz," "test," "score," "wrong," "correct"

---

## 1. Visual Atmosphere

The goal: make someone walking past at Dynamic Earth stop and say "what IS that?" The scene should feel like a living ocean window, not circles on a gradient.

### 1a. Caustic Light Overlay

**What:** Soft, dancing light patterns on the lower third of the screen — the bright web-like shapes sunlight creates when it refracts through a rippling surface. This is the single most recognisable "you are underwater" visual cue.

**How (cheapest approach):** Draw 20-30 semi-transparent white ellipses with additive blending (`globalCompositeOperation: 'lighter'`). Each ellipse drifts slowly on independent sine/cosine paths and pulses in size. At `globalAlpha ~0.03-0.06`, overlapping regions brighten naturally, creating the characteristic caustic network.

**Pre-render the gradient circles** to offscreen canvases (3-4 sizes) — converts expensive radial gradient fills into cheap `drawImage` blits.

**Fade with depth:** In the progressive depth system (4c), caustics fade out entirely by zone 3. Deep water has no sunlight.

**Performance:** ~30 `drawImage` calls at tiny alpha. Trivial.
**Impact:** High. This is one of the top visual upgrades available.

### 1b. Warm God Rays (Enhancement)

**Current:** White trapezoids at 3-5% opacity. Already implemented.

**Enhancement:**
1. **Warm tint:** Change fill from white to `rgba(255, 248, 220, 0.04)` — real sunlight through water has a cream tone (Finding Nemo colour key)
2. **Soft edges:** Apply a gradient across each ray's width (transparent at edges, peak opacity at centre) instead of uniform fill
3. **Shimmer:** Every 4-5s, one ray briefly pulses from 0.04 to 0.06 opacity over 0.5s, mimicking a surface wave refracting sunlight
4. **Disappear with depth:** Fade out entirely in zone 3 of progressive depth

**Effort:** Low (modify existing code)
**Impact:** Noticeable warmth improvement.

### 1c. Grain Texture Overlay

**What:** A subtle noise texture composited over the entire scene at very low opacity (0.02-0.03). Breaks the digital smoothness and makes the scene feel hand-painted — the Lisk Feng / Oliver Jeffers aesthetic.

**How:** Generate a 256x256 offscreen canvas of random grayscale pixels once at startup. Tile it across the screen each frame with `ctx.globalAlpha = 0.025`. One-time generation, one `drawImage` per frame.

**Effort:** Very low
**Impact:** Medium. Transforms "computer graphics" into "illustrated."

### 1d. Marine Snow / Ambient Particles

**Current:** Not implemented. **Status:** Was P2, promote to P1.

**What:** 80-120 tiny (1-3px) white dots drifting slowly downward with slight lateral wandering. Very low opacity (0.08-0.15). Mimics the organic particles floating in real ocean water.

**How:** Use `fillRect` instead of `arc()` for particles under 3px — significantly faster on iPad Safari. Add gentle lateral drift via `sin(time * driftFreq + particle.phase) * driftAmplitude`. Add subtle twinkle via alpha oscillation.

**New insight from research:** Drive plankton motion with noise rather than pure sine for organic, current-driven feel:
```
angle = noise2D(x * 0.01, y * 0.01 + time * 0.5) * TWO_PI
x += cos(angle) * speed
y += sin(angle) * speed + sinkRate
```

**Performance:** 120 `fillRect` calls = negligible.
**Impact:** Medium-high. The eye detects their motion subconsciously. Makes the scene feel alive.

### 1e. Seaweed Silhouettes (Foreground Grounding)

**Current:** Not implemented.

**What:** 5-8 dark seaweed/kelp silhouettes along the bottom edge. Swaying gently. Drawn as chained segments with sine-wave propagation up each strand.

**Key insight (Klassen technique):** These aren't detailed plants — they're dark foreground shapes at `globalAlpha = 0.7-0.9` that overlap slightly with the bottom-most bubbles. They create a clear foreground plane that gives the scene a "floor" and depth.

**How:** Each strand = 8-12 segments. Base is fixed. Each segment inherits parent angle plus offset driven by `sin(time * swayFreq + i * 0.4) * swayAmplitude * (i / N)`. Second sine at different frequency prevents mechanical look. Draw with `quadraticCurveTo` for smooth curves. LineWidth tapers from 6px at base to 1px at tip.

**Colour:** Dark teal `rgba(15, 50, 45, 0.8)` to deep green, blending with background bottom. Tips slightly brighter.

**Performance:** 8 strands at 10 segments = 80 sine calls + 8 path strokes per frame. Trivial. Can update at 30fps if needed.
**Impact:** Medium-high. Grounds the scene. Without it, the bottom is just void.

### 1f. Jellyfish (Background Creatures)

**Current:** Not implemented (was Tier 4).

**What:** 1-2 translucent jellyfish drifting slowly in the mid-background. Procedural bell that pulses (contracts/expands over 3s cycle) with trailing tentacles as chained inverse-kinematics segments.

**How (bell):**
- Deform a semicircle by modulating radius per angle
- `expansionFactor = 0.85 + 0.15 * sin(pulsePhase)`
- Add gentle per-angle wobble: `r += sin(angle * 3 + time * 2) * wobbleAmount`
- Fill with radial gradient (translucent blue-pink, alpha 0.15-0.25)

**How (tentacles):**
- 4-6 wavy lines from bell bottom, each with own sine-wave phase
- Amplitude increases with distance from body (more sway at tips)
- Draw with `quadraticCurveTo` between segment midpoints for smooth curves
- Decreasing lineWidth and alpha along length

**Movement:** Gentle Lissajous curve: `x = A*sin(at), y = B*sin(bt)` for natural, non-linear wandering.

**Effort:** Medium
**Impact:** Medium-high. A surprise discovery moment. Also serves as an easter egg host (see 7a).

### 1g. Parallax Depth Layering

**What:** Organise all elements into 4-5 depth layers that drift at different speeds, creating perceived 3D depth without WebGL.

**Layer stack (draw order):**

| Layer | Contents | Alpha | Parallax |
|-------|----------|-------|----------|
| 0 (far) | Background gradient, distant coral silhouettes | 1.0 | 0.1x |
| 1 | Caustics, marine snow, distant jellyfish | 0.03-0.15 | 0.3x |
| 2 | God rays, decorative bubbles, fish | 0.15-0.9 | 0.6x |
| 3 | Question bubbles, burst particles | 0.5-1.0 | 1.0x |
| 4 (near) | Seaweed silhouettes, finger-trail bubbles | 0.4-1.0 | 1.2x |

**Parallax driver:** Gentle automatic drift using incommensurate sine frequencies:
```
parallaxX = sin(time * 0.0003) * maxDrift
parallaxY = cos(time * 0.0004) * maxDrift * 0.5
```

For each layer: `drawX = -parallaxX * layer.factor`

**iPad gyroscope option:** If `DeviceOrientationEvent` is available, drive parallax from device tilt. But auto-drift is the safe fallback for Guided Access mode.

**Effort:** Medium (restructure render pipeline)
**Impact:** High. Instant perception of depth.

### 1h. Procedural Coral Silhouettes (Background)

**What:** 5-8 coral/rock formations as dark silhouettes in layer 0. Generated procedurally at startup using recursive branching (L-system), rendered once to an offscreen canvas.

**How:** Recursive `drawCoralBranch(x, y, angle, length, depth)` with 2-3 branches per node, slight random angle variation, length factor 0.65-0.80. Draw entirely in dark colour `rgba(10, 20, 40, 0.5)` with no detail.

**Effort:** Medium (one-time generation, zero per-frame cost)
**Impact:** Medium. Enriches the background, especially visible in shallow zones where caustics play across them.

### 1i. Question Bubble "Breathing"

**What:** Question bubbles gently oscillate radius by +/-2px over a 3-second sine cycle. Makes them feel alive and inviting.

**Why (Moana principle):** When the ocean is a character, its edges are "unnaturally smooth and rounded" to avoid feeling aggressive. Breathing animation signals warmth and approachability.

**Effort:** Very low (add `r + 2 * sin(time * 0.33 + qb.glowPhase)` to draw)
**Impact:** Medium. Subtle but makes bubbles feel organic.

---

## 2. Transitions & "Wow" Moments

The transition from bubble-pop to answer is the app's core dramatic beat. Currently it's a fade. Research across picture books, Pixar, and museum exhibits converges on the same insight: **the reveal IS the experience.**

### 2a. Anticipatory Squeeze (Pixar Squash-and-Stretch)

**What:** When a question bubble is tapped, it doesn't pop instantly. It compresses inward (shrinks to 70% over 80ms), then bursts outward with particles.

**Why:** This is Pixar's foundational animation principle applied to touch. The 80ms squeeze creates anticipation. The burst is the payoff. Together they make the pop feel physical rather than digital.

**How:** On pointerdown hit, set `qb.popPhase = 'squeeze'` and tween `qb.drawScale` from 1.0 to 0.7 over 80ms. Then trigger burst, hide bubble, show answer.

**Effort:** Low
**Impact:** High. Makes every pop satisfying.

### 2b. Radial Reveal Transition

**What:** The answer overlay expands as a circle from the exact position where the bubble was popped, using `clip-path: circle()` CSS animation.

**How:**
```css
#answer-overlay {
  clip-path: circle(0% at var(--pop-x) var(--pop-y));
  transition: clip-path 0.35s ease-out;
}
#answer-overlay.visible {
  clip-path: circle(150% at var(--pop-x) var(--pop-y));
}
```
Set `--pop-x` and `--pop-y` CSS custom properties to the bubble's screen position before removing the `hidden` class.

**Why (Graeme Base's The Water Hole):** The oval cutout in Base's book creates a physical ripple effect as pages turn. The radial reveal is the digital equivalent — the child is looking "through" the popped bubble into the answer space.

**Effort:** Medium
**Impact:** Very high. Transforms a mundane overlay appearance into a magical portal.

### 2c. Number Count-Up on Big Reveal

**What:** Instead of showing "4,700" instantly, count up rapidly from 0 over ~1.5 seconds using `requestAnimationFrame`. The counter accelerates then decelerates (ease-in-out).

**Why:** Museum exhibit research confirms animated numbers create anticipation and feel more dramatic than static displays. Kids' eyes track the climbing number.

**Effort:** Low
**Impact:** High on the temperature and shrimp questions.

### 2d. Screen Micro-Shake on Dramatic Reveals

**What:** A CSS transform `translateX/Y` oscillation of 2-3px for 200ms on the canvas container when extreme numbers appear (4,700 degrees, 5,000 km/h).

**How:**
```javascript
function screenShake(intensity, duration) {
  const el = document.getElementById('bubble-canvas');
  const start = performance.now();
  function shake(now) {
    const elapsed = now - start;
    if (elapsed > duration) { el.style.transform = ''; return; }
    const decay = 1 - (elapsed / duration);
    const x = (Math.random() - 0.5) * intensity * decay;
    const y = (Math.random() - 0.5) * intensity * decay;
    el.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(shake);
  }
  requestAnimationFrame(shake);
}
```

**Intensity guide:** 2-3px for dramatic facts, never more than 5px for a children's app. Respect `prefers-reduced-motion` (see accessibility section).

**Effort:** Low
**Impact:** Medium-high. Visceral. Sells "this is EXTREME."

### 2e. Content Stagger (Three Reveals, Not One)

**What:** Answer content appears in stages:
1. Main visual element (bar chart / big number / icon grid) — immediate
2. Supporting text (comparison, fun fact) — 300ms later
3. Stat badges / secondary details — 600ms later

**Why (Eric Carle's layered collage principle):** Three reveals create three "wow" moments instead of one. The eye processes each layer before the next arrives.

**Already partially implemented** via staggered setTimeout. Ensure all answer types consistently use 3-stage reveal.

**Effort:** Low (refine existing stagger timings)
**Impact:** Medium-high. Perception of polish.

### 2f. Dismiss Dissolve

**What:** When the answer overlay is dismissed, it dissolves into 20-30 tiny bubble particles that float upward and join the decorative bubble field. The answer literally becomes part of the ocean.

**How:** On dismiss, spawn micro-bubbles from the overlay's centre position, then fade the overlay.

**Effort:** Medium
**Impact:** Medium. Beautiful closure to each answer cycle.

### 2g. Bioluminescence Burst on Dramatic Answers

**What:** For the temperature and shrimp answers (the "hottest" reveals), trigger a bioluminescent bloom — particles radiating outward in electric blue/green, like disturbed dinoflagellates. This directly ties to sonoluminescence (the real flash produced by collapsing cavitation bubbles).

**Palette:**
- Core flash: `#FFFFFF` (100ms)
- Inner glow: `#B4F8FF` (pale cyan)
- Mid glow: `#64FFDA` (mint/seafoam)
- Outer glow: `#1DE9B6` (teal-green)
- Fade: `#00796B` (dark teal)

**How:** Use `globalCompositeOperation: 'lighter'` (additive blending). Draw each particle twice — once at full size with low opacity for glow halo, once smaller with higher opacity for bright core.

**Effort:** Medium
**Impact:** High. The "wow" moment. Directly science-relevant.

---

## 3. Sound Design

The app already has Web Audio API synth pop sounds. Research across children's apps and museum exhibits shows sound is a major engagement multiplier when done right.

### 3a. Underwater Master Filter

**What:** Route all audio through a lowpass filter at ~2000 Hz. This muffles highs and makes everything feel submerged.

```javascript
const underwaterFilter = audioCtx.createBiquadFilter();
underwaterFilter.type = 'lowpass';
underwaterFilter.frequency.value = 2000;
underwaterFilter.Q.value = 1;
underwaterFilter.connect(audioCtx.destination);
```

**Effort:** Very low (one filter node in the audio chain)
**Impact:** High. Instant immersion.

### 3b. Ambient Underwater Drone

**What:** A continuous low-frequency synthesised tone (40-80 Hz) with a gentle filter sweep. Loops seamlessly. Creates the constant "you are underwater" feeling.

**Implementation:** Use an OscillatorNode at 50-60 Hz, type 'triangle', at very low gain (0.05-0.08). Add a second oscillator at a slightly detuned frequency for thickness. Route through the lowpass master filter.

**Effort:** Low
**Impact:** Medium-high. The "background hum" that visitors feel more than hear.

### 3c. Discovery Chime

**What:** A bright, ascending three-note chime (C5-E5-G5) when each answer is revealed. Run through the underwater filter at a higher cutoff (~4000 Hz) so it's brighter than ambient but still feels submerged.

**Why:** Distinct from the pop sound. Signals "you found something." Celebratory without being loud.

**Key principle:** Keep all pitched sounds in the same key (C major or A minor pentatonic) to prevent dissonance when multiple sounds play simultaneously.

**Effort:** Low
**Impact:** Medium. Satisfying audio bookmark for each discovery.

### 3d. Procedural Pitch Variation

**What:** Pitch-shift all interaction sounds slightly each time (+/-5% random `playbackRate`). Prevents monotony when the same sound plays repeatedly.

**Effort:** Very low
**Impact:** Medium. Museum staff who hear it 500 times a day will thank you.

### 3e. Distant Whale Call

**What:** Every 30-60 seconds (random interval), a distant, low whale-call sound plays very quietly. Pitch randomised slightly each time.

**How:** Pre-synthesise using a frequency-modulated oscillator with a slow sweep from 80 Hz to 200 Hz over 2 seconds. Or use a short audio sample (~3s).

**Effort:** Low
**Impact:** Medium. Surprise delight. "Wait, was that a whale?"

---

## 4. Attract Mode

Research from museum kiosk design (Workinman Interactive, Exploratorium, NEMO Amsterdam) shows the attract screen is the single most important element for a public kiosk. It must be visible and compelling from 10+ feet away.

### 4a. Four-Phase Attract Loop (60 seconds)

Replace the current static splash with a looping sequence:

| Phase | Duration | What happens |
|-------|----------|-------------|
| 0-15s | Ambient scene | Full underwater scene visible through semi-transparent splash overlay. Schools of bubbles, fish swimming, light rays shifting. Purely atmospheric. |
| 15-25s | Curiosity question | A question fades in large: "Can a bubble be hotter than the Sun?" Holds 5s. Dissolves into particles. Then another: "Which tiny animal creates underwater shockwaves?" |
| 25-40s | Gameplay preview | Simulated interaction: a bubble rises, "pops" with full celebration animation. Shows visitors what happens when you tap. |
| 40-60s | Call to action | Title + "Touch anywhere to dive in!" CTA pulses gently. The mascot shrimp (if implemented) does an inviting gesture. |

**Key constraint:** From 3 metres away, only large, slow, high-contrast motion is visible. No text smaller than 72pt equivalent. Dark deep-ocean background with bright bioluminescent elements (cyan, magenta, warm yellow).

**Effort:** Medium-high
**Impact:** Very high. This is the #1 conversion driver.

### 4b. Attract-to-Play Transition

When a visitor touches during attract:
1. A ripple effect expands from the touch point (200ms)
2. Attract content gently fades while underwater environment stays (300ms)
3. First question bubbles rise from bottom with staggered timing (100ms offset per bubble)
4. Total transition: under 1 second

**Why:** The child should feel like they reached INTO the water.

### 4c. Idle Countdown Warning

**What:** Before the 45-second idle reset, show a 5-second "Still exploring?" prompt. If no response, smooth 2-second cross-dissolve back to attract. Never snap back.

**Why:** Prevents frustrating mid-read resets. Current implementation resets without warning.

**Effort:** Low
**Impact:** Medium. Prevents the most common frustration moment.

---

## 5. Progressive Depth (Session Journey)

This is the structural backbone that ties visual atmosphere, difficulty, and narrative into a coherent experience. The child "dives deeper" as they explore.

### 5a. Three Depth Zones

| Zone | Trigger | Background | Palette | Light | Creatures | Content |
|------|---------|-----------|---------|-------|-----------|---------|
| Sunlit Shallows | Start-Q2 answered | Bright teal to navy | Warm, full spectrum | God rays + caustics at full | Colourful fish, decorative bubbles | Easy, visual, concrete |
| Twilight | Q3-Q4 answered | Cool blue to deep navy | Cooler, greens/blues only | God rays dimming, caustics fading | Jellyfish appear, fish become translucent | Medium, some comparisons |
| Midnight | Q5-Q6 answered | Deep blue to near-black | Blue/violet only + bioluminescence | No god rays. Bioluminescent sparks replace sunlight | Ghostly deep-sea fish, anglerfish easter egg | Harder, data-driven |

### 5b. Colour Palettes Per Zone

**Sunlit Shallows:**
| Role | Hex | Notes |
|------|-----|-------|
| Background top | `#1a8a7a` | Warmer teal than current |
| Background bottom | `#0d3350` | Slightly lighter than current |
| God rays | `rgba(255, 248, 220, 0.04)` | Warm cream |

**Twilight:**
| Role | Hex |
|------|-----|
| Background top | `#14617a` |
| Background bottom | `#071a2e` |
| God rays | `rgba(200, 220, 255, 0.02)` |

**Midnight:**
| Role | Hex |
|------|-----|
| Background top | `#0a3654` |
| Background bottom | `#030d1a` |
| Bioluminescence accent | `rgba(100, 255, 218, 0.15)` |

### 5c. Colour Absorption

Real underwater colour absorption: red light absorbed first (~5m), then orange, yellow, green. At depth, only blue/violet remain.

**Implementation:** Multiply fish/bubble RGB by a depth-dependent filter:
- Zone 1: `(1.0, 1.0, 1.0)` — full colour
- Zone 2: `(0.6, 0.8, 1.0)` — reds muted
- Zone 3: `(0.3, 0.6, 1.0)` — near-monochrome blue

**Effort:** Medium
**Impact:** High. Creates genuine sense of descent.

### 5d. Deep-Water Fish Palettes

For zones 2-3, add translucent, ghostly fish:
```javascript
{ body: 'rgba(100, 200, 220, 0.5)', fin: 'rgba(60, 160, 180, 0.5)',
  stripe: 'rgba(200, 240, 255, 0.3)', eye: '#e0f7fa' },  // translucent blue
{ body: 'rgba(180, 130, 200, 0.4)', fin: 'rgba(140, 90, 160, 0.4)',
  stripe: 'rgba(220, 200, 240, 0.2)', eye: '#f3e5f5' },  // ghostly purple
```

---

## 6. Rewards & Completion

No accounts, no save, no persistence. Every reward must be immediate, visceral, and self-contained within the session.

### 6a. Creature Unlocks

**What:** Each correct answer "discovers" a sea creature that swims into the scene and stays. By the end, the visitor has built a living ecosystem through their knowledge.

| Question answered | Creature unlocked |
|---|---|
| Speed | Sea turtle glides in from the right |
| Temperature | Bioluminescent jellyfish appears |
| Destruction | Hammerhead shark silhouette in background |
| Useful | Seahorse bobs up from seaweed |
| Where | School of tiny fish (boids flock) enters |
| Shrimp | Pistol shrimp settles on the seafloor |

**Why:** The reward IS the environment becoming more alive. No abstract points needed.

**Effort:** High (each creature needs design + animation)
**Impact:** Very high. "I discovered 6 creatures!" is something kids tell parents.

### 6b. Streak Escalation

Track consecutive question pops and escalate visual feedback:

| Streak | Effect |
|---|---|
| 1 | Normal pop + particle burst (24 particles) |
| 2 | Larger burst (36 particles) + background bubbles scatter outward |
| 3 | Burst + fish school swims across + subtle background glow pulse |
| 4+ | All above + bioluminescent bloom + whale call in the distance |

A wrong tap resets streak but is NEVER punished. The environment simply stays at its current drama level.

### 6c. "Dive Report" Completion Screen

**What:** After all 6 questions explored (or when the session naturally winds down), show a photo-worthy summary:

- "Deep Sea Expedition Complete!" in large teal text
- The full ecosystem the child built (all unlocked creatures swimming)
- "You explored to [depth zone reached]"
- Row of discovery icons for each question answered
- "Now go see the real thing!" directing to the balloon demo
- Fades to attract after 8s

**Why (museum exhibit research):** The final screen should be so visually striking that parents photograph it. This is organic marketing.

**Effort:** Medium
**Impact:** High. Closure + photo opportunity + wayfinding to physical demo.

### 6d. "Tell Me More" Progressive Disclosure

**What:** Every fact has an expandable layer. A small "Tell me more" link appears after the main reveal. Younger children ignore it. Older children tap it for deeper content.

Example:
- Level 1: "Pistol shrimp snap creates a 4,700 C bubble!" (all see this)
- Level 2: "The snap produces a shockwave, a cavitation bubble, AND a flash of light called sonoluminescence." (tap to see)
- Level 3: "Scientists study sonoluminescence because it's one of the few ways to create extreme temperatures without explosives." (tap again)

**Why:** Serves both a 6-year-old and a 14-year-old simultaneously. The depth metaphor extends to content depth.

**Effort:** Medium
**Impact:** Medium-high. Extends engagement for curious visitors.

---

## 7. Easter Eggs

Reward the curious child who taps where others don't. These extend engagement and create word-of-mouth.

### 7a. Hidden Octopus

A very small, nearly-camouflaged octopus appears occasionally on a coral formation in the background. If spotted and tapped, it changes colour (like a real octopus) and a fact appears: "Octopuses can change colour in 200 milliseconds!"

### 7b. Jellyfish Bioluminescence

Tapping the background jellyfish (1f) triggers a radial glow of pale green/blue expanding from the dome. A tiny label: "Bioluminescence!" fades in and out.

### 7c. Shake to Slosh

If accelerometer is available: shaking the iPad makes all bubbles, fish, and particles react to the physical motion. Water "sloshes." Pure delight — kids will do it repeatedly.

### 7d. Treasure Chest

Tapping the background 5 times rapidly in the same spot: a tiny treasure chest rises from the sand, opens, and releases gold particle coins that drift upward. "Over 3 million shipwrecks rest on the ocean floor!"

### 7e. Anglerfish Patience Reward

If the visitor waits 15 seconds without touching during gameplay, a curious anglerfish slowly approaches from the deep background, its light growing brighter. Tapping it before it retreats illuminates a hidden fact.

### 7f. Whirlpool Gesture

Drawing a circle on the screen with a finger creates a brief whirlpool that sucks in nearby particles and small bubbles, then releases them spinning outward.

---

## 8. Accessibility

### 8a. Reduced Motion

Check `prefers-reduced-motion`:
- Replace particle bursts with simple opacity fades
- Remove screen shake entirely
- Replace spring animations with simple ease-out
- Keep ambient motion but slow by 50%
- Replace celebrations with static "Well done!" card

### 8b. Touch Targets

Minimum 60x60px for children's kiosk context (not the WCAG 44px minimum). Children ages 6-8 have less fine motor precision. Question bubbles are already ~110-140px diameter — good.

Bottom-of-screen bias: children are shorter than adults. Place primary interaction targets in the lower 2/3 of the iPad screen. Use the top 1/3 for ambient elements.

### 8c. Colour Independence

Never use colour alone to indicate state. Every state change uses colour AND shape AND animation AND sound (redundant channels). Test with deuteranopia simulation.

### 8d. No Time Pressure

Bubbles float patiently. No countdown timers. No visible speed tracking. Speed bonuses (if implemented) are invisible — tracked internally for extra sparkle, never displayed.

### 8e. Audio Supplementary

Every interaction must be visually satisfying on mute. The venue is loud. Sound is a bonus layer, never required.

---

## 9. Technical Performance Notes (iPad Safari)

### What's Cheap (do freely)
- `fillRect` (fastest draw call — use for tiny particles)
- `drawImage` from offscreen canvas (texture blit)
- `globalAlpha` changes
- `translate/rotate/scale` transforms

### What's Expensive (use sparingly)
- `shadowBlur` — pre-render shadows to offscreen canvas. NEVER in animation loop
- `ctx.filter = "blur()"` — pre-blur static assets, never per-frame
- Radial/linear gradients — pre-render to offscreen canvases, reuse as textures
- `getImageData/putImageData` — never per-frame on iPad
- Text rendering (`fillText`) — cache aggressively (already doing this)

### Key Tips
- Use integer coordinates (`Math.round()` or `|0`) — sub-pixel forces anti-aliasing
- Batch draw calls: single `beginPath()` for same-styled particles
- Background layers can update at 15-20fps (slow-moving, imperceptible)
- Pre-render god rays to offscreen canvases; just `drawImage` with varying alpha each frame
- Total canvas memory budget: ~256MB across all canvases. Keep offscreen canvases under 8-10
- Use incommensurate frequencies for ambient animation (0.013, 0.019, 0.031, 0.043...) so patterns never repeat

---

## Implementation Priority Matrix

### Tier 1: Maximum Impact, Reasonable Effort

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Anticipatory squeeze on pop | 2a | Low | High |
| Radial reveal transition | 2b | Medium | Very high |
| Number count-up animation | 2c | Low | High |
| Screen micro-shake | 2d | Low | Medium-high |
| Question bubble breathing | 1i | Very low | Medium |
| Warm god rays | 1b | Low | Medium |
| Underwater master filter (audio) | 3a | Very low | High |
| Caustic light overlay | 1a | Medium | High |
| Marine snow particles | 1d | Low | Medium-high |
| Idle countdown warning | 4c | Low | Medium |

### Tier 2: Strong Impact, Medium Effort

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Seaweed silhouettes | 1e | Medium | Medium-high |
| Jellyfish (procedural) | 1f | Medium | Medium-high |
| Progressive depth (3 zones) | 5a-c | Medium | High |
| Content stagger refinement | 2e | Low | Medium-high |
| Ambient underwater drone | 3b | Low | Medium-high |
| Discovery chime | 3c | Low | Medium |
| Grain texture overlay | 1c | Very low | Medium |
| Bioluminescence burst | 2g | Medium | High |
| Completion "Dive Report" | 6c | Medium | High |

### Tier 3: High Effort, High Reward

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Four-phase attract loop | 4a | Medium-high | Very high |
| Creature unlocks as rewards | 6a | High | Very high |
| Parallax depth layering | 1g | Medium | High |
| Procedural coral silhouettes | 1h | Medium | Medium |
| Dismiss dissolve to bubbles | 2f | Medium | Medium |
| "Tell me more" disclosure | 6d | Medium | Medium-high |
| Streak escalation | 6b | Medium | Medium-high |

### Tier 4: Easter Eggs & Polish

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Jellyfish easter egg | 7b | Low | Medium |
| Hidden octopus | 7a | Medium | Medium |
| Treasure chest | 7d | Medium | Medium |
| Anglerfish patience reward | 7e | Medium | Medium |
| Whirlpool gesture | 7f | Medium | Medium |
| Shake to slosh | 7c | Medium | Medium |
| Distant whale call | 3e | Low | Medium |
| Pitch variation on sounds | 3d | Very low | Medium |
| Colour absorption | 5c | Medium | High |
| Deep-water fish palettes | 5d | Low | Medium |

---

## Open Questions

1. **iPad model?** Performance budget depends on A-chip generation. Fish + god rays + particles + caustics + seaweed + jellyfish is fine on A14+, but profile on actual hardware.
2. **Demo timing?** Need balloon-burst demo frequency for the exit screen callout and attract loop timing.
3. **Session length target?** With progressive depth + creature unlocks + completion screen, sessions could extend to 5-8 min. Is that OK for throughput at Dynamic Earth?
4. **Multiple iPads?** If there are 2+ kiosks, they could show different depth zones by default, creating visual variety across the stand.
5. **Sound volume?** Dynamic Earth is a busy venue. What's the ambient noise level? This affects whether ambient drone is audible or pointless.
