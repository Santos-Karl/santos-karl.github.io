/* ============ EDIT HERE ============ */

// Email used when someone sends the contact form.
const CONTACT_EMAIL = 'karldsantos2004@gmail.com';

// The project book. Each project is one chapter: its picture on the left page, its text on the right.
// type: "web", "it" or "hardware". It sets the chapter name, the index tab and the picture frame
//   (websites sit in a browser window, the rest look like a printed photo). Keep each kind together.
// status (optional): a small label next to the chapter name, such as "Live" or "In progress".
// url (websites): the address shown in the browser bar above the picture.
// caption: the line under the picture.
// While the link is "#" the "View project" button stays hidden. "linkText" (optional) changes its words.
const PROJECTS = [
    {
        title: 'My Portfolio Website', type: 'web', status: 'Live', url: 'santos-karl.github.io', caption: 'The site you are on now',
        img: 'images/portfolio-site.jpg', link: 'https://github.com/Santos-Karl/santos-karl.github.io',
        desc: 'The website you are looking at, built from scratch as my main showcase.',
        tags: ['HTML', 'CSS', 'JavaScript'],
        details: ['Responsive layout for phone, tablet and desktop', 'Interactive project book and animations']
    },
    {
        title: 'Velora Online Store', type: 'web', status: 'Demo', url: 'localhost:8000', caption: 'Velora home page',
        img: 'images/velora-shop.jpg', link: '#',
        desc: 'A fashion and gadgets online store built with Laravel. It is a demo: the products, orders and payments are fake, and no real money is taken.',
        tags: ['Laravel', 'PHP', 'Tailwind CSS', 'SQLite'],
        details: ['Product search and filters, bag, wishlist and discount codes', 'Checkout with test cards, order tracking, cancellations and returns', 'Staff back office for products, stock, orders and reports, with a role for each kind of staff']
    },
    {
        title: 'Rooftop Fitness Gym Website', type: 'web', status: 'Team project', url: 'rooftop-gym-demo.vercel.app', caption: 'Rooftop home page',
        img: 'images/rooftop-gym.jpg', link: 'https://rooftop-gym-demo.vercel.app', linkText: 'Open live demo',
        desc: 'A website and check-in system for a gym in Dau, built with a friend. Members check in at the door with a QR code, and staff run the front desk from their own screens.',
        tags: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
        details: ['My part: the staff and owner screens (front desk, members, reports, settings and staff sign-in)', 'Team project: we worked in branches and pull requests on GitHub', 'Live demo with sample data, hosted on Vercel']
    },
    {
        title: 'TechSupport Lab', type: 'web', status: 'In progress', url: 'localhost:3000', caption: 'The help desk start page',
        img: 'images/techsupport-lab.jpg', link: '#',
        desc: 'A practice desk for entry-level IT support. You work tickets, take calls from a practice caller, manage user accounts and build a PC, all in the browser.',
        tags: ['Next.js', 'React', 'TypeScript', 'Prisma'],
        details: ['Ticket queue and practice phone calls with feedback on each answer', 'User directory for unlocking accounts and resetting access', 'Drag-and-drop PC build, step-by-step guides and PowerShell scripts']
    },
    {
        title: 'pfSense Firewall Installation & Configuration', type: 'it', caption: 'pfSense firewall setup',
        img: 'images/Firewall.jpg', link: '#',
        desc: 'Installed and configured pfSense to manage network traffic, restrict access to selected websites, and control bandwidth usage.',
        tags: ['pfSense'],
        details: ['Firewall installation and basic configuration', 'Network interface setup and firewall rules', 'Website blocking and traffic control']
    },
    {
        title: 'Operating System Installation & Setup', type: 'it', caption: 'Operating system installation',
        img: 'images/OSins.jpg', link: '#',
        desc: 'Installed and configured operating systems on computers, including preparing bootable USB drives and setting up essential system configurations.',
        tags: ['Windows OS', 'USB', 'PC Hardware'],
        details: ['Operating system installation and setup', 'Bootable USB creation and disk partitioning', 'Driver installation and basic system troubleshooting']
    },
    {
        title: 'PC Troubleshooting Log', type: 'it', caption: 'Finding a hardware fault',
        img: 'images/TShardwareissue.jpg', link: '#',
        desc: 'Notes on hardware and software problems I diagnosed and fixed.',
        tags: ['Hardware', 'Software', 'Documentation'],
        details: ['Symptoms, cause and fix for each problem', 'Practice writing clear technical notes']
    },
    {
        title: 'I-Tungkod Smart Assistive Cane', type: 'hardware', caption: 'I-Tungkod parts',
        img: 'images/tungkod-parts.jpg', link: '#',
        model: true,   // this page shows the interactive 3D model from cane3d.js, with the picture one click away
        desc: 'A smart assistive cane designed to support safer navigation for visually impaired individuals using sensors, AI camera technology, GPS tracking, and emergency communication.',
        tags: ['ESP32', 'Ultrasonic Sensor', 'Water Sensor', 'HuskyLens', 'GPS', 'GSM'],
        details: ['Ultrasonic and water sensors for obstacle and water detection', 'HuskyLens AI camera for object recognition', 'GPS and GSM modules for location tracking and emergency alerts']
    }
];

