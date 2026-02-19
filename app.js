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
    var HIT_FORGIVENESS = 1.15;
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

            var tipWidth = 1;
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
        opacity: 0.2,
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
        var cx = jf.x + Math.sin(time * jf.lissA) * jf.lissAmpX;
        var cy = jf.y + Math.sin(time * jf.lissB) * jf.lissAmpY;
        var pulse = 0.85 + 0.15 * Math.sin(time * 2.1);
        var r = jf.bellRadius * pulse;

        ctx.save();
        ctx.globalAlpha = jf.opacity;
        ctx.translate(cx, cy);

        // Bell (dome curves upward, opens downward)
        ctx.beginPath();
        var first = true;
        for (var a = 0; a <= Math.PI; a += 0.05) {
            var wobble = Math.sin(a * 3 + time * 2) * 2;
            var bx = Math.cos(a) * (r + wobble); // left-to-right across top
            var by = -Math.sin(a) * (r * 0.7 + wobble * 0.5); // dome goes upward (negative y)
            if (first) { ctx.moveTo(bx, by); first = false; }
            else ctx.lineTo(bx, by);
        }
        ctx.closePath();
        var bellGrad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
        bellGrad.addColorStop(0, 'rgba(180, 200, 240, 0.4)');
        bellGrad.addColorStop(0.5, 'rgba(200, 160, 220, 0.25)');
        bellGrad.addColorStop(1, 'rgba(160, 140, 200, 0.1)');
        ctx.fillStyle = bellGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Tentacles
        var bellBottom = r * 0.1; // bottom of bell (where it opens)
        for (var t = 0; t < jf.tentacles; t++) {
            var tx = (t / (jf.tentacles - 1) - 0.5) * r * 1.6;
            ctx.beginPath();
            ctx.moveTo(tx, bellBottom);
            var tentLen = 50 + Math.sin(time * 0.7 + t) * 10;
            for (var seg = 1; seg <= 8; seg++) {
                var st = seg / 8;
                var sway = Math.sin(time * 1.5 + t * 1.2 + seg * 0.6) * (8 * st);
                ctx.lineTo(tx + sway, bellBottom + st * tentLen);
            }
            ctx.strokeStyle = 'rgba(180, 160, 220, ' + (0.15 * (1 - 0.5 * (Math.abs(t - 2) / 2))) + ')';
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

    // Sea turtle — glides left across the upper third, anatomically correct
    function drawSeaTurtle(time, c) {
        // Smooth ping-pong traversal (triangle wave — no teleport)
        var period = 40; // seconds for a full round trip
        var phase = ((time - c.startTime) % period) / period;
        var tri = Math.abs(2 * phase - 1); // 0→1→0 triangle wave
        var x = -60 + tri * (W + 120); // ping-pong across screen
        var y = H * 0.2 + Math.sin(time * 0.3 + 1.5) * 20;
        var sz = 28;

        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.translate(x, y);
        // Face direction of travel: left when phase < 0.5, right when > 0.5
        if (phase < 0.5) ctx.scale(-1, 1);

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

        // Shell scute pattern (central ridge + lateral lines)
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

        // Head (larger, ~1/3 shell width)
        ctx.beginPath();
        ctx.ellipse(sz * 1.15, 0, sz * 0.32, sz * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#7ab867';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sz * 1.3, -sz * 0.06, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Front flippers — synchronous "flying" stroke
        var flipAngle = Math.sin(time * 2.5) * 0.4; // ~0.4 Hz
        ctx.save();
        ctx.translate(sz * 0.5, -sz * 0.45);
        ctx.rotate(-0.5 + flipAngle);
        ctx.beginPath();
        ctx.ellipse(8, 0, 18, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#7ab867';
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(sz * 0.5, sz * 0.45);
        ctx.rotate(0.5 - flipAngle);
        ctx.beginPath();
        ctx.ellipse(8, 0, 18, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#7ab867';
        ctx.fill();
        ctx.restore();

        // Rear flippers — smaller, alternating paddle
        var rearFlip = Math.sin(time * 2.5 + 1.5) * 0.25;
        ctx.save();
        ctx.translate(-sz * 0.55, -sz * 0.3);
        ctx.rotate(-0.3 + rearFlip);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 3.5, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#6aa85a';
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(-sz * 0.55, sz * 0.3);
        ctx.rotate(0.3 - rearFlip);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 3.5, 0.1, 0, Math.PI * 2);
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

    // Hammerhead — dark silhouette drifting in the far background
    function drawHammerhead(time, c) {
        var period = 60; // seconds for a full round trip
        var phase = ((time - c.startTime) % period) / period;
        var tri = Math.abs(2 * phase - 1); // 0→1→0 triangle wave
        var x = -60 + tri * (W + 120);
        var y = H * 0.35 + Math.sin(time * 0.2) * 30;
        var sz = 40;

        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.translate(x, y);
        // Face direction of travel
        if (phase < 0.5) ctx.scale(-1, 1);

        // Body
        ctx.beginPath();
        ctx.moveTo(sz * 1.2, 0);
        ctx.quadraticCurveTo(sz * 0.6, -sz * 0.25, -sz * 0.3, -sz * 0.1);
        ctx.quadraticCurveTo(-sz * 0.6, 0, -sz * 0.3, sz * 0.1);
        ctx.quadraticCurveTo(sz * 0.6, sz * 0.25, sz * 1.2, 0);
        ctx.fillStyle = '#1a2a3a';
        ctx.fill();

        // Hammer head
        ctx.beginPath();
        ctx.moveTo(sz * 1.2, 0);
        ctx.lineTo(sz * 1.4, -sz * 0.35);
        ctx.quadraticCurveTo(sz * 1.5, -sz * 0.35, sz * 1.5, -sz * 0.2);
        ctx.lineTo(sz * 1.3, 0);
        ctx.lineTo(sz * 1.5, sz * 0.2);
        ctx.quadraticCurveTo(sz * 1.5, sz * 0.35, sz * 1.4, sz * 0.35);
        ctx.closePath();
        ctx.fill();

        // Dorsal fin (mid-body, ~40% from nose)
        ctx.beginPath();
        ctx.moveTo(sz * 0.1, -sz * 0.12);
        ctx.lineTo(sz * 0.3, -sz * 0.55);
        ctx.lineTo(sz * 0.5, -sz * 0.12);
        ctx.fill();

        // Tail
        var tailSwing = Math.sin(time * 2) * 0.2;
        ctx.save();
        ctx.translate(-sz * 0.3, 0);
        ctx.rotate(tailSwing);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-sz * 0.4, -sz * 0.3);
        ctx.lineTo(-sz * 0.25, 0);
        ctx.lineTo(-sz * 0.4, sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // Seahorse — vertical posture, curled tail, coronet, segmented body
    function drawSeahorse(time, c) {
        var entryProgress = Math.min((time - c.startTime) * 0.5, 1);
        var baseY = H * 0.72 - entryProgress * H * 0.12;
        var x = W * 0.12 + Math.sin(time * 0.2 + 2) * 8;
        var y = baseY + Math.sin(time * 0.8) * 6;
        var sz = 12;

        ctx.save();
        ctx.globalAlpha = 0.7 * entryProgress;
        ctx.translate(x, y);

        // Curled prehensile tail (logarithmic spiral at bottom)
        ctx.beginPath();
        ctx.moveTo(sz * 0.1, sz * 1.2);
        ctx.quadraticCurveTo(sz * 0.5, sz * 1.8, sz * 0.3, sz * 2.2);
        ctx.quadraticCurveTo(-sz * 0.1, sz * 2.5, -sz * 0.3, sz * 2.2);
        ctx.quadraticCurveTo(-sz * 0.5, sz * 1.9, -sz * 0.15, sz * 1.7);
        ctx.quadraticCurveTo(sz * 0.1, sz * 1.5, sz * 0.05, sz * 1.4);
        ctx.lineWidth = sz * 0.25;
        ctx.strokeStyle = '#e09350';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Body trunk (vertical, slightly convex belly)
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.8); // neck base
        ctx.quadraticCurveTo(sz * 0.6, -sz * 0.2, sz * 0.45, sz * 0.5); // belly curves out
        ctx.quadraticCurveTo(sz * 0.25, sz * 1.0, sz * 0.1, sz * 1.2); // taper to tail
        ctx.lineWidth = sz * 0.55;
        ctx.strokeStyle = '#f4a261';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Body segments (horizontal ridges)
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

        // Head (angled ~45 degrees from body, facing right)
        ctx.save();
        ctx.translate(0, -sz * 0.9);
        ctx.rotate(-0.3); // slight forward tilt

        // Coronet (small crown bump on top)
        ctx.beginPath();
        ctx.moveTo(-sz * 0.1, -sz * 0.6);
        ctx.lineTo(0, -sz * 0.85);
        ctx.lineTo(sz * 0.1, -sz * 0.6);
        ctx.fillStyle = '#d08840';
        ctx.fill();

        // Head shape
        ctx.beginPath();
        ctx.ellipse(0, -sz * 0.3, sz * 0.28, sz * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f4a261';
        ctx.fill();

        // Tubular snout (angled downward-forward)
        ctx.beginPath();
        ctx.moveTo(sz * 0.2, -sz * 0.25);
        ctx.lineTo(sz * 0.75, -sz * 0.45);
        ctx.lineWidth = sz * 0.15;
        ctx.strokeStyle = '#e09350';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Eye
        ctx.beginPath();
        ctx.arc(sz * 0.05, -sz * 0.35, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        ctx.restore();

        // Dorsal fin (fluttering rapidly on the back)
        var flutter = Math.sin(time * 15) * 0.08; // fast flutter
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

    // Fish school — 12 tiny fish in a boid-like flock
    var schoolFish = [];
    function initSchoolFish() {
        schoolFish = [];
        for (var i = 0; i < 12; i++) {
            schoolFish.push({
                ox: (Math.random() - 0.5) * 60, // offset from centre
                oy: (Math.random() - 0.5) * 40,
                phase: Math.random() * Math.PI * 2,
                size: 4 + Math.random() * 3,
            });
        }
    }
    initSchoolFish();

    function drawFishSchool(time, c) {
        var progress = (time - c.startTime) * 0.03;
        // Centre of the school drifts in a figure-8
        var cx = W * 0.5 + Math.sin(progress * 0.7) * W * 0.25;
        var cy = H * 0.45 + Math.sin(progress * 0.5) * H * 0.15;

        ctx.save();
        ctx.globalAlpha = 0.6;
        for (var i = 0; i < schoolFish.length; i++) {
            var sf = schoolFish[i];
            var fx = cx + sf.ox + Math.sin(time * 0.8 + sf.phase) * 8;
            var fy = cy + sf.oy + Math.cos(time * 0.6 + sf.phase) * 5;
            // Smooth direction: use cosine directly for gradual heading
            var heading = Math.cos(progress * 0.7);
            var dir = heading > 0 ? 1 : -1;
            // Smooth turn: compress fish horizontally near zero-crossing
            var squeeze = Math.min(Math.abs(heading) * 3, 1);

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

    // Pistol shrimp — small crustacean on the seafloor
    function drawPistolShrimp(time, c) {
        var entryProgress = Math.min((time - c.startTime) * 0.8, 1);
        var x = W * 0.85;
        var y = H - 20 - entryProgress * 10;
        var sz = 12;

        ctx.save();
        ctx.globalAlpha = 0.75 * entryProgress;
        ctx.translate(x, y);
        ctx.scale(-1, 1); // face inward (left)

        // Body segments
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.5, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e07050';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sz * 0.8, -sz * 0.1, sz * 0.5, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d06040';
        ctx.fill();

        // Big claw (the snapping one!)
        var snapAngle = Math.sin(time * 0.5) * 0.1; // gentle idle movement
        ctx.save();
        ctx.translate(sz * 1.3, -sz * 0.3);
        ctx.rotate(-0.3 + snapAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 0.9, sz * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#c85030';
        ctx.fill();
        ctx.restore();

        // Small claw
        ctx.beginPath();
        ctx.ellipse(sz * 1.2, sz * 0.2, sz * 0.4, sz * 0.2, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#d06040';
        ctx.fill();

        // Antennae
        ctx.beginPath();
        ctx.moveTo(sz * 1.3, -sz * 0.4);
        var antSway = Math.sin(time * 2) * 3;
        ctx.quadraticCurveTo(sz * 1.8, -sz * 1.2 + antSway, sz * 2.2, -sz * 0.8 + antSway);
        ctx.moveTo(sz * 1.3, -sz * 0.3);
        ctx.quadraticCurveTo(sz * 2, -sz * 1 - antSway, sz * 2.4, -sz * 0.6 - antSway);
        ctx.strokeStyle = 'rgba(224, 112, 80, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Eye
        ctx.beginPath();
        ctx.arc(sz * 1.1, -sz * 0.25, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Legs
        for (var i = 0; i < 3; i++) {
            var lx = -sz * 0.4 + i * sz * 0.5;
            var legPhase = Math.sin(time * 3 + i * 1.2) * 2;
            ctx.beginPath();
            ctx.moveTo(lx, sz * 0.4);
            ctx.lineTo(lx + legPhase, sz * 0.9);
            ctx.strokeStyle = 'rgba(208, 96, 64, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    // Glowing jellyfish (temperature reward) — brighter than the background one
    function drawGlowingJellyfish(time, c) {
        var entryProgress = Math.min((time - c.startTime) * 0.3, 1);
        var cx = W * 0.7 + Math.sin(time * 0.05) * W * 0.1;
        var cy = H * 0.3 + Math.sin(time * 0.04) * H * 0.08;
        var pulse = 0.85 + 0.15 * Math.sin(time * 2.5);
        var r = 25 * pulse;

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

        // Bell (dome curves upward, opens downward)
        ctx.beginPath();
        var first = true;
        for (var a = 0; a <= Math.PI; a += 0.06) {
            var wobble = Math.sin(a * 4 + time * 2.5) * 1.5;
            var bx = Math.cos(a) * (r + wobble);
            var by = -Math.sin(a) * (r * 0.65 + wobble * 0.5);
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

        // Tentacles
        for (var t = 0; t < 4; t++) {
            var tx = (t / 3 - 0.5) * r * 1.4;
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.1);
            for (var seg = 1; seg <= 6; seg++) {
                var st = seg / 6;
                var sway = Math.sin(time * 1.8 + t * 1.3 + seg * 0.5) * (6 * st);
                ctx.lineTo(tx + sway, r * 0.1 + st * 35);
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
        // Streak 2+: larger burst (handled by modifying burst count)
        if (streak >= 2) {
            spawnBurst(cx, cy, false); // double burst
        }
        // Streak 3+: background glow pulse
        if (streak >= 3) {
            streakGlowAlpha = 0.15;
        }
        // Streak 4+: bioluminescence bloom + extra burst
        if (streak >= 4) {
            spawnBioluminescence(cx, cy);
            spawnBurst(cx, cy, true);
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
    // Idle warning state
    // =========================================================================

    var idleWarningShown = false;
    var idleWarningEl = document.getElementById('idle-warning');

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

        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.translate(x, y);
        ctx.scale(d, 1); // flip for direction

        // Tail (animated wag)
        var tailAngle = Math.sin(time * 4 + f.tailPhase) * 0.3;
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

    // Screen micro-shake for dramatic reveals
    function screenShake(intensity, duration) {
        var el = document.getElementById('bubble-canvas');
        var start = performance.now();
        function shake(now) {
            var elapsed = now - start;
            if (elapsed > duration) { el.style.transform = ''; return; }
            var decay = 1 - (elapsed / duration);
            var x = (Math.random() - 0.5) * intensity * decay;
            var y = (Math.random() - 0.5) * intensity * decay;
            el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
            requestAnimationFrame(shake);
        }
        // Respect prefers-reduced-motion
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        requestAnimationFrame(shake);
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
                screenShake(3, 200);
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
            // Stagger start times so entry animations don't all fire at once
            unlockedCreatures[ids[i]] = { startTime: animTime - i * 0.5 };
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
        for (var i = questionBubbles.length - 1; i >= 0; i--) {
            var qb = questionBubbles[i];
            if (!qb.active || qb.popPhase) continue;
            var dx = px - qb.x;
            var dy = py - qb.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < qb.r * HIT_FORGIVENESS) {
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
                return;
            }
        }

        // Check decorative bubbles (pop for delight!)
        for (var i = decorativeBubbles.length - 1; i >= 0; i--) {
            var b = decorativeBubbles[i];
            var bx = b.x + Math.sin(animTime * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
            var dx = px - bx;
            var dy = py - b.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.r * 1.3) {
                audioManager.playPop(true);
                spawnBurst(bx, b.y, true);
                startleFish(bx, b.y);
                resetDecorativeBubble(b);
                return;
            }
        }

        // Nothing hit — spawn a water ripple
        spawnRipple(px, py);
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

    function drawDecorativeBubble(b, time) {
        var x = b.x + Math.sin(time * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
        var y = b.y;
        var r = b.r;
        ctx.globalAlpha = b.opacity;
        var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        grad.addColorStop(0, 'rgba(200, 235, 255, 0.4)');
        grad.addColorStop(0.7, 'rgba(150, 210, 240, 0.2)');
        grad.addColorStop(1, 'rgba(100, 180, 220, 0.05)');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = COLORS.bubbleRim;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.bubbleHighlight;
        ctx.globalAlpha = b.opacity * 0.5;
        ctx.fill();
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
        ctx.drawImage(bgCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

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
        updateBioParticles(dt);
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

        // Draw particles (on top)
        drawParticles();

        // Bioluminescence particles (additive, on top of scene)
        drawBioParticles();

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
