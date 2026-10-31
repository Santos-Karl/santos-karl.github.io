/* ============================================================================
   THE TOP and WHAT I CAN DO
   The first two blocks of the page. They run beside script.js, which still runs
   everything below them (the book, the badges, the contact form...).
   ============================================================================ */
(() => {
'use strict';

/* ============ HELPERS ============ */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const media = q => matchMedia(q);
const REDUCED = media('(prefers-reduced-motion: reduce)').matches;
const FINE = media('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;
const designPx = el => el.closest('section').clientWidth / 1440;   // one design pixel inside a block


// A picture that fails to load must say so, not leave an empty frame.
function reportFailure(url) {
    let bar = $('.load-error');
    if (!bar) {
        bar = document.createElement('p');
        bar.className = 'load-error';
        bar.setAttribute('role', 'alert');
        document.body.appendChild(bar);
    }
    bar.textContent = 'Could not load: ' + url;
}
function watchImage(img) {
    img.addEventListener('error', () => reportFailure(img.getAttribute('src')), { once: true });
}

/* ============ ONE ANIMATION LOOP ============
   Everything that moves asks this loop for frames. `rate` is the least time between
   two calls in milliseconds (0 = every frame). The loop stops when nobody is left. */
const ticker = (() => {
    const subs = new Set();
    let raf = 0;
    const loop = time => {
        for (const s of [...subs]) {
            if (time - s.last > s.rate()) { s.last = time; s.cb(time); }
        }
        raf = subs.size ? requestAnimationFrame(loop) : 0;
    };
    return {
        add(cb, rate = 0) {
            const s = { cb, rate: typeof rate === 'function' ? rate : () => rate, last: -1e9 };
            subs.add(s);
            if (!raf) raf = requestAnimationFrame(loop);
            return () => subs.delete(s);
        }
    };
})();

// Runs `cb` from the loop only while `el` is on screen, plus ten frames after it leaves.
function whileVisible(el, cb, rate = 0, margin = '0px') {
    let stop = null, tail = 0;
    const run = time => {
        if (!visible && --tail < 0) { stop(); stop = null; return; }
        cb(time);
    };
    let visible = false;
    new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) { tail = 10; if (!stop) stop = ticker.add(run, rate); }
    }, { rootMargin: margin }).observe(el);
}

/* ============ SPRINGS ============
   A damped spring (tension, friction, mass 1), stepped one millisecond at a time. */
const SPRING = {
    REVEAL: [90, 26], ROW: [170, 24], ITEM: [170, 24], SHEET: [190, 26], FIGURE: [200, 24], TYPE: [210, 24],
    YEAR: [190, 24], COPY: [110, 26], COPY_FAST: [150, 24], NAME: [190, 24], LABEL: [110, 26], YEAR_SETTLE: [32, 26]
};
const springs = new Set();
let stopSprings = null, lastStep = 0;
function animate(from, to, config, delay, apply, done) {
    const [k, c] = SPRING[config] || SPRING.REVEAL;
    const s = { x: from, v: 0, to, k, c, start: performance.now() + (delay || 0), apply, done };
    if (REDUCED) { apply(to); if (done) done(); return s; }
    apply(from);
    springs.add(s);
    if (!stopSprings) { lastStep = 0; stopSprings = ticker.add(stepSprings); }
    return s;
}
function stepSprings(now) {
    const frame = lastStep ? Math.min(64, now - lastStep) : 16;
    lastStep = now;
    for (const s of springs) {
        if (now < s.start) continue;
        const steps = Math.round(Math.min(frame, now - s.start + 1));
        for (let i = 0; i < steps; i++) {
            const a = -s.k * (s.x - s.to) - s.c * s.v;
            s.v += a * 0.001;
            s.x += s.v * 0.001;
        }
        if (Math.abs(s.v) < 0.002 && Math.abs(s.to - s.x) < 0.001) {
            s.x = s.to; springs.delete(s); s.apply(s.x); if (s.done) s.done();
        } else s.apply(s.x);
    }
    if (!springs.size && stopSprings) { stopSprings(); stopSprings = null; }
}

/* ============ TEXT: words or letters that rise into place ============
   data-split="words|letters", data-stagger (ms between units), data-delay, data-spring, data-gap (em).
   A plain copy stays for screen readers; the animated pieces are hidden from them. */
function split(el) {
    if (el._units) return el._units;
    const mode = el.dataset.split;
    const plain = el.textContent.replace(/\s+/g, ' ').trim();
    const nodes = [...el.childNodes];
    el.textContent = '';
    el.classList.add('split');
    if (el.dataset.gap) el.style.setProperty('--gap', el.dataset.gap + 'em');
    const sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = plain;
    el.appendChild(sr);
    const units = [];
    let last = null;
    for (const n of nodes) {
        if (n.nodeType === 3) {
            for (const word of n.textContent.split(/\s+/).filter(Boolean)) {
                const w = document.createElement('span');
                w.className = 'u';
                w.setAttribute('aria-hidden', 'true');
                if (mode === 'letters') {
                    w.style.display = 'inline-flex';
                    for (const ch of word) {
                        const l = document.createElement('span');
                        l.className = 'u';
                        l.textContent = ch;
                        w.appendChild(l);
                        units.push(l);
                    }
                } else {
                    w.textContent = word;
                    units.push(w);
                }
                el.appendChild(w);
                last = w;
            }
        } else if (n.nodeType === 1) {
            n.setAttribute('aria-hidden', 'true');
            (last || el).appendChild(n);        // a full stop sits on the word before it
        }
    }
    el._units = units;
    el._dist = mode === 'letters' ? 0.3 : 0.35;
    return units;
}
function hideText(el) {
    for (const u of split(el)) { u.style.opacity = 0; u.style.transform = `translateY(${el._dist}em)`; }
}
function playText(el, base = 0) {
    const stagger = +(el.dataset.stagger || 60);
    const delay = base + +(el.dataset.delay || 0);
    split(el).forEach((u, i) => animate(0, 1, el.dataset.spring || 'REVEAL', delay + i * stagger, p => {
        u.style.opacity = p;
        u.style.transform = p >= 1 ? '' : `translateY(${(1 - p) * el._dist}em)`;
    }));
}
// data-rise="0.75rem" rises from below; data-fade fades in; data-draw grows from the left
function hideBlock(el) {
    el.style.opacity = 0;
    if (el.dataset.rise) el.style.transform = `translateY(${el.dataset.rise})`;
    if ('draw' in el.dataset) el.style.transform = 'scaleX(0)';
}
function playBlock(el, base = 0) {
    const delay = base + +(el.dataset.delay || 0);
    const rise = el.dataset.rise;
    const draw = 'draw' in el.dataset;
    animate(0, 1, el.dataset.spring || 'REVEAL', delay, p => {
        el.style.opacity = p;
        if (rise) el.style.transform = p >= 1 ? '' : `translateY(calc(${rise} * ${1 - p}))`;
        if (draw) el.style.transform = `scaleX(${p})`;
    });
}
const isText = el => 'split' in el.dataset;
const isBlock = el => 'rise' in el.dataset || 'fade' in el.dataset || 'draw' in el.dataset;

