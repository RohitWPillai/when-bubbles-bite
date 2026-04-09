// app.js — Bubble Quiz: underwater exhibit app for Edinburgh Science Festival 2026
// Migrated from Canvas 2D to PixiJS v7.4.2
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
    var IDLE_WARNING_MS = 40000;
    var SEAWEED_COUNT = 10;
    var SEAWEED_SEGMENTS = 10;
    var BIOLUM_PARTICLE_COUNT = 40;
    var STARFISH_COUNT = 8;
    var PLANKTON_COUNT = 45;
    var CRAB_COUNT = 5;
    var ANEMONE_COUNT = 6;
    var CORAL_COUNT = 8;
    var DEBRIS_COUNT = 3;
    var BUBBLE_STREAM_COUNT = 6;

    // New creature/decoration counts
    var ROCK_COUNT = 22;
    var SHELL_COUNT = 9;
    var SEA_GRASS_COUNT = 5;
    var SPONGE_COUNT = 5;
    var SEA_URCHIN_COUNT = 5;
    var TUBE_WORM_COUNT = 5;
    var HERMIT_CRAB_COUNT = 3;
    var SEA_CUCUMBER_COUNT = 3;
    var SEAHORSE_BABY_COUNT = 4;
    var NUDIBRANCH_COUNT = 2;
    var CLEANER_SHRIMP_COUNT = 2;

    var FISH_BODY_PROFILES = [
        [0.12, 0.22, 0.30, 0.32, 0.28, 0.20, 0.12, 0.06, 0.02],
        [0.08, 0.25, 0.40, 0.42, 0.35, 0.20, 0.10, 0.04, 0.01],
        [0.08, 0.10, 0.12, 0.12, 0.11, 0.10, 0.09, 0.07, 0.05],
        [0.10, 0.30, 0.42, 0.42, 0.38, 0.25, 0.10, 0.04, 0.01],
    ];

    var FISH_PALETTES = [
        { body: '#f4845f', fin: '#f76707', stripe: '#fff3e6', eye: '#1a1a2e' },
        { body: '#ffd43b', fin: '#f59f00', stripe: '#fff9db', eye: '#1a1a2e' },
        { body: '#4dabf7', fin: '#228be6', stripe: '#d0ebff', eye: '#1a1a2e' },
        { body: '#69db7c', fin: '#37b24d', stripe: '#d3f9d8', eye: '#1a1a2e' },
        { body: '#e599f7', fin: '#be4bdb', stripe: '#f3d9fa', eye: '#1a1a2e' },
    ];

    // =========================================================================
    // Hex color helpers
    // =========================================================================

    function hexToNum(hex) {
        if (hex.charAt(0) === '#') hex = hex.slice(1);
        return parseInt(hex, 16);
    }

    // =========================================================================
    // PixiJS Application setup
    // =========================================================================

    var pixiApp = new PIXI.Application({
        view: document.getElementById('bubble-canvas'),
        resizeTo: window,
        backgroundColor: 0x091f36,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
    });

    var canvas = pixiApp.view;
    var W = window.innerWidth;
    var H = window.innerHeight;

    // =========================================================================
    // Texture pre-generation (offscreen canvases -> PIXI.Texture)
    // =========================================================================

    // Background gradient texture
    function createBgTexture() {
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var sc = c.getContext('2d');
        var grad = sc.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, COLORS.bgTop);
        grad.addColorStop(1, COLORS.bgBottom);
        sc.fillStyle = grad;
        sc.fillRect(0, 0, W, H);
        return PIXI.Texture.from(c);
    }

    // Decorative bubble sprite texture
    var decoBubbleTex = (function () {
        var size = 64;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var sc = c.getContext('2d');
        var r = size / 2;
        var cx = r, cy = r;
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
        sc.beginPath();
        sc.arc(cx - r * 0.3, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
        sc.fillStyle = COLORS.bubbleHighlight;
        sc.globalAlpha = 0.5;
        sc.fill();
        return PIXI.Texture.from(c);
    })();

    // Question bubble sprite texture
    var QB_SPRITE_SIZE = 160;
    var questionBubbleTex = (function () {
        var size = QB_SPRITE_SIZE;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var sc = c.getContext('2d');
        var r = size / 2;
        var cx = r, cy = r;
        var grad = sc.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
        grad.addColorStop(0, 'rgba(80, 170, 200, 0.7)');
        grad.addColorStop(0.6, COLORS.questionFill);
        grad.addColorStop(1, 'rgba(20, 60, 100, 0.6)');
        sc.beginPath();
        sc.arc(cx, cy, r - 1, 0, Math.PI * 2);
        sc.fillStyle = grad;
        sc.fill();
        sc.strokeStyle = COLORS.questionRim;
        sc.lineWidth = 2;
        sc.stroke();
        sc.globalAlpha = 0.4;
        sc.beginPath();
        sc.arc(cx - r * 0.25, cy - r * 0.35, r * 0.2, 0, Math.PI * 2);
        sc.fillStyle = '#fff';
        sc.fill();
        return PIXI.Texture.from(c);
    })();

    // Question glow halo texture
    var QB_GLOW_SIZE = 240;
    var questionGlowTex = (function () {
        var size = QB_GLOW_SIZE;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var sc = c.getContext('2d');
        var cx = size / 2, cy = size / 2;
        var grad = sc.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
        grad.addColorStop(0, 'rgba(127, 219, 218, 0.5)');
        grad.addColorStop(0.5, 'rgba(127, 219, 218, 0.15)');
        grad.addColorStop(1, 'rgba(127, 219, 218, 0)');
        sc.fillStyle = grad;
        sc.fillRect(0, 0, size, size);
        return PIXI.Texture.from(c);
    })();

    // Fish shimmer sprite texture
    var fishShimmerTex = (function () {
        var w = 128, h = 64;
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var sctx = c.getContext('2d');
        var grad = sctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, w, h);
        return PIXI.Texture.from(c);
    })();

    // Glowing jellyfish halo texture
    var GLOW_JELLY_HALO_SIZE = 160;
    var glowJellyHaloTex = (function () {
        var size = GLOW_JELLY_HALO_SIZE;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var sc = c.getContext('2d');
        var cx = size / 2, cy = size / 2;
        var grad = sc.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
        grad.addColorStop(0, 'rgba(100, 255, 218, 0.15)');
        grad.addColorStop(0.5, 'rgba(100, 255, 218, 0.05)');
        grad.addColorStop(1, 'rgba(100, 255, 218, 0)');
        sc.fillStyle = grad;
        sc.fillRect(0, 0, size, size);
        return PIXI.Texture.from(c);
    })();

    // Small circle texture for particles
    var smallCircleTex = (function () {
        var size = 8;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var sc = c.getContext('2d');
        sc.beginPath();
        sc.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        sc.fillStyle = '#ffffff';
        sc.fill();
        return PIXI.Texture.from(c);
    })();

    // Grain noise texture
    var grainTex = (function () {
        var sz = 256;
        var c = document.createElement('canvas');
        c.width = sz; c.height = sz;
        var gctx = c.getContext('2d');
        var imgData = gctx.createImageData(sz, sz);
        var d = imgData.data;
        for (var i = 0; i < d.length; i += 4) {
            var v = Math.floor(Math.random() * 256);
            d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
        }
        gctx.putImageData(imgData, 0, 0);
        return PIXI.Texture.from(c);
    })();

    // Displacement map texture for underwater waviness
    var dispCanvas = (function () {
        var sz = 256;
        var c = document.createElement('canvas');
        c.width = sz; c.height = sz;
        var sc = c.getContext('2d');
        var imgData = sc.createImageData(sz, sz);
        var d = imgData.data;
        for (var y = 0; y < sz; y++) {
            for (var x = 0; x < sz; x++) {
                var idx = (y * sz + x) * 4;
                var vx = 128 + Math.sin(x / sz * Math.PI * 4) * 40 + Math.sin(y / sz * Math.PI * 6) * 20;
                var vy = 128 + Math.cos(y / sz * Math.PI * 4) * 40 + Math.cos(x / sz * Math.PI * 6) * 20;
                d[idx] = vx;
                d[idx + 1] = vy;
                d[idx + 2] = 128;
                d[idx + 3] = 255;
            }
        }
        sc.putImageData(imgData, 0, 0);
        return c;
    })();

    // Seaweed rope texture (gradient strip for SimpleRope)
    var seaweedRopeTex = (function () {
        var c = document.createElement('canvas');
        c.width = 64; c.height = 8;
        var sctx = c.getContext('2d');
        var grad = sctx.createLinearGradient(0, 0, 64, 0);
        grad.addColorStop(0, 'rgba(15, 50, 40, 0.85)');
        grad.addColorStop(0.5, 'rgba(30, 75, 50, 0.7)');
        grad.addColorStop(0.85, 'rgba(50, 100, 60, 0.4)');
        grad.addColorStop(1, 'rgba(70, 130, 70, 0.1)');
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, 64, 8);
        return PIXI.Texture.from(c);
    })();

    // Streak glow texture (regenerated on resize)
    var streakGlowTex = null;
    var streakGlowW = 0, streakGlowH = 0;
    function ensureStreakGlowTex() {
        if (streakGlowTex && streakGlowW === W && streakGlowH === H) return;
        streakGlowW = W; streakGlowH = H;
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var sc = c.getContext('2d');
        var grad = sc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
        grad.addColorStop(0, 'rgba(127, 219, 218, 0.3)');
        grad.addColorStop(1, 'rgba(127, 219, 218, 0)');
        sc.fillStyle = grad;
        sc.fillRect(0, 0, W, H);
        if (streakGlowTex) streakGlowTex.destroy(true);
        streakGlowTex = PIXI.Texture.from(c);
        streakGlowSprite.texture = streakGlowTex;
        streakGlowSprite.width = W;
        streakGlowSprite.height = H;
    }

    // Caustic sprite textures (4 sizes)
    var causticTextures = (function () {
        var sizes = [30, 50, 70, 90];
        var texArr = [];
        for (var s = 0; s < sizes.length; s++) {
            var sz = sizes[s];
            var oc = document.createElement('canvas');
            oc.width = sz * 2; oc.height = sz * 2;
            var octx = oc.getContext('2d');
            var grad = octx.createRadialGradient(sz, sz, 0, sz, sz, sz);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            octx.fillStyle = grad;
            octx.beginPath();
            octx.ellipse(sz, sz, sz, sz * 0.65, 0, 0, Math.PI * 2);
            octx.fill();
            texArr.push(PIXI.Texture.from(oc));
        }
        return texArr;
    })();

    // =========================================================================
    // SVG Creature Sprite Textures
    // =========================================================================

    function svgToTexture(svgString, scale) {
        scale = scale || 1;
        var encoded = encodeURIComponent(svgString);
        var dataUri = 'data:image/svg+xml;charset=utf-8,' + encoded;
        return PIXI.Texture.from(dataUri, { resolution: scale });
    }

    var CREATURE_SVGS = {
        starfish: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><defs><radialGradient id="sg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f09070"/><stop offset="40%" stop-color="#e06848"/><stop offset="100%" stop-color="#b83828"/></radialGradient></defs><path d="M30 2 Q33 12 36 16 Q42 14 50 14 Q44 20 40 24 Q43 30 48 40 Q38 34 34 32 Q32 38 30 48 Q28 38 26 32 Q22 34 12 40 Q17 30 20 24 Q16 20 10 14 Q18 14 24 16 Q27 12 30 2 Z" fill="url(#sg1)" stroke="#903020" stroke-width="0.8" stroke-linejoin="round"/><circle cx="30" cy="24" r="6" fill="rgba(255,180,150,0.4)" stroke="rgba(200,100,70,0.3)" stroke-width="0.5"/><circle cx="30" cy="24" r="3" fill="rgba(255,200,180,0.3)"/><circle cx="30" cy="8" r="1.2" fill="rgba(255,220,200,0.35)"/><circle cx="31" cy="13" r="1" fill="rgba(255,220,200,0.3)"/><circle cx="29" cy="17" r="0.9" fill="rgba(255,220,200,0.25)"/><circle cx="46" cy="15" r="1.2" fill="rgba(255,220,200,0.35)"/><circle cx="42" cy="17" r="1" fill="rgba(255,220,200,0.3)"/><circle cx="38" cy="20" r="0.9" fill="rgba(255,220,200,0.25)"/><circle cx="45" cy="37" r="1.2" fill="rgba(255,220,200,0.35)"/><circle cx="40" cy="33" r="1" fill="rgba(255,220,200,0.3)"/><circle cx="36" cy="30" r="0.9" fill="rgba(255,220,200,0.25)"/><circle cx="15" cy="37" r="1.2" fill="rgba(255,220,200,0.35)"/><circle cx="20" cy="33" r="1" fill="rgba(255,220,200,0.3)"/><circle cx="24" cy="30" r="0.9" fill="rgba(255,220,200,0.25)"/><circle cx="14" cy="15" r="1.2" fill="rgba(255,220,200,0.35)"/><circle cx="18" cy="17" r="1" fill="rgba(255,220,200,0.3)"/><circle cx="22" cy="20" r="0.9" fill="rgba(255,220,200,0.25)"/><line x1="30" y1="18" x2="30" y2="5" stroke="rgba(160,50,30,0.25)" stroke-width="1.2" stroke-linecap="round"/><line x1="33" y1="21" x2="47" y2="15" stroke="rgba(160,50,30,0.25)" stroke-width="1.2" stroke-linecap="round"/><line x1="33" y1="27" x2="46" y2="38" stroke="rgba(160,50,30,0.25)" stroke-width="1.2" stroke-linecap="round"/><line x1="27" y1="27" x2="14" y2="38" stroke="rgba(160,50,30,0.25)" stroke-width="1.2" stroke-linecap="round"/><line x1="27" y1="21" x2="13" y2="15" stroke="rgba(160,50,30,0.25)" stroke-width="1.2" stroke-linecap="round"/></svg>',

        starfishGold: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><defs><radialGradient id="sg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f0d070"/><stop offset="40%" stop-color="#d8b040"/><stop offset="100%" stop-color="#b89028"/></radialGradient></defs><path d="M30 2 Q33 12 36 16 Q42 14 50 14 Q44 20 40 24 Q43 30 48 40 Q38 34 34 32 Q32 38 30 48 Q28 38 26 32 Q22 34 12 40 Q17 30 20 24 Q16 20 10 14 Q18 14 24 16 Q27 12 30 2 Z" fill="url(#sg2)" stroke="#907020" stroke-width="0.8" stroke-linejoin="round"/><circle cx="30" cy="24" r="6" fill="rgba(255,230,180,0.35)" stroke="rgba(200,170,80,0.3)" stroke-width="0.5"/><circle cx="30" cy="24" r="3" fill="rgba(255,240,200,0.25)"/><circle cx="30" cy="8" r="1.2" fill="rgba(255,240,200,0.35)"/><circle cx="46" cy="15" r="1.2" fill="rgba(255,240,200,0.35)"/><circle cx="45" cy="37" r="1.2" fill="rgba(255,240,200,0.35)"/><circle cx="15" cy="37" r="1.2" fill="rgba(255,240,200,0.35)"/><circle cx="14" cy="15" r="1.2" fill="rgba(255,240,200,0.35)"/></svg>',

        crab: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 50"><defs><radialGradient id="cg1" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#e07040"/><stop offset="50%" stop-color="#c05030"/><stop offset="100%" stop-color="#903020"/></radialGradient></defs><ellipse cx="35" cy="26" rx="18" ry="13" fill="url(#cg1)" stroke="#702818" stroke-width="0.8"/><path d="M20 20 Q27 16 35 20 Q43 16 50 20" stroke="rgba(140,50,25,0.5)" stroke-width="0.8" fill="none"/><path d="M22 26 Q28 23 35 26 Q42 23 48 26" stroke="rgba(140,50,25,0.4)" stroke-width="0.7" fill="none"/><path d="M24 31 Q30 28 35 31 Q40 28 46 31" stroke="rgba(140,50,25,0.3)" stroke-width="0.6" fill="none"/><circle cx="30" cy="22" r="1.5" fill="rgba(255,150,100,0.25)"/><circle cx="40" cy="22" r="1.3" fill="rgba(255,150,100,0.2)"/><circle cx="35" cy="18" r="1" fill="rgba(255,150,100,0.2)"/><circle cx="28" cy="28" r="1" fill="rgba(255,150,100,0.15)"/><circle cx="42" cy="28" r="1" fill="rgba(255,150,100,0.15)"/><path d="M28 16 Q26 10 22 7" stroke="#b05028" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="22" cy="6" r="3" fill="#1a1a2e" stroke="#803018" stroke-width="0.4"/><circle cx="22.5" cy="5.5" r="1.2" fill="white" opacity="0.8"/><path d="M42 16 Q44 10 48 7" stroke="#b05028" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="48" cy="6" r="3" fill="#1a1a2e" stroke="#803018" stroke-width="0.4"/><circle cx="48.5" cy="5.5" r="1.2" fill="white" opacity="0.8"/><path d="M17 24 Q10 20 6 16 Q4 13 3 10 Q2 14 4 17 Q6 20 5 22 Q3 18 1 16 Q2 20 5 23 Q8 26 12 26 Q15 26 17 24" fill="#d06038" stroke="#803018" stroke-width="0.5"/><path d="M5 17 Q6 15 5 13" stroke="rgba(100,30,15,0.5)" stroke-width="0.6" fill="none"/><path d="M4 20 Q5 18 4 16" stroke="rgba(100,30,15,0.4)" stroke-width="0.5" fill="none"/><path d="M53 24 Q60 20 64 16 Q66 13 67 10 Q68 14 66 17 Q64 20 65 22 Q67 18 69 16 Q68 20 65 23 Q62 26 58 26 Q55 26 53 24" fill="#d06038" stroke="#803018" stroke-width="0.5"/><path d="M65 17 Q64 15 65 13" stroke="rgba(100,30,15,0.5)" stroke-width="0.6" fill="none"/><path d="M66 20 Q65 18 66 16" stroke="rgba(100,30,15,0.4)" stroke-width="0.5" fill="none"/><path d="M19 28 Q14 30 10 34 Q8 36 5 40" stroke="#b05028" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="10" cy="34" r="1" fill="rgba(180,80,40,0.5)"/><path d="M20 31 Q16 34 12 38 Q10 40 8 44" stroke="#b05028" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="12" cy="38" r="1" fill="rgba(180,80,40,0.5)"/><path d="M21 34 Q18 37 15 42 Q13 44 12 48" stroke="#b05028" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="15" cy="42" r="0.9" fill="rgba(180,80,40,0.5)"/><path d="M51 28 Q56 30 60 34 Q62 36 65 40" stroke="#b05028" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="60" cy="34" r="1" fill="rgba(180,80,40,0.5)"/><path d="M50 31 Q54 34 58 38 Q60 40 62 44" stroke="#b05028" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="58" cy="38" r="1" fill="rgba(180,80,40,0.5)"/><path d="M49 34 Q52 37 55 42 Q57 44 58 48" stroke="#b05028" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="55" cy="42" r="0.9" fill="rgba(180,80,40,0.5)"/></svg>',

        seaUrchin: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 55"><defs><radialGradient id="ug1" cx="45%" cy="40%" r="50%"><stop offset="0%" stop-color="#7060c0"/><stop offset="60%" stop-color="#5040a0"/><stop offset="100%" stop-color="#3a2870"/></radialGradient><radialGradient id="ug2" cx="50%" cy="50%" r="50%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="rgba(120,100,200,0.25)"/></radialGradient></defs><circle cx="27.5" cy="28" r="16" fill="url(#ug2)"/><circle cx="27.5" cy="28" r="13" fill="url(#ug1)" stroke="rgba(100,80,180,0.5)" stroke-width="0.8"/><circle cx="27.5" cy="28" r="10" fill="rgba(90,70,160,0.4)"/><circle cx="24" cy="24" r="4" fill="rgba(140,120,220,0.3)"/><path d="M27.5 16 Q27 8 27.5 1" stroke="#8070c0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M27.5 16 L27.5 1" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M20 19 Q14 12 10 6" stroke="#8070c0" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M20 19 L10 6" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M35 19 Q40 12 45 6" stroke="#8070c0" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M35 19 L45 6" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M16 25 Q8 22 2 20" stroke="#8070c0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 25 L2 20" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M39 25 Q46 22 53 20" stroke="#8070c0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M39 25 L53 20" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M16 33 Q8 36 3 38" stroke="#8070c0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 33 L3 38" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M39 33 Q46 36 52 38" stroke="#8070c0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M39 33 L52 38" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M21 38 Q16 44 13 50" stroke="#8070c0" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M21 38 L13 50" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M34 38 Q38 44 42 50" stroke="#8070c0" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M34 38 L42 50" stroke="#6858a8" stroke-width="0.5" fill="none" stroke-linecap="round"/><path d="M18 21 Q13 16 9 12" stroke="#7060b0" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M37 21 Q42 16 46 12" stroke="#7060b0" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M27.5 40 Q27 46 27.5 52" stroke="#7060b0" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="27.5" cy="0" r="2" fill="#c0b0ff" opacity="0.85"/><circle cx="9" cy="5" r="1.8" fill="#c0b0ff" opacity="0.8"/><circle cx="46" cy="5" r="1.8" fill="#c0b0ff" opacity="0.8"/><circle cx="1" cy="19" r="1.8" fill="#c0b0ff" opacity="0.75"/><circle cx="54" cy="19" r="1.8" fill="#c0b0ff" opacity="0.75"/><circle cx="2" cy="39" r="1.6" fill="#c0b0ff" opacity="0.7"/><circle cx="53" cy="39" r="1.6" fill="#c0b0ff" opacity="0.7"/><circle cx="12" cy="51" r="1.6" fill="#c0b0ff" opacity="0.7"/><circle cx="43" cy="51" r="1.6" fill="#c0b0ff" opacity="0.7"/><circle cx="8" cy="11" r="1.4" fill="#d0c0ff" opacity="0.65"/><circle cx="47" cy="11" r="1.4" fill="#d0c0ff" opacity="0.65"/><circle cx="27.5" cy="53" r="1.4" fill="#c0b0ff" opacity="0.65"/></svg>',

        tubeWorms: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 90"><defs><linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a4a48"/><stop offset="100%" stop-color="#1a3230"/></linearGradient><linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2e3c38"/><stop offset="100%" stop-color="#1c2a26"/></linearGradient><linearGradient id="tcg1" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#e06040"/><stop offset="50%" stop-color="#f08060"/><stop offset="100%" stop-color="#f8a880"/></linearGradient><linearGradient id="tcg2" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#d05838"/><stop offset="50%" stop-color="#e87858"/><stop offset="100%" stop-color="#f0a080"/></linearGradient></defs><rect x="10" y="58" width="6" height="32" rx="3" fill="url(#tg1)" stroke="rgba(20,50,45,0.6)" stroke-width="0.5"/><rect x="24" y="52" width="6" height="38" rx="3" fill="url(#tg2)" stroke="rgba(20,50,45,0.6)" stroke-width="0.5"/><rect x="38" y="60" width="6" height="30" rx="3" fill="url(#tg1)" stroke="rgba(20,50,45,0.6)" stroke-width="0.5"/><ellipse cx="13" cy="58" rx="3.5" ry="1.5" fill="#3a5a55" stroke="rgba(60,90,80,0.5)" stroke-width="0.4"/><ellipse cx="27" cy="52" rx="3.5" ry="1.5" fill="#3a5a55" stroke="rgba(60,90,80,0.5)" stroke-width="0.4"/><ellipse cx="41" cy="60" rx="3.5" ry="1.5" fill="#3a5a55" stroke="rgba(60,90,80,0.5)" stroke-width="0.4"/><path d="M13 58 Q5 46 0 34" stroke="url(#tcg1)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M13 58 Q7 44 3 30" stroke="url(#tcg1)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M13 58 Q10 42 8 28" stroke="url(#tcg1)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M13 58 Q13 40 13 26" stroke="url(#tcg1)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M13 58 Q16 42 18 28" stroke="url(#tcg1)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M13 58 Q19 44 22 30" stroke="url(#tcg1)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M13 58 Q21 46 26 34" stroke="url(#tcg1)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M13 58 Q3 50 -2 40" stroke="rgba(240,130,100,0.4)" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M13 58 Q23 50 28 40" stroke="rgba(240,130,100,0.4)" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M27 52 Q19 38 14 22" stroke="url(#tcg1)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M27 52 Q21 34 18 18" stroke="url(#tcg1)" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.85"/><path d="M27 52 Q24 32 23 14" stroke="url(#tcg1)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M27 52 Q27 30 27 10" stroke="url(#tcg1)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M27 52 Q30 32 31 14" stroke="url(#tcg1)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M27 52 Q33 34 36 18" stroke="url(#tcg1)" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.85"/><path d="M27 52 Q35 38 40 22" stroke="url(#tcg1)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M27 52 Q17 42 12 30" stroke="rgba(248,160,120,0.4)" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M27 52 Q37 42 42 30" stroke="rgba(248,160,120,0.4)" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M41 60 Q33 48 28 36" stroke="url(#tcg2)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M41 60 Q36 46 34 32" stroke="url(#tcg2)" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M41 60 Q40 44 40 30" stroke="url(#tcg2)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M41 60 Q44 44 46 30" stroke="url(#tcg2)" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M41 60 Q47 46 50 32" stroke="url(#tcg2)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M41 60 Q49 48 54 36" stroke="url(#tcg2)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M41 60 Q31 52 26 42" stroke="rgba(220,100,70,0.35)" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M41 60 Q51 52 55 42" stroke="rgba(220,100,70,0.35)" stroke-width="0.8" fill="none" stroke-linecap="round"/><circle cx="0" cy="33" r="1.5" fill="#f8c0a0" opacity="0.7"/><circle cx="13" cy="25" r="1.5" fill="#f8c0a0" opacity="0.7"/><circle cx="27" cy="9" r="1.8" fill="#f8c0a0" opacity="0.75"/><circle cx="14" cy="21" r="1.3" fill="#f8c0a0" opacity="0.6"/><circle cx="40" cy="21" r="1.3" fill="#f8c0a0" opacity="0.6"/><circle cx="40" cy="29" r="1.5" fill="#f0b090" opacity="0.65"/><circle cx="54" cy="35" r="1.5" fill="#f0b090" opacity="0.65"/></svg>',

        nudibranch: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 35"><defs><linearGradient id="ng1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f090c8"/><stop offset="50%" stop-color="#e868b0"/><stop offset="100%" stop-color="#d84898"/></linearGradient></defs><path d="M5 20 Q10 10 22 10 Q34 7 46 10 Q58 10 65 16 Q67 19 65 22 Q58 27 46 24 Q34 24 22 24 Q10 27 5 20" fill="url(#ng1)" stroke="rgba(200,50,120,0.6)" stroke-width="0.8"/><circle cx="25" cy="16" r="2" fill="rgba(255,255,255,0.15)"/><circle cx="40" cy="15" r="1.5" fill="rgba(255,255,255,0.12)"/><circle cx="52" cy="17" r="1.8" fill="rgba(255,255,255,0.1)"/><path d="M11 16 Q7 8 4 3" stroke="#f0b0d8" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M16 13 Q13 5 12 0" stroke="#f0b0d8" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="4" cy="2" r="2" fill="#ffc0e0" opacity="0.9"/><circle cx="12" cy="0" r="2" fill="#ffc0e0" opacity="0.9"/><path d="M24 12 Q22 5 20 1" stroke="#f068a8" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 11 Q31 4 30 0" stroke="#e868d0" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M40 11 Q40 4 41 0" stroke="#f068a8" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M48 12 Q49 5 51 1" stroke="#e868d0" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M55 14 Q57 8 58 3" stroke="#f068a8" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="0" r="2.2" fill="#f0e040" opacity="0.9"/><circle cx="30" cy="0" r="2.2" fill="#40d0f0" opacity="0.9"/><circle cx="41" cy="0" r="2.2" fill="#f0e040" opacity="0.9"/><circle cx="51" cy="0" r="2.2" fill="#40d0f0" opacity="0.9"/><circle cx="58" cy="2" r="2" fill="#f0e040" opacity="0.85"/><path d="M60 18 Q63 14 66 12" stroke="rgba(240,150,200,0.5)" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M60 18 Q64 17 67 16" stroke="rgba(240,150,200,0.4)" stroke-width="1" fill="none" stroke-linecap="round"/></svg>',

        cleanerShrimp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 40"><defs><linearGradient id="shg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#e84848"/><stop offset="100%" stop-color="#c03030"/></linearGradient></defs><path d="M10 20 Q14 12 24 12 Q34 12 42 17 Q45 20 42 23 Q34 28 24 26 Q14 28 10 20" fill="url(#shg1)" stroke="#901818" stroke-width="0.7"/><path d="M20 14 Q20 20 20 26" stroke="rgba(160,30,30,0.3)" stroke-width="0.5" fill="none"/><path d="M26 13 Q26 20 26 27" stroke="rgba(160,30,30,0.3)" stroke-width="0.5" fill="none"/><path d="M32 13 Q32 20 32 27" stroke="rgba(160,30,30,0.3)" stroke-width="0.5" fill="none"/><path d="M12 19 Q18 14 26 14 Q34 14 41 18" stroke="white" stroke-width="2.8" fill="none" opacity="0.85"/><path d="M12 17 Q6 10 2 2" stroke="white" stroke-width="1.5" fill="none" opacity="0.8" stroke-linecap="round"/><path d="M14 15 Q9 6 6 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.7" stroke-linecap="round"/><path d="M11 19 Q5 15 1 10" stroke="rgba(255,255,255,0.5)" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M19 26 Q17 30 15 34" stroke="#c83838" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M24 27 Q23 31 22 36" stroke="#c83838" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M29 27 Q30 31 30 36" stroke="#c83838" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M34 26 Q36 30 37 34" stroke="#c83838" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="15" cy="34.5" r="0.8" fill="rgba(255,255,255,0.4)"/><circle cx="22" cy="36.5" r="0.8" fill="rgba(255,255,255,0.4)"/><circle cx="30" cy="36.5" r="0.8" fill="rgba(255,255,255,0.4)"/><circle cx="37" cy="34.5" r="0.8" fill="rgba(255,255,255,0.4)"/><path d="M42 20 Q48 16 52 13 Q49 20 52 27 Q48 24 42 20" fill="rgba(224,80,70,0.7)" stroke="#901818" stroke-width="0.4"/><line x1="42" y1="20" x2="50" y2="15" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/><line x1="42" y1="20" x2="50" y2="25" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/><circle cx="13" cy="16" r="2.2" fill="#1a1020"/><circle cx="13.4" cy="15.5" r="0.8" fill="white" opacity="0.9"/><path d="M10 20 Q7 18 4 18" stroke="#c83838" stroke-width="1" fill="none" stroke-linecap="round"/></svg>',

        jellyfish: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90"><defs><radialGradient id="jg1" cx="50%" cy="35%" r="50%"><stop offset="0%" stop-color="#e8c4f0" stop-opacity="0.9"/><stop offset="60%" stop-color="#c490d6" stop-opacity="0.6"/><stop offset="100%" stop-color="#9b5fb0" stop-opacity="0.3"/></radialGradient></defs><ellipse cx="35" cy="30" rx="28" ry="26" fill="url(#jg1)" stroke="rgba(200,160,220,0.4)" stroke-width="0.8"/><ellipse cx="35" cy="28" rx="18" ry="16" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/><ellipse cx="35" cy="32" rx="12" ry="8" fill="rgba(200,140,230,0.2)"/><path d="M18 50 Q15 62 20 75 Q22 80 18 88" stroke="rgba(200,160,220,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M28 52 Q25 66 28 78 Q30 84 26 90" stroke="rgba(200,160,220,0.4)" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M42 52 Q45 66 42 78 Q40 84 44 90" stroke="rgba(200,160,220,0.4)" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M52 50 Q55 62 50 75 Q48 80 52 88" stroke="rgba(200,160,220,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M30 48 Q28 58 32 68 Q34 72 30 78" stroke="rgba(220,180,240,0.3)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M40 48 Q42 58 38 68 Q36 72 40 78" stroke="rgba(220,180,240,0.3)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M8 38 Q12 44 18 42 Q24 44 30 40 Q35 44 40 40 Q46 44 52 42 Q58 44 62 38" stroke="rgba(200,160,220,0.5)" stroke-width="1" fill="none"/></svg>',

        anemone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 80"><defs><radialGradient id="ag1" cx="50%" cy="80%" r="60%"><stop offset="0%" stop-color="#40c080"/><stop offset="100%" stop-color="#208050"/></radialGradient></defs><path d="M25 78 Q25 60 28 50 Q30 44 35 42 Q40 44 42 50 Q45 60 45 78" fill="url(#ag1)"/><path d="M35 42 Q32 20 24 8" stroke="#50e0a0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M35 42 Q30 18 20 14" stroke="#50e0a0" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M35 42 Q34 16 28 4" stroke="#60e8b0" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M35 42 Q36 16 42 4" stroke="#60e8b0" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M35 42 Q40 18 50 14" stroke="#50e0a0" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M35 42 Q38 20 46 8" stroke="#50e0a0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M35 42 Q26 22 16 20" stroke="#40d890" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M35 42 Q44 22 54 20" stroke="#40d890" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.6"/><circle cx="24" cy="7" r="2.5" fill="#80f0c0" opacity="0.7"/><circle cx="20" cy="13" r="2" fill="#80f0c0" opacity="0.6"/><circle cx="28" cy="3" r="2.5" fill="#80f0c0" opacity="0.7"/><circle cx="42" cy="3" r="2.5" fill="#80f0c0" opacity="0.7"/><circle cx="50" cy="13" r="2" fill="#80f0c0" opacity="0.6"/><circle cx="46" cy="7" r="2.5" fill="#80f0c0" opacity="0.7"/></svg>',

        coralCluster: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><ellipse cx="30" cy="95" rx="25" ry="18" fill="#6b4080"/><path d="M12 90 Q18 85 24 90 Q30 85 36 90 Q42 85 48 90" stroke="rgba(120,80,150,0.6)" stroke-width="1.5" fill="none"/><path d="M15 95 Q21 90 27 95 Q33 90 39 95 Q45 90 48 95" stroke="rgba(120,80,150,0.6)" stroke-width="1.5" fill="none"/><path d="M65 105 L65 70 Q65 60 58 50 M65 70 Q65 60 72 48 M65 80 Q60 72 52 68 M65 80 Q70 72 78 66" stroke="#d05050" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="58" cy="48" r="4" fill="#e07060"/><circle cx="72" cy="46" r="4" fill="#e07060"/><circle cx="52" cy="66" r="3.5" fill="#e07060"/><circle cx="78" cy="64" r="3.5" fill="#e07060"/><path d="M85 105 L85 75" stroke="#e0a040" stroke-width="2"/><ellipse cx="85" cy="62" rx="12" ry="16" fill="none" stroke="#e0a040" stroke-width="1"/><ellipse cx="85" cy="62" rx="8" ry="12" fill="none" stroke="rgba(224,160,64,0.5)" stroke-width="0.8"/><ellipse cx="85" cy="62" rx="4" ry="8" fill="none" stroke="rgba(224,160,64,0.3)" stroke-width="0.6"/></svg>',

        seahorse: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 70"><defs><linearGradient id="shsg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0a030"/><stop offset="50%" stop-color="#d4803a"/><stop offset="100%" stop-color="#b06028"/></linearGradient></defs><path d="M22 8 Q28 6 30 10 Q33 16 30 22 Q28 28 26 32 Q24 38 24 44 Q24 50 22 54 Q20 58 18 60 Q16 62 14 60 Q12 56 14 52 Q16 48 16 44" fill="url(#shsg1)" stroke="#a05520" stroke-width="0.8"/><path d="M22 8 Q18 4 14 6 Q10 8 12 12 Q14 16 18 14 Q20 12 22 12" fill="url(#shsg1)" stroke="#a05520" stroke-width="0.6"/><path d="M10 8 Q4 7 2 9" stroke="#c07030" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="15" cy="9" r="2.2" fill="#1a1a2e"/><circle cx="15.5" cy="8.5" r="0.8" fill="white"/><path d="M28 16 Q34 20 32 26 Q30 22 28 20" fill="rgba(240,180,80,0.6)" stroke="rgba(180,120,40,0.4)" stroke-width="0.4"/><path d="M20 24 L26 24 M19 28 L25 28 M19 32 L24 32 M19 36 L24 36 M20 40 L24 40 M20 44 L23 44 M19 48 L22 48" stroke="rgba(180,120,40,0.3)" stroke-width="0.6"/><path d="M14 60 Q10 64 12 68 Q16 70 18 66 Q20 62 16 60" fill="none" stroke="#b06028" stroke-width="1.8" stroke-linecap="round"/><path d="M20 6 Q22 2 24 4 Q26 2 25 6" fill="#d4903a" stroke="#a05520" stroke-width="0.4"/></svg>',

        lionfish: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 55"><ellipse cx="32" cy="28" rx="18" ry="12" fill="#c03030" stroke="#801818" stroke-width="0.5"/><path d="M18 22 Q25 20 32 22 Q39 20 46 22" stroke="white" stroke-width="1.5" fill="none" opacity="0.7"/><path d="M16 28 Q25 26 32 28 Q39 26 48 28" stroke="white" stroke-width="1.5" fill="none" opacity="0.6"/><path d="M18 34 Q25 32 32 34 Q39 32 46 34" stroke="white" stroke-width="1.5" fill="none" opacity="0.5"/><line x1="22" y1="18" x2="18" y2="2" stroke="#d04040" stroke-width="1" opacity="0.8"/><line x1="27" y1="17" x2="25" y2="0" stroke="#d04040" stroke-width="1" opacity="0.8"/><line x1="32" y1="16" x2="32" y2="0" stroke="#d04040" stroke-width="1" opacity="0.8"/><line x1="37" y1="17" x2="39" y2="0" stroke="#d04040" stroke-width="1" opacity="0.8"/><line x1="42" y1="18" x2="46" y2="2" stroke="#d04040" stroke-width="1" opacity="0.8"/><path d="M20 28 Q8 22 2 14 Q4 18 6 24 Q8 28 10 30 Q14 30 18 30" fill="rgba(200,60,50,0.5)" stroke="rgba(200,60,50,0.3)" stroke-width="0.5"/><line x1="20" y1="28" x2="4" y2="16" stroke="rgba(180,40,40,0.4)" stroke-width="0.5"/><line x1="20" y1="28" x2="6" y2="22" stroke="rgba(180,40,40,0.4)" stroke-width="0.5"/><circle cx="22" cy="25" r="3.5" fill="#1a1020"/><circle cx="22.5" cy="24.5" r="1.5" fill="#e0c040"/><circle cx="22.5" cy="24.5" r="0.6" fill="#1a1020"/><path d="M50 28 Q58 22 66 18 Q62 28 66 38 Q58 34 50 28" fill="rgba(200,60,50,0.6)" stroke="#801818" stroke-width="0.4"/><line x1="50" y1="28" x2="64" y2="20" stroke="white" stroke-width="0.6" opacity="0.3"/><line x1="50" y1="28" x2="64" y2="36" stroke="white" stroke-width="0.6" opacity="0.3"/></svg>'
    };

    // SVG viewBox dimensions (for anchor and scale calculations)
    var CREATURE_DIMS = {
        starfish: { w: 60, h: 60 },
        starfishGold: { w: 60, h: 60 },
        crab: { w: 70, h: 50 },
        seaUrchin: { w: 55, h: 55 },
        tubeWorms: { w: 55, h: 90 },
        nudibranch: { w: 70, h: 35 },
        cleanerShrimp: { w: 55, h: 40 },
        jellyfish: { w: 70, h: 90 },
        anemone: { w: 70, h: 80 },
        coralCluster: { w: 100, h: 120 },
        seahorse: { w: 45, h: 70 },
        lionfish: { w: 70, h: 55 }
    };

    var creatureTextures = {};
    (function () {
        for (var key in CREATURE_SVGS) {
            creatureTextures[key] = svgToTexture(CREATURE_SVGS[key], 2);
        }
    })();

    // =========================================================================
    // Container hierarchy (draw order)
    // =========================================================================

    var bgSprite = new PIXI.Sprite(createBgTexture());
    bgSprite.width = W;
    bgSprite.height = H;
    pixiApp.stage.addChild(bgSprite);

    // =========================================================================
    // Terrain height function — irregular sand dunes
    // =========================================================================
    function terrainHeight(x) {
        var nx = x / W;
        var h = 0;
        h += Math.sin(nx * Math.PI * 2.3 + 0.5) * 35;
        h += Math.sin(nx * Math.PI * 4.7 + 1.2) * 18;
        h += Math.sin(nx * Math.PI * 9.1 + 0.8) * 8;
        h += Math.sin(nx * Math.PI * 17.3 + 2.1) * 3;
        return h;
    }

    // Seafloor y-position for creatures at a given x
    function seafloorY(x) {
        return H - 15 - terrainHeight(x);
    }

    // Draw sand dune terrain into a texture (called once + on resize)
    var terrainGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(terrainGraphics);

    function drawTerrainFill() {
        terrainGraphics.clear();
        var baseY = H - 15;
        // Deep shadow layer
        terrainGraphics.beginFill(0x1c2823, 0.5);
        terrainGraphics.moveTo(0, H);
        for (var x = 0; x <= W; x += 3) {
            terrainGraphics.lineTo(x, baseY - terrainHeight(x) - 8);
        }
        terrainGraphics.lineTo(W, H);
        terrainGraphics.endFill();
        // Mid layer
        terrainGraphics.beginFill(0x2d3a30, 0.35);
        terrainGraphics.moveTo(0, H);
        for (var x = 0; x <= W; x += 3) {
            terrainGraphics.lineTo(x, baseY - terrainHeight(x) - 3);
        }
        terrainGraphics.lineTo(W, H);
        terrainGraphics.endFill();
        // Surface layer
        terrainGraphics.beginFill(0x324134, 0.45);
        terrainGraphics.moveTo(0, H);
        for (var x = 0; x <= W; x += 3) {
            terrainGraphics.lineTo(x, baseY - terrainHeight(x));
        }
        terrainGraphics.lineTo(W, H);
        terrainGraphics.endFill();
        // Top edge highlight
        terrainGraphics.lineStyle(1.5, 0x50644b, 0.3);
        terrainGraphics.moveTo(0, baseY - terrainHeight(0));
        for (var x = 3; x <= W; x += 3) {
            terrainGraphics.lineTo(x, baseY - terrainHeight(x));
        }
        terrainGraphics.lineStyle(0);
    }
    drawTerrainFill();

    var whaleGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(whaleGraphics);

    var godRayContainer = new PIXI.Container();
    godRayContainer.blendMode = PIXI.BLEND_MODES.ADD;
    var godRayGraphics = new PIXI.Graphics();
    godRayContainer.addChild(godRayGraphics);
    pixiApp.stage.addChild(godRayContainer);

    // --- Volumetric god rays: sharp core at reduced alpha + blurred RT for soft glow ---
    godRayContainer.alpha = 0.4;  // dim sharp core for definition
    var godRayRTWidth = Math.round(W / 2);
    var godRayRTHeight = Math.round(H / 2);
    var godRayRT = PIXI.RenderTexture.create({ width: godRayRTWidth, height: godRayRTHeight, resolution: 1 });
    var godRayBlurSprite = new PIXI.Sprite(godRayRT);
    godRayBlurSprite.width = W;
    godRayBlurSprite.height = H;
    godRayBlurSprite.blendMode = PIXI.BLEND_MODES.ADD;
    godRayBlurSprite.filters = [new PIXI.BlurFilter(12, 3)];
    godRayBlurSprite.alpha = 0.7;
    pixiApp.stage.addChild(godRayBlurSprite);

    var surfaceGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(surfaceGraphics);

    var causticContainer = new PIXI.Container();
    causticContainer.blendMode = PIXI.BLEND_MODES.ADD;
    pixiApp.stage.addChild(causticContainer);

    var marineSnowContainer = new PIXI.Container();
    pixiApp.stage.addChild(marineSnowContainer);

    var seaweedRopeContainer = new PIXI.Container();
    pixiApp.stage.addChild(seaweedRopeContainer);

    // --- Depth color grading: deep blue shift for seaweed ---
    var depthFilterSeaweed = new PIXI.ColorMatrixFilter();
    // Shift greens/reds toward blue, slight desaturation
    // Matrix: reduce R by 15%, reduce G by 10%, boost B by 10%, desaturate slightly
    depthFilterSeaweed.matrix = [
        0.75, 0.0,  0.05, 0, 0,
        0.0,  0.82, 0.08, 0, 0,
        0.05, 0.1,  1.1,  0, 0,
        0,    0,    0,    1, 0
    ];
    seaweedRopeContainer.filters = [depthFilterSeaweed];

    // --- Seafloor life containers (draw order: coral, starfish, anemones, crabs, bubble streams) ---
    function makeDepthFilter() {
        var f = new PIXI.ColorMatrixFilter();
        f.matrix = [
            0.75, 0.0,  0.05, 0, 0,
            0.0,  0.82, 0.08, 0, 0,
            0.05, 0.1,  1.1,  0, 0,
            0,    0,    0,    1, 0
        ];
        return f;
    }

    // SVG-sprite containers (replace per-frame Graphics with persistent Sprite children)
    var coralContainer = new PIXI.Container();
    pixiApp.stage.addChild(coralContainer);
    // coralContainer.filters = [makeDepthFilter()]; // removed: SVG sprites have ocean palette baked in
    var coralGraphics = coralContainer; // alias for tap-interaction particle puffs

    var starfishContainer = new PIXI.Container();
    pixiApp.stage.addChild(starfishContainer);
    // starfishContainer.filters = [makeDepthFilter()];
    var starfishGraphics = starfishContainer; // alias for biolum ring overlay

    var anemoneContainer = new PIXI.Container();
    pixiApp.stage.addChild(anemoneContainer);
    // anemoneContainer.filters = [makeDepthFilter()];
    // Overlay Graphics for clownfish drawn on top of anemone sprites
    var anemoneOverlayGfx = new PIXI.Graphics();
    anemoneContainer.addChild(anemoneOverlayGfx);
    var anemoneGraphics = anemoneOverlayGfx; // alias (clownfish reuse)

    var crabContainer = new PIXI.Container();
    pixiApp.stage.addChild(crabContainer);
    // crabContainer.filters = [makeDepthFilter()];
    var crabGraphics = crabContainer;

    // --- New seafloor decorations & creatures ---
    var rockGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(rockGraphics);
    // rockGraphics.filters = [makeDepthFilter()];

    var shellGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(shellGraphics);
    // shellGraphics.filters = [makeDepthFilter()];

    var seaGrassGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(seaGrassGraphics);
    // seaGrassGraphics.filters = [makeDepthFilter()];

    var spongeGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(spongeGraphics);
    // spongeGraphics.filters = [makeDepthFilter()];

    var seaUrchinContainer = new PIXI.Container();
    pixiApp.stage.addChild(seaUrchinContainer);
    // seaUrchinContainer.filters = [makeDepthFilter()];
    var seaUrchinGraphics = seaUrchinContainer;

    var tubeWormContainer = new PIXI.Container();
    pixiApp.stage.addChild(tubeWormContainer);
    // tubeWormContainer.filters = [makeDepthFilter()];
    var tubeWormGraphics = tubeWormContainer;

    var hermitCrabGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(hermitCrabGraphics);
    // hermitCrabGraphics.filters = [makeDepthFilter()];

    var seaCucumberGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(seaCucumberGraphics);
    // seaCucumberGraphics.filters = [makeDepthFilter()];

    var seahorseContainer = new PIXI.Container();
    pixiApp.stage.addChild(seahorseContainer);
    // seahorseContainer.filters = [makeDepthFilter()];
    var seahorseBabyGraphics = seahorseContainer;

    var cleanerShrimpContainer = new PIXI.Container();
    pixiApp.stage.addChild(cleanerShrimpContainer);
    // cleanerShrimpContainer.filters = [makeDepthFilter()];
    var cleanerShrimpGraphics = cleanerShrimpContainer;

    var nudibranchContainer = new PIXI.Container();
    pixiApp.stage.addChild(nudibranchContainer);
    // nudibranchContainer.filters = [makeDepthFilter()];
    var nudibranchGraphics = nudibranchContainer;

    var bubbleStreamContainer = new PIXI.Container();
    pixiApp.stage.addChild(bubbleStreamContainer);

    // --- Signature mid-water creatures ---
    var octopusGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(octopusGraphics);

    var morayEelGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(morayEelGraphics);
    // morayEelGraphics.filters = [makeDepthFilter()];

    var electricEelGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(electricEelGraphics);

    var lionfishContainer = new PIXI.Container();
    pixiApp.stage.addChild(lionfishContainer);
    var lionfishGraphics = lionfishContainer;

    var jellyfishContainer = new PIXI.Container();
    pixiApp.stage.addChild(jellyfishContainer);
    var jellyfishGraphics = jellyfishContainer;

    // --- Manta ray between jellyfish and fish ---
    var mantaGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(mantaGraphics);

    var pufferfishGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(pufferfishGraphics);

    var fishContainer = new PIXI.Container();
    pixiApp.stage.addChild(fishContainer);

    var wakeContainer = new PIXI.Container();
    pixiApp.stage.addChild(wakeContainer);

    var creatureContainer = new PIXI.Container();
    pixiApp.stage.addChild(creatureContainer);

    // --- Depth color grading: subtle blue shift for creatures in lower scene ---
    var depthFilterCreatures = new PIXI.ColorMatrixFilter();
    depthFilterCreatures.matrix = [
        0.8,  0.0,  0.05, 0, 0,
        0.0,  0.85, 0.05, 0, 0,
        0.05, 0.08, 1.08, 0, 0,
        0,    0,    0,    1, 0
    ];
    creatureContainer.filters = [depthFilterCreatures];

    // --- Plankton and debris above fish ---
    var planktonContainer = new PIXI.Container();
    pixiApp.stage.addChild(planktonContainer);

    var debrisContainer = new PIXI.Container();
    pixiApp.stage.addChild(debrisContainer);

    // --- Passing shadow layer ---
    var shadowGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(shadowGraphics);

    var decoBubbleContainer = new PIXI.Container();
    pixiApp.stage.addChild(decoBubbleContainer);

    var questionBubbleContainer = new PIXI.Container();
    pixiApp.stage.addChild(questionBubbleContainer);

    var userBubbleGraphics = new PIXI.Graphics();
    pixiApp.stage.addChild(userBubbleGraphics);

    var particleContainer = new PIXI.Container();
    pixiApp.stage.addChild(particleContainer);

    // --- Glow layer: groups all ADD-blend glow sources for bloom pass ---
    var glowLayer = new PIXI.Container();

    var shockwaveContainer = new PIXI.Container();
    shockwaveContainer.blendMode = PIXI.BLEND_MODES.ADD;
    var shockwaveGraphics = new PIXI.Graphics();
    shockwaveContainer.addChild(shockwaveGraphics);
    glowLayer.addChild(shockwaveContainer);

    var sonoFlashContainer = new PIXI.Container();
    sonoFlashContainer.blendMode = PIXI.BLEND_MODES.ADD;
    var sonoFlashGraphics = new PIXI.Graphics();
    sonoFlashContainer.addChild(sonoFlashGraphics);
    glowLayer.addChild(sonoFlashContainer);

    var bioContainer = new PIXI.Container();
    bioContainer.blendMode = PIXI.BLEND_MODES.ADD;
    glowLayer.addChild(bioContainer);

    var fingerTrailContainer = new PIXI.Container();
    fingerTrailContainer.blendMode = PIXI.BLEND_MODES.ADD;
    var fingerTrailGraphics = new PIXI.Graphics();
    fingerTrailContainer.addChild(fingerTrailGraphics);
    glowLayer.addChild(fingerTrailContainer);

    var cascadeContainer = new PIXI.Container();
    cascadeContainer.blendMode = PIXI.BLEND_MODES.ADD;
    var cascadeGraphics = new PIXI.Graphics();
    cascadeContainer.addChild(cascadeGraphics);
    glowLayer.addChild(cascadeContainer);

    var streakGlowSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    streakGlowSprite.blendMode = PIXI.BLEND_MODES.ADD;
    streakGlowSprite.visible = false;
    glowLayer.addChild(streakGlowSprite);

    pixiApp.stage.addChild(glowLayer);

    // --- Bloom: render glow layer to half-res RT, display as blurred ADD sprite ---
    var bloomRTWidth = Math.round(W / 2);
    var bloomRTHeight = Math.round(H / 2);
    var bloomRT = PIXI.RenderTexture.create({ width: bloomRTWidth, height: bloomRTHeight, resolution: 1 });
    var bloomSprite = new PIXI.Sprite(bloomRT);
    bloomSprite.width = W;
    bloomSprite.height = H;
    bloomSprite.blendMode = PIXI.BLEND_MODES.ADD;
    bloomSprite.filters = [new PIXI.BlurFilter(8, 3)];
    bloomSprite.alpha = 0.5;
    pixiApp.stage.addChild(bloomSprite);

    var creatureFlashText = new PIXI.Text('', {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        fontSize: Math.round(Math.min(W * 0.04, 28)),
        fill: 0x7fdbda,
        align: 'center',
        dropShadow: true,
        dropShadowColor: 0x7fdbda,
        dropShadowBlur: 8,
        dropShadowDistance: 0,
    });
    creatureFlashText.anchor.set(0.5, 0.5);
    creatureFlashText.position.set(W / 2, H * 0.12);
    creatureFlashText.visible = false;
    pixiApp.stage.addChild(creatureFlashText);

    var grainSprite = new PIXI.TilingSprite(grainTex, W, H);
    grainSprite.alpha = 0.025;
    pixiApp.stage.addChild(grainSprite);

    // Cinematic vignette (darkened edges)
    var vignetteCanvas = null;
    function createVignetteTex() {
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var vctx = c.getContext('2d');
        var grad = vctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,10,20,0.45)');
        vctx.fillStyle = grad;
        vctx.fillRect(0, 0, W, H);
        vignetteCanvas = c;
        return PIXI.Texture.from(c);
    }
    var vignetteSprite = new PIXI.Sprite(createVignetteTex());
    vignetteSprite.blendMode = PIXI.BLEND_MODES.NORMAL;
    vignetteSprite.alpha = 0.5;
    pixiApp.stage.addChild(vignetteSprite);

    // Procedural caustic shader
    var causticFragShader = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'uniform sampler2D uSampler;',
        'uniform float uTime;',
        'uniform vec2 uResolution;',
        '',
        'float caustic(vec2 uv) {',
        '    float s = 8.0;',
        '    vec2 p = mod(uv * s, 6.2832) - 3.1416;',
        '    float t = uTime * 0.4;',
        '    vec2 i = p;',
        '    float c = 1.0;',
        '    for (int n = 0; n < 3; n++) {',
        '        float t2 = t * (1.0 - (3.5 / float(n + 1)));',
        '        i = p + vec2(cos(t2 - i.x) + sin(t2 + i.y), sin(t2 - i.y) + cos(t2 + i.x));',
        '        c += 1.0 / length(vec2(p.x / (sin(i.x + t2) / 1.5), p.y / (cos(i.y + t2) / 1.5)));',
        '    }',
        '    c /= 3.0;',
        '    c = 1.17 - pow(c, 1.4);',
        '    return min(pow(abs(c), 8.0), 0.4);',
        '}',
        '',
        'void main() {',
        '    vec2 uv = vTextureCoord;',
        '    uv.x *= uResolution.x / uResolution.y;',
        '    float c = caustic(uv);',
        '    float depthFade = 1.0 - smoothstep(0.4, 0.8, vTextureCoord.y);',
        '    vec4 bg = texture2D(uSampler, vTextureCoord);',
        '    gl_FragColor = bg + vec4(vec3(c * 0.12 * depthFade), 0.0);',
        '}',
    ].join('\n');

    var causticFilter = new PIXI.Filter(null, causticFragShader, {
        uTime: 0.0,
        uResolution: [W, H],
    });
    bgSprite.filters = [causticFilter];
    causticContainer.visible = false;

    // Displacement filter for underwater waviness
    var dispSprite = new PIXI.Sprite(PIXI.Texture.from(dispCanvas));
    dispSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    dispSprite.visible = false;
    pixiApp.stage.addChild(dispSprite);
    // Displacement filter removed — rasterizes entire stage, makes SVG sprites grainy
    // var dispFilter = new PIXI.DisplacementFilter(dispSprite);
    // dispFilter.scale.set(3, 2);
    // pixiApp.stage.filters = [dispFilter];

    // =========================================================================
    // App state
    // =========================================================================

    var State = { SPLASH: 0, BUBBLES: 1, ANSWER: 2, SURVEY: 3 };
    var appState = State.SPLASH;
    var lastInteraction = Date.now();
    var animTime = 0;
    var streak = 0;

    // =========================================================================
    // Session logging
    // =========================================================================

    var allSessions = [];
    try {
        var stored = localStorage.getItem('bubblequiz-sessions');
        if (stored) allSessions = JSON.parse(stored);
    } catch (e) { /* ignore parse errors */ }

    function createSessionLog() {
        return {
            startTime: null,
            endTime: null,
            questions: [],
            learnMoreTaps: [],
            wave2Reached: false,
            idleResets: 0,
            survey: null
        };
    }

    var sessionLog = createSessionLog();
    var answerViewStart = null;
    var lastAnsweredQuestionId = null;
    var unlockedCreatures = {};
    var creatureFlashStr = '';
    var creatureFlashAlpha = 0;

    // =========================================================================
    // God rays
    // =========================================================================

    var godRays = [];
    for (var i = 0; i < GOD_RAY_COUNT; i++) {
        godRays.push({
            xFrac: 0.1 + i * 0.25 + Math.random() * 0.1,
            width: 60 + Math.random() * 80,
            opacity: 0.03 + Math.random() * 0.025,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.15 + Math.random() * 0.1,
            swayAmp: 15 + Math.random() * 15,
        });
    }

    function drawGodRays(time) {
        var g = godRayGraphics;
        g.clear();
        for (var i = 0; i < godRays.length; i++) {
            var ray = godRays[i];
            var rayX = ray.xFrac * W;
            var sway = Math.sin(time * ray.swaySpeed + ray.swayOffset) * ray.swayAmp;
            var topX = rayX + sway;
            var botX = rayX + sway * 0.5 + ray.width * 0.8;
            var hw = ray.width / 2;
            var shimmer = Math.max(0, Math.sin(time * 0.2 + i * 1.7)) > 0.95 ? 0.02 : 0;
            g.beginFill(0xfff8dc, ray.opacity + shimmer);
            g.moveTo(topX - hw * 0.3, 0);
            g.lineTo(topX + hw * 0.3, 0);
            g.lineTo(botX + hw, H);
            g.lineTo(botX - hw, H);
            g.closePath();
            g.endFill();
        }
    }

    // =========================================================================
    // God ray hit-test utility
    // =========================================================================

    function isInsideGodRay(px, py) {
        for (var i = 0; i < godRays.length; i++) {
            var ray = godRays[i];
            var rayX = ray.xFrac * W;
            var sway = Math.sin(animTime * ray.swaySpeed + ray.swayOffset) * ray.swayAmp;
            var topX = rayX + sway;
            var botX = rayX + sway * 0.5 + ray.width * 0.8;
            var hw = ray.width / 2;
            var t = py / H; // 0 at top, 1 at bottom
            var centerAtDepth = topX + (botX - topX) * t;
            var halfWidthAtDepth = hw * 0.3 + (hw - hw * 0.3) * t;
            if (Math.abs(px - centerAtDepth) < halfWidthAtDepth) return true;
        }
        return false;
    }

    // =========================================================================
    // Lighting helpers
    // =========================================================================

    function applyLighting(hexColor, lightFactor) {
        var r = (hexColor >> 16) & 0xff;
        var g2 = (hexColor >> 8) & 0xff;
        var b = hexColor & 0xff;
        // When lit: brighten + warm shift
        r = Math.min(255, Math.round(r + (255 - r) * lightFactor * 0.3));
        g2 = Math.min(255, Math.round(g2 + (255 - g2) * lightFactor * 0.2));
        // When unlit: slightly blue/desaturate
        var shadow = (1 - lightFactor) * 0.15;
        r = Math.round(r * (1 - shadow));
        b = Math.min(255, Math.round(b + shadow * 30));
        return (r << 16) | (g2 << 8) | b;
    }

    // =========================================================================
    // Water surface line
    // =========================================================================

    function drawSurface(time) {
        var g = surfaceGraphics;
        g.clear();
        // Main bright ripple line
        g.lineStyle(2.5, 0xc8f0ff, 0.25);
        g.moveTo(0, 6);
        for (var x = 4; x <= W; x += 4) {
            var y = 6 + Math.sin(x * 0.02 + time * 1.2) * 3
                      + Math.sin(x * 0.05 + time * 0.7) * 1.5
                      + Math.sin(x * 0.01 + time * 0.3) * 2;
            g.lineTo(x, y);
        }
        // Gradient glow bands below the line (Fresnel-like falloff)
        for (var band = 0; band < 4; band++) {
            var bandY = 10 + band * 5;
            var bandAlpha = 0.06 * (1 - band / 4);
            g.lineStyle(5, 0xc8f0ff, bandAlpha);
            g.moveTo(0, bandY);
            for (var x2 = 4; x2 <= W; x2 += 4) {
                var y2 = bandY + Math.sin(x2 * 0.02 + time * 1.2) * 2
                              + Math.sin(x2 * 0.05 + time * 0.7) * 1;
                g.lineTo(x2, y2);
            }
        }
    }

    // =========================================================================
    // Marine snow
    // =========================================================================

    var marineSnow = [];
    var marineSnowSprites = [];
    for (var i = 0; i < MARINE_SNOW_COUNT; i++) {
        marineSnow.push({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            size: 1 + Math.random() * 2,
            speed: 0.08 + Math.random() * 0.15,
            driftPhase: Math.random() * Math.PI * 2,
            driftFreq: 0.3 + Math.random() * 0.4,
            driftAmp: 0.2 + Math.random() * 0.4,
            alpha: 0.08 + Math.random() * 0.07,
            twinklePhase: Math.random() * Math.PI * 2,
        });
        var sp = new PIXI.Sprite(smallCircleTex);
        sp.anchor.set(0.5, 0.5);
        sp.scale.set(marineSnow[i].size / 4);
        marineSnowContainer.addChild(sp);
        marineSnowSprites.push(sp);
    }

    function updateMarineSnow(dt) {
        for (var i = 0; i < marineSnow.length; i++) {
            var s = marineSnow[i];
            s.y += s.speed * dt;
            s.x += Math.sin(animTime * s.driftFreq + s.driftPhase) * s.driftAmp * dt;
            if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
            if (s.x > W + 5) s.x = -5;
            if (s.x < -5) s.x = W + 5;
        }
    }

    function drawMarineSnow(time) {
        for (var i = 0; i < marineSnow.length; i++) {
            var s = marineSnow[i];
            var twinkle = 0.7 + 0.3 * Math.sin(time * 1.5 + s.twinklePhase);
            var inRay = isInsideGodRay(s.x, s.y);
            var rayBoost = inRay ? 3.0 : 1.0;
            var sp = marineSnowSprites[i];
            sp.position.set(s.x | 0, s.y | 0);
            sp.alpha = s.alpha * twinkle * rayBoost;
            sp.tint = inRay ? 0xffe8c8 : 0xffffff;
        }
    }

    // =========================================================================
    // Caustics
    // =========================================================================

    var caustics = [];
    var causticSprites = [];

    function initCaustics() {
        for (var i = causticContainer.children.length - 1; i >= 0; i--) {
            causticContainer.removeChildAt(i);
        }
        caustics = [];
        causticSprites = [];
        for (var i = 0; i < CAUSTIC_COUNT; i++) {
            var sprIdx = Math.floor(Math.random() * causticTextures.length);
            caustics.push({
                x: Math.random() * 2000,
                y: 0.5 + Math.random() * 0.5,
                sprite: sprIdx,
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
            var sp = new PIXI.Sprite(causticTextures[sprIdx]);
            sp.anchor.set(0.5, 0.5);
            causticContainer.addChild(sp);
            causticSprites.push(sp);
        }
    }
    initCaustics();

    function drawCaustics(time) {
        for (var i = 0; i < caustics.length; i++) {
            var c = caustics[i];
            var cx = (c.x / 2000) * W + Math.sin(time * c.driftXFreq + c.driftXPhase) * c.driftXAmp;
            var cy = c.y * H + Math.sin(time * c.driftYFreq + c.driftYPhase) * c.driftYAmp;
            var pulse = 0.8 + 0.2 * Math.sin(time * c.pulseFreq + c.pulsePhase);
            var sp = causticSprites[i];
            sp.position.set(cx, cy);
            sp.alpha = c.baseAlpha * pulse;
        }
    }

    // =========================================================================
    // Seaweed
    // =========================================================================

    var seaweeds = [];
    var seaweedUseRope = typeof PIXI.SimpleRope === 'function';

    function initSeaweed() {
        // Remove old rope children
        while (seaweedRopeContainer.children.length > 0) {
            seaweedRopeContainer.removeChildAt(0);
        }
        seaweeds = [];
        for (var i = 0; i < SEAWEED_COUNT; i++) {
            var sw = {
                xFrac: 0.05 + (i / (SEAWEED_COUNT - 1)) * 0.9 + (Math.random() - 0.5) * 0.08,
                baseHeight: 80 + Math.random() * 60,
                segments: SEAWEED_SEGMENTS,
                swayFreq: 0.4 + Math.random() * 0.3,
                swayFreq2: 0.17 + Math.random() * 0.1,
                swayAmp: 4 + Math.random() * 4,
                phase: Math.random() * Math.PI * 2,
                baseWidth: 5 + Math.random() * 2,
                colorR: 10 + Math.floor(Math.random() * 15),
                colorG: 40 + Math.floor(Math.random() * 20),
                colorB: 35 + Math.floor(Math.random() * 15),
                ropePoints: null,
                rope: null,
            };
            if (seaweedUseRope) {
                var ropePoints = [];
                for (var j = 0; j <= sw.segments; j++) {
                    ropePoints.push(new PIXI.Point(0, 0));
                }
                var rope = new PIXI.SimpleRope(seaweedRopeTex, ropePoints);
                rope.alpha = 0.8;
                seaweedRopeContainer.addChild(rope);
                sw.ropePoints = ropePoints;
                sw.rope = rope;
            }
            seaweeds.push(sw);
        }
        // If SimpleRope not available, add a fallback Graphics
        if (!seaweedUseRope) {
            var fallbackGfx = new PIXI.Graphics();
            seaweedRopeContainer.addChild(fallbackGfx);
        }
    }
    initSeaweed();

    function drawSeaweed(time) {
        if (seaweedUseRope) {
            for (var s = 0; s < seaweeds.length; s++) {
                var sw = seaweeds[s];
                var baseX = sw.xFrac * W;
                var baseY = seafloorY(baseX);
                var segLen = sw.baseHeight / sw.segments;
                var points = sw.ropePoints;
                points[0].x = baseX;
                points[0].y = baseY;
                for (var i = 1; i <= sw.segments; i++) {
                    var t = i / sw.segments;
                    var sway = Math.sin(time * sw.swayFreq + sw.phase + i * 0.4) * sw.swayAmp * t;
                    sway += Math.sin(time * sw.swayFreq2 + sw.phase * 1.7 + i * 0.3) * sw.swayAmp * 0.5 * t;
                    points[i].x = baseX + sway;
                    points[i].y = baseY - i * segLen;
                }
            }
        } else {
            // Fallback: Graphics-based seaweed with alpha tapering
            var g = seaweedRopeContainer.children[0];
            if (!g) return;
            g.clear();
            for (var s = 0; s < seaweeds.length; s++) {
                var sw = seaweeds[s];
                var baseX = sw.xFrac * W;
                var baseY = seafloorY(baseX);
                var segLen = sw.baseHeight / sw.segments;
                var col = ((sw.colorR & 0xff) << 16) | ((sw.colorG & 0xff) << 8) | (sw.colorB & 0xff);
                // Draw segments with tapering alpha
                var prevX = baseX, prevY = baseY;
                for (var i = 1; i <= sw.segments; i++) {
                    var t = i / sw.segments;
                    var sway = Math.sin(time * sw.swayFreq + sw.phase + i * 0.4) * sw.swayAmp * t;
                    sway += Math.sin(time * sw.swayFreq2 + sw.phase * 1.7 + i * 0.3) * sw.swayAmp * 0.5 * t;
                    var nx = baseX + sway;
                    var ny = baseY - i * segLen;
                    var segAlpha = 0.8 * (1 - t * 0.7);
                    var segWidth = sw.baseWidth * (1 - t * 0.6);
                    g.lineStyle(segWidth, col, segAlpha);
                    g.moveTo(prevX, prevY);
                    var mx = (prevX + nx) / 2;
                    var my = (prevY + ny) / 2;
                    g.quadraticCurveTo(prevX, prevY, mx, my);
                    prevX = nx; prevY = ny;
                }
            }
        }
    }

    // =========================================================================
    // Jellyfish
    // =========================================================================

    var jellyfish = {
        x: 0, y: 0,
        lissA: 0.15, lissB: 0.1,
        lissAmpX: 0, lissAmpY: 0,
        bellRadius: 35,
        tentacles: 5,
        opacity: 0.38,
        propCycle: 0,
        propVy: 0,
        propYOffset: 0,
        sprite: null,
    };

    function initJellyfish() {
        jellyfish.x = W * (0.3 + Math.random() * 0.4);
        jellyfish.y = H * (0.15 + Math.random() * 0.25);
        jellyfish.lissAmpX = W * 0.15;
        jellyfish.lissAmpY = H * 0.1;
        jellyfish.lissA = 0.03 + Math.random() * 0.02;
        jellyfish.lissB = 0.019 + Math.random() * 0.01;

        // Create SVG sprite (only once, then reuse)
        if (!jellyfish.sprite) {
            var sp = new PIXI.Sprite(creatureTextures.jellyfish);
            sp.anchor.set(0.5, 0.33);
            jellyfishContainer.addChild(sp);
            jellyfish.sprite = sp;
        }
    }
    initJellyfish();

    function drawJellyfish(time) {
        var jf = jellyfish;
        var sp = jf.sprite;
        if (!sp) return;

        var propPeriod = 3.5;
        jf.propCycle = (time % propPeriod) / propPeriod;
        var contractPhase = jf.propCycle;
        var contraction;
        if (contractPhase < 0.3) {
            contraction = Math.sin(contractPhase / 0.3 * Math.PI);
        } else {
            contraction = 0;
        }
        var impulse = contractPhase < 0.15 ? 0 : (contractPhase < 0.3 ? -1.2 * contraction : 0.3);
        jf.propVy = jf.propVy * 0.95 + impulse * 0.5;
        jf.propYOffset += jf.propVy * 0.016;
        if (Math.abs(jf.propYOffset) > 30) jf.propYOffset *= 0.98;

        var cx = jf.x + Math.sin(time * jf.lissA) * jf.lissAmpX;
        var cy = jf.y + Math.sin(time * jf.lissB) * jf.lissAmpY + jf.propYOffset;
        var bellSquash = 1 - contraction * 0.15;
        var bellStretch = 1 + contraction * 0.1;

        sp.position.set(cx, cy);
        sp.scale.set(bellStretch, bellSquash);
        sp.alpha = jf.opacity;
    }

    // =========================================================================
    // Rotated ellipse helper (avoids needing rotation containers)
    // =========================================================================

    function drawRotatedEllipse(g, cx, cy, rx, ry, angle, color, alpha) {
        g.beginFill(color, alpha);
        var cos = Math.cos(angle), sin = Math.sin(angle);
        var steps = 20;
        var step = Math.PI * 2 / steps;
        for (var i = 0; i <= steps; i++) {
            var a = i * step;
            var ex = Math.cos(a) * rx;
            var ey = Math.sin(a) * ry;
            var px = cx + ex * cos - ey * sin;
            var py = cy + ex * sin + ey * cos;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.endFill();
    }

    function drawRotatedEllipseStroke(g, cx, cy, rx, ry, angle, lineW, color, alpha) {
        g.lineStyle(lineW, color, alpha);
        var cos = Math.cos(angle), sin = Math.sin(angle);
        var steps = 20;
        var step = Math.PI * 2 / steps;
        for (var i = 0; i <= steps; i++) {
            var a = i * step;
            var ex = Math.cos(a) * rx;
            var ey = Math.sin(a) * ry;
            var px = cx + ex * cos - ey * sin;
            var py = cy + ex * sin + ey * cos;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
    }

    // =========================================================================
    // Bioluminescence burst
    // =========================================================================

    var bioParticles = [];
    for (var i = 0; i < BIOLUM_PARTICLE_COUNT; i++) {
        bioParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 });
    }
    var bioSprites = [];
    for (var i = 0; i < BIOLUM_PARTICLE_COUNT; i++) {
        var bs = new PIXI.Sprite(smallCircleTex);
        bs.anchor.set(0.5, 0.5);
        bs.visible = false;
        bioContainer.addChild(bs);
        bioSprites.push(bs);
    }

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
            spawned++;
        }
    }

    function updateBioParticles(dt) {
        var drag = Math.pow(0.96, dt);
        for (var i = 0; i < bioParticles.length; i++) {
            var p = bioParticles[i];
            if (!p.active) { bioSprites[i].visible = false; continue; }
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; bioSprites[i].visible = false; continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= drag;
            p.vy *= drag;
            var progress = p.life / p.maxLife;
            var alpha = (1 - progress) * 0.7;
            var sp = bioSprites[i];
            sp.visible = true;
            sp.position.set(p.x, p.y);
            sp.alpha = alpha;
            sp.scale.set(p.size * (1 - progress * 0.5) / 4);
        }
    }

    // =========================================================================
    // Creature unlocks
    // =========================================================================

    var CREATURE_DEFS = {
        speed: { name: 'Sea Turtle', emoji: '\u{1F422}' },
        temperature: { name: 'Glowing Jellyfish', emoji: '\u{1FAE7}' },
        destruction: { name: 'Hammerhead Shark', emoji: '\u{1F988}' },
        useful: { name: 'Seahorse', emoji: '\u{1F40E}' },
        where: { name: 'Fish School', emoji: '\u{1F41F}' },
        shrimp: { name: 'Pistol Shrimp', emoji: '\u{1F990}' },
    };

    // Pre-create Graphics per creature type
    var creatureGraphicsMap = {};
    var creatureTypeList = ['speed', 'temperature', 'destruction', 'useful', 'where', 'shrimp'];
    for (var _ci = 0; _ci < creatureTypeList.length; _ci++) {
        var cg = new PIXI.Graphics();
        cg.visible = false;
        creatureContainer.addChild(cg);
        creatureGraphicsMap[creatureTypeList[_ci]] = cg;
    }

    // Sea turtle
    function drawSeaTurtle(time, c, g) {
        g.clear();
        var period = 40;
        var phase = ((time - c.startTime) % period) / period;
        var tri = Math.abs(2 * phase - 1);
        var x = -60 + tri * (W + 120) + (c.nudgeX || 0);
        var y = H * 0.2 + Math.sin(time * 0.3 + 1.5) * 20 + (c.nudgeY || 0);
        var sz = 28;
        var dir = phase < 0.5 ? -1 : 1;

        var swimCycle = (time % 4.5) / 4.5;
        var isStroking = swimCycle < 0.55;
        var strokeIntensity = isStroking ? Math.sin(swimCycle / 0.55 * Math.PI) : 0;
        var glideTuck = isStroking ? 0 : Math.sin((swimCycle - 0.55) / 0.45 * Math.PI) * 0.5;
        var bodyTilt = strokeIntensity * Math.sin(time * 2.5) * 0.08;

        // Shell
        g.beginFill(0x5a8a4a);
        g.lineStyle(1.5, 0x3d6632);
        var cos = Math.cos(bodyTilt), sin = Math.sin(bodyTilt);
        // Transform shell path points
        function tx(px, py) { return x + (px * cos - py * sin) * dir; }
        function ty(px, py) { return y + px * sin + py * cos; }

        g.moveTo(tx(sz * 1.05, 0), ty(sz * 1.05, 0));
        g.quadraticCurveTo(tx(sz * 0.9, -sz * 0.6), ty(sz * 0.9, -sz * 0.6), tx(0, -sz * 0.55), ty(0, -sz * 0.55));
        g.quadraticCurveTo(tx(-sz * 0.7, -sz * 0.4), ty(-sz * 0.7, -sz * 0.4), tx(-sz * 0.75, 0), ty(-sz * 0.75, 0));
        g.quadraticCurveTo(tx(-sz * 0.7, sz * 0.4), ty(-sz * 0.7, sz * 0.4), tx(0, sz * 0.55), ty(0, sz * 0.55));
        g.quadraticCurveTo(tx(sz * 0.9, sz * 0.6), ty(sz * 0.9, sz * 0.6), tx(sz * 1.05, 0), ty(sz * 1.05, 0));
        g.closePath();
        g.endFill();

        // Head
        g.lineStyle(0);
        drawRotatedEllipse(g, tx(sz * 1.15, 0), ty(sz * 1.15, 0), sz * 0.32, sz * 0.25, bodyTilt, 0x7ab867, 0.7);
        g.beginFill(0x1a1a2e, 0.7);
        g.drawCircle(tx(sz * 1.3, -sz * 0.06), ty(sz * 1.3, -sz * 0.06), 2);
        g.endFill();

        // Flippers (simplified - front pair)
        var flipBase = isStroking ? Math.sin(time * 2.5) * 0.4 * strokeIntensity : -0.15 * glideTuck;
        var flipRot1 = bodyTilt + (-0.5 + flipBase) * dir;
        var fcx1 = x + (sz * 0.5) * dir * cos;
        var fcy1 = y + (sz * 0.5) * sin - sz * 0.45;
        drawRotatedEllipse(g, fcx1, fcy1, 18 - glideTuck * 4, 4.5, flipRot1 - 0.2, 0x7ab867, 0.7);

        var flipOpp = isStroking ? Math.sin(time * 2.5 + Math.PI) * 0.35 * strokeIntensity : -0.15 * glideTuck;
        var flipRot2 = bodyTilt + (0.5 - flipOpp) * dir;
        var fcx2 = x + (sz * 0.5) * dir * cos;
        var fcy2 = y + (sz * 0.5) * sin + sz * 0.45;
        drawRotatedEllipse(g, fcx2, fcy2, 18 - glideTuck * 4, 4.5, flipRot2 + 0.2, 0x7ab867, 0.7);

        // Rear flippers
        var rearFlipA = isStroking ? Math.sin(time * 2.5 + Math.PI) * 0.25 * strokeIntensity : -0.1 * glideTuck;
        drawRotatedEllipse(g, tx(-sz * 0.55, -sz * 0.3), ty(-sz * 0.55, -sz * 0.3), 10 - glideTuck * 2, 3.5, bodyTilt + (-0.3 + rearFlipA) * dir, 0x6aa85a, 0.7);
        var rearFlipB = isStroking ? Math.sin(time * 2.5) * 0.25 * strokeIntensity : -0.1 * glideTuck;
        drawRotatedEllipse(g, tx(-sz * 0.55, sz * 0.3), ty(-sz * 0.55, sz * 0.3), 10 - glideTuck * 2, 3.5, bodyTilt + (0.3 - rearFlipB) * dir, 0x6aa85a, 0.7);

        // Tail stub
        g.beginFill(0x6aa85a, 0.7);
        g.moveTo(tx(-sz * 0.7, 0), ty(-sz * 0.7, 0));
        g.lineTo(tx(-sz * 0.95, -sz * 0.08), ty(-sz * 0.95, -sz * 0.08));
        g.lineTo(tx(-sz * 0.95, sz * 0.08), ty(-sz * 0.95, sz * 0.08));
        g.closePath();
        g.endFill();
    }

    // Hammerhead
    var hammerSpine = [];
    for (var _hs = 0; _hs < 6; _hs++) hammerSpine.push({ x: 0, y: 0 });

    function drawHammerhead(time, c, g) {
        g.clear();
        var period = 60;
        var phase = ((time - c.startTime) % period) / period;
        var tri = Math.abs(2 * phase - 1);
        var ox = -60 + tri * (W + 120) + (c.nudgeX || 0);
        var oy = H * 0.35 + Math.sin(time * 0.2) * 30 + (c.nudgeY || 0);
        var sz = 40;
        var segs = 5;
        var waveFreq = 2.5;
        var waveAmp = sz * 0.08;
        var dir = phase < 0.5 ? -1 : 1;

        g.alpha = 0.32;

        // Build spine
        for (var i = 0; i <= segs; i++) {
            var t = i / segs;
            var spineX = sz * 1.2 - t * sz * 2.4;
            var lateral = Math.sin(time * waveFreq - t * Math.PI * 1.5) * waveAmp * t * t;
            hammerSpine[i].x = spineX * dir;
            hammerSpine[i].y = lateral;
        }

        // Body as bezier strip
        var bodyHalfWidths = [sz * 0.15, sz * 0.22, sz * 0.2, sz * 0.15, sz * 0.08, sz * 0.03];
        g.beginFill(0x1a2a3a);
        g.moveTo(ox + hammerSpine[0].x, oy + hammerSpine[0].y - bodyHalfWidths[0]);
        for (var i = 1; i <= segs; i++) {
            var prev = hammerSpine[i - 1];
            var cur = hammerSpine[i];
            var mx = (prev.x + cur.x) / 2;
            var myTop = (prev.y - bodyHalfWidths[i - 1] + cur.y - bodyHalfWidths[i]) / 2;
            g.quadraticCurveTo(ox + prev.x, oy + prev.y - bodyHalfWidths[i - 1], ox + mx, oy + myTop);
        }
        g.lineTo(ox + hammerSpine[segs].x, oy + hammerSpine[segs].y - bodyHalfWidths[segs]);
        for (var i = segs; i >= 1; i--) {
            var prev = hammerSpine[i];
            var cur = hammerSpine[i - 1];
            var mx = (prev.x + cur.x) / 2;
            var myBot = (prev.y + bodyHalfWidths[i] + cur.y + bodyHalfWidths[i - 1]) / 2;
            g.quadraticCurveTo(ox + prev.x, oy + prev.y + bodyHalfWidths[i], ox + mx, oy + myBot);
        }
        g.closePath();
        g.endFill();

        // Hammer head
        var hx = ox + hammerSpine[0].x;
        var hy = oy + hammerSpine[0].y;
        g.beginFill(0x1a2a3a);
        g.moveTo(hx, hy);
        g.lineTo(hx + sz * 0.2 * dir, hy - sz * 0.35);
        g.quadraticCurveTo(hx + sz * 0.3 * dir, hy - sz * 0.35, hx + sz * 0.3 * dir, hy - sz * 0.2);
        g.lineTo(hx + sz * 0.1 * dir, hy);
        g.lineTo(hx + sz * 0.3 * dir, hy + sz * 0.2);
        g.quadraticCurveTo(hx + sz * 0.3 * dir, hy + sz * 0.35, hx + sz * 0.2 * dir, hy + sz * 0.35);
        g.closePath();
        g.endFill();

        // Dorsal fin
        var dx = ox + hammerSpine[1].x;
        var dy = oy + hammerSpine[1].y;
        g.beginFill(0x1a2a3a);
        g.moveTo(dx + sz * 0.1 * dir, dy - bodyHalfWidths[1]);
        g.lineTo(dx, dy - sz * 0.55);
        g.lineTo(dx - sz * 0.15 * dir, dy - bodyHalfWidths[1]);
        g.endFill();

        // Tail fin
        var ttx = ox + hammerSpine[segs].x;
        var tty = oy + hammerSpine[segs].y;
        var tx1 = ox + hammerSpine[segs - 1].x;
        var ty1 = oy + hammerSpine[segs - 1].y;
        var tailAngle = Math.atan2(tty - ty1, ttx - tx1);
        var tcos = Math.cos(tailAngle), tsin = Math.sin(tailAngle);
        g.beginFill(0x1a2a3a);
        g.moveTo(ttx, tty);
        g.lineTo(ttx + (-sz * 0.35) * tcos - (-sz * 0.3) * tsin, tty + (-sz * 0.35) * tsin + (-sz * 0.3) * tcos);
        g.lineTo(ttx + (-sz * 0.2) * tcos, tty + (-sz * 0.2) * tsin);
        g.lineTo(ttx + (-sz * 0.35) * tcos - (sz * 0.25) * tsin, tty + (-sz * 0.35) * tsin + (sz * 0.25) * tcos);
        g.closePath();
        g.endFill();
    }

    // Seahorse
    function drawSeahorse(time, c, g) {
        g.clear();
        var entryProgress = Math.min((time - c.startTime) * 0.5, 1);
        var baseY = H * 0.72 - entryProgress * H * 0.12;
        var x = W * 0.12 + Math.sin(time * 0.2 + 2) * 8 + (c.nudgeX || 0);
        var y = baseY + Math.sin(time * 0.8) * 6 + (c.nudgeY || 0);
        var sz = 12;
        var bodySway = Math.sin(time * 0.6) * 0.06;
        var curlTight = 0.8 + 0.2 * Math.sin(time * 0.4);

        g.alpha = 0.7 * entryProgress;

        // Curled tail
        g.lineStyle(sz * 0.25, 0xe09350);
        g.moveTo(x + sz * 0.1, y + sz * 1.2);
        g.quadraticCurveTo(x + sz * 0.5 * curlTight, y + sz * 1.8, x + sz * 0.3 * curlTight, y + sz * 2.2);
        g.quadraticCurveTo(x - sz * 0.1 * curlTight, y + sz * 2.5 * curlTight, x - sz * 0.3 * curlTight, y + sz * 2.2);
        g.quadraticCurveTo(x - sz * 0.5 * curlTight, y + sz * 1.9, x - sz * 0.15, y + sz * 1.7);

        // Body trunk
        g.lineStyle(sz * 0.55, 0xf4a261);
        g.moveTo(x, y - sz * 0.8);
        g.quadraticCurveTo(x + sz * 0.6, y - sz * 0.2, x + sz * 0.45, y + sz * 0.5);
        g.quadraticCurveTo(x + sz * 0.25, y + sz * 1.0, x + sz * 0.1, y + sz * 1.2);

        // Body segments
        g.lineStyle(0.6, 0xc8823c, 0.4);
        for (var seg = 0; seg < 7; seg++) {
            var sy = y - sz * 0.5 + seg * sz * 0.3;
            var sw2 = sz * 0.35 - Math.abs(seg - 3) * sz * 0.03;
            g.moveTo(x - sw2, sy);
            g.lineTo(x + sw2 + sz * 0.15, sy);
        }

        // Head
        g.lineStyle(0);
        var hx = x;
        var hy = y - sz * 0.9;
        drawRotatedEllipse(g, hx, hy - sz * 0.3, sz * 0.28, sz * 0.35, -0.3, 0xf4a261, 1);
        // Crown
        g.beginFill(0xd08840);
        g.moveTo(hx - sz * 0.1, hy - sz * 0.6);
        g.lineTo(hx, hy - sz * 0.85);
        g.lineTo(hx + sz * 0.1, hy - sz * 0.6);
        g.endFill();
        // Snout
        g.lineStyle(sz * 0.15, 0xe09350);
        g.moveTo(hx + sz * 0.2, hy - sz * 0.25);
        g.lineTo(hx + sz * 0.75, hy - sz * 0.45);
        // Eye
        g.lineStyle(0);
        g.beginFill(0x1a1a2e);
        g.drawCircle(hx + sz * 0.05, hy - sz * 0.35, 1.8);
        g.endFill();

        // Dorsal fin
        var flutterBurst = 0.5 + 0.5 * Math.sin(time * 0.3);
        var flutterSpeed = 6 + flutterBurst * 6;
        var flutter = Math.sin(time * flutterSpeed) * (0.06 + flutterBurst * 0.04);
        drawRotatedEllipse(g, x - sz * 0.15, y + sz * 0.1, sz * 0.12, sz * 0.4, flutter, 0xf4a261, 0.45);
    }

    // Fish school
    var schoolFish = [];
    var SCHOOL_COUNT = 12;
    var SCHOOL_SEPARATION = 18;
    var SCHOOL_COHESION = 0.02;
    var SCHOOL_SEPARATION_FORCE = 1.5;
    var SCHOOL_WANDER_RATE = 0.3;

    function initSchoolFish() {
        schoolFish = [];
        for (var i = 0; i < SCHOOL_COUNT; i++) {
            schoolFish.push({
                ox: (Math.random() - 0.5) * 60,
                oy: (Math.random() - 0.5) * 40,
                vx: 0, vy: 0,
                wanderAngle: Math.random() * Math.PI * 2,
                phase: Math.random() * Math.PI * 2,
                size: 4 + Math.random() * 3,
            });
        }
    }
    initSchoolFish();

    function updateSchoolFish(dt) {
        var dtSec = dt / 60;
        var avgX = 0, avgY = 0;
        for (var i = 0; i < schoolFish.length; i++) {
            avgX += schoolFish[i].ox;
            avgY += schoolFish[i].oy;
        }
        avgX /= schoolFish.length;
        avgY /= schoolFish.length;
        for (var i = 0; i < schoolFish.length; i++) {
            var sf = schoolFish[i];
            var cohX = (avgX - sf.ox) * SCHOOL_COHESION;
            var cohY = (avgY - sf.oy) * SCHOOL_COHESION;
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
            sf.wanderAngle += (Math.random() - 0.5) * SCHOOL_WANDER_RATE * dtSec;
            var wandX = Math.cos(sf.wanderAngle) * 0.3;
            var wandY = Math.sin(sf.wanderAngle) * 0.3;
            sf.vx += (cohX + sepX + wandX) * dtSec;
            sf.vy += (cohY + sepY + wandY) * dtSec;
            sf.vx *= 0.95;
            sf.vy *= 0.95;
            sf.ox += sf.vx * dt;
            sf.oy += sf.vy * dt;
            if (Math.abs(sf.ox) > 80) sf.ox *= 0.98;
            if (Math.abs(sf.oy) > 50) sf.oy *= 0.98;
        }
    }

    function drawFishSchool(time, c, g) {
        g.clear();
        var progress = (time - c.startTime) * 0.03;
        var cx = W * 0.5 + Math.sin(progress * 0.7) * W * 0.25 + (c.nudgeX || 0);
        var cy = H * 0.45 + Math.sin(progress * 0.5) * H * 0.15 + (c.nudgeY || 0);
        var schoolHeading = Math.cos(progress * 0.7);

        g.alpha = 0.6;
        for (var i = 0; i < schoolFish.length; i++) {
            var sf = schoolFish[i];
            var fx = cx + sf.ox;
            var fy = cy + sf.oy;
            var localVx = sf.vx + schoolHeading * 0.5;
            var dir = localVx > 0 ? 1 : -1;

            // Tiny fish body
            g.beginFill(0xa8dadc);
            g.drawEllipse(fx, fy, sf.size * dir, sf.size * 0.45);
            g.endFill();
            // Tail
            var tailSwing = Math.sin(time * 5 + sf.phase) * sf.size * 0.3;
            g.beginFill(0x7ec8c8);
            g.moveTo(fx - sf.size * 0.8 * dir, fy);
            g.lineTo(fx - sf.size * 1.4 * dir, fy - sf.size * 0.3 + tailSwing);
            g.lineTo(fx - sf.size * 1.4 * dir, fy + sf.size * 0.3 + tailSwing);
            g.closePath();
            g.endFill();
            // Eye
            g.beginFill(0x1a1a2e);
            g.drawCircle(fx + sf.size * 0.4 * dir, fy - sf.size * 0.1, 1);
            g.endFill();
        }
    }

    // Pistol shrimp
    var shrimpScuttleX = 0;

    function drawPistolShrimp(time, c, g) {
        g.clear();
        var entryProgress = Math.min((time - c.startTime) * 0.8, 1);
        var sz = 12;
        var snapPeriod = 6;
        var snapCycle = (time % snapPeriod) / snapPeriod;
        var snapPhase = snapCycle * snapPeriod;
        var isSnapping = snapPhase > 5.4 && snapPhase < 5.7;
        var snapOpen = snapPhase > 5.0 && snapPhase <= 5.4;
        var justSnapped = snapPhase > 5.65 && snapPhase < 5.75;

        var scuttleCycle = (time % 8) / 8;
        var scuttleActive = scuttleCycle > 0.7 && scuttleCycle < 0.85;
        if (scuttleActive) shrimpScuttleX += Math.sin(time * 12) * 0.3;
        shrimpScuttleX *= 0.98;
        var nervousSway = Math.sin(time * 3.5) * 1.5 + Math.sin(time * 5.7) * 0.8;
        var x = W * 0.85 + nervousSway + shrimpScuttleX + (c.nudgeX || 0);
        var y = H - 20 - entryProgress * 10 + (c.nudgeY || 0);

        g.alpha = 0.75 * entryProgress;

        // Body
        g.beginFill(0xe07050);
        g.drawEllipse(x, y, sz * 1.5, sz * 0.5);
        g.endFill();
        g.beginFill(0xd06040);
        g.drawEllipse(x - sz * 0.8, y - sz * 0.1, sz * 0.5, sz * 0.4);
        g.endFill();

        // Big claw
        var clawAngle;
        if (snapOpen) clawAngle = -0.3 - (snapPhase - 5.0) / 0.4 * 0.5;
        else if (isSnapping) clawAngle = -0.8 + (snapPhase - 5.4) / 0.3 * 0.9;
        else clawAngle = -0.3 + Math.sin(time * 0.5) * 0.1;
        drawRotatedEllipse(g, x - sz * 1.3, y - sz * 0.3, sz * 0.9, sz * 0.35, clawAngle + 0.2, 0xc85030, 1);

        // Flash burst
        if (justSnapped) {
            var flashAlpha = 1 - (snapPhase - 5.65) / 0.1;
            for (var fp = 0; fp < 5; fp++) {
                var fAngle = fp * Math.PI * 2 / 5 + time * 3;
                var fDist = (snapPhase - 5.65) / 0.1 * sz * 1.2;
                g.beginFill(0xffe6b4, flashAlpha * 0.6);
                g.drawCircle(x - sz * 1.6 + Math.cos(fAngle) * fDist, y - sz * 0.3 + Math.sin(fAngle) * fDist, 2);
                g.endFill();
            }
        }

        // Small claw
        drawRotatedEllipse(g, x - sz * 1.2, y + sz * 0.2, sz * 0.4, sz * 0.2, 0.3, 0xd06040, 1);

        // Antennae
        var antTwitch1 = Math.sin(time * 7) * 2 + Math.sin(time * 11) * 1.5;
        var antTwitch2 = Math.sin(time * 8.5) * 2 + Math.sin(time * 13) * 1;
        g.lineStyle(0.8, 0xe07050, 0.6);
        g.moveTo(x - sz * 1.3, y - sz * 0.4);
        g.quadraticCurveTo(x - sz * 1.8, y - sz * 1.2 + antTwitch1, x - sz * 2.2, y - sz * 0.8 + antTwitch1);
        g.moveTo(x - sz * 1.3, y - sz * 0.3);
        g.quadraticCurveTo(x - sz * 2, y - sz * 1 - antTwitch2, x - sz * 2.4, y - sz * 0.6 - antTwitch2);

        // Eye
        g.lineStyle(0);
        g.beginFill(0x1a1a2e);
        g.drawCircle(x - sz * 1.1, y - sz * 0.25, 1.5);
        g.endFill();

        // Legs
        g.lineStyle(1, 0xd06040, 0.5);
        for (var i = 0; i < 3; i++) {
            var lx = x + sz * 0.4 - i * sz * 0.5;
            var legPhase = Math.sin(time * 5 + i * 1.8) * 2.5;
            g.moveTo(lx, y + sz * 0.4);
            g.lineTo(lx + legPhase, y + sz * 0.9);
        }
    }

    // Glowing jellyfish (temperature reward)
    var glowJellyProp = { vy: 0, yOff: 0 };

    function drawGlowingJellyfish(time, c, g) {
        g.clear();
        var entryProgress = Math.min((time - c.startTime) * 0.3, 1);
        var propPeriod = 3.0;
        var propCycle = (time % propPeriod) / propPeriod;
        var contraction;
        if (propCycle < 0.3) contraction = Math.sin(propCycle / 0.3 * Math.PI);
        else contraction = 0;
        var impulse = propCycle < 0.15 ? 0 : (propCycle < 0.3 ? -1.0 * contraction : 0.25);
        glowJellyProp.vy = glowJellyProp.vy * 0.95 + impulse * 0.5;
        glowJellyProp.yOff += glowJellyProp.vy * 0.016;
        if (Math.abs(glowJellyProp.yOff) > 25) glowJellyProp.yOff *= 0.98;
        var bellSquash = 1 - contraction * 0.2;
        var bellStretch = 1 + contraction * 0.12;
        var cx = W * 0.7 + Math.sin(time * 0.05) * W * 0.1 + (c.nudgeX || 0);
        var cy = H * 0.3 + Math.sin(time * 0.04) * H * 0.08 + glowJellyProp.yOff + (c.nudgeY || 0);
        var r = 25 * (0.85 + 0.15 * Math.sin(time * 2.5));

        g.alpha = 0.4 * entryProgress;

        // Halo (pre-rendered sprite would be better but use simple circle)
        var haloSize = r * 2.5;
        g.beginFill(0x64ffda, 0.08);
        g.drawCircle(cx, cy, haloSize);
        g.endFill();

        // Bell
        g.lineStyle(1, 0x96ffe6, 0.25);
        g.beginFill(0x64ffda, 0.3);
        var first = true;
        for (var a = 0; a <= Math.PI; a += 0.06) {
            var wobble = Math.sin(a * 4 + time * 2.5) * 1.5;
            var bx = cx + Math.cos(a) * (r * bellStretch + wobble);
            var by = cy - Math.sin(a) * (r * 0.65 * bellSquash + wobble * 0.5);
            if (first) { g.moveTo(bx, by); first = false; }
            else g.lineTo(bx, by);
        }
        g.closePath();
        g.endFill();

        // Subsurface scattering — green-tinted interior glow when backlit by god rays
        var glowJellyLit = isInsideGodRay(cx, cy);
        if (glowJellyLit) {
            // Green-tinted interior glow (bioluminescent)
            g.beginFill(0xc4ffd8, 0.15);
            g.drawEllipse(cx, cy - r * 0.15, r * bellStretch * 0.6, r * 0.4 * bellSquash);
            g.endFill();
            // Bright rim on top edge
            g.lineStyle(1.5, 0xffffff, 0.12);
            g.arc(cx, cy - r * 0.3, r * 0.5, -Math.PI * 0.8, -Math.PI * 0.2);
        }

        // Tentacles
        var trailBias = contraction * 5;
        for (var t = 0; t < 4; t++) {
            var tx = cx + (t / 3 - 0.5) * r * 1.4 * bellStretch;
            g.lineStyle(1.5, 0x64ffda, 0.2);
            g.moveTo(tx, cy + r * 0.1);
            for (var seg = 1; seg <= 4; seg++) {
                var st = seg / 4;
                var sway = Math.sin(time * 1.8 + t * 1.3 + seg * 0.7) * (8 * st) + trailBias * st;
                var cpx = tx + sway * 0.6 + Math.sin(time * 0.8 + t * 2 + seg) * 3;
                var cpy = cy + r * 0.1 + (st - 0.12) * 35;
                var ex = tx + sway;
                var ey = cy + r * 0.1 + st * 35;
                g.quadraticCurveTo(cpx, cpy, ex, ey);
            }
        }
    }

    var CREATURE_DRAW = {
        speed: drawSeaTurtle,
        temperature: drawGlowingJellyfish,
        destruction: drawHammerhead,
        useful: drawSeahorse,
        where: drawFishSchool,
        shrimp: drawPistolShrimp,
    };

    var discoveredCreatures = {};

    function unlockCreature(questionId) {
        if (discoveredCreatures[questionId]) return;
        var def = CREATURE_DEFS[questionId];
        if (!def) return;
        discoveredCreatures[questionId] = true;
        creatureFlashStr = def.emoji + ' ' + def.name + ' discovered!';
        creatureFlashText.text = creatureFlashStr;
        creatureFlashAlpha = 1;
    }

    var BUBBLE_AVOID_DIST = 120;
    var BUBBLE_AVOID_FORCE = 0.8;

    function getCreaturePos(id, time, c) {
        var period, phase, tri, progress;
        switch (id) {
            case 'speed':
                period = 40; phase = ((time - c.startTime) % period) / period; tri = Math.abs(2 * phase - 1);
                return { x: -60 + tri * (W + 120) + c.nudgeX, y: H * 0.2 + Math.sin(time * 0.3 + 1.5) * 20 + c.nudgeY };
            case 'destruction':
                period = 60; phase = ((time - c.startTime) % period) / period; tri = Math.abs(2 * phase - 1);
                return { x: -60 + tri * (W + 120) + c.nudgeX, y: H * 0.35 + Math.sin(time * 0.2) * 30 + c.nudgeY };
            case 'temperature':
                return { x: W * 0.7 + Math.sin(time * 0.05) * W * 0.1 + c.nudgeX, y: H * 0.3 + Math.sin(time * 0.04) * H * 0.08 + c.nudgeY };
            case 'useful':
                return { x: W * 0.12 + Math.sin(time * 0.2 + 2) * 8 + c.nudgeX, y: H * 0.72 + Math.sin(time * 0.8) * 6 + c.nudgeY };
            case 'where':
                progress = (time - c.startTime) * 0.03;
                return { x: W * 0.5 + Math.sin(progress * 0.7) * W * 0.25 + c.nudgeX, y: H * 0.45 + Math.sin(progress * 0.5) * H * 0.15 + c.nudgeY };
            case 'shrimp':
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
            c.nudgeX *= 0.96;
            c.nudgeY *= 0.96;
            if (Math.abs(c.nudgeX) > 40) c.nudgeX *= 0.9;
            if (Math.abs(c.nudgeY) > 40) c.nudgeY *= 0.9;
        }
    }

    function drawUnlockedCreatures(time) {
        // Hide all first
        for (var _ci = 0; _ci < creatureTypeList.length; _ci++) {
            creatureGraphicsMap[creatureTypeList[_ci]].visible = false;
        }
        for (var id in unlockedCreatures) {
            var drawFn = CREATURE_DRAW[id];
            var cg = creatureGraphicsMap[id];
            if (drawFn && cg) {
                cg.visible = true;
                drawFn(time, unlockedCreatures[id], cg);
                // Light-creature interaction: modulate alpha based on god ray
                var cpos = getCreaturePos(id, time, unlockedCreatures[id]);
                var cInRay = isInsideGodRay(cpos.x, cpos.y);
                var c = unlockedCreatures[id];
                if (c._lightFactor === undefined) c._lightFactor = 0;
                c._lightFactor += ((cInRay ? 1 : 0) - c._lightFactor) * 0.05;
                cg.alpha = cg.alpha * (0.9 + c._lightFactor * 0.1);
            }
        }
    }

    function updateCreatureFlashFn(dt) {
        if (creatureFlashAlpha <= 0) {
            creatureFlashText.visible = false;
            return;
        }
        creatureFlashAlpha -= 0.008 * dt;
        if (creatureFlashAlpha < 0) creatureFlashAlpha = 0;
        creatureFlashText.alpha = creatureFlashAlpha;
        creatureFlashText.visible = true;
    }

    // =========================================================================
    // Shockwave system
    // =========================================================================

    var SHOCKWAVE_MAX = 6;
    var shockwaves = [];
    for (var _sw = 0; _sw < SHOCKWAVE_MAX; _sw++) shockwaves.push({ active: false, x: 0, y: 0, radius: 0, maxRadius: 0, life: 0, maxLife: 0 });

    function spawnShockwave(cx, cy) {
        for (var i = 0; i < shockwaves.length; i++) {
            if (shockwaves[i].active) continue;
            var sw = shockwaves[i];
            sw.active = true;
            sw.x = cx; sw.y = cy;
            sw.radius = 0;
            sw.maxRadius = Math.max(W, H) * 0.5;
            sw.life = 0;
            sw.maxLife = 0.6;
            return;
        }
    }

    function updateShockwaves(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < shockwaves.length; i++) {
            var sw = shockwaves[i];
            if (!sw.active) continue;
            sw.life += dtSec;
            if (sw.life >= sw.maxLife) { sw.active = false; continue; }
            sw.radius = (sw.life / sw.maxLife) * sw.maxRadius;
        }
    }

    function drawShockwaves() {
        var g = shockwaveGraphics;
        g.clear();
        for (var i = 0; i < shockwaves.length; i++) {
            var sw = shockwaves[i];
            if (!sw.active) continue;
            var progress = sw.life / sw.maxLife;
            var alpha = (1 - progress) * 0.25;
            var ringWidth = (20 + progress * 30) * (1 - progress);
            g.lineStyle(ringWidth, 0xc8ebff, alpha);
            g.drawCircle(sw.x, sw.y, sw.radius);
            // Chromatic aberration
            g.lineStyle(2, 0xff6464, alpha * 0.4);
            g.drawCircle(sw.x, sw.y, sw.radius * 0.97);
            g.lineStyle(2, 0x6464ff, alpha * 0.4);
            g.drawCircle(sw.x, sw.y, sw.radius * 1.03);
        }
    }

    function getShockwaveDisplacement(ox, oy) {
        var dx = 0, dy = 0;
        for (var i = 0; i < shockwaves.length; i++) {
            var sw = shockwaves[i];
            if (!sw.active) continue;
            var distX = ox - sw.x;
            var distY = oy - sw.y;
            var dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < 1) continue;
            var ringDist = Math.abs(dist - sw.radius);
            var influence = 40;
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
        var g = sonoFlashGraphics;
        g.clear();
        var progress = sonoFlash.life / sonoFlash.maxLife;
        var flashRadius = 30 + progress * Math.max(W, H) * 0.3;
        var alpha = Math.pow(1 - progress, 3) * 0.6;
        // Concentric circles to approximate gradient
        g.beginFill(0xffffff, alpha * 0.8);
        g.drawCircle(sonoFlash.x, sonoFlash.y, flashRadius * 0.3);
        g.endFill();
        g.beginFill(0xc8f0ff, alpha * 0.4);
        g.drawCircle(sonoFlash.x, sonoFlash.y, flashRadius * 0.6);
        g.endFill();
        g.beginFill(0x7fdbda, alpha * 0.15);
        g.drawCircle(sonoFlash.x, sonoFlash.y, flashRadius);
        g.endFill();
    }

    // Screen shake
    var screenShake = { intensity: 0 };

    function triggerScreenShake(intensity) {
        screenShake.intensity = intensity;
    }

    function applyScreenShake(dt) {
        if (screenShake.intensity < 0.5) {
            screenShake.intensity = 0;
            pixiApp.stage.position.set(0, 0);
            return;
        }
        var shakeX = (Math.random() - 0.5) * screenShake.intensity;
        var shakeY = (Math.random() - 0.5) * screenShake.intensity;
        pixiApp.stage.position.set(shakeX, shakeY);
        screenShake.intensity *= Math.pow(0.88, dt);
    }

    // =========================================================================
    // Streak escalation
    // =========================================================================

    var streakGlowAlpha = 0;

    function applyStreakEffects(cx, cy) {
        if (streak >= 2) { spawnBurst(cx, cy, false); spawnShockwave(cx, cy); }
        if (streak >= 3) { streakGlowAlpha = 0.15; spawnSonoFlash(cx, cy); triggerScreenShake(8); }
        if (streak >= 4) { spawnBioluminescence(cx, cy); spawnBurst(cx, cy, true); triggerScreenShake(14); }
        if (streak >= 5) { whale.questionsAnswered = streak; triggerWhale(); }
        if (streak >= 6) { triggerCascade(cx, cy); }
    }

    function updateStreakGlow(dt) {
        if (streakGlowAlpha <= 0) { streakGlowSprite.visible = false; return; }
        streakGlowAlpha -= 0.002 * dt;
        if (streakGlowAlpha < 0) streakGlowAlpha = 0;
        ensureStreakGlowTex();
        streakGlowSprite.visible = true;
        streakGlowSprite.alpha = streakGlowAlpha;
    }

    // =========================================================================
    // Finger-trail bioluminescence
    // =========================================================================

    var TRAIL_MAX = 100;
    var TRAIL_LIFETIME = 2.5;
    var fingerTrail = [];
    for (var _ft = 0; _ft < TRAIL_MAX; _ft++) fingerTrail.push({ x: 0, y: 0, time: 0 });
    var trailHead = 0;
    var trailCount = 0;

    var trailParticles = [];
    var TRAIL_PARTICLE_MAX = 60;
    for (var i = 0; i < TRAIL_PARTICLE_MAX; i++) {
        trailParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 });
    }

    function addTrailPoint(x, y) {
        fingerTrail[trailHead].x = x;
        fingerTrail[trailHead].y = y;
        fingerTrail[trailHead].time = animTime;
        trailHead = (trailHead + 1) % TRAIL_MAX;
        if (trailCount < TRAIL_MAX) trailCount++;
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
        var g = fingerTrailGraphics;
        g.clear();
        if (trailCount < 2) return;
        var trailStart = (trailHead - trailCount + TRAIL_MAX) % TRAIL_MAX;
        for (var i = 0; i < trailCount; i++) {
            var pt = fingerTrail[(trailStart + i) % TRAIL_MAX];
            var age = time - pt.time;
            if (age > TRAIL_LIFETIME) continue;
            var alpha = (1 - age / TRAIL_LIFETIME) * 0.25;
            var radius = 3 + (1 - age / TRAIL_LIFETIME) * 3;
            g.beginFill(0x64ffda, alpha);
            g.drawCircle(pt.x, pt.y, radius);
            g.endFill();
            g.beginFill(0x1de9b6, alpha * 0.25);
            g.drawCircle(pt.x, pt.y, radius * 2);
            g.endFill();
        }
        for (var i = 0; i < trailParticles.length; i++) {
            var p = trailParticles[i];
            if (!p.active) continue;
            var progress = p.life / p.maxLife;
            var a = (1 - progress) * 0.5;
            g.beginFill(0xb4f8ff, a);
            g.drawCircle(p.x, p.y, p.size * (1 - progress * 0.4));
            g.endFill();
        }
        // Prune expired
        while (trailCount > 0) {
            var oldest = (trailHead - trailCount + TRAIL_MAX) % TRAIL_MAX;
            if (time - fingerTrail[oldest].time > TRAIL_LIFETIME) trailCount--;
            else break;
        }
    }

    // =========================================================================
    // Whale silhouette
    // =========================================================================

    var whale = {
        active: false, startTime: 0, duration: 10, y: 0,
        direction: 1, triggered: false, questionsAnswered: 0,
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
        var g = whaleGraphics;
        g.clear();
        if (!whale.active) return;
        var elapsed = time - whale.startTime;
        if (elapsed > whale.duration) { whale.active = false; return; }
        var progress = elapsed / whale.duration;
        var fadeAlpha = Math.min(progress * 5, 1) * Math.min((1 - progress) * 5, 1);
        var x = whale.direction > 0
            ? -300 + progress * (W + 600)
            : W + 300 - progress * (W + 600);
        var y = whale.y + Math.sin(time * 0.15) * 15;
        var scale = 4;
        var dir = whale.direction;

        g.alpha = 0.08 * fadeAlpha;

        // Body
        g.beginFill(0x0a1f30);
        g.drawEllipse(x, y, 60 * scale, 18 * scale);
        g.endFill();
        // Head
        g.beginFill(0x0a1f30);
        g.drawEllipse(x + 55 * scale * dir, y, 15 * scale, 14 * scale);
        g.endFill();
        // Tail
        var tailAngle = Math.sin(time * 0.8) * 0.15;
        var ttx = x - 60 * scale * dir;
        var tcos = Math.cos(tailAngle), tsin = Math.sin(tailAngle);
        g.beginFill(0x0a1f30);
        g.moveTo(ttx, y);
        g.lineTo(ttx + (-15 * tcos - (-20) * tsin) * scale * dir, y + (-15 * tsin + (-20) * tcos) * scale);
        g.quadraticCurveTo(ttx + (-22 * tcos - (-12) * tsin) * scale * dir, y + (-22 * tsin + (-12) * tcos) * scale, ttx + (-30 * tcos - (-18) * tsin) * scale * dir, y + (-30 * tsin + (-18) * tcos) * scale);
        g.lineTo(ttx, y);
        g.lineTo(ttx + (-15 * tcos - 20 * tsin) * scale * dir, y + (-15 * tsin + 20 * tcos) * scale);
        g.quadraticCurveTo(ttx + (-22 * tcos - 12 * tsin) * scale * dir, y + (-22 * tsin + 12 * tcos) * scale, ttx + (-30 * tcos - 18 * tsin) * scale * dir, y + (-30 * tsin + 18 * tcos) * scale);
        g.closePath();
        g.endFill();
        // Pectoral fin
        g.beginFill(0x0a1f30);
        g.drawEllipse(x + 15 * scale * dir, y + 15 * scale, 18 * scale, 5 * scale);
        g.endFill();

        // Nudge marine snow
        for (var i = 0; i < marineSnow.length; i++) {
            var s = marineSnow[i];
            var dy = Math.abs(s.y - whale.y);
            if (dy < 100) s.x += whale.direction * 0.3 * (1 - dy / 100) * fadeAlpha;
        }
    }

    // =========================================================================
    // User bubbles + nursery
    // =========================================================================

    var nursery = { active: false, x: 0, y: 0, startTime: 0, radius: 0 };
    var USER_BUBBLE_MAX = 8;
    var userBubbles = [];
    for (var _ub = 0; _ub < USER_BUBBLE_MAX; _ub++) userBubbles.push({ active: false, x: 0, y: 0, radius: 0, speed: 0, wobblePhase: 0, wobbleAmp: 0, wobbleFreq: 0 });

    function updateUserBubbles(dt) {
        for (var i = 0; i < userBubbles.length; i++) {
            var b = userBubbles[i];
            if (!b.active) continue;
            b.y -= b.speed * dt;
            b.x += Math.sin(animTime * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp * dt;
            if (b.y < -b.radius) {
                spawnBurst(b.x, 0, true);
                b.active = false;
            }
        }
    }

    function drawUserBubbles() {
        var g = userBubbleGraphics;
        g.clear();
        // Nursery growing bubble
        if (nursery.active) {
            var elapsed = animTime - nursery.startTime;
            nursery.radius = Math.min(5 + elapsed * 12, 40);
            g.beginFill(0xc8f0ff, 0.3);
            g.lineStyle(1, 0xc8e6ff, 0.3);
            g.drawCircle(nursery.x, nursery.y, nursery.radius);
            g.endFill();
        }
        // Released bubbles
        for (var i = 0; i < userBubbles.length; i++) {
            var b = userBubbles[i];
            if (!b.active) continue;
            g.lineStyle(1, 0xc8e6ff, 0.25);
            g.beginFill(0xc8f0ff, 0.25);
            g.drawCircle(b.x, b.y, b.radius);
            g.endFill();
        }
    }

    // =========================================================================
    // Cascade finale
    // =========================================================================

    var cascade = {
        active: false, startTime: 0, originX: 0, originY: 0,
        duration: 12, waveSpeed: 250,
    };
    var CASCADE_WAVE_MAX = 5;
    var cascadeWaves = [];
    for (var _cw = 0; _cw < CASCADE_WAVE_MAX; _cw++) cascadeWaves.push({ active: false, startTime: 0, radius: 0 });

    function triggerCascade(cx, cy) {
        cascade.active = true;
        cascade.startTime = animTime;
        cascade.originX = cx;
        cascade.originY = cy;
        for (var i = 0; i < cascadeWaves.length; i++) {
            cascadeWaves[i].active = true;
            cascadeWaves[i].startTime = animTime + i * 0.5;
            cascadeWaves[i].radius = 0;
        }
    }

    function updateCascade(time) {
        if (!cascade.active) return;
        var elapsed = time - cascade.startTime;
        if (elapsed > cascade.duration) {
            cascade.active = false;
            for (var j = 0; j < cascadeWaves.length; j++) cascadeWaves[j].active = false;
            return;
        }
        for (var i = 0; i < cascadeWaves.length; i++) {
            var w = cascadeWaves[i];
            if (!w.active) continue;
            if (time > w.startTime) w.radius = (time - w.startTime) * cascade.waveSpeed;
        }
        if (Math.random() < 0.3) {
            var angle = Math.random() * Math.PI * 2;
            var dist = Math.random() * Math.max(W, H) * 0.8;
            spawnBioluminescence(W / 2 + Math.cos(angle) * dist, H / 2 + Math.sin(angle) * dist);
        }
    }

    function drawCascade(time) {
        var g = cascadeGraphics;
        g.clear();
        if (!cascade.active) return;
        var elapsed = time - cascade.startTime;
        for (var i = 0; i < cascadeWaves.length; i++) {
            var w = cascadeWaves[i];
            if (!w.active || w.radius < 1) continue;
            var waveAge = time - w.startTime;
            var alpha = Math.max(0, 0.12 * (1 - waveAge / (cascade.duration * 0.8)));
            var lw = 30 * (1 - waveAge / cascade.duration);
            g.lineStyle(lw, 0x64ffda, alpha);
            g.drawCircle(cascade.originX, cascade.originY, w.radius);
        }
        var glowIntensity = elapsed < cascade.duration * 0.6
            ? Math.min(elapsed / 3, 0.15)
            : 0.15 * (1 - (elapsed - cascade.duration * 0.6) / (cascade.duration * 0.4));
        if (glowIntensity > 0.001) {
            g.beginFill(0x1de9b6, Math.max(0, glowIntensity));
            g.drawRect(0, 0, W, H);
            g.endFill();
        }
    }

    // =========================================================================
    // Idle warning
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

    var lastTapX = -1000, lastTapY = -1000;
    var FISH_SPINE_SEGS = 8;
    var fishSpine = [];
    for (var _fs = 0; _fs <= FISH_SPINE_SEGS; _fs++) fishSpine.push({ x: 0, y: 0 });
    var FISH_BODY_PROFILE = [0.12, 0.22, 0.30, 0.32, 0.28, 0.20, 0.12, 0.06, 0.02];

    var fishes = [];
    var fishGroups = [];

    function createFish(i) {
        var palette = FISH_PALETTES[i % FISH_PALETTES.length];
        var goingRight = Math.random() > 0.5;
        var size = 18 + Math.random() * 14;
        var depth = 0.3 + Math.random() * 0.7;
        var profileIdx = Math.floor(Math.random() * FISH_BODY_PROFILES.length);
        return {
            x: goingRight ? -size * 3 - Math.random() * W * 0.5 : W + size * 3 + Math.random() * W * 0.5,
            y: H * (0.15 + Math.random() * 0.7),
            size: size * depth,
            speed: (0.4 + Math.random() * 0.5) * depth,
            dir: goingRight ? 1 : -1,
            palette: palette,
            bodyProfile: FISH_BODY_PROFILES[profileIdx],
            wobbleOffset: Math.random() * Math.PI * 2,
            wobbleAmp: 10 + Math.random() * 15,
            wobbleFreq: 0.3 + Math.random() * 0.3,
            tailPhase: Math.random() * Math.PI * 2,
            opacity: 0.25 + depth * 0.55,
            startleVx: 0, startleVy: 0,
            breathPhase: Math.random() * Math.PI * 2,
            freezeTimer: 0,
            shimmerOffset: Math.random() * Math.PI * 2,
            pendingStartleVx: 0, pendingStartleVy: 0,
            nibbleTimer: 8 + Math.random() * 7,
            isNibbling: false,
            nibbleDuration: 0,
        };
    }

    for (var i = 0; i < FISH_COUNT; i++) {
        fishes.push(createFish(i));
        var fg = new PIXI.Container();
        var gfx = new PIXI.Graphics();
        fg.addChild(gfx);
        var shimSp = new PIXI.Sprite(fishShimmerTex);
        shimSp.anchor.set(0.5, 0.5);
        shimSp.blendMode = PIXI.BLEND_MODES.ADD;
        shimSp.visible = false;
        fg.addChild(shimSp);
        fishContainer.addChild(fg);
        fishGroups.push({ container: fg, gfx: gfx, shimmer: shimSp });
    }

    function resetFish(f, idx) {
        var depth = 0.3 + Math.random() * 0.7;
        var goingRight = Math.random() > 0.5;
        f.dir = goingRight ? 1 : -1;
        f.size = (18 + Math.random() * 14) * depth;
        f.x = goingRight ? -f.size * 3 - Math.random() * 200 : W + f.size * 3 + Math.random() * 200;
        f.y = H * (0.15 + Math.random() * 0.7);
        f.speed = (0.4 + Math.random() * 0.5) * depth;
        f.palette = FISH_PALETTES[idx % FISH_PALETTES.length];
        f.bodyProfile = FISH_BODY_PROFILES[Math.floor(Math.random() * FISH_BODY_PROFILES.length)];
        f.opacity = 0.25 + depth * 0.55;
        f.wobbleOffset = Math.random() * Math.PI * 2;
        f.startleVx = 0; f.startleVy = 0;
        f.breathPhase = Math.random() * Math.PI * 2;
        f.freezeTimer = 0;
        f.pendingStartleVx = 0; f.pendingStartleVy = 0;
        f.nibbleTimer = 8 + Math.random() * 7;
        f.isNibbling = false;
        f.nibbleDuration = 0;
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
                f.pendingStartleVx = Math.cos(angle) * force;
                f.pendingStartleVy = Math.sin(angle) * force;
                f.freezeTimer = 0.08;
            }
        }
    }

    function updateFish(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < fishes.length; i++) {
            var f = fishes[i];
            if (f.freezeTimer > 0) {
                f.freezeTimer -= dtSec;
                if (f.freezeTimer <= 0) {
                    f.freezeTimer = 0;
                    f.startleVx = f.pendingStartleVx;
                    f.startleVy = f.pendingStartleVy;
                    f.pendingStartleVx = 0;
                    f.pendingStartleVy = 0;
                }
            } else {
                f.x += (f.speed * f.dir + f.startleVx) * dt;
                f.y += f.startleVy * dt;
                f.startleVx *= Math.pow(0.93, dt);
                f.startleVy *= Math.pow(0.93, dt);
            }
            if (f.dir > 0 && f.x > W + f.size * 4) resetFish(f, i);
            if (f.dir < 0 && f.x < -f.size * 4) resetFish(f, i);
            if (f.y < f.size) f.y = f.size;
            if (f.y > H - f.size) f.y = H - f.size;

            // Nibble behavior
            if (f.isNibbling) {
                f.nibbleDuration -= dtSec;
                if (f.nibbleDuration <= 0) {
                    f.isNibbling = false;
                    f.nibbleTimer = 8 + Math.random() * 7;
                }
            } else {
                f.nibbleTimer -= dtSec;
                if (f.nibbleTimer <= 0) {
                    f.isNibbling = true;
                    f.nibbleDuration = 0.3;
                }
            }
        }
    }

    function drawFishPixi(fishIdx, f, time) {
        var fd = fishGroups[fishIdx];
        var group = fd.container;
        var g = fd.gfx;
        g.clear();

        var x = f.x;
        var y = f.y + Math.sin(time * f.wobbleFreq + f.wobbleOffset) * f.wobbleAmp;
        var s = f.size;
        var d = f.dir;
        var segs = FISH_SPINE_SEGS;

        // Light-creature interaction
        var inRay = isInsideGodRay(x, y);
        if (f.lightFactor === undefined) f.lightFactor = 0;
        f.lightFactor += ((inRay ? 1 : 0) - f.lightFactor) * 0.05;

        group.position.set(x, y);
        group.scale.set(d, 1);
        group.alpha = f.opacity * (0.9 + f.lightFactor * 0.1);

        var startleSpeed = Math.sqrt(f.startleVx * f.startleVx + f.startleVy * f.startleVy);
        var tailFreq = 4 + startleSpeed * 3;
        var waveAmp = s * 0.08 + startleSpeed * s * 0.04;
        var isFrozen = f.freezeTimer > 0;

        // Build spine (relative to 0,0)
        for (var i = 0; i <= segs; i++) {
            var t = i / segs;
            var spineX = s * 1.0 - t * s * 2.0;
            var amp = isFrozen ? waveAmp * 0.05 : waveAmp;
            var lateral = Math.sin(time * tailFreq - t * Math.PI * 1.5) * amp * t * t;
            fishSpine[i].x = spineX;
            fishSpine[i].y = lateral;
        }

        var bodyHalfWidths = [];
        var curProfile = f.bodyProfile || FISH_BODY_PROFILE;
        for (var i = 0; i <= segs; i++) bodyHalfWidths[i] = curProfile[i] * s;

        // Body bezier strip
        g.beginFill(applyLighting(hexToNum(f.palette.body), f.lightFactor));
        g.moveTo(fishSpine[0].x, fishSpine[0].y - bodyHalfWidths[0]);
        for (var i = 1; i <= segs; i++) {
            var prev = fishSpine[i - 1];
            var cur = fishSpine[i];
            var mx = (prev.x + cur.x) / 2;
            var myTop = (prev.y - bodyHalfWidths[i - 1] + cur.y - bodyHalfWidths[i]) / 2;
            g.quadraticCurveTo(prev.x, prev.y - bodyHalfWidths[i - 1], mx, myTop);
        }
        g.lineTo(fishSpine[segs].x, fishSpine[segs].y - bodyHalfWidths[segs]);
        for (var i = segs; i >= 1; i--) {
            var prev = fishSpine[i];
            var cur = fishSpine[i - 1];
            var mx = (prev.x + cur.x) / 2;
            var myBot = (prev.y + bodyHalfWidths[i] + cur.y + bodyHalfWidths[i - 1]) / 2;
            g.quadraticCurveTo(prev.x, prev.y + bodyHalfWidths[i], mx, myBot);
        }
        g.closePath();
        g.endFill();

        // Lateral line
        g.lineStyle(0.5, 0xffffff, 0.12);
        g.moveTo(fishSpine[1].x, fishSpine[1].y);
        for (var ll = 2; ll <= segs - 1; ll++) {
            g.lineTo(fishSpine[ll].x, fishSpine[ll].y);
        }

        // Stripes
        g.lineStyle(s * 0.04, hexToNum(f.palette.stripe), 0.25);
        for (var si = 2; si <= 5; si += 1.5) {
            var idx = Math.floor(si);
            var frac = si - idx;
            var sx = fishSpine[idx].x * (1 - frac) + fishSpine[idx + 1].x * frac;
            var sy = fishSpine[idx].y * (1 - frac) + fishSpine[idx + 1].y * frac;
            var hw = bodyHalfWidths[idx] * (1 - frac) + bodyHalfWidths[idx + 1] * frac;
            g.moveTo(sx, sy - hw * 0.85);
            g.lineTo(sx, sy + hw * 0.85);
        }

        // Species-specific patterns
        var profileIdx = FISH_BODY_PROFILES.indexOf(f.bodyProfile);
        if (profileIdx === 0) {
            // Spots
            g.lineStyle(0);
            for (var sp = 0; sp < 4; sp++) {
                var spIdx = 2 + sp;
                if (spIdx > segs) break;
                g.beginFill(hexToNum(f.palette.stripe), 0.2);
                g.drawCircle(fishSpine[spIdx].x, fishSpine[spIdx].y + bodyHalfWidths[spIdx] * 0.3, s * 0.04);
                g.endFill();
            }
        } else if (profileIdx === 1) {
            // Double horizontal stripe
            g.lineStyle(s * 0.03, hexToNum(f.palette.stripe), 0.15);
            g.moveTo(fishSpine[1].x, fishSpine[1].y - bodyHalfWidths[1] * 0.4);
            for (var ds = 2; ds <= 6; ds++) g.lineTo(fishSpine[ds].x, fishSpine[ds].y - bodyHalfWidths[ds] * 0.4);
            g.moveTo(fishSpine[1].x, fishSpine[1].y + bodyHalfWidths[1] * 0.4);
            for (var ds2 = 2; ds2 <= 6; ds2++) g.lineTo(fishSpine[ds2].x, fishSpine[ds2].y + bodyHalfWidths[ds2] * 0.4);
        } else if (profileIdx === 3) {
            // Gradient belly (lighter underside)
            g.lineStyle(0);
            g.beginFill(0xffffff, 0.08);
            g.moveTo(fishSpine[1].x, fishSpine[1].y);
            for (var gb = 2; gb <= 6; gb++) {
                g.lineTo(fishSpine[gb].x, fishSpine[gb].y + bodyHalfWidths[gb] * 0.5);
            }
            for (var gb2 = 6; gb2 >= 1; gb2--) {
                g.lineTo(fishSpine[gb2].x, fishSpine[gb2].y);
            }
            g.closePath();
            g.endFill();
        }

        // Dorsal fin
        g.lineStyle(0);
        var dsp = fishSpine[2];
        var dorsalH = s * 0.30 + Math.sin(time * tailFreq - 0.25 * Math.PI * 1.5) * s * 0.04;
        g.beginFill(applyLighting(hexToNum(f.palette.fin), f.lightFactor), 0.8);
        g.moveTo(fishSpine[1].x, fishSpine[1].y - bodyHalfWidths[1]);
        g.quadraticCurveTo(dsp.x + s * 0.1, dsp.y - bodyHalfWidths[2] - dorsalH, fishSpine[3].x, fishSpine[3].y - bodyHalfWidths[3]);
        g.endFill();

        // Anal fin
        var asp = fishSpine[5];
        g.beginFill(applyLighting(hexToNum(f.palette.fin), f.lightFactor), 0.7);
        g.moveTo(fishSpine[4].x, fishSpine[4].y + bodyHalfWidths[4]);
        g.quadraticCurveTo(asp.x, asp.y + bodyHalfWidths[5] + s * 0.15, fishSpine[6].x, fishSpine[6].y + bodyHalfWidths[6]);
        g.endFill();

        // Pectoral fin (manually rotated ellipse)
        var psp = fishSpine[2];
        var pectFlutter = Math.sin(time * 8 + f.tailPhase) * 0.15;
        var pectAngle = isFrozen ? 0.1 : (0.4 + Math.sin(time * 3 + f.tailPhase * 0.5) * 0.3 + pectFlutter);
        if (startleSpeed > 0.5) pectAngle *= Math.max(0.2, 1 - startleSpeed * 0.15);
        var pfCos = Math.cos(pectAngle), pfSin = Math.sin(pectAngle);
        drawRotatedEllipse(g, psp.x + pfSin * 0, psp.y + bodyHalfWidths[2] * 0.7, s * 0.22, s * 0.08, pectAngle + 0.2, applyLighting(hexToNum(f.palette.fin), f.lightFactor), 0.55);

        // Caudal tail
        var tailPt = fishSpine[segs];
        var tailPrev = fishSpine[segs - 1];
        var tailAngle = Math.atan2(tailPt.y - tailPrev.y, tailPt.x - tailPrev.x);
        var tailSpread = s * 0.28 + startleSpeed * s * 0.06;
        var tc = Math.cos(tailAngle), ts = Math.sin(tailAngle);
        g.beginFill(applyLighting(hexToNum(f.palette.fin), f.lightFactor), 0.85);
        g.moveTo(tailPt.x, tailPt.y);
        g.lineTo(tailPt.x + (-s * 0.35) * tc - (-tailSpread) * ts, tailPt.y + (-s * 0.35) * ts + (-tailSpread) * tc);
        g.quadraticCurveTo(
            tailPt.x + (-s * 0.20) * tc - (-tailSpread * 0.3) * ts,
            tailPt.y + (-s * 0.20) * ts + (-tailSpread * 0.3) * tc,
            tailPt.x + (-s * 0.10) * tc,
            tailPt.y + (-s * 0.10) * ts
        );
        g.quadraticCurveTo(
            tailPt.x + (-s * 0.20) * tc - (tailSpread * 0.3) * ts,
            tailPt.y + (-s * 0.20) * ts + (tailSpread * 0.3) * tc,
            tailPt.x + (-s * 0.35) * tc - (tailSpread) * ts,
            tailPt.y + (-s * 0.35) * ts + (tailSpread) * tc
        );
        g.closePath();
        g.endFill();

        // Eye
        var eyeSpine = fishSpine[1];
        var eyeX = eyeSpine.x + s * 0.05;
        var eyeY = eyeSpine.y - bodyHalfWidths[1] * 0.25;
        var eyeR = s * 0.10;
        g.beginFill(0xffffff);
        g.drawCircle(eyeX, eyeY, eyeR);
        g.endFill();
        // Pupil tracking
        var worldEyeX = x + (eyeX * d);
        var worldEyeY = y + eyeY;
        var toTapX = lastTapX - worldEyeX;
        var toTapY = lastTapY - worldEyeY;
        var toTapDist = Math.sqrt(toTapX * toTapX + toTapY * toTapY);
        var maxPupilOff = s * 0.04;
        var pupilOffX = 0, pupilOffY = 0;
        if (toTapDist > 1) {
            pupilOffX = (toTapX / toTapDist) * maxPupilOff * d;
            pupilOffY = (toTapY / toTapDist) * maxPupilOff;
        }
        var pupilR = isFrozen ? eyeR * 0.7 : eyeR * 0.5;
        g.beginFill(hexToNum(f.palette.eye));
        g.drawCircle(eyeX + pupilOffX, eyeY + pupilOffY, pupilR);
        g.endFill();

        // Mouth
        var nosePt = fishSpine[0];
        var mouthOpen = 0.3 + 0.7 * Math.max(0, Math.sin(time * 2 + f.breathPhase));
        if (isFrozen || startleSpeed > 1) mouthOpen = 1.0;
        if (f.isNibbling) mouthOpen = 1.5;
        var mouthW = s * 0.04 * mouthOpen;
        g.lineStyle(s * 0.02, hexToNum(f.palette.eye));
        g.arc(nosePt.x, nosePt.y, mouthW, -Math.PI * 0.4, Math.PI * 0.4);

        // Fish scale shimmer (uses existing fishShimmerTex)
        var shimmer = fd.shimmer;
        if (shimmer) {
            var shimmerCycle = ((time * 0.4 + f.shimmerOffset) % 3);
            if (shimmerCycle < 0.8 && f.lightFactor > 0.2) {
                shimmer.visible = true;
                var shimmerT = shimmerCycle / 0.8; // 0 to 1
                var shimmerAlpha = Math.sin(shimmerT * Math.PI) * 0.25 * f.lightFactor;
                shimmer.alpha = shimmerAlpha;
                var spIdx = Math.min(Math.floor(shimmerT * segs), segs);
                shimmer.position.set(fishSpine[spIdx].x, fishSpine[spIdx].y);
                shimmer.width = s * 1.5;
                shimmer.height = bodyHalfWidths[spIdx] * 2;
            } else {
                shimmer.visible = false;
            }
        }
    }

    // =========================================================================
    // Wake particles
    // =========================================================================

    var WAKE_POOL_SIZE = 30;
    var wakeParticles = [];
    var wakeSprites = [];
    for (var _wp = 0; _wp < WAKE_POOL_SIZE; _wp++) {
        wakeParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 });
        var ws = new PIXI.Sprite(smallCircleTex);
        ws.anchor.set(0.5, 0.5);
        ws.visible = false;
        wakeContainer.addChild(ws);
        wakeSprites.push(ws);
    }

    function spawnWakeParticle(tx, ty) {
        for (var i = 0; i < wakeParticles.length; i++) {
            var p = wakeParticles[i];
            if (p.active) continue;
            p.active = true;
            p.x = tx; p.y = ty;
            p.vx = (Math.random() - 0.5) * 0.3;
            p.vy = -0.2 - Math.random() * 0.3;
            p.life = 0;
            p.maxLife = 30 + Math.random() * 20;
            p.size = 1 + Math.random() * 2;
            return;
        }
    }

    function updateWakeParticles(dt) {
        for (var i = 0; i < wakeParticles.length; i++) {
            var p = wakeParticles[i];
            if (!p.active) { wakeSprites[i].visible = false; continue; }
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; wakeSprites[i].visible = false; continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            var progress = p.life / p.maxLife;
            var sp = wakeSprites[i];
            sp.visible = true;
            sp.position.set(p.x, p.y);
            sp.alpha = (1 - progress) * 0.15;
            sp.scale.set(p.size * (1 - progress * 0.5) / 4);
        }
    }

    // =========================================================================
    // Decorative bubbles
    // =========================================================================

    var decorativeBubbles = [];
    var decoBubbleSprites = [];

    function createDecorativeBubble(startAtBottom) {
        var roll = Math.random();
        var r;
        if (roll < 0.6) r = 8 + Math.random() * 6;
        else if (roll < 0.9) r = 14 + Math.random() * 6;
        else r = 20 + Math.random() * 5;
        return {
            x: Math.random() * W,
            y: startAtBottom ? H + r + Math.random() * H : Math.random() * H,
            r: r,
            speed: 0.6 + (r / 25) * 1.4,
            opacity: 0.15 + (r / 25) * 0.35,
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
        var dbsp = new PIXI.Sprite(decoBubbleTex);
        dbsp.anchor.set(0.5, 0.5);
        decoBubbleContainer.addChild(dbsp);
        decoBubbleSprites.push(dbsp);
    }

    function updateDecorativeBubbles(dt) {
        for (var i = 0; i < decorativeBubbles.length; i++) {
            var b = decorativeBubbles[i];
            b.y -= b.speed * dt;
            if (b.y < -b.r) resetDecorativeBubble(b);
        }
    }

    function drawDecorativeBubbles(time) {
        for (var i = 0; i < decorativeBubbles.length; i++) {
            var b = decorativeBubbles[i];
            var bx = b.x + Math.sin(time * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
            var by = b.y;
            var disp = getShockwaveDisplacement(bx, by);
            bx += disp.x;
            by += disp.y;
            var sp = decoBubbleSprites[i];
            sp.position.set(bx, by);
            sp.scale.set(b.r / 32);
            sp.alpha = b.opacity;
        }
    }

    // =========================================================================
    // Question bubble management
    // =========================================================================

    var questionBubbles = [];
    var questionCooldowns = {};
    var currentQuestionIds = [];
    var pendingRespawnIds = [];
    var respawnTimerIds = [];
    var answeredIds = {};
    var currentWave = 1;

    // Display objects for question bubbles
    var questionBubbleObjects = [];
    for (var i = 0; i < QUESTION_BUBBLE_COUNT; i++) {
        var qc = new PIXI.Container();
        var glowSp = new PIXI.Sprite(questionGlowTex);
        glowSp.anchor.set(0.5, 0.5);
        qc.addChild(glowSp);
        var bodySp = new PIXI.Sprite(questionBubbleTex);
        bodySp.anchor.set(0.5, 0.5);
        qc.addChild(bodySp);
        var txt = new PIXI.Text('', {
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            fontSize: 16,
            lineHeight: 17,
            leading: 0,
            fill: 0xffffff,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: 80,
            padding: 2,
        });
        txt.anchor.set(0.5, 0.5);
        qc.addChild(txt);
        qc.visible = false;
        questionBubbleContainer.addChild(qc);
        questionBubbleObjects.push({ container: qc, glow: glowSp, body: bodySp, text: txt });
    }

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

    function checkWaveTransition() {
        var wave1Qs = QUESTIONS.filter(function (q) { return !q.wave || q.wave === 1; });
        var allWave1Answered = wave1Qs.every(function (q) { return answeredIds[q.id]; });
        if (allWave1Answered && currentWave === 1) {
            currentWave = 2;
            sessionLog.wave2Reached = true;
        }
    }

    function getAvailableQuestions() {
        var now = Date.now();
        return QUESTIONS.filter(function (q) {
            var qWave = q.wave || 1;
            if (qWave !== currentWave) return false;
            if (currentQuestionIds.indexOf(q.id) !== -1) return false;
            if (questionCooldowns[q.id] && now < questionCooldowns[q.id]) return false;
            return true;
        });
    }

    function createQuestionBubble(question, x) {
        var r = 60 + Math.random() * 12;
        return {
            active: true,
            questionId: question.id,
            bubbleText: question.bubbleText,
            x: x,
            y: H + r + Math.random() * 200,
            r: r,
            speed: 0.5 + Math.random() * 0.3,
            wobbleOffset: Math.random() * Math.PI * 2,
            wobbleAmp: 0.2 + Math.random() * 0.3,
            wobbleFreq: 0.4 + Math.random() * 0.4,
            glowPhase: Math.random() * Math.PI * 2,
            popPhase: null,
            squeezeStart: 0,
            drawScale: 1,
        };
    }

    function respawnQuestionBubbleById(slotId) {
        var idx = -1;
        for (var i = 0; i < questionBubbles.length; i++) {
            if (questionBubbles[i].questionId === slotId && !questionBubbles[i].active) {
                idx = i;
                break;
            }
        }
        if (idx === -1) return;
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
        for (var i = 0; i < ids.length; i++) respawnQuestionBubbleById(ids[i]);
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

    function drawQuestionBubbles(time) {
        for (var i = 0; i < questionBubbleObjects.length; i++) {
            var qbo = questionBubbleObjects[i];
            if (i >= questionBubbles.length) { qbo.container.visible = false; continue; }
            var qb = questionBubbles[i];
            if (!qb.active && !qb.popPhase) { qbo.container.visible = false; continue; }
            qbo.container.visible = true;
            var bx = qb.x + Math.sin(time * qb.wobbleFreq + qb.wobbleOffset) * qb.wobbleAmp;
            var by = qb.y;
            var breathe = 2 * Math.sin(time * 0.33 + qb.glowPhase);
            var r = qb.r + breathe;
            if (qb.popPhase === 'squeeze') {
                var elapsed = performance.now() - qb.squeezeStart;
                qb.drawScale = 1 - 0.3 * Math.min(elapsed / 80, 1);
            }
            r *= qb.drawScale;
            qbo.container.position.set(bx, by);
            // Glow
            var glowAlpha = 0.3 + Math.sin(time * 2 + qb.glowPhase) * 0.15;
            qbo.glow.alpha = glowAlpha;
            qbo.glow.scale.set(r * 2.5 / QB_GLOW_SIZE);
            // Body
            qbo.body.scale.set(r * 2 / QB_SPRITE_SIZE);
            // Text — only re-layout when content or radius changes
            if (qbo._cachedText !== qb.bubbleText || qbo._cachedR !== qb.r) {
                qbo._cachedText = qb.bubbleText;
                qbo._cachedR = qb.r;
                var baseR = qb.r;
                // Inscribed square width in a circle = r * sqrt(2) ≈ r * 1.41
                // Use tighter width to keep text well inside the curved edges
                var wrapWidth = baseR * 1.15;
                var fontSize = Math.max(12, Math.min(baseR * 0.28, 20));
                qbo.text.style.fontSize = fontSize;
                qbo.text.style.lineHeight = Math.round(fontSize * 1.05);
                qbo.text.style.wordWrapWidth = wrapWidth;
                qbo.text.text = qb.bubbleText;
                // If text block is taller than bubble interior, scale it down
                var maxH = baseR * 1.3;
                if (qbo.text.height > maxH) {
                    var s = maxH / qbo.text.height;
                    qbo.text.scale.set(s);
                } else {
                    qbo.text.scale.set(1);
                }
            }
        }
    }

    // =========================================================================
    // Particle pool (burst + rings)
    // =========================================================================

    var particles = [];
    var particleSprites = [];
    var particleRingGraphics = new PIXI.Graphics();
    particleContainer.addChild(particleRingGraphics);

    for (var i = 0; i < MAX_PARTICLES; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, opacity: 0, life: 0, maxLife: 0, isRing: false, ringR: 0, teal: false });
        var psp = new PIXI.Sprite(smallCircleTex);
        psp.anchor.set(0.5, 0.5);
        psp.visible = false;
        particleContainer.addChild(psp);
        particleSprites.push(psp);
    }

    function spawnBurst(cx, cy, mini) {
        var count = mini ? MINI_BURST_COUNT : BURST_PARTICLE_COUNT;
        var ringCount = mini ? 1 : BURST_RING_COUNT;
        var spawned = 0;
        for (var i = 0; i < particles.length && spawned < count + ringCount; i++) {
            if (particles[i].active) continue;
            var p = particles[i];
            p.active = true;
            p.x = cx; p.y = cy;
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
                p.vx = 0; p.vy = 0; p.r = 0;
                p.ringR = 0;
                p.maxLife = (mini ? 20 : RING_LIFE_DT) + Math.random() * 12;
                p.isRing = true;
                p.opacity = mini ? 0.3 : 0.6;
            }
            spawned++;
        }
    }

    function spawnRipple(cx, cy) {
        for (var i = 0; i < particles.length; i++) {
            if (particles[i].active) continue;
            var p = particles[i];
            p.active = true;
            p.x = cx; p.y = cy;
            p.vx = 0; p.vy = 0; p.r = 0;
            p.ringR = 0; p.life = 0;
            p.maxLife = 25; p.isRing = true;
            p.opacity = 0.25; p.teal = false;
            return;
        }
    }

    function updateParticles(dt) {
        var drag = Math.pow(0.97, dt);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (!p.active) { particleSprites[i].visible = false; continue; }
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; particleSprites[i].visible = false; continue; }
            if (p.isRing) {
                p.ringR += 3 * dt;
                particleSprites[i].visible = false; // rings drawn via Graphics
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= drag;
                p.vy *= drag;
                var progress = p.life / p.maxLife;
                var alpha = (1 - progress) * p.opacity;
                var sp = particleSprites[i];
                sp.visible = alpha > 0.01;
                sp.position.set(p.x, p.y);
                sp.alpha = alpha;
                sp.scale.set(p.r * (1 - progress * 0.5) / 4);
                sp.tint = p.teal ? 0x7fdbda : 0xc8ebff;
            }
        }
    }

    function drawParticleRings() {
        var g = particleRingGraphics;
        g.clear();
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (!p.active || !p.isRing) continue;
            var progress = p.life / p.maxLife;
            var alpha = (1 - progress) * p.opacity;
            if (alpha < 0.01) continue;
            g.lineStyle(2 * (1 - progress), 0x7fdbda, alpha);
            g.drawCircle(p.x, p.y, p.ringR);
        }
    }

    // =========================================================================
    // Audio manager (unchanged from Canvas 2D)
    // =========================================================================

    var audioManager = {
        ctx: null,
        noiseBuffer: null,
        muted: true,
        masterFilter: null,
        masterOut: null,

        init: function () {
            if (this.ctx) return;
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            try {
                this.ctx = new AC();
                if (this.ctx.state === 'suspended') this.ctx.resume();
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
            } catch (e) { this.ctx = null; }
        },

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
            osc1.type = 'triangle'; osc1.frequency.value = 50;
            osc1.connect(this.droneGain); osc1.start();
            var osc2 = actx.createOscillator();
            osc2.type = 'triangle'; osc2.frequency.value = 55;
            osc2.connect(this.droneGain); osc2.start();
            this.droneGain.gain.setValueAtTime(0, actx.currentTime);
            this.droneGain.gain.linearRampToValueAtTime(0.06, actx.currentTime + 2);
        },

        setDroneVolume: function (vol) {
            if (!this.droneGain || !this.ctx) return;
            this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, this.ctx.currentTime);
            this.droneGain.gain.linearRampToValueAtTime(this.muted ? 0 : vol, this.ctx.currentTime + 0.3);
        },

        playChime: function () {
            if (this.muted || !this.ctx) return;
            var actx = this.ctx;
            var dest = this.masterOut;
            var now = actx.currentTime;
            var notes = [523.25, 659.25, 783.99];
            for (var i = 0; i < notes.length; i++) {
                var osc = actx.createOscillator();
                osc.type = 'sine'; osc.frequency.value = notes[i];
                var g = actx.createGain();
                var onset = now + i * 0.12;
                g.gain.setValueAtTime(0, onset);
                g.gain.linearRampToValueAtTime(0.15, onset + 0.04);
                g.gain.exponentialRampToValueAtTime(0.001, onset + 0.4);
                osc.connect(g); g.connect(dest);
                osc.start(onset); osc.stop(onset + 0.45);
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
            bandpass.type = 'bandpass'; bandpass.frequency.value = freq; bandpass.Q.value = 1.5;
            var noiseGain = actx.createGain();
            noiseGain.gain.setValueAtTime(vol, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            noise.connect(bandpass); bandpass.connect(noiseGain); noiseGain.connect(dest);
            noise.start(now); noise.stop(now + 0.06);
            var osc = actx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(mini ? 900 : 600, now);
            osc.frequency.exponentialRampToValueAtTime(mini ? 400 : 150, now + 0.08);
            var oscGain = actx.createGain();
            oscGain.gain.setValueAtTime(vol * 0.5, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(oscGain); oscGain.connect(dest);
            osc.start(now); osc.stop(now + 0.08);
        }
    };

    var muteBtn = document.getElementById('mute-btn');
    var muteIcon = document.getElementById('mute-icon');
    muteBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        lastInteraction = Date.now();
        audioManager.muted = !audioManager.muted;
        muteIcon.textContent = audioManager.muted ? '\u{1F507}' : '\u{1F50A}';
        audioManager.setDroneVolume(audioManager.muted ? 0 : 0.06);
    });

    // =========================================================================
    // Answer overlay (unchanged from Canvas 2D)
    // =========================================================================

    var overlayEl = document.getElementById('answer-overlay');
    var contentEl = document.getElementById('answer-content');
    var dismissBtn = document.getElementById('dismiss-btn');
    var answerAnimTimerIds = [];
    var squeezeTimerIds = [];
    var lastPopX = 0.5;
    var lastPopY = 0.5;

    function showAnswer(questionId) {
        var question = null;
        for (var i = 0; i < QUESTIONS.length; i++) {
            if (QUESTIONS[i].id === questionId) { question = QUESTIONS[i]; break; }
        }
        if (!question) return;
        appState = State.ANSWER;
        lastInteraction = Date.now();
        answerViewStart = Date.now();
        lastAnsweredQuestionId = questionId;
        sessionLog.questions.push({
            id: questionId,
            tappedAt: Date.now(),
            answeredDuration: null,
            wave: question.wave || 1
        });
        contentEl.innerHTML = '';
        switch (question.answerType) {
            case 'bar-chart': renderBarChart(question.answer); break;
            case 'big-reveal': renderBigReveal(question.answer, questionId); break;
            case 'icon-grid': renderIconGrid(question.answer); break;
        }
        renderLearnMore(question.answer.learnMore);
        audioManager.playChime();
        if (questionId === 'temperature' || questionId === 'speed' || questionId === 'shrimp') {
            spawnBioluminescence(lastPopX * W, lastPopY * H);
        }
        overlayEl.style.setProperty('--pop-x', (lastPopX * 100).toFixed(1) + '%');
        overlayEl.style.setProperty('--pop-y', (lastPopY * 100).toFixed(1) + '%');
        overlayEl.classList.remove('hidden');
    }

    function renderBarChart(data) {
        var maxVal = 0;
        for (var i = 0; i < data.bars.length; i++) { if (data.bars[i].value > maxVal) maxVal = data.bars[i].value; }
        var html = '<div class="bar-chart-title">' + escapeHTML(data.title) + '</div>';
        for (var i = 0; i < data.bars.length; i++) {
            var bar = data.bars[i];
            var pct = (bar.value / maxVal * 100).toFixed(1);
            html += '<div class="bar-row"><span class="bar-icon">' + bar.icon + '</span><span class="bar-label">' + escapeHTML(bar.label) + '</span><div class="bar-track"><div class="bar-fill" style="background:' + bar.color + ';" data-width="' + pct + '%"><span class="bar-value">' + escapeHTML(bar.display) + '</span></div></div></div>';
        }
        html += '<div class="bar-fun-fact">' + escapeHTML(data.funFact) + '</div>';
        contentEl.innerHTML = html;
        var fills = contentEl.querySelectorAll('.bar-fill');
        for (var i = 0; i < fills.length; i++) {
            (function (fill, delay) { answerAnimTimerIds.push(setTimeout(function () { fill.style.width = fill.getAttribute('data-width'); }, delay)); })(fills[i], 250 * i + 100);
        }
        var funFact = contentEl.querySelector('.bar-fun-fact');
        if (funFact) { answerAnimTimerIds.push(setTimeout(function () { funFact.classList.add('visible'); }, 250 * data.bars.length + 600)); }
    }

    function animateCountUp(el, targetStr, duration) {
        var stripped = targetStr.replace(/,/g, '');
        var target = parseFloat(stripped);
        if (isNaN(target)) { el.textContent = targetStr; return; }
        var isInt = stripped.indexOf('.') === -1;
        var start = performance.now();
        function tick(now) {
            var elapsed = now - start;
            var progress = Math.min(elapsed / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = target * eased;
            el.textContent = isInt ? Math.round(current).toLocaleString() : current.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (progress < 1) requestAnimationFrame(tick);
            else el.textContent = targetStr;
        }
        el.textContent = '0';
        requestAnimationFrame(tick);
    }

    function renderBigReveal(data, questionId) {
        var html = '<div class="big-reveal-container"><div class="big-reveal-label">' + escapeHTML(data.label) + '</div><div class="big-reveal-number">' + escapeHTML(data.number) + '</div>';
        if (data.unit) html += '<div class="big-reveal-unit">' + escapeHTML(data.unit) + '</div>';
        if (data.badges && data.badges.length) {
            html += '<div class="badge-row">';
            for (var i = 0; i < data.badges.length; i++) {
                var b = data.badges[i];
                var cls = b.highlight ? ' badge-highlight' : '';
                html += '<div class="badge' + cls + '"><span class="badge-icon">' + b.icon + '</span><span class="badge-value">' + escapeHTML(b.value) + '</span><span class="badge-label">' + escapeHTML(b.label) + '</span></div>';
            }
            html += '</div>';
        }
        if (data.comparison) html += '<div class="big-reveal-comparison">' + escapeHTML(data.comparison) + '</div>';
        html += '</div>';
        contentEl.innerHTML = html;
        var numberEl = contentEl.querySelector('.big-reveal-number');
        if (numberEl) animateCountUp(numberEl, data.number, 1500);
        if (questionId === 'temperature' || questionId === 'speed') {
            answerAnimTimerIds.push(setTimeout(function () { triggerScreenShake(6); }, 1400));
        }
        var badges = contentEl.querySelectorAll('.badge');
        for (var i = 0; i < badges.length; i++) {
            (function (badge, delay) { answerAnimTimerIds.push(setTimeout(function () { badge.classList.add('visible'); }, delay)); })(badges[i], 150 * i + 800);
        }
    }

    function renderIconGrid(data) {
        var html = '<div class="icon-grid-title">' + escapeHTML(data.title) + '</div><div class="icon-grid">';
        for (var i = 0; i < data.items.length; i++) {
            var item = data.items[i];
            html += '<div class="icon-grid-cell"><span class="icon-grid-emoji">' + item.icon + '</span><span class="icon-grid-label">' + escapeHTML(item.label) + '</span></div>';
        }
        html += '</div>';
        contentEl.innerHTML = html;
        var cells = contentEl.querySelectorAll('.icon-grid-cell');
        for (var i = 0; i < cells.length; i++) {
            (function (cell, delay) { answerAnimTimerIds.push(setTimeout(function () { cell.classList.add('visible'); }, delay)); })(cells[i], 200 * i + 100);
        }
    }

    function renderLearnMore(links) {
        if (!links || !links.length) return;
        var html = '<div class="learn-more"><div class="learn-more-label">Dive deeper</div><div class="learn-more-links">';
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var icon = link.type === 'video' ? '\u25B6' : '\u2197';
            html += '<a class="learn-more-link" href="' + escapeHTML(link.url) + '" target="_blank" rel="noopener" data-link-label="' + escapeHTML(link.label) + '" data-link-url="' + escapeHTML(link.url) + '"><span class="learn-more-icon">' + icon + '</span>' + escapeHTML(link.label) + '</a>';
        }
        html += '</div></div>';
        contentEl.insertAdjacentHTML('beforeend', html);
        var el = contentEl.querySelector('.learn-more');
        if (el) {
            answerAnimTimerIds.push(setTimeout(function () { el.classList.add('visible'); }, 2000));
        }
        // Log learn-more link taps via event delegation
        var linkEls = contentEl.querySelectorAll('.learn-more-link');
        for (var j = 0; j < linkEls.length; j++) {
            (function (linkEl) {
                linkEl.addEventListener('pointerdown', function () {
                    sessionLog.learnMoreTaps.push({
                        questionId: lastAnsweredQuestionId,
                        label: linkEl.getAttribute('data-link-label'),
                        url: linkEl.getAttribute('data-link-url'),
                        tappedAt: Date.now()
                    });
                });
            })(linkEls[j]);
        }
    }

    function hideAnswer() {
        overlayEl.classList.add('hidden');
        appState = State.BUBBLES;
        lastInteraction = Date.now();
        if (answerViewStart && sessionLog.questions.length > 0) {
            var lastEntry = sessionLog.questions[sessionLog.questions.length - 1];
            if (lastEntry.id === lastAnsweredQuestionId && lastEntry.answeredDuration === null) {
                lastEntry.answeredDuration = Date.now() - answerViewStart;
            }
        }
        answerViewStart = null;
        for (var i = 0; i < answerAnimTimerIds.length; i++) clearTimeout(answerAnimTimerIds[i]);
        answerAnimTimerIds = [];
        for (var i = 0; i < squeezeTimerIds.length; i++) clearTimeout(squeezeTimerIds[i]);
        squeezeTimerIds = [];
        drainPendingRespawns();
    }

    dismissBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        if (idleWarningShown) { idleWarningShown = false; if (idleWarningEl) idleWarningEl.classList.add('hidden'); }
        hideAnswer();
    });

    overlayEl.addEventListener('pointerdown', function (e) {
        if (e.target === overlayEl && appState === State.ANSWER) {
            e.preventDefault();
            lastInteraction = Date.now();
            if (idleWarningShown) { idleWarningShown = false; if (idleWarningEl) idleWarningEl.classList.add('hidden'); }
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

    function saveSession() {
        if (sessionLog.startTime) {
            sessionLog.endTime = Date.now();
            // Close any open answer duration
            if (answerViewStart && sessionLog.questions.length > 0) {
                var lastEntry = sessionLog.questions[sessionLog.questions.length - 1];
                if (lastEntry.answeredDuration === null) {
                    lastEntry.answeredDuration = Date.now() - answerViewStart;
                }
            }
            answerViewStart = null;
            allSessions.push(sessionLog);
            try { localStorage.setItem('bubblequiz-sessions', JSON.stringify(allSessions)); } catch (e) { /* storage full */ }
        }
        var prevIdleResets = sessionLog.idleResets;
        sessionLog = createSessionLog();
        sessionLog.idleResets = prevIdleResets + 1;
    }

    function showSplash() {
        appState = State.SPLASH;
        audioManager.setDroneVolume(0);
        splashEl.classList.remove('hidden');
        overlayEl.classList.add('hidden');
        if (exitSurveyEl) exitSurveyEl.classList.add('hidden');
        idleWarningShown = false;
        if (idleWarningEl) idleWarningEl.classList.add('hidden');
        if (surveyAutoTimer) { clearTimeout(surveyAutoTimer); surveyAutoTimer = null; }
        questionCooldowns = {};
        answeredIds = {};
        currentWave = 1;
        pendingRespawnIds = [];
        streak = 0;
        unlockedCreatures = {};
        discoveredCreatures = {};
        creatureFlashAlpha = 0;
        streakGlowAlpha = 0;
        for (var _r = 0; _r < shockwaves.length; _r++) shockwaves[_r].active = false;
        sonoFlash.active = false;
        screenShake.intensity = 0;
        whale.active = false;
        whale.triggered = false;
        cascade.active = false;
        for (var _r2 = 0; _r2 < cascadeWaves.length; _r2++) cascadeWaves[_r2].active = false;
        trailHead = 0; trailCount = 0;
        for (var _r3 = 0; _r3 < userBubbles.length; _r3++) userBubbles[_r3].active = false;
        nursery.active = false;
        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        for (var i = 0; i < respawnTimerIds.length; i++) clearTimeout(respawnTimerIds[i]);
        respawnTimerIds = [];
        for (var i = 0; i < answerAnimTimerIds.length; i++) clearTimeout(answerAnimTimerIds[i]);
        answerAnimTimerIds = [];
        for (var i = 0; i < squeezeTimerIds.length; i++) clearTimeout(squeezeTimerIds[i]);
        squeezeTimerIds = [];
    }

    function spawnAllCreatures() {
        var ids = ['speed', 'temperature', 'destruction', 'useful', 'where', 'shrimp'];
        for (var i = 0; i < ids.length; i++) {
            unlockedCreatures[ids[i]] = { startTime: animTime - i * 0.5, nudgeX: 0, nudgeY: 0 };
        }
    }

    function hideSplash() {
        audioManager.init();
        audioManager.startDrone();
        splashEl.classList.add('hidden');
        appState = State.BUBBLES;
        lastInteraction = Date.now();
        sessionLog.startTime = Date.now();
        initQuestionBubbles();
        spawnAllCreatures();
    }

    splashEl.addEventListener('pointerdown', function (e) {
        if (appState === State.SPLASH) { e.preventDefault(); hideSplash(); }
    });

    // =========================================================================
    // Touch handling
    // =========================================================================

    var nurseryTimer = null;

    canvas.addEventListener('pointerdown', function (e) {
        if (appState !== State.BUBBLES) return;
        lastInteraction = Date.now();
        if (idleWarningShown) { idleWarningShown = false; if (idleWarningEl) idleWarningEl.classList.add('hidden'); }

        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;
        lastTapX = px;
        lastTapY = py;

        var hitQuestion = false;
        for (var i = questionBubbles.length - 1; i >= 0; i--) {
            var qb = questionBubbles[i];
            if (!qb.active || qb.popPhase) continue;
            var dx = px - qb.x;
            var dy = py - qb.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < qb.r * HIT_FORGIVENESS) {
                hitQuestion = true;
                lastPopX = qb.x / W;
                lastPopY = qb.y / H;
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
                        answeredIds[bubble.questionId] = true;
                        checkWaveTransition();
                        var poppedId = bubble.questionId;
                        bubble.active = false;
                        bubble.popPhase = null;
                        bubble.drawScale = 1;
                        showAnswer(poppedId);
                        (function (id) {
                            var tid = setTimeout(function () {
                                var tidx = respawnTimerIds.indexOf(tid);
                                if (tidx !== -1) respawnTimerIds.splice(tidx, 1);
                                if (appState === State.BUBBLES) respawnQuestionBubbleById(id);
                                else if (appState === State.ANSWER) pendingRespawnIds.push(id);
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
            if (!hitDecorative) spawnRipple(px, py);
        }

        // --- New creature tap interactions ---
        // Starfish: curl arms + bioluminescence ring
        for (var _si = 0; _si < starfishData.length; _si++) {
            var sf = starfishData[_si];
            var sfDist = Math.sqrt(Math.pow(px - sf.x, 2) + Math.pow(py - sf.y, 2));
            if (sfDist < sf.radius * 2.5) {
                sf.curlTimer = 1.5;
                spawnBioluminescence(sf.x, sf.y);
            }
        }

        // Anemone: retract tentacles
        for (var _ai = 0; _ai < anemones.length; _ai++) {
            var an = anemones[_ai];
            var anDist = Math.sqrt(Math.pow(px - an.x, 2) + Math.pow(py - (an.y - an.baseHeight), 2));
            if (anDist < 40) {
                an.retractTimer = 2.3; // 0.3s retract + 2s extend
                // Also hide clownfish if near anemone 0
                if (_ai === 0) {
                    for (var _cfi = 0; _cfi < clownfish.length; _cfi++) {
                        clownfish[_cfi].hideTimer = 2;
                    }
                }
            }
        }

        // Crabs: startle and scuttle away
        for (var _cri = 0; _cri < crabs.length; _cri++) {
            var cr = crabs[_cri];
            var crDist = Math.sqrt(Math.pow(px - cr.x, 2) + Math.pow(py - cr.y, 2));
            if (crDist < 40) {
                cr.state = CRAB_STATES.STARTLE;
                cr.stateTimer = 1.5;
                cr.dir = px > cr.x ? -1 : 1;
                cr.startleSpeed = cr.speed * 3;
            }
        }

        // Coral: particle puff
        for (var _coi = 0; _coi < corals.length; _coi++) {
            var co = corals[_coi];
            var coDist = Math.sqrt(Math.pow(px - co.x, 2) + Math.pow(py - (co.y - co.height * 0.5), 2));
            if (coDist < co.width + 20) {
                co.tapTimer = 1;
            }
        }

        // Manta ray: barrel roll
        var mantaDist = Math.sqrt(Math.pow(px - manta.x, 2) + Math.pow(py - manta.y, 2));
        if (mantaDist < 80) {
            if (manta.rollTimer <= 0) {
                manta.rollTimer = 2;
                manta.rollAngle = 0;
                spawnBioluminescence(manta.x, manta.y);
            }
        }

        // Pufferfish: inflate
        var pfY = pufferfish.y + Math.sin(animTime * pufferfish.wobbleFreq + pufferfish.wobblePhase) * pufferfish.wobbleAmp;
        var pfDist = Math.sqrt(Math.pow(px - pufferfish.x, 2) + Math.pow(py - pfY, 2));
        if (pfDist < pufferfish.size * 2) {
            inflatePufferfish();
        }

        // --- New creatures tap interactions ---

        // Sea urchins: extend spines
        for (var _sui = 0; _sui < seaUrchins.length; _sui++) {
            var su = seaUrchins[_sui];
            var suDx = px - su.x;
            var suDy = py - su.y;
            if (Math.sqrt(suDx * suDx + suDy * suDy) < su.radius * 3) {
                su.spineExtend = 1.0;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Tube worms: retract fans
        for (var _twi = 0; _twi < tubeWorms.length; _twi++) {
            var tw = tubeWorms[_twi];
            var twDx = px - tw.x;
            var twDy = py - (tw.y - tw.tubeHeight);
            if (Math.sqrt(twDx * twDx + twDy * twDy) < tw.fanRadius * 1.5) {
                tw.retractTimer = 3;
                tw.fanHeight = 0;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Hermit crabs: hide in shell
        for (var _hci = 0; _hci < hermitCrabs.length; _hci++) {
            var hci = hermitCrabs[_hci];
            var hcDx = px - hci.x;
            var hcDy = py - hci.y;
            if (Math.sqrt(hcDx * hcDx + hcDy * hcDy) < hci.shellSize * 2.5) {
                hci.hideTimer = 3;
                hci.legEmergePhase = 0;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Sea cucumbers: contract
        for (var _sci = 0; _sci < seaCucumbers.length; _sci++) {
            var sc = seaCucumbers[_sci];
            var scDx = px - sc.x;
            var scDy = py - sc.y;
            if (Math.sqrt(scDx * scDx + scDy * scDy) < sc.length * 0.8) {
                sc.contractTimer = 2;
                sc.contractAmount = 1;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Octopus: ink + jet
        var ocDx = px - octopus.x;
        var ocDy = py - octopus.y;
        if (Math.sqrt(ocDx * ocDx + ocDy * ocDy) < octopus.bodyRadius * 2) {
            triggerOctopusInk();
            spawnRipple(px, py);
            audioManager.playPop(true);
        }

        // Moray eel: lunge
        for (var _mri = 0; _mri < morays.length; _mri++) {
            var mr = morays[_mri];
            var mrDx = px - mr.x;
            var mrDy = py - mr.y;
            if (Math.sqrt(mrDx * mrDx + mrDy * mrDy) < 40) {
                mr.lungeTimer = 1.5;
                mr.mouthOpen = 1;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Electric eel: zap
        var eeDx = px - electricEel.x;
        var eeDy = py - electricEel.y;
        if (Math.sqrt(eeDx * eeDx + eeDy * eeDy) < 50) {
            triggerElectricZap();
            spawnRipple(px, py);
            audioManager.playPop(true);
        }

        // Seahorse babies: detach
        for (var _shi = 0; _shi < seahorseBabies.length; _shi++) {
            var shb = seahorseBabies[_shi];
            var shX, shY;
            if (shb.detachTimer > 0) {
                shX = shb.floatX || 0;
                shY = shb.floatY || 0;
            } else if (seaweeds.length > 0) {
                var sw = seaweeds[shb.attachedSeaweedIdx % seaweeds.length];
                shX = sw.xFrac * W;
                shY = H - sw.baseHeight * shb.attachFrac;
            } else {
                shX = W * 0.5;
                shY = H * 0.7;
            }
            var shDx = px - shX;
            var shDy = py - shY;
            if (Math.sqrt(shDx * shDx + shDy * shDy) < shb.size * 2.5) {
                shb.detachTimer = 3;
                shb.floatX = shX;
                shb.floatY = shY;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Cleaner shrimp: dance
        for (var _csi = 0; _csi < cleanerShrimps.length; _csi++) {
            var csi = cleanerShrimps[_csi];
            var csDx = px - csi.x;
            var csDy = py - csi.y;
            if (Math.sqrt(csDx * csDx + csDy * csDy) < csi.size * 2) {
                csi.danceTimer = 1;
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        // Lionfish: threat display
        var lfDx = px - lionfish.x;
        var lfDy = py - lionfish.y;
        if (Math.sqrt(lfDx * lfDx + lfDy * lfDy) < lionfish.bodySize * 1.5) {
            lionfish.displayTimer = 2;
            lionfish.finSpread = 1.5;
            spawnRipple(px, py);
            audioManager.playPop(true);
        }

        // Nudibranch: curl + color puff
        for (var _nbi = 0; _nbi < nudibranchs.length; _nbi++) {
            var nbi = nudibranchs[_nbi];
            var nbDx = px - nbi.x;
            var nbDy = py - nbi.y;
            if (Math.sqrt(nbDx * nbDx + nbDy * nbDy) < nbi.size * 1.5) {
                nbi.curlTimer = 1.5;
                // Spawn color puff particles
                for (var _npi = 0; _npi < nbi.colorParticles.length; _npi++) {
                    var cp = nbi.colorParticles[_npi];
                    cp.active = true;
                    cp.x = nbi.x + (Math.random() - 0.5) * 6;
                    cp.y = nbi.y + (Math.random() - 0.5) * 6;
                    cp.vx = (Math.random() - 0.5) * 0.8;
                    cp.vy = -0.3 - Math.random() * 0.5;
                    cp.life = 1 + Math.random() * 0.5;
                    cp.size = 1.5 + Math.random() * 2;
                }
                spawnRipple(px, py);
                audioManager.playPop(true);
                break;
            }
        }

        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        if (!hitQuestion) {
            nurseryTimer = setTimeout(function () {
                nursery.active = true;
                nursery.x = px; nursery.y = py;
                nursery.startTime = animTime;
                nursery.radius = 5;
            }, 1500);
        }
    });

    canvas.addEventListener('pointermove', function (e) {
        if (appState !== State.BUBBLES) return;
        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;
        addTrailPoint(px, py);
        scatterPlankton(px, py);
        if (nursery.active) { nursery.x = px; nursery.y = py; }
    });

    canvas.addEventListener('pointerup', function () {
        if (nurseryTimer) { clearTimeout(nurseryTimer); nurseryTimer = null; }
        if (nursery.active) {
            for (var _ui = 0; _ui < userBubbles.length; _ui++) {
                if (userBubbles[_ui].active) continue;
                var ub = userBubbles[_ui];
                ub.active = true;
                ub.x = nursery.x; ub.y = nursery.y;
                ub.radius = nursery.radius;
                ub.speed = 0.3 + (40 - nursery.radius) * 0.02;
                ub.wobblePhase = Math.random() * Math.PI * 2;
                ub.wobbleAmp = 0.15 + Math.random() * 0.2;
                ub.wobbleFreq = 0.5 + Math.random() * 0.3;
                break;
            }
            nursery.active = false;
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
    // Idle reset
    // =========================================================================

    function checkIdle() {
        if (appState === State.SURVEY) return;
        if (appState !== State.BUBBLES && appState !== State.ANSWER) return;
        var elapsed = Date.now() - lastInteraction;
        if (elapsed > IDLE_TIMEOUT_MS) {
            idleWarningShown = false;
            if (idleWarningEl) idleWarningEl.classList.add('hidden');
            // Show survey if there was any interaction this session, otherwise go straight to splash
            if (sessionLog.startTime && sessionLog.questions.length > 0) {
                showExitSurvey();
            } else {
                saveSession();
                showSplash();
            }
        }
    }

    // =========================================================================
    // Coral formations (2-3 instances)
    // =========================================================================

    var corals = [];
    var CORAL_TYPES = [
        { name: 'brain', color: 0xc4a35a, highlight: 0xdec078 },
        { name: 'fan', color: 0xc45fa0, highlight: 0xe080c0 },
        { name: 'branching', color: 0xe07840, highlight: 0xf0a060 },
    ];

    // Overlay Graphics for tap particle puffs (lives inside the container)
    var coralPuffGfx = new PIXI.Graphics();
    coralContainer.addChild(coralPuffGfx);

    function initCorals() {
        // Remove old sprites (but keep puff overlay)
        while (coralContainer.children.length > 1) {
            coralContainer.removeChildAt(0);
        }
        corals = [];
        for (var i = 0; i < CORAL_COUNT; i++) {
            var coralType = CORAL_TYPES[i % CORAL_TYPES.length];
            var sp = new PIXI.Sprite(creatureTextures.coralCluster);
            sp.anchor.set(0.5, 0.88);
            var baseScale = (0.5 + Math.random() * 0.4);
            sp.scale.set(baseScale);
            var xPos = W * (0.15 + i * 0.3 + (Math.random() - 0.5) * 0.1);
            var cyPos = seafloorY(xPos) + 15;
            sp.position.set(xPos, cyPos);
            coralContainer.addChildAt(sp, coralContainer.children.length - 1);
            corals.push({
                x: xPos,
                y: cyPos,
                type: coralType,
                height: 50 + Math.random() * 40,
                width: 30 + Math.random() * 20,
                swayPhase: Math.random() * Math.PI * 2,
                branches: [],
                tapTimer: 0,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initCorals();

    function drawCorals(time) {
        coralPuffGfx.clear();
        for (var ci = 0; ci < corals.length; ci++) {
            var c = corals[ci];
            var sway = Math.sin(time * 0.3 + c.swayPhase) * 1.5;
            if (c.sprite) {
                c.sprite.position.x = c.x + sway;
                c.sprite.rotation = sway * 0.005;
            }
            // Tap particle puff
            if (c.tapTimer > 0) {
                var tapProg = 1 - c.tapTimer;
                var baseX = c.x + sway;
                for (var tp = 0; tp < 6; tp++) {
                    var tpAngle = tp * Math.PI * 2 / 6 + time * 2;
                    var tpDist = tapProg * 30;
                    var tpAlpha = (1 - tapProg) * 0.5;
                    coralPuffGfx.beginFill(c.type.highlight, tpAlpha);
                    coralPuffGfx.drawCircle(baseX + Math.cos(tpAngle) * tpDist, c.y - c.height * 0.4 + Math.sin(tpAngle) * tpDist, 2);
                    coralPuffGfx.endFill();
                }
            }
        }
    }

    function updateCorals(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < corals.length; i++) {
            if (corals[i].tapTimer > 0) {
                corals[i].tapTimer -= dtSec * 0.8;
                if (corals[i].tapTimer < 0) corals[i].tapTimer = 0;
            }
        }
    }

    // =========================================================================
    // Starfish (3-4 instances)
    // =========================================================================

    var starfishData = [];
    var STARFISH_TEX_KEYS = ['starfish', 'starfishGold', 'starfish', 'starfishGold'];

    function initStarfish() {
        // Remove old sprites
        while (starfishContainer.children.length > 0) {
            starfishContainer.removeChildAt(0);
        }
        starfishData = [];
        for (var i = 0; i < STARFISH_COUNT; i++) {
            var texKey = STARFISH_TEX_KEYS[i % STARFISH_TEX_KEYS.length];
            var sp = new PIXI.Sprite(creatureTextures[texKey]);
            sp.anchor.set(0.5, 0.4);
            var baseScale = (0.7 + Math.random() * 0.5);
            sp.scale.set(baseScale);
            var xPos = W * (0.1 + i * 0.25 + (Math.random() - 0.5) * 0.08);
            var yPos = seafloorY(xPos) - Math.random() * 4;
            sp.position.set(xPos, yPos);
            sp.rotation = Math.random() * Math.PI * 2;
            starfishContainer.addChild(sp);
            starfishData.push({
                x: xPos,
                y: yPos,
                radius: 14 + Math.random() * 8,
                rotation: sp.rotation,
                ripplePhase: Math.random() * Math.PI * 2,
                curlTimer: 0,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initStarfish();

    function drawStarfish(time) {
        for (var si = 0; si < starfishData.length; si++) {
            var sf = starfishData[si];
            var sp = sf.sprite;
            if (!sp) continue;
            var isCurling = sf.curlTimer > 0;
            var curlAmount = isCurling ? Math.min(sf.curlTimer * 2, 1) : 0;
            var scaleAdjust = 1 - curlAmount * 0.3;
            sp.scale.set(sf.baseScale * scaleAdjust);
        }
    }

    function updateStarfish(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < starfishData.length; i++) {
            if (starfishData[i].curlTimer > 0) {
                starfishData[i].curlTimer -= dtSec;
                if (starfishData[i].curlTimer < 0) starfishData[i].curlTimer = 0;
            }
        }
    }

    // =========================================================================
    // Sea Anemones (2-3 instances)
    // =========================================================================

    var anemones = [];

    function initAnemones() {
        // Remove old sprites but keep overlay graphics (last child)
        while (anemoneContainer.children.length > 1) {
            anemoneContainer.removeChildAt(0);
        }
        anemones = [];
        for (var i = 0; i < ANEMONE_COUNT; i++) {
            var sp = new PIXI.Sprite(creatureTextures.anemone);
            sp.anchor.set(0.5, 0.975);
            var baseScale = 0.8 + Math.random() * 0.4;
            sp.scale.set(baseScale);
            var xPos = W * (0.2 + i * 0.3 + (Math.random() - 0.5) * 0.1);
            var yPos = seafloorY(xPos) - Math.random() * 2;
            sp.position.set(xPos, yPos);
            anemoneContainer.addChildAt(sp, anemoneContainer.children.length - 1);
            anemones.push({
                x: xPos,
                y: yPos,
                baseWidth: 18 + Math.random() * 8,
                baseHeight: 15 + Math.random() * 8,
                tentacles: [], // kept for compat
                retractTimer: 0,
                color: i === 0 ? 0xff6090 : (i === 1 ? 0xf08050 : 0xff80a0),
                baseColor: i === 0 ? 0xc04060 : (i === 1 ? 0xb06030 : 0xc06080),
                sprite: sp,
                baseScale: baseScale,
                swayPhase: Math.random() * Math.PI * 2,
            });
        }
    }
    initAnemones();

    function drawAnemones(time) {
        anemoneOverlayGfx.clear(); // clear overlay for clownfish to redraw
        for (var ai = 0; ai < anemones.length; ai++) {
            var a = anemones[ai];
            var sp = a.sprite;
            if (!sp) continue;
            var retractAmount = a.retractTimer > 0 ? Math.min(a.retractTimer * 3, 1) : 0;
            // Sway gently; retract = shrink scale
            var sway = Math.sin(time * 0.5 + a.swayPhase) * 0.03 * (1 - retractAmount);
            sp.rotation = sway;
            var scaleY = a.baseScale * (1 - retractAmount * 0.5);
            sp.scale.set(a.baseScale, scaleY);
        }
    }

    function updateAnemones(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < anemones.length; i++) {
            var a = anemones[i];
            if (a.retractTimer > 0) {
                a.retractTimer -= dtSec * 0.5;
                if (a.retractTimer < 0) a.retractTimer = 0;
            }

            // Tentacles catch marine snow: gently pull nearest particle toward anemone
            if (a.retractTimer <= 0) {
                var tentBaseY2 = a.y - a.baseHeight;
                var bestDist = 40;
                var bestSnow = null;
                for (var ms = 0; ms < marineSnow.length; ms++) {
                    var snow = marineSnow[ms];
                    var sdx = snow.x - a.x;
                    var sdy = snow.y - tentBaseY2;
                    var sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (sDist < bestDist) {
                        bestDist = sDist;
                        bestSnow = snow;
                    }
                }
                if (bestSnow && bestDist < 40) {
                    var pullX = a.x - bestSnow.x;
                    var pullY = tentBaseY2 - bestSnow.y;
                    var pullDist = Math.sqrt(pullX * pullX + pullY * pullY);
                    if (pullDist > 1) {
                        bestSnow.x += (pullX / pullDist) * 0.2 * dt;
                        bestSnow.y += (pullY / pullDist) * 0.2 * dt;
                    }
                }
            }
        }
    }

    // =========================================================================
    // Seafloor Crabs (2-3 instances)
    // =========================================================================

    var crabs = [];
    var CRAB_STATES = { SCUTTLE: 0, PAUSE: 1, STARTLE: 2 };

    function initCrabs() {
        // Remove old sprites
        while (crabContainer.children.length > 0) {
            crabContainer.removeChildAt(0);
        }
        crabs = [];
        for (var i = 0; i < CRAB_COUNT; i++) {
            var sp = new PIXI.Sprite(creatureTextures.crab);
            sp.anchor.set(0.5, 0.52);
            var baseScale = 0.7 + Math.random() * 0.3;
            sp.scale.set(baseScale);
            var xPos = W * (0.15 + i * 0.35 + (Math.random() - 0.5) * 0.1);
            var yPos = seafloorY(xPos) - 2;
            sp.position.set(xPos, yPos);
            crabContainer.addChild(sp);
            crabs.push({
                x: xPos,
                y: yPos,
                dir: Math.random() > 0.5 ? 1 : -1,
                state: CRAB_STATES.SCUTTLE,
                stateTimer: 2 + Math.random() * 2,
                speed: 0.3 + Math.random() * 0.2,
                bodyWidth: 12 + Math.random() * 4,
                bodyHeight: 6 + Math.random() * 2,
                color: 0xc05030 + Math.floor(Math.random() * 0x202020),
                legPhase: Math.random() * Math.PI * 2,
                clawAngle: 0,
                startleSpeed: 0,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initCrabs();

    function drawCrabs(time) {
        for (var ci = 0; ci < crabs.length; ci++) {
            var c = crabs[ci];
            var sp = c.sprite;
            if (!sp) continue;
            sp.position.set(c.x, c.y);
            // Flip based on direction
            sp.scale.x = c.dir > 0 ? c.baseScale : -c.baseScale;
            // Walking bob
            var isWalking = c.state === CRAB_STATES.SCUTTLE || c.state === CRAB_STATES.STARTLE;
            if (isWalking) {
                sp.rotation = Math.sin(time * 6 + c.legPhase) * 0.05;
            } else {
                sp.rotation = 0;
            }
        }
    }

    function updateCrabs(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            c.stateTimer -= dtSec;

            if (c.state === CRAB_STATES.SCUTTLE) {
                c.x += c.speed * c.dir * dt;
                if (c.x < 20 || c.x > W - 20) c.dir *= -1;
                if (c.stateTimer <= 0) {
                    c.state = CRAB_STATES.PAUSE;
                    c.stateTimer = 1 + Math.random() * 1.5;
                }
            } else if (c.state === CRAB_STATES.PAUSE) {
                if (c.stateTimer <= 0) {
                    c.state = CRAB_STATES.SCUTTLE;
                    c.stateTimer = 2 + Math.random() * 2;
                    c.dir = Math.random() > 0.5 ? 1 : -1;
                }
            } else if (c.state === CRAB_STATES.STARTLE) {
                c.x += c.startleSpeed * c.dir * dt;
                if (c.x < 20 || c.x > W - 20) c.dir *= -1;
                if (c.stateTimer <= 0) {
                    c.state = CRAB_STATES.SCUTTLE;
                    c.stateTimer = 2 + Math.random() * 2;
                }
            }

            // Track terrain as crab walks
            c.y = seafloorY(c.x) - 2;

            // Sand puff particles when scuttling
            if ((c.state === CRAB_STATES.SCUTTLE || c.state === CRAB_STATES.STARTLE) && Math.random() < 0.15) {
                spawnWakeParticle(c.x + (Math.random() - 0.5) * c.bodyWidth, c.y + c.bodyHeight * 0.5);
            }
        }
    }

    // =========================================================================
    // Bubble Streams (2-3 thin streams from seafloor)
    // =========================================================================

    var bubbleStreams = [];
    var bubbleStreamParticles = [];
    var BUBBLE_STREAM_PARTICLE_MAX = 60;

    function initBubbleStreams() {
        bubbleStreams = [];
        bubbleStreamParticles = [];
        for (var i = 0; i < BUBBLE_STREAM_COUNT; i++) {
            var bsx = W * (0.1 + Math.random() * 0.8);
            bubbleStreams.push({
                x: bsx,
                y: seafloorY(bsx),
                emitTimer: 0,
                emitRate: 0.5 + Math.random() * 0.5,
            });
        }
        for (var i = 0; i < BUBBLE_STREAM_PARTICLE_MAX; i++) {
            var sp = new PIXI.Sprite(smallCircleTex);
            sp.anchor.set(0.5, 0.5);
            sp.visible = false;
            sp.tint = 0xc8f0ff;
            bubbleStreamContainer.addChild(sp);
            bubbleStreamParticles.push({
                active: false, x: 0, y: 0, speed: 0, wobblePhase: 0, size: 0, life: 0,
                sprite: sp,
            });
        }
    }
    initBubbleStreams();

    function updateBubbleStreams(dt) {
        var dtSec = dt / 60;
        // Emit new bubbles
        for (var si = 0; si < bubbleStreams.length; si++) {
            var s = bubbleStreams[si];
            s.emitTimer -= dtSec;
            if (s.emitTimer <= 0) {
                s.emitTimer = s.emitRate + Math.random() * 0.3;
                // Find inactive particle
                for (var pi = 0; pi < bubbleStreamParticles.length; pi++) {
                    var p = bubbleStreamParticles[pi];
                    if (p.active) continue;
                    p.active = true;
                    p.x = s.x + (Math.random() - 0.5) * 4;
                    p.y = s.y;
                    p.speed = 0.4 + Math.random() * 0.3;
                    p.wobblePhase = Math.random() * Math.PI * 2;
                    p.size = 1 + Math.random() * 1.5;
                    p.life = 0;
                    break;
                }
            }
        }
        // Update particles
        for (var pi = 0; pi < bubbleStreamParticles.length; pi++) {
            var p = bubbleStreamParticles[pi];
            if (!p.active) { p.sprite.visible = false; continue; }
            p.y -= p.speed * dt;
            p.x += Math.sin(animTime * 2 + p.wobblePhase) * 0.15 * dt;
            p.life += dtSec;
            if (p.y < 0) { p.active = false; p.sprite.visible = false; continue; }
            p.sprite.visible = true;
            p.sprite.position.set(p.x, p.y);
            p.sprite.alpha = 0.3 * Math.min(p.life * 2, 1);
            p.sprite.scale.set(p.size / 4);
        }
    }

    // =========================================================================
    // Rocks & Pebbles (static seafloor decoration)
    // =========================================================================

    var rocks = [];
    function initRocks() {
        rocks = [];
        for (var i = 0; i < ROCK_COUNT; i++) {
            var rx = W * (0.02 + Math.random() * 0.96);
            var r = {
                x: rx,
                y: seafloorY(rx) - 2,
                width: 5 + Math.random() * 15,
                height: 3 + Math.random() * 8,
                color: 0x3a3a40 + Math.floor(Math.random() * 0x151515),
                rotation: Math.random() * 0.4 - 0.2,
                points: []
            };
            var numPts = 5 + Math.floor(Math.random() * 3);
            for (var p = 0; p < numPts; p++) {
                var angle = (p / numPts) * Math.PI * 2;
                var dist = 0.6 + Math.random() * 0.4;
                r.points.push({ x: Math.cos(angle) * r.width * 0.5 * dist, y: Math.sin(angle) * r.height * 0.5 * dist });
            }
            rocks.push(r);
        }
    }
    initRocks();

    function drawRocks() {
        var g = rockGraphics;
        g.clear();
        // Sand ripples at very bottom
        g.lineStyle(0.5, 0xd4c8a0, 0.08);
        for (var sr = 0; sr < 8; sr++) {
            var srY = H - 3 - sr * 3;
            g.moveTo(0, srY);
            for (var sx = 10; sx <= W; sx += 10) {
                g.lineTo(sx, srY + Math.sin(sx * 0.03 + animTime * 0.1 + sr * 0.5) * 1.5);
            }
        }
        g.lineStyle(0);
        // Rocks
        for (var i = 0; i < rocks.length; i++) {
            var r = rocks[i];
            g.beginFill(r.color, 0.7);
            var cos = Math.cos(r.rotation), sin = Math.sin(r.rotation);
            for (var p = 0; p < r.points.length; p++) {
                var px = r.x + r.points[p].x * cos - r.points[p].y * sin;
                var py = r.y + r.points[p].x * sin + r.points[p].y * cos;
                if (p === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.endFill();
        }
    }

    // =========================================================================
    // Shells (static seafloor decoration)
    // =========================================================================

    var shells = [];
    var SHELL_COLORS = [0xf0c8c0, 0xf0e8d0, 0xd0b8e0, 0xe8d0c0, 0xd8c0d8];
    function initShells() {
        shells = [];
        for (var i = 0; i < SHELL_COUNT; i++) {
            var sx = W * (0.03 + Math.random() * 0.94);
            shells.push({
                x: sx,
                y: seafloorY(sx) - 1,
                size: 3 + Math.random() * 5,
                color: SHELL_COLORS[Math.floor(Math.random() * SHELL_COLORS.length)],
                rotation: Math.random() * Math.PI * 2,
                type: Math.floor(Math.random() * 3) // 0=spiral, 1=fan, 2=cone
            });
        }
    }
    initShells();

    function drawShells() {
        var g = shellGraphics;
        g.clear();
        for (var i = 0; i < shells.length; i++) {
            var s = shells[i];
            g.beginFill(s.color, 0.6);
            if (s.type === 0) {
                // Spiral shell: small arc curves
                for (var a = 0; a < 6; a++) {
                    var ang = s.rotation + a * 0.9;
                    var rad = s.size * 0.2 * (1 + a * 0.15);
                    g.drawCircle(s.x + Math.cos(ang) * rad, s.y + Math.sin(ang) * rad, s.size * 0.15);
                }
            } else if (s.type === 1) {
                // Fan shell
                g.moveTo(s.x, s.y);
                for (var a = 0; a < 5; a++) {
                    var ang = s.rotation - 0.8 + a * 0.4;
                    g.lineTo(s.x + Math.cos(ang) * s.size, s.y + Math.sin(ang) * s.size);
                }
                g.closePath();
            } else {
                // Cone shell: elongated ellipse
                g.drawEllipse(s.x, s.y, s.size * 0.3, s.size * 0.6);
            }
            g.endFill();
        }
    }

    // =========================================================================
    // Sea Grass Patches (animated clusters)
    // =========================================================================

    var seaGrassPatches = [];
    function initSeaGrass() {
        seaGrassPatches = [];
        for (var i = 0; i < SEA_GRASS_COUNT; i++) {
            var blades = [];
            var numBlades = 5 + Math.floor(Math.random() * 4);
            var cx = W * (0.05 + Math.random() * 0.9);
            for (var b = 0; b < numBlades; b++) {
                blades.push({
                    xOff: (Math.random() - 0.5) * 12,
                    height: 20 + Math.random() * 20,
                    width: 1 + Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2,
                    freq: 0.5 + Math.random() * 0.4,
                    color: 0x208040 + Math.floor(Math.random() * 0x103020)
                });
            }
            seaGrassPatches.push({ x: cx, y: seafloorY(cx), blades: blades });
        }
    }
    initSeaGrass();

    function drawSeaGrass(time) {
        var g = seaGrassGraphics;
        g.clear();
        for (var i = 0; i < seaGrassPatches.length; i++) {
            var patch = seaGrassPatches[i];
            for (var b = 0; b < patch.blades.length; b++) {
                var bl = patch.blades[b];
                var bx = patch.x + bl.xOff;
                var sway = Math.sin(time * bl.freq + bl.phase) * 3;
                g.lineStyle(bl.width, bl.color, 0.6);
                g.moveTo(bx, patch.y);
                g.bezierCurveTo(
                    bx + sway * 0.3, patch.y - bl.height * 0.33,
                    bx + sway * 0.7, patch.y - bl.height * 0.66,
                    bx + sway, patch.y - bl.height
                );
            }
        }
        g.lineStyle(0);
    }

    function updateSeaGrass(dt) {
        // Sea grass is purely time-driven, no state update needed
    }

    // =========================================================================
    // Sponges (breathing pulse)
    // =========================================================================

    var sponges = [];
    var SPONGE_COLORS = [0xd4a030, 0xd06830, 0x8040a0, 0xc08040, 0xa06050];
    function initSponges() {
        sponges = [];
        for (var i = 0; i < SPONGE_COUNT; i++) {
            var spx = W * (0.08 + Math.random() * 0.84);
            sponges.push({
                x: spx,
                y: seafloorY(spx),
                width: 8 + Math.random() * 8,
                height: 20 + Math.random() * 25,
                color: SPONGE_COLORS[i % SPONGE_COLORS.length],
                phase: Math.random() * Math.PI * 2,
                pulseAmp: 0.03 + Math.random() * 0.03
            });
        }
    }
    initSponges();

    function drawSponges(time) {
        var g = spongeGraphics;
        g.clear();
        for (var i = 0; i < sponges.length; i++) {
            var s = sponges[i];
            var pulse = 1 + Math.sin(time * 0.5 + s.phase) * s.pulseAmp;
            var w = s.width * pulse;
            var h = s.height * pulse;
            // Vase/tube body
            g.beginFill(s.color, 0.7);
            g.moveTo(s.x - w * 0.4, s.y);
            g.lineTo(s.x - w * 0.5, s.y - h * 0.8);
            g.bezierCurveTo(
                s.x - w * 0.5, s.y - h,
                s.x + w * 0.5, s.y - h,
                s.x + w * 0.5, s.y - h * 0.8
            );
            g.lineTo(s.x + w * 0.4, s.y);
            g.closePath();
            g.endFill();
            // Opening at top
            g.beginFill(s.color * 0.7 | 0, 0.5);
            g.drawEllipse(s.x, s.y - h * 0.9, w * 0.35, h * 0.06);
            g.endFill();
        }
    }

    function updateSponges(dt) {
        // Sponges are purely time-driven
    }

    // =========================================================================
    // Sea Urchins (interactive — spines extend on tap)
    // =========================================================================

    var seaUrchins = [];
    function initSeaUrchins() {
        // Remove old sprites
        while (seaUrchinContainer.children.length > 0) {
            seaUrchinContainer.removeChildAt(0);
        }
        seaUrchins = [];
        for (var i = 0; i < SEA_URCHIN_COUNT; i++) {
            var sp = new PIXI.Sprite(creatureTextures.seaUrchin);
            sp.anchor.set(0.5, 0.51);
            var baseScale = 0.3 + Math.random() * 0.2;
            sp.scale.set(baseScale);
            var xPos = W * (0.05 + Math.random() * 0.9);
            var yPos = seafloorY(xPos) - 2;
            sp.position.set(xPos, yPos);
            seaUrchinContainer.addChild(sp);
            seaUrchins.push({
                x: xPos,
                y: yPos,
                radius: 5 + Math.random() * 3,
                color: 0x1a1025 + Math.floor(Math.random() * 0x101020),
                spines: [],
                spineExtend: 0,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initSeaUrchins();

    function drawSeaUrchins(time) {
        for (var i = 0; i < seaUrchins.length; i++) {
            var su = seaUrchins[i];
            var sp = su.sprite;
            if (!sp) continue;
            var extend = 1 + su.spineExtend * 0.3;
            sp.scale.set(su.baseScale * extend);
        }
    }

    function updateSeaUrchins(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < seaUrchins.length; i++) {
            if (seaUrchins[i].spineExtend > 0) {
                seaUrchins[i].spineExtend -= dtSec * 0.5;
                if (seaUrchins[i].spineExtend < 0) seaUrchins[i].spineExtend = 0;
            }
        }
    }

    // =========================================================================
    // Tube Worms (interactive — fans retract on tap)
    // =========================================================================

    var tubeWorms = [];
    function initTubeWorms() {
        // Remove old sprites
        while (tubeWormContainer.children.length > 0) {
            tubeWormContainer.removeChildAt(0);
        }
        tubeWorms = [];
        for (var i = 0; i < TUBE_WORM_COUNT; i++) {
            var sp = new PIXI.Sprite(creatureTextures.tubeWorms);
            sp.anchor.set(0.5, 1.0);
            var baseScale = 0.7 + Math.random() * 0.4;
            sp.scale.set(baseScale);
            var xPos = W * (0.06 + Math.random() * 0.88);
            var yPos = seafloorY(xPos) - 1;
            sp.position.set(xPos, yPos);
            tubeWormContainer.addChild(sp);
            tubeWorms.push({
                x: xPos,
                y: yPos,
                tubeHeight: 15 + Math.random() * 10,
                tubeWidth: 3 + Math.random() * 2,
                fanRadius: 10 + Math.random() * 8,
                numRays: 8 + Math.floor(Math.random() * 6),
                color: [0xd04050, 0xe06040, 0xc05080][Math.floor(Math.random() * 3)],
                phase: Math.random() * Math.PI * 2,
                retractTimer: 0,
                fanHeight: 1,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initTubeWorms();

    function drawTubeWorms(time) {
        for (var i = 0; i < tubeWorms.length; i++) {
            var tw = tubeWorms[i];
            var sp = tw.sprite;
            if (!sp) continue;
            // Animate scale Y to simulate fan retraction
            sp.scale.y = tw.baseScale * tw.fanHeight;
            // Slight sway
            var sway = Math.sin(time * 2 + tw.phase) * 0.02;
            sp.rotation = sway;
        }
    }

    function updateTubeWorms(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < tubeWorms.length; i++) {
            var tw = tubeWorms[i];
            if (tw.retractTimer > 0) {
                tw.retractTimer -= dtSec;
                tw.fanHeight = Math.max(0, tw.retractTimer / 3);
                if (tw.retractTimer <= 0) { tw.retractTimer = 0; tw.fanHeight = 0; }
            } else if (tw.fanHeight < 1) {
                tw.fanHeight += dtSec * 0.33;
                if (tw.fanHeight > 1) tw.fanHeight = 1;
            }
        }
    }

    // =========================================================================
    // Hermit Crabs (interactive — hide in shell on tap)
    // =========================================================================

    var hermitCrabs = [];
    function initHermitCrabs() {
        hermitCrabs = [];
        for (var i = 0; i < HERMIT_CRAB_COUNT; i++) {
            var hcx = W * (0.1 + Math.random() * 0.8);
            hermitCrabs.push({
                x: hcx,
                y: seafloorY(hcx) - 2,
                dir: Math.random() > 0.5 ? 1 : -1,
                speed: 0.02 + Math.random() * 0.02,
                shellSize: 6 + Math.random() * 3,
                shellColor: 0xc0a080 + Math.floor(Math.random() * 0x202010),
                legPhase: Math.random() * Math.PI * 2,
                hideTimer: 0,
                legEmergePhase: 4 // 0-3 = legs emerging one by one, 4 = all out
            });
        }
    }
    initHermitCrabs();

    function drawHermitCrabs(time) {
        var g = hermitCrabGraphics;
        g.clear();
        for (var i = 0; i < hermitCrabs.length; i++) {
            var hc = hermitCrabs[i];
            var ss = hc.shellSize;
            // Shell (always visible)
            g.beginFill(hc.shellColor, 0.8);
            g.drawEllipse(hc.x, hc.y - ss * 0.4, ss, ss * 0.6);
            g.endFill();
            // Shell spiral line
            g.lineStyle(0.5, 0x806040, 0.4);
            for (var a = 0; a < 4; a++) {
                var ang = a * 1.5 + 0.5;
                var rad = ss * 0.15 * (1 + a * 0.2);
                g.drawCircle(hc.x + Math.cos(ang) * rad * 0.3, hc.y - ss * 0.4 + Math.sin(ang) * rad * 0.2, rad * 0.3);
            }
            g.lineStyle(0);
            // Legs (only if not fully hidden)
            if (hc.legEmergePhase > 0) {
                var numLegsVisible = Math.min(4, Math.floor(hc.legEmergePhase));
                var legWalk = Math.sin(time * 3 + hc.legPhase);
                g.lineStyle(0.8, 0x804020, 0.6);
                for (var leg = 0; leg < numLegsVisible; leg++) {
                    var legX = hc.x + (leg - 1.5) * 2.5 * hc.dir;
                    var legOff = Math.sin(time * 3 + hc.legPhase + leg * 1.2) * 1.5;
                    g.moveTo(legX, hc.y);
                    g.lineTo(legX + legOff, hc.y + 3);
                }
                g.lineStyle(0);
                // Eyes (tiny dots at front)
                if (numLegsVisible >= 2) {
                    g.beginFill(0x101010, 0.8);
                    g.drawCircle(hc.x + hc.dir * ss * 0.8, hc.y - ss * 0.5, 0.8);
                    g.drawCircle(hc.x + hc.dir * ss * 0.8, hc.y - ss * 0.3, 0.8);
                    g.endFill();
                }
            }
        }
    }

    function updateHermitCrabs(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < hermitCrabs.length; i++) {
            var hc = hermitCrabs[i];
            if (hc.hideTimer > 0) {
                hc.hideTimer -= dtSec;
                if (hc.hideTimer <= 0) {
                    hc.hideTimer = 0;
                    hc.legEmergePhase = 0;
                }
            } else if (hc.legEmergePhase < 4) {
                hc.legEmergePhase += dtSec * 1.3;
                if (hc.legEmergePhase > 4) hc.legEmergePhase = 4;
            } else {
                // Walk slowly
                hc.x += hc.speed * hc.dir * dt;
                if (hc.x < 15 || hc.x > W - 15) hc.dir *= -1;
            }
            // Track terrain as hermit crab walks
            hc.y = seafloorY(hc.x) - 2;
        }
    }

    // =========================================================================
    // Sea Cucumbers (interactive — contract on tap)
    // =========================================================================

    var seaCucumbers = [];
    function initSeaCucumbers() {
        seaCucumbers = [];
        for (var i = 0; i < SEA_CUCUMBER_COUNT; i++) {
            var scx = W * (0.1 + Math.random() * 0.8);
            seaCucumbers.push({
                x: scx,
                y: seafloorY(scx) - 2,
                length: 18 + Math.random() * 10,
                height: 5 + Math.random() * 3,
                color: 0x504030 + Math.floor(Math.random() * 0x202010),
                dir: Math.random() > 0.5 ? 1 : -1,
                contractTimer: 0,
                contractAmount: 0
            });
        }
    }
    initSeaCucumbers();

    function drawSeaCucumbers(time) {
        var g = seaCucumberGraphics;
        g.clear();
        for (var i = 0; i < seaCucumbers.length; i++) {
            var sc = seaCucumbers[i];
            var len = sc.length * (1 - sc.contractAmount * 0.4);
            var h = sc.height * (1 + sc.contractAmount * 0.3);
            g.beginFill(sc.color, 0.75);
            // Body with bumps along top
            g.moveTo(sc.x - len * 0.5, sc.y);
            for (var bx = 0; bx <= 8; bx++) {
                var frac = bx / 8;
                var bpx = sc.x - len * 0.5 + frac * len;
                var bump = Math.sin(frac * Math.PI * 4 + time * 0.5) * h * 0.15;
                var envelope = Math.sin(frac * Math.PI);
                g.lineTo(bpx, sc.y - h * envelope - bump);
            }
            g.lineTo(sc.x + len * 0.5, sc.y);
            g.closePath();
            g.endFill();
        }
    }

    function updateSeaCucumbers(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < seaCucumbers.length; i++) {
            var sc = seaCucumbers[i];
            if (sc.contractTimer > 0) {
                sc.contractTimer -= dtSec;
                sc.contractAmount = Math.min(1, sc.contractTimer / 2);
                if (sc.contractTimer <= 0) { sc.contractTimer = 0; sc.contractAmount = 0; }
            } else {
                // Inch along slowly
                sc.x += 0.05 * sc.dir * dt;
                if (sc.x < 20 || sc.x > W - 20) sc.dir *= -1;
            }
            // Track terrain as sea cucumber inches along
            sc.y = seafloorY(sc.x) - 2;
        }
    }

    // =========================================================================
    // Octopus (1 instance — SIGNATURE CREATURE)
    // =========================================================================

    var octopus = {
        x: 0, y: 0, targetX: 0, targetY: 0,
        bodyRadius: 25,
        color: 0x8b4060,
        tentacles: [],
        breathPhase: 0,
        inkParticles: [],
        jetTimer: 0,
        camoColor: 0x8b4060,
        camoBlend: 0,
        eyeTrackX: 0, eyeTrackY: 0
    };

    function initOctopus() {
        octopus.x = W * (0.2 + Math.random() * 0.6);
        octopus.y = H * 0.75 + Math.random() * (H * 0.15);
        octopus.targetX = octopus.x;
        octopus.targetY = octopus.y;
        octopus.tentacles = [];
        for (var t = 0; t < 8; t++) {
            octopus.tentacles.push({
                angle: (t / 8) * Math.PI * 2,
                phase: Math.random() * Math.PI * 2,
                freq: 0.8 + Math.random() * 0.6,
                length: 30 + Math.random() * 15
            });
        }
        octopus.inkParticles = [];
        for (var ip = 0; ip < 25; ip++) {
            octopus.inkParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0 });
        }
        octopus.jetTimer = 0;
        octopus.camoBlend = 0;
        octopus.eyeTrackX = octopus.x;
        octopus.eyeTrackY = octopus.y - 20;
    }
    initOctopus();

    function drawOctopus(time) {
        var g = octopusGraphics;
        g.clear();
        var oc = octopus;
        var breath = 1 + Math.sin(time * 1.2 + oc.breathPhase) * 0.05;
        var br = oc.bodyRadius * breath;
        // Blend camo color
        var bodyColor = oc.color;
        if (oc.camoBlend > 0.1) {
            var r1 = (bodyColor >> 16) & 0xff, g1 = (bodyColor >> 8) & 0xff, b1 = bodyColor & 0xff;
            var r2 = (oc.camoColor >> 16) & 0xff, g2 = (oc.camoColor >> 8) & 0xff, b2 = oc.camoColor & 0xff;
            var bl = oc.camoBlend;
            bodyColor = (Math.floor(r1 + (r2 - r1) * bl) << 16) | (Math.floor(g1 + (g2 - g1) * bl) << 8) | Math.floor(b1 + (b2 - b1) * bl);
        }
        // Tentacles
        for (var t = 0; t < oc.tentacles.length; t++) {
            var te = oc.tentacles[t];
            var baseAng = te.angle;
            var curl1 = Math.sin(time * te.freq + te.phase) * 0.3;
            var curl2 = Math.sin(time * te.freq * 0.7 + te.phase + 1) * 0.5;
            var tx1 = oc.x + Math.cos(baseAng) * br;
            var ty1 = oc.y + Math.sin(baseAng) * br;
            var midAng = baseAng + curl1;
            var tx2 = tx1 + Math.cos(midAng) * te.length * 0.5;
            var ty2 = ty1 + Math.sin(midAng) * te.length * 0.5;
            var endAng = midAng + curl2;
            var tx3 = tx2 + Math.cos(endAng) * te.length * 0.5;
            var ty3 = ty2 + Math.sin(endAng) * te.length * 0.5;
            g.lineStyle(3, bodyColor, 0.6);
            g.moveTo(tx1, ty1);
            g.bezierCurveTo(tx1 + (tx2 - tx1) * 0.5, ty1 + (ty2 - ty1) * 0.5, tx2, ty2, tx3, ty3);
            // Suckers
            g.lineStyle(0);
            g.beginFill(bodyColor, 0.3);
            g.drawCircle(tx2, ty2, 1.2);
            g.endFill();
        }
        g.lineStyle(0);
        // Body (mantle)
        g.beginFill(bodyColor, 0.8);
        g.drawEllipse(oc.x, oc.y - br * 0.2, br * 0.8, br);
        g.endFill();
        // Eyes
        var eyeDx = (oc.eyeTrackX - oc.x) * 0.02;
        var eyeDy = (oc.eyeTrackY - oc.y) * 0.02;
        eyeDx = Math.max(-2, Math.min(2, eyeDx));
        eyeDy = Math.max(-2, Math.min(2, eyeDy));
        g.beginFill(0xf0e8d0, 0.9);
        g.drawEllipse(oc.x - 8, oc.y - br * 0.3, 4, 5);
        g.drawEllipse(oc.x + 8, oc.y - br * 0.3, 4, 5);
        g.endFill();
        g.beginFill(0x101020, 1);
        g.drawCircle(oc.x - 8 + eyeDx, oc.y - br * 0.3 + eyeDy, 2);
        g.drawCircle(oc.x + 8 + eyeDx, oc.y - br * 0.3 + eyeDy, 2);
        g.endFill();
        // Ink particles
        for (var ip = 0; ip < oc.inkParticles.length; ip++) {
            var ink = oc.inkParticles[ip];
            if (!ink.active) continue;
            g.beginFill(0x101018, 0.4 * Math.min(ink.life, 1));
            g.drawCircle(ink.x, ink.y, ink.size);
            g.endFill();
        }
    }

    function updateOctopus(dt) {
        var dtSec = dt / 60;
        var oc = octopus;
        oc.breathPhase += dtSec;
        // Jet movement
        if (oc.jetTimer > 0) {
            oc.jetTimer -= dtSec;
            var speed = 3 * dt;
            var dx = oc.targetX - oc.x;
            var dy = oc.targetY - oc.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 2) {
                oc.x += (dx / dist) * speed;
                oc.y += (dy / dist) * speed;
            }
        } else {
            // Slow idle drift
            oc.x += Math.sin(animTime * 0.2) * 0.05 * dt;
            oc.y += Math.cos(animTime * 0.15) * 0.03 * dt;
        }
        // Camouflage: find nearest coral
        var nearestCoralDist = 9999;
        var nearestCoralColor = oc.color;
        for (var ci = 0; ci < corals.length; ci++) {
            var cd = Math.sqrt(Math.pow(oc.x - corals[ci].x, 2) + Math.pow(oc.y - corals[ci].y, 2));
            if (cd < nearestCoralDist) {
                nearestCoralDist = cd;
                nearestCoralColor = corals[ci].type.color;
            }
        }
        if (oc.jetTimer <= 0 && nearestCoralDist < 150) {
            oc.camoBlend = Math.min(1, oc.camoBlend + dtSec * 0.1);
            oc.camoColor = nearestCoralColor;
        } else {
            oc.camoBlend = Math.max(0, oc.camoBlend - dtSec * 0.3);
        }
        // Eye tracking
        oc.eyeTrackX += (lastTapX - oc.eyeTrackX) * 0.02;
        oc.eyeTrackY += (lastTapY - oc.eyeTrackY) * 0.02;
        // Ink particles
        for (var ip = 0; ip < oc.inkParticles.length; ip++) {
            var ink = oc.inkParticles[ip];
            if (!ink.active) continue;
            ink.x += ink.vx * dt;
            ink.y += ink.vy * dt;
            ink.life -= dtSec * 0.5;
            ink.size += dtSec * 2;
            if (ink.life <= 0) ink.active = false;
        }
        // Keep in bounds
        oc.x = Math.max(40, Math.min(W - 40, oc.x));
        oc.y = Math.max(H * 0.4, Math.min(H - 30, oc.y));
    }

    function triggerOctopusInk() {
        var oc = octopus;
        // Spawn ink cloud
        for (var ip = 0; ip < oc.inkParticles.length; ip++) {
            var ink = oc.inkParticles[ip];
            if (ink.active) continue;
            ink.active = true;
            ink.x = oc.x + (Math.random() - 0.5) * 10;
            ink.y = oc.y + (Math.random() - 0.5) * 10;
            ink.vx = (Math.random() - 0.5) * 1.5;
            ink.vy = (Math.random() - 0.5) * 1.5 - 0.3;
            ink.life = 1.5 + Math.random();
            ink.size = 3 + Math.random() * 4;
        }
        // Jet to new position near a random coral
        var ci = Math.floor(Math.random() * corals.length);
        if (corals.length > 0) {
            oc.targetX = corals[ci].x + (Math.random() - 0.5) * 60;
            oc.targetY = corals[ci].y - 30 - Math.random() * 40;
        } else {
            oc.targetX = W * (0.2 + Math.random() * 0.6);
            oc.targetY = H * 0.65 + Math.random() * (H * 0.2);
        }
        oc.jetTimer = 2;
        oc.camoBlend = 0;
    }

    // =========================================================================
    // Moray Eel (1-2 instances, head emerging from crevice)
    // =========================================================================

    var morays = [];
    function initMorayEel() {
        morays = [];
        var count = 1 + Math.floor(Math.random() * 2);
        for (var i = 0; i < count; i++) {
            // Position near a coral
            var cx = W * (0.15 + Math.random() * 0.7);
            var cy = H - 10 - Math.random() * 20;
            morays.push({
                x: cx, y: cy,
                dir: Math.random() > 0.5 ? 1 : -1,
                bodyLength: 40 + Math.random() * 20,
                visibleFrac: 0.33,
                mouthOpen: 0,
                mouthPhase: Math.random() * Math.PI * 2,
                lungeTimer: 0,
                emergeTimer: 30 + Math.random() * 30,
                swimming: false,
                swimX: cx, swimY: cy, swimPhase: 0,
                color: 0x405030 + Math.floor(Math.random() * 0x101008)
            });
        }
    }
    initMorayEel();

    function drawMorayEel(time) {
        var g = morayEelGraphics;
        g.clear();
        for (var i = 0; i < morays.length; i++) {
            var m = morays[i];
            var visLen = m.bodyLength * m.visibleFrac;
            var headX = m.x + m.dir * visLen;
            var headY = m.y;
            if (m.swimming) {
                headX = m.swimX;
                headY = m.swimY;
            }
            // Dark crevice
            if (!m.swimming) {
                g.beginFill(0x0a0a10, 0.6);
                g.drawEllipse(m.x, m.y, 8, 5);
                g.endFill();
            }
            // Body segments (sinuous)
            var segs = 8;
            g.lineStyle(6, m.color, 0.8);
            g.moveTo(m.x, m.y);
            for (var s = 1; s <= segs; s++) {
                var frac = s / segs;
                if (!m.swimming && frac > m.visibleFrac + (m.lungeTimer > 0 ? 0.3 : 0)) break;
                var sx = m.x + m.dir * frac * m.bodyLength;
                var sy = m.y + Math.sin(time * 2 + frac * 4 + m.mouthPhase) * 3;
                if (m.swimming) {
                    sx = m.swimX - m.dir * (1 - frac) * m.bodyLength;
                    sy = m.swimY + Math.sin(time * 3 + frac * 6) * 5;
                }
                g.lineTo(sx, sy);
            }
            g.lineStyle(0);
            // Head
            g.beginFill(m.color, 0.9);
            g.drawEllipse(headX, headY, 5, 4);
            g.endFill();
            // Mouth
            var mouthAng = m.mouthOpen * 0.3 + Math.sin(time * 1.5 + m.mouthPhase) * 0.08;
            g.lineStyle(1, 0x202010, 0.7);
            g.moveTo(headX + m.dir * 5, headY - mouthAng * 8);
            g.lineTo(headX + m.dir * 8, headY);
            g.lineTo(headX + m.dir * 5, headY + mouthAng * 8);
            g.lineStyle(0);
            // Eye
            g.beginFill(0xd0d040, 0.9);
            g.drawCircle(headX + m.dir * 2, headY - 2, 1.5);
            g.endFill();
            g.beginFill(0x101010, 1);
            g.drawCircle(headX + m.dir * 2.3, headY - 2, 0.8);
            g.endFill();
        }
    }

    function updateMorayEel(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < morays.length; i++) {
            var m = morays[i];
            // Lunge reaction
            if (m.lungeTimer > 0) {
                m.lungeTimer -= dtSec;
                m.mouthOpen = Math.min(1, m.lungeTimer);
                if (m.lungeTimer <= 0) { m.lungeTimer = 0; m.mouthOpen = 0; }
            }
            // Emerge timer (periodic swim)
            if (!m.swimming) {
                m.emergeTimer -= dtSec;
                if (m.emergeTimer <= 0) {
                    m.swimming = true;
                    m.swimX = m.x;
                    m.swimY = m.y;
                    m.swimPhase = 0;
                }
            } else {
                m.swimPhase += dtSec;
                // Short loop: swim out, arc, come back
                var loopTime = 8;
                var frac = m.swimPhase / loopTime;
                if (frac >= 1) {
                    m.swimming = false;
                    m.emergeTimer = 30 + Math.random() * 30;
                } else {
                    var angle = frac * Math.PI * 2;
                    m.swimX = m.x + Math.cos(angle) * 60 * m.dir;
                    m.swimY = m.y - Math.sin(angle) * 30;
                }
            }
        }
    }

    // =========================================================================
    // Electric Eel (1 instance — swims horizontally)
    // =========================================================================

    var electricEel = {
        x: 0, y: 0, dir: 1, speed: 0.3,
        bodyLength: 80,
        color: 0x304050,
        pulsePhase: 0,
        zapTimer: 0,
        zapBranches: []
    };

    function initElectricEel() {
        electricEel.dir = Math.random() > 0.5 ? 1 : -1;
        electricEel.x = electricEel.dir > 0 ? -100 : W + 100;
        electricEel.y = H * (0.5 + Math.random() * 0.25);
        electricEel.zapTimer = 0;
        electricEel.zapBranches = [];
    }
    initElectricEel();

    function drawElectricEel(time) {
        var g = electricEelGraphics;
        g.clear();
        var ee = electricEel;
        var glow = ee.zapTimer > 0 ? 0.4 : 0;
        // Body (elongated, segmented)
        var segs = 12;
        for (var s = 0; s < segs; s++) {
            var frac = s / segs;
            var sx = ee.x - ee.dir * frac * ee.bodyLength;
            var sy = ee.y + Math.sin(time * 2 + frac * 5) * 3;
            var thickness = (1 - Math.abs(frac - 0.3) * 1.2) * 5;
            if (thickness < 1) thickness = 1;
            // Traveling electric pulse
            var pulse = Math.sin(time * 8 - frac * 6 + ee.pulsePhase) * 0.15;
            var bright = Math.max(0, pulse);
            var segColor = ee.color;
            if (bright > 0 || glow > 0) {
                var r = ((segColor >> 16) & 0xff) + Math.floor((bright + glow) * 100);
                var gr = ((segColor >> 8) & 0xff) + Math.floor((bright + glow) * 150);
                var b = (segColor & 0xff) + Math.floor((bright + glow) * 200);
                r = Math.min(255, r); gr = Math.min(255, gr); b = Math.min(255, b);
                segColor = (r << 16) | (gr << 8) | b;
            }
            g.beginFill(segColor, 0.85);
            g.drawEllipse(sx, sy, thickness, thickness * 0.6);
            g.endFill();
        }
        // Head
        var headX = ee.x;
        var headY = ee.y;
        g.beginFill(ee.color, 0.9);
        g.drawEllipse(headX + ee.dir * 3, headY, 5, 3.5);
        g.endFill();
        // Eye
        g.beginFill(0xe0e0a0, 0.9);
        g.drawCircle(headX + ee.dir * 5, headY - 1, 1.2);
        g.endFill();
        // Zap effect
        if (ee.zapTimer > 0) {
            g.lineStyle(1, 0x80e0ff, 0.6 * Math.min(ee.zapTimer * 2, 1));
            for (var zi = 0; zi < ee.zapBranches.length; zi++) {
                var zb = ee.zapBranches[zi];
                g.moveTo(zb[0].x, zb[0].y);
                for (var zp = 1; zp < zb.length; zp++) {
                    g.lineTo(zb[zp].x, zb[zp].y);
                }
            }
            g.lineStyle(0);
        }
    }

    function updateElectricEel(dt) {
        var dtSec = dt / 60;
        var ee = electricEel;
        ee.x += ee.speed * ee.dir * dt;
        ee.pulsePhase += dtSec;
        // Reverse at edges
        if (ee.dir > 0 && ee.x > W + 120) { ee.dir = -1; ee.y = H * (0.5 + Math.random() * 0.25); }
        if (ee.dir < 0 && ee.x < -120) { ee.dir = 1; ee.y = H * (0.5 + Math.random() * 0.25); }
        // Zap countdown
        if (ee.zapTimer > 0) {
            ee.zapTimer -= dtSec;
            if (ee.zapTimer <= 0) { ee.zapTimer = 0; ee.zapBranches = []; }
        }
    }

    function triggerElectricZap() {
        var ee = electricEel;
        ee.zapTimer = 0.8;
        // Generate lightning branches
        ee.zapBranches = [];
        var numBranches = 5 + Math.floor(Math.random() * 4);
        for (var bi = 0; bi < numBranches; bi++) {
            var branch = [];
            var bx = ee.x, by = ee.y;
            var angle = Math.random() * Math.PI * 2;
            var len = 20 + Math.random() * 30;
            var steps = 4 + Math.floor(Math.random() * 3);
            branch.push({ x: bx, y: by });
            for (var s = 0; s < steps; s++) {
                angle += (Math.random() - 0.5) * 1.2;
                bx += Math.cos(angle) * (len / steps);
                by += Math.sin(angle) * (len / steps);
                branch.push({ x: bx, y: by });
            }
            ee.zapBranches.push(branch);
        }
        // Spawn bioluminescence and startle fish
        spawnBioluminescence(ee.x, ee.y);
        startleFish(ee.x, ee.y);
    }

    // =========================================================================
    // Seahorse Babies (tiny, anchored to seaweed)
    // =========================================================================

    var seahorseBabies = [];
    function initSeahorseBabies() {
        // Remove old sprites
        while (seahorseContainer.children.length > 0) {
            seahorseContainer.removeChildAt(0);
        }
        seahorseBabies = [];
        for (var i = 0; i < SEAHORSE_BABY_COUNT; i++) {
            var swIdx = Math.floor(Math.random() * Math.max(1, seaweeds.length));
            var sp = new PIXI.Sprite(creatureTextures.seahorse);
            sp.anchor.set(0.5, 0.5);
            var baseScale = 0.35 + Math.random() * 0.15;
            sp.scale.set(baseScale);
            seahorseContainer.addChild(sp);
            seahorseBabies.push({
                attachedSeaweedIdx: swIdx,
                attachFrac: 0.4 + Math.random() * 0.4,
                size: 6 + Math.random() * 2,
                color: 0xd0a040 + Math.floor(Math.random() * 0x203020),
                dorFinPhase: Math.random() * Math.PI * 2,
                detachTimer: 0,
                floatY: 0,
                dir: Math.random() > 0.5 ? 1 : -1,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initSeahorseBabies();

    function drawSeahorseBabies(time) {
        for (var i = 0; i < seahorseBabies.length; i++) {
            var sh = seahorseBabies[i];
            var sp = sh.sprite;
            if (!sp) continue;
            var sx, sy;
            if (sh.detachTimer > 0) {
                sx = sh.floatX || 0;
                sy = sh.floatY || 0;
            } else if (seaweeds.length > 0) {
                var sw = seaweeds[sh.attachedSeaweedIdx % seaweeds.length];
                sx = sw.xFrac * W + Math.sin(time * sw.swayFreq + sw.phase) * sw.swayAmp * sh.attachFrac;
                sy = H - sw.baseHeight * sh.attachFrac;
            } else {
                sx = W * 0.5;
                sy = H * 0.5;
            }
            sp.position.set(sx, sy);
            sp.scale.x = sh.dir > 0 ? sh.baseScale : -sh.baseScale;
            // Gentle bob
            sp.rotation = Math.sin(time * 0.5 + i) * 0.1;
        }
    }

    function updateSeahorseBabies(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < seahorseBabies.length; i++) {
            var sh = seahorseBabies[i];
            if (sh.detachTimer > 0) {
                sh.detachTimer -= dtSec;
                sh.floatY -= 0.5 * dt;
                sh.floatX += Math.sin(animTime * 2 + i) * 0.3 * dt;
                if (sh.detachTimer <= 0) {
                    sh.detachTimer = 0;
                    sh.attachedSeaweedIdx = Math.floor(Math.random() * Math.max(1, seaweeds.length));
                    sh.attachFrac = 0.3 + Math.random() * 0.5;
                }
            }
        }
    }

    // =========================================================================
    // Cleaner Shrimp Station (1-2 instances)
    // =========================================================================

    var cleanerShrimps = [];
    // Overlay Graphics for cleaning fish (kept as Graphics since it's a separate animated element)
    var cleanerShrimpOverlayGfx = new PIXI.Graphics();
    cleanerShrimpContainer.addChild(cleanerShrimpOverlayGfx);

    function initCleanerShrimp() {
        // Remove old sprites (keep overlay graphics at end)
        while (cleanerShrimpContainer.children.length > 1) {
            cleanerShrimpContainer.removeChildAt(0);
        }
        cleanerShrimps = [];
        for (var i = 0; i < CLEANER_SHRIMP_COUNT; i++) {
            var cx = W * (0.15 + Math.random() * 0.7);
            var cy = H - 20 - Math.random() * 30;
            var sp = new PIXI.Sprite(creatureTextures.cleanerShrimp);
            sp.anchor.set(0.5, 0.5);
            var baseScale = 0.6 + Math.random() * 0.2;
            sp.scale.set(baseScale);
            sp.position.set(cx, cy);
            cleanerShrimpContainer.addChildAt(sp, cleanerShrimpContainer.children.length - 1);
            cleanerShrimps.push({
                x: cx, y: cy,
                size: 8 + Math.random() * 2,
                antennaPhase: Math.random() * Math.PI * 2,
                antennaSpeed: 4 + Math.random() * 2,
                danceTimer: 0,
                cleanTimer: 15 + Math.random() * 5,
                cleaning: false,
                cleanFishX: 0, cleanFishY: 0, cleanPhase: 0,
                sprite: sp,
                baseScale: baseScale,
            });
        }
    }
    initCleanerShrimp();

    function drawCleanerShrimp(time) {
        cleanerShrimpOverlayGfx.clear();
        for (var i = 0; i < cleanerShrimps.length; i++) {
            var cs = cleanerShrimps[i];
            var sp = cs.sprite;
            if (!sp) continue;
            var danceOff = cs.danceTimer > 0 ? Math.sin(time * 12) * 2 : 0;
            sp.position.set(cs.x + danceOff, cs.y);
            sp.rotation = cs.danceTimer > 0 ? Math.sin(time * 8) * 0.1 : 0;
            // Cleaning animation: draw small fish nearby (uses overlay graphics)
            if (cs.cleaning) {
                var cfx = cs.cleanFishX;
                var cfy = cs.cleanFishY;
                cleanerShrimpOverlayGfx.beginFill(0x80a0c0, 0.5);
                cleanerShrimpOverlayGfx.drawEllipse(cfx, cfy, 12, 5);
                cleanerShrimpOverlayGfx.endFill();
                cleanerShrimpOverlayGfx.beginFill(0x80a0c0, 0.4);
                cleanerShrimpOverlayGfx.moveTo(cfx - 12, cfy);
                cleanerShrimpOverlayGfx.lineTo(cfx - 18, cfy - 4);
                cleanerShrimpOverlayGfx.lineTo(cfx - 18, cfy + 4);
                cleanerShrimpOverlayGfx.closePath();
                cleanerShrimpOverlayGfx.endFill();
            }
        }
    }

    function updateCleanerShrimp(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < cleanerShrimps.length; i++) {
            var cs = cleanerShrimps[i];
            if (cs.danceTimer > 0) {
                cs.danceTimer -= dtSec;
                if (cs.danceTimer < 0) cs.danceTimer = 0;
            }
            if (cs.cleaning) {
                cs.cleanPhase += dtSec;
                // Shrimp moves along the fish body
                cs.x = cs.cleanFishX - 10 + Math.sin(cs.cleanPhase * 2) * 8;
                if (cs.cleanPhase > 3) {
                    cs.cleaning = false;
                    cs.cleanTimer = 15 + Math.random() * 5;
                }
            } else {
                cs.cleanTimer -= dtSec;
                if (cs.cleanTimer <= 0) {
                    cs.cleaning = true;
                    cs.cleanPhase = 0;
                    cs.cleanFishX = cs.x + (Math.random() - 0.5) * 30;
                    cs.cleanFishY = cs.y - 5 - Math.random() * 10;
                }
            }
        }
    }

    // =========================================================================
    // Lionfish (1 instance — dramatic fan fins)
    // =========================================================================

    var lionfish = {
        x: 0, y: 0, dir: 1, speed: 0.15,
        bodySize: 30,
        displayTimer: 0,
        finSpread: 1,
        phase: 0,
        sprite: null,
    };

    function initLionfish() {
        lionfish.dir = Math.random() > 0.5 ? 1 : -1;
        lionfish.x = lionfish.dir > 0 ? -60 : W + 60;
        lionfish.y = H * (0.30 + Math.random() * 0.20);
        lionfish.displayTimer = 0;
        lionfish.finSpread = 1;
        if (!lionfish.sprite) {
            var sp = new PIXI.Sprite(creatureTextures.lionfish);
            sp.anchor.set(0.46, 0.51);
            sp.scale.set(1.2);
            lionfishContainer.addChild(sp);
            lionfish.sprite = sp;
        }
    }
    initLionfish();

    function drawLionfish(time) {
        var lf = lionfish;
        var sp = lf.sprite;
        if (!sp) return;
        sp.position.set(lf.x, lf.y);
        // Flip based on direction; scale up slightly during display
        var displayScale = 1.2 * lf.finSpread;
        sp.scale.x = lf.dir > 0 ? displayScale : -displayScale;
        sp.scale.y = displayScale;
    }

    function updateLionfish(dt) {
        var dtSec = dt / 60;
        var lf = lionfish;
        lf.x += lf.speed * lf.dir * dt;
        lf.y += Math.sin(animTime * 0.3 + lf.phase) * 0.08 * dt;
        lf.phase += dtSec;
        // Reverse at edges
        if (lf.dir > 0 && lf.x > W + 80) { lf.dir = -1; lf.y = H * (0.30 + Math.random() * 0.20); }
        if (lf.dir < 0 && lf.x < -80) { lf.dir = 1; lf.y = H * (0.30 + Math.random() * 0.20); }
        // Display timer
        if (lf.displayTimer > 0) {
            lf.displayTimer -= dtSec;
            lf.finSpread = 1.5;
            if (lf.displayTimer <= 0) { lf.displayTimer = 0; }
        } else {
            lf.finSpread += (1 - lf.finSpread) * dtSec * 0.8;
        }
    }

    // =========================================================================
    // Nudibranch (2-3 tiny colorful sea slugs)
    // =========================================================================

    var nudibranchs = [];
    var NUDIBRANCH_COLORS = [0xff40a0, 0x40a0ff, 0xff8020];
    // Overlay Graphics for color puff particles
    var nudibranchPuffGfx = new PIXI.Graphics();
    nudibranchContainer.addChild(nudibranchPuffGfx);

    function initNudibranch() {
        // Remove old sprites (keep puff overlay)
        while (nudibranchContainer.children.length > 1) {
            nudibranchContainer.removeChildAt(0);
        }
        nudibranchs = [];
        for (var i = 0; i < NUDIBRANCH_COUNT; i++) {
            var sp = new PIXI.Sprite(creatureTextures.nudibranch);
            sp.anchor.set(0.5, 0.57);
            var baseScale = 0.25 + Math.random() * 0.15;
            sp.scale.set(baseScale);
            var xPos = W * (0.1 + Math.random() * 0.8);
            var yPos = seafloorY(xPos) - 10 - Math.random() * 30;
            sp.position.set(xPos, yPos);
            nudibranchContainer.addChildAt(sp, nudibranchContainer.children.length - 1);
            nudibranchs.push({
                x: xPos,
                y: yPos,
                dir: Math.random() > 0.5 ? 1 : -1,
                speed: 0.01 + Math.random() * 0.01,
                size: 10 + Math.random() * 5,
                color: NUDIBRANCH_COLORS[i % NUDIBRANCH_COLORS.length],
                curlTimer: 0,
                colorParticles: [],
                sprite: sp,
                baseScale: baseScale,
            });
            for (var p = 0; p < 5; p++) {
                nudibranchs[i].colorParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0 });
            }
        }
    }
    initNudibranch();

    function drawNudibranch(time) {
        nudibranchPuffGfx.clear();
        for (var i = 0; i < nudibranchs.length; i++) {
            var nb = nudibranchs[i];
            var sp = nb.sprite;
            if (!sp) continue;
            var curl = nb.curlTimer > 0 ? Math.min(1, nb.curlTimer) : 0;
            sp.position.set(nb.x, nb.y);
            sp.scale.x = nb.dir > 0 ? nb.baseScale * (1 - curl * 0.3) : -nb.baseScale * (1 - curl * 0.3);
            sp.scale.y = nb.baseScale * (1 + curl * 0.3);
            // Color puff particles (overlay graphics)
            for (var p = 0; p < nb.colorParticles.length; p++) {
                var cp = nb.colorParticles[p];
                if (!cp.active) continue;
                nudibranchPuffGfx.beginFill(nb.color, 0.4 * Math.max(0, cp.life));
                nudibranchPuffGfx.drawCircle(cp.x, cp.y, cp.size);
                nudibranchPuffGfx.endFill();
            }
        }
    }

    function updateNudibranch(dt) {
        var dtSec = dt / 60;
        for (var i = 0; i < nudibranchs.length; i++) {
            var nb = nudibranchs[i];
            if (nb.curlTimer > 0) {
                nb.curlTimer -= dtSec;
                if (nb.curlTimer < 0) nb.curlTimer = 0;
            } else {
                // Crawl slowly
                nb.x += nb.speed * nb.dir * dt;
                if (nb.x < 15 || nb.x > W - 15) nb.dir *= -1;
            }
            // Update color particles
            for (var p = 0; p < nb.colorParticles.length; p++) {
                var cp = nb.colorParticles[p];
                if (!cp.active) continue;
                cp.x += cp.vx * dt;
                cp.y += cp.vy * dt;
                cp.life -= dtSec * 0.7;
                if (cp.life <= 0) cp.active = false;
            }
        }
    }

    // =========================================================================
    // Manta Ray (1 instance, always visible)
    // =========================================================================

    var manta = {
        x: -200, y: 0,
        targetY: 0,
        speed: 0,
        dir: 1,
        wingPhase: 0,
        crossingTime: 40,
        startTime: 0,
        rollTimer: 0,
        rollAngle: 0,
        trailParticles: [],
    };

    function initManta() {
        manta.dir = Math.random() > 0.5 ? 1 : -1;
        manta.x = manta.dir > 0 ? -250 : W + 250;
        manta.y = H * (0.2 + Math.random() * 0.3);
        manta.targetY = manta.y;
        manta.speed = (W + 500) / (manta.crossingTime * 60);
        manta.startTime = animTime;
        manta.wingPhase = Math.random() * Math.PI * 2;
        manta.trailParticles = [];
    }
    initManta();

    function drawManta(time) {
        var g = mantaGraphics;
        g.clear();
        var m = manta;
        var wingFlap = Math.sin(time * 1.6 + m.wingPhase) * 0.4;
        var wingTipY = wingFlap * 25;
        var bodyX = m.x;
        var bodyY = m.y + Math.sin(time * 0.3) * 8;

        g.alpha = 0.35;

        // Barrel roll rotation
        var rollCos = 1, rollSin = 0;
        if (m.rollTimer > 0) {
            m.rollAngle = (1 - m.rollTimer / 2) * Math.PI * 2;
            rollCos = Math.cos(m.rollAngle);
            rollSin = Math.sin(m.rollAngle);
        }

        function txM(px, py) { return bodyX + px * m.dir * rollCos - py * rollSin; }
        function tyM(px, py) { return bodyY + px * m.dir * rollSin + py * rollCos; }

        // Body - diamond/wing shape
        var wingSpan = 60;
        var bodyLen = 40;
        g.beginFill(0x1a3050, 0.9);

        // Front point
        g.moveTo(txM(bodyLen * 0.6, 0), tyM(bodyLen * 0.6, 0));
        // Right wing tip
        g.quadraticCurveTo(txM(bodyLen * 0.2, -wingSpan * 0.6), tyM(bodyLen * 0.2, -wingSpan * 0.6),
                           txM(-bodyLen * 0.1, -wingSpan + wingTipY), tyM(-bodyLen * 0.1, -wingSpan + wingTipY));
        // Right wing back
        g.quadraticCurveTo(txM(-bodyLen * 0.3, -wingSpan * 0.5), tyM(-bodyLen * 0.3, -wingSpan * 0.5),
                           txM(-bodyLen * 0.5, 0), tyM(-bodyLen * 0.5, 0));
        // Left wing back
        g.quadraticCurveTo(txM(-bodyLen * 0.3, wingSpan * 0.5), tyM(-bodyLen * 0.3, wingSpan * 0.5),
                           txM(-bodyLen * 0.1, wingSpan - wingTipY), tyM(-bodyLen * 0.1, wingSpan - wingTipY));
        // Left wing tip back to front
        g.quadraticCurveTo(txM(bodyLen * 0.2, wingSpan * 0.6), tyM(bodyLen * 0.2, wingSpan * 0.6),
                           txM(bodyLen * 0.6, 0), tyM(bodyLen * 0.6, 0));
        g.closePath();
        g.endFill();

        // Cephalic fins (horn-like projections at front)
        var cephLen = 12;
        g.lineStyle(2, 0x1a3050, 0.7);
        g.moveTo(txM(bodyLen * 0.5, -4), tyM(bodyLen * 0.5, -4));
        g.lineTo(txM(bodyLen * 0.5 + cephLen, -8), tyM(bodyLen * 0.5 + cephLen, -8));
        g.moveTo(txM(bodyLen * 0.5, 4), tyM(bodyLen * 0.5, 4));
        g.lineTo(txM(bodyLen * 0.5 + cephLen, 8), tyM(bodyLen * 0.5 + cephLen, 8));

        // Dorsal markings (scattered pale spots)
        g.lineStyle(0);
        for (var spot = 0; spot < 6; spot++) {
            var spotX = (spot - 2.5) * bodyLen * 0.15;
            var spotY = (Math.sin(spot * 1.7) * wingSpan * 0.15);
            g.beginFill(0x304060, 0.25);
            g.drawCircle(txM(spotX, spotY), tyM(spotX, spotY), 2 + (spot % 3) * 0.5);
            g.endFill();
        }

        // Belly highlight
        g.beginFill(0x304060, 0.3);
        g.drawEllipse(txM(0, 0), tyM(0, 0), bodyLen * 0.3, wingSpan * 0.2);
        g.endFill();

        // Tail - thin trailing line
        var tailLen = 35;
        var tailSway = Math.sin(time * 1.2) * 5;
        g.lineStyle(1.5, 0x1a3050, 0.6);
        g.moveTo(txM(-bodyLen * 0.5, 0), tyM(-bodyLen * 0.5, 0));
        g.quadraticCurveTo(txM(-bodyLen * 0.5 - tailLen * 0.5, tailSway * 0.5), tyM(-bodyLen * 0.5 - tailLen * 0.5, tailSway * 0.5),
                           txM(-bodyLen * 0.5 - tailLen, tailSway), tyM(-bodyLen * 0.5 - tailLen, tailSway));

        // Roll trail particles
        if (m.rollTimer > 0) {
            for (var tp = 0; tp < m.trailParticles.length; tp++) {
                var trail = m.trailParticles[tp];
                var tAlpha = (1 - trail.age / trail.maxAge) * 0.4;
                if (tAlpha > 0.01) {
                    g.beginFill(0x64ffda, tAlpha);
                    g.drawCircle(trail.x, trail.y, 2 * (1 - trail.age / trail.maxAge));
                    g.endFill();
                }
            }
        }
    }

    function updateManta(dt) {
        var dtSec = dt / 60;
        var m = manta;
        m.x += m.speed * m.dir * dt;
        m.y += (m.targetY - m.y) * 0.01 * dt;

        // Reset when off screen
        if ((m.dir > 0 && m.x > W + 300) || (m.dir < 0 && m.x < -300)) {
            initManta();
        }

        // Roll animation
        if (m.rollTimer > 0) {
            m.rollTimer -= dtSec;
            if (m.rollTimer < 0) m.rollTimer = 0;
            // Spawn trail particles from wing tips
            if (Math.random() < 0.5) {
                m.trailParticles.push({
                    x: m.x + (Math.random() - 0.5) * 40,
                    y: m.y + (Math.random() - 0.5) * 20,
                    age: 0, maxAge: 1.5,
                });
            }
        }
        // Update trail particles
        for (var i = m.trailParticles.length - 1; i >= 0; i--) {
            m.trailParticles[i].age += dtSec;
            if (m.trailParticles[i].age >= m.trailParticles[i].maxAge) {
                m.trailParticles.splice(i, 1);
            }
        }
    }

    // =========================================================================
    // Clownfish pair (2 small fish near anemone 0)
    // =========================================================================

    var CLOWNFISH_PALETTE = { body: '#f76707', fin: '#e05500', stripe: '#ffffff', eye: '#1a1a2e' };
    var CLOWNFISH_PROFILE = [0.10, 0.25, 0.35, 0.35, 0.30, 0.22, 0.12, 0.05, 0.02];
    var clownfish = [];

    function initClownfish() {
        clownfish = [];
        for (var i = 0; i < 2; i++) {
            clownfish.push({
                phase: i * Math.PI,
                size: 8 + Math.random() * 3,
                orbitRadius: 25 + Math.random() * 10,
                dartTimer: 0,
                dartX: 0, dartY: 0,
                hideTimer: 0,
                wobblePhase: Math.random() * Math.PI * 2,
            });
        }
    }
    initClownfish();

    function drawClownfish(time) {
        if (anemones.length === 0) return;
        var hostAnem = anemones[0];
        var anchorX = hostAnem.x;
        var anchorY = hostAnem.y - hostAnem.baseHeight - 10;

        for (var ci = 0; ci < clownfish.length; ci++) {
            var cf = clownfish[ci];
            if (cf.hideTimer > 0) continue;

            // Figure-8 orbit
            var t = time * 0.8 + cf.phase;
            var fx, fy;
            if (cf.dartTimer > 0) {
                fx = cf.dartX;
                fy = cf.dartY;
            } else {
                fx = anchorX + Math.sin(t) * cf.orbitRadius;
                fy = anchorY + Math.sin(t * 2) * cf.orbitRadius * 0.4;
            }

            var dir = Math.cos(t) > 0 ? 1 : -1;
            if (cf.dartTimer > 0) dir = cf.dartX > anchorX ? 1 : -1;

            // Draw using inline mini-fish (simplified)
            var g = anemoneGraphics; // reuse anemone graphics since they draw together
            var s = cf.size;

            // Body
            g.beginFill(hexToNum(CLOWNFISH_PALETTE.body), 0.85);
            g.drawEllipse(fx, fy, s * 1.2 * dir, s * 0.55);
            g.endFill();

            // White stripes (3 vertical bands)
            g.lineStyle(s * 0.12, 0xffffff, 0.7);
            g.moveTo(fx + s * 0.3 * dir, fy - s * 0.4);
            g.lineTo(fx + s * 0.3 * dir, fy + s * 0.4);
            g.moveTo(fx - s * 0.2 * dir, fy - s * 0.35);
            g.lineTo(fx - s * 0.2 * dir, fy + s * 0.35);
            g.moveTo(fx - s * 0.7 * dir, fy - s * 0.2);
            g.lineTo(fx - s * 0.7 * dir, fy + s * 0.2);

            // Eye
            g.lineStyle(0);
            g.beginFill(0x1a1a2e, 0.9);
            g.drawCircle(fx + s * 0.6 * dir, fy - s * 0.1, 1.5);
            g.endFill();

            // Tail
            var tailSwing = Math.sin(time * 6 + cf.wobblePhase) * s * 0.2;
            g.beginFill(hexToNum(CLOWNFISH_PALETTE.fin), 0.7);
            g.moveTo(fx - s * 1.0 * dir, fy);
            g.lineTo(fx - s * 1.5 * dir, fy - s * 0.3 + tailSwing);
            g.lineTo(fx - s * 1.5 * dir, fy + s * 0.3 + tailSwing);
            g.closePath();
            g.endFill();
        }
    }

    function updateClownfish(dt) {
        var dtSec = dt / 60;
        if (anemones.length === 0) return;
        var hostAnem = anemones[0];
        var anchorX = hostAnem.x;
        var anchorY = hostAnem.y - hostAnem.baseHeight - 10;

        for (var i = 0; i < clownfish.length; i++) {
            var cf = clownfish[i];
            if (cf.hideTimer > 0) {
                cf.hideTimer -= dtSec;
                continue;
            }
            if (cf.dartTimer > 0) {
                cf.dartTimer -= dtSec;
                if (cf.dartTimer <= 0) {
                    cf.dartTimer = 0;
                }
            } else {
                // Occasionally dart outward
                if (Math.random() < 0.001) {
                    cf.dartTimer = 1.5;
                    var dartAngle = Math.random() * Math.PI * 2;
                    cf.dartX = anchorX + Math.cos(dartAngle) * 50;
                    cf.dartY = anchorY + Math.sin(dartAngle) * 30;
                }
            }
        }
    }

    // =========================================================================
    // Pufferfish with inflation (1 instance)
    // =========================================================================

    var PUFFER_PROFILE_NORMAL = [0.10, 0.30, 0.42, 0.42, 0.38, 0.25, 0.10, 0.04, 0.01];
    var pufferfish = {
        x: 0, y: 0,
        dir: 1,
        speed: 0.2,
        inflateTimer: 0,
        inflateMult: 1,
        deflating: false,
        size: 20,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleFreq: 0.25,
        wobbleAmp: 12,
        breathPhase: Math.random() * Math.PI * 2,
    };

    function initPufferfish() {
        pufferfish.x = W * (0.3 + Math.random() * 0.4);
        pufferfish.y = H * (0.4 + Math.random() * 0.2);
        pufferfish.dir = Math.random() > 0.5 ? 1 : -1;
    }
    initPufferfish();

    function drawPufferfish(time) {
        var pf = pufferfish;
        var g = pufferfishGraphics;
        g.clear();

        var x = pf.x;
        var y = pf.y + Math.sin(time * pf.wobbleFreq + pf.wobblePhase) * pf.wobbleAmp;
        var s = pf.size * pf.inflateMult;
        var d = pf.dir;
        var isInflated = pf.inflateTimer > 0;

        // Body using round profile
        var profile = PUFFER_PROFILE_NORMAL;
        var segs = 8;

        // Build temporary spine
        var pSpine = [];
        for (var i = 0; i <= segs; i++) {
            var t = i / segs;
            pSpine.push({
                x: x + (s * 1.0 - t * s * 2.0) * d,
                y: y + (isInflated ? 0 : Math.sin(time * 3 - t * Math.PI * 1.5) * s * 0.04 * t * t),
            });
        }

        // Body fill
        var bodyColor = isInflated ? 0xf0d060 : 0xf0c040;
        g.beginFill(bodyColor, 0.75);
        g.moveTo(pSpine[0].x, pSpine[0].y - profile[0] * s);
        for (var i = 1; i <= segs; i++) {
            var prev = pSpine[i - 1];
            var cur = pSpine[i];
            var mx = (prev.x + cur.x) / 2;
            var myTop = ((prev.y - profile[i - 1] * s) + (cur.y - profile[i] * s)) / 2;
            g.quadraticCurveTo(prev.x, prev.y - profile[i - 1] * s, mx, myTop);
        }
        for (var i = segs; i >= 1; i--) {
            var prev = pSpine[i];
            var cur = pSpine[i - 1];
            var mx = (prev.x + cur.x) / 2;
            var myBot = ((prev.y + profile[i] * s) + (cur.y + profile[i - 1] * s)) / 2;
            g.quadraticCurveTo(prev.x, prev.y + profile[i] * s, mx, myBot);
        }
        g.closePath();
        g.endFill();

        // Spots (original top-row)
        g.lineStyle(0);
        for (var si2 = 0; si2 < 5; si2++) {
            var spotT = 0.2 + si2 * 0.15;
            var spotIdx = Math.floor(spotT * segs);
            var spotFrac = spotT * segs - spotIdx;
            if (spotIdx < segs) {
                var sx = pSpine[spotIdx].x * (1 - spotFrac) + pSpine[spotIdx + 1].x * spotFrac;
                var sy = pSpine[spotIdx].y * (1 - spotFrac) + pSpine[spotIdx + 1].y * spotFrac;
                g.beginFill(0x806020, 0.3);
                g.drawCircle(sx, sy - profile[spotIdx] * s * 0.3, 2);
                g.endFill();
            }
        }

        // Additional spots (ring around body center)
        var bodyR = profile[3] * s;
        var bodyX = (pSpine[3].x + pSpine[4].x) * 0.5;
        var bodyY2 = (pSpine[3].y + pSpine[4].y) * 0.5;
        g.lineStyle(0);
        for (var spotR = 0; spotR < 8; spotR++) {
            var sa = spotR * Math.PI * 2 / 8;
            var sr2 = bodyR * 0.5;
            g.beginFill(0x2a5040, 0.3);
            g.drawCircle(bodyX + Math.cos(sa) * sr2, bodyY2 + Math.sin(sa) * sr2, bodyR * 0.06);
            g.endFill();
        }

        // Spines when inflated
        if (isInflated) {
            g.lineStyle(1, 0xc0a030, 0.6);
            for (var sp = 0; sp < 12; sp++) {
                var spT = sp / 12;
                var spIdx = Math.floor(spT * segs);
                if (spIdx >= segs) spIdx = segs - 1;
                var spAngle = (sp % 2 === 0 ? -1 : 1) * Math.PI * 0.3 + (Math.random() - 0.5) * 0.3;
                var spBaseX = pSpine[spIdx].x;
                var spBaseY = pSpine[spIdx].y + (sp % 2 === 0 ? -1 : 1) * profile[spIdx] * s;
                var spLen = s * 0.15 * pf.inflateMult;
                g.moveTo(spBaseX, spBaseY);
                g.lineTo(spBaseX + Math.cos(spAngle) * spLen * d, spBaseY + Math.sin(spAngle) * spLen);
            }
        }

        // Eye (bugs out when inflated)
        var eyeInflateOff = isInflated ? s * 0.04 : 0;
        var eyeX = pSpine[1].x + eyeInflateOff * d;
        var eyeY = pSpine[1].y - profile[1] * s * 0.3 - eyeInflateOff;
        var eyeR = s * 0.08;
        var eyeScale = isInflated ? 1.5 + (pf.inflateMult - 1) * 0.3 : 1;
        g.lineStyle(0);
        g.beginFill(0xffffff);
        g.drawCircle(eyeX, eyeY, eyeR * eyeScale);
        g.endFill();
        g.beginFill(0x1a1a2e);
        g.drawCircle(eyeX, eyeY, eyeR * (isInflated ? eyeScale * 0.6 : 0.5));
        g.endFill();

        // Beak mouth
        g.beginFill(0xd0b080, 0.7);
        g.moveTo(pSpine[0].x, pSpine[0].y);
        g.lineTo(pSpine[0].x + s * 0.15 * d, pSpine[0].y - 2);
        g.lineTo(pSpine[0].x + s * 0.15 * d, pSpine[0].y + 2);
        g.closePath();
        g.endFill();

        // Tiny pectoral fin flutter
        var pectFinPhase = Math.sin(time * 6 + pf.wobblePhase) * 0.3;
        var pfinX = pSpine[2].x;
        var pfinY = pSpine[2].y + profile[2] * s * 0.6;
        g.beginFill(0xd0a030, 0.45);
        g.moveTo(pfinX, pfinY);
        g.lineTo(pfinX - s * 0.15 * d, pfinY + s * 0.12 + pectFinPhase * s * 0.05);
        g.lineTo(pfinX - s * 0.05 * d, pfinY + s * 0.02);
        g.closePath();
        g.endFill();

        // Tail
        var tailPt = pSpine[segs];
        g.beginFill(0xd0a030, 0.6);
        g.moveTo(tailPt.x, tailPt.y);
        g.lineTo(tailPt.x - s * 0.3 * d, tailPt.y - s * 0.2);
        g.lineTo(tailPt.x - s * 0.3 * d, tailPt.y + s * 0.2);
        g.closePath();
        g.endFill();
    }

    function updatePufferfish(dt) {
        var dtSec = dt / 60;
        var pf = pufferfish;

        if (pf.inflateTimer > 0) {
            pf.inflateTimer -= dtSec;
            if (pf.inflateTimer <= 3 && !pf.deflating) {
                // Start deflating after hold phase
            }
            if (pf.inflateTimer <= 2 && pf.deflating) {
                pf.inflateMult = 1 + (pf.inflateMult - 1) * 0.97;
            }
            if (pf.inflateTimer <= 0) {
                pf.inflateTimer = 0;
                pf.inflateMult = 1;
                pf.deflating = false;
            }
        } else {
            pf.x += pf.speed * pf.dir * dt;
            if (pf.x > W + pf.size * 3) { pf.dir = -1; pf.x = W + pf.size * 3; }
            if (pf.x < -pf.size * 3) { pf.dir = 1; pf.x = -pf.size * 3; }
        }
    }

    function inflatePufferfish() {
        if (pufferfish.inflateTimer > 0) return;
        pufferfish.inflateTimer = 5.5; // 0.5s inflate + 3s hold + 2s deflate
        pufferfish.inflateMult = 1;
        pufferfish.deflating = false;
        // Animate inflation
        var startMult = 1;
        var targetMult = 1.8;
        var inflateStart = animTime;
        var inflateCheck = setInterval(function () {
            var elapsed = animTime - inflateStart;
            if (elapsed < 0.5) {
                pufferfish.inflateMult = startMult + (targetMult - startMult) * (elapsed / 0.5);
            } else if (elapsed >= 3.5) {
                pufferfish.deflating = true;
                pufferfish.inflateMult = targetMult * Math.max(0.56, 1 - (elapsed - 3.5) / 2);
                if (pufferfish.inflateMult <= 1.05) {
                    pufferfish.inflateMult = 1;
                    clearInterval(inflateCheck);
                }
            }
            if (pufferfish.inflateTimer <= 0) clearInterval(inflateCheck);
        }, 16);
    }

    // =========================================================================
    // Passing Shadows
    // =========================================================================

    var passingShadow = {
        active: false,
        x: 0, y: 0,
        width: 0, height: 0,
        speed: 0,
        dir: 1,
        timer: 20 + Math.random() * 10,
    };

    function updatePassingShadow(dt) {
        var dtSec = dt / 60;
        if (!passingShadow.active) {
            passingShadow.timer -= dtSec;
            if (passingShadow.timer <= 0) {
                passingShadow.active = true;
                passingShadow.dir = Math.random() > 0.5 ? 1 : -1;
                passingShadow.width = 200 + Math.random() * 200;
                passingShadow.height = 60 + Math.random() * 40;
                passingShadow.x = passingShadow.dir > 0 ? -passingShadow.width : W + passingShadow.width;
                passingShadow.y = H * (0.05 + Math.random() * 0.2);
                passingShadow.speed = 1.5 + Math.random() * 1;
            }
            return;
        }

        passingShadow.x += passingShadow.speed * passingShadow.dir * dt;

        // Check if off screen
        if ((passingShadow.dir > 0 && passingShadow.x > W + passingShadow.width * 2) ||
            (passingShadow.dir < 0 && passingShadow.x < -passingShadow.width * 2)) {
            passingShadow.active = false;
            passingShadow.timer = 20 + Math.random() * 10;
        }
    }

    function drawPassingShadow() {
        var g = shadowGraphics;
        g.clear();
        if (!passingShadow.active) return;
        g.beginFill(0x000510, 0.12);
        g.drawEllipse(passingShadow.x, passingShadow.y, passingShadow.width, passingShadow.height);
        g.endFill();
        // Softer outer ring
        g.beginFill(0x000510, 0.05);
        g.drawEllipse(passingShadow.x, passingShadow.y, passingShadow.width * 1.3, passingShadow.height * 1.3);
        g.endFill();
    }

    // =========================================================================
    // Ambient Fish Schooling on Shadow
    // =========================================================================

    function applyShadowSchooling(dt) {
        if (!passingShadow.active) return;
        var dtSec = dt / 60;
        for (var i = 0; i < fishes.length; i++) {
            var f = fishes[i];
            var dx = f.x - passingShadow.x;
            var dy = f.y - passingShadow.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < passingShadow.width * 1.5) {
                // Push fish down and toward centroid of other fish
                f.startleVy += 0.05 * dtSec * 60;
                // Increase speed
                f.startleVx += f.dir * 0.03 * dtSec * 60;
                // School toward nearest fish
                var nearestDist = 99999;
                var nearestIdx = -1;
                for (var j = 0; j < fishes.length; j++) {
                    if (j === i) continue;
                    var d2 = Math.sqrt(Math.pow(f.x - fishes[j].x, 2) + Math.pow(f.y - fishes[j].y, 2));
                    if (d2 < nearestDist) { nearestDist = d2; nearestIdx = j; }
                }
                if (nearestIdx >= 0 && nearestDist > 30) {
                    f.startleVx += (fishes[nearestIdx].x - f.x) * 0.0005 * dtSec * 60;
                    f.startleVy += (fishes[nearestIdx].y - f.y) * 0.0005 * dtSec * 60;
                }
            }
        }
    }

    // =========================================================================
    // Ambient Plankton Layer (40-50 particles)
    // =========================================================================

    var plankton = [];
    var planktonSprites = [];

    function initPlankton() {
        plankton = [];
        while (planktonContainer.children.length > 0) planktonContainer.removeChildAt(0);
        planktonSprites = [];
        // Create cloud centers
        var cloudCount = 4;
        var clouds = [];
        for (var ci = 0; ci < cloudCount; ci++) {
            clouds.push({
                x: Math.random() * W,
                y: H * (0.05 + Math.random() * 0.3),
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.05,
            });
        }

        for (var i = 0; i < PLANKTON_COUNT; i++) {
            var cloud = clouds[i % cloudCount];
            var isDash = Math.random() > 0.6;
            plankton.push({
                cloudIdx: i % cloudCount,
                offsetX: (Math.random() - 0.5) * 60,
                offsetY: (Math.random() - 0.5) * 40,
                size: isDash ? 1.5 : (1 + Math.random()),
                isDash: isDash,
                phase: Math.random() * Math.PI * 2,
                scatterVx: 0,
                scatterVy: 0,
            });
            var sp = new PIXI.Sprite(smallCircleTex);
            sp.anchor.set(0.5, 0.5);
            sp.tint = 0x80c060;
            planktonContainer.addChild(sp);
            planktonSprites.push(sp);
        }
        // Store clouds for updating
        plankton._clouds = clouds;
    }
    initPlankton();

    function updatePlankton(dt) {
        var dtSec = dt / 60;
        var clouds = plankton._clouds;
        if (!clouds) return;

        // Move cloud centers
        for (var ci = 0; ci < clouds.length; ci++) {
            var cloud = clouds[ci];
            cloud.x += cloud.vx * dt;
            cloud.y += cloud.vy * dt;
            // Wrap around
            if (cloud.x < -50) cloud.x = W + 50;
            if (cloud.x > W + 50) cloud.x = -50;
            if (cloud.y < -20) cloud.y = H * 0.35;
            if (cloud.y > H * 0.4) cloud.vy *= -1;
        }

        // Update particles
        for (var i = 0; i < plankton.length; i++) {
            var p = plankton[i];
            // Decay scatter velocity
            p.scatterVx *= 0.97;
            p.scatterVy *= 0.97;
            p.offsetX += p.scatterVx * dt;
            p.offsetY += p.scatterVy * dt;
            // Reconverge toward cloud center
            p.offsetX *= 0.998;
            p.offsetY *= 0.998;
        }
    }

    function drawPlankton(time) {
        var clouds = plankton._clouds;
        if (!clouds) return;
        for (var i = 0; i < plankton.length; i++) {
            var p = plankton[i];
            var cloud = clouds[p.cloudIdx];
            var px = cloud.x + p.offsetX + Math.sin(time * 0.5 + p.phase) * 3;
            var py = cloud.y + p.offsetY + Math.cos(time * 0.3 + p.phase) * 2;

            var inRay = isInsideGodRay(px, py);
            var sp = planktonSprites[i];
            sp.position.set(px, py);
            sp.alpha = inRay ? 0.35 : 0.12;
            sp.tint = inRay ? 0xa0ff80 : 0x60a040;
            if (p.isDash) {
                sp.scale.set(p.size / 3, p.size / 6);
            } else {
                sp.scale.set(p.size / 4);
            }
        }
    }

    function scatterPlankton(px, py) {
        for (var i = 0; i < plankton.length; i++) {
            var p = plankton[i];
            var clouds = plankton._clouds;
            if (!clouds) return;
            var cloud = clouds[p.cloudIdx];
            var plx = cloud.x + p.offsetX;
            var ply = cloud.y + p.offsetY;
            var dx = plx - px;
            var dy = ply - py;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80 && dist > 1) {
                var force = (80 - dist) / 80 * 2;
                p.scatterVx += (dx / dist) * force;
                p.scatterVy += (dy / dist) * force;
            }
        }
    }

    // =========================================================================
    // Floating Debris (2-3 leaf shapes)
    // =========================================================================

    var debris = [];

    function initDebris() {
        debris = [];
        while (debrisContainer.children.length > 0) debrisContainer.removeChildAt(0);
        for (var i = 0; i < DEBRIS_COUNT; i++) {
            var dg = new PIXI.Graphics();
            debrisContainer.addChild(dg);
            debris.push({
                x: Math.random() * W,
                y: Math.random() * H,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: 0.004 + Math.random() * 0.003,
                fallSpeed: 0.05 + Math.random() * 0.03,
                driftPhase: Math.random() * Math.PI * 2,
                width: 8 + Math.random() * 6,
                height: 4 + Math.random() * 3,
                graphics: dg,
            });
        }
    }
    initDebris();

    function updateDebris(dt) {
        for (var i = 0; i < debris.length; i++) {
            var d = debris[i];
            d.y += d.fallSpeed * dt;
            d.x += Math.sin(animTime * 0.2 + d.driftPhase) * 0.1 * dt;
            d.rotation += d.rotSpeed * dt;
            if (d.y > H + 20) {
                d.y = -20;
                d.x = Math.random() * W;
            }
        }
    }

    function drawDebris(time) {
        for (var i = 0; i < debris.length; i++) {
            var d = debris[i];
            var g = d.graphics;
            g.clear();
            g.beginFill(0x506030, 0.12);
            // Irregular oval (leaf shape)
            var cos = Math.cos(d.rotation), sin = Math.sin(d.rotation);
            var steps = 12;
            for (var si = 0; si <= steps; si++) {
                var a = si / steps * Math.PI * 2;
                var rx = d.width * (1 + 0.3 * Math.sin(a * 2));
                var ry = d.height;
                var lx = Math.cos(a) * rx;
                var ly = Math.sin(a) * ry;
                var px = d.x + lx * cos - ly * sin;
                var py = d.y + lx * sin + ly * cos;
                if (si === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.endFill();
            // Leaf vein
            g.lineStyle(0.5, 0x405020, 0.08);
            g.moveTo(d.x - d.width * cos, d.y - d.width * sin);
            g.lineTo(d.x + d.width * cos, d.y + d.width * sin);
        }
    }

    // =========================================================================
    // Ecosystem Interactions (creature-to-creature)
    // =========================================================================

    function updateEcosystem(dt) {
        var dtSec = dt / 60;

        // D1: Fish flee hammerhead
        if (unlockedCreatures['destruction']) {
            var hPos = getCreaturePos('destruction', animTime, unlockedCreatures['destruction']);
            for (var i = 0; i < fishes.length; i++) {
                var f = fishes[i];
                var dx = f.x - hPos.x;
                var dy = f.y - hPos.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 1) {
                    var flee = (200 - dist) / 200 * 2;
                    f.startleVx += (dx / dist) * flee * dtSec;
                    f.startleVy += (dy / dist) * flee * dtSec;
                }
            }
        }

        // D2: Clownfish dart into anemone when shadow passes
        if (passingShadow.active && anemones.length > 0) {
            var hostAnem = anemones[0];
            var shadowDx = passingShadow.x - hostAnem.x;
            var shadowDy = passingShadow.y - hostAnem.y;
            var shadowDistToAnem = Math.sqrt(shadowDx * shadowDx + shadowDy * shadowDy);
            if (shadowDistToAnem < passingShadow.width * 1.2) {
                for (var ci = 0; ci < clownfish.length; ci++) {
                    if (clownfish[ci].hideTimer <= 0) {
                        clownfish[ci].hideTimer = 3 + Math.random() * 2;
                    }
                }
            }
        }

        // D4: Seafloor creatures retract when shadow passes
        if (passingShadow.active) {
            // Sea urchins: extend spines
            for (var sui = 0; sui < seaUrchins.length; sui++) {
                var su = seaUrchins[sui];
                var suDx = passingShadow.x - su.x;
                if (Math.abs(suDx) < passingShadow.width * 1.2) {
                    su.spineExtend = Math.min(1, su.spineExtend + dtSec * 2);
                }
            }
            // Tube worms: retract fans
            for (var twi = 0; twi < tubeWorms.length; twi++) {
                var tw = tubeWorms[twi];
                var twDx = passingShadow.x - tw.x;
                if (Math.abs(twDx) < passingShadow.width * 1.2 && tw.retractTimer <= 0) {
                    tw.retractTimer = 3;
                }
            }
            // Anemones: retract tentacles
            for (var ani = 0; ani < anemones.length; ani++) {
                var anem = anemones[ani];
                var anDx = passingShadow.x - anem.x;
                if (Math.abs(anDx) < passingShadow.width * 1.2 && anem.retractTimer <= 0) {
                    anem.retractTimer = 2;
                }
            }
        }

        // D7: Fish avoid lionfish (smaller radius, weaker force)
        if (lionfish.x > -60 && lionfish.x < W + 60) {
            for (var fi = 0; fi < fishes.length; fi++) {
                var ff = fishes[fi];
                var lfDx = ff.x - lionfish.x;
                var lfDy = ff.y - lionfish.y;
                var lfDist = Math.sqrt(lfDx * lfDx + lfDy * lfDy);
                if (lfDist < 120 && lfDist > 1) {
                    var lfFlee = (120 - lfDist) / 120 * 1.2;
                    ff.startleVx += (lfDx / lfDist) * lfFlee * dtSec;
                    ff.startleVy += (lfDy / lfDist) * lfFlee * dtSec;
                }
            }
        }

        // D8: Octopus reaches for marine snow (pull nearest snow when idle)
        if (octopus.jetTimer <= 0) {
            var bestSnowDist = 80;
            var bestOcSnow = null;
            for (var oms = 0; oms < marineSnow.length; oms++) {
                var osn = marineSnow[oms];
                var osDx = osn.x - octopus.x;
                var osDy = osn.y - octopus.y;
                var osDist = Math.sqrt(osDx * osDx + osDy * osDy);
                if (osDist < bestSnowDist) {
                    bestSnowDist = osDist;
                    bestOcSnow = osn;
                }
            }
            if (bestOcSnow && bestSnowDist < 80) {
                var ocPullX = octopus.x - bestOcSnow.x;
                var ocPullY = octopus.y - bestOcSnow.y;
                var ocPullDist = Math.sqrt(ocPullX * ocPullX + ocPullY * ocPullY);
                if (ocPullDist > 1) {
                    bestOcSnow.x += (ocPullX / ocPullDist) * 0.15 * dt;
                    bestOcSnow.y += (ocPullY / ocPullDist) * 0.15 * dt;
                }
            }
        }
    }

    // =========================================================================
    // Exit survey
    // =========================================================================

    var exitSurveyEl = document.getElementById('exit-survey');
    var surveyDoneBtn = document.getElementById('survey-done');
    var surveySkipBtn = document.getElementById('survey-skip');
    var surveyResponses = { surprise: null, learned: null, age: null };

    var surveyGroups = [
        { el: document.getElementById('survey-surprise'), key: 'surprise' },
        { el: document.getElementById('survey-learned'), key: 'learned' },
        { el: document.getElementById('survey-age'), key: 'age' }
    ];

    // Wire up survey option buttons
    for (var sg = 0; sg < surveyGroups.length; sg++) {
        (function (group) {
            var buttons = group.el.querySelectorAll('button');
            for (var sb = 0; sb < buttons.length; sb++) {
                (function (btn) {
                    btn.addEventListener('pointerdown', function (e) {
                        e.stopPropagation(); e.preventDefault();
                        lastInteraction = Date.now();
                        // Deselect siblings, select this one
                        var siblings = group.el.querySelectorAll('button');
                        for (var k = 0; k < siblings.length; k++) siblings[k].classList.remove('selected');
                        btn.classList.add('selected');
                        surveyResponses[group.key] = btn.getAttribute('data-value');
                    });
                })(buttons[sb]);
            }
        })(surveyGroups[sg]);
    }

    surveyDoneBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        dismissSurvey();
    });

    surveySkipBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        dismissSurvey();
    });

    // Prevent taps on the survey background from falling through
    exitSurveyEl.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        lastInteraction = Date.now();
    });

    function showExitSurvey() {
        appState = State.SURVEY;
        overlayEl.classList.add('hidden');
        idleWarningShown = false;
        if (idleWarningEl) idleWarningEl.classList.add('hidden');
        // Reset survey UI
        surveyResponses = { surprise: null, learned: null, age: null };
        var allBtns = exitSurveyEl.querySelectorAll('.survey-options button');
        for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('selected');
        exitSurveyEl.classList.remove('hidden');
    }

    function dismissSurvey() {
        sessionLog.survey = {
            surprise: surveyResponses.surprise,
            learned: surveyResponses.learned,
            age: surveyResponses.age
        };
        saveSession();
        exitSurveyEl.classList.add('hidden');
        showSplash();
    }

    // =========================================================================
    // Data export (triple-tap mute button)
    // =========================================================================

    var dataExportEl = document.getElementById('data-export');
    var exportStatsEl = document.getElementById('export-stats');
    var exportCopyBtn = document.getElementById('export-copy-btn');
    var exportClearBtn = document.getElementById('export-clear-btn');
    var exportCloseBtn = document.getElementById('export-close-btn');
    var muteTapTimes = [];

    muteBtn.addEventListener('pointerdown', function () {
        var now = Date.now();
        muteTapTimes.push(now);
        // Keep only taps in the last 1 second
        muteTapTimes = muteTapTimes.filter(function (t) { return now - t < 1000; });
        if (muteTapTimes.length >= 3) {
            muteTapTimes = [];
            showDataExport();
        }
    });

    function showDataExport() {
        var count = allSessions.length;
        var dateRange = 'No sessions yet';
        if (count > 0) {
            var first = allSessions[0].startTime ? new Date(allSessions[0].startTime).toLocaleDateString() : 'unknown';
            var last = allSessions[count - 1].startTime ? new Date(allSessions[count - 1].startTime).toLocaleDateString() : 'unknown';
            dateRange = first + ' to ' + last;
        }
        exportStatsEl.innerHTML = count + ' sessions logged<br>Date range: ' + dateRange;
        dataExportEl.classList.remove('hidden');
    }

    exportCopyBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        var json = JSON.stringify(allSessions, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(function () {
                exportCopyBtn.textContent = 'Copied!';
                setTimeout(function () { exportCopyBtn.textContent = 'Copy JSON to clipboard'; }, 2000);
            });
        } else {
            // Fallback for older WebKit
            var ta = document.createElement('textarea');
            ta.value = json;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            exportCopyBtn.textContent = 'Copied!';
            setTimeout(function () { exportCopyBtn.textContent = 'Copy JSON to clipboard'; }, 2000);
        }
    });

    exportClearBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        if (exportClearBtn.getAttribute('data-confirm') === 'true') {
            allSessions = [];
            try { localStorage.removeItem('bubblequiz-sessions'); } catch (err) { /* ignore */ }
            exportClearBtn.textContent = 'Cleared!';
            exportClearBtn.removeAttribute('data-confirm');
            setTimeout(function () {
                exportClearBtn.textContent = 'Clear data';
                exportStatsEl.innerHTML = '0 sessions logged<br>Date range: No sessions yet';
            }, 2000);
        } else {
            exportClearBtn.setAttribute('data-confirm', 'true');
            exportClearBtn.textContent = 'Tap again to confirm';
            setTimeout(function () {
                exportClearBtn.textContent = 'Clear data';
                exportClearBtn.removeAttribute('data-confirm');
            }, 3000);
        }
    });

    exportCloseBtn.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault();
        dataExportEl.classList.add('hidden');
    });

    dataExportEl.addEventListener('pointerdown', function (e) {
        if (e.target === dataExportEl) {
            e.preventDefault();
            dataExportEl.classList.add('hidden');
        }
    });

    // =========================================================================
    // Game loop (PixiJS ticker)
    // =========================================================================

    pixiApp.ticker.add(function (dt) {
        var time = performance.now() / 1000;
        animTime = time;

        // Screen shake
        applyScreenShake(dt);

        // Update caustic shader
        causticFilter.uniforms.uTime = time;

        // Draw systems that use Graphics (cleared and redrawn each frame)
        drawGodRays(time);
        drawSurface(time);

        // --- Volumetric god rays: render to half-res RT for soft blur pass ---
        godRayContainer.scale.set(0.5);
        pixiApp.renderer.render(godRayContainer, { renderTexture: godRayRT, clear: true });
        godRayContainer.scale.set(1);

        drawMarineSnow(time);
        drawCaustics(time);
        drawSeaweed(time);

        // Seafloor life
        drawCorals(time);
        drawStarfish(time);
        drawAnemones(time);
        drawClownfish(time);
        drawCrabs(time);

        // New seafloor decorations & creatures
        drawRocks();
        drawShells();
        drawSeaGrass(time);
        drawSponges(time);
        drawSeaUrchins(time);
        drawTubeWorms(time);
        drawHermitCrabs(time);
        drawSeaCucumbers(time);
        drawSeahorseBabies(time);
        drawCleanerShrimp(time);
        drawNudibranch(time);

        // Signature mid-water creatures
        drawOctopus(time);
        drawMorayEel(time);
        drawElectricEel(time);
        drawLionfish(time);

        drawJellyfish(time);

        // Manta ray + pufferfish
        drawManta(time);
        drawPufferfish(time);

        drawWhale(time);

        // Update logic
        updateDecorativeBubbles(dt);
        updateMarineSnow(dt);
        updateFish(dt);
        updateWakeParticles(dt);
        updateSchoolFish(dt);
        updateCreatureNudge(dt);
        updateBioParticles(dt);
        updateTrailParticles(dt);
        updateShockwaves(dt);
        updateSonoFlash(dt);
        updateUserBubbles(dt);
        updateCascade(time);

        // New systems update
        updateCorals(dt);
        updateStarfish(dt);
        updateAnemones(dt);
        updateClownfish(dt);
        updateCrabs(dt);
        updateBubbleStreams(dt);
        updateManta(dt);
        updatePufferfish(dt);
        updatePassingShadow(dt);
        applyShadowSchooling(dt);
        updatePlankton(dt);
        updateDebris(dt);

        // New creatures update
        updateSeaGrass(dt);
        updateSponges(dt);
        updateSeaUrchins(dt);
        updateTubeWorms(dt);
        updateHermitCrabs(dt);
        updateSeaCucumbers(dt);
        updateOctopus(dt);
        updateMorayEel(dt);
        updateElectricEel(dt);
        updateSeahorseBabies(dt);
        updateCleanerShrimp(dt);
        updateLionfish(dt);
        updateNudibranch(dt);

        // Ecosystem interactions (creature-to-creature)
        updateEcosystem(dt);

        if (appState === State.BUBBLES || appState === State.ANSWER) updateQuestionBubbles(dt);
        updateParticles(dt);

        // Draw fish + spawn wake
        for (var i = 0; i < fishes.length; i++) {
            drawFishPixi(i, fishes[i], time);
            if (Math.random() < 0.3) {
                var fi = fishes[i];
                var fy = fi.y + Math.sin(time * fi.wobbleFreq + fi.wobbleOffset) * fi.wobbleAmp;
                var tailWorldX = fi.x + fishSpine[FISH_SPINE_SEGS].x * fi.dir;
                var tailWorldY = fy + fishSpine[FISH_SPINE_SEGS].y;
                spawnWakeParticle(tailWorldX, tailWorldY);
            }
        }

        // Draw creatures
        drawUnlockedCreatures(time);

        // Draw plankton + debris + passing shadow
        drawPlankton(time);
        drawDebris(time);
        drawPassingShadow();

        // Draw bubbles
        drawDecorativeBubbles(time);
        if (appState === State.BUBBLES) drawQuestionBubbles(time);
        else {
            for (var i = 0; i < questionBubbleObjects.length; i++) questionBubbleObjects[i].container.visible = false;
        }

        // Draw user bubbles
        drawUserBubbles();

        // Draw particle rings (sprites handled in updateParticles)
        drawParticleRings();

        // Draw effects
        drawShockwaves();
        drawSonoFlash();
        drawFingerTrail(time);
        drawCascade(time);
        updateStreakGlow(dt);
        updateCreatureFlashFn(dt);

        // --- Bloom: render glow layer to half-res RT for soft bloom pass ---
        glowLayer.scale.set(0.5);
        pixiApp.renderer.render(glowLayer, { renderTexture: bloomRT, clear: true });
        glowLayer.scale.set(1);

        // Displacement animation
        dispSprite.x += 0.3;
        dispSprite.y += 0.2;

        checkIdle();
    });

    // =========================================================================
    // Resize handling
    // =========================================================================

    window.addEventListener('resize', function () {
        W = window.innerWidth;
        H = window.innerHeight;
        // Regenerate size-dependent textures
        bgSprite.texture.destroy(true);
        bgSprite.texture = createBgTexture();
        bgSprite.width = W;
        bgSprite.height = H;
        grainSprite.width = W;
        grainSprite.height = H;
        // Regenerate vignette texture on resize
        if (vignetteSprite.texture) vignetteSprite.texture.destroy(true);
        vignetteSprite.texture = createVignetteTex();
        // Update caustic shader resolution
        causticFilter.uniforms.uResolution = [W, H];
        // Resize god ray RT + sprite
        godRayRTWidth = Math.round(W / 2);
        godRayRTHeight = Math.round(H / 2);
        godRayRT.resize(godRayRTWidth, godRayRTHeight);
        godRayBlurSprite.width = W;
        godRayBlurSprite.height = H;
        // Resize bloom RT + sprite
        bloomRTWidth = Math.round(W / 2);
        bloomRTHeight = Math.round(H / 2);
        bloomRT.resize(bloomRTWidth, bloomRTHeight);
        bloomSprite.width = W;
        bloomSprite.height = H;
        creatureFlashText.position.set(W / 2, H * 0.12);
        drawTerrainFill();
        initSeaweed();
        initJellyfish();
        initCorals();
        initStarfish();
        initAnemones();
        initClownfish();
        initCrabs();
        initBubbleStreams();
        initManta();
        initPufferfish();
        initPlankton();
        initDebris();
        initRocks();
        initShells();
        initSeaGrass();
        initSponges();
        initSeaUrchins();
        initTubeWorms();
        initHermitCrabs();
        initSeaCucumbers();
        initOctopus();
        initMorayEel();
        initElectricEel();
        initSeahorseBabies();
        initCleanerShrimp();
        initLionfish();
        initNudibranch();
        for (var i = 0; i < questionBubbles.length; i++) {
            var qb = questionBubbles[i];
            if (qb.active) {
                qb.x = Math.min(qb.x, W - qb.r - 10);
                qb.x = Math.max(qb.x, qb.r + 10);
                qb.y = Math.min(qb.y, H + qb.r);
            }
        }
    });

    // =========================================================================
    // Visibility API
    // =========================================================================

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            pixiApp.ticker.stop();
            audioManager.setDroneVolume(0);
        } else {
            pixiApp.ticker.start();
            lastInteraction = Date.now();
            if (appState !== State.SPLASH) audioManager.setDroneVolume(0.06);
        }
    });

    // =========================================================================
    // Start
    // =========================================================================

    // App starts in SPLASH state — ticker runs, canvas animates behind splash overlay

})();