/* ============ HELPERS ============ */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// the "?v=..." this file was loaded with (set in index.html), reused for files loaded later such as cane3d.js
const VERSION = new URL(document.currentScript.src).search;

// Footer year
$('#year').textContent = new Date().getFullYear();

// Styled placeholder when an image file is missing
function placeholder(label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#161616"/><stop offset="1" stop-color="#1f1f1f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="48%" fill="#f3f4f5" font-family="monospace" font-size="26" text-anchor="middle">Add image</text><text x="50%" y="58%" fill="#9a9a9a" font-family="sans-serif" font-size="22" text-anchor="middle">${label.replace(/[<>&"]/g, '')}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function guardImages(root = document) {
    $$('img', root).forEach(img => {
        const fix = () => { img.onerror = null; img.src = placeholder(img.alt || 'Image'); };
        img.addEventListener('error', fix, { once: true });
        if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fix();
    });
}

/* ============ PROJECT BOOK ============ */
// On a wide screen, or a phone turned sideways, the book lies open: the picture is on the left page,
// the text on the right page, and turned pages stay on the left. On a phone held upright it shows
// one page at a time, starting at the cover.
// A "leaf" is one sheet of paper. Leaf 0 is the cover. Leaf 1, 2, 3 ... carry the text of a project
// on their front, and the picture of the NEXT project on their back. The last leaf is the back cover,
// and the page facing it ("About the author") is the back of the last project's leaf.
const book = $('#book'), stack = $('#stack');
const total = PROJECTS.length + 2;      // the cover, one leaf per project, and the back cover
// when the book lies open: keep this the same as the "THE OPEN BOOK" block in style.css
const wide = matchMedia('(min-width: 60rem), (orientation: landscape) and (min-width: 34rem)');
const KINDS = { web: 'Web development', it: 'IT support', hardware: 'Hardware' };   // chapter names and index tabs
const DID = { web: 'What I built', it: 'What I did', hardware: 'What I built' };    // the heading above the list
const two = n => String(n).padStart(2, '0');
// a small network drawing for the covers, like the one at the top of the site. A dot travels along it.
const coverArt = `
      <svg class="cover-art" viewBox="0 0 160 48" aria-hidden="true">
        <path d="M14 36 52 12 92 30 132 10M92 30 116 42"/>
        <circle cx="14" cy="36" r="3"/><circle cx="52" cy="12" r="3"/><circle cx="92" cy="30" r="4.5"/><circle cx="132" cy="10" r="3"/><circle cx="116" cy="42" r="3"/>
        ${reduceMotion ? '' : '<circle class="packet" r="2"><animateMotion dur="3.2s" repeatCount="indefinite" path="M14 36 52 12 92 30 132 10"/></circle>'}
      </svg>`;
