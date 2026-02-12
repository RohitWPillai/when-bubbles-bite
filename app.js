// app.js — Bubble Quiz v2: fish, god rays, visual answers, delight interactions
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
    var MAX_PARTICLES = 80;
    var BURST_PARTICLE_COUNT = 24;
    var BURST_RING_COUNT = 3;
    var MINI_BURST_COUNT = 8;
    var IDLE_TIMEOUT_MS = 45000;
    var QUESTION_COOLDOWN_MS = 60000;
    var HIT_FORGIVENESS = 1.15;
    var DPR_CAP = 1.5;
    var FISH_COUNT = 5;
    var GOD_RAY_COUNT = 4;
    var PARTICLE_LIFE_FRAMES = 30;
    var RING_LIFE_FRAMES = 36;

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
    });

    resizeCanvas();

    // =========================================================================
    // App state
    // =========================================================================

    var State = { SPLASH: 0, BUBBLES: 1, ANSWER: 2 };
    var appState = State.SPLASH;
    var lastInteraction = Date.now();

    // =========================================================================
    // God rays
    // =========================================================================

    var godRays = [];
    for (var i = 0; i < GOD_RAY_COUNT; i++) {
        godRays.push({
            x: W * (0.1 + i * 0.25 + Math.random() * 0.1),
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
            var sway = Math.sin(time * ray.swaySpeed + ray.swayOffset) * ray.swayAmp;
            var topX = ray.x + sway;
            var botX = ray.x + sway * 0.5 + ray.width * 0.8;
            var hw = ray.width / 2;

            ctx.globalAlpha = ray.opacity;
            ctx.beginPath();
            ctx.moveTo(topX - hw * 0.3, 0);
            ctx.lineTo(topX + hw * 0.3, 0);
            ctx.lineTo(botX + hw, H);
            ctx.lineTo(botX - hw, H);
            ctx.closePath();
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.globalAlpha = 1;
        }
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
        var r = 55 + Math.random() * 15;
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
        };
    }

    function respawnQuestionBubble(idx) {
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
                p.maxLife = (mini ? 18 : PARTICLE_LIFE_FRAMES) + Math.random() * 12;
                p.isRing = false;
                p.teal = Math.random() > 0.6;
                p.opacity = mini ? 0.5 : 0.8;
            } else {
                p.vx = 0;
                p.vy = 0;
                p.r = 0;
                p.ringR = 0;
                p.maxLife = (mini ? 20 : RING_LIFE_FRAMES) + Math.random() * 12;
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

        init: function () {
            if (this.ctx) return;
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            var bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            var data = this.noiseBuffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        },

        playPop: function (mini) {
            if (this.muted || !this.ctx || !this.noiseBuffer) return;
            var actx = this.ctx;
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
            noiseGain.connect(actx.destination);
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
            oscGain.connect(actx.destination);
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
    });

    // =========================================================================
    // Answer overlay
    // =========================================================================

    var overlayEl = document.getElementById('answer-overlay');
    var contentEl = document.getElementById('answer-content');
    var dismissBtn = document.getElementById('dismiss-btn');

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
            case 'big-reveal': renderBigReveal(question.answer); break;
            case 'text-fact': renderTextFact(question.answer); break;
            case 'icon-grid': renderIconGrid(question.answer); break;
        }

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
                setTimeout(function () { fill.style.width = fill.getAttribute('data-width'); }, delay);
            })(fills[i], 250 * i + 100);
        }
        var funFact = contentEl.querySelector('.bar-fun-fact');
        if (funFact) {
            setTimeout(function () { funFact.classList.add('visible'); }, 250 * data.bars.length + 600);
        }
    }

    function renderBigReveal(data) {
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

        // Stagger badge animation
        var badges = contentEl.querySelectorAll('.badge');
        for (var i = 0; i < badges.length; i++) {
            (function (badge, delay) {
                setTimeout(function () { badge.classList.add('visible'); }, delay);
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
                setTimeout(function () { item.classList.add('visible'); }, delay);
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
                setTimeout(function () { cell.classList.add('visible'); }, delay);
            })(cells[i], 200 * i + 100);
        }
    }

    function hideAnswer() {
        overlayEl.classList.add('hidden');
        appState = State.BUBBLES;
        lastInteraction = Date.now();
    }

    dismissBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        hideAnswer();
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
        splashEl.classList.remove('hidden');
        overlayEl.classList.add('hidden');
        questionCooldowns = {};
    }

    function hideSplash() {
        audioManager.init();
        splashEl.classList.add('hidden');
        appState = State.BUBBLES;
        lastInteraction = Date.now();
        initQuestionBubbles();
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

        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;

        // Check question bubbles first (reverse draw order)
        for (var i = questionBubbles.length - 1; i >= 0; i--) {
            var qb = questionBubbles[i];
            if (!qb.active) continue;
            var dx = px - qb.x;
            var dy = py - qb.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < qb.r * HIT_FORGIVENESS) {
                audioManager.playPop(false);
                spawnBurst(qb.x, qb.y, false);
                startleFish(qb.x, qb.y);
                questionCooldowns[qb.questionId] = Date.now() + QUESTION_COOLDOWN_MS;
                qb.active = false;
                showAnswer(qb.questionId);
                (function (idx) {
                    setTimeout(function () {
                        if (appState === State.BUBBLES) respawnQuestionBubble(idx);
                    }, 2000);
                })(i);
                return;
            }
        }

        // Check decorative bubbles (pop for delight!)
        for (var i = decorativeBubbles.length - 1; i >= 0; i--) {
            var b = decorativeBubbles[i];
            var bx = b.x + Math.sin(Date.now() / 1000 * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
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
        if (!qb.active) return;
        var x = qb.x + Math.sin(time * qb.wobbleFreq + qb.wobbleOffset) * qb.wobbleAmp;
        var y = qb.y;
        var r = qb.r;
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

        var fontSize = Math.max(12, Math.min(r * 0.28, 19));
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
        if ((appState === State.BUBBLES || appState === State.ANSWER) &&
            Date.now() - lastInteraction > IDLE_TIMEOUT_MS) {
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

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(bgCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

        // God rays (behind everything)
        drawGodRays(time);

        // Update
        updateDecorativeBubbles(dt);
        updateFish(dt);
        if (appState === State.BUBBLES || appState === State.ANSWER) {
            updateQuestionBubbles(dt);
        }
        updateParticles(dt);

        // Draw fish (behind bubbles)
        for (var i = 0; i < fishes.length; i++) {
            drawFish(fishes[i], time);
        }

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

        checkIdle();
        rafId = requestAnimationFrame(gameLoop);
    }

    // =========================================================================
    // Visibility API
    // =========================================================================

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            running = false;
        } else {
            running = true;
            lastTime = 0;
            rafId = requestAnimationFrame(gameLoop);
        }
    });

    // =========================================================================
    // Start
    // =========================================================================

    rafId = requestAnimationFrame(gameLoop);

})();
