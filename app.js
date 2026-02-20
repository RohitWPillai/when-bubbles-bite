// app.js — Bubble Quiz: underwater exhibit app for Edinburgh Science Festival 2026
(function () {
    'use strict';

    // =========================================================================
    // Constants
    // =========================================================================

    var COLORS = {
        bgTop: '#1a6e8a',
        bgBottom: '#091f36',
        bubbleRim: 'rgba(200, 230, 255, 0.4)',
        bubbleHighlight: 'rgba(255, 255, 255, 0.7)',
        questionRim: 'rgba(127, 219, 218, 0.8)',
        questionGlow: 'rgba(127, 219, 218, 0.5)',
        questionFill: 'rgba(30, 80, 120, 0.7)',
        questionText: '#ffffff',
        teal: 'rgba(127, 219, 218, ',
        lightBlue: 'rgba(200, 235, 255, ',
    };

    var DECORATIVE_COUNT = 50;
    var QUESTION_BUBBLE_COUNT = 4;
    var MAX_PARTICLES = 120;
    var BURST_PARTICLE_COUNT = 24;
    var BURST_RING_COUNT = 3;
    var MINI_BURST_COUNT = 8;
    var IDLE_TIMEOUT_MS = 45000;
    var QUESTION_COOLDOWN_MS = 60000;
    var HIT_FORGIVENESS = 1.3;
    var DPR_CAP = 1.5;
    var FISH_COUNT = 5;
    var GOD_RAY_COUNT = 4;
    var PARTICLE_LIFE_DT = 30;
    var RING_LIFE_DT = 36;
    var MARINE_SNOW_COUNT = 100;
    var CAUSTIC_COUNT = 25;
    var IDLE_WARNING_MS = 40000; // show warning 5s before reset
    var SEAWEED_COUNT = 6;
    var SEAWEED_SEGMENTS = 10;
    var BIOLUM_PARTICLE_COUNT = 40;

    // Fish colour schemes (Nemo wink but distinct)
    var FISH_PALETTES = [
        { body: '#f4845f', fin: '#f76707', stripe: '#fff3e6', eye: '#1a1a2e' },  // orange-red
        { body: '#ffd43b', fin: '#f59f00', stripe: '#fff9db', eye: '#1a1a2e' },  // yellow
        { body: '#4dabf7', fin: '#228be6', stripe: '#d0ebff', eye: '#1a1a2e' },  // bright blue
        { body: '#69db7c', fin: '#37b24d', stripe: '#d3f9d8', eye: '#1a1a2e' },  // green
        { body: '#e599f7', fin: '#be4bdb', stripe: '#f3d9fa', eye: '#1a1a2e' },  // purple-pink
    ];

    // =========================================================================
    // Canvas setup
    // =========================================================================

    var canvas = document.getElementById('bubble-canvas');
    var ctx = canvas.getContext('2d');
    var W, H, dpr;

    var bgCanvas = document.createElement('canvas');
    var bgCtx = bgCanvas.getContext('2d');

    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderBackground();
    }

    function renderBackground() {
        bgCanvas.width = W * dpr;
        bgCanvas.height = H * dpr;
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var grad = bgCtx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, COLORS.bgTop);
        grad.addColorStop(1, COLORS.bgBottom);
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, W, H);
    }

    window.addEventListener('resize', function () {
        resizeCanvas();
        for (var i = 0; i < questionBubbles.length; i++) {
            var qb = questionBubbles[i];
            if (qb.active) {
                qb.x = Math.min(qb.x, W - qb.r - 10);
                qb.x = Math.max(qb.x, qb.r + 10);
                qb.y = Math.min(qb.y, H + qb.r);
            }
        }
        initSeaweed();
        initJellyfish();
    });

    resizeCanvas();

    // =========================================================================
    // App state
    // =========================================================================

    var State = { SPLASH: 0, BUBBLES: 1, ANSWER: 2 };
    var appState = State.SPLASH;
    var lastInteraction = Date.now();
    var animTime = 0; // module-scoped animation time for hit detection
    var streak = 0; // consecutive question pops
    var unlockedCreatures = {}; // keyed by question ID
    var creatureFlashText = ''; // "New creature!" text
    var creatureFlashAlpha = 0;

    // =========================================================================
    // God rays
    // =========================================================================

    var godRays = [];
    for (var i = 0; i < GOD_RAY_COUNT; i++) {
        godRays.push({
            xFrac: 0.1 + i * 0.25 + Math.random() * 0.1, // fractional position
            width: 60 + Math.random() * 80,
            opacity: 0.03 + Math.random() * 0.025,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.15 + Math.random() * 0.1,
            swayAmp: 15 + Math.random() * 15,
        });
    }

    function drawGodRays(time) {
        for (var i = 0; i < godRays.length; i++) {
            var ray = godRays[i];
            var rayX = ray.xFrac * W;
            var sway = Math.sin(time * ray.swaySpeed + ray.swayOffset) * ray.swayAmp;
            var topX = rayX + sway;
            var botX = rayX + sway * 0.5 + ray.width * 0.8;
            var hw = ray.width / 2;

            // Shimmer: one ray briefly pulses every few seconds
            var shimmer = Math.max(0, Math.sin(time * 0.2 + i * 1.7)) > 0.95 ? 0.02 : 0;
            ctx.globalAlpha = ray.opacity + shimmer;
            ctx.beginPath();
            ctx.moveTo(topX - hw * 0.3, 0);
            ctx.lineTo(topX + hw * 0.3, 0);
            ctx.lineTo(botX + hw, H);
            ctx.lineTo(botX - hw, H);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 248, 220, 1)'; // warm cream tint
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // =========================================================================
    // Marine snow (ambient particles)
    // =========================================================================

    var marineSnow = [];
    for (var i = 0; i < MARINE_SNOW_COUNT; i++) {
        marineSnow.push({
            x: Math.random() * 2000, // will be clamped to W on draw
            y: Math.random() * 2000,
            size: 1 + Math.random() * 2,
            speed: 0.08 + Math.random() * 0.15,
            driftPhase: Math.random() * Math.PI * 2,
            driftFreq: 0.3 + Math.random() * 0.4,
            driftAmp: 0.2 + Math.random() * 0.4,
            alpha: 0.08 + Math.random() * 0.07,
            twinklePhase: Math.random() * Math.PI * 2,
        });
    }

    function updateMarineSnow(dt) {
        for (var i = 0; i < marineSnow.length; i++) {
            var s = marineSnow[i];
            s.y += s.speed * dt;
            s.x += Math.sin(animTime * s.driftFreq + s.driftPhase) * s.driftAmp * dt;
            if (s.y > H + 5) {
                s.y = -5;
                s.x = Math.random() * W;
            }
            if (s.x > W + 5) s.x = -5;
            if (s.x < -5) s.x = W + 5;
        }
    }

    function drawMarineSnow(time) {
        for (var i = 0; i < marineSnow.length; i++) {
            var s = marineSnow[i];
            var twinkle = 0.7 + 0.3 * Math.sin(time * 1.5 + s.twinklePhase);
            ctx.globalAlpha = s.alpha * twinkle;
            ctx.fillStyle = '#fff';
            ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
        }
        ctx.globalAlpha = 1;
    }

    // =========================================================================
    // Caustic light overlay
    // =========================================================================

    var causticSprites = []; // pre-rendered offscreen canvases
    var caustics = [];

    function initCaustics() {
        // Pre-render 4 sizes of soft gradient circles
        var sizes = [30, 50, 70, 90];
        causticSprites = [];
        for (var s = 0; s < sizes.length; s++) {
            var sz = sizes[s];
            var oc = document.createElement('canvas');
            oc.width = sz * 2;
            oc.height = sz * 2;
            var octx = oc.getContext('2d');
            var grad = octx.createRadialGradient(sz, sz, 0, sz, sz, sz);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            octx.fillStyle = grad;
            octx.beginPath();
            octx.ellipse(sz, sz, sz, sz * 0.65, 0, 0, Math.PI * 2);
            octx.fill();
            causticSprites.push(oc);
        }

        caustics = [];
        for (var i = 0; i < CAUSTIC_COUNT; i++) {
            caustics.push({
                x: Math.random() * 2000,
                y: 0.5 + Math.random() * 0.5, // fractional Y in lower half
                sprite: Math.floor(Math.random() * sizes.length),
                driftXPhase: Math.random() * Math.PI * 2,
                driftYPhase: Math.random() * Math.PI * 2,
                driftXFreq: 0.013 + Math.random() * 0.02,
                driftYFreq: 0.019 + Math.random() * 0.015,
                driftXAmp: 20 + Math.random() * 40,
                driftYAmp: 10 + Math.random() * 20,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseFreq: 0.4 + Math.random() * 0.6,
                baseAlpha: 0.03 + Math.random() * 0.03,
            });
        }
    }

    initCaustics();

    function drawCaustics(time) {
        var prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < caustics.length; i++) {
            var c = caustics[i];
            var cx = (c.x / 2000) * W + Math.sin(time * c.driftXFreq + c.driftXPhase) * c.driftXAmp;
            var cy = c.y * H + Math.sin(time * c.driftYFreq + c.driftYPhase) * c.driftYAmp;
            var pulse = 0.8 + 0.2 * Math.sin(time * c.pulseFreq + c.pulsePhase);
            var sprite = causticSprites[c.sprite];
            ctx.globalAlpha = c.baseAlpha * pulse;
            ctx.drawImage(sprite, (cx - sprite.width / 2) | 0, (cy - sprite.height / 2) | 0);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prevComp;
    }

    // =========================================================================
    // Seaweed silhouettes
    // =========================================================================

    var seaweeds = [];
    function initSeaweed() {
        seaweeds = [];
        for (var i = 0; i < SEAWEED_COUNT; i++) {
            seaweeds.push({
                xFrac: 0.05 + (i / (SEAWEED_COUNT - 1)) * 0.9 + (Math.random() - 0.5) * 0.08,
                baseHeight: 80 + Math.random() * 60,
                segments: SEAWEED_SEGMENTS,
                swayFreq: 0.4 + Math.random() * 0.3,
                swayFreq2: 0.17 + Math.random() * 0.1, // second frequency to avoid mechanical look
                swayAmp: 4 + Math.random() * 4,
                phase: Math.random() * Math.PI * 2,
                baseWidth: 5 + Math.random() * 2,
                color: 'rgba(' + (10 + Math.floor(Math.random() * 15)) + ',' +
                       (40 + Math.floor(Math.random() * 20)) + ',' +
                       (35 + Math.floor(Math.random() * 15)) + ',',
            });
        }
    }
    initSeaweed();

    function drawSeaweed(time) {
        for (var s = 0; s < seaweeds.length; s++) {
            var sw = seaweeds[s];
            var baseX = sw.xFrac * W;
            var baseY = H;
            var segLen = sw.baseHeight / sw.segments;

            ctx.beginPath();
            ctx.moveTo(baseX, baseY);

            var prevX = baseX;
            var prevY = baseY;
            for (var i = 1; i <= sw.segments; i++) {
                var t = i / sw.segments; // 0→1 from base to tip
                var sway = Math.sin(time * sw.swayFreq + sw.phase + i * 0.4) * sw.swayAmp * t;
                sway += Math.sin(time * sw.swayFreq2 + sw.phase * 1.7 + i * 0.3) * sw.swayAmp * 0.5 * t;
                var nx = baseX + sway;
                var ny = baseY - i * segLen;
                var mx = (prevX + nx) / 2;
                var my = (prevY + ny) / 2;
                ctx.quadraticCurveTo(prevX, prevY, mx, my);
                prevX = nx;
                prevY = ny;
            }

            ctx.lineWidth = sw.baseWidth;
            ctx.strokeStyle = sw.color + '0.8)';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Draw again thinner for depth
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            prevX = baseX;
            prevY = baseY;
            for (var i = 1; i <= sw.segments; i++) {
                var t = i / sw.segments;
                var sway = Math.sin(time * sw.swayFreq + sw.phase + i * 0.4) * sw.swayAmp * t;
                sway += Math.sin(time * sw.swayFreq2 + sw.phase * 1.7 + i * 0.3) * sw.swayAmp * 0.5 * t;
                var nx = baseX + sway;
                var ny = baseY - i * segLen;
                var mx = (prevX + nx) / 2;
                var my = (prevY + ny) / 2;
                ctx.quadraticCurveTo(prevX, prevY, mx, my);
                prevX = nx;
                prevY = ny;
            }
            ctx.lineWidth = sw.baseWidth * 0.5;
            ctx.strokeStyle = sw.color + '0.4)';
            ctx.stroke();
        }
    }

    // =========================================================================
    // Jellyfish
    // =========================================================================

    var jellyfish = {
        x: 0, y: 0,
        lissA: 0.15, lissB: 0.1, // Lissajous frequencies
        lissAmpX: 0, lissAmpY: 0,
        bellRadius: 35,
        pulsePhase: 0,
        tentacles: 5,
        opacity: 0.38,
        // Propulsion state
        propCycle: 0,        // 0-1 cycle phase
        propVy: 0,           // vertical velocity from propulsion
        propYOffset: 0,      // accumulated vertical offset
    };

    function initJellyfish() {
        jellyfish.x = W * (0.3 + Math.random() * 0.4);
        jellyfish.y = H * (0.25 + Math.random() * 0.3);
        jellyfish.lissAmpX = W * 0.15;
        jellyfish.lissAmpY = H * 0.1;
        jellyfish.lissA = 0.03 + Math.random() * 0.02;
        jellyfish.lissB = 0.019 + Math.random() * 0.01;
    }
    initJellyfish();

    function drawJellyfish(time) {
        var jf = jellyfish;

        // Propulsion cycle: contract → impulse up → drift down → repeat
        var propPeriod = 3.5; // seconds per cycle
        jf.propCycle = (time % propPeriod) / propPeriod;
        var contractPhase = jf.propCycle;
        // Contraction in first 30% of cycle, relaxation in remaining 70%
        var contraction;
        if (contractPhase < 0.3) {
            contraction = Math.sin(contractPhase / 0.3 * Math.PI); // 0→1→0 during contraction
        } else {
            contraction = 0;
        }
        // Vertical impulse: upward push during contraction peak
        var impulse = contractPhase < 0.15 ? 0 : (contractPhase < 0.3 ? -1.2 * contraction : 0.3);
        jf.propVy = jf.propVy * 0.95 + impulse * 0.5;
        jf.propYOffset += jf.propVy * 0.016; // ~60fps dt
        // Clamp drift so it doesn't wander too far
        if (Math.abs(jf.propYOffset) > 30) jf.propYOffset *= 0.98;

        var cx = jf.x + Math.sin(time * jf.lissA) * jf.lissAmpX;
        var cy = jf.y + Math.sin(time * jf.lissB) * jf.lissAmpY + jf.propYOffset;

        // Bell shape reacts to propulsion
        var bellSquash = 1 - contraction * 0.25; // flatter when contracting
        var bellStretch = 1 + contraction * 0.15; // wider when contracting
        var r = jf.bellRadius * (0.85 + 0.15 * Math.sin(time * 2.1));

        ctx.save();
        ctx.globalAlpha = jf.opacity;
        ctx.translate(cx, cy);

        // Bell
        ctx.beginPath();
        var first = true;
        for (var a = 0; a <= Math.PI; a += 0.05) {
            var wobble = Math.sin(a * 3 + time * 2) * 2;
            var bx = Math.cos(a) * (r * bellStretch + wobble);
            var by = -Math.sin(a) * (r * 0.7 * bellSquash + wobble * 0.5);
            if (first) { ctx.moveTo(bx, by); first = false; }
            else ctx.lineTo(bx, by);
        }
        ctx.closePath();
        var bellGrad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
        bellGrad.addColorStop(0, 'rgba(180, 200, 240, 0.55)');
        bellGrad.addColorStop(0.5, 'rgba(200, 160, 220, 0.35)');
        bellGrad.addColorStop(1, 'rgba(160, 140, 200, 0.15)');
        ctx.fillStyle = bellGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Tentacles — quadratic bezier curves with independent phase-offset sway
        var bellBottom = r * 0.1;
        for (var t = 0; t < jf.tentacles; t++) {
            var tx = (t / (jf.tentacles - 1) - 0.5) * r * 1.6 * bellStretch;
            var tentLen = 50 + Math.sin(time * 0.7 + t) * 10;
            // Tentacles trail more during upward movement (contraction)
            var trailBias = contraction * 6;
            ctx.beginPath();
            ctx.moveTo(tx, bellBottom);
            for (var seg = 1; seg <= 4; seg++) {
                var st = seg / 4;
                var sway = Math.sin(time * 1.5 + t * 1.2 + seg * 0.8) * (10 * st) + trailBias * st;
                var cpx = tx + sway * 0.6 + Math.sin(time * 0.9 + t * 2.1 + seg) * 4;
                var cpy = bellBottom + (st - 0.12) * tentLen;
                var ex = tx + sway;
                var ey = bellBottom + st * tentLen;
                ctx.quadraticCurveTo(cpx, cpy, ex, ey);
            }
            ctx.strokeStyle = 'rgba(180, 160, 220, ' + (0.25 * (1 - 0.4 * (Math.abs(t - 2) / 2))) + ')';
            ctx.lineWidth = 2 - (1.5 * (Math.abs(t - 2) / (jf.tentacles - 1)));
            ctx.stroke();
        }

        ctx.restore();
    }

    // =========================================================================
    // Grain texture overlay
    // =========================================================================

    var grainCanvas = document.createElement('canvas');
    (function initGrain() {
        var sz = 256;
        grainCanvas.width = sz;
        grainCanvas.height = sz;
        var gctx = grainCanvas.getContext('2d');
        var imgData = gctx.createImageData(sz, sz);
        var d = imgData.data;
        for (var i = 0; i < d.length; i += 4) {
            var v = Math.floor(Math.random() * 256);
            d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
        }
        gctx.putImageData(imgData, 0, 0);
    })();

    var grainPattern = null; // created lazily (needs canvas context)

    function drawGrain() {
        if (!grainPattern) grainPattern = ctx.createPattern(grainCanvas, 'repeat');
        ctx.globalAlpha = 0.025;
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
    }

    // =========================================================================
    // Bioluminescence burst
    // =========================================================================

    var bioParticles = [];
    for (var i = 0; i < BIOLUM_PARTICLE_COUNT; i++) {
        bioParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, colorIdx: 0 });
    }

    var BIOLUM_COLORS = [
        'rgba(255, 255, 255, ',  // core flash
        'rgba(180, 248, 255, ',  // pale cyan
        'rgba(100, 255, 218, ',  // mint
        'rgba(29, 233, 182, ',   // teal-green
        'rgba(0, 121, 107, ',    // dark teal
    ];

    function spawnBioluminescence(cx, cy) {
        var spawned = 0;
        for (var i = 0; i < bioParticles.length && spawned < BIOLUM_PARTICLE_COUNT; i++) {
            if (bioParticles[i].active) continue;
            var p = bioParticles[i];
            p.active = true;
            p.x = cx;
            p.y = cy;
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.5 + Math.random() * 4;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 0;
            p.maxLife = 40 + Math.random() * 30;
            p.size = 2 + Math.random() * 4;
            p.colorIdx = Math.floor(Math.random() * BIOLUM_COLORS.length);
            spawned++;
        }
    }

    function updateBioParticles(dt) {
        var drag = Math.pow(0.96, dt);
        for (var i = 0; i < bioParticles.length; i++) {
            var p = bioParticles[i];
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= drag;
            p.vy *= drag;
        }
    }

    function drawBioParticles() {
        var prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < bioParticles.length; i++) {
            var p = bioParticles[i];
            if (!p.active) continue;
            var progress = p.life / p.maxLife;
            var alpha = (1 - progress) * 0.7;
            if (alpha < 0.01) continue;
            var col = BIOLUM_COLORS[p.colorIdx];
            // Glow halo (larger, dimmer)
            ctx.globalAlpha = alpha * 0.3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5 * (1 - progress * 0.3), 0, Math.PI * 2);
            ctx.fillStyle = col + '1)';
            ctx.fill();
            // Bright core (smaller, brighter)
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = col + '1)';
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prevComp;
    }

    // =========================================================================
    // Creature unlocks
    // =========================================================================

    // Each creature: { draw(time, dt), startTime }
    var CREATURE_DEFS = {
        speed: { name: 'Sea Turtle', emoji: '\u{1F422}' },
        temperature: { name: 'Glowing Jellyfish', emoji: '\u{1FAE7}' },
        destruction: { name: 'Hammerhead Shark', emoji: '\u{1F988}' },
        useful: { name: 'Seahorse', emoji: '\u{1F40E}' },
        where: { name: 'Fish School', emoji: '\u{1F41F}' },
        shrimp: { name: 'Pistol Shrimp', emoji: '\u{1F990}' },
    };

    // Sea turtle — glide dynamics with stroke/glide phases + body tilt
    function drawSeaTurtle(time, c) {
        var period = 40;
        var phase = ((time - c.startTime) % period) / period;
        var tri = Math.abs(2 * phase - 1);
        var x = -60 + tri * (W + 120) + (c.nudgeX || 0);
        var y = H * 0.2 + Math.sin(time * 0.3 + 1.5) * 20 + (c.nudgeY || 0);
        var sz = 28;

        // Stroke/glide cycle: 2.5s stroke, 2s glide
        var swimCycle = (time % 4.5) / 4.5;
        var isStroking = swimCycle < 0.55;
        // Smooth stroke intensity (ramps up and down during stroke phase)
        var strokeIntensity = isStroking ? Math.sin(swimCycle / 0.55 * Math.PI) : 0;
        // Glide tuck factor (flippers fold during glide)
        var glideTuck = isStroking ? 0 : Math.sin((swimCycle - 0.55) / 0.45 * Math.PI) * 0.5;

        // Body tilt: nose-up during upstroke, level during glide
        var bodyTilt = strokeIntensity * Math.sin(time * 2.5) * 0.08;

        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.translate(x, y);
        if (phase < 0.5) ctx.scale(-1, 1);
        ctx.rotate(bodyTilt); // subtle body tilt

        // Shell (teardrop/heart shape — tapered rear)
        ctx.beginPath();
        ctx.moveTo(sz * 1.05, 0);
        ctx.quadraticCurveTo(sz * 0.9, -sz * 0.6, 0, -sz * 0.55);
        ctx.quadraticCurveTo(-sz * 0.7, -sz * 0.4, -sz * 0.75, 0);
        ctx.quadraticCurveTo(-sz * 0.7, sz * 0.4, 0, sz * 0.55);
        ctx.quadraticCurveTo(sz * 0.9, sz * 0.6, sz * 1.05, 0);
        ctx.closePath();
        ctx.fillStyle = '#5a8a4a';
        ctx.fill();
        ctx.strokeStyle = '#3d6632';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Shell scute pattern
        ctx.beginPath();
        ctx.moveTo(sz * 0.9, 0);
        ctx.lineTo(-sz * 0.6, 0);
        ctx.moveTo(sz * 0.3, -sz * 0.05);
        ctx.quadraticCurveTo(0, -sz * 0.35, -sz * 0.4, -sz * 0.2);
        ctx.moveTo(sz * 0.3, sz * 0.05);
        ctx.quadraticCurveTo(0, sz * 0.35, -sz * 0.4, sz * 0.2);
        ctx.strokeStyle = 'rgba(61, 102, 50, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.ellipse(sz * 1.15, 0, sz * 0.32, sz * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#7ab867';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sz * 1.3, -sz * 0.06, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Front flippers — phase-offset pair (front-left with back-right like real turtles)
        // During stroke: active paddling; during glide: tucked position
        var flipBase = isStroking ? Math.sin(time * 2.5) * 0.4 * strokeIntensity : -0.15 * glideTuck;
        // Front-left flipper
        ctx.save();
        ctx.translate(sz * 0.5, -sz * 0.45);
        ctx.rotate(-0.5 + flipBase);
        ctx.beginPath();
        ctx.ellipse(8, 0, 18 - glideTuck * 4, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#7ab867';
        ctx.fill();
        ctx.restore();
        // Front-right flipper (opposite phase)
        var flipOpp = isStroking ? Math.sin(time * 2.5 + Math.PI) * 0.35 * strokeIntensity : -0.15 * glideTuck;
        ctx.save();
        ctx.translate(sz * 0.5, sz * 0.45);
        ctx.rotate(0.5 - flipOpp);
        ctx.beginPath();
        ctx.ellipse(8, 0, 18 - glideTuck * 4, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#7ab867';
        ctx.fill();
        ctx.restore();

        // Rear flippers — opposite phase to their front diagonal partner
        var rearFlipA = isStroking ? Math.sin(time * 2.5 + Math.PI) * 0.25 * strokeIntensity : -0.1 * glideTuck;
        ctx.save();
        ctx.translate(-sz * 0.55, -sz * 0.3);
        ctx.rotate(-0.3 + rearFlipA);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 - glideTuck * 2, 3.5, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#6aa85a';
        ctx.fill();
        ctx.restore();
        var rearFlipB = isStroking ? Math.sin(time * 2.5) * 0.25 * strokeIntensity : -0.1 * glideTuck;
        ctx.save();
        ctx.translate(-sz * 0.55, sz * 0.3);
        ctx.rotate(0.3 - rearFlipB);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 - glideTuck * 2, 3.5, 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#6aa85a';
        ctx.fill();
        ctx.restore();

        // Tail stub
        ctx.beginPath();
        ctx.moveTo(-sz * 0.7, 0);
        ctx.lineTo(-sz * 0.95, -sz * 0.08);
        ctx.lineTo(-sz * 0.95, sz * 0.08);
        ctx.closePath();
        ctx.fillStyle = '#6aa85a';
        ctx.fill();

        ctx.restore();
    }

    // Hammerhead — dark silhouette with S-curve body undulation
    var hammerSpine = []; // pre-allocated 5-segment spine
    for (var _hs = 0; _hs < 6; _hs++) hammerSpine.push({ x: 0, y: 0 });

    function drawHammerhead(time, c) {
        var period = 60;
        var phase = ((time - c.startTime) % period) / period;
        var tri = Math.abs(2 * phase - 1);
        var x = -60 + tri * (W + 120) + (c.nudgeX || 0);
        var y = H * 0.35 + Math.sin(time * 0.2) * 30 + (c.nudgeY || 0);
        var sz = 40;
        var segs = 5;
        var segLen = sz * 0.5; // each segment length
        var waveFreq = 2.5;
        var waveAmp = sz * 0.08;

        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.translate(x, y);
        if (phase < 0.5) ctx.scale(-1, 1);

        // Build spine: segment 0 = nose, segment 5 = tail tip
        // Each segment gets a phase-offset lateral sine displacement
        for (var i = 0; i <= segs; i++) {
            var t = i / segs; // 0 at nose, 1 at tail
            var spineX = sz * 1.2 - t * sz * 2.4; // nose to tail along x
            var lateral = Math.sin(time * waveFreq - t * Math.PI * 1.5) * waveAmp * t * t;
            hammerSpine[i].x = spineX;
            hammerSpine[i].y = lateral;
        }

        // Body as filled bezier strip connecting spine points
        var bodyHalfWidths = [sz * 0.15, sz * 0.22, sz * 0.2, sz * 0.15, sz * 0.08, sz * 0.03];
        ctx.beginPath();
        // Top edge (nose to tail)
        ctx.moveTo(hammerSpine[0].x, hammerSpine[0].y - bodyHalfWidths[0]);
        for (var i = 1; i <= segs; i++) {
            var prev = hammerSpine[i - 1];
            var cur = hammerSpine[i];
            var mx = (prev.x + cur.x) / 2;
            var myTop = (prev.y - bodyHalfWidths[i - 1] + cur.y - bodyHalfWidths[i]) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y - bodyHalfWidths[i - 1], mx, myTop);
        }
        ctx.lineTo(hammerSpine[segs].x, hammerSpine[segs].y - bodyHalfWidths[segs]);
        // Bottom edge (tail back to nose)
        for (var i = segs; i >= 1; i--) {
            var prev = hammerSpine[i];
            var cur = hammerSpine[i - 1];
            var mx = (prev.x + cur.x) / 2;
            var myBot = (prev.y + bodyHalfWidths[i] + cur.y + bodyHalfWidths[i - 1]) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y + bodyHalfWidths[i], mx, myBot);
        }
        ctx.closePath();
        ctx.fillStyle = '#1a2a3a';
        ctx.fill();

        // Hammer head (attached to spine[0])
        var hx = hammerSpine[0].x;
        var hy = hammerSpine[0].y;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + sz * 0.2, hy - sz * 0.35);
        ctx.quadraticCurveTo(hx + sz * 0.3, hy - sz * 0.35, hx + sz * 0.3, hy - sz * 0.2);
        ctx.lineTo(hx + sz * 0.1, hy);
        ctx.lineTo(hx + sz * 0.3, hy + sz * 0.2);
        ctx.quadraticCurveTo(hx + sz * 0.3, hy + sz * 0.35, hx + sz * 0.2, hy + sz * 0.35);
        ctx.closePath();
        ctx.fill();

        // Dorsal fin (attached to spine[1])
        var dx = hammerSpine[1].x;
        var dy = hammerSpine[1].y;
        ctx.beginPath();
        ctx.moveTo(dx + sz * 0.1, dy - bodyHalfWidths[1]);
        ctx.lineTo(dx, dy - sz * 0.55);
        ctx.lineTo(dx - sz * 0.15, dy - bodyHalfWidths[1]);
        ctx.fill();

        // Tail fin (follows spine naturally — no separate rotation needed)
        var tx = hammerSpine[segs].x;
        var ty = hammerSpine[segs].y;
        var tx1 = hammerSpine[segs - 1].x;
        var ty1 = hammerSpine[segs - 1].y;
        var tailAngle = Math.atan2(ty - ty1, tx - tx1);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tailAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-sz * 0.35, -sz * 0.3);
        ctx.lineTo(-sz * 0.2, 0);
        ctx.lineTo(-sz * 0.35, sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // Seahorse — body sway, animated tail curl, variable dorsal flutter
    function drawSeahorse(time, c) {
        var entryProgress = Math.min((time - c.startTime) * 0.5, 1);
        var baseY = H * 0.72 - entryProgress * H * 0.12;
        var x = W * 0.12 + Math.sin(time * 0.2 + 2) * 8 + (c.nudgeX || 0);
        var y = baseY + Math.sin(time * 0.8) * 6 + (c.nudgeY || 0);
        var sz = 12;

        // Body sway: gentle sinusoidal tilt side to side
        var bodySway = Math.sin(time * 0.6) * 0.06;

        // Tail curl oscillation: tighter ↔ looser
        var curlTight = 0.8 + 0.2 * Math.sin(time * 0.4);

        ctx.save();
        ctx.globalAlpha = 0.7 * entryProgress;
        ctx.translate(x, y);
        ctx.rotate(bodySway); // whole body tilts

        // Curled prehensile tail — curl radius oscillates
        ctx.beginPath();
        ctx.moveTo(sz * 0.1, sz * 1.2);
        ctx.quadraticCurveTo(sz * 0.5 * curlTight, sz * 1.8, sz * 0.3 * curlTight, sz * 2.2);
        ctx.quadraticCurveTo(-sz * 0.1 * curlTight, sz * 2.5 * curlTight, -sz * 0.3 * curlTight, sz * 2.2);
        ctx.quadraticCurveTo(-sz * 0.5 * curlTight, sz * 1.9, -sz * 0.15, sz * 1.7);
        ctx.quadraticCurveTo(sz * 0.1, sz * 1.5, sz * 0.05, sz * 1.4);
        ctx.lineWidth = sz * 0.25;
        ctx.strokeStyle = '#e09350';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Body trunk
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.8);
        ctx.quadraticCurveTo(sz * 0.6, -sz * 0.2, sz * 0.45, sz * 0.5);
        ctx.quadraticCurveTo(sz * 0.25, sz * 1.0, sz * 0.1, sz * 1.2);
        ctx.lineWidth = sz * 0.55;
        ctx.strokeStyle = '#f4a261';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Body segments
        ctx.strokeStyle = 'rgba(200, 130, 60, 0.4)';
        ctx.lineWidth = 0.6;
        for (var seg = 0; seg < 7; seg++) {
            var sy = -sz * 0.5 + seg * sz * 0.3;
            var sw = sz * 0.35 - Math.abs(seg - 3) * sz * 0.03;
            ctx.beginPath();
            ctx.moveTo(-sw, sy);
            ctx.lineTo(sw + sz * 0.15, sy);
            ctx.stroke();
        }

        // Head
        ctx.save();
        ctx.translate(0, -sz * 0.9);
        ctx.rotate(-0.3);

        ctx.beginPath();
        ctx.moveTo(-sz * 0.1, -sz * 0.6);
        ctx.lineTo(0, -sz * 0.85);
        ctx.lineTo(sz * 0.1, -sz * 0.6);
        ctx.fillStyle = '#d08840';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, -sz * 0.3, sz * 0.28, sz * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f4a261';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(sz * 0.2, -sz * 0.25);
        ctx.lineTo(sz * 0.75, -sz * 0.45);
        ctx.lineWidth = sz * 0.15;
        ctx.strokeStyle = '#e09350';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sz * 0.05, -sz * 0.35, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        ctx.restore();

        // Dorsal fin — variable flutter speed (faster bursts for "swimming", slower at rest)
        var flutterBurst = 0.5 + 0.5 * Math.sin(time * 0.3); // burst envelope
        var flutterSpeed = 6 + flutterBurst * 6; // 6-12 Hz
        var flutter = Math.sin(time * flutterSpeed) * (0.06 + flutterBurst * 0.04);
        ctx.save();
        ctx.translate(-sz * 0.15, sz * 0.1);
        ctx.rotate(flutter);
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 0.12, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244, 162, 97, 0.45)';
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // Fish school — 12 tiny fish with boid-like separation + cohesion
    var schoolFish = [];
    var SCHOOL_COUNT = 12;
    var SCHOOL_SEPARATION = 18; // minimum distance between neighbours
    var SCHOOL_COHESION = 0.02; // spring strength toward school centre
    var SCHOOL_SEPARATION_FORCE = 1.5;
    var SCHOOL_WANDER_RATE = 0.3; // radians/sec wander drift

    function initSchoolFish() {
        schoolFish = [];
        for (var i = 0; i < SCHOOL_COUNT; i++) {
            schoolFish.push({
                // Position relative to school centre
                ox: (Math.random() - 0.5) * 60,
                oy: (Math.random() - 0.5) * 40,
                vx: 0,
                vy: 0,
                wanderAngle: Math.random() * Math.PI * 2,
                phase: Math.random() * Math.PI * 2,
                size: 4 + Math.random() * 3,
            });
        }
    }
    initSchoolFish();

    function updateSchoolFish(dt) {
        var dtSec = dt / 60; // dt is in frames (~60fps), convert to approx seconds
        // Compute school centroid (relative offsets)
        var avgX = 0, avgY = 0;
        for (var i = 0; i < schoolFish.length; i++) {
            avgX += schoolFish[i].ox;
            avgY += schoolFish[i].oy;
        }
        avgX /= schoolFish.length;
        avgY /= schoolFish.length;

        for (var i = 0; i < schoolFish.length; i++) {
            var sf = schoolFish[i];
            // Cohesion: spring toward centroid
            var cohX = (avgX - sf.ox) * SCHOOL_COHESION;
            var cohY = (avgY - sf.oy) * SCHOOL_COHESION;

            // Separation: repel from close neighbours
            var sepX = 0, sepY = 0;
            for (var j = 0; j < schoolFish.length; j++) {
                if (j === i) continue;
                var dx = sf.ox - schoolFish[j].ox;
                var dy = sf.oy - schoolFish[j].oy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < SCHOOL_SEPARATION && dist > 0.1) {
                    var push = (SCHOOL_SEPARATION - dist) / SCHOOL_SEPARATION;
                    sepX += (dx / dist) * push * SCHOOL_SEPARATION_FORCE;
                    sepY += (dy / dist) * push * SCHOOL_SEPARATION_FORCE;
                }
            }

            // Random wander angle drift
            sf.wanderAngle += (Math.random() - 0.5) * SCHOOL_WANDER_RATE * dtSec;
            var wandX = Math.cos(sf.wanderAngle) * 0.3;
            var wandY = Math.sin(sf.wanderAngle) * 0.3;

            // Apply forces
            sf.vx += (cohX + sepX + wandX) * dtSec;
            sf.vy += (cohY + sepY + wandY) * dtSec;
            // Damping
            sf.vx *= 0.95;
            sf.vy *= 0.95;
            // Integrate
            sf.ox += sf.vx * dt;
            sf.oy += sf.vy * dt;
            // Soft boundary: keep within ~80px of centre
            if (Math.abs(sf.ox) > 80) sf.ox *= 0.98;
            if (Math.abs(sf.oy) > 50) sf.oy *= 0.98;
        }
    }

    function drawFishSchool(time, c) {
        var progress = (time - c.startTime) * 0.03;
        // School centre still follows figure-8 path
        var cx = W * 0.5 + Math.sin(progress * 0.7) * W * 0.25 + (c.nudgeX || 0);
        var cy = H * 0.45 + Math.sin(progress * 0.5) * H * 0.15 + (c.nudgeY || 0);
        // School-level heading for fish direction
        var schoolHeading = Math.cos(progress * 0.7);
        var schoolDir = schoolHeading > 0 ? 1 : -1;

        ctx.save();
        ctx.globalAlpha = 0.6;
        for (var i = 0; i < schoolFish.length; i++) {
            var sf = schoolFish[i];
            var fx = cx + sf.ox;
            var fy = cy + sf.oy;
            // Per-fish heading: blend school direction with individual velocity
            var localVx = sf.vx + schoolHeading * 0.5;
            var dir = localVx > 0 ? 1 : -1;
            var squeeze = Math.min(Math.abs(localVx) * 4 + 0.5, 1);

            ctx.save();
            ctx.translate(fx, fy);
            ctx.scale(dir * squeeze, 1);
            // Tiny fish body
            ctx.beginPath();
            ctx.ellipse(0, 0, sf.size, sf.size * 0.45, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#a8dadc';
            ctx.fill();
            // Tail
            var tailSwing = Math.sin(time * 5 + sf.phase) * 0.25;
            ctx.rotate(tailSwing);
            ctx.beginPath();
            ctx.moveTo(-sf.size * 0.8, 0);
            ctx.lineTo(-sf.size * 1.4, -sf.size * 0.3);
            ctx.lineTo(-sf.size * 1.4, sf.size * 0.3);
            ctx.closePath();
            ctx.fillStyle = '#7ec8c8';
            ctx.fill();
            // Eye
            ctx.beginPath();
            ctx.arc(sf.size * 0.4, -sf.size * 0.1, 1, 0, Math.PI * 2);
            ctx.fillStyle = '#1a1a2e';
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // Pistol shrimp — periodic snap, nervous behaviors, scuttle
    // Pre-allocated snap flash particles
    var shrimpFlash = [];
    for (var _sf = 0; _sf < 6; _sf++) shrimpFlash.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false });
    var shrimpScuttleX = 0; // accumulated scuttle offset

    function drawPistolShrimp(time, c) {
        var entryProgress = Math.min((time - c.startTime) * 0.8, 1);
        var sz = 12;

        // Snap cycle: every 6 seconds, snap takes ~0.3s
        var snapPeriod = 6;
        var snapCycle = (time % snapPeriod) / snapPeriod;
        var snapPhase = snapCycle * snapPeriod; // time within cycle (0 to 6)
        var isSnapping = snapPhase > 5.4 && snapPhase < 5.7; // snap window
        var snapOpen = snapPhase > 5.0 && snapPhase <= 5.4; // claw opening
        var justSnapped = snapPhase > 5.65 && snapPhase < 5.75; // just after snap

        // Occasional scuttle (every ~8 seconds, short lateral movement)
        var scuttleCycle = (time % 8) / 8;
        var scuttleActive = scuttleCycle > 0.7 && scuttleCycle < 0.85;
        if (scuttleActive) {
            shrimpScuttleX += Math.sin(time * 12) * 0.3;
        }
        shrimpScuttleX *= 0.98; // decay back to centre

        // Nervous lateral sway between snaps
        var nervousSway = Math.sin(time * 3.5) * 1.5 + Math.sin(time * 5.7) * 0.8;

        var x = W * 0.85 + nervousSway + shrimpScuttleX + (c.nudgeX || 0);
        var y = H - 20 - entryProgress * 10 + (c.nudgeY || 0);

        ctx.save();
        ctx.globalAlpha = 0.75 * entryProgress;
        ctx.translate(x, y);
        ctx.scale(-1, 1);

        // Body segments
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.5, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e07050';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sz * 0.8, -sz * 0.1, sz * 0.5, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d06040';
        ctx.fill();

        // Big claw — snap animation
        var clawAngle;
        if (snapOpen) {
            // Claw opens wide before snap
            clawAngle = -0.3 - (snapPhase - 5.0) / 0.4 * 0.5;
        } else if (isSnapping) {
            // Claw slams shut
            clawAngle = -0.8 + (snapPhase - 5.4) / 0.3 * 0.9;
        } else {
            // Gentle idle movement
            clawAngle = -0.3 + Math.sin(time * 0.5) * 0.1;
        }
        ctx.save();
        ctx.translate(sz * 1.3, -sz * 0.3);
        ctx.rotate(clawAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 0.9, sz * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#c85030';
        ctx.fill();
        ctx.restore();

        // Snap flash burst
        if (justSnapped) {
            var prevComp = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'lighter';
            var flashAlpha = 1 - (snapPhase - 5.65) / 0.1;
            ctx.globalAlpha = flashAlpha * 0.6;
            for (var fp = 0; fp < 5; fp++) {
                var fAngle = fp * Math.PI * 2 / 5 + time * 3;
                var fDist = (snapPhase - 5.65) / 0.1 * sz * 1.2;
                ctx.beginPath();
                ctx.arc(
                    sz * 1.6 + Math.cos(fAngle) * fDist,
                    -sz * 0.3 + Math.sin(fAngle) * fDist,
                    2, 0, Math.PI * 2
                );
                ctx.fillStyle = 'rgba(255, 230, 180, 1)';
                ctx.fill();
            }
            ctx.globalAlpha = 0.75 * entryProgress;
            ctx.globalCompositeOperation = prevComp;
        }

        // Small claw
        ctx.beginPath();
        ctx.ellipse(sz * 1.2, sz * 0.2, sz * 0.4, sz * 0.2, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#d06040';
        ctx.fill();

        // Antennae — twitchy
        ctx.beginPath();
        ctx.moveTo(sz * 1.3, -sz * 0.4);
        var antTwitch1 = Math.sin(time * 7) * 2 + Math.sin(time * 11) * 1.5;
        var antTwitch2 = Math.sin(time * 8.5) * 2 + Math.sin(time * 13) * 1;
        ctx.quadraticCurveTo(sz * 1.8, -sz * 1.2 + antTwitch1, sz * 2.2, -sz * 0.8 + antTwitch1);
        ctx.moveTo(sz * 1.3, -sz * 0.3);
        ctx.quadraticCurveTo(sz * 2, -sz * 1 - antTwitch2, sz * 2.4, -sz * 0.6 - antTwitch2);
        ctx.strokeStyle = 'rgba(224, 112, 80, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Eye
        ctx.beginPath();
        ctx.arc(sz * 1.1, -sz * 0.25, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Legs — rippling walk cycle
        for (var i = 0; i < 3; i++) {
            var lx = -sz * 0.4 + i * sz * 0.5;
            var legPhase = Math.sin(time * 5 + i * 1.8) * 2.5;
            var legExtend = scuttleActive ? 1.3 : 1;
            ctx.beginPath();
            ctx.moveTo(lx, sz * 0.4);
            ctx.lineTo(lx + legPhase * legExtend, sz * 0.9);
            ctx.strokeStyle = 'rgba(208, 96, 64, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    // Glowing jellyfish (temperature reward) — propulsion + bezier tentacles
    // Per-creature propulsion state (initialized lazily)
    var glowJellyProp = { vy: 0, yOff: 0 };

    function drawGlowingJellyfish(time, c) {
        var entryProgress = Math.min((time - c.startTime) * 0.3, 1);

        // Propulsion cycle
        var propPeriod = 3.0;
        var propCycle = (time % propPeriod) / propPeriod;
        var contraction;
        if (propCycle < 0.3) {
            contraction = Math.sin(propCycle / 0.3 * Math.PI);
        } else {
            contraction = 0;
        }
        var impulse = propCycle < 0.15 ? 0 : (propCycle < 0.3 ? -1.0 * contraction : 0.25);
        glowJellyProp.vy = glowJellyProp.vy * 0.95 + impulse * 0.5;
        glowJellyProp.yOff += glowJellyProp.vy * 0.016;
        if (Math.abs(glowJellyProp.yOff) > 25) glowJellyProp.yOff *= 0.98;

        var bellSquash = 1 - contraction * 0.2;
        var bellStretch = 1 + contraction * 0.12;

        var cx = W * 0.7 + Math.sin(time * 0.05) * W * 0.1 + (c.nudgeX || 0);
        var cy = H * 0.3 + Math.sin(time * 0.04) * H * 0.08 + glowJellyProp.yOff + (c.nudgeY || 0);
        var r = 25 * (0.85 + 0.15 * Math.sin(time * 2.5));

        ctx.save();
        ctx.globalAlpha = 0.4 * entryProgress;
        ctx.translate(cx, cy);

        // Glow halo
        var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
        glow.addColorStop(0, 'rgba(100, 255, 218, 0.15)');
        glow.addColorStop(0.5, 'rgba(100, 255, 218, 0.05)');
        glow.addColorStop(1, 'rgba(100, 255, 218, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-r * 2.5, -r * 2.5, r * 5, r * 5);

        // Bell with propulsion shape
        ctx.beginPath();
        var first = true;
        for (var a = 0; a <= Math.PI; a += 0.06) {
            var wobble = Math.sin(a * 4 + time * 2.5) * 1.5;
            var bx = Math.cos(a) * (r * bellStretch + wobble);
            var by = -Math.sin(a) * (r * 0.65 * bellSquash + wobble * 0.5);
            if (first) { ctx.moveTo(bx, by); first = false; }
            else ctx.lineTo(bx, by);
        }
        ctx.closePath();
        var bellGrad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
        bellGrad.addColorStop(0, 'rgba(150, 255, 230, 0.5)');
        bellGrad.addColorStop(0.5, 'rgba(100, 255, 218, 0.3)');
        bellGrad.addColorStop(1, 'rgba(29, 233, 182, 0.1)');
        ctx.fillStyle = bellGrad;
        ctx.fill();

        // Tentacles — bezier curves with trailing during propulsion
        var trailBias = contraction * 5;
        for (var t = 0; t < 4; t++) {
            var tx = (t / 3 - 0.5) * r * 1.4 * bellStretch;
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.1);
            for (var seg = 1; seg <= 4; seg++) {
                var st = seg / 4;
                var sway = Math.sin(time * 1.8 + t * 1.3 + seg * 0.7) * (8 * st) + trailBias * st;
                var cpx = tx + sway * 0.6 + Math.sin(time * 0.8 + t * 2 + seg) * 3;
                var cpy = r * 0.1 + (st - 0.12) * 35;
                var ex = tx + sway;
                var ey = r * 0.1 + st * 35;
                ctx.quadraticCurveTo(cpx, cpy, ex, ey);
            }
            ctx.strokeStyle = 'rgba(100, 255, 218, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }

    var CREATURE_DRAW = {
        speed: drawSeaTurtle,
        temperature: drawGlowingJellyfish,
        destruction: drawHammerhead,
        useful: drawSeahorse,
        where: drawFishSchool,
        shrimp: drawPistolShrimp,
    };

    var discoveredCreatures = {}; // tracks which creatures the user has "found" via question pops

    function unlockCreature(questionId) {
        if (discoveredCreatures[questionId]) return;
        var def = CREATURE_DEFS[questionId];
        if (!def) return;
        discoveredCreatures[questionId] = true;
        creatureFlashText = def.emoji + ' ' + def.name + ' discovered!';
        creatureFlashAlpha = 1;
    }

    // Estimate creature screen positions for bubble avoidance
    var BUBBLE_AVOID_DIST = 120; // start avoiding within this distance
    var BUBBLE_AVOID_FORCE = 0.8;

    function getCreaturePos(id, time, c) {
        var period, phase, tri, progress;
        switch (id) {
            case 'speed': // sea turtle
                period = 40;
                phase = ((time - c.startTime) % period) / period;
                tri = Math.abs(2 * phase - 1);
                return { x: -60 + tri * (W + 120) + c.nudgeX, y: H * 0.2 + Math.sin(time * 0.3 + 1.5) * 20 + c.nudgeY };
            case 'destruction': // hammerhead
                period = 60;
                phase = ((time - c.startTime) % period) / period;
                tri = Math.abs(2 * phase - 1);
                return { x: -60 + tri * (W + 120) + c.nudgeX, y: H * 0.35 + Math.sin(time * 0.2) * 30 + c.nudgeY };
            case 'temperature': // glowing jellyfish
                return { x: W * 0.7 + Math.sin(time * 0.05) * W * 0.1 + c.nudgeX, y: H * 0.3 + Math.sin(time * 0.04) * H * 0.08 + c.nudgeY };
            case 'useful': // seahorse
                return { x: W * 0.12 + Math.sin(time * 0.2 + 2) * 8 + c.nudgeX, y: H * 0.72 + Math.sin(time * 0.8) * 6 + c.nudgeY };
            case 'where': // fish school
                progress = (time - c.startTime) * 0.03;
                return { x: W * 0.5 + Math.sin(progress * 0.7) * W * 0.25 + c.nudgeX, y: H * 0.45 + Math.sin(progress * 0.5) * H * 0.15 + c.nudgeY };
            case 'shrimp': // pistol shrimp
                return { x: W * 0.85 + c.nudgeX, y: H - 30 + c.nudgeY };
            default:
                return { x: 0, y: 0 };
        }
    }

    function updateCreatureNudge(dt) {
        for (var id in unlockedCreatures) {
            var c = unlockedCreatures[id];
            if (c.nudgeX === undefined) { c.nudgeX = 0; c.nudgeY = 0; }
            var pos = getCreaturePos(id, animTime, c);
            // Check distance to each active question bubble
            for (var i = 0; i < questionBubbles.length; i++) {
                var qb = questionBubbles[i];
                if (!qb.active) continue;
                var dx = pos.x - qb.x;
                var dy = pos.y - qb.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < BUBBLE_AVOID_DIST && dist > 1) {
                    var push = (BUBBLE_AVOID_DIST - dist) / BUBBLE_AVOID_DIST;
                    c.nudgeX += (dx / dist) * push * BUBBLE_AVOID_FORCE * (dt / 60);
                    c.nudgeY += (dy / dist) * push * BUBBLE_AVOID_FORCE * (dt / 60);
                }
            }
            // Decay nudge back to zero
            c.nudgeX *= 0.96;
            c.nudgeY *= 0.96;
            // Clamp to prevent runaway
            if (Math.abs(c.nudgeX) > 40) c.nudgeX *= 0.9;
            if (Math.abs(c.nudgeY) > 40) c.nudgeY *= 0.9;
        }
    }

    function drawUnlockedCreatures(time) {
        for (var id in unlockedCreatures) {
            var drawFn = CREATURE_DRAW[id];
            if (drawFn) drawFn(time, unlockedCreatures[id]);
        }
    }

    function drawCreatureFlash(dt) {
        if (creatureFlashAlpha <= 0) return;
        creatureFlashAlpha -= 0.008 * dt;
        if (creatureFlashAlpha < 0) creatureFlashAlpha = 0;

        ctx.save();
        ctx.globalAlpha = creatureFlashAlpha;
        ctx.font = 'bold ' + Math.round(Math.min(W * 0.04, 28)) + 'px sans-serif';
        ctx.fillStyle = '#7fdbda';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(127, 219, 218, 0.6)';
        ctx.shadowBlur = 15;
        // Position above centre
        var y = H * 0.12;
        ctx.fillText(creatureFlashText, W / 2, y);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // =========================================================================
    // Streak escalation
    // =========================================================================

    var streakGlowAlpha = 0; // background glow pulse

    function applyStreakEffects(cx, cy) {
        // Streak 2+: double burst + shockwave
        if (streak >= 2) {
            spawnBurst(cx, cy, false);
            spawnShockwave(cx, cy);
        }
        // Streak 3+: background glow + sonoluminescence flash + screen shake
        if (streak >= 3) {
            streakGlowAlpha = 0.15;
            spawnSonoFlash(cx, cy);
            triggerScreenShake(8);
        }
        // Streak 4+: bioluminescence bloom + extra burst + bigger shake
        if (streak >= 4) {
            spawnBioluminescence(cx, cy);
            spawnBurst(cx, cy, true);
            triggerScreenShake(14);
        }
        // Streak 5+: whale passage trigger
        if (streak >= 5) {
            whale.questionsAnswered = streak;
            triggerWhale();
        }
        // Streak 6 (all questions): trigger cascade finale
        if (streak >= 6) {
            triggerCascade(cx, cy);
        }
    }

    function drawStreakGlow(dt) {
        if (streakGlowAlpha <= 0) return;
        streakGlowAlpha -= 0.002 * dt;
        if (streakGlowAlpha < 0) streakGlowAlpha = 0;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = streakGlowAlpha;
        var glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
        glow.addColorStop(0, 'rgba(127, 219, 218, 0.3)');
        glow.addColorStop(1, 'rgba(127, 219, 218, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // =========================================================================
    // Finger-trail bioluminescence
    // =========================================================================

    var fingerTrail = []; // {x, y, time} — last ~100 touch positions
    var TRAIL_MAX = 100;
    var TRAIL_LIFETIME = 2.5; // seconds before trail fades

    var trailParticles = [];
    var TRAIL_PARTICLE_MAX = 60;
    for (var i = 0; i < TRAIL_PARTICLE_MAX; i++) {
        trailParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 });
    }

    function addTrailPoint(x, y) {
        fingerTrail.push({ x: x, y: y, time: animTime });
        if (fingerTrail.length > TRAIL_MAX) fingerTrail.shift();
        // Spawn 1-2 tiny particles at the touch point
        for (var n = 0; n < 2; n++) {
            for (var i = 0; i < trailParticles.length; i++) {
                if (trailParticles[i].active) continue;
                var p = trailParticles[i];
                p.active = true;
                p.x = x + (Math.random() - 0.5) * 6;
                p.y = y + (Math.random() - 0.5) * 6;
                var angle = Math.random() * Math.PI * 2;
                var speed = 0.5 + Math.random() * 1.5;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 0;
                p.maxLife = 30 + Math.random() * 30;
                p.size = 1.5 + Math.random() * 2.5;
                break;
            }
        }
    }

    function updateTrailParticles(dt) {
        var drag = Math.pow(0.95, dt);
        for (var i = 0; i < trailParticles.length; i++) {
            var p = trailParticles[i];
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= drag;
            p.vy *= drag;
        }
    }

    function drawFingerTrail(time) {
        if (fingerTrail.length < 2) return;
        var prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        // Draw trail as connected glowing circles
        for (var i = 0; i < fingerTrail.length; i++) {
            var pt = fingerTrail[i];
            var age = time - pt.time;
            if (age > TRAIL_LIFETIME) continue;
            var alpha = (1 - age / TRAIL_LIFETIME) * 0.35;
            var radius = 8 + (1 - age / TRAIL_LIFETIME) * 6;

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 255, 218, 1)';
            ctx.fill();

            // Outer glow
            ctx.globalAlpha = alpha * 0.3;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(29, 233, 182, 1)';
            ctx.fill();
        }

        // Draw trail particles
        for (var i = 0; i < trailParticles.length; i++) {
            var p = trailParticles[i];
            if (!p.active) continue;
            var progress = p.life / p.maxLife;
            var a = (1 - progress) * 0.5;
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180, 248, 255, 1)';
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prevComp;

        // Prune expired trail points
        while (fingerTrail.length > 0 && time - fingerTrail[0].time > TRAIL_LIFETIME) {
            fingerTrail.shift();
        }
    }

    // =========================================================================
    // Shockwave system
    // =========================================================================

    var shockwaves = []; // {x, y, radius, maxRadius, life}

    function spawnShockwave(cx, cy) {
        shockwaves.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: Math.max(W, H) * 0.5,
            life: 0,
            maxLife: 0.6, // seconds
        });
    }

    function updateShockwaves(dt) {
        var dtSec = dt / 60; // convert dt-units to approx seconds
        for (var i = shockwaves.length - 1; i >= 0; i--) {
            var sw = shockwaves[i];
            sw.life += dtSec;
            if (sw.life >= sw.maxLife) {
                shockwaves.splice(i, 1);
                continue;
            }
            var progress = sw.life / sw.maxLife;
            sw.radius = progress * sw.maxRadius;
        }
    }

    function drawShockwaves() {
        if (shockwaves.length === 0) return;
        var prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < shockwaves.length; i++) {
            var sw = shockwaves[i];
            var progress = sw.life / sw.maxLife;
            var alpha = (1 - progress) * 0.25;
            var ringWidth = 20 + progress * 30;

            // Main ring
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(200, 235, 255, 1)';
            ctx.lineWidth = ringWidth * (1 - progress);
            ctx.stroke();

            // Chromatic aberration — offset RGB rings
            ctx.globalAlpha = alpha * 0.4;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius * 0.97, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 100, 1)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius * 1.03, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 100, 255, 1)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prevComp;
    }

    // Apply shockwave displacement to an object at (ox, oy)
    function getShockwaveDisplacement(ox, oy) {
        var dx = 0, dy = 0;
        for (var i = 0; i < shockwaves.length; i++) {
            var sw = shockwaves[i];
            var distX = ox - sw.x;
            var distY = oy - sw.y;
            var dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < 1) continue;
            var ringDist = Math.abs(dist - sw.radius);
            var influence = 40; // pixels of influence around the ring
            if (ringDist < influence) {
                var progress = sw.life / sw.maxLife;
                var strength = (1 - ringDist / influence) * (1 - progress) * 12;
                dx += (distX / dist) * strength;
                dy += (distY / dist) * strength;
            }
        }
        return { x: dx, y: dy };
    }

    // =========================================================================
    // Sonoluminescence flash
    // =========================================================================

    var sonoFlash = { active: false, x: 0, y: 0, life: 0, maxLife: 0.4 };

    function spawnSonoFlash(cx, cy) {
        sonoFlash.active = true;
        sonoFlash.x = cx;
        sonoFlash.y = cy;
        sonoFlash.life = 0;
    }

    function updateSonoFlash(dt) {
        if (!sonoFlash.active) return;
        sonoFlash.life += dt / 60;
        if (sonoFlash.life >= sonoFlash.maxLife) sonoFlash.active = false;
    }

    function drawSonoFlash() {
        if (!sonoFlash.active) return;
        var progress = sonoFlash.life / sonoFlash.maxLife;
        var prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        // Central white flash expanding outward
        var flashRadius = 30 + progress * Math.max(W, H) * 0.3;
        var alpha = Math.pow(1 - progress, 3) * 0.6;
        ctx.globalAlpha = alpha;
        var grad = ctx.createRadialGradient(sonoFlash.x, sonoFlash.y, 0, sonoFlash.x, sonoFlash.y, flashRadius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.3, 'rgba(200, 240, 255, 0.6)');
        grad.addColorStop(0.7, 'rgba(127, 219, 218, 0.2)');
        grad.addColorStop(1, 'rgba(127, 219, 218, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sonoFlash.x - flashRadius, sonoFlash.y - flashRadius, flashRadius * 2, flashRadius * 2);

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prevComp;
    }

    // Screen shake state
    var screenShake = { intensity: 0 };

    function triggerScreenShake(intensity) {
        screenShake.intensity = intensity;
    }

    function applyScreenShake(dt) {
        if (screenShake.intensity < 0.5) { screenShake.intensity = 0; return; }
        var shakeX = (Math.random() - 0.5) * screenShake.intensity;
        var shakeY = (Math.random() - 0.5) * screenShake.intensity;
        ctx.translate(shakeX, shakeY);
        screenShake.intensity *= Math.pow(0.88, dt);
    }

    // =========================================================================
    // Whale silhouette
    // =========================================================================

    var whale = {
        active: false,
        startTime: 0,
        duration: 10, // seconds to cross
        y: 0,
        direction: 1, // 1=right, -1=left
        triggered: false, // only once per session
        questionsAnswered: 0,
    };

    function triggerWhale() {
        if (whale.triggered) return;
        whale.triggered = true;
        whale.active = true;
        whale.startTime = animTime;
        whale.y = H * (0.3 + Math.random() * 0.2);
        whale.direction = Math.random() > 0.5 ? 1 : -1;
    }

    function drawWhale(time) {
        if (!whale.active) return;
        var elapsed = time - whale.startTime;
        if (elapsed > whale.duration) { whale.active = false; return; }

        var progress = elapsed / whale.duration;
        // Fade in and out at edges
        var fadeAlpha = Math.min(progress * 5, 1) * Math.min((1 - progress) * 5, 1);
        var x = whale.direction > 0
            ? -300 + progress * (W + 600)
            : W + 300 - progress * (W + 600);
        var y = whale.y + Math.sin(time * 0.15) * 15;
        var scale = 4; // massive

        ctx.save();
        ctx.globalAlpha = 0.08 * fadeAlpha;
        ctx.translate(x, y);
        if (whale.direction < 0) ctx.scale(-1, 1);
        ctx.scale(scale, scale);

        // Body — elongated ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, 60, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1f30';
        ctx.fill();

        // Head — slightly bulbous
        ctx.beginPath();
        ctx.ellipse(55, 0, 15, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail flukes
        var tailAngle = Math.sin(time * 0.8) * 0.15;
        ctx.save();
        ctx.translate(-60, 0);
        ctx.rotate(tailAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15, -20, -30, -18);
        ctx.quadraticCurveTo(-15, -5, 0, 0);
        ctx.quadraticCurveTo(-15, 5, -30, 18);
        ctx.quadraticCurveTo(-15, 20, 0, 0);
        ctx.fill();
        ctx.restore();

        // Pectoral fin
        ctx.beginPath();
        ctx.ellipse(15, 15, 18, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Whale current — nudge nearby particles
        for (var i = 0; i < marineSnow.length; i++) {
            var s = marineSnow[i];
            var dy = Math.abs(s.y - whale.y);
            if (dy < 100) {
                s.x += whale.direction * 0.3 * (1 - dy / 100) * fadeAlpha;
            }
        }
    }

    // =========================================================================
    // Bubble nursery (long-press to create)
    // =========================================================================

    var nursery = {
        active: false,
        x: 0,
        y: 0,
        startTime: 0,
        radius: 0,
    };
    var userBubbles = []; // released user-created bubbles

    function updateUserBubbles(dt) {
        for (var i = userBubbles.length - 1; i >= 0; i--) {
            var b = userBubbles[i];
            b.y -= b.speed * dt;
            b.x += Math.sin(animTime * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp * dt;
            if (b.y < -b.radius) {
                // Pop at top with mini burst
                spawnBurst(b.x, 0, true);
                userBubbles.splice(i, 1);
            }
        }
    }

    function drawNurseryBubble(time) {
        if (!nursery.active) return;
        var elapsed = time - nursery.startTime;
        nursery.radius = Math.min(5 + elapsed * 12, 40);
        var r = nursery.radius;

        // Draw growing bubble
        ctx.save();
        ctx.globalAlpha = 0.6;
        var grad = ctx.createRadialGradient(
            nursery.x - r * 0.3, nursery.y - r * 0.3, r * 0.1,
            nursery.x, nursery.y, r
        );
        grad.addColorStop(0, 'rgba(200, 240, 255, 0.4)');
        grad.addColorStop(0.7, 'rgba(100, 200, 230, 0.2)');
        grad.addColorStop(1, 'rgba(60, 150, 200, 0.05)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nursery.x, nursery.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    function drawUserBubbles(time) {
        for (var i = 0; i < userBubbles.length; i++) {
            var b = userBubbles[i];
            var r = b.radius;
            ctx.save();
            ctx.globalAlpha = 0.5;
            var grad = ctx.createRadialGradient(
                b.x - r * 0.3, b.y - r * 0.3, r * 0.1,
                b.x, b.y, r
            );
            grad.addColorStop(0, 'rgba(200, 240, 255, 0.4)');
            grad.addColorStop(0.7, 'rgba(100, 200, 230, 0.2)');
            grad.addColorStop(1, 'rgba(60, 150, 200, 0.05)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    // =========================================================================
    // Bioluminescence cascade finale
    // =========================================================================

    var cascade = {
        active: false,
        startTime: 0,
        originX: 0,
        originY: 0,
        duration: 12, // seconds
        waveSpeed: 250, // px/s
    };
    var cascadeWaves = []; // expanding trigger waves

    function triggerCascade(cx, cy) {
        cascade.active = true;
        cascade.startTime = animTime;
        cascade.originX = cx;
        cascade.originY = cy;
        cascadeWaves = [];
        // Spawn 5 staggered waves
        for (var i = 0; i < 5; i++) {
            cascadeWaves.push({ startTime: animTime + i * 0.5, radius: 0 });
        }
    }

    function updateCascade(time) {
        if (!cascade.active) return;
        var elapsed = time - cascade.startTime;
        if (elapsed > cascade.duration) {
            cascade.active = false;
            cascadeWaves = [];
            return;
        }
        // Expand waves
        for (var i = 0; i < cascadeWaves.length; i++) {
            var w = cascadeWaves[i];
            if (time > w.startTime) {
                w.radius = (time - w.startTime) * cascade.waveSpeed;
            }
        }
        // Continuously spawn bioluminescence during cascade
        if (Math.random() < 0.3) {
            var angle = Math.random() * Math.PI * 2;
            var dist = Math.random() * Math.max(W, H) * 0.8;
            spawnBioluminescence(
                W / 2 + Math.cos(angle) * dist,
                H / 2 + Math.sin(angle) * dist
            );
        }
    }

    function drawCascade(time) {
        if (!cascade.active) return;
        var elapsed = time - cascade.startTime;
        var prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        // Draw expanding light waves
        for (var i = 0; i < cascadeWaves.length; i++) {
            var w = cascadeWaves[i];
            if (w.radius < 1) continue;
            var waveAge = time - w.startTime;
            var alpha = Math.max(0, 0.12 * (1 - waveAge / (cascade.duration * 0.8)));
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(cascade.originX, cascade.originY, w.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 255, 218, 1)';
            ctx.lineWidth = 30 * (1 - waveAge / cascade.duration);
            ctx.stroke();
        }

        // Overall ambient glow that builds then fades
        var glowIntensity = elapsed < cascade.duration * 0.6
            ? Math.min(elapsed / 3, 0.15)
            : 0.15 * (1 - (elapsed - cascade.duration * 0.6) / (cascade.duration * 0.4));
        ctx.globalAlpha = Math.max(0, glowIntensity);
        ctx.fillStyle = 'rgba(29, 233, 182, 1)';
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prevComp;
    }

    // =========================================================================
    // Idle warning state
    // =========================================================================

    var idleWarningShown = false;
    var idleWarningEl = document.getElementById('idle-warning');
    if (idleWarningEl) {
        idleWarningEl.addEventListener('pointerdown', function () {
            lastInteraction = Date.now();
            idleWarningShown = false;
            idleWarningEl.classList.add('hidden');
        });
    }

    // =========================================================================
    // Fish
    // =========================================================================

    var fishes = [];

    function createFish(i) {
        var palette = FISH_PALETTES[i % FISH_PALETTES.length];
        var goingRight = Math.random() > 0.5;
        var size = 18 + Math.random() * 14;
        var depth = 0.3 + Math.random() * 0.7; // 0=far, 1=near
        return {
            x: goingRight ? -size * 3 - Math.random() * W * 0.5 : W + size * 3 + Math.random() * W * 0.5,
            y: H * (0.15 + Math.random() * 0.7),
            size: size * depth,
            speed: (0.4 + Math.random() * 0.5) * depth,
            dir: goingRight ? 1 : -1,
            palette: palette,
            wobbleOffset: Math.random() * Math.PI * 2,
            wobbleAmp: 10 + Math.random() * 15,
            wobbleFreq: 0.3 + Math.random() * 0.3,
            tailPhase: Math.random() * Math.PI * 2,
            opacity: 0.25 + depth * 0.55,
            startleVx: 0,
            startleVy: 0,
        };
    }

    for (var i = 0; i < FISH_COUNT; i++) {
        fishes.push(createFish(i));
    }

    function resetFish(f, idx) {
        var palette = FISH_PALETTES[idx % FISH_PALETTES.length];
        var goingRight = Math.random() > 0.5;
        var depth = 0.3 + Math.random() * 0.7;
        f.dir = goingRight ? 1 : -1;
        f.x = goingRight ? -f.size * 3 - Math.random() * 200 : W + f.size * 3 + Math.random() * 200;
        f.y = H * (0.15 + Math.random() * 0.7);
        f.size = (18 + Math.random() * 14) * depth;
        f.speed = (0.4 + Math.random() * 0.5) * depth;
        f.palette = palette;
        f.opacity = 0.25 + depth * 0.55;
        f.wobbleOffset = Math.random() * Math.PI * 2;
        f.startleVx = 0;
        f.startleVy = 0;
    }

    function startleFish(bx, by) {
        for (var i = 0; i < fishes.length; i++) {
            var f = fishes[i];
            var dx = f.x - bx;
            var dy = f.y - by;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                var angle = Math.atan2(dy, dx);
                var force = (150 - dist) / 150 * 6;
                f.startleVx = Math.cos(angle) * force;
                f.startleVy = Math.sin(angle) * force;
            }
        }
    }

    function updateFish(dt) {
        for (var i = 0; i < fishes.length; i++) {
            var f = fishes[i];
            f.x += (f.speed * f.dir + f.startleVx) * dt;
            f.y += f.startleVy * dt;
            f.startleVx *= Math.pow(0.93, dt);
            f.startleVy *= Math.pow(0.93, dt);

            // Wrap
            if (f.dir > 0 && f.x > W + f.size * 4) resetFish(f, i);
            if (f.dir < 0 && f.x < -f.size * 4) resetFish(f, i);
            // Keep in vertical bounds
            if (f.y < f.size) f.y = f.size;
            if (f.y > H - f.size) f.y = H - f.size;
        }
    }

    function drawFish(f, time) {
        var x = f.x;
        var y = f.y + Math.sin(time * f.wobbleFreq + f.wobbleOffset) * f.wobbleAmp;
        var s = f.size;
        var d = f.dir;

        // Acceleration-dependent tail frequency: faster wag when startled
        var startleSpeed = Math.sqrt(f.startleVx * f.startleVx + f.startleVy * f.startleVy);
        var tailFreq = 4 + startleSpeed * 3; // 4Hz cruising, up to ~22Hz startled
        var tailAmp = 0.3 + startleSpeed * 0.15;

        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.translate(x, y);
        ctx.scale(d, 1);

        // Tail (acceleration-dependent wag)
        var tailAngle = Math.sin(time * tailFreq + f.tailPhase) * tailAmp;
        ctx.save();
        ctx.translate(-s * 0.9, 0);
        ctx.rotate(tailAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-s * 0.6, -s * 0.35);
        ctx.lineTo(-s * 0.45, 0);
        ctx.lineTo(-s * 0.6, s * 0.35);
        ctx.closePath();
        ctx.fillStyle = f.palette.fin;
        ctx.fill();
        ctx.restore();

        // Body (oval)
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = f.palette.body;
        ctx.fill();

        // Stripe
        ctx.beginPath();
        ctx.ellipse(s * 0.1, 0, s * 0.12, s * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = f.palette.stripe;
        ctx.globalAlpha = f.opacity * 0.7;
        ctx.fill();
        ctx.globalAlpha = f.opacity;

        // Pectoral fin (small fin that fans during normal swimming)
        var pectAngle = Math.sin(time * 3 + f.tailPhase * 0.5) * 0.3;
        ctx.save();
        ctx.translate(s * 0.1, s * 0.25);
        ctx.rotate(0.4 + pectAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.25, s * 0.1, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = f.palette.fin;
        ctx.globalAlpha = f.opacity * 0.6;
        ctx.fill();
        ctx.globalAlpha = f.opacity;
        ctx.restore();

        // Dorsal fin
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.45);
        ctx.quadraticCurveTo(s * 0.2, -s * 0.85, s * 0.5, -s * 0.4);
        ctx.fillStyle = f.palette.fin;
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(s * 0.55, -s * 0.08, s * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.58, -s * 0.08, s * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = f.palette.eye;
        ctx.fill();

        ctx.restore();
    }

    // =========================================================================
    // Bubble pool
    // =========================================================================

    var decorativeBubbles = [];
    var questionBubbles = [];

    function createDecorativeBubble(startAtBottom) {
        var roll = Math.random();
        var r;
        if (roll < 0.6) r = 8 + Math.random() * 6;
        else if (roll < 0.9) r = 14 + Math.random() * 6;
        else r = 20 + Math.random() * 5;

        // Faster rise: ~1.5-2x original speed
        var speed = 0.6 + (r / 25) * 1.4;
        var opacity = 0.15 + (r / 25) * 0.35;

        return {
            x: Math.random() * W,
            y: startAtBottom ? H + r + Math.random() * H : Math.random() * H,
            r: r,
            speed: speed,
            opacity: opacity,
            wobbleOffset: Math.random() * Math.PI * 2,
            wobbleAmp: 0.3 + Math.random() * 1.2,
            wobbleFreq: 0.5 + Math.random() * 1.5,
        };
    }

    function resetDecorativeBubble(b) {
        var roll = Math.random();
        if (roll < 0.6) b.r = 8 + Math.random() * 6;
        else if (roll < 0.9) b.r = 14 + Math.random() * 6;
        else b.r = 20 + Math.random() * 5;
        b.x = Math.random() * W;
        b.y = H + b.r + Math.random() * 50;
        b.speed = 0.6 + (b.r / 25) * 1.4;
        b.opacity = 0.15 + (b.r / 25) * 0.35;
        b.wobbleOffset = Math.random() * Math.PI * 2;
        b.wobbleAmp = 0.3 + Math.random() * 1.2;
        b.wobbleFreq = 0.5 + Math.random() * 1.5;
    }

    for (var i = 0; i < DECORATIVE_COUNT; i++) {
        decorativeBubbles.push(createDecorativeBubble(false));
    }

    // =========================================================================
    // Question bubble management
    // =========================================================================

    var questionCooldowns = {};
    var currentQuestionIds = [];
    var pendingRespawnIds = []; // IDs waiting to respawn when back in BUBBLES state
    var respawnTimerIds = []; // active setTimeout handles for cancellation

    function initQuestionBubbles() {
        questionBubbles = [];
        currentQuestionIds = [];
        var available = getAvailableQuestions();
        var count = Math.min(QUESTION_BUBBLE_COUNT, available.length);
        var spacing = W / (count + 1);
        for (var i = 0; i < count; i++) {
            var q = available[i];
            currentQuestionIds.push(q.id);
            questionBubbles.push(createQuestionBubble(q, spacing * (i + 1)));
        }
    }

    function getAvailableQuestions() {
        var now = Date.now();
        return QUESTIONS.filter(function (q) {
            if (currentQuestionIds.indexOf(q.id) !== -1) return false;
            if (questionCooldowns[q.id] && now < questionCooldowns[q.id]) return false;
            return true;
        });
    }

    function createQuestionBubble(question, x) {
        var r = 60 + Math.random() * 12; // min 120px diameter for child fingers
        return {
            active: true,
            questionId: question.id,
            bubbleText: question.bubbleText,
            x: x,
            y: H + r + Math.random() * 200,
            r: r,
            speed: 0.5 + Math.random() * 0.3, // slightly faster
            wobbleOffset: Math.random() * Math.PI * 2,
            wobbleAmp: 0.2 + Math.random() * 0.3,
            wobbleFreq: 0.4 + Math.random() * 0.4,
            glowPhase: Math.random() * Math.PI * 2,
            // Squeeze-pop state
            popPhase: null, // null | 'squeeze'
            squeezeStart: 0,
            drawScale: 1,
        };
    }

    function respawnQuestionBubbleById(slotId) {
        // Find the slot by its original questionId
        var idx = -1;
        for (var i = 0; i < questionBubbles.length; i++) {
            if (questionBubbles[i].questionId === slotId && !questionBubbles[i].active) {
                idx = i;
                break;
            }
        }
        if (idx === -1) return; // slot already active or not found (array was reset)

        var available = getAvailableQuestions();
        if (available.length === 0) return;
        var q = available[Math.floor(Math.random() * available.length)];
        currentQuestionIds[idx] = q.id;
        var qb = questionBubbles[idx];
        qb.active = true;
        qb.questionId = q.id;
        qb.bubbleText = q.bubbleText;
        qb.r = 55 + Math.random() * 15;
        qb.x = qb.r + Math.random() * (W - 2 * qb.r);
        qb.y = H + qb.r + Math.random() * 100;
        qb.speed = 0.5 + Math.random() * 0.3;
        qb.wobbleOffset = Math.random() * Math.PI * 2;
        qb.glowPhase = Math.random() * Math.PI * 2;
        qb.popPhase = null;
        qb.drawScale = 1;
    }

    function drainPendingRespawns() {
        if (pendingRespawnIds.length === 0) return;
        var ids = pendingRespawnIds.slice();
        pendingRespawnIds = [];
        for (var i = 0; i < ids.length; i++) {
            respawnQuestionBubbleById(ids[i]);
        }
    }

    // =========================================================================
    // Particle pool
    // =========================================================================

    var particles = [];
    for (var i = 0; i < MAX_PARTICLES; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, opacity: 0, life: 0, maxLife: 0, isRing: false, ringR: 0, teal: false });
    }

    function spawnBurst(cx, cy, mini) {
        var count = mini ? MINI_BURST_COUNT : BURST_PARTICLE_COUNT;
        var ringCount = mini ? 1 : BURST_RING_COUNT;
        var spawned = 0;
        for (var i = 0; i < particles.length && spawned < count + ringCount; i++) {
            if (particles[i].active) continue;
            var p = particles[i];
            p.active = true;
            p.x = cx;
            p.y = cy;
            p.life = 0;

            if (spawned < count) {
                var angle = Math.random() * Math.PI * 2;
                var speed = mini ? (1 + Math.random() * 2) : (2 + Math.random() * 4);
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.r = mini ? (1 + Math.random() * 2) : (2 + Math.random() * 3);
                p.maxLife = (mini ? 18 : PARTICLE_LIFE_DT) + Math.random() * 12;
                p.isRing = false;
                p.teal = Math.random() > 0.6;
                p.opacity = mini ? 0.5 : 0.8;
            } else {
                p.vx = 0;
                p.vy = 0;
                p.r = 0;
                p.ringR = 0;
                p.maxLife = (mini ? 20 : RING_LIFE_DT) + Math.random() * 12;
                p.isRing = true;
                p.opacity = mini ? 0.3 : 0.6;
            }
            spawned++;
        }
    }

    // Spawn a single subtle ripple ring (for tap-on-water feedback)
    function spawnRipple(cx, cy) {
        for (var i = 0; i < particles.length; i++) {
            if (particles[i].active) continue;
            var p = particles[i];
            p.active = true;
            p.x = cx;
            p.y = cy;
            p.vx = 0;
            p.vy = 0;
            p.r = 0;
            p.ringR = 0;
            p.life = 0;
            p.maxLife = 25;
            p.isRing = true;
            p.opacity = 0.25;
            p.teal = false;
            return;
        }
    }

    // =========================================================================
    // Audio manager
    // =========================================================================

    var audioManager = {
        ctx: null,
        noiseBuffer: null,
        muted: false,
        masterFilter: null, // underwater lowpass
        masterOut: null, // final output node (filter or destination)

        init: function () {
            if (this.ctx) return;
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            try {
                this.ctx = new AC();
                if (this.ctx.state === 'suspended') this.ctx.resume();
                // Underwater master filter — muffles highs for submerged feel
                this.masterFilter = this.ctx.createBiquadFilter();
                this.masterFilter.type = 'lowpass';
                this.masterFilter.frequency.value = 2000;
                this.masterFilter.Q.value = 1;
                this.masterFilter.connect(this.ctx.destination);
                this.masterOut = this.masterFilter;
                var bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
                this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                var data = this.noiseBuffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
            } catch (e) {
                this.ctx = null;
            }
        },

        // Ambient underwater drone — two detuned triangle oscillators
        droneGain: null,
        droneStarted: false,

        startDrone: function () {
            if (this.droneStarted || !this.ctx) return;
            this.droneStarted = true;
            var actx = this.ctx;
            var dest = this.masterOut;
            this.droneGain = actx.createGain();
            this.droneGain.gain.value = 0;
            this.droneGain.connect(dest);

            var osc1 = actx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.value = 50;
            osc1.connect(this.droneGain);
            osc1.start();

            var osc2 = actx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.value = 55;
            osc2.connect(this.droneGain);
            osc2.start();

            // Fade in over 2 seconds
            this.droneGain.gain.setValueAtTime(0, actx.currentTime);
            this.droneGain.gain.linearRampToValueAtTime(0.06, actx.currentTime + 2);
        },

        setDroneVolume: function (vol) {
            if (!this.droneGain || !this.ctx) return;
            this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, this.ctx.currentTime);
            this.droneGain.gain.linearRampToValueAtTime(
                this.muted ? 0 : vol,
                this.ctx.currentTime + 0.3
            );
        },

        // Discovery chime — C5 → E5 → G5 ascending sines
        playChime: function () {
            if (this.muted || !this.ctx) return;
            var actx = this.ctx;
            var dest = this.masterOut;
            var now = actx.currentTime;
            var notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            for (var i = 0; i < notes.length; i++) {
                var osc = actx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = notes[i];
                var g = actx.createGain();
                var onset = now + i * 0.12;
                g.gain.setValueAtTime(0, onset);
                g.gain.linearRampToValueAtTime(0.15, onset + 0.04);
                g.gain.exponentialRampToValueAtTime(0.001, onset + 0.4);
                osc.connect(g);
                g.connect(dest);
                osc.start(onset);
                osc.stop(onset + 0.45);
            }
        },

        playPop: function (mini) {
            if (this.muted || !this.ctx || !this.noiseBuffer) return;
            var actx = this.ctx;
            var dest = this.masterOut;
            var now = actx.currentTime;
            var vol = mini ? 0.15 : 0.4;
            var freq = mini ? 1000 : 800;

            var noise = actx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            var bandpass = actx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = freq;
            bandpass.Q.value = 1.5;
            var noiseGain = actx.createGain();
            noiseGain.gain.setValueAtTime(vol, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            noise.connect(bandpass);
            bandpass.connect(noiseGain);
            noiseGain.connect(dest);
            noise.start(now);
            noise.stop(now + 0.06);

            var osc = actx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(mini ? 900 : 600, now);
            osc.frequency.exponentialRampToValueAtTime(mini ? 400 : 150, now + 0.08);
            var oscGain = actx.createGain();
            oscGain.gain.setValueAtTime(vol * 0.5, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(oscGain);
            oscGain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.08);
        }
    };

    var muteBtn = document.getElementById('mute-btn');
    var muteIcon = document.getElementById('mute-icon');
    muteBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        lastInteraction = Date.now();
        audioManager.muted = !audioManager.muted;
        muteIcon.textContent = audioManager.muted ? '\u{1F507}' : '\u{1F50A}';
        audioManager.setDroneVolume(audioManager.muted ? 0 : 0.06);
    });

    // =========================================================================
    // Answer overlay
    // =========================================================================

    var overlayEl = document.getElementById('answer-overlay');
    var contentEl = document.getElementById('answer-content');
    var dismissBtn = document.getElementById('dismiss-btn');
    var answerAnimTimerIds = []; // tracked animation setTimeouts for answer overlays
    var squeezeTimerIds = []; // separate from answer timers to avoid orphaned squeeze states

    var lastPopX = 0.5; // fractional position for radial reveal
    var lastPopY = 0.5;

    function showAnswer(questionId) {
        var question = null;
        for (var i = 0; i < QUESTIONS.length; i++) {
            if (QUESTIONS[i].id === questionId) { question = QUESTIONS[i]; break; }
        }
        if (!question) return;

        appState = State.ANSWER;
        lastInteraction = Date.now();
        contentEl.innerHTML = '';

        switch (question.answerType) {
            case 'bar-chart': renderBarChart(question.answer); break;
            case 'big-reveal': renderBigReveal(question.answer, questionId); break;
            case 'text-fact': renderTextFact(question.answer); break;
            case 'icon-grid': renderIconGrid(question.answer); break;
        }

        // Discovery chime on every answer reveal
        audioManager.playChime();

        // Bioluminescence burst on dramatic answers
        if (questionId === 'temperature' || questionId === 'speed' || questionId === 'shrimp') {
            spawnBioluminescence(lastPopX * W, lastPopY * H);
        }

        // Radial reveal from pop position
        overlayEl.style.setProperty('--pop-x', (lastPopX * 100).toFixed(1) + '%');
        overlayEl.style.setProperty('--pop-y', (lastPopY * 100).toFixed(1) + '%');
        overlayEl.classList.remove('hidden');
    }

    function renderBarChart(data) {
        var maxVal = 0;
        for (var i = 0; i < data.bars.length; i++) {
            if (data.bars[i].value > maxVal) maxVal = data.bars[i].value;
        }
        var html = '<div class="bar-chart-title">' + escapeHTML(data.title) + '</div>';
        for (var i = 0; i < data.bars.length; i++) {
            var bar = data.bars[i];
            var pct = (bar.value / maxVal * 100).toFixed(1);
            html += '<div class="bar-row">' +
                '<span class="bar-icon">' + bar.icon + '</span>' +
                '<span class="bar-label">' + escapeHTML(bar.label) + '</span>' +
                '<div class="bar-track">' +
                '<div class="bar-fill" style="background:' + bar.color + ';" data-width="' + pct + '%">' +
                '<span class="bar-value">' + escapeHTML(bar.display) + '</span>' +
                '</div></div></div>';
        }
        html += '<div class="bar-fun-fact">' + escapeHTML(data.funFact) + '</div>';
        contentEl.innerHTML = html;

        var fills = contentEl.querySelectorAll('.bar-fill');
        for (var i = 0; i < fills.length; i++) {
            (function (fill, delay) {
                answerAnimTimerIds.push(setTimeout(function () { fill.style.width = fill.getAttribute('data-width'); }, delay));
            })(fills[i], 250 * i + 100);
        }
        var funFact = contentEl.querySelector('.bar-fun-fact');
        if (funFact) {
            answerAnimTimerIds.push(setTimeout(function () { funFact.classList.add('visible'); }, 250 * data.bars.length + 600));
        }
    }

    // Number count-up animation
    function animateCountUp(el, targetStr, duration) {
        // Extract numeric value (e.g. "4,700" → 4700)
        var stripped = targetStr.replace(/,/g, '');
        var target = parseFloat(stripped);
        if (isNaN(target)) { el.textContent = targetStr; return; }
        var isInt = stripped.indexOf('.') === -1;
        var start = performance.now();
        function tick(now) {
            var elapsed = now - start;
            var progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = target * eased;
            if (isInt) {
                el.textContent = Math.round(current).toLocaleString();
            } else {
                el.textContent = current.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            }
            if (progress < 1) requestAnimationFrame(tick);
            else el.textContent = targetStr; // ensure exact final value
        }
        el.textContent = '0';
        requestAnimationFrame(tick);
    }

    function renderBigReveal(data, questionId) {
        var html = '<div class="big-reveal-container">' +
            '<div class="big-reveal-label">' + escapeHTML(data.label) + '</div>' +
            '<div class="big-reveal-number">' + escapeHTML(data.number) + '</div>';
        if (data.unit) {
            html += '<div class="big-reveal-unit">' + escapeHTML(data.unit) + '</div>';
        }

        // Badges row (visual stats instead of paragraphs)
        if (data.badges && data.badges.length) {
            html += '<div class="badge-row">';
            for (var i = 0; i < data.badges.length; i++) {
                var b = data.badges[i];
                var cls = b.highlight ? ' badge-highlight' : '';
                html += '<div class="badge' + cls + '">' +
                    '<span class="badge-icon">' + b.icon + '</span>' +
                    '<span class="badge-value">' + escapeHTML(b.value) + '</span>' +
                    '<span class="badge-label">' + escapeHTML(b.label) + '</span>' +
                    '</div>';
            }
            html += '</div>';
        }

        if (data.comparison) {
            html += '<div class="big-reveal-comparison">' + escapeHTML(data.comparison) + '</div>';
        }
        html += '</div>';
        contentEl.innerHTML = html;

        // Number count-up animation
        var numberEl = contentEl.querySelector('.big-reveal-number');
        if (numberEl) {
            animateCountUp(numberEl, data.number, 1500);
        }

        // Screen shake for dramatic numeric reveals (temperature, speed)
        if (questionId === 'temperature' || questionId === 'speed') {
            answerAnimTimerIds.push(setTimeout(function () {
                triggerScreenShake(6);
            }, 1400));
        }

        // Stagger badge animation
        var badges = contentEl.querySelectorAll('.badge');
        for (var i = 0; i < badges.length; i++) {
            (function (badge, delay) {
                answerAnimTimerIds.push(setTimeout(function () { badge.classList.add('visible'); }, delay));
            })(badges[i], 150 * i + 800);
        }
    }

    function renderTextFact(data) {
        var html = '<div class="text-fact-title">' + escapeHTML(data.title) + '</div>' +
            '<ul class="text-fact-list">';
        for (var i = 0; i < data.facts.length; i++) {
            var fact = data.facts[i];
            html += '<li class="text-fact-item">' +
                '<span class="text-fact-icon">' + fact.icon + '</span>' +
                '<span>' + escapeHTML(fact.text) + '</span></li>';
        }
        html += '</ul>';
        contentEl.innerHTML = html;

        var items = contentEl.querySelectorAll('.text-fact-item');
        for (var i = 0; i < items.length; i++) {
            (function (item, delay) {
                answerAnimTimerIds.push(setTimeout(function () { item.classList.add('visible'); }, delay));
            })(items[i], 300 * i + 100);
        }
    }

    function renderIconGrid(data) {
        var html = '<div class="icon-grid-title">' + escapeHTML(data.title) + '</div>' +
            '<div class="icon-grid">';
        for (var i = 0; i < data.items.length; i++) {
            var item = data.items[i];
            html += '<div class="icon-grid-cell">' +
                '<span class="icon-grid-emoji">' + item.icon + '</span>' +
                '<span class="icon-grid-label">' + escapeHTML(item.label) + '</span>' +
                '</div>';
        }
        html += '</div>';
        contentEl.innerHTML = html;

        // Stagger bounce-in
        var cells = contentEl.querySelectorAll('.icon-grid-cell');
        for (var i = 0; i < cells.length; i++) {
            (function (cell, delay) {
                answerAnimTimerIds.push(setTimeout(function () { cell.classList.add('visible'); }, delay));
            })(cells[i], 200 * i + 100);
        }
    }

    function hideAnswer() {
        overlayEl.classList.add('hidden');
        appState = State.BUBBLES;
        lastInteraction = Date.now();
        // Cancel in-flight answer animation timers
        for (var i = 0; i < answerAnimTimerIds.length; i++) {
            clearTimeout(answerAnimTimerIds[i]);
        }
        answerAnimTimerIds = [];
        for (var i = 0; i < squeezeTimerIds.length; i++) {
            clearTimeout(squeezeTimerIds[i]);
        }
        squeezeTimerIds = [];
        drainPendingRespawns();
    }

    dismissBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (idleWarningShown) {
            idleWarningShown = false;
            if (idleWarningEl) idleWarningEl.classList.add('hidden');
        }
        hideAnswer();
    });

    // Tap overlay background (outside content) to dismiss
    overlayEl.addEventListener('pointerdown', function (e) {
        if (e.target === overlayEl && appState === State.ANSWER) {
            e.preventDefault();
            lastInteraction = Date.now();
            if (idleWarningShown) {
                idleWarningShown = false;
                if (idleWarningEl) idleWarningEl.classList.add('hidden');
            }
            hideAnswer();
        }
    });

    var escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function (ch) { return escapeMap[ch]; });
    }

    // =========================================================================
    // Splash screen
    // =========================================================================

    var splashEl = document.getElementById('splash-screen');

    function showSplash() {
        appState = State.SPLASH;
        audioManager.setDroneVolume(0);
        splashEl.classList.remove('hidden');
        overlayEl.classList.add('hidden');
        idleWarningShown = false;
        if (idleWarningEl) idleWarningEl.classList.add('hidden');
        questionCooldowns = {};
        pendingRespawnIds = [];
        streak = 0;
        unlockedCreatures = {};
        discoveredCreatures = {};
        creatureFlashAlpha = 0;
        streakGlowAlpha = 0;
        shockwaves = [];
        sonoFlash.active = false;
        screenShake.intensity = 0;
        whale.active = false;
        whale.triggered = false;
        cascade.active = false;
        cascadeWaves = [];
        fingerTrail = [];
        userBubbles = [];
        nursery.active = false;
        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        // Cancel any in-flight respawn timers
        for (var i = 0; i < respawnTimerIds.length; i++) {
            clearTimeout(respawnTimerIds[i]);
        }
        respawnTimerIds = [];
        // Cancel any in-flight answer animation timers
        for (var i = 0; i < answerAnimTimerIds.length; i++) {
            clearTimeout(answerAnimTimerIds[i]);
        }
        answerAnimTimerIds = [];
        for (var i = 0; i < squeezeTimerIds.length; i++) {
            clearTimeout(squeezeTimerIds[i]);
        }
        squeezeTimerIds = [];
    }

    function spawnAllCreatures() {
        var ids = ['speed', 'temperature', 'destruction', 'useful', 'where', 'shrimp'];
        for (var i = 0; i < ids.length; i++) {
            unlockedCreatures[ids[i]] = {
                startTime: animTime - i * 0.5,
                nudgeX: 0, nudgeY: 0, // bubble avoidance offset
            };
        }
    }

    function hideSplash() {
        audioManager.init();
        audioManager.startDrone();
        splashEl.classList.add('hidden');
        appState = State.BUBBLES;
        lastInteraction = Date.now();
        initQuestionBubbles();
        spawnAllCreatures();
    }

    splashEl.addEventListener('pointerdown', function (e) {
        if (appState === State.SPLASH) {
            e.preventDefault();
            hideSplash();
        }
    });

    // =========================================================================
    // Touch / click detection (with decorative popping + tap ripple)
    // =========================================================================

    var nurseryTimer = null;

    canvas.addEventListener('pointerdown', function (e) {
        if (appState !== State.BUBBLES) return;
        lastInteraction = Date.now();
        // Dismiss idle warning on any interaction
        if (idleWarningShown) {
            idleWarningShown = false;
            if (idleWarningEl) idleWarningEl.classList.add('hidden');
        }

        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;

        // Check question bubbles first (reverse draw order)
        var hitQuestion = false;
        for (var i = questionBubbles.length - 1; i >= 0; i--) {
            var qb = questionBubbles[i];
            if (!qb.active || qb.popPhase) continue;
            var dx = px - qb.x;
            var dy = py - qb.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < qb.r * HIT_FORGIVENESS) {
                hitQuestion = true;
                // Store pop position for radial reveal
                lastPopX = qb.x / W;
                lastPopY = qb.y / H;
                // Anticipatory squeeze: shrink to 70% over 80ms, then burst
                qb.popPhase = 'squeeze';
                qb.squeezeStart = performance.now();
                (function (bubble) {
                    var squeezeTimer = setTimeout(function () {
                        if (!bubble.active && bubble.popPhase !== 'squeeze') return;
                        audioManager.playPop(false);
                        spawnBurst(bubble.x, bubble.y, false);
                        startleFish(bubble.x, bubble.y);
                        streak++;
                        applyStreakEffects(bubble.x, bubble.y);
                        unlockCreature(bubble.questionId);
                        questionCooldowns[bubble.questionId] = Date.now() + QUESTION_COOLDOWN_MS;
                        var poppedId = bubble.questionId;
                        bubble.active = false;
                        bubble.popPhase = null;
                        bubble.drawScale = 1;
                        showAnswer(poppedId);
                        (function (id) {
                            var tid = setTimeout(function () {
                                var tidx = respawnTimerIds.indexOf(tid);
                                if (tidx !== -1) respawnTimerIds.splice(tidx, 1);
                                if (appState === State.BUBBLES) {
                                    respawnQuestionBubbleById(id);
                                } else if (appState === State.ANSWER) {
                                    pendingRespawnIds.push(id);
                                }
                            }, 2000);
                            respawnTimerIds.push(tid);
                        })(poppedId);
                    }, 80);
                    squeezeTimerIds.push(squeezeTimer);
                })(qb);
                break;
            }
        }

        if (!hitQuestion) {
            // Check decorative bubbles (pop for delight!)
            var hitDecorative = false;
            for (var i = decorativeBubbles.length - 1; i >= 0; i--) {
                var b = decorativeBubbles[i];
                var bx = b.x + Math.sin(animTime * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
                var dx = px - bx;
                var dy = py - b.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < b.r * HIT_FORGIVENESS) {
                    audioManager.playPop(true);
                    spawnBurst(bx, b.y, true);
                    startleFish(bx, b.y);
                    resetDecorativeBubble(b);
                    hitDecorative = true;
                    break;
                }
            }

            if (!hitDecorative) {
                // Nothing hit — spawn a water ripple
                spawnRipple(px, py);
            }
        }

        // Start nursery long-press timer only if no question bubble was hit
        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        if (!hitQuestion) {
            nurseryTimer = setTimeout(function () {
                nursery.active = true;
                nursery.x = px;
                nursery.y = py;
                nursery.startTime = animTime;
                nursery.radius = 5;
            }, 1500);
        }
    });

    // Finger-trail bioluminescence — track pointermove
    canvas.addEventListener('pointermove', function (e) {
        if (appState !== State.BUBBLES) return;
        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;
        addTrailPoint(px, py);
        // Update nursery position if active
        if (nursery.active) {
            nursery.x = px;
            nursery.y = py;
        }
    });

    canvas.addEventListener('pointerup', function () {
        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        if (nursery.active) {
            // Release the bubble
            userBubbles.push({
                x: nursery.x,
                y: nursery.y,
                radius: nursery.radius,
                speed: 0.3 + (40 - nursery.radius) * 0.02, // bigger = slower
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleAmp: 0.15 + Math.random() * 0.2,
                wobbleFreq: 0.5 + Math.random() * 0.3,
            });
            nursery.active = false;
            // Cap user bubbles
            if (userBubbles.length > 12) userBubbles.shift();
        }
    });

    canvas.addEventListener('pointercancel', function () {
        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        nursery.active = false;
    });

    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // =========================================================================
    // Word-wrap (bounded cache)
    // =========================================================================

    var textCache = {};
    var textCacheSize = 0;
    var TEXT_CACHE_MAX = 50;

    function wrapText(text, maxWidth, fontSize) {
        var key = text + '|' + Math.round(maxWidth) + '|' + Math.round(fontSize);
        if (textCache[key]) return textCache[key];
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        var words = text.split(' ');
        var lines = [];
        var currentLine = words[0];
        for (var i = 1; i < words.length; i++) {
            var testLine = currentLine + ' ' + words[i];
            if (ctx.measureText(testLine).width > maxWidth) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        if (textCacheSize >= TEXT_CACHE_MAX) { textCache = {}; textCacheSize = 0; }
        textCache[key] = lines;
        textCacheSize++;
        return lines;
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    // Pre-rendered decorative bubble sprite (avoids per-frame gradient creation)
    var decoBubbleSprite = (function () {
        var size = 64; // sprite size in px
        var c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        var sc = c.getContext('2d');
        var r = size / 2;
        var cx = r;
        var cy = r;
        // Body gradient
        var grad = sc.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        grad.addColorStop(0, 'rgba(200, 235, 255, 0.4)');
        grad.addColorStop(0.7, 'rgba(150, 210, 240, 0.2)');
        grad.addColorStop(1, 'rgba(100, 180, 220, 0.05)');
        sc.beginPath();
        sc.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
        sc.fillStyle = grad;
        sc.fill();
        sc.strokeStyle = COLORS.bubbleRim;
        sc.lineWidth = 0.5;
        sc.stroke();
        // Highlight
        sc.beginPath();
        sc.arc(cx - r * 0.3, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
        sc.fillStyle = COLORS.bubbleHighlight;
        sc.globalAlpha = 0.5;
        sc.fill();
        return c;
    })();

    function drawDecorativeBubble(b, time) {
        var x = b.x + Math.sin(time * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
        var y = b.y;
        // Shockwave displacement
        var disp = getShockwaveDisplacement(x, y);
        x += disp.x;
        y += disp.y;
        var r = b.r;
        var d = r * 2;
        ctx.globalAlpha = b.opacity;
        ctx.drawImage(decoBubbleSprite, x - r, y - r, d, d);
        ctx.globalAlpha = 1;
    }

    function drawQuestionBubble(qb, time) {
        if (!qb.active && !qb.popPhase) return;
        var x = qb.x + Math.sin(time * qb.wobbleFreq + qb.wobbleOffset) * qb.wobbleAmp;
        var y = qb.y;
        // Breathing: gentle radius oscillation +/-2px over 3s
        var breathe = 2 * Math.sin(time * 0.33 + qb.glowPhase);
        var r = qb.r + breathe;
        // Squeeze animation
        if (qb.popPhase === 'squeeze') {
            var elapsed = performance.now() - qb.squeezeStart;
            qb.drawScale = 1 - 0.3 * Math.min(elapsed / 80, 1); // 1.0 → 0.7
        }
        r *= qb.drawScale;
        var glowIntensity = 15 + Math.sin(time * 2 + qb.glowPhase) * 8;
        ctx.save();
        ctx.shadowColor = COLORS.questionGlow;
        ctx.shadowBlur = glowIntensity;
        var grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
        grad.addColorStop(0, 'rgba(80, 170, 200, 0.7)');
        grad.addColorStop(0.6, COLORS.questionFill);
        grad.addColorStop(1, 'rgba(20, 60, 100, 0.6)');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = COLORS.questionRim;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x - r * 0.25, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.globalAlpha = 1;

        var fontSize = Math.max(12, Math.min(r * 0.3, 22));
        var maxTextWidth = r * 1.4;
        var lines = wrapText(qb.bubbleText, maxTextWidth, fontSize);
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.fillStyle = COLORS.questionText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var lineHeight = fontSize * 1.25;
        var totalHeight = lines.length * lineHeight;
        var startY = y - totalHeight / 2 + lineHeight / 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        for (var i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, startY + i * lineHeight);
        }
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }

    function drawParticles() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (!p.active) continue;
            var progress = p.life / p.maxLife;
            var alpha = (1 - progress) * p.opacity;
            if (alpha < 0.01) continue;
            if (p.isRing) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.ringR, 0, Math.PI * 2);
                ctx.strokeStyle = COLORS.teal + alpha.toFixed(3) + ')';
                ctx.lineWidth = 2 * (1 - progress);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (1 - progress * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = (p.teal ? COLORS.teal : COLORS.lightBlue) + alpha.toFixed(3) + ')';
                ctx.fill();
            }
        }
    }

    // =========================================================================
    // Update logic
    // =========================================================================

    function updateDecorativeBubbles(dt) {
        for (var i = 0; i < decorativeBubbles.length; i++) {
            var b = decorativeBubbles[i];
            b.y -= b.speed * dt;
            if (b.y < -b.r) resetDecorativeBubble(b);
        }
    }

    function updateQuestionBubbles(dt) {
        for (var i = 0; i < questionBubbles.length; i++) {
            var qb = questionBubbles[i];
            if (!qb.active) continue;
            qb.y -= qb.speed * dt;
            if (qb.y < -qb.r) {
                qb.y = H + qb.r + Math.random() * 100;
                qb.x = qb.r + Math.random() * (W - 2 * qb.r);
            }
        }
    }

    function updateParticles(dt) {
        var drag = Math.pow(0.97, dt);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; continue; }
            if (p.isRing) {
                p.ringR += 3 * dt;
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= drag;
                p.vy *= drag;
            }
        }
    }

    // =========================================================================
    // Idle reset
    // =========================================================================

    function checkIdle() {
        if (appState !== State.BUBBLES && appState !== State.ANSWER) return;
        var elapsed = Date.now() - lastInteraction;
        // Show warning 5s before reset
        if (elapsed > IDLE_WARNING_MS && !idleWarningShown) {
            idleWarningShown = true;
            if (idleWarningEl) idleWarningEl.classList.remove('hidden');
        }
        if (elapsed > IDLE_TIMEOUT_MS) {
            idleWarningShown = false;
            if (idleWarningEl) idleWarningEl.classList.add('hidden');
            showSplash();
        }
    }

    // =========================================================================
    // Game loop
    // =========================================================================

    var lastTime = 0;
    var running = true;
    var rafId = 0;

    function gameLoop(timestamp) {
        if (!running) { lastTime = 0; return; }
        if (!lastTime) lastTime = timestamp;
        var rawDt = (timestamp - lastTime) / (1000 / 60);
        var dt = Math.min(rawDt, 3);
        lastTime = timestamp;
        var time = timestamp / 1000;
        animTime = time;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Screen shake (applied before all drawing)
        applyScreenShake(dt);

        ctx.drawImage(bgCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

        // Whale silhouette (deepest layer, behind everything)
        drawWhale(time);

        // God rays (behind everything)
        drawGodRays(time);

        // Caustic light overlay (lower half, behind fish)
        drawCaustics(time);

        // Marine snow (ambient particles, behind fish)
        drawMarineSnow(time);

        // Seaweed silhouettes (rooted at bottom, behind fish)
        drawSeaweed(time);

        // Jellyfish (drifting background creature, behind fish)
        drawJellyfish(time);

        // Update
        updateDecorativeBubbles(dt);
        updateMarineSnow(dt);
        updateFish(dt);
        updateSchoolFish(dt);
        updateCreatureNudge(dt);
        updateBioParticles(dt);
        updateTrailParticles(dt);
        updateShockwaves(dt);
        updateSonoFlash(dt);
        updateUserBubbles(dt);
        updateCascade(time);
        if (appState === State.BUBBLES || appState === State.ANSWER) {
            updateQuestionBubbles(dt);
        }
        updateParticles(dt);

        // Draw fish (behind bubbles)
        for (var i = 0; i < fishes.length; i++) {
            drawFish(fishes[i], time);
        }

        // Draw unlocked creatures (behind bubbles, after fish)
        drawUnlockedCreatures(time);

        // Draw decorative bubbles
        for (var i = 0; i < decorativeBubbles.length; i++) {
            drawDecorativeBubble(decorativeBubbles[i], time);
        }

        // Draw question bubbles
        if (appState === State.BUBBLES) {
            for (var i = 0; i < questionBubbles.length; i++) {
                drawQuestionBubble(questionBubbles[i], time);
            }
        }

        // User-created bubbles (behind question bubbles)
        drawUserBubbles(time);
        drawNurseryBubble(time);

        // Draw particles (on top)
        drawParticles();

        // Shockwave rings (on top of scene)
        drawShockwaves();

        // Sonoluminescence flash (on top of scene)
        drawSonoFlash();

        // Bioluminescence particles (additive, on top of scene)
        drawBioParticles();

        // Finger-trail bioluminescence
        drawFingerTrail(time);

        // Bioluminescence cascade (finale)
        drawCascade(time);

        // Streak glow pulse
        drawStreakGlow(dt);

        // Creature discovery flash text
        drawCreatureFlash(dt);

        // Grain texture overlay (very last — on top of everything)
        drawGrain();

        checkIdle();
        rafId = requestAnimationFrame(gameLoop);
    }

    // =========================================================================
    // Visibility API
    // =========================================================================

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            running = false;
            cancelAnimationFrame(rafId);
            audioManager.setDroneVolume(0);
        } else {
            running = true;
            lastTime = 0;
            lastInteraction = Date.now();
            rafId = requestAnimationFrame(gameLoop);
            if (appState !== State.SPLASH) {
                audioManager.setDroneVolume(0.06);
            }
        }
    });

    // =========================================================================
    // Start
    // =========================================================================

    rafId = requestAnimationFrame(gameLoop);

})();