// the cover: the contents list shows the page each project starts on. Click a line to go there.
const coverPage = `
  <div class="page cover">
    <div>
      <p class="cover-name">Karl D. Santos</p>
      ${coverArt}
      <h3>Project portfolio</h3>
      <p class="cover-count">${PROJECTS.length} projects in web development and IT support</p>
      <ol class="contents">${PROJECTS.map((p, i) => `<li><button type="button" data-go="${i + 1}"><span>${p.title}</span><i></i><b>${(i + 1) * 2}</b></button></li>`).join('')}</ol>
    </div>
  </div>`;
const backCover = `
  <div class="page cover">
    <div>
      <p class="cover-name">Karl D. Santos</p>
      ${coverArt}
      <h3>Thanks for reading</h3>
      <p>More projects are on the way. If one of these caught your eye, I'd like to hear from you.</p>
      <div class="end-actions">
        <a class="btn primary" href="#contact">Get in touch</a>
        <button class="btn ghost" type="button" data-go="0">Back to the cover</button>
      </div>
    </div>
  </div>`;
const authorPage = `
  <div class="page author">
    <div>
      <img src="images/Santoss.png" alt="" width="374" height="372" loading="lazy">
      <p class="chapter">About the author</p>
      <h3>Karl D. Santos</h3>
      <p>BSIT graduate from Mabalacat City College. I build responsive websites and troubleshoot real computer problems.</p>
    </div>
  </div>`;
const shot = p => `<div class="shot" tabindex="0" role="button" aria-label="Expand image of ${p.title}"><img src="${p.img}" alt="${p.title}" loading="lazy"></div>`;
// the picture in its frame: a browser window for websites, a taped photo for the rest, and a caption below
const framed = (p, n, inside) => p.type === 'web'
    ? `<figure class="frame browser"><div class="window"><div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>${p.url || ''}</span></div>${inside}</div><figcaption>Fig. ${n} · ${p.caption || p.title}</figcaption></figure>`
    : `<figure class="frame ${p.model ? 'model' : 'taped'}"><div class="print">${inside}</div><figcaption>Fig. ${n} · ${p.caption || p.title}</figcaption></figure>`;
// A project with "model: true" gets the 3D viewer, a switch to the picture, and one button per part
const media = p => `
    <div class="media" data-view="model">
      <div class="media-switch" role="group" aria-label="Choose what to look at">
        <button type="button" data-view="model" aria-pressed="true">3D model</button>
        <button type="button" data-view="photo" aria-pressed="false">Photo</button>
      </div>
      <div class="viewer">
        <div class="viewer-tools">
          <button type="button" data-zoom="1.5" aria-label="Zoom out">−</button>
          <button type="button" data-zoom="-1.5" aria-label="Zoom in">+</button>
          <button type="button" data-reset aria-label="Reset view">↺</button>
        </div>
        <div class="viewer-cap"><b>3D model</b><span>Loading…</span></div>
      </div>
      <div class="viewer-parts"></div>
      ${shot(p)}
    </div>`;
// the text page of a project. The empty "slot" is where its picture goes on a phone.
const textPage = (p, n) => `
  <article class="page">
    <div class="slot"></div>
    <div>
      <p class="chapter"><span>Project ${two(n)} · ${KINDS[p.type]}</span>${p.status ? `<span class="state">${p.status}</span>` : ''}</p>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <p class="did">${DID[p.type]}</p>
      <ul>${p.details.map(d => `<li>${d}</li>`).join('')}</ul>
      <div class="tags">${p.tags.map(t => `<span>${t}</span>`).join('')}</div>
      ${p.link && p.link !== '#' ? `<a class="btn ghost" href="${p.link}" target="_blank" rel="noopener">${p.linkText || 'View project'}</a>` : ''}
    </div>
  </article>`;

