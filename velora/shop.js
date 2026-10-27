/* Velora demo copy: the customer side of the shop, run in the visitor's browser.
 *
 * The pages are copies of the real Laravel shop. This file adds what the server used to do:
 * search and filters, the bag and discount codes, a pretend sign-in, checkout with test cards,
 * orders with tracking, cancelling and returns, and the wishlist. It follows the same rules as
 * the Laravel app (app/Services/Cart.php, CouponService.php, CheckoutController.php, OrderController.php).
 *
 * Everything is saved in this browser only (localStorage). No real account, card or payment exists.
 * The staff area is not part of the copy.
 */
(function () {
    'use strict';

    var BASE = '/velora';
    var KEY = 'velora-demo-v1';
    var MAX_QTY = 10;                // most of one item in the bag
    var SHIPPING = 15000;            // flat shipping fee, in cents
    var FREE_AT = 200000;            // free shipping from this total, after discounts
    var RETURN_DAYS = 14;            // returns are possible this many days after delivery
    var STEP_MS = 60 * 1000;         // demo: an order moves one step (paid, processing ...) every minute
    var PAGE_SIZE = 24;
    var STEPS = ['paid', 'processing', 'packed', 'shipped', 'delivered'];
    var CANCELLABLE = ['pending', 'awaiting_payment', 'paid', 'processing', 'packed'];
    var SORTS = { featured: 'Recommended', newest: 'New arrivals', best: 'Best sellers', price_asc: 'Price: low to high', price_desc: 'Price: high to low' };
    var CARDS = [
        { number: '4242424242424242', label: '4242 4242 4242 4242', note: 'Test card that is approved' },
        { number: '4000000000000002', label: '4000 0000 0000 0002', note: 'Test card that is declined' }
    ];

    /* ---------- saved state ---------- */
    function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    var S = read();
    S.bag = S.bag || {}; S.wishlist = S.wishlist || []; S.orders = S.orders || []; S.sold = S.sold || {};
    if (S.coupon === undefined) S.coupon = null;
    if (S.user === undefined) S.user = null;
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: works until the tab closes */ } }

    // a message shown once at the top of the next page, like the shop's session flash
    function flash(type, text) { try { sessionStorage.setItem('velora-flash', JSON.stringify({ type: type, text: text })); } catch (e) {} }
    function takeFlash() { try { var f = JSON.parse(sessionStorage.getItem('velora-flash')); sessionStorage.removeItem('velora-flash'); return f; } catch (e) { return null; } }

    /* ---------- small helpers ---------- */
    function $(s, p) { return (p || document).querySelector(s); }
    function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function money(c) { return '₱' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
    function go(path) { location.href = BASE + path; }
    function page() { var el = $('#vapp'); return el ? el.getAttribute('data-page') : null; }
    function dateText(ms) { return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    function random(n) { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
    function parseDate(s) { return s ? new Date(s.replace(' ', 'T') + 'Z').getTime() : null; }

    var note;
    function tell(html, ms) {
        if (!note) { note = document.createElement('div'); note.className = 'velora-copy-note'; note.setAttribute('role', 'status'); document.body.appendChild(note); }
        note.innerHTML = html;
        note.classList.add('show');
        clearTimeout(note.t);
        note.t = setTimeout(function () { note.classList.remove('show'); }, ms || 3200);
    }

    /* ---------- the shop's data ---------- */
    var D, P = {}, PS = {}, V = {};
    function stockOf(v) { return Math.max(0, v.stock - (S.sold[v.id] || 0)); }
    function productStock(p) { return p.variants.reduce(function (n, v) { return n + stockOf(v); }, 0); }
    function current(p) { return p.sale != null ? p.sale : p.price; }
    function onSale(p) { return p.sale != null && p.sale < p.price; }
    function unitPrice(v) { return v.price != null ? v.price : current(v.product); }
    function label(v) { return [v.size, v.color].filter(Boolean).join(' / ') || 'One size'; }

    /* ---------- the bag (same rules as app/Services/Cart.php) ---------- */
    function clamp(q, v) { return Math.max(1, Math.min(q, MAX_QTY, Math.max(stockOf(v), 1))); }
    function lines() {
        return Object.keys(S.bag).map(function (id) {
            var v = V[id]; if (!v) return null;
            var q = S.bag[id], unit = unitPrice(v);
            return { variant: v, product: v.product, quantity: q, unit: unit, line: unit * q };
        }).filter(Boolean);
    }
    function count() { return Object.keys(S.bag).reduce(function (n, id) { return n + (V[id] ? S.bag[id] : 0); }, 0); }
    function subtotal() { return lines().reduce(function (n, l) { return n + l.line; }, 0); }
    function findCoupon(code) { code = String(code || '').trim().toUpperCase(); return D.coupons.filter(function (c) { return c.code === code; })[0] || null; }
    // why a code cannot be used, or null when it can (same messages as CouponService)
    function couponProblem(c, sub) {
        var now = Date.now();
        if (!c.active) return 'That code is not active.';
        if (c.starts && parseDate(c.starts) > now) return 'That code is not valid yet.';
        if (c.expires && parseDate(c.expires) < now) return 'That code has expired.';
        var usedHere = S.orders.filter(function (o) { return o.coupon === c.code; }).length;
        if (c.limit != null && c.used + usedHere >= c.limit) return 'That code has been fully used.';
        if (sub < c.min) return 'Add ' + money(c.min - sub) + ' more to use that code.';
        if (S.user && usedHere > 0) return 'You have already used that code.';
        return null;
    }
    function coupon() {
        if (!S.coupon) return null;
        var c = findCoupon(S.coupon);
        if (!c || couponProblem(c, subtotal())) { S.coupon = null; save(); return null; }
        return c;
    }
    function couponText(c) { return c.type === 'percent' ? c.value + '% off' : money(c.value) + ' off'; }
    function discount() { var c = coupon(), sub = subtotal(); if (!c) return 0; return Math.min(c.type === 'percent' ? Math.floor(sub * c.value / 100) : c.value, sub); }
    function shipping() { var sub = subtotal(); return sub === 0 || sub - discount() >= FREE_AT ? 0 : SHIPPING; }
    function total() { return subtotal() - discount() + shipping(); }

    /* ---------- orders ---------- */
    function status(o) {
        if (o.cancelled) return 'cancelled';
        return STEPS[Math.min(STEPS.length - 1, Math.floor((Date.now() - o.placed) / STEP_MS))];
    }
    function deliveredAt(o) { return o.placed + (STEPS.length - 1) * STEP_MS; }
    function canCancel(o) { return CANCELLABLE.indexOf(status(o)) >= 0; }
    function canReturn(o) { return status(o) === 'delivered' && Date.now() - deliveredAt(o) < RETURN_DAYS * 864e5 && !(o.returns && o.returns.length); }
    function orderByNumber(n) { return S.orders.filter(function (o) { return o.number === n; })[0] || null; }

    /* ---------- the header: bag count and the account links ---------- */
    function header() {
        var bag = $$('a[href="' + BASE + '/cart/"]').filter(function (a) { return /^Bag/.test(a.getAttribute('aria-label') || ''); })[0];
        if (bag) {
            var n = count(), badge = $('.v-badge', bag);
            bag.setAttribute('aria-label', 'Bag, ' + n + ' items');
            if (n > 0 && !badge) { badge = document.createElement('span'); badge.className = 'v-badge absolute -top-1 right-0 grid place-items-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-none bg-accent text-white text-[10px] font-bold'; bag.appendChild(badge); }
            if (badge) { if (n > 0) badge.textContent = n; else badge.remove(); }
        }
        if (!S.user) return;
        // signed in: "Sign in" becomes "Account", and the phone menu shows the customer's links
        $$('a[href="' + BASE + '/account/"]').forEach(function (a) {
            if (/hidden sm:flex/.test(a.className)) { a.href = BASE + '/orders/'; a.innerHTML = '<i class="ph ph-user text-xl"></i> Account'; }
        });
        var menu = $('nav [x-show="open"]');
        if (menu && !$('.v-menu', menu)) {
            var links = $$('a[href="' + BASE + '/account/"]', menu);
            if (links.length) {
                var box = document.createElement('div'); box.className = 'v-menu';
                box.innerHTML = '<a href="' + BASE + '/orders/" class="block rounded-none px-3 py-2.5 hover:bg-stone-100">My orders</a>'
                    + '<a href="' + BASE + '/wishlist/" class="block rounded-none px-3 py-2.5 hover:bg-stone-100">Wishlist</a>'
                    + '<a href="' + BASE + '/account/" class="block rounded-none px-3 py-2.5 hover:bg-stone-100">Account</a>';
                links[0].parentNode.insertBefore(box, links[0]);
                links.forEach(function (a) { a.remove(); });
            }
        }
    }

    function showFlash() {
        var f = takeFlash(); if (!f) return;
        var main = $('#main'); if (!main) return;
        var box = document.createElement('div');
        box.className = 'max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 space-y-2';
        box.innerHTML = f.type === 'error'
            ? '<div class="flex items-center gap-2 rounded-none bg-accent-soft text-rose-800 px-4 py-3 text-sm"><i class="ph ph-warning-circle text-lg"></i><span>' + esc(f.text) + '</span></div>'
            : '<div class="flex items-center gap-2 rounded-none bg-emerald-50 text-emerald-800 px-4 py-3 text-sm"><i class="ph ph-check-circle text-lg"></i><span>' + esc(f.text) + '</span></div>';
        main.parentNode.insertBefore(box, main);
    }

    /* ---------- the product card (resources/views/components/product-card.blade.php) ---------- */
    function card(p) {
        var stock = productStock(p), badges = '';
        if (onSale(p)) badges += '<span class="rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">-' + Math.round(100 - (p.sale / p.price) * 100) + '%</span>';
        if (p.isNew) badges += '<span class="rounded bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white">New</span>';
        if (stock === 0) badges += '<span class="rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink-muted shadow-sm">Sold out</span>';
        else if (stock <= 5) badges += '<span class="rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-accent shadow-sm">Only ' + stock + ' left</span>';
        return '<a href="' + BASE + '/products/' + esc(p.slug) + '/" class="group block">'
            + '<div class="relative aspect-[3/4] overflow-hidden rounded-none bg-stone-100"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]">'
            + '<div class="absolute top-2 left-2 flex flex-col items-start gap-1">' + badges + '</div></div>'
            + '<div class="mt-2.5 space-y-0.5"><p class="text-xs text-ink-muted">' + esc(p.categoryName) + '</p>'
            + '<h3 class="text-sm font-medium leading-snug text-ink line-clamp-2 group-hover:underline">' + esc(p.name) + '</h3>'
            + '<p class="flex flex-wrap items-baseline gap-x-2 text-sm"><span class="font-bold ' + (onSale(p) ? 'text-accent' : 'text-ink') + '">' + money(current(p)) + '</span>'
            + (onSale(p) ? '<span class="text-xs text-ink-muted line-through">' + money(p.price) + '</span>' : '') + '</p></div></a>';
    }

    /* ---------- the shop: folders for category and sort, the browser for search and the other filters ---------- */
    var FOLDER_KEYS = ['category', 'sort', 'page'];
    function folderFor(params) {
        var path = BASE + '/shop/', other = false;
        params.forEach(function (v, k) { if (v !== '' && FOLDER_KEYS.indexOf(k) < 0) other = true; });
        if (other) return null;
        FOLDER_KEYS.forEach(function (k) {
            var v = params.get(k) || '';
            if (!v || (k === 'page' && v === '1') || (k === 'sort' && v === 'featured')) return;
            path += k + '-' + v.replace(/[^a-z0-9_-]+/gi, '-') + '/';
        });
        return path;
    }
    function shopUrl(params) {
        var clean = new URLSearchParams();
        params.forEach(function (v, k) { if (v !== '' && !(k === 'sort' && v === 'featured') && !(k === 'page' && v === '1') && k !== '_token') clean.set(k, v); });
        return folderFor(clean) || BASE + '/shop/?' + clean.toString();
    }
    // the same filters and order as ShopController@index
    function filterProducts(f) {
        var q = f.q.toLowerCase();
        var list = D.products.filter(function (p) {
            if (q && p.name.toLowerCase().indexOf(q) < 0 && (p.description || '').toLowerCase().indexOf(q) < 0) return false;
            if (f.category && p.category !== f.category) return false;
            if (f.size || f.color) {
                if (!p.variants.some(function (v) { return stockOf(v) > 0 && (!f.size || v.size === f.size) && (!f.color || v.color === f.color); })) return false;
            }
            if (f.min != null && current(p) < f.min * 100) return false;
            if (f.max != null && current(p) > f.max * 100) return false;
            if (f.inStock && productStock(p) === 0) return false;
            return true;
        });
        var byName = function (a, b) { return a.name.localeCompare(b.name); };
        var sorts = {
            newest: function (a, b) { return (b.created || '').localeCompare(a.created || '') || b.id - a.id; },
            best: function (a, b) { return (b.best - a.best) || byName(a, b); },
            price_asc: function (a, b) { return current(a) - current(b); },
            price_desc: function (a, b) { return current(b) - current(a); },
            featured: function (a, b) { return (b.featured - a.featured) || byName(a, b); }
        };
        return list.sort(sorts[f.sort] || sorts.featured);
    }
    function shopPage() {
        var params = new URLSearchParams(location.search);
        if (!location.search) return;
        var folder = folderFor(params);
        if (folder) { location.replace(folder); return; }
        var num = function (k) { var v = params.get(k); return v !== null && v !== '' && !isNaN(v) ? Math.max(0, parseInt(v, 10)) : null; };
        var f = { q: (params.get('q') || '').trim(), category: params.get('category') || '', size: params.get('size') || '', color: params.get('color') || '',
                  min: num('min'), max: num('max'), inStock: params.get('in_stock') === '1', sort: SORTS[params.get('sort')] ? params.get('sort') : 'featured' };
        var all = filterProducts(f), pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE)), at = Math.min(pages, Math.max(1, parseInt(params.get('page') || '1', 10) || 1));
        var shown = all.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE);
        var cat = D.categories.filter(function (c) { return c.slug === f.category; })[0];
        var h1 = $('main h1'); if (h1) h1.textContent = f.q ? 'Results for "' + f.q + '"' : (cat ? cat.name : 'All products');
        if (h1 && h1.nextElementSibling) h1.nextElementSibling.textContent = plural(all.length, 'item');
        document.title = (h1 ? h1.textContent + ' · ' : '') + 'Velora';
        var grid = $('main section .grid');
        if (grid) grid.innerHTML = shown.length ? shown.map(card).join('') :
            '<div class="col-span-full rounded-none border border-dashed border-stone-300 p-12 text-center"><i class="ph ph-magnifying-glass text-4xl text-ink-muted"></i>'
            + '<p class="mt-3 font-semibold">Nothing matches those filters.</p><p class="text-sm text-ink-muted">Try a different size or colour, or widen the price range.</p>'
            + '<a href="' + BASE + '/shop/" class="mt-4 inline-block text-sm font-semibold text-accent hover:underline">Clear all filters</a></div>';
        var pager = grid && grid.parentNode.querySelector('.mt-10');
        if (pager) {
            var link = function (n, text) { var p2 = new URLSearchParams(params); p2.set('page', n); return '<a class="btn-secondary py-2 px-4" href="' + esc(shopUrl(p2)) + '">' + text + '</a>'; };
            pager.innerHTML = pages > 1 ? '<div class="v-pager">' + (at > 1 ? link(at - 1, '&larr; Previous') : '') + '<span class="text-ink-muted">Page ' + at + ' of ' + pages + '</span>' + (at < pages ? link(at + 1, 'Next &rarr;') : '') + '</div>' : '';
        }
        // show the chosen filters in the controls
        $$('input[name="category"]').forEach(function (r) { r.checked = r.value === f.category; });
        $$('select[name="size"]').forEach(function (s) { s.value = f.size; });
        $$('select[name="color"]').forEach(function (s) { s.value = f.color; });
        $$('input[name="min"]').forEach(function (i) { i.value = f.min == null ? '' : f.min; });
        $$('input[name="max"]').forEach(function (i) { i.value = f.max == null ? '' : f.max; });
        $$('input[name="in_stock"]').forEach(function (c) { c.checked = f.inStock; });
        $$('input[name="q"]').forEach(function (i) { i.value = f.q; });
        $$('select[name="sort"], input[type=hidden][name="sort"]').forEach(function (s) { s.value = f.sort; });
    }

    /* ---------- a product page ---------- */
    function productPage() {
        var form = $('#add-to-bag'), slug = location.pathname.split('/').filter(Boolean)[2], p = PS[slug];
        if (!p) return;
        // stock left after this browser's own orders
        if (form) $$('#variant option', form).forEach(function (o) {
            var v = V[o.value]; if (!v) return;
            var left = stockOf(v);
            if (left <= 0) o.remove(); else o.textContent = label(v) + ' (' + left + ' left)';
        });
        // the heart, for a signed-in customer (as in shop/show.blade.php)
        var h1 = $('main h1');
        if (S.user && h1 && h1.parentNode) {
            var saved = S.wishlist.indexOf(p.id) >= 0, b = document.createElement('button');
            b.type = 'button';
            b.className = 'mt-1 grid h-10 w-10 place-items-center rounded-none border border-stone-200 hover:border-accent hover:text-accent' + (saved ? ' v-saved' : '');
            b.setAttribute('aria-label', saved ? 'Remove from wishlist' : 'Save to wishlist');
            b.setAttribute('aria-pressed', saved);
            b.innerHTML = '<i class="ph ph-heart text-xl"></i>';
            b.addEventListener('click', function () {
                var i = S.wishlist.indexOf(p.id), now = i < 0;
                if (now) S.wishlist.push(p.id); else S.wishlist.splice(i, 1);
                save();
                b.classList.toggle('v-saved', now); b.setAttribute('aria-pressed', now);
                b.setAttribute('aria-label', now ? 'Remove from wishlist' : 'Save to wishlist');
                tell(now ? 'Saved to your wishlist.<a href="' + BASE + '/wishlist/">View wishlist</a>' : 'Removed from your wishlist.');
            });
            h1.parentNode.appendChild(b);
        }
    }
    function addToBag(form) {
        var vid = $('[name="variant_id"]', form).value, qty = parseInt($('[name="quantity"]', form).value, 10) || 1, v = V[vid];
        if (!v || stockOf(v) <= 0) { tell('Sorry, that one just sold out.'); return; }
        S.bag[vid] = clamp((S.bag[vid] || 0) + qty, v);
        save(); header();
        tell('Added to your bag: ' + esc(v.product.name) + ' (' + esc(label(v)) + ').<a href="' + BASE + '/cart/">View bag</a>', 4000);
    }

    /* ---------- the bag page (cart/index.blade.php) ---------- */
    function cartPage(root) {
        var ls = lines(), c = coupon();
        if (!ls.length) {
            root.innerHTML = '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 class="text-3xl font-extrabold tracking-tight">Your bag</h1>'
                + '<div class="mt-8 rounded-none border border-dashed border-stone-300 p-12 text-center"><i class="ph ph-shopping-bag text-4xl text-ink-muted"></i>'
                + '<p class="mt-3 font-semibold">Your bag is empty.</p><a href="' + BASE + '/shop/" class="btn-primary mt-6">Browse products</a></div></div>';
            return;
        }
        var sub = subtotal(), dis = discount(), ship = shipping(), toFree = Math.max(0, FREE_AT - (sub - dis)), progress = Math.min(100, Math.round(((sub - dis) / FREE_AT) * 100));
        var items = ls.map(function (l) {
            var max = Math.min(MAX_QTY, Math.max(stockOf(l.variant), 1)), opts = '';
            for (var i = 1; i <= max; i++) opts += '<option value="' + i + '"' + (i === l.quantity ? ' selected' : '') + '>Qty ' + i + '</option>';
            var href = BASE + '/products/' + esc(l.product.slug) + '/';
            return '<li class="flex gap-4 py-5"><a href="' + href + '" class="shrink-0"><img src="' + esc(l.product.image) + '" alt="" class="h-28 w-24 rounded-none object-cover bg-stone-100 sm:h-32 sm:w-28"></a>'
                + '<div class="flex flex-1 flex-col justify-between gap-3 min-w-0"><div class="flex justify-between gap-4"><div class="min-w-0">'
                + '<a href="' + href + '" class="font-semibold line-clamp-2 hover:underline">' + esc(l.product.name) + '</a>'
                + '<p class="mt-0.5 text-sm text-ink-muted">' + esc(label(l.variant)) + ' · ' + money(l.unit) + ' each</p></div>'
                + '<p class="font-bold whitespace-nowrap">' + money(l.line) + '</p></div>'
                + '<div class="flex flex-wrap items-center gap-5"><label for="qty-' + l.variant.id + '" class="sr-only">Quantity for ' + esc(l.product.name) + '</label>'
                + '<select id="qty-' + l.variant.id + '" data-qty="' + l.variant.id + '" class="rounded-none border-stone-300 py-1.5 pl-3 pr-8 text-sm focus:border-accent focus:ring-accent">' + opts + '</select>'
                + '<button type="button" data-remove="' + l.variant.id + '" class="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-accent"><i class="ph ph-trash"></i> Remove</button></div></div></li>';
        }).join('');
        var code = c
            ? '<div class="flex items-center justify-between rounded-none bg-white px-3 py-2 text-sm"><span><span class="font-semibold">' + esc(c.code) + '</span> · ' + couponText(c) + '</span><button type="button" data-uncoupon class="text-ink-muted hover:text-accent">Remove</button></div>'
            : '<form class="flex gap-2" data-coupon><label for="code" class="sr-only">Discount code</label><input id="code" name="code" type="text" placeholder="Discount code" class="flex-1 rounded-none border-stone-300 text-sm uppercase focus:border-accent focus:ring-accent"><button type="submit" class="btn-secondary py-2 px-4">Apply</button></form><p class="mt-1 text-xs text-accent" id="code-error" role="alert"></p>';
        root.innerHTML = '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 class="text-3xl font-extrabold tracking-tight">Your bag</h1><div class="mt-8 grid gap-8 lg:grid-cols-3">'
            + '<ul class="lg:col-span-2 divide-y divide-stone-200 border-y border-stone-200">' + items + '</ul>'
            + '<aside class="h-fit border border-stone-200 bg-white p-6 lg:sticky lg:top-24"><h2 class="font-bold">Order summary</h2><div class="mt-4">' + code + '</div>'
            + '<dl class="mt-5 space-y-3 text-sm"><div class="flex justify-between"><dt class="text-ink-muted">Subtotal</dt><dd>' + money(sub) + '</dd></div>'
            + (dis > 0 ? '<div class="flex justify-between text-accent"><dt>Discount</dt><dd>-' + money(dis) + '</dd></div>' : '')
            + '<div class="flex justify-between"><dt class="text-ink-muted">Shipping</dt><dd>' + (ship === 0 ? 'Free' : money(ship)) + '</dd></div></dl>'
            + '<div class="mt-4"><div class="h-1.5 w-full bg-stone-200"><div class="h-1.5 bg-ink" style="width: ' + progress + '%"></div></div>'
            + '<p class="mt-2 text-xs text-ink-muted">' + (ship > 0 ? 'Add ' + money(toFree) + ' more for free shipping.' : 'You’ve unlocked free shipping.') + '</p></div>'
            + '<div class="mt-4 flex justify-between border-t border-stone-200 pt-4 text-base font-bold"><span>Total</span><span>' + money(total()) + '</span></div>'
            + (S.user ? '<a href="' + BASE + '/checkout/" class="btn-primary mt-6 w-full">Checkout</a>' : '<a href="' + BASE + '/account/?next=checkout" class="btn-primary mt-6 w-full">Sign in to checkout</a>')
            + '<p class="v-demo">Try the codes <b>WELCOME10</b>, <b>VIP25</b> or <b>SAVE200</b>.</p></aside></div></div>';
        $$('[data-qty]', root).forEach(function (s) { s.addEventListener('change', function () { var v = V[s.dataset.qty]; S.bag[v.id] = clamp(parseInt(s.value, 10), v); save(); header(); cartPage(root); }); });
        $$('[data-remove]', root).forEach(function (b) { b.addEventListener('click', function () { delete S.bag[b.dataset.remove]; save(); header(); cartPage(root); }); });
        var un = $('[data-uncoupon]', root); if (un) un.addEventListener('click', function () { S.coupon = null; save(); cartPage(root); });
        var cf = $('[data-coupon]', root);
        if (cf) cf.addEventListener('submit', function (e) {
            e.preventDefault();
            var input = $('#code', cf), cp = findCoupon(input.value), err = cp ? couponProblem(cp, subtotal()) : 'We could not find that code.';
            if (err) { $('#code-error', root).textContent = err; input.focus(); return; }
            S.coupon = cp.code; save(); cartPage(root);
        });
    }

    /* ---------- checkout (checkout/index.blade.php, with test cards in place of a card number) ---------- */
    function field(id, name, text, value, extra) {
        return '<div' + (extra || '') + '><label for="' + id + '" class="block font-medium text-sm text-gray-700">' + text + '</label>'
            + '<input id="' + id + '" name="' + name + '" class="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-none shadow-sm mt-1 block w-full" value="' + esc(value || '') + '" required autocomplete="' + ({ ship_name: 'name', ship_address: 'street-address', ship_city: 'address-level2', ship_postal_code: 'postal-code' }[name]) + '">'
            + '<ul class="text-sm text-red-600 space-y-1 mt-1" data-error="' + name + '"></ul></div>';
    }
    function checkoutPage(root) {
        if (!lines().length) { flash('error', 'Your bag is empty.'); go('/cart/'); return; }
        if (!S.user) { go('/account/?next=checkout'); return; }
        var c = coupon(), sub = subtotal(), dis = discount(), ship = shipping(), tot = total(), last = S.orders[0], addr = S.user.address || {};
        var items = lines().map(function (l) { return '<li class="flex justify-between gap-3 py-3"><span class="text-ink">' + esc(l.product.name) + ' <span class="text-ink-muted">(' + esc(label(l.variant)) + ') × ' + l.quantity + '</span></span><span class="whitespace-nowrap">' + money(l.line) + '</span></li>'; }).join('');
        var cards = CARDS.map(function (cd, i) { return '<label class="v-card"><input type="radio" name="card" value="' + cd.number + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + cd.label + '</b><br><span class="text-sm text-ink-muted">' + cd.note + '</span></span></label>'; }).join('');
        root.innerHTML = '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 class="text-3xl font-extrabold tracking-tight">Checkout</h1><p class="mt-2 text-sm text-ink-muted">Enter your delivery details and choose a test card.</p>'
            + '<div class="mt-8 grid gap-8 lg:grid-cols-3"><form class="lg:col-span-2 space-y-6" data-checkout novalidate>'
            + '<section class="rounded-none border border-stone-200 p-6"><h2 class="font-bold">1. Shipping</h2><div class="mt-5 grid gap-4 sm:grid-cols-2">'
            + field('ship_name', 'ship_name', 'Full name', addr.name || S.user.name, ' class="sm:col-span-2"')
            + field('ship_address', 'ship_address', 'Street address', addr.address || (last && last.ship.address), ' class="sm:col-span-2"')
            + field('ship_city', 'ship_city', 'City', addr.city || (last && last.ship.city))
            + field('ship_postal_code', 'ship_postal_code', 'Postal code', addr.postal || (last && last.ship.postal))
            + '</div></section>'
            + '<section class="rounded-none border border-stone-200 p-6"><h2 class="font-bold">2. Payment</h2><div class="mt-5 grid gap-3">' + cards + '</div>'
            + '<ul class="text-sm text-red-600 space-y-1 mt-2" data-error="card"></ul>'
            + '<p class="v-demo"><b>Demo payment.</b> This copy never asks for a real card and never charges anything. Pick the second card to see a declined payment.</p></section>'
            + '<button type="submit" class="btn-primary w-full py-4">Place order · ' + money(tot) + '</button>'
            + '<p class="text-center text-sm"><a href="#" data-stop class="text-ink-muted underline hover:text-accent">Cancel payment and return to my bag</a></p></form>'
            + '<aside class="h-fit rounded-none bg-stone-50 p-6 lg:sticky lg:top-24 text-sm"><h2 class="font-bold">Your items</h2><ul class="mt-4 divide-y divide-stone-200">' + items + '</ul>'
            + '<dl class="mt-2 space-y-2 border-t border-stone-200 pt-4"><div class="flex justify-between"><dt class="text-ink-muted">Subtotal</dt><dd>' + money(sub) + '</dd></div>'
            + (dis > 0 ? '<div class="flex justify-between text-accent"><dt>Discount' + (c ? ' (' + esc(c.code) + ')' : '') + '</dt><dd>-' + money(dis) + '</dd></div>' : '')
            + '<div class="flex justify-between"><dt class="text-ink-muted">Shipping</dt><dd>' + (ship === 0 ? 'Free' : money(ship)) + '</dd></div>'
            + '<div class="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd>' + money(tot) + '</dd></div></dl></aside></div></div>';
        $('[data-stop]', root).addEventListener('click', function (e) { e.preventDefault(); flash('success', 'Payment cancelled. Your bag is unchanged.'); go('/cart/'); });
        $('[data-checkout]', root).addEventListener('submit', function (e) {
            e.preventDefault();
            var form = e.target, data = {}, bad = false;
            $$('[data-error]', form).forEach(function (u) { u.innerHTML = ''; });
            ['ship_name', 'ship_address', 'ship_city', 'ship_postal_code'].forEach(function (n) {
                data[n] = form.elements[n].value.trim();
                if (!data[n]) { bad = true; $('[data-error="' + n + '"]', form).innerHTML = '<li>This field is required.</li>'; }
            });
            if (bad) { $('[data-error] li', form).closest('div').querySelector('input').focus(); return; }
            // stock may have changed in another tab
            var short = lines().filter(function (l) { return l.quantity > stockOf(l.variant); })[0];
            if (short) { flash('error', 'Only ' + stockOf(short.variant) + ' left of ' + short.product.name + ' (' + label(short.variant) + '). Please update your bag.'); go('/cart/'); return; }
            var cardNo = form.elements.card.value;
            if (cardNo === CARDS[1].number) { $('[data-error="card"]', form).innerHTML = '<li>Your card was declined. Try another card.</li>'; return; }
            var cp = coupon(), order = {
                number: 'DM-' + random(8), placed: Date.now(), cancelled: null,
                items: lines().map(function (l) { return { product: l.product.id, slug: l.product.slug, name: l.product.name, image: l.product.image, variant: l.variant.id, size: l.variant.size, color: l.variant.color, unit: l.unit, quantity: l.quantity }; }),
                subtotal: subtotal(), discount: discount(), coupon: cp ? cp.code : null, shipping: shipping(), total: total(),
                ship: { name: data.ship_name, address: data.ship_address, city: data.ship_city, postal: data.ship_postal_code },
                payment: { status: 'successful', last4: cardNo.slice(-4), reference: 'PAY-' + random(12) }, returns: []
            };
            order.items.forEach(function (it) { S.sold[it.variant] = (S.sold[it.variant] || 0) + it.quantity; });
            S.orders.unshift(order);
            S.user.address = { name: data.ship_name, address: data.ship_address, city: data.ship_city, postal: data.ship_postal_code };
            S.bag = {}; S.coupon = null; save();
            flash('success', 'Payment approved. Thanks for your order!');
            go('/order/?n=' + encodeURIComponent(order.number));
        });
    }

    /* ---------- my orders (orders/index.blade.php) and one order (orders/show.blade.php) ---------- */
    function ordersPage(root) {
        if (!S.user) { go('/account/?next=orders'); return; }
        var rows = S.orders.map(function (o) {
            var n = o.items.reduce(function (s, i) { return s + i.quantity; }, 0);
            return '<a href="' + BASE + '/order/?n=' + encodeURIComponent(o.number) + '" class="flex items-center justify-between p-4 hover:bg-stone-50"><div><p class="font-medium">' + esc(o.number) + '</p>'
                + '<p class="text-sm text-stone-500">' + dateText(o.placed) + ' · ' + plural(o.items.length, 'item') + (n !== o.items.length ? ' (' + n + ' pieces)' : '') + '</p></div>'
                + '<div class="text-right"><p class="font-semibold">' + money(o.total) + '</p><span class="text-xs capitalize rounded-none bg-stone-100 px-2 py-0.5">' + status(o) + '</span></div></a>';
        }).join('');
        root.innerHTML = '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 class="text-2xl font-bold mb-6">My orders</h1>'
            + (S.orders.length ? '<div class="bg-white rounded-none border border-stone-200 divide-y divide-stone-200">' + rows + '</div>'
                : '<div class="bg-white rounded-none border border-stone-200 p-12 text-center"><p class="text-stone-600">You haven’t placed any orders yet.</p><a href="' + BASE + '/shop/" class="inline-block mt-4 rounded-none bg-ink text-white px-6 py-2.5 font-semibold hover:bg-black">Start shopping</a></div>')
            + '<p class="v-demo"><b>Demo orders.</b> Each order moves one step every minute (paid, processing, packed, shipped, delivered), so you can try tracking, cancelling and returns.</p></div>';
    }
    function orderPage(root) {
        if (!S.user) { go('/account/?next=orders'); return; }
        var o = orderByNumber(new URLSearchParams(location.search).get('n'));
        if (!o) { flash('error', 'We could not find that order.'); go('/orders/'); return; }
        var st = status(o), idx = STEPS.indexOf(st);
        document.title = 'Order ' + o.number + ' · Velora';
        var timeline = st !== 'cancelled'
            ? '<ol class="mt-8 grid grid-cols-5 gap-2 text-center text-xs font-medium">' + STEPS.map(function (s, i) {
                return '<li class="space-y-2"><div class="mx-auto grid h-8 w-8 place-items-center rounded-none ' + (i <= idx ? 'bg-accent text-white' : 'bg-stone-200 text-ink-muted') + '">' + (i < idx ? '<i class="ph ph-check"></i>' : (i + 1)) + '</div>'
                    + '<span class="' + (i <= idx ? 'text-ink' : 'text-ink-muted') + ' capitalize">' + s + '</span></li>';
            }).join('') + '</ol>'
            : '<p class="mt-8 rounded-none bg-stone-100 p-4 text-sm">This order was cancelled' + (o.cancelled.reason ? ': ' + esc(o.cancelled.reason) : '') + '. Your refund has been issued.</p>';
        var tracking = idx >= 3 ? '<p class="mt-4 text-sm text-ink-muted"><i class="ph ph-truck"></i> Demo Express · Tracking number <span class="font-mono text-ink">VX' + esc(o.number.slice(3)) + 'PH</span></p>' : '';
        var items = o.items.map(function (it) {
            return '<div class="p-4 flex justify-between gap-4"><div class="flex gap-4 min-w-0"><img src="' + esc(it.image) + '" alt="' + esc(it.name) + '" loading="lazy" class="h-24 w-20 shrink-0 object-cover bg-stone-100">'
                + '<div class="min-w-0"><p class="font-medium">' + esc(it.name) + '</p><p class="text-sm text-ink-muted">' + esc([it.size, it.color].filter(Boolean).join(' / ') || 'One size') + ' · ' + money(it.unit) + ' × ' + it.quantity + '</p></div></div>'
                + '<p class="font-semibold">' + money(it.unit * it.quantity) + '</p></div>';
        }).join('');
        var actions = '';
        if (canCancel(o)) actions += '<button type="button" data-cancel class="btn-secondary w-full">Cancel order</button>';
        if (canReturn(o)) actions += '<form data-return class="rounded-none border border-stone-200 p-5 text-sm space-y-3"><p class="font-semibold">Request a return</p><label for="return-reason" class="sr-only">Return reason</label>'
            + '<select id="return-reason" name="reason" class="w-full rounded-none border-stone-300 text-sm focus:border-accent focus:ring-accent" required><option value="">Choose a reason</option><option>Wrong size</option><option>Changed my mind</option><option>Damaged or faulty</option><option>Not as described</option></select>'
            + '<button type="submit" class="btn-secondary w-full">Send return request</button></form>';
        (o.returns || []).forEach(function (r) { actions += '<p class="rounded-none bg-stone-50 p-4 text-sm">Return request: <span class="font-semibold capitalize">' + esc(r.status) + '</span> · ' + esc(r.reason) + '</p>'; });
        var nextStep = st !== 'cancelled' && idx < STEPS.length - 1 ? Math.max(1, Math.ceil((o.placed + (idx + 1) * STEP_MS - Date.now()) / 1000)) : 0;
        root.innerHTML = '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><a href="' + BASE + '/orders/" class="text-sm font-semibold text-accent hover:underline">&larr; All orders</a>'
            + '<div class="mt-4 flex flex-wrap items-center justify-between gap-3"><div><h1 class="text-2xl font-extrabold tracking-tight">Order ' + esc(o.number) + '</h1><p class="text-sm text-ink-muted">Placed ' + dateText(o.placed) + '</p></div>'
            + '<span class="capitalize rounded-none px-3 py-1 text-sm font-semibold ' + (st === 'cancelled' ? 'bg-stone-200 text-ink-muted' : 'bg-emerald-50 text-emerald-800') + '">' + st + '</span></div>'
            + timeline + tracking
            + (nextStep ? '<p class="v-demo"><b>Demo tracking.</b> This order moves to “' + STEPS[idx + 1] + '” in about ' + nextStep + ' seconds. Refresh the page to see it.</p>' : '')
            + '<div class="mt-8 grid md:grid-cols-3 gap-6"><div class="md:col-span-2 rounded-none border border-stone-200 divide-y divide-stone-200">' + items + '</div><div class="space-y-6">'
            + '<div class="rounded-none bg-stone-50 p-5 text-sm space-y-2"><div class="flex justify-between"><span class="text-ink-muted">Subtotal</span><span>' + money(o.subtotal) + '</span></div>'
            + (o.discount > 0 ? '<div class="flex justify-between text-accent"><span>Discount</span><span>-' + money(o.discount) + '</span></div>' : '')
            + '<div class="flex justify-between"><span class="text-ink-muted">Shipping</span><span>' + (o.shipping === 0 ? 'Free' : money(o.shipping)) + '</span></div>'
            + '<div class="flex justify-between font-bold text-base border-t border-stone-200 pt-2"><span>Total</span><span>' + money(o.total) + '</span></div></div>'
            + '<div class="rounded-none border border-stone-200 p-5 text-sm"><p class="font-semibold mb-2">Shipping to</p><p>' + esc(o.ship.name) + '</p><p>' + esc(o.ship.address) + '</p><p>' + esc(o.ship.city) + ' ' + esc(o.ship.postal) + '</p></div>'
            + '<div class="rounded-none border border-stone-200 p-5 text-sm"><p class="font-semibold mb-2">Payment</p><p class="text-ink-muted">Payment: ' + (o.cancelled ? 'refunded' : o.payment.status) + '</p><p class="text-ink-muted">Test card ending ' + esc(o.payment.last4) + '</p><p class="mt-1 break-all font-mono text-xs text-ink-muted">' + esc(o.payment.reference) + '</p></div>'
            + actions + '</div></div></div>';
        var cb = $('[data-cancel]', root);
        if (cb) cb.addEventListener('click', function () {
            if (!confirm('Cancel this order? Your refund will be issued.')) return;
            if (!canCancel(o)) { flash('error', 'This order has already shipped or been cancelled, so it cannot be cancelled here.'); location.reload(); return; }
            o.cancelled = { at: Date.now(), reason: 'Cancelled by customer' };
            o.items.forEach(function (it) { S.sold[it.variant] = Math.max(0, (S.sold[it.variant] || 0) - it.quantity); });
            save(); flash('success', 'Order cancelled and your refund has been issued.'); location.reload();
        });
        var rf = $('[data-return]', root);
        if (rf) rf.addEventListener('submit', function (e) {
            e.preventDefault();
            var reason = rf.elements.reason.value;
            if (!reason) { rf.elements.reason.focus(); return; }
            o.returns = [{ status: 'requested', reason: reason, at: Date.now() }];
            save(); flash('success', 'Return request sent. Our team will review it.'); location.reload();
        });
    }

    /* ---------- wishlist (wishlist/index.blade.php) ---------- */
    function wishlistPage(root) {
        if (!S.user) { go('/account/?next=wishlist'); return; }
        var list = S.wishlist.map(function (id) { return P[id]; }).filter(Boolean);
        root.innerHTML = '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 class="text-2xl font-extrabold tracking-tight">Your wishlist</h1><p class="mt-1 text-sm text-ink-muted">' + plural(list.length, 'item') + ' saved</p>'
            + (list.length ? '<div class="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">' + list.map(card).join('') + '</div>'
                : '<div class="mt-8 rounded-none border border-dashed border-stone-300 p-12 text-center"><i class="ph ph-heart text-4xl text-ink-muted"></i><p class="mt-3 font-semibold">Nothing saved yet.</p><p class="text-sm text-ink-muted">Tap the heart on any product to keep it here.</p><a href="' + BASE + '/shop/sort-newest/" class="btn-primary mt-6">Browse new arrivals</a></div>')
            + '</div>';
    }

    /* ---------- account: a pretend sign-in (no password), then the profile ---------- */
    function accountPage(root) {
        var next = new URLSearchParams(location.search).get('next'), dest = { checkout: '/checkout/', orders: '/orders/', wishlist: '/wishlist/' }[next];
        if (!S.user) {
            root.innerHTML = '<div class="max-w-md mx-auto px-4 sm:px-6 py-12"><div class="bg-white border border-stone-200 p-8"><div class="mb-6 text-center"><h1 class="text-2xl font-semibold">Welcome to Velora</h1>'
                + '<p class="mt-1 text-sm text-ink-muted">' + (next ? 'Sign in to continue.' : 'Sign in to track orders and check out faster.') + '</p></div>'
                + '<form data-signin novalidate><label for="name" class="block font-medium text-sm text-gray-700">Your name <span class="text-ink-muted">(optional)</span></label>'
                + '<input id="name" name="name" maxlength="60" autocomplete="off" placeholder="Demo Customer" class="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-none shadow-sm mt-1 block w-full">'
                + '<button type="submit" class="btn-primary mt-6 w-full">Sign in as a demo customer</button></form>'
                + '<p class="v-demo"><b>Pretend account.</b> This copy has no real accounts and no passwords. Your bag, orders and wishlist are kept in this browser only.</p></div></div>';
            $('[data-signin]', root).addEventListener('submit', function (e) {
                e.preventDefault();
                S.user = { name: e.target.elements.name.value.trim() || 'Demo Customer', since: Date.now() };
                save(); flash('success', 'Signed in. Welcome, ' + S.user.name + '!');
                go(dest || '/');
            });
            return;
        }
        root.innerHTML = '<div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 class="text-2xl font-extrabold tracking-tight">Account</h1>'
            + '<div class="mt-6 grid gap-6"><form data-profile class="rounded-none border border-stone-200 bg-white p-6"><h2 class="font-bold">Profile</h2>'
            + '<label for="name" class="mt-4 block font-medium text-sm text-gray-700">Name</label><input id="name" name="name" maxlength="60" required value="' + esc(S.user.name) + '" class="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-none shadow-sm mt-1 block w-full">'
            + '<button type="submit" class="btn-primary mt-4">Save</button></form>'
            + '<div class="rounded-none border border-stone-200 bg-white p-6 text-sm"><h2 class="font-bold">Your shopping</h2><ul class="mt-3 space-y-2"><li><a href="' + BASE + '/orders/" class="font-semibold underline">My orders</a> (' + S.orders.length + ')</li><li><a href="' + BASE + '/wishlist/" class="font-semibold underline">Wishlist</a> (' + S.wishlist.length + ')</li><li><a href="' + BASE + '/cart/" class="font-semibold underline">Bag</a> (' + count() + ')</li></ul></div>'
            + '<div class="flex flex-wrap gap-3"><button type="button" data-signout class="btn-secondary">Sign out</button><button type="button" data-reset class="btn-secondary">Clear all demo data</button></div>'
            + '<p class="v-demo"><b>Pretend account.</b> Everything here is kept in this browser only. “Clear all demo data” empties the bag, orders and wishlist.</p></div></div>';
        $('[data-profile]', root).addEventListener('submit', function (e) { e.preventDefault(); var n = e.target.elements.name.value.trim(); if (!n) return; S.user.name = n; save(); tell('Profile saved.'); });
        $('[data-signout]', root).addEventListener('click', function () { S.user = null; save(); flash('success', 'You are signed out.'); go('/'); });
        $('[data-reset]', root).addEventListener('click', function () {
            if (!confirm('Clear your demo bag, orders and wishlist?')) return;
            try { localStorage.removeItem(KEY); } catch (e) {}
            flash('success', 'Demo data cleared.'); go('/');
        });
    }

    /* ---------- every page: forms and links ---------- */
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (f.matches('[data-coupon], [data-checkout], [data-return], [data-signin], [data-profile]')) return;   // handled by their page
        e.preventDefault(); e.stopPropagation();
        if (f.id === 'add-to-bag') { if (D) addToBag(f); return; }
        if ((f.getAttribute('method') || 'get').toLowerCase() === 'get' && /\/velora\/shop\/$/.test(f.getAttribute('action') || '')) { location.href = shopUrl(new URLSearchParams(new FormData(f))); return; }
        tell('The staff area is not part of this demo copy; it needs the full Laravel app.');
    }, true);
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href="#full-app"]');
        if (a) { e.preventDefault(); tell('The staff area is not part of this demo copy; it needs the full Laravel app.'); }
    }, true);

    // shop pages with a query: send category and sort to their folder before anything is drawn
    if (location.search && location.pathname.indexOf(BASE + '/shop/') === 0) {
        var early = folderFor(new URLSearchParams(location.search));
        if (early) { location.replace(early); return; }
    }

    function start() {
        header(); showFlash();
        var root = $('#vapp'), name = page();
        if (name === 'cart') cartPage(root);
        else if (name === 'checkout') checkoutPage(root);
        else if (name === 'orders') ordersPage(root);
        else if (name === 'order') orderPage(root);
        else if (name === 'wishlist') wishlistPage(root);
        else if (name === 'account') accountPage(root);
        else if (location.pathname.indexOf(BASE + '/shop/') === 0) shopPage();
        else if (location.pathname.indexOf(BASE + '/products/') === 0) productPage();
    }
    function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
    fetch(BASE + '/data/shop.json').then(function (r) { return r.json(); }).then(function (data) {
        D = data;
        D.products.forEach(function (p) { P[p.id] = p; PS[p.slug] = p; p.variants.forEach(function (v) { v.product = p; V[v.id] = v; }); });
        ready(start);
    }).catch(function () {
        ready(function () { var root = $('#vapp'); if (root) root.innerHTML = '<p class="max-w-7xl mx-auto px-4 py-16">The shop could not load its products. Please refresh the page.</p>'; });
    });
})();