// A block of the page plays everything inside it once, when it comes into view
// (data-play="view") or when the loading screen is gone (data-play="ready").
function prepare(rootEl) {
    const items = $$('[data-split],[data-rise],[data-fade],[data-draw]', rootEl).filter(el => el.closest('[data-play]') === rootEl);
    if (rootEl.matches('[data-split],[data-rise],[data-fade],[data-draw]')) items.unshift(rootEl);
    if (!REDUCED) items.forEach(el => { if (isText(el)) hideText(el); if (isBlock(el)) hideBlock(el); });
    else items.forEach(el => { if (isText(el)) split(el); });
    rootEl._items = items;
}
function play(rootEl) {
    if (rootEl._played) return;
    rootEl._played = true;
    for (const el of rootEl._items || []) {
        if (isText(el)) playText(el);
        if (isBlock(el)) playBlock(el);
    }
    if (rootEl._onPlay) rootEl._onPlay();
}
function watchPlay(rootEl) {
    prepare(rootEl);
    if (rootEl.dataset.play === 'ready') return;
    const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { io.disconnect(); play(rootEl); }
    }, { rootMargin: rootEl.dataset.margin || '0px 0px -15% 0px' });
    io.observe(rootEl);
}

/* ============ SCROLL TRIGGERS ============
   progress 0 → 1 between two moments of an element's trip through the screen,
   named like "top bottom" (the element's top meets the screen's bottom). */
const poses = (bb, vh) => ({
    'top top': bb.top, 'center top': bb.top + bb.height / 2, 'bottom top': bb.bottom,
    'top bottom': bb.top - vh, 'center bottom': bb.top + bb.height / 2 - vh, 'bottom bottom': bb.bottom - vh,
    'top center': bb.top - vh / 2, 'center center': bb.top + bb.height / 2 - vh / 2, 'bottom center': bb.bottom - vh / 2
});
function progressOf(el, start, end) {
    const p = poses(el.getBoundingClientRect(), innerHeight);
    const s = p[start], e = p[end];
    const length = Math.abs(s - e) || 1;
    return clamp(1 - (s + length) / length, 0, 1);
}
function scrub(el, start, end, fn, smooth = 0) {
    let shown = null;
    const tick = () => {
        const target = progressOf(el, start, end);
        shown = shown === null || !smooth || REDUCED ? target : shown + (target - shown) * smooth;
        if (Math.abs(shown - target) < 0.0005) shown = target;
        if (shown !== tick.last) { tick.last = shown; fn(shown); }
    };
    fn(progressOf(el, start, end));
    whileVisible(el, tick, 10, '20% 0px 20% 0px');
    addEventListener('resize', tick);
}

/* ============ THE STACK ============
   The top pins to the screen; as "What I can do" comes over it, the top shrinks
   to 90% and darkens to 55% (no shrinking on phones). */