for (let i = 0; i < total; i++) {
    const leaf = document.createElement('div'), last = i === total - 1;
    leaf.className = i === 0 || last ? 'leaf board' : 'leaf';     // "board": the hard front and back covers
    const front = i === 0 ? coverPage : last ? backCover : textPage(PROJECTS[i - 1], i);
    const back = last ? '' : i === total - 2 ? authorPage : '<div class="slot"></div>';
    // the small numbers are page numbers, like in a real book
    leaf.innerHTML = `<div class="front">${front}${i && !last ? `<span class="folio">${i * 2 + 1}</span>` : ''}</div>`
        + `<div class="back">${back}${last ? '' : `<span class="folio">${i * 2 + 2}</span>`}</div>`;
    stack.appendChild(leaf);
}
// the stacks of page edges at both sides, the two corners you can click to turn a page,
// and the index tabs that jump to the first project of each kind
const firstOf = kind => PROJECTS.findIndex(p => p.type === kind) + 1;
stack.insertAdjacentHTML('beforeend', '<div class="edge left"></div><div class="edge right"></div>'
    + '<button class="corner prev" type="button" tabindex="-1" aria-hidden="true"></button><button class="corner next" type="button" tabindex="-1" aria-hidden="true"></button>'
    + `<nav class="index" aria-label="Jump to a kind of project">${Object.keys(KINDS).filter(firstOf).map(k => `<button type="button" data-go="${firstOf(k)}" data-kind="${k}">${KINDS[k]}</button>`).join('')}</nav>`);

const leaves = $$('.leaf', stack);
const tabs = $$('.index button', stack);
const prev = $('#prev'), next = $('#next'), pager = $('#pager');
const cornerPrev = $('.corner.prev', stack), cornerNext = $('.corner.next', stack);
let cur = 0;

// the page scrubber between the buttons: one mark per page, the current one is long. Click one to go there.
const scrub = document.createElement('div');
scrub.className = 'scrub';
scrub.innerHTML = `<div class="marks">${leaves.map((_, i) => `<button type="button" data-go="${i}" aria-label="${i === 0 ? 'Cover' : i === total - 1 ? 'Back cover' : PROJECTS[i - 1].title}"></button>`).join('')}</div>`;
pager.replaceWith(scrub);
scrub.appendChild(pager);
const marks = $$('.marks button', scrub);
scrub.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) show(Number(go.dataset.go));
});

// Every project's picture (or 3D model) is built once, then moved to the page that should show it:
// the left-hand page on a wide screen, or the top of the project's own page on a phone.
const medias = PROJECTS.map((p, i) => {
    const holder = document.createElement('div');
    holder.innerHTML = framed(p, i + 1, p.model ? media(p) : shot(p));
    return holder.firstElementChild;
});
function placeMedia() {
    medias.forEach((m, i) => $(wide.matches ? '.back .slot' : '.front .slot', leaves[wide.matches ? i : i + 1]).appendChild(m));
}
placeMedia();
guardImages(stack);

/* ============ 3D MODEL (I-Tungkod page) ============ */
// The model is drawn by cane3d.js with the Three.js library. Both are loaded only when a
// visitor opens the page that has the model, so the rest of the site stays fast.
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const modelBox = $('.media', stack);
const modelAt = PROJECTS.findIndex(p => p.model) + 1;      // which page of the book has the model (0 = none)
let cane = null, caneLoading = false;

function loadScript(src) {
    return new Promise((done, failed) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = done;
        s.onerror = failed;
        document.head.appendChild(s);
    });
}
function setView(view) {
    modelBox.dataset.view = view;
    $$('.media-switch button', modelBox).forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
    syncCane();
}
// Run the model only while its page is open and "3D model" is chosen
function syncCane() {
    if (!modelBox) return;
    const open = cur === modelAt && modelBox.dataset.view === 'model';
    if (open && !cane && !caneLoading) {
        caneLoading = true;
        loadScript(THREE_URL).then(() => loadScript('cane3d.js' + VERSION)).then(() => {
            cane = createCaneViewer($('.viewer', modelBox), $('.viewer-cap', modelBox), $('.viewer-parts', modelBox));
            syncCane();
        }).catch(() => {
            // no internet or no 3D support: go back to the picture and hide the switch
            $('.media-switch', modelBox).remove();
            setView('photo');
        });
    }
    if (cane) { if (open) cane.start(); else cane.stop(); }
}
if (modelBox) {
    modelBox.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.view) setView(b.dataset.view);
        if (cane && b.dataset.zoom) cane.zoom(Number(b.dataset.zoom));
        if (cane && 'reset' in b.dataset) cane.reset();
    });
}

