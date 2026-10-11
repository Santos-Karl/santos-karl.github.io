/* ============ LIVE NETWORK (moving background of the top section) ============ */
/* Draws lines, small dots and travelling packets on <canvas id="net">.
   The six named dots are real links in index.html (.net-nodes): this file only moves them.
   Colours come from the tokens at the top of style.css, so the network follows the site colours. */

(() => {
    const canvas = document.getElementById('net'), hero = document.querySelector('.hero');
    if (!canvas || !hero) return;
    const g = canvas.getContext('2d');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const COLOR = { line: token('--color-rule-strong'), node: token('--color-ink-3'), bright: token('--color-ink') };

    /* ---- EDIT HERE: where each named dot sits ----
       First number: across the page (0 = left edge, 1 = right edge).
       Second number: down the top section (0 = top, 1 = bottom).
       Same order as the links in index.html. */
    const SPOTS = [[.6, .3], [.83, .2], [.72, .52], [.92, .6], [.58, .8], [.82, .86]];
    const SMALL_DOTS = 24;      // how many unnamed dots float around
    const REACH = 110;          // how close the mouse must be (in pixels) for a dot to react

    const links = [...document.querySelectorAll('.net-nodes a')];
    const nodes = links.map((el, i) => ({ el, x: SPOTS[i % SPOTS.length][0], y: SPOTS[i % SPOTS.length][1], p: Math.random() * 6 }));
    nodes.forEach(n => n.el.classList.toggle('flip', n.x > .88));      // near the right edge the name goes on the left
    for (let i = 0; i < SMALL_DOTS; i++) nodes.push({ x: Math.random(), y: Math.random(), p: Math.random() * 6 });

    let W = 0, H = 0, sizeKey = '', narrow = false, tick = 0, mouseX = -999, mouseY = -999;
    let base = [], edges = [], packets = [];

    // Work out where everything sits. Runs again whenever the page or the top section changes size.
    function layout() {
        const w = document.documentElement.clientWidth, heroH = hero.offsetHeight, h = hero.offsetTop + heroH + 90;
        if (w + ',' + h === sizeKey) return;
        sizeKey = w + ',' + h;
        W = w;
        H = h;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        narrow = W < 960;       // phones and tablets: the network spreads across the whole width, behind the text

        const top = 96, tall = heroH - 40;
        base = nodes.map(n => {
            const across = n.el ? (narrow ? .08 + (n.x - .55) * 2.1 : n.x) : (narrow ? .04 + n.x * .92 : .5 + n.x * .48);
            return [across * W, top + n.y * tall];
        });
        // join every dot to its two nearest neighbours
        edges = [];
        base.forEach((a, i) => {
            base.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).sort((p, q) => p[0] - q[0]).slice(1, 3).forEach(([, j]) => {
                if (!edges.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) edges.push([i, j]);
            });
        });
        packets = [];
    }

    const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); };
    const line = (a, b) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };

    function frame() {
        tick += 1;
        layout();
        g.clearRect(0, 0, W, H);
        const fade = narrow ? .45 : 1;      // quieter behind text
        // every dot drifts a little around its spot
        const P = base.map((b, i) => [b[0] + Math.sin(tick * .008 + nodes[i].p) * 6, b[1] + Math.cos(tick * .006 + nodes[i].p) * 6]);

        g.lineWidth = 1;
        g.strokeStyle = COLOR.line;
        g.globalAlpha = .7 * fade;
        edges.forEach(e => line(P[e[0]], P[e[1]]));

        // packets: bright dots that travel along a line and disappear at the other end
        if (!reduceMotion && tick % 10 === 0 && packets.length < 30 && edges.length) {
            packets.push({ edge: edges[Math.floor(Math.random() * edges.length)], at: 0, forward: Math.random() < .5 });
        }
        g.fillStyle = COLOR.bright;
        g.globalAlpha = fade;
        packets = packets.filter(p => {
            p.at += .011;
            if (p.at >= 1) return false;
            const a = P[p.edge[p.forward ? 0 : 1]], b = P[p.edge[p.forward ? 1 : 0]];
            dot(a[0] + (b[0] - a[0]) * p.at, a[1] + (b[1] - a[1]) * p.at, 2.2);
            return true;
        });

        P.forEach((p, i) => {
            const near = Math.hypot(p[0] - mouseX, p[1] - mouseY) < REACH;
            if (near) {
                g.strokeStyle = COLOR.bright;
                g.globalAlpha = .45 * fade;
                line(p, [mouseX, mouseY]);
            }
            if (nodes[i].el && !narrow) {
                // a named dot: move its link to this spot (the dot and its name are drawn by style.css)
                nodes[i].el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`;
            } else {
                g.fillStyle = near ? COLOR.bright : COLOR.node;
                g.globalAlpha = fade;
                dot(p[0], p[1], near ? 3.6 : 2.2);
            }
        });
        g.globalAlpha = 1;
    }

    addEventListener('pointermove', e => {
        mouseX = e.pageX;
        mouseY = e.pageY;
        if (reduceMotion) frame();
    });

    if (reduceMotion) {
        // no motion: draw one still picture and redraw it only when the page changes size
        frame();
        addEventListener('resize', frame);
        return;
    }

    // run only while the top section is on screen
    let raf = 0, running = false;
    function loop() {
        frame();
        raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(entries => {
        const visible = entries[0].isIntersecting;
        if (visible && !running) { running = true; loop(); }
        if (!visible && running) { running = false; cancelAnimationFrame(raf); }
    }, { rootMargin: '90px' }).observe(hero);
})();
