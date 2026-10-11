/* ============ I-TUNGKOD 3D MODEL ============ */
/* Draws the smart cane with the Three.js library. script.js loads this file and the
   library only when a visitor opens the I-Tungkod page of the project book.
   To rename, describe, move or add a part, edit the list under "PARTS" below.
   Sizes are in model units: the whole cane is about 10 units long. */

function createCaneViewer(stage, cap, chips) {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const title = cap.querySelector('b'), desc = cap.querySelector('span');
    const NAME = 'I-Tungkod';
    const HINT = 'Drag to rotate. Pick a part below to find it on the cane.';

    /* ---- scene, camera, lights ---- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D model of the I-Tungkod smart cane. Drag to rotate.');
    stage.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(4, 6, 8);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1);   // lights the cane from behind so it stands out on the dark page
    rimLight.position.set(-6, 3, -7);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2b2e35, 1), keyLight, rimLight);

    // pivot turns with the mouse, lean tilts the cane so it fills a wide frame, body holds every piece
    const pivot = new THREE.Group(), lean = new THREE.Group(), body = new THREE.Group();
    lean.rotation.z = 1;    // handle up-left, tip down-right: keeps clear of the zoom buttons and the caption
    body.position.y = -0.5;
    lean.add(body);
    pivot.add(lean);
    scene.add(pivot);

    /* ---- helpers for building shapes ---- */
    const mat = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const silver = () => mat(0xc9ccd1, 0.9, 0.3);
    function cyl(radius, height, material, x, y, z, parent = body, faceFront = false) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 40), material);
        mesh.position.set(x, y, z);
        if (faceFront) mesh.rotation.x = Math.PI / 2;
        parent.add(mesh);
    }
    function box(width, height, depth, material, x, y, z, parent = body) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
        mesh.position.set(x, y, z);
        parent.add(mesh);
    }

    /* ---- the cane itself ---- */
    const metal = mat(0x4a4e57, 0.6, 0.35), rubber = mat(0x26282d, 0.1, 0.85), ridge = mat(0x34373d, 0.1, 0.8);
    // the two housings share this material so they can turn see-through together
    const shell = new THREE.MeshStandardMaterial({ color: 0x2c2f36, metalness: 0.2, roughness: 0.6, transparent: true });
    cyl(0.09, 7.7, metal, 0, -0.15, 0);                          // shaft
    cyl(0.15, 0.4, rubber, 0, -4.2, 0);                          // rubber tip
    cyl(0.33, 0.08, rubber, 0, -3.95, 0);                        // disc above the tip
    cyl(0.11, 0.14, mat(0xd9dadd, 0.1, 0.7), 0, -2.05, 0);       // light collar above the sensor housing
    cyl(0.18, 1.7, rubber, 0, 4.5, 0);                           // handle grip
    for (let i = 0; i < 6; i++) cyl(0.195, 0.06, ridge, 0, 3.85 + i * 0.26, 0);   // grip ridges
    cyl(0.23, 0.14, rubber, 0, 5.4, 0);                          // end cap
    box(0.82, 1.3, 0.62, shell, 0, -2.85, 0.3);                  // sensor housing near the tip
    box(0.98, 2, 0.62, shell, 0, 2.35, 0.3);                     // electronics box near the handle

    /* ---- PARTS: name, description, which way to turn the cane, position, and how to draw it ---- */
    const parts = [];
    function part(name, text, yaw, x, y, z, build) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        body.add(group);
        build(group);
        const mats = [];
        group.traverse(o => { if (o.material) mats.push(o.material); });
        parts.push({ name, text, yaw, group, mats });
    }
    const FRONT = 0.5, BACK = Math.PI - 0.5;

    part('Ultrasonic sensor', 'Detects obstacles and objects in front of the user.', FRONT, 0, -2.5, 0.63, g => {
        box(0.64, 0.3, 0.05, mat(0x1f5fae, 0.2, 0.6), 0, 0, 0, g);
        cyl(0.11, 0.16, silver(), -0.17, 0, 0.09, g, true);
        cyl(0.11, 0.16, silver(), 0.17, 0, 0.09, g, true);
    });
    part('HuskyLens AI camera', 'Captures the surroundings for AI object recognition.', FRONT, 0, -3.05, 0.63, g => {
        box(0.48, 0.38, 0.05, mat(0x15171a, 0.3, 0.5), 0, 0, 0, g);
        cyl(0.14, 0.06, mat(0x8a8d93, 0.9, 0.3), 0, 0, 0.05, g, true);
        cyl(0.1, 0.14, mat(0x0c0d12, 0.4, 0.15), 0, 0, 0.08, g, true);
    });
    part('Water sensor', 'Detects water or wet surfaces to prevent slips and falls.', BACK, 0, -3.7, -0.13, g => {
        box(0.28, 0.52, 0.03, mat(0xc93a34, 0.2, 0.6), 0, 0, 0, g);
        for (let i = 0; i < 5; i++) box(0.025, 0.36, 0.012, mat(0xe7c9a0, 0.8, 0.4), -0.08 + i * 0.04, -0.05, -0.02, g);
    });
    part('GPS module', 'Tracks real-time location for caregivers or emergency contacts.', FRONT, 0, 3, 0.36, g => {
        box(0.52, 0.52, 0.04, mat(0x1f5fae, 0.2, 0.6), 0, 0, 0, g);
        box(0.36, 0.36, 0.09, mat(0xe2d3a8, 0.1, 0.7), 0, 0, 0.06, g);
    });
    part('GSM module', 'Sends emergency alerts and location over the mobile network.', FRONT, 0, 2.35, 0.36, g => {
        box(0.58, 0.5, 0.04, mat(0x1f5fae, 0.2, 0.6), 0, 0, 0, g);
        box(0.32, 0.3, 0.06, silver(), -0.06, 0, 0.05, g);
    });
    part('Microcontroller', 'Processes sensor data and controls the whole system.', FRONT, 0, 1.72, 0.36, g => {
        box(0.52, 0.38, 0.04, mat(0x15171a, 0.3, 0.5), 0, 0, 0, g);
        box(0.22, 0.2, 0.05, silver(), 0.06, 0, 0.045, g);
    });

    /* ---- view state: the values with "t" in front are where the view is heading ---- */
    const TAU = Math.PI * 2, HOME_YAW = -0.55, HOME_PITCH = 0.12;
    let yaw = HOME_YAW, pitch = HOME_PITCH, base = 10.5, dist = base;
    let tYaw = yaw, tPitch = pitch, tDist = dist;
    let selected = -1, autoSpin = !reduceMotion, dragging = false, lastX = 0, lastY = 0, tick = 0;
    const target = new THREE.Vector3(), tTarget = new THREE.Vector3();
    const buttons = [];

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    // the same angle, but the copy closest to where the cane is now, so it never spins back several turns
    const nearest = angle => angle + TAU * Math.round((tYaw - angle) / TAU);

    function select(i) {
        selected = i === selected ? -1 : i;       // clicking the chosen part again lets go of it
        autoSpin = false;
        buttons.forEach((b, j) => b.setAttribute('aria-pressed', j === selected));
        if (selected < 0) {
            title.textContent = NAME;
            desc.textContent = HINT;
            tDist = base;
            return;
        }
        title.textContent = parts[selected].name;
        desc.textContent = parts[selected].text;
        tYaw = nearest(parts[selected].yaw);
        tPitch = 0.1;
        tDist = 6;
    }
    function reset() {
        if (selected >= 0) select(selected);
        tYaw = nearest(HOME_YAW);
        tPitch = HOME_PITCH;
        tDist = base;
        autoSpin = !reduceMotion;
    }

    // one button per part, under the model
    parts.forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.name;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => select(i));
        chips.appendChild(b);
        buttons.push(b);
    });
    title.textContent = NAME;
    desc.textContent = HINT;

    /* ---- drawing ---- */
    function size() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const was = base;
        base = Math.max(10.5, 15 / camera.aspect);     // step back on narrow screens so the cane still fits
        if (tDist === was) tDist = base;
        renderer.render(scene, camera);
    }
    function frame() {
        tick += 1;
        const ease = reduceMotion ? 1 : 0.09;          // how fast the view glides to where it is heading
        if (autoSpin && !dragging) tYaw += 0.004;
        yaw += (tYaw - yaw) * ease;
        pitch += (tPitch - pitch) * ease;
        dist += (tDist - dist) * ease;
        pivot.rotation.set(pitch, yaw, 0);

        // look at the chosen part, or at the middle of the cane
        if (selected >= 0) parts[selected].group.getWorldPosition(tTarget); else tTarget.set(0, 0, 0);
        target.lerp(tTarget, ease);
        camera.position.set(target.x, target.y, target.z + dist);
        camera.lookAt(target);

        // housings turn see-through while a part is chosen, and the chosen part glows gently
        shell.opacity += ((selected >= 0 ? 0.14 : 1) - shell.opacity) * ease;
        shell.depthWrite = shell.opacity > 0.95;
        parts.forEach((p, i) => {
            const glow = i === selected ? (reduceMotion ? 0.16 : 0.14 + 0.07 * Math.sin(tick * 0.07)) : 0;
            p.mats.forEach(m => m.emissive.setScalar(glow));
        });
        renderer.render(scene, camera);
    }

    /* ---- mouse and touch: drag sideways to turn, a mouse can also tilt up and down ---- */
    canvas.addEventListener('pointerdown', e => {
        dragging = true;
        autoSpin = false;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        stage.classList.add('drag');
    });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        tYaw += (e.clientX - lastX) * 0.01;
        if (e.pointerType === 'mouse') tPitch = clamp(tPitch + (e.clientY - lastY) * 0.006, -0.9, 0.9);
        lastX = e.clientX;
        lastY = e.clientY;
    });
    ['pointerup', 'pointercancel'].forEach(name => canvas.addEventListener(name, () => {
        dragging = false;
        stage.classList.remove('drag');
    }));

    /* ---- run only while the model is on screen ---- */
    let running = false, onScreen = true, raf = 0;
    function loop() {
        if (onScreen) frame();
        raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(e => { onScreen = e[0].isIntersecting; }).observe(stage);
    new ResizeObserver(size).observe(stage);
    size();
    frame();

    return {
        zoom: amount => { tDist = clamp(tDist + amount, 4.2, base * 1.3); },
        reset,
        start() { if (!running) { running = true; loop(); } },
        stop() { running = false; cancelAnimationFrame(raf); }
    };
}