// only the pages you can see are clickable and read out by screen readers
function setFace(face, on) {
    face.inert = !on;
    face.setAttribute('aria-hidden', !on);
}
function show(n) {
    const from = cur;
    cur = Math.max(0, Math.min(total - 1, n));
    leaves.forEach((leaf, i) => {
        const flipped = i < cur;
        if (leaf.classList.contains('flipped') !== flipped) {
            // when several pages turn at once, each waits a little longer so they fan out one after another
            const order = cur > from ? i - from : from - 1 - i;
            leaf.style.setProperty('--wait', order * 90 + 'ms');
            leaf.classList.add('flipping');
            setTimeout(() => leaf.classList.remove('flipping'), 950 + order * 90);
        }
        leaf.classList.toggle('flipped', flipped);
        leaf.classList.remove('peek');
        leaf.style.zIndex = flipped ? i + 1 : total - i;      // turned pages pile up on the left, the rest on the right
        setFace($('.front', leaf), i === cur);
        setFace($('.back', leaf), wide.matches && i === cur - 1);
    });
    book.classList.toggle('closed', cur === 0);
    book.style.setProperty('--left', cur);                   // how many pages lie on each side (for the page edges)
    book.style.setProperty('--right', total - cur - 1);
    cornerPrev.hidden = cur === 0;
    cornerNext.hidden = cur === total - 1;
    const project = PROJECTS[cur - 1];      // undefined on the two covers
    pager.textContent = cur === 0 ? 'Cover' : project ? `${two(cur)} / ${two(PROJECTS.length)} · ${project.title}` : 'The end';
    marks.forEach((m, i) => m.classList.toggle('on', i === cur));
    tabs.forEach(t => t.classList.toggle('on', !!project && t.dataset.kind === project.type));
    prev.disabled = cur === 0;
    next.disabled = cur === total - 1;
    syncCane();
}
prev.addEventListener('click', () => show(cur - 1));
next.addEventListener('click', () => show(cur + 1));
// the page corners: click to turn, point at one and the page lifts a little
cornerPrev.addEventListener('click', () => show(cur - 1));
cornerNext.addEventListener('click', () => show(cur + 1));
cornerNext.addEventListener('pointerenter', () => leaves[cur].classList.add('peek'));
cornerNext.addEventListener('pointerleave', () => leaves[cur].classList.remove('peek'));
cornerPrev.addEventListener('pointerenter', () => { if (cur > 0) leaves[cur - 1].classList.add('peek'); });
cornerPrev.addEventListener('pointerleave', () => { if (cur > 0) leaves[cur - 1].classList.remove('peek'); });
// the contents list on the cover jumps straight to a project
stack.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) show(Number(go.dataset.go));
});
// Turning the phone (or resizing the window): move the pictures to the right pages again.
// Upright goes back to the cover; sideways opens the book where you were and, on a short screen,
// scrolls so the whole open book fills it.
wide.addEventListener('change', () => {
    placeMedia();
    show(wide.matches ? cur : 0);
    if (wide.matches && bookVisible && innerHeight < 520) scrollTo({ top: book.getBoundingClientRect().top + scrollY - 8, behavior: 'instant' });
});
show(0);

/* ============ IMAGE LIGHTBOX (click a project image to expand it) ============ */
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.setAttribute('aria-label', 'Expanded project image');
lightbox.innerHTML = `
  <button class="lb-close" type="button" aria-label="Close image">&times;</button>
  <figure>
    <img alt="">
    <figcaption></figcaption>
  </figure>`;
document.body.appendChild(lightbox);

const lbImg = $('img', lightbox);
const lbCap = $('figcaption', lightbox);
const lbClose = $('.lb-close', lightbox);
let lbOpener = null;

