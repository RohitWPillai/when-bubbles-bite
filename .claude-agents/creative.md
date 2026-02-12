# Creative Direction: "When Bubbles Bite" Exhibit App

Living ideas document for making the Bubble Quiz app more engaging, delightful, and memorable for kids aged 8-14 at Edinburgh Science Festival 2026.

**Last updated:** 2026-02-12
**Status:** Brainstorm (nothing implemented yet)

---

## 1. Underwater Atmosphere

The current scene has ~50 decorative bubbles rising against a teal-to-navy gradient. That is a solid foundation, but right now it reads as "circles on a gradient" rather than "I am underwater." The goal is to make the canvas feel like a living ocean without tanking frame rate.

### 1a. Animated Fish (Nemo wink, not Nemo copy)

**What it looks like:** 3-5 small fish drawn entirely with canvas paths. Simple body shapes (elongated ovals with a forked tail, a dorsal fin, a dot eye). Each fish has its own colour from a tropical palette (orange-and-white stripes, bright yellow, electric blue, reddish-pink). They swim lazily across the screen on sine-wave paths at varying depths (depth encoded by size and opacity, same trick as the decorative bubbles). When a question bubble pops, nearby fish startle: they dart away from the burst point with a quick acceleration, then lazily return to their path.

**How to draw them (no images):** A single `drawFish(x, y, size, angle, colorScheme)` function using `ctx.beginPath()`, `bezierCurveTo` for the body, `lineTo` for the tail fork, small `arc` for the eye. Stripe patterns via a second fill pass with clipping. Total: ~30 path operations per fish, negligible at 5 fish.

**Behaviour:**
- Swim left-to-right or right-to-left, wrapping off-screen
- Gentle vertical sine wobble (amplitude ~20px, period ~4s)
- Occasionally one fish "turns" (flip scaleX) and swims back
- Startle radius: 150px from any burst. Startle = velocity spike away from burst, decay over 0.5s

**Complexity:** Medium (path drawing + simple steering AI)
**Impact:** High. Fish are the single highest-leverage addition for "this feels like an ocean." Kids will point at them.

### 1b. Volumetric Light Rays (God Rays)

**What it looks like:** 3-4 soft, wide, diagonal bands of lighter colour (rgba white, ~3-5% opacity) descending from the top-left corner, slowly swaying. They simulate sunlight filtering down through water. Rendered as tapered trapezoids with a gradient from top (brighter) to bottom (transparent).

**How it works:** Draw 3-4 filled paths behind the bubbles but in front of the background gradient. Each ray sways slowly (sin-based, period ~6-10s, amplitude ~20px horizontal). Redraw each frame. Cheap because it is 3-4 filled polygons with low opacity.

**Complexity:** Low (4 extra draw calls per frame)
**Impact:** Medium-high. Transforms the scene from "deep navy void" to "sunlit water." Subtle but kids will feel it.

### 1c. Drifting Particles / Marine Snow

**What it looks like:** 20-30 tiny (1-3px) white dots drifting slowly downward at varying speeds, with very low opacity (0.1-0.2). They mimic the organic particles that float in real ocean water (marine snow). Some drift slightly sideways.

**How it works:** Same architecture as decorative bubbles but moving downward. Ultra-cheap: just `ctx.arc` + `ctx.fill` at low opacity.

**Complexity:** Low (reuse existing bubble pool pattern)
**Impact:** Medium. Adds depth and realism. Adults will notice it more than kids, but it enriches the backdrop for everyone.

### 1d. Seaweed / Kelp at the Bottom Edge

**What it looks like:** 3-5 seaweed fronds anchored along the bottom edge of the screen, swaying gently. Drawn as stacked bezier curves in dark green/teal, each segment offset by a phase-shifted sine wave so the frond appears to wave in a current. Fronds vary in height (10-25% of screen height) and lean in the same general direction to imply current.