function stack() {
    const layers = $$('.k-stack > .k-layer');
    const pinned = layers.slice(0, -1).map((layer, i) => ({
        inner: $('.k-layer-in', layer), shade: $('.k-layer-shade', layer), next: layers[i + 1]
    }));
    const phone = media('(max-width: 639px)');
    let queued = false;
    const apply = () => {
        queued = false;
        const view = innerHeight || 1;
        const shrink = phone.matches ? 0 : 0.1;
        for (const { inner, shade, next } of pinned) {
            const p = clamp(1 - next.getBoundingClientRect().top / view, 0, 1);
            inner.style.transform = p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : '';
            inner.style.willChange = p > 0 && shrink > 0 ? 'transform' : '';
            shade.style.opacity = 0.55 * p;
            inner.style.visibility = p >= 1 ? 'hidden' : 'visible';
        }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    apply();
}

/* ============ CHEQUERED SEAMS ============
   The colour of the block above carries into the top of the next one as solid rows,
   breaks into a chequerboard and burns off as you scroll. */
function cheq(canvas) {
    const CELL = 24, SOLID_UNTIL = 0.16, LIFT = 2, ACCENT_SHARE = 0.06;
    const noise = (x, y) => {
        let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    };
    const style = getComputedStyle(canvas);
    const surface = style.getPropertyValue(canvas.dataset.carry === 'dark' ? '--ink' : '--paper').trim();
    const accent = style.getPropertyValue('--gray').trim();
    const ctx = canvas.getContext('2d');
    let progress = 0;
    const render = () => {
        const ratio = Math.min(devicePixelRatio || 1, 2);
        const width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height) return;
        if (canvas.width !== Math.round(width * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const columns = Math.ceil(width / CELL), rows = Math.ceil(height / CELL), lift = progress * LIFT;
        for (let y = 0; y < rows; y++) {
            const depth = y / Math.max(1, rows - 1) + lift;
            if (depth > 1) break;
            const solid = depth <= SOLID_UNTIL;
            const fade = clamp(1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL), 0, 1);
            if (!solid && fade <= 0) break;
            for (let x = 0; x < columns; x++) {
                if (!solid) {
                    if ((x + y) % 2 !== 0) continue;
                    if (noise(x, y) > fade) continue;
                }
                ctx.fillStyle = !solid && noise(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
                ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
        }
    };
    scrub(canvas, 'top bottom', 'top top', p => { progress = p; render(); }, 0.18);
    addEventListener('resize', render);
}

/* ============ THE TOP: your photo, drawn by the graphics card ============
   Your photo, in black and white. Around the mouse (and along the path it has just taken)
   your face turns into code: a grid of numbers and the letters of your name, dark where
   the photo is dark, flickering as it changes. On arrival you are all code, and it
   decodes into the photo from the crown down. Rolling contour lines run behind everything.
   On a touch screen a finger does what the mouse does, and a slow sweep does it by
   itself now and then. */
function heroScene() {
    const canvas = $('#scene'), section = $('#home'), figBox = $('#figbox'), still = $('#still');
    const coarse = media('(hover: none) and (pointer: coarse)').matches;
    const width0 = innerWidth;
    const tierName = width0 < 768 || (coarse && width0 < 1024) ? 'mobile' : coarse || width0 < 1280 ? 'tablet' : 'desktop';
    const mobile = tierName === 'mobile';
    const TIER = {
        dpr: mobile ? 1 : tierName === 'tablet' ? 1.25 : 1.5,
        frame: tierName === 'desktop' ? 0 : 1000 / 60 - 2,
        pointer: !coarse && !REDUCED,
        samples: mobile ? 28 : tierName === 'tablet' ? 44 : 72,
        reveal: true,
        sweep: coarse && !REDUCED,
        freeze: REDUCED
    };
    const P = {
        trailRadius: 0.46, trailIdleScale: 0.28, trailTaper: 1.9, trailTaperIdle: 1.6, trailTaperFast: 1.25, trailLength: 0.64,
        revealThreshold: 0.08, revealEdge: 0.005, revealWarp: 1.29, revealWarpScale: 2.9, revealSpeed: 1.25,
        pointerLerp: 0.17, pacePeak: 0.029, paceAttack: 0.09, paceRelease: 0.205, paceThreshold: 0.06, paceRamp: 0.15,
        introDuration: 4, burnStart: 0.14, burnSoftness: 0.02,
        riseDistance: 200, riseDuration: 2, parallax: 6, relight: 0.32,
        hoverRadius: 0.26
    };
    const N = TIER.samples;
    const PHOTO = { w: 374, h: 372 };
    // the characters your face turns into, drawn light on a black patch (false: dark on the light page)
    const GLYPHS = '0110KARLDSANTOS';
    const CODE_DARK = true;
    const STATIC_POSE = { x: 0.3, y: 0.1 };
    const SWEEP = [{ x: -0.85, y: -0.62 }, { x: 0.78, y: -0.2 }, { x: -0.7, y: 0.2 }, { x: 0.82, y: 0.6 }];

    // where the photo sits, in CSS pixels from the section's top left
    let rect = { x: 0, y: 0, w: 0, h: 0 };
    const layout = () => {
        const s = section.getBoundingClientRect();
        let x, y, w, h;
        if (innerWidth >= 1280) {
            h = Math.min(s.height * 0.8, s.width * 0.5);
            w = h * PHOTO.w / PHOTO.h;
            x = (s.width - w) / 2;
            y = s.height - h;
        } else {
            const b = figBox.getBoundingClientRect();
            // you stand on the buttons rather than behind them, and on tablets you start below your
            // name and the two panels, so no words ever sit on black
            const floor = Math.min(b.bottom, $('.hero-actions', section).getBoundingClientRect().top - 10);
            let top = b.top;
            if (innerWidth < 1024) top = Math.max(top, $('.hero-mid', section).getBoundingClientRect().bottom + 12);
            const room = floor - top;
            h = Math.max(120, Math.min(room, b.width * PHOTO.h / PHOTO.w));
            if (innerWidth >= 640) h = Math.min(h, room * 0.96);
            w = h * PHOTO.w / PHOTO.h;
            x = b.left - s.left + (b.width - w) / 2;
            y = floor - s.top - h;
        }
        rect = { x, y, w, h };
        still.style.left = x + 'px'; still.style.top = y + 'px'; still.style.width = w + 'px'; still.style.height = h + 'px';
    };

    const showStill = () => { canvas.style.display = 'none'; still.hidden = false; layout(); addEventListener('resize', layout); };
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: mobile ? 'default' : 'high-performance' });
    if (!gl) { showStill(); return { begin() {} }; }

    const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
    const FRAG = `#version 300 es
precision highp float;
#define N ${N}
out vec4 outColor;
uniform vec2 uRes;
uniform float uAspect, uTime, uRevealTime;
uniform vec3 uBg, uLine, uInk;
uniform vec2 uHover;
uniform float uHoverOn, uHoverRadius;
uniform float uRevealOpacity;
uniform sampler2D uPhoto, uGlyphs;
uniform vec2 uTexel;
uniform float uCell, uGlyphCount, uCodeDark, uFoot;
uniform vec4 uBox;
uniform vec2 uPointer;
uniform float uRelight, uIntro, uBurnStart, uBurnSoft, uScanMix, uRevealOn;
uniform vec2 uTrail[N];
uniform vec2 uTrailMin, uTrailMax;
uniform float uPace, uRadius, uIdleScale, uTaper, uTaperIdle, uTaperFast, uLength, uGateStart, uGateWidth, uThreshold, uEdge, uWarp, uWarpScale;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float field(vec2 p, float t) {
    float f = sin(p.x * 1.00 + t * 0.60) * 0.50;
    f += sin(p.y * 0.85 - t * 0.45) * 0.45;
    f += sin((p.x + p.y) * 0.65 + t * 0.35) * 0.35;
    f += sin((p.x - p.y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
}
float segment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
}
// x: the path the mouse has just taken, y: the disc around where it is now
vec2 revealMasks(vec2 ndc) {
    if (uRevealOn < 0.5) return vec2(0.0);
    vec2 bounded = vec2(ndc.x * uAspect, ndc.y);
    float gate = smoothstep(uGateStart, uGateStart + uGateWidth, uPace);
    bool inTrail = gate > 0.0 && !(any(lessThan(bounded, uTrailMin)) || any(greaterThan(bounded, uTrailMax)));
    bool nearHover = uHoverOn > 0.001 && length(bounded - uHover) < uHoverRadius + 0.2;
    if (!inTrail && !nearHover) return vec2(0.0);
    vec2 nuv = ndc * 0.5 + 0.5;
    float nx = vnoise(nuv * uWarpScale * 3.0 + vec2(uRevealTime * 0.21, uRevealTime * 0.15));
    float ny = vnoise(nuv * uWarpScale * 4.2 - vec2(uRevealTime * 0.18, uRevealTime * 0.27));
    vec2 point = bounded + (vec2(nx, ny) - 0.5) * uWarp * 0.22;
    float disc = nearHover ? smoothstep(uHoverRadius, uHoverRadius * 0.8, length(point - uHover)) * uHoverOn : 0.0;
    if (!inTrail) return vec2(0.0, disc);
    float radius = uRadius * mix(uIdleScale, 1.0, uPace);
    float taper = uTaper * mix(uTaperIdle, uTaperFast, uPace);
    float span = max(uLength * float(N - 1), 1.0);
    float ceiling = uThreshold + uEdge;
    float trail = 0.0;
    for (int i = 0; i < N - 1; i++) {
        if (float(i) >= span) break;
        float weight = pow(1.0 - float(i) / span, taper);
        if (weight <= trail) break;
        vec2 a = vec2(uTrail[i].x * uAspect, uTrail[i].y);
        vec2 b = vec2(uTrail[i + 1].x * uAspect, uTrail[i + 1].y);
        float r = radius * weight;
        trail = max(trail, weight * smoothstep(r, r * 0.35, segment(point, a, b)));
        if (trail >= ceiling) break;
    }
    return vec2(smoothstep(uThreshold - uEdge, uThreshold + uEdge, trail) * gate, disc);
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 ndc = frag / uRes * 2.0 - 1.0;

    // the backdrop: contour lines of a slowly rolling field
    vec2 p = vec2(ndc.x * uAspect, ndc.y) * 3.8;
    float t = uTime * 1.66;
    vec2 q = p;
    q.x += sin(p.y * 0.8 + t * 0.7) * 0.37;
    q.y += cos(p.x * 0.7 - t * 0.6) * 0.37;
    float scaled = field(q, t) * 2.5;
    float w = max(fwidth(scaled) * 1.4, 1e-5);
    float line = 1.0 - smoothstep(0.0, w, abs(fract(scaled) - 0.5));
    vec3 col = mix(uBg, uLine, line * 0.85);

    vec2 masks = revealMasks(ndc);
    float trail = masks.x;
    if (uRevealOpacity > 0.001 && trail > 0.0) {
        float parity = mod(floor(scaled + 0.5), 2.0);
        vec3 shade = mix(vec3(0.80), vec3(0.70), parity);
        col = mix(col, shade, trail * uRevealOpacity);
    }

    // your photo
    vec2 local = (frag - uBox.xy) / uBox.zw;
    if (local.x > 0.0 && local.x < 1.0 && local.y > 0.0 && local.y < 1.0) {
        vec4 ph = texture(uPhoto, local);
        float a = ph.a * smoothstep(1.0, 0.8, local.y) * smoothstep(0.0, 0.06, local.x) * smoothstep(1.0, 0.94, local.x);
        if (uFoot > 0.0) a *= smoothstep(0.0, uFoot, local.y);
        if (a > 0.002) {
            float l = lum(ph.rgb);
            float lx0 = lum(texture(uPhoto, local - vec2(uTexel.x, 0.0)).rgb);
            float lx1 = lum(texture(uPhoto, local + vec2(uTexel.x, 0.0)).rgb);
            float ly0 = lum(texture(uPhoto, local - vec2(0.0, uTexel.y)).rgb);
            float ly1 = lum(texture(uPhoto, local + vec2(0.0, uTexel.y)).rgb);
            float g = l + (l - (lx0 + lx1 + ly0 + ly1) * 0.25) * 0.8;
            g = clamp((g - 0.5) * 1.12 + 0.5, 0.0, 1.0);
            vec3 n = normalize(vec3((lx0 - lx1) * 3.0, (ly0 - ly1) * 3.0, 1.0));
            vec3 L = normalize(vec3(uPointer * 1.6, 1.0));
            float lambert = max(dot(n, L), 0.0) - 0.72;
            float photo = clamp(g * (1.0 + lambert * uRelight), 0.0, 1.0);
            photo += (hash(frag + fract(uTime * 7.0) * 113.0) - 0.5) * 0.035;

            // the code: one character per cell, chosen at random and changed now and then,
            // drawn dark where the photo is dark (or light where it is light, on black)
            vec2 cellPos = (frag - uBox.xy) / uCell;
            vec2 cid = floor(cellPos), cuv = fract(cellPos);
            float cl = lum(texture(uPhoto, (cid + 0.5) * uCell / uBox.zw).rgb);
            cl = clamp((cl - 0.5) * 1.2 + 0.5, 0.0, 1.0);
            float flick = floor(uTime * (1.5 + hash(cid) * 5.0) + hash(cid + 7.0) * 10.0);
            float gi = floor(hash(cid + flick * 0.37) * uGlyphCount);
            vec2 guv = vec2((gi + cuv.x) / uGlyphCount, cuv.y);
            float ink = textureGrad(uGlyphs, guv, vec2(dFdx(cellPos.x) / uGlyphCount, dFdx(cellPos.y)), vec2(dFdy(cellPos.x) / uGlyphCount, dFdy(cellPos.y))).a;
            vec3 code = uCodeDark > 0.5
                ? mix(uInk, vec3(1.0), ink * (0.2 + 0.8 * cl))
                : mix(uBg, uInk, ink * (0.15 + 0.85 * (1.0 - cl)));

            // on arrival you are all code, decoding into the photo crown to chin; after that
            // the code shows only around the mouse
            float front = smoothstep(uBurnStart, 1.0, uIntro);
            float burnAt = mix(1.0 - local.y, vnoise(local * 7.0), 0.45);
            float intact = smoothstep(front - uBurnSoft, front + uBurnSoft, burnAt);
            float show = max(max(trail, masks.y), intact);
            col = mix(col, mix(vec3(photo), code, show), a);
            float edge = 4.0 * intact * (1.0 - intact);
            col = mix(col, uCodeDark > 0.5 ? vec3(1.0) : uInk, clamp(edge * 1.1, 0.0, 1.0) * a);
        }
    }
    outColor = vec4(col, 1.0);
}`;

    // The shader is compiled in the background where the browser allows it, so the page
    // never freezes while the graphics card prepares it (it can take a second on some laptops).
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    const parallel = gl.getExtension('KHR_parallel_shader_compile');
    let programReady = false;
    const U = {};
    const setup = () => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog));
        showStill();
        return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ['uGlyphs', 'uCell', 'uGlyphCount', 'uCodeDark', 'uFoot', 'uInk', 'uHover', 'uHoverOn', 'uHoverRadius', 'uRes', 'uAspect', 'uTime', 'uRevealTime', 'uBg', 'uLine', 'uRevealOpacity', 'uPhoto', 'uTexel', 'uBox', 'uPointer', 'uRelight', 'uIntro',
     'uBurnStart', 'uBurnSoft', 'uScanMix', 'uRevealOn', 'uTrail', 'uTrailMin', 'uTrailMax', 'uPace', 'uRadius', 'uIdleScale', 'uTaper',
     'uTaperIdle', 'uTaperFast', 'uLength', 'uGateStart', 'uGateWidth', 'uThreshold', 'uEdge', 'uWarp', 'uWarpScale']
        .forEach(name => { U[name] = gl.getUniformLocation(prog, name); });
    const hex = v => { const n = parseInt(v.trim().replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
    const css = getComputedStyle(section);
    gl.uniform3fv(U.uBg, hex(css.getPropertyValue('--paper')));
    gl.uniform3fv(U.uLine, hex(css.getPropertyValue('--line-soft')));
    gl.uniform3fv(U.uInk, hex(css.getPropertyValue('--ink')));
    gl.uniform1f(U.uHoverRadius, P.hoverRadius);
    gl.uniform2f(U.uTexel, 1 / PHOTO.w, 1 / PHOTO.h);
    gl.uniform1f(U.uRelight, P.relight);
    gl.uniform1f(U.uBurnStart, P.burnStart);
    gl.uniform1f(U.uBurnSoft, P.burnSoftness);
    gl.uniform1f(U.uRadius, P.trailRadius);
    gl.uniform1f(U.uIdleScale, P.trailIdleScale);
    gl.uniform1f(U.uTaper, P.trailTaper);
    gl.uniform1f(U.uTaperIdle, P.trailTaperIdle);
    gl.uniform1f(U.uTaperFast, P.trailTaperFast);
    gl.uniform1f(U.uLength, P.trailLength);
    gl.uniform1f(U.uGateStart, P.paceThreshold);
    gl.uniform1f(U.uGateWidth, P.paceRamp);
    gl.uniform1f(U.uThreshold, P.revealThreshold);
    gl.uniform1f(U.uEdge, P.revealEdge);
    gl.uniform1f(U.uWarp, P.revealWarp);
    gl.uniform1f(U.uWarpScale, P.revealWarpScale);
    gl.uniform1i(U.uPhoto, 0);
    gl.uniform1i(U.uGlyphs, 1);
    gl.uniform1f(U.uGlyphCount, GLYPHS.length);
    gl.uniform1f(U.uCodeDark, CODE_DARK ? 1 : 0);
    programReady = true;
    resize();
    };
    if (parallel) {
        const poll = () => gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR) ? setup() : setTimeout(poll, 30);
        poll();
    } else setTimeout(setup, 0);

    // pointer, its eased copy, how fast it moves, and its recent path
    const pointer = { ...STATIC_POSE }, smoothed = { ...STATIC_POSE }, last = { ...STATIC_POSE };
    let seen = false, pace = 0;
    const trail = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { trail[i * 2] = STATIC_POSE.x; trail[i * 2 + 1] = -STATIC_POSE.y; }
    const onMove = e => {
        pointer.x = e.clientX / innerWidth * 2 - 1;
        pointer.y = e.clientY / innerHeight * 2 - 1;
        if (!seen) {
            seen = true;
            smoothed.x = last.x = pointer.x; smoothed.y = last.y = pointer.y;
            for (let i = 0; i < N; i++) { trail[i * 2] = pointer.x; trail[i * 2 + 1] = -pointer.y; }
        }
    };
    if (TIER.pointer) addEventListener('pointermove', onMove, { passive: true });
    // the disc around the mouse shows while the mouse is over the top block
    let hover = 0, inside = false, touchUntil = 0;
    addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const s = section.getBoundingClientRect();
        inside = e.clientY >= s.top && e.clientY <= s.bottom && e.clientX >= s.left && e.clientX <= s.right;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { inside = false; });
    addEventListener('blur', () => { inside = false; });
    // a finger on a touch screen shows you too
    const onTouch = e => {
        const touch = e.touches[0];
        if (!touch) return;
        pointer.x = touch.clientX / innerWidth * 2 - 1;
        pointer.y = touch.clientY / innerHeight * 2 - 1;
        if (performance.now() > touchUntil) { smoothed.x = last.x = pointer.x; smoothed.y = last.y = pointer.y; }
        touchUntil = performance.now() + 900;
    };
    if (media('(pointer: coarse)').matches) {
        section.addEventListener('touchstart', onTouch, { passive: true });
        section.addEventListener('touchmove', onTouch, { passive: true });
    }

    let ready = false, readyAt = null, started = false, riseAt = null, startTime = null, settled = false;
    let W = 1, H = 1, dpr = 1;
    const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, TIER.dpr);
        W = Math.max(1, section.clientWidth); H = Math.max(1, section.clientHeight);
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        layout();
        settled = false;
        if (TIER.freeze || !onScreen()) draw(performance.now());
    };
    const onScreen = () => scrollY <= innerHeight * 1.15 && !document.hidden;

    const draw = now => {
        if (!ready || !programReady) return;
        if (startTime === null) startTime = now;
        const t = (now - startTime) / 1000;
        if (readyAt === null && started) readyAt = t;
        const intro = TIER.freeze ? 1 : readyAt === null ? 0 : Math.min(1, (t - readyAt) / P.introDuration);

        // touch screens without a mouse: an idle sweep stands in for one
        const touching = now < touchUntil;
        if (TIER.sweep && intro >= 1 && !touching && now - touchUntil > 2500) {
            const cycle = t % 5, slot = 0.45, leg = Math.floor(cycle / slot);
            if (leg < SWEEP.length - 1) {
                const local = Math.min(1, (cycle - leg * slot) / slot), eased = 1 - (1 - local) * (1 - local);
                const a = SWEEP[leg], b = SWEEP[leg + 1];
                pointer.x = (a.x + (b.x - a.x) * eased) * 0.76;
                pointer.y = (a.y + (b.y - a.y) * eased) * 0.76;
            }
        }
        smoothed.x += (pointer.x - smoothed.x) * P.pointerLerp;
        smoothed.y += (pointer.y - smoothed.y) * P.pointerLerp;
        const step = Math.hypot(smoothed.x - last.x, smoothed.y - last.y);
        if (TIER.pointer || TIER.sweep) {
            const target = Math.min(1, step / P.pacePeak);
            pace += (target - pace) * (target > pace ? P.paceAttack : P.paceRelease);
        } else pace = 0;
        if (now < touchUntil) pace = Math.max(pace, 0.4);
        last.x = smoothed.x; last.y = smoothed.y;
        trail.copyWithin(2, 0, N * 2 - 2);
        trail[0] = smoothed.x; trail[1] = -smoothed.y;

        // the bounding box of the part of the trail the shader visits, plus the brush and the wobble
        const aspect = W / H;
        const active = Math.min(N, Math.ceil(P.trailLength * (N - 1)) + 1);
        const margin = P.trailRadius + P.revealWarp * 0.22 + 0.05;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < active; i++) {
            const x = trail[i * 2] * aspect, y = trail[i * 2 + 1];
            if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }

        // the rise into place once the loading screen is gone (ease-out over two seconds)
        let drop = TIER.freeze ? 0 : P.riseDistance;
        if (started && !TIER.freeze) {
            if (riseAt === null) riseAt = t;
            const u = Math.min(1, (t - riseAt) / P.riseDuration);
            drop = P.riseDistance * (1 - u) * (1 - u);
        }
        const bx = rect.x + smoothed.x * P.parallax;
        const by = rect.y + drop - smoothed.y * P.parallax * 0.6;

        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uAspect, aspect);
        gl.uniform1f(U.uTime, TIER.freeze ? 0 : t);
        gl.uniform1f(U.uRevealTime, t * P.revealSpeed);
        gl.uniform1f(U.uRevealOpacity, 0);
        gl.uniform1f(U.uCell, Math.max(7, Math.round(rect.h / 64)) * dpr);
        gl.uniform1f(U.uFoot, innerWidth < 1280 ? 0.08 : 0);
        gl.uniform4f(U.uBox, bx * dpr, (H - by - rect.h) * dpr, rect.w * dpr, rect.h * dpr);
        gl.uniform2f(U.uPointer, smoothed.x, -smoothed.y);
        const wantHover = intro > 0.3 && ((TIER.pointer && seen && inside) || touching) ? 1 : 0;
        hover += (wantHover - hover) * (wantHover > hover ? 0.14 : 0.08);
        gl.uniform1f(U.uHoverOn, hover < 0.002 ? 0 : hover);
        gl.uniform2f(U.uHover, smoothed.x * aspect, -smoothed.y);
        gl.uniform1f(U.uIntro, intro);
        const span = 1 - P.burnStart, x = clamp((intro - P.burnStart) / span, 0, 1);
        gl.uniform1f(U.uScanMix, TIER.reveal ? x * x * (3 - 2 * x) : 0);
        gl.uniform1f(U.uRevealOn, TIER.reveal && intro > 0 ? 1 : 0);
        gl.uniform2fv(U.uTrail, trail);
        gl.uniform2f(U.uTrailMin, minX - margin, minY - margin);
        gl.uniform2f(U.uTrailMax, maxX + margin, maxY + margin);
        gl.uniform1f(U.uPace, pace);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (TIER.freeze && intro >= 1) settled = true;
    };

    // the characters, drawn once onto a strip and handed to the graphics card on unit 1
    const glyphs = () => {
        const size = 64, c = document.createElement('canvas');
        c.width = size * GLYPHS.length; c.height = size;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.font = '700 ' + size * 0.8 + 'px "JetBrains Mono", ui-monospace, monospace';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        [...GLYPHS].forEach((ch, i) => g.fillText(ch, i * size + size / 2, size * 0.56));
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.activeTexture(gl.TEXTURE0);
    };
    (document.fonts ? document.fonts.load('700 40px "JetBrains Mono"').catch(() => {}) : Promise.resolve()).then(glyphs);
    const img = new Image();
    img.onload = () => {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        ready = true;
        resize();
        draw(performance.now());
    };
    img.onerror = () => { reportFailure('images/Santoss.png'); showStill(); };
    img.src = 'images/Santoss.png';

    let rq = 0;
    addEventListener('resize', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(resize); });
    ticker.add(now => { if (!settled && onScreen()) draw(now); }, TIER.frame);
    resize();
    return { begin() { started = true; } };
}