function openLightbox(shot) {
    const img = $('img', shot);
    lbOpener = shot;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbClose.focus({ preventScroll: true });
}
function closeLightbox() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    if (lbOpener) lbOpener.focus({ preventScroll: true });
}

stack.addEventListener('click', e => {
    const shot = e.target.closest('.shot');
    if (shot) openLightbox(shot);
});
stack.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('shot')) {
        e.preventDefault();
        openLightbox(e.target);
    }
});
lightbox.addEventListener('click', closeLightbox);   // click anywhere to close
addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// Arrow keys (only while the book is on screen, you are not typing, and no image is open)
let bookVisible = false;
new IntersectionObserver(e => { bookVisible = e[0].isIntersecting; }, { threshold: .2 }).observe($('#book'));
addEventListener('keydown', e => {
    if (!bookVisible || lightbox.classList.contains('open')) return;
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'ArrowLeft') show(cur - 1);
});

// Swipe on touch screens (a swipe that starts on the 3D model turns the model, not the page)
let startX = 0, startY = 0, onModel = false;
stack.addEventListener('touchstart', e => {
    onModel = !!e.target.closest('.viewer');
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
}, { passive: true });
stack.addEventListener('touchend', e => {
    if (onModel) return;
    const dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
}, { passive: true });

/* ============ HERO TYPING ============ */
const words = ['Learning every day.', 'Fixing real tech problems.', 'Ready for my first role.'];
const typed = $('#typed');
if (reduceMotion) {
    typed.textContent = words[0];
} else {
    let w = 0, c = 0, del = false;
    (function type() {
        const word = words[w];
        typed.textContent = word.slice(0, c);
        if (!del && c === word.length) { del = true; return setTimeout(type, 1500); }
        if (del && c === 0) { del = false; w = (w + 1) % words.length; }
        c += del ? -1 : 1;
        setTimeout(type, del ? 30 : 70);
    })();
}

/* ============ MOVING TAPE ============ */
// Repeats the words of every tape until the strip is much wider than the screen.
// It is built as two equal halves, and the animation in style.css slides it by exactly one half, so it loops without a jump.
const TAPE_SPEED = 70;      // pixels per second. Bigger number = faster tape
$$('.tape-track').forEach(track => {
    const words = track.innerHTML;
    const copies = Math.max(2, Math.ceil(Math.max(innerWidth, screen.width) * 1.2 / track.scrollWidth));
    track.innerHTML = words.repeat(copies * 2);
    track.style.animationDuration = track.scrollWidth / 2 / TAPE_SPEED + 's';
});

/* ============ NAVIGATION ============ */
const nav = $('#nav'), menu = $('#menu'), burger = $('#burger');

// Give the nav a solid background once the page has scrolled 30px.
// A 30px marker sits at the very top of the page; when it leaves the screen, the nav changes.
const topMark = document.createElement('div');
topMark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:30px;pointer-events:none';
document.body.prepend(topMark);
new IntersectionObserver(e => nav.classList.toggle('scrolled', !e[0].isIntersecting)).observe(topMark);

function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

// Highlight the nav link of the section you are viewing
const links = $$('a', menu);
const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach(s => sectionObs.observe(s));

