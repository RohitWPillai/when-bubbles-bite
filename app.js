// app.js — Bubble Quiz: all rendering, physics, audio, and interaction logic
// Single-file for v1 simplicity

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
    };

    var DECORATIVE_COUNT = 50;
    var QUESTION_BUBBLE_COUNT = 4;
    var MAX_PARTICLES = 60;
    var BURST_PARTICLE_COUNT = 24;
    var BURST_RING_COUNT = 3;
    var IDLE_TIMEOUT_MS = 45000;
    var QUESTION_COOLDOWN_MS = 60000;
    var HIT_FORGIVENESS = 1.15;
    var DPR_CAP = 1.5;

    // =========================================================================
    // Canvas setup
    // =========================================================================

    var canvas = document.getElementById('bubble-canvas');
    var ctx = canvas.getContext('2d');
    var W, H, dpr;

    // Single offscreen canvas for background (reused on resize)
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
        // Reposition question bubbles within new bounds
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
    // Bubble pool
    // =========================================================================

    var decorativeBubbles = [];
    var questionBubbles = [];

    function createDecorativeBubble(startAtBottom) {
        // Bimodal: 60% tiny (8-14), 30% medium (14-20), 10% large (20-25)
        var roll = Math.random();
        var r;
        if (roll < 0.6) r = 8 + Math.random() * 6;
        else if (roll < 0.9) r = 14 + Math.random() * 6;
        else r = 20 + Math.random() * 5;

        var speed = 0.3 + (r / 25) * 0.9; // larger = faster
        // Smaller bubbles = more transparent (further away depth cue)
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
        b.speed = 0.3 + (b.r / 25) * 0.9;
        b.opacity = 0.15 + (b.r / 25) * 0.35;
        b.wobbleOffset = Math.random() * Math.PI * 2;
        b.wobbleAmp = 0.3 + Math.random() * 1.2;
        b.wobbleFreq = 0.5 + Math.random() * 1.5;
    }

    // Initialize decorative pool
    for (var i = 0; i < DECORATIVE_COUNT; i++) {
        decorativeBubbles.push(createDecorativeBubble(false));
    }

    // =========================================================================
    // Question bubble management
    // =========================================================================

    var questionCooldowns = {}; // id -> timestamp when cooldown expires
    var currentQuestionIds = []; // which questions are on screen

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
            speed: 0.4 + Math.random() * 0.3,
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
        qb.speed = 0.4 + Math.random() * 0.3;
        qb.wobbleOffset = Math.random() * Math.PI * 2;
        qb.glowPhase = Math.random() * Math.PI * 2;
    }

    // =========================================================================
    // Particle pool (life tracked in frame-normalized units)
    // =========================================================================

    // Particle maxLife is in frame units (1 unit = 1 frame at 60fps)
    // At 60fps: 30 frames = 500ms. At 120fps: dt=0.5 so 30 units = 60 frames = 500ms. Consistent.
    var PARTICLE_LIFE_FRAMES = 30;   // ~500ms at 60fps
    var RING_LIFE_FRAMES = 36;       // ~600ms at 60fps

    var particles = [];
    for (var i = 0; i < MAX_PARTICLES; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, opacity: 0, life: 0, maxLife: 0, isRing: false, ringR: 0, teal: false });
    }

    function spawnBurst(cx, cy) {
        var spawned = 0;
        for (var i = 0; i < particles.length && spawned < BURST_PARTICLE_COUNT + BURST_RING_COUNT; i++) {
            if (particles[i].active) continue;
            var p = particles[i];
            p.active = true;
            p.x = cx;
            p.y = cy;
            p.life = 0;

            if (spawned < BURST_PARTICLE_COUNT) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 2 + Math.random() * 4;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.r = 2 + Math.random() * 3;
                p.maxLife = PARTICLE_LIFE_FRAMES + Math.random() * 12;
                p.isRing = false;
                p.teal = Math.random() > 0.6;
                p.opacity = 0.8;
            } else {
                p.vx = 0;
                p.vy = 0;
                p.r = 0;
                p.ringR = 0;
                p.maxLife = RING_LIFE_FRAMES + Math.random() * 12;
                p.isRing = true;
                p.opacity = 0.6;
            }
            spawned++;
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
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            // Pre-create reusable noise buffer
            var bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            var data = this.noiseBuffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.3;
            }
        },

        playPop: function () {
            if (this.muted || !this.ctx || !this.noiseBuffer) return;
            var actx = this.ctx;
            var now = actx.currentTime;

            // White noise burst through bandpass (reuses pre-created buffer)
            var noise = actx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            var bandpass = actx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 800;
            bandpass.Q.value = 1.5;

            var noiseGain = actx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            noise.connect(bandpass);
            bandpass.connect(noiseGain);
            noiseGain.connect(actx.destination);
            noise.start(now);
            noise.stop(now + 0.08);

            // Descending sine sweep
            var osc = actx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

            var oscGain = actx.createGain();
            oscGain.gain.setValueAtTime(0.2, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(oscGain);
            oscGain.connect(actx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    };

    // Mute button
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
            case 'bar-chart':
                renderBarChart(question.answer);
                break;
            case 'big-reveal':
                renderBigReveal(question.answer);
                break;
            case 'text-fact':
                renderTextFact(question.answer);
                break;
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

        // Animate bars with stagger
        var fills = contentEl.querySelectorAll('.bar-fill');
        for (var i = 0; i < fills.length; i++) {
            (function (fill, delay) {
                setTimeout(function () {
                    fill.style.width = fill.getAttribute('data-width');
                }, delay);
            })(fills[i], 250 * i + 100);
        }

        // Show fun fact after bars finish
        var funFact = contentEl.querySelector('.bar-fun-fact');
        if (funFact) {
            setTimeout(function () {
                funFact.classList.add('visible');
            }, 250 * data.bars.length + 600);
        }
    }

    function renderBigReveal(data) {
        var html = '<div class="big-reveal-container">' +
            '<div class="big-reveal-label">' + escapeHTML(data.label) + '</div>' +
            '<div class="big-reveal-number">' + escapeHTML(data.number) + '</div>';
        if (data.unit) {
            html += '<div class="big-reveal-unit">' + escapeHTML(data.unit) + '</div>';
        }
        html += '<div class="big-reveal-comparison">' + escapeHTML(data.comparison) + '</div>' +
            '</div>';
        contentEl.innerHTML = html;
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

        // Stagger fade-in
        var items = contentEl.querySelectorAll('.text-fact-item');
        for (var i = 0; i < items.length; i++) {
            (function (item, delay) {
                setTimeout(function () {
                    item.classList.add('visible');
                }, delay);
            })(items[i], 300 * i + 100);
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

    // HTML escaping via character replacement (no DOM allocation)
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
        overlayEl.classList.add('hidden'); // ensure answer overlay is hidden
        // Reset question cooldowns so next visitor gets fresh questions
        questionCooldowns = {};
    }

    function hideSplash() {
        audioManager.init(); // iOS AudioContext needs user gesture
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
    // Touch / click detection
    // =========================================================================

    canvas.addEventListener('pointerdown', function (e) {
        if (appState !== State.BUBBLES) return;
        lastInteraction = Date.now();

        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;

        // Check question bubbles in reverse order (topmost first)
        for (var i = questionBubbles.length - 1; i >= 0; i--) {
            var qb = questionBubbles[i];
            if (!qb.active) continue;
            var dx = px - qb.x;
            var dy = py - qb.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < qb.r * HIT_FORGIVENESS) {
                // Hit! Pop this bubble
                audioManager.playPop();
                spawnBurst(qb.x, qb.y);

                // Put on cooldown and deactivate
                questionCooldowns[qb.questionId] = Date.now() + QUESTION_COOLDOWN_MS;
                qb.active = false;

                // Show answer
                showAnswer(qb.questionId);

                // Respawn after a short delay
                (function (idx) {
                    setTimeout(function () {
                        if (appState === State.BUBBLES) {
                            respawnQuestionBubble(idx);
                        }
                    }, 2000);
                })(i);

                return; // Only handle one bubble per tap
            }
        }
    });

    // Prevent Safari scroll/zoom/magnifier
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    // Prevent context menu
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // =========================================================================
    // Word-wrap utility for canvas text (bounded cache)
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

        // Evict cache if too large
        if (textCacheSize >= TEXT_CACHE_MAX) {
            textCache = {};
            textCacheSize = 0;
        }
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

        // Radial gradient fill
        var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        grad.addColorStop(0, 'rgba(200, 235, 255, 0.4)');
        grad.addColorStop(0.7, 'rgba(150, 210, 240, 0.2)');
        grad.addColorStop(1, 'rgba(100, 180, 220, 0.05)');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Rim stroke
        ctx.strokeStyle = COLORS.bubbleRim;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Specular highlight
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

        // Pulsing glow
        var glowIntensity = 15 + Math.sin(time * 2 + qb.glowPhase) * 8;

        ctx.save();
        ctx.shadowColor = COLORS.questionGlow;
        ctx.shadowBlur = glowIntensity;

        // Bubble fill
        var grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
        grad.addColorStop(0, 'rgba(80, 170, 200, 0.7)');
        grad.addColorStop(0.6, COLORS.questionFill);
        grad.addColorStop(1, 'rgba(20, 60, 100, 0.6)');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright rim
        ctx.strokeStyle = COLORS.questionRim;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore(); // remove shadow for text

        // Specular highlight
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x - r * 0.25, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.globalAlpha = 1;

        // Text — font size scales with bubble radius, capped for readability
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

        // Text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        for (var i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, startY + i * lineHeight);
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
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
                var ringRadius = p.ringR;
                ctx.beginPath();
                ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(127, 219, 218, ' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 2 * (1 - progress);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (1 - progress * 0.5), 0, Math.PI * 2);
                // Color assigned at spawn time for stable rendering
                if (p.teal) {
                    ctx.fillStyle = 'rgba(127, 219, 218, ' + alpha.toFixed(3) + ')';
                } else {
                    ctx.fillStyle = 'rgba(200, 235, 255, ' + alpha.toFixed(3) + ')';
                }
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
            if (b.y < -b.r) {
                resetDecorativeBubble(b);
            }
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
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (!p.active) continue;

            // Life is in frame-normalized units (same as dt)
            p.life += dt;

            if (p.life >= p.maxLife) {
                p.active = false;
                continue;
            }

            if (p.isRing) {
                p.ringR += 3 * dt;
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= Math.pow(0.97, dt);
                p.vy *= Math.pow(0.97, dt);
            }
        }
    }

    // =========================================================================
    // Idle reset — covers BOTH bubble field and answer states
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
        if (!running) {
            lastTime = 0;
            return; // Don't schedule next frame; visibility handler restarts loop
        }

        if (!lastTime) lastTime = timestamp;
        var rawDt = (timestamp - lastTime) / (1000 / 60); // normalize to 60fps units
        var dt = Math.min(rawDt, 3); // cap to prevent huge jumps
        lastTime = timestamp;

        var time = timestamp / 1000; // seconds for wobble

        // Clear and draw background
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(bgCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

        // Update
        updateDecorativeBubbles(dt);
        if (appState === State.BUBBLES || appState === State.ANSWER) {
            updateQuestionBubbles(dt);
        }
        updateParticles(dt);

        // Draw decorative bubbles
        for (var i = 0; i < decorativeBubbles.length; i++) {
            drawDecorativeBubble(decorativeBubbles[i], time);
        }

        // Draw question bubbles (only in bubble field state)
        if (appState === State.BUBBLES) {
            for (var i = 0; i < questionBubbles.length; i++) {
                drawQuestionBubble(questionBubbles[i], time);
            }
        }

        // Draw particles
        drawParticles();

        // Idle check
        checkIdle();

        rafId = requestAnimationFrame(gameLoop);
    }

    // =========================================================================
    // Visibility API — pause when tab hidden, restart when visible
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