/* ============ WHAT I CAN DO: the circuit map ============ */
function skills() {
    const frame = $('#skframe'), art = $('#skart'), dotsCanvas = $('#skdots'), traceCanvas = $('#sktrace'), svg = $('#skmap');
    const section = $('#skills');
    const NS = 'http://www.w3.org/2000/svg';
    const el = (name, attrs, parent = svg) => {
        const node = document.createElementNS(NS, name);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        parent.appendChild(node);
        return node;
    };

    // 1. the circuit: a closed loop of straight runs with 45-degree corners, clockwise from the flag
    const WAY = [[600, 640], [560, 640], [560, 300], [700, 160], [1000, 160], [1080, 240], [1320, 240], [1320, 520],
                 [1180, 660], [940, 660], [860, 580], [700, 580], [640, 640], [600, 640]];
    const CUT = 16;
    const corners = [WAY[0]];
    for (let i = 1; i < WAY.length - 1; i++) {
        const [px, py] = WAY[i - 1], [cx, cy] = WAY[i], [nx, ny] = WAY[i + 1];
        const li = Math.hypot(cx - px, cy - py), lo = Math.hypot(nx - cx, ny - cy);
        corners.push([cx - (cx - px) / li * CUT, cy - (cy - py) / li * CUT], [cx + (nx - cx) / lo * CUT, cy + (ny - cy) / lo * CUT]);
    }
    corners.push(WAY[WAY.length - 1]);
    const STEP = 3;
    const PATH = [corners[0]];
    for (let i = 1; i < corners.length; i++) {
        const [ax, ay] = corners[i - 1], [bx, by] = corners[i];
        const len = Math.hypot(bx - ax, by - ay), count = Math.max(1, Math.round(len / STEP));
        for (let k = 1; k <= count; k++) PATH.push([ax + (bx - ax) * k / count, ay + (by - ay) * k / count]);
    }
    const CUMULATIVE = [0];
    for (let i = 1; i < PATH.length; i++) CUMULATIVE.push(CUMULATIVE[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
    const TOTAL = CUMULATIVE[CUMULATIVE.length - 1];
    // pacing from the path's own corners: it brakes into them and runs away down the straights
    const TIME_AT = (() => {
        const count = PATH.length, turn = new Array(count).fill(0);
        for (let i = 1; i < count - 1; i++) {
            const ux = PATH[i][0] - PATH[i - 1][0], uy = PATH[i][1] - PATH[i - 1][1];
            const vx = PATH[i + 1][0] - PATH[i][0], vy = PATH[i + 1][1] - PATH[i][1];
            const l = (Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1);
            turn[i] = Math.acos(clamp((ux * vx + uy * vy) / l, -1, 1));
        }
        const smooth = turn.map((_, i) => {
            let sum = 0, n = 0;
            for (let j = Math.max(0, i - 6); j <= Math.min(count - 1, i + 6); j++) { sum += turn[j]; n++; }
            return sum / n;
        });
        const acc = [0];
        for (let i = 1; i < count; i++) acc.push(acc[i - 1] + (CUMULATIVE[i] - CUMULATIVE[i - 1]) * (1 + 9 * smooth[i]));
        return acc.map(v => v / acc[count - 1]);
    })();
    const distanceAt = time => {
        if (time <= 0) return 0;
        if (time >= 1) return TOTAL;
        let lo = 0, hi = TIME_AT.length - 1;
        while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (TIME_AT[mid] <= time) lo = mid; else hi = mid; }
        const r = (time - TIME_AT[lo]) / (TIME_AT[hi] - TIME_AT[lo] || 1);
        return CUMULATIVE[lo] + (CUMULATIVE[hi] - CUMULATIVE[lo]) * r;
    };
    const nearest = (x, y) => {
        let best = 0, bd = Infinity;
        PATH.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
        return best;
    };
    // four of your skills along the way
    const MARKERS = [
        { at: [560, 450], label: 'Troubleshooting', dx: 16, dy: 4, anchor: 'start' },
        { at: [850, 160], label: 'Networking', dx: 0, dy: -18, anchor: 'middle' },
        { at: [1320, 380], label: 'Help desk', dx: -16, dy: 4, anchor: 'end' },
        { at: [1060, 660], label: 'Websites', dx: 0, dy: 30, anchor: 'middle' }
    ].map(m => { const i = nearest(...m.at); return { ...m, x: PATH[i][0], y: PATH[i][1], d: CUMULATIVE[i] }; });

    // 2. the map: dashed grid axes, rings on the hub, corner marks, the circuit at rest
    const HUB = { x: 940, y: 410 };
    const grid = el('g', { stroke: '#4d4d4d', 'stroke-width': 1.2, 'stroke-dasharray': '6.83 4.69', fill: 'none' });
    const axes = [585, 940, 1295].map(x => el('line', { x1: x, y1: -2000, x2: x, y2: 2800 }, grid));
    axes.push(el('line', { x1: -2000, y1: HUB.y, x2: 3440, y2: HUB.y }, grid));
    el('circle', { cx: HUB.x, cy: HUB.y, r: 39, fill: 'none', stroke: '#4d4d4d', 'stroke-width': 1.7 });
    el('circle', { cx: HUB.x, cy: HUB.y, r: 200, fill: 'none', stroke: '#1e1e1e', 'stroke-width': 1.2 });
    el('circle', { cx: HUB.x, cy: HUB.y, r: 249, fill: 'none', stroke: '#1e1e1e', 'stroke-width': 1.2 });
    const ping = el('circle', { cx: HUB.x, cy: HUB.y, r: 6, fill: 'none', stroke: '#fff', 'stroke-width': 1.2, opacity: 0 });
    el('circle', { cx: HUB.x, cy: HUB.y, r: 6, fill: '#f7fafb' });
    [[37, 39], [1389, 39], [37, 519], [1389, 519], [37, 750], [649, 750], [778, 750]].forEach(([x, y]) =>
        el('rect', { x: x - 4.7, y: y - 4.7, width: 9.4, height: 9.4, fill: '#f7fafb' }));
    const d = 'M' + corners.map(p => p.join(' ')).join('L');
    el('path', { d, fill: 'none', stroke: 'rgb(255 255 255 / .14)', 'stroke-width': 5.9, 'stroke-linejoin': 'round' });
    const labels = MARKERS.map(m => {
        el('rect', { x: m.x - 5, y: m.y - 5, width: 10, height: 10, fill: '#090a0b', stroke: '#7a7a7a', 'stroke-width': 1, class: 'pad' });
        const t = el('text', { x: m.x + m.dx, y: m.y + m.dy, 'text-anchor': m.anchor, class: 'lbl', opacity: 0.4 });
        t.textContent = m.label;
        return t;
    });
    const pads = $$('.pad', svg);
    // the chequered flag across the start
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) if ((r + c) % 2 === 0)
        el('rect', { x: 596 + c * 5, y: 630 + r * 5, width: 5, height: 5, fill: '#f7fafb' });

    // 3. the halftone: a dotted landmass under the circuit, made from a few soft blobs
    const PITCH = 6, OX = 3, OY = 3, R = 1.05;
    const BLOBS = [[950, 410, 430, 300, 1], [640, 560, 220, 180, .6], [1250, 250, 230, 170, .6], [1150, 650, 260, 150, .55], [760, 200, 200, 130, .5], [430, 680, 160, 100, .35]];
    const COLS = Math.ceil(1440 / PITCH), ROWS = Math.ceil(800 / PITCH);
    const cell = new Int32Array(COLS * ROWS).fill(-1);
    const xs = [], ys = [], ci = [], cj = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const x = OX + i * PITCH, y = OY + j * PITCH;
        let f = 0;
        for (const [bx, by, rx, ry, wgt] of BLOBS) { const u = (x - bx) / rx, v = (y - by) / ry; f += wgt * Math.exp(-(u * u + v * v)); }
        f += 0.16 * (Math.sin(x * 0.013 + y * 0.007) + Math.sin(y * 0.019 - x * 0.011)) + 0.06 * Math.sin(x * 0.05) * Math.cos(y * 0.043);
        if (f > 0.62) { cell[j * COLS + i] = xs.length; xs.push(x); ys.push(y); ci.push(i); cj.push(j); }
    }
    const COUNT = xs.length;
    const level = new Float32Array(COUNT), inList = new Uint8Array(COUNT), activeList = new Int32Array(COUNT);
    let activeCount = 0;

    // 4. fitting the 1440 x 800 artboard into the block
    let scale = 1, ratio = 1;
    const box = (() => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        PATH.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
        return { x: x0 - 120, y: y0 - 46, w: x1 - x0 + 220, h: y1 - y0 + 92 };
    })();
    const baked = document.createElement('canvas');
    const fit = () => {
        const w = frame.clientWidth, h = frame.clientHeight;
        if (innerWidth >= 1024) {
            scale = Math.min(Math.max(w / 1440, h / 800), w / 1150);     // cover the block, but never crop the circuit
            const tx = Math.min((w - 1440 * scale) / 2, w - 1350 * scale);
            art.style.transform = `translate(${tx}px, ${(h - 800 * scale) / 2}px) scale(${scale})`;
        } else {
            scale = w / box.w;
            const middle = innerWidth < 640 ? 0.44 : 0.52;
            art.style.transform = `translate(${-box.x * scale}px, ${h * middle - (box.y + box.h / 2) * scale}px) scale(${scale})`;
        }
        svg.style.setProperty('--lbl', `${Math.max(13, 11 / scale).toFixed(1)}px`);
        ratio = Math.min(devicePixelRatio || 1, media('(pointer: coarse)').matches ? 1 : 2) * Math.max(1, scale);
        for (const c of [dotsCanvas, traceCanvas]) { c.width = Math.round(1440 * ratio); c.height = Math.round(800 * ratio); }
        baked.width = dotsCanvas.width; baked.height = dotsCanvas.height;
        const b = baked.getContext('2d');
        b.setTransform(ratio, 0, 0, ratio, 0, 0);
        b.fillStyle = '#7a7a7a';
        b.beginPath();
        for (let k = 0; k < COUNT; k++) { b.moveTo(xs[k] + R, ys[k]); b.arc(xs[k], ys[k], R, 0, Math.PI * 2); }
        b.fill();
        drawDots();
        renderTrace(lap);
    };

    const dctx = dotsCanvas.getContext('2d');
    const drawDots = () => {
        dctx.setTransform(1, 0, 0, 1, 0, 0);
        dctx.clearRect(0, 0, dotsCanvas.width, dotsCanvas.height);
        dctx.drawImage(baked, 0, 0);
        dctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        let drew = 0;
        for (let k = 0; k < activeCount; k++) {
            const i = activeList[k];
            if (level[i] < 0.34) continue;
            dctx.clearRect(xs[i] - R - 0.5, ys[i] - R - 0.5, R * 2 + 1, R * 2 + 1);
            drew++;
        }
        if (!drew) return;
        for (let k = 0; k < activeCount; k++) {
            const i = activeList[k], v = level[i];
            if (v < 0.34 || ((ci[i] + cj[i]) & 1)) continue;      // a chequer: only one colour of the board fills
            const t = Math.min(1, (v - 0.34) / 0.66), side = PITCH * (0.7 + 0.3 * t);
            const g = Math.round(v > 0.8 ? 255 : v > 0.5 ? 205 : 122 + (205 - 122) * v);
            dctx.fillStyle = `rgb(${g} ${g} ${g})`;
            dctx.fillRect(xs[i] - side / 2, ys[i] - side / 2, side, side);
        }
    };

    // 5. the lap: one six-second pass when the block arrives, then the head cools to a plain line
    const tctx = traceCanvas.getContext('2d');
    let lap = 0, heat = 1;
    const stroke = (points, from = 0) => {
        tctx.beginPath();
        tctx.moveTo(points[from][0], points[from][1]);
        for (let i = from + 1; i < points.length; i++) tctx.lineTo(points[i][0], points[i][1]);
        tctx.stroke();
    };
    const trailTo = dist => {
        const out = [];
        for (let i = 0; i < PATH.length; i++) {
            if (CUMULATIVE[i] <= dist) { out.push(PATH[i]); continue; }
            const a = PATH[i - 1], b = PATH[i], r = (dist - CUMULATIVE[i - 1]) / (CUMULATIVE[i] - CUMULATIVE[i - 1]);
            out.push([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]);
            break;
        }
        return out;
    };
    function renderTrace(progress) {
        tctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        tctx.clearRect(0, 0, 1440, 800);
        const dist = distanceAt(progress);
        const points = trailTo(dist);
        if (points.length > 1) {
            tctx.lineCap = 'round'; tctx.lineJoin = 'round';
            tctx.save();
            tctx.globalCompositeOperation = 'lighter';
            tctx.strokeStyle = 'rgb(255 255 255 / .05)'; tctx.lineWidth = 15; stroke(points);
            tctx.strokeStyle = 'rgb(255 255 255 / .1)'; tctx.lineWidth = 6.75; stroke(points);
            tctx.restore();
            tctx.strokeStyle = 'rgb(255 255 255 / .9)'; tctx.lineWidth = 3.2; stroke(points);
            const head = Math.round(210 / STEP), from = Math.max(0, points.length - head), tip = points[points.length - 1];
            if (heat > 0.01 && points.length - from > 1) {
                const g = tctx.createLinearGradient(points[from][0], points[from][1], tip[0], tip[1]);
                g.addColorStop(0, 'rgb(255 255 255 / 0)');
                g.addColorStop(1, `rgb(255 255 255 / ${heat})`);
                tctx.strokeStyle = g; tctx.lineWidth = 5.9; stroke(points, from);
                tctx.save();
                tctx.globalCompositeOperation = 'lighter';
                const spark = tctx.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], 15);
                spark.addColorStop(0, `rgb(255 255 255 / ${0.85 * heat})`);
                spark.addColorStop(1, 'rgb(255 255 255 / 0)');
                tctx.fillStyle = spark; tctx.beginPath(); tctx.arc(tip[0], tip[1], 15, 0, Math.PI * 2); tctx.fill();
                tctx.restore();
            }
        }
        // the finish is cut out, so the line stops at the flag
        tctx.clearRect(594, 624, 14, 32);
        MARKERS.forEach((m, k) => {
            const lit = dist >= m.d;
            labels[k].setAttribute('opacity', lit ? 1 : 0.4);
            pads[k].setAttribute('fill', lit ? '#ffffff' : '#090a0b');
            if (!lit) return;
            const age = Math.min(1, (dist - m.d) / 90), radius = 12 + (1 - age) * 14;
            tctx.save();
            tctx.globalCompositeOperation = 'lighter';
            const g = tctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, radius);
            g.addColorStop(0, `rgb(255 255 255 / ${0.3 + 0.4 * (1 - age)})`);
            g.addColorStop(1, 'rgb(255 255 255 / 0)');
            tctx.fillStyle = g; tctx.beginPath(); tctx.arc(m.x, m.y, radius, 0, Math.PI * 2); tctx.fill();
            tctx.restore();
            if (age < 1) {
                tctx.strokeStyle = `rgb(255 255 255 / ${(1 - age) * 0.6})`; tctx.lineWidth = 1;
                tctx.beginPath(); tctx.arc(m.x, m.y, 9 + age * 20, 0, Math.PI * 2); tctx.stroke();
            }
        });
    }
    const tween = (ms, ease, fn, done) => {
        const t0 = performance.now();
        const stop = ticker.add(now => {
            const u = Math.min(1, (now - t0) / ms);
            fn(ease(u));
            if (u >= 1) { stop(); if (done) done(); }
        });
    };
    let armed = false;
    const startLap = () => {
        if (REDUCED) { lap = 1; heat = 0; renderTrace(1); return; }
        tween(6000, u => -(Math.cos(Math.PI * u) - 1) / 2, v => { lap = v; renderTrace(v); }, () =>
            tween(800, u => 1 - Math.pow(1 - u, 3), v => { heat = 1 - v; renderTrace(1); }, () => { armed = FINE; }));
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); startLap(); } }, { threshold: 0.35 });
    io.observe(frame);

    // 6. after the lap: the mouse is a reticle over the map, squaring the dots up into a chequer
    const target = { x: 0, y: 0, on: false }, light = { x: 0, y: 0, heat: 0 };
    let spread = 0, lastT = 0;
    addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const s = section.getBoundingClientRect();
        target.on = e.clientY >= s.top && e.clientY <= s.bottom;
        const a = art.getBoundingClientRect();
        target.x = (e.clientX - a.left) / scale;
        target.y = (e.clientY - a.top) / scale;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { target.on = false; });
    addEventListener('blur', () => { target.on = false; });
    const approach = (from, to, dt, tau) => to + (from - to) * Math.exp(-dt / tau);
    const add = (i, v) => {
        if (v <= 0.02) return;
        if (v > level[i]) level[i] = v;
        if (!inList[i]) { inList[i] = 1; activeList[activeCount++] = i; }
    };
    const addPoint = (x, y, reach, heatV) => {
        const i0 = Math.max(0, Math.floor((x - reach - OX) / PITCH)), i1 = Math.min(COLS - 1, Math.ceil((x + reach - OX) / PITCH));
        const j0 = Math.max(0, Math.floor((y - reach - OY) / PITCH)), j1 = Math.min(ROWS - 1, Math.ceil((y + reach - OY) / PITCH));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const k = cell[j * COLS + i];
            if (k < 0) continue;
            const dd = Math.hypot(xs[k] - x, ys[k] - y) / reach;
            if (dd < 1) add(k, (1 - dd) * (1 - dd) * heatV);
        }
    };
    const frameDots = now => {
        const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
        lastT = now;
        const wanted = armed && target.on ? 0.95 : 0;
        if (light.heat <= 0.001 && wanted > 0) { light.x = target.x; light.y = target.y; }
        else if (dt > 0) {
            const px = light.x, py = light.y;
            light.x = approach(px, target.x, dt, 0.07);
            light.y = approach(py, target.y, dt, 0.07);
            const speed = Math.hypot(light.x - px, light.y - py) / dt;
            const want = Math.max(0, 1 - speed / 506);
            spread = approach(spread, want, dt, want > spread ? 0.38 : 0.09);
        }
        light.heat = approach(light.heat, wanted, dt || 0.016, wanted > light.heat ? 0.14 : 0.3);
        if (light.heat < 0.005) { light.heat = 0; spread = 0; }
        const decay = Math.exp(-dt / 0.3);
        let write = 0;
        for (let k = 0; k < activeCount; k++) {
            const i = activeList[k], v = level[i] * decay;
            if (v > 0.02) { level[i] = v; activeList[write++] = i; } else { level[i] = 0; inList[i] = 0; }
        }
        const before = activeCount;
        activeCount = write;
        if (light.heat > 0.01) {
            const ciX = Math.round((light.x - OX) / PITCH), cjY = Math.round((light.y - OY) / PITCH);
            const arm = 0.82 * light.heat, reach = 236 * spread;
            if (reach > 1 && cjY >= 0 && cjY < ROWS) {
                const span = Math.ceil(reach / PITCH);
                for (let i = Math.max(0, ciX - span); i <= Math.min(COLS - 1, ciX + span); i++) {
                    const k = cell[cjY * COLS + i];
                    if (k >= 0) add(k, (1 - Math.abs(xs[k] - light.x) / reach) * arm);
                }
            }
            if (reach > 1 && ciX >= 0 && ciX < COLS) {
                const span = Math.ceil(reach / PITCH);
                for (let j = Math.max(0, cjY - span); j <= Math.min(ROWS - 1, cjY + span); j++) {
                    const k = cell[j * COLS + ciX];
                    if (k >= 0) add(k, (1 - Math.abs(ys[k] - light.y) / reach) * arm);
                }
            }
            addPoint(light.x, light.y, 30, light.heat);
        }
        if (activeCount || before) drawDots();
    };

    // 7. the slow things: grid dashes crawl, the hub pings, the plate's globe turns
    const meridian = $('.meridian');
    const slow = now => {
        const s = now / 1000;
        grid.setAttribute('stroke-dashoffset', -((s / 7) % 1) * 11.52);
        const v = (s / 4.2) % 1, e = 1 - (1 - v) * (1 - v);
        ping.setAttribute('r', 6 + e * 48);
        ping.setAttribute('opacity', 0.4 * (1 - e) * (1 - e));
        if (meridian) meridian.setAttribute('rx', Math.max(0.5, Math.abs(Math.cos(s / 10 * Math.PI * 2)) * 18));
    };
    if (!REDUCED) {
        whileVisible(section, slow, 33);
        if (FINE) whileVisible(section, frameDots, 0);
    }
    let rq = 0;
    addEventListener('resize', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(fit); });
    fit();
}