/* ============ BADGE CAROUSEL ============ */
// The badges sit on a circle that turns by itself, one badge at a time. It stops while the mouse is over it,
// can be dragged sideways, and steps with the two arrow buttons. Only the badge in front shows its details.
// Without this code the badges stay in a plain grid.
const ring = $('.badges');
if (ring) {
    const badges = $$('.badge', ring), STEP = Math.PI * 2 / badges.length;
    const PAUSE = 2600;          // how long it stays on each badge, in milliseconds
    const REST = 3500;           // after you step or drag, wait this long before it turns by itself again
    let spin = 0, goal = null, turnAt = 0, restUntil = 0;
    let dragging = false, moved = 0, lastX = 0, hovering = false, focused = false, visible = false, started = false, raf = 0;

    ring.classList.add('ring');
    badges.forEach(b => { $('img', b).draggable = false; });
    const controls = document.createElement('div');
    controls.className = 'ring-controls';
    controls.innerHTML = '<button type="button" data-step="1" aria-label="Previous badge">←</button><button type="button" data-step="-1" aria-label="Next badge">→</button>';
    ring.after(controls);

    const radius = () => Math.min(380, ring.clientWidth * .42);
    const nearest = () => Math.round(spin / STEP) * STEP;
    const rest = () => { restUntil = performance.now() + REST; };
    // turn the shortest way so that badge number i ends up in front
    function bringToFront(i) {
        let want = -i * STEP;
        want += Math.PI * 2 * Math.round((spin - want) / (Math.PI * 2));
        goal = want;
        rest();
    }

    // put every badge at its place on the circle
    function place() {
        const r = radius();
        badges.forEach((b, i) => {
            const angle = spin + i * STEP, depth = (Math.cos(angle) + 1) / 2;      // 1 = in front, 0 = at the back
            b.style.transform = `translateX(${(Math.sin(angle) * r).toFixed(1)}px) scale(${(.55 + .45 * depth).toFixed(3)})`;
            b.style.opacity = (.1 + .9 * depth * depth).toFixed(2);
            b.style.zIndex = Math.round(depth * 100);
            // details fade in only when a badge is almost exactly in front, so two names never overlap
            b.style.setProperty('--front', Math.max(0, Math.min(1, (depth - .955) / .04)).toFixed(2));
            b.classList.toggle('is-front', depth > .97);
        });
    }
    function frame() {
        if (!dragging) {
            const now = performance.now();
            const idle = !(hovering || focused || reduceMotion || now < restUntil);
            if (goal === null && idle && now > turnAt) goal = nearest() - STEP;      // time to show the next badge
            // glide to a badge: the chosen one, or whichever is closest to the front
            const to = goal !== null ? goal : nearest();
            spin += (to - spin) * (reduceMotion ? 1 : .08);
            if (goal !== null && Math.abs(goal - spin) < .002) {
                spin = goal;
                goal = null;
                turnAt = now + PAUSE;
            }
        }
        place();
        raf = requestAnimationFrame(frame);
    }

    // drag sideways to spin. A plain click on a badge at the side brings it to the front.
    ring.addEventListener('pointerdown', e => {
        if (e.target.closest('a')) return;      // let the "Verify badge" link work normally
        dragging = true;
        moved = 0;
        lastX = e.clientX;
        goal = null;
        ring.classList.add('drag');
    });
    addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        spin += dx / radius();
        moved += Math.abs(dx);
        lastX = e.clientX;
    });
    function endDrag() {
        dragging = false;
        ring.classList.remove('drag');
        rest();
    }
    addEventListener('pointerup', e => {
        if (!dragging) return;
        endDrag();
        const b = e.target.closest ? e.target.closest('.badge') : null;
        if (moved < 6 && b && !b.classList.contains('is-front')) bringToFront(badges.indexOf(b));
    });
    addEventListener('pointercancel', () => { if (dragging) endDrag(); });

    ring.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
    ring.addEventListener('pointerleave', () => { hovering = false; });
    // keyboard: tabbing to a badge's link turns that badge to the front
    ring.addEventListener('focusin', e => {
        focused = true;
        const b = e.target.closest('.badge');
        if (b) bringToFront(badges.indexOf(b));
    });
    ring.addEventListener('focusout', () => { focused = false; });
    controls.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        goal = (goal !== null ? goal : nearest()) + Number(b.dataset.step) * STEP;
        rest();
    });

    // run only while the carousel is on screen. The first time, it spins in from three badges away.
    place();
    new IntersectionObserver(entries => {
        const now = entries[0].isIntersecting;
        if (now && !visible) {
            if (!started && !reduceMotion) { spin = STEP * 3; goal = 0; }
            started = true;
            frame();
        }
        if (!now && visible) cancelAnimationFrame(raf);
        visible = now;
    }, { rootMargin: '80px' }).observe(ring);
}