**How it works:** Each frond is a series of 6-8 control points. The x-offset of each point oscillates with `sin(time * freq + segmentIndex * phaseStep)`. Draw as a thick stroke with rounded caps, or as a filled tapered shape. Colours: dark teal (#1a5c4f) to deep green (#0d3b2e), blending with the background bottom.

**Complexity:** Medium (bezier math, but only 3-5 objects)
**Impact:** Medium. Grounds the scene. Right now the bottom of the screen is just dark gradient; seaweed gives it a "floor."

### 1e. Distant Jellyfish (Background Layer)

**What it looks like:** 1-2 jellyfish at very low opacity (0.08-0.12) drifting slowly in the mid-background. Drawn as a semi-circle dome with trailing sine-wave tentacles. They pulse (dome contracts and expands) with a slow period (~3s). Colour: pale translucent blue-white.

**How it works:** Canvas paths for the dome (arc) and tentacles (sine-wave strokes). Pulse achieved by scaling the dome radius. Very few draw calls. Placed behind decorative bubbles in the draw order.

**Complexity:** Medium
**Impact:** Medium. A surprise discovery moment when a kid notices "wait, is that a jellyfish?" Adds wonder.

---

## 2. Answer Presentation (Visual, Not Text-Heavy)

The current answers work but lean heavily on text. The bar chart (speed question) is already strong. The "big reveal" format is punchy. The text-fact lists, however, are walls of text that a restless 10-year-old will glaze over. Here are visual redesigns for each of the 6 questions.

### 2a. Speed Question: "How fast can a bubble collapse?"

**Current:** Bar chart with human / cheetah / fighter jet / bubble. This is already the strongest answer.

**Enhancement:** Add a simple animated race line. After the bars grow, animate 4 small emoji/icons racing left to right across a "track" at the bottom of the answer card, each at speed proportional to their value. The bubble icon zooms off-screen instantly while the human barely moves. Kids will laugh.

**Complexity:** Low-medium (CSS animation on the emoji icons, staggered timing)
**Impact:** High. Turns a static chart into a moment of "WHOA the bubble just disappeared."

### 2b. Temperature Question: "How hot is a collapsing bubble?"

**Current:** Big reveal (4,700 C) with comparison text to the Sun.

**Enhancement:** Replace the text comparison with a visual thermometer or colour gradient. Show a vertical gradient strip with labelled markers: body temperature at the bottom (37 C, blue), oven (250 C, orange), lava (1,200 C, red), and then the cavitation bubble (4,700 C, blinding white/yellow) near the top, with the Sun (5,500 C) at the very top. The strip animates by "filling up" from bottom to top, pausing briefly at each landmark. Use emoji at each marker: a person emoji, an oven, a volcano, a bubble, a sun. The 4,700 number still pops big, but now it has visual context.

**Complexity:** Medium (DOM elements with staggered animation, or a canvas-drawn thermometer)
**Impact:** High. "As hot as the Sun" is way more visceral when you see the bubble sitting right next to the Sun on a scale, with lava far below.

### 2c. Destruction Question: "Can bubbles destroy metal?"

**Current:** Four text bullet points about ship propellers, micro-jets, cost, and the demo.

**Enhancement:** A visual before/after. Show two side-by-side panels:
- Left: a simple canvas-drawn propeller (clean, shiny, drawn with arcs and fills). Label: "New propeller"
- Right: the same propeller but with pitted, rough edges (drawn with jagged paths, small holes, rough outlines). Label: "After cavitation"

Below: a single short sentence ("Millions of tiny bubble collapses chew through solid metal") and a connection to the demo ("The balloon burst you just saw? Imagine millions of those hitting steel.").

Replace the 4-bullet list with: propeller visual + one emoji stat row: "100 m/s micro-jets" with a target emoji, "Billions spent on repairs" with a money emoji. Two lines, not four paragraphs.

**Complexity:** Medium (canvas drawing of the propeller, or CSS-composed simplified shape)
**Impact:** High. Visual before/after is instantly understood. Kids do not read four bullet points; they absolutely will stare at a chewed-up propeller.

### 2d. Useful Applications: "Can cavitation be useful?"

**Current:** Four text bullet points (teeth, medicine, water purification, engineering).

**Enhancement:** A 2x2 icon grid, each cell being a large emoji (tooth, pill, water drop, rocket) with a one-line label underneath. Cells fade in one at a time with a slight bounce. Tapping/touching a cell could expand it to show one extra sentence, but the default view is just the icon grid. This is the "IKEA instructions" approach: communicate with pictures, not paragraphs.

Layout:
```
  [ tooth emoji ]      [ pill emoji ]
   Cleans teeth      Mixes medicine

  [ water emoji ]    [ gear emoji ]
  Purifies water    Better propellers
```

**Complexity:** Low (DOM grid with CSS transitions)
**Impact:** High. Four icons with four short phrases replaces a wall of text. Comprehension goes up, time-to-understand goes down.

### 2e. Where Does Cavitation Happen?

**Current:** Four text bullet points (ships, pistol shrimp, pipes, blenders).

**Enhancement:** An illustrated "map" or scene. A single wide canvas-drawn underwater/above-water cross-section scene showing:
- A ship on the water surface with propeller churning below (bubbles drawn near the prop)
- A shrimp on the ocean floor snapping its claw (with a visible shockwave ring)
- A pipe/pump icon with bubbles inside
- A kitchen counter above water with a blender

Each element has a short label. Elements appear one by one with a slight slide-in animation (left to right across the scene), giving it a storyboard feel.

Alternatively, if the full scene is too complex: a horizontal scrolling strip of 4 "postcard" illustrations, each a simple canvas vignette.

**Complexity:** High (the full scene approach) or Medium (the postcard strip)
**Impact:** High. "Where does it happen?" is fundamentally a spatial question. Answering it with a scene rather than a list is a natural fit.

### 2f. Pistol Shrimp: "Which animal uses bubbles as a weapon?"

**Current:** Big reveal ("Pistol Shrimp") with comparison text about its abilities.

**Enhancement:** Keep the big reveal moment but add a canvas-drawn shrimp character. The reveal sequence:
1. "The secret weapon belongs to the..." (text fades in)
2. A cartoon shrimp slides in from the side, drawn with canvas paths (simple body, big claw, dot eyes, antennae). It pauses.
3. The claw SNAPS (quick animation: claw closes, a shockwave ring expands from the claw tip, small flash of light)
4. "PISTOL SHRIMP" text pops in with the existing scale-up animation
5. Below: three stat badges in a row: "5 cm long" (with a ruler icon), "4,700 C" (with a fire icon), "218 dB" (with a speaker icon)

The stat badges replace the paragraph of text. Three numbers tell the story better than five sentences.

**Complexity:** Medium-high (canvas-drawn shrimp + snap animation)
**Impact:** Very high. This is the single most memorable question/answer in the quiz. A cartoon shrimp that snaps its claw on screen will be the thing kids tell their parents about.

---

## 3. Interaction Delight

### 3a. Decorative Bubble Popping

**What it is:** When kids tap a decorative bubble (not a question bubble), it pops with a smaller, quieter burst (half the particle count, no shockwave ring). No answer appears. Just a satisfying micro-pop.

**Why:** Kids will instinctively try to pop everything. Rewarding that instinct keeps them engaged and makes discovering the question bubbles feel intentional ("oh, THESE ones have questions!"). The decorative pop is clearly "less" than the question pop, so the hierarchy is preserved.

**How:** Add hit detection for decorative bubbles in the pointerdown handler, after the question bubble check. On hit, spawn a mini-burst (8 particles, no rings), play a quieter/higher-pitched pop, and reset the bubble to the bottom. No state change.

**Complexity:** Low (reuse existing burst code, add hit check)
**Impact:** High. This is the single most impactful "delight" addition. Kids who are hesitant to tap question bubbles will pop a few decorative ones first and get hooked.

### 3b. Fish React to Touch

**What it is:** If a fish is swimming near where a kid taps (within ~100px), the fish darts away. If the kid keeps chasing and tapping near a fish, it gets progressively faster at fleeing. Not catchable, just reactive.

**Why:** This creates emergent play. Kids will try to "catch" the fish. They will fail (by design) but laugh trying.

**Complexity:** Low (if fish exist, add a distance check in the pointerdown handler)
**Impact:** Medium-high. Creates a secondary game-within-the-game.

### 3c. Combo Counter / Streak Glow

**What it is:** If a kid pops question bubbles in quick succession (within 10s of dismissing the previous answer), the burst effect gets progressively more dramatic: more particles, brighter glow, a wider shockwave ring, and a subtle screen flash. Visual only, no score displayed (this is not a game, just a quiz with escalating spectacle).

**Why:** Rewards engagement without gamifying the science. The escalation is itself the reward.

**Complexity:** Low (track time since last pop, scale burst params)
**Impact:** Medium. Subtle but creates a "getting into it" momentum.

### 3d. Hidden Jellyfish Easter Egg

**What it is:** If the background jellyfish (from 1e) is tapped, it lights up briefly with bioluminescence (a radial glow of pale green/blue expanding from the dome, fading over 1s). A tiny text appears: "Bioluminescence!" and fades.

**Why:** Reward for observation. Kids who notice the jellyfish and tap it get a bonus science word.

**Complexity:** Low (if jellyfish exist, add hit detection and a glow animation)
**Impact:** Medium. A delightful secret. Kids will show each other.

### 3e. Shockwave Ripple on Any Tap

**What it is:** Every tap on the canvas (even on empty water) produces a single subtle shockwave ring (same as the burst ring, but just one, smaller, lower opacity). This gives the feeling that tapping the water "does something" everywhere.

**Why:** Eliminates the "dead zone" problem where tapping empty space has no feedback, which makes the app feel broken. Now every tap is acknowledged.

**Complexity:** Very low (spawn one ring particle on any pointerdown that does not hit a question bubble)
**Impact:** Medium. Satisfying, responsive, teaches kids that the screen is interactive.

### 3f. Bubble Trail Following Finger

**What it is:** When a kid drags their finger across the screen (during bubble state), a trail of tiny decorative bubbles spawns along the finger path, rising upward. Like drawing with bubbles.

**Why:** Tactile play. Kids will draw shapes, write their names, etc. Pure delight.

**How:** On pointermove events, spawn a decorative micro-bubble (r=4-6) at the touch position, added to a separate short-lived pool (max 30, each with ~2s lifespan, rising fast).

**Complexity:** Low-medium (new event listener, small bubble pool)
**Impact:** High. Tangible, surprising, unique. "You can draw with bubbles!"

---

## 4. Visitor Flow

### 4a. Attract Screen: Animated Shrimp Claw Snap

**What it is:** On the splash screen, behind the title text, show a looping animation: a simplified shrimp claw snapping, producing a shockwave ring that ripples outward. This plays continuously as the attract loop. It is both visually striking (motion catches the eye from 2m away) and thematically connected to the exhibit.

**How:** Canvas-drawn claw (two curved shapes that close together), with a shockwave ring spawning at the snap point. Loop every 4 seconds. Drawn on the main canvas behind the splash DOM overlay (which has a semi-transparent background, so the animation shows through).

**Complexity:** Medium
**Impact:** High. The attract screen currently has a static title with pulsing text. An animated claw snap is far more eye-catching from across the room.

### 4b. Attract Screen: Bubble That Floats Up Into the Title

**What it is:** A single large, glowing bubble rises slowly from the bottom of the splash screen and "becomes" the 'O' in "Bubbles" (or simply floats up and pops against the title text with a satisfying burst). Loops every 6 seconds.

**How:** A canvas-drawn bubble on a timed path. When it reaches the title y-position, trigger a burst. The splash overlay shows the title text above the canvas, so the bubble appears to pop behind/against the title.

**Complexity:** Low
**Impact:** Medium. Adds life to the attract screen with minimal effort.

### 4c. Session Arc: Progressive Depth

**What it is:** As the kid pops more question bubbles, the background gradient subtly shifts from lighter (shallow water) to darker (deep ocean). The first question feels like "near the surface" (brighter teal), and by the 4th question the water is deep navy. Fish species could change too (if implemented): bright tropical fish near the surface, then a pale deep-sea creature later.

**Why:** Creates a journey arc. The session feels like it is going somewhere, not just popping random bubbles.

**How:** Track `questionsAnswered` counter. Interpolate bgTop and bgBottom colours. Regenerate the background canvas after each answer dismiss.

**Complexity:** Medium
**Impact:** Medium-high. Gives the session narrative structure. "I went deeper!" is something kids will articulate to their parents.

### 4d. Exit Screen: "You Explored the Deep!"

**What it is:** After the kid has answered 4+ questions and the idle timer is approaching, OR after a natural "all questions seen" state, show a brief completion screen before reverting to splash:

- "You explored the deep!" in large teal text
- A row of emoji summarising what they learned: a shrimp, a propeller, a thermometer, a tooth
- "Now go watch the real thing!" pointing toward the balloon-burst tank
- Fades to splash after 5s

**Why:** Right now the session just... times out back to splash. That feels like abandonment. A brief "well done" screen provides closure and directs kids to the physical demo.

**Complexity:** Low (DOM overlay, similar to splash)
**Impact:** Medium-high. Closure matters. The last thing a visitor sees should be positive and directional.

### 4e. Progress Indicator: Bubble Count

**What it is:** A subtle row of 4-6 small empty bubble outlines in the top-left corner. As the kid pops question bubbles, the corresponding outline fills in (becomes a solid teal circle). This gives a sense of progress without being a "score."

**Why:** Kids want to feel completeness. "I got 3 out of 6" is motivating. It also subtly suggests "there are more to find."

**Complexity:** Low (DOM or canvas overlay, track questionsAnswered)
**Impact:** Medium. Provides structure. Some kids will try to "collect them all."

---

## 5. Exhibit Connection

The physical exhibit features a tank where a spark creates a cavitation bubble that collapses and bursts a balloon. The app needs to be the before or after to that live moment.

### 5a. "You Just Saw This" Opening

**What it is:** After the splash screen is tapped, before the bubbles appear, show a 3-second animated sequence: a simplified canvas-drawn version of what they just saw in the tank. A circle (the bubble) appears, expands, collapses, and a small balloon shape pops. Then text: "That was cavitation. Want to know what just happened?" Transition to the bubble field.

**Why:** Bridges the physical and digital experience. The kid saw something dramatic but probably does not understand it. The app says: "I can explain."

**Complexity:** Medium (short canvas animation sequence)
**Impact:** Very high. This is the single strongest exhibit connection possible. It transforms the app from a standalone quiz into the explanatory companion to the demo.

### 5b. "Balloon Pop" Question Bubble

**What it is:** One of the question bubbles contains a tiny canvas-drawn balloon inside (instead of text). When tapped, the answer explains exactly what happened in the tank: the spark, the pressure drop, the bubble forming, collapsing, and the shockwave popping the balloon. The explanation uses a step-by-step visual sequence (4 panels: spark, bubble grows, bubble collapses, balloon pops) rather than text.

**Why:** The demo is the hook; this question is the payoff. "How did that work?" is the most natural question a kid has after watching the demo.

**Complexity:** Medium-high (4-panel animated explanation)
**Impact:** Very high. Directly answers the question the exhibit raises.

### 5c. Demo Timing Callout

**What it is:** A subtle, non-intrusive banner at the bottom of the bubble field that says "Live demo every 15 minutes" (or whatever the actual timing is). Styled as a translucent bar, same as the underwater aesthetic.

**Why:** Practical wayfinding. If kids arrive between demos, the app tells them to stick around.

**Complexity:** Very low (DOM element)
**Impact:** Low-medium. Practical but not delightful.

### 5d. Shockwave Echo

**What it is:** When the kid pops a question bubble, in addition to the existing burst, add a brief screen-edge shockwave: a faint ring that expands from the pop point all the way to the canvas edges, similar to what happens in the tank when the real bubble collapses. This is different from the existing burst rings (which are small and fade quickly); this one spans the whole screen and is very faint.

**Why:** Reinforces the connection between "bubble pop on screen" and "shockwave in the tank." The visual language matches the real physics.

**Complexity:** Low (one large expanding ring, very low opacity, fading at the edges)
**Impact:** Medium. Subtle reinforcement of the core science.

---

## Implementation Priority Matrix

Organised by impact vs. effort. Start from the top.

### Tier 1: Do First (high impact, low-medium effort)

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Decorative bubble popping | 3a | Low | High |
| Shockwave ripple on any tap | 3e | Very low | Medium |
| God rays (light beams) | 1b | Low | Medium-high |
| Useful apps: icon grid | 2d | Low | High |
| Exit screen | 4d | Low | Medium-high |
| Bubble trail on finger drag | 3f | Low-medium | High |

### Tier 2: Do Next (high impact, medium effort)

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Fish swimming | 1a | Medium | High |
| Temperature thermometer visual | 2b | Medium | High |
| "You just saw this" opening | 5a | Medium | Very high |
| Pistol shrimp reveal animation | 2f | Medium-high | Very high |
| Speed question race animation | 2a | Low-medium | High |
| Destruction before/after propeller | 2c | Medium | High |

### Tier 3: Polish (medium impact, medium effort)

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Seaweed at bottom | 1d | Medium | Medium |
| Marine snow particles | 1c | Low | Medium |
| Progressive depth arc | 4c | Medium | Medium-high |
| Progress bubble counter | 4e | Low | Medium |
| Attract screen claw snap | 4a | Medium | High |
| Fish react to touch | 3b | Low | Medium-high |
| Shockwave echo (full-screen) | 5d | Low | Medium |

### Tier 4: If Time Permits (nice to have)

| Idea | Section | Effort | Impact |
|---|---|---|---|
| Background jellyfish | 1e | Medium | Medium |
| Jellyfish easter egg | 3d | Low | Medium |
| Combo streak glow | 3c | Low | Medium |
| "Where" scene illustration | 2e | High | High |
| Balloon pop question | 5b | Medium-high | Very high |
| Attract bubble-into-title | 4b | Low | Medium |
| Demo timing banner | 5c | Very low | Low-medium |

---

## Design Principles (for all additions)

1. **Canvas first, DOM for overlays.** All ambient/background visuals go on the canvas. Answer content stays as DOM overlays for accessibility and text rendering.

2. **Object pool everything.** No `new` in the render loop. Pre-allocate fish, particles, seaweed segments. Reuse.

3. **Depth through opacity.** Far-away things are small + translucent. Close things are large + opaque. This is already established by the decorative bubbles; extend it to fish, jellyfish, particles.

4. **One "whoa" per answer.** Every answer should have exactly one moment that makes a kid's eyes widen: the bar chart race, the thermometer filling past lava, the chewed propeller, the icon grid popping in, the shrimp snapping, the scene appearing. If an answer does not have that moment, it needs one.

5. **Three-second rule.** If a kid cannot understand the answer's main point within 3 seconds of it appearing, there is too much text. Lead with the visual, follow with one sentence of explanation.

6. **Sound is a bonus, never required.** Every interaction must be visually satisfying even on mute. The venue is noisy; most kids will not hear the audio.

7. **Test on iPad Safari at 60fps.** Every addition must be profiled. If any single addition drops frames, simplify it. The god rays, fish, and particles combined should not exceed ~100 extra draw calls per frame.

---

## Open Questions

- **How many question bubbles visible at once?** Currently 4. With richer answer animations, kids may want to linger on each. Consider reducing to 3 to slow the pace slightly.
- **Session length target?** Currently 2-4 min via idle timeout. If we add a "completion" state after seeing all 6 questions, that might extend to 5 min. Is that too long for throughput?
- **Demo frequency?** Need to know the balloon-burst demo timing to calibrate the demo timing banner (5c) and the "go watch" callout on the exit screen.
- **iPad model?** Performance budget depends on whether this is an iPad Air, iPad Pro, or older model. Fish + god rays + particles + finger trail is fine on an A14 or later, but an A10 might struggle.
- **Colour-blind accessibility?** Current palette is teal/white/navy, which is safe. But the fish colours and the thermometer gradient should be checked against deuteranopia.