/* ============ THE MENU (phones and tablets) ============ */
function menu() {
    const sheet = $('#ksheet'), burger = $('#kburger'), close = $('#ksheetclose');
    const items = $$('.k-sheet-nav a', sheet);
    const open = () => {
        sheet.hidden = false;
        root.classList.add('locked');
        burger.setAttribute('aria-expanded', 'true');
        animate(0, 1, 'SHEET', 0, v => { sheet.style.opacity = v; });
        items.forEach((a, i) => animate(0, 1, 'ITEM', 120 + i * 55, v => { a.style.opacity = v; a.style.transform = `translateY(${(1 - v) * 0.75}rem)`; }));
        close.focus();
    };
    const shut = () => {
        if (sheet.hidden) return;
        sheet.hidden = true;
        root.classList.remove('locked');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus({ preventScroll: true });
    };
    burger.addEventListener('click', open);
    close.addEventListener('click', shut);
    $$('[data-close]', sheet).forEach(a => a.addEventListener('click', shut));
    addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
    media('(min-width: 1280px)').addEventListener('change', e => { if (e.matches) shut(); });
}

/* ============ START ============ */
const scene = heroScene();
['#home', '#skills'].forEach(sel => watchPlay($(sel)));
stack();
$$('.k-stack .cheq').forEach(cheq);
skills();
menu();

// script.js shows the loading screen and adds "ready" to the page when it is gone
let started = false;
const begin = () => { if (started || !root.classList.contains('ready')) return; started = true; play($('#home')); scene.begin(); };
new MutationObserver(begin).observe(root, { attributes: true, attributeFilter: ['class'] });
begin();

// the site's own menu bar stays hidden while the top is on screen
const heroEl = $('#home');
let queued = false;
const onHero = () => { queued = false; root.classList.toggle('on-hero', scrollY < heroEl.offsetHeight * 0.85); };
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(onHero); } }, { passive: true });
addEventListener('resize', onHero);
onHero();
})();