/* ============ SCROLL ANIMATIONS (a different animation for each part) ============ */
// Give matching elements an animation type. "step" staggers them, "base" delays the first one.
function tag(selector, type, step = 0, base = 0) {
    $$(selector).forEach((el, i) => {
        el.dataset.anim = type;
        el.style.setProperty('--d', base + (i % 4) * step + 'ms');
    });
}

if (!reduceMotion) {
    tag('.head', 'line');
    tag('.head h2', 'wipe', 0, 120);
    tag('.note', 'rise');

    tag('.facts', 'curtain');
    tag('.prose > *', 'rise', 100);
    tag('.mission', 'rise');
    tag('.mission li', 'slide-l', 110, 200);

    tag('.tl-item', 'slide-r', 200);

    tag('.skill-groups .group:nth-child(1)', 'slide-l');
    tag('.skill-groups .group:nth-child(2)', 'slide-r');

    tag('.svc-group h3', 'slide-l');
    tag('.svc-group dl > div', 'flip-x', 110);
    tag('#projects .book', 'open');
    tag('#journey article', 'flip-y', 110);
    tag('.badges', 'rise');      // the carousel rises in as one piece, then spins (see BADGE CAROUSEL)

    tag('.resume', 'unfold');

    tag('.prose-lead', 'rise');
    tag('.links li', 'slide-l', 90);
    tag('form', 'slide-r');

    tag('.foot', 'rise');

    const animObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            el.classList.add('in');
            // when the animation is done, remove it so hover effects react instantly
            const wait = parseInt(el.style.getPropertyValue('--d')) || 0;
            setTimeout(() => { el.removeAttribute('data-anim'); el.style.removeProperty('--d'); }, wait + 1400);
            animObs.unobserve(el);
        });
    }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    $$('[data-anim]').forEach(el => animObs.observe(el));
}

/* ============ CONTACT FORM ============ */
/* This form is frontend-only (no backend). After validation it opens the visitor's
   email app with the message filled in. For real sending without a mail app,
   connect the form to a service such as Formspree or EmailJS. */
const form = $('#form'), status = $('#status');
const rules = {
    'f-name': v => v.trim().length >= 2 || 'Please enter your name.',
    'f-email': v => /^\S+@\S+\.\S+$/.test(v.trim()) || 'Please enter a valid email address.',
    'f-msg': v => v.trim().length >= 10 || 'Please write at least 10 characters.'
};
function check(field) {
    const result = rules[field.id](field.value);
    const ok = result === true;
    field.classList.toggle('bad', !ok);
    field.setAttribute('aria-invalid', !ok);
    $('.err', field.parentElement).textContent = ok ? '' : result;
    return ok;
}
$$('input,textarea', form).forEach(f => f.addEventListener('blur', () => check(f)));
form.addEventListener('submit', e => {
    e.preventDefault();
    const fields = $$('input,textarea', form);
    const ok = fields.map(check).every(Boolean);   // check every field, even after a failure
    status.classList.toggle('error', !ok);
    if (!ok) { status.textContent = 'Please fix the highlighted fields and try again.'; return; }
    const [name, email, msg] = fields.map(f => f.value.trim());
    const subject = encodeURIComponent('Portfolio message from ' + name);
    const body = encodeURIComponent(msg + '\n\nFrom: ' + name + ' (' + email + ')');
    status.textContent = 'Thanks, ' + name + '! Opening your email app so you can send the message.';
    location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    form.reset();
});

// "Request resume" buttons: the resume is not on the public site, so they bring the visitor
// to this form and write the first line of the message for them.
$$('[data-request="resume"]').forEach(a => a.addEventListener('click', () => {
    const msg = $('#f-msg');
    if (!msg.value.trim()) msg.value = 'Hi Karl, I would like a copy of your resume.';
    status.classList.remove('error');
    status.textContent = 'Add your name and email, then send. I will reply with my resume.';
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), 700);      // after the page has scrolled down
}));

// Placeholder pictures for the other images on the page
guardImages();