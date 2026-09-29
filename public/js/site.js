// This script sits at the end of <body>, so the DOM is ready: start the
// visual parts right away, without waiting for Bootstrap (deferred, CDN).
initReveal();
document.getElementById('year').textContent = new Date().getFullYear();
applyPlaceholders();
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initScrollEffects();
    // Count-up waits for a visibility callback, which iOS Safari delays while
    // scrolling (numbers would sit at 0): only animate on mouse/trackpad devices
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) initCounters();
}

document.addEventListener("DOMContentLoaded", function () {
    // Close the mobile menu after tapping a link (Bootstrap is loaded by now)
    const menu = document.getElementById('navbarNav');
    const collapse = new bootstrap.Collapse(menu, { toggle: false });
    document.querySelectorAll('#navbarNav a').forEach((link) => {
        link.addEventListener('click', () => {
            if (menu.classList.contains('show')) collapse.hide();
        });
    });

    // Brief builder: turn the form into a pre-filled email
    document.getElementById('brief').addEventListener('submit', function (e) {
        e.preventDefault();
        const fr = document.body.classList.contains('lang-fr');
        const label = (input) => (fr && input.dataset.fr) || input.value;

        const needs = [...this.querySelectorAll('input[type=checkbox]:checked')].map(label);
        const stage = label(this.querySelector('input[name=stage]:checked'));
        const message = document.getElementById('b-msg').value.trim();

        const subject = (fr ? 'Nouveau projet' : 'New project') + (needs.length ? ' : ' + needs.join(', ') : '');
        const body = [
            (fr ? 'Besoins' : 'Needs') + ' : ' + (needs.join(', ') || '-'),
            (fr ? 'Étape' : 'Stage') + ' : ' + stage,
            '',
            message || (fr ? '(décrivez votre projet ici)' : '(describe your project here)'),
        ].join('\n');

        window.location.href = 'mailto:seb.hannay@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
});

// Reveal-on-scroll for [data-aos] elements (replaces the AOS library).
// Elements are only hidden once this runs (html.js), and are revealed
// slightly before they enter the viewport. Items in a horizontal swipe row
// are revealed together when the row comes into view.
function initReveal() {
    const items = [...document.querySelectorAll('[data-aos]')];
    if (!('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('in'));
        return;
    }
    const groups = new Map();
    items.forEach((el) => {
        const delay = parseInt(el.dataset.aosDelay || '0', 10);
        if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
        const target = el.closest('.snap-row') || el;
        if (!groups.has(target)) groups.set(target, []);
        groups.get(target).push(el);
    });
    const show = (target) => groups.get(target).forEach((el) => el.classList.add('in'));
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            show(entry.target);
        });
    }, { rootMargin: '0px 0px 10% 0px' });

    // What's already on screen at load is revealed on the next frame instead
    // of waiting for the observer's first callback
    const vh = window.innerHeight;
    const onScreen = [];
    groups.forEach((_, target) => {
        const r = target.getBoundingClientRect();
        if (r.top < vh * 1.1 && r.bottom > 0) onScreen.push(target);
        else io.observe(target);
    });
    requestAnimationFrame(() => onScreen.forEach(show));
}

// Scroll-driven motion: hero phones fan out, screenshots drift at their own
// speed (data-speed), background glows follow, numbers count up.
// Uses the individual `translate` / `rotate` / `scale` properties so it
// composes with the layout transforms and the reveal animations.
function initScrollEffects() {
    const bar = document.querySelector('.scroll-progress');
    const hero = document.querySelector('.hero');
    const [left, center, right] = ['.phone-left', '.phone-center', '.phone-right'].map((s) => hero.querySelector(s));
    const orbs = [...hero.querySelectorAll('.ambient-orb')];
    // Skip images hidden at this screen size (e.g. the SaaS card's phones on mobile)
    const drifters = [...document.querySelectorAll('[data-speed]')].filter((el) => el.offsetParent !== null);
    const glow = document.querySelector('.dark-glow');
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const touch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let queued = false;
    let heroH = 0, maxScroll = 0, spread = 0, lastHeroP = -1;

    // Layout values change only on resize: read them once, not every frame
    function measure() {
        heroH = hero.offsetHeight;
        maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        spread = Math.min(70, window.innerWidth * 0.06); // gentler fan-out on phones
        lastHeroP = -1;
    }

    function update() {
        queued = false;
        const y = window.scrollY;
        const vh = window.innerHeight;

        // Read phase: every layout measurement first, so the style writes
        // below never force a layout mid-frame
        const drift = drifters.map((el) => el.parentElement.getBoundingClientRect());
        const glowTop = glow ? glow.parentElement.getBoundingClientRect().top : 0;

        // Write phase
        bar.style.transform = `scaleX(${maxScroll > 0 ? y / maxScroll : 0})`;

        // Hero: 0 at top, 1 once the phones have scrolled mostly out of view.
        // Skipped entirely once it's off screen and settled.
        const p = clamp(y / (heroH * 0.75), 0, 1);
        if (p !== lastHeroP) {
            lastHeroP = p;
            const e = 1 - Math.pow(1 - p, 2); // ease-out
            left.style.translate = `${-e * spread}px ${e * 50}px`;
            right.style.translate = `${e * spread}px ${e * 50}px`;
            center.style.translate = `0 ${-e * 40}px`;
            // Rotating/scaling re-renders the phone shadows: desktop only
            if (!touch) {
                left.style.rotate = `${-e * 7}deg`;
                right.style.rotate = `${e * 7}deg`;
                center.style.scale = `${1 + e * 0.05}`;
            }
            orbs.forEach((o, i) => { o.style.translate = `0 ${(p * heroH * (0.15 + i * 0.1)).toFixed(1)}px`; });
        }

        // Parallax: offset from the viewport centre, measured on the (untransformed) parent
        drifters.forEach((el, i) => {
            const r = drift[i];
            if (r.bottom < -300 || r.top > vh + 300) return;
            const d = r.top + r.height / 2 - vh / 2;
            el.style.translate = `0 ${(-d * parseFloat(el.dataset.speed)).toFixed(1)}px`;
        });

        if (glow) glow.style.translate = `0 ${clamp(-glowTop * 0.35, -200, 600).toFixed(1)}px`;
    }

    const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', () => { measure(); request(); });
    window.addEventListener('load', () => { measure(); request(); }); // images change the page height
    measure();
    update();
}

// Count numbers up from 0 the first time they scroll into view
function initCounters() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            const el = entry.target;
            const to = parseInt(el.dataset.to, 10);
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min((now - start) / 1200, 1);
                el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
                if (t < 1) requestAnimationFrame(tick);
            };
            el.textContent = '0';
            requestAnimationFrame(tick);
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('.count[data-to]').forEach((el) => io.observe(el));
}

function applyPlaceholders() {
    const lang = document.body.classList.contains('lang-fr') ? 'fr' : 'en';
    document.querySelectorAll('[data-ph-en]').forEach((el) => {
        el.placeholder = el.dataset['ph' + (lang === 'fr' ? 'Fr' : 'En')];
    });
}

function toggleLanguage() {
    const next = document.body.classList.contains('lang-en') ? 'fr' : 'en';
    document.body.classList.remove('lang-en', 'lang-fr');
    document.body.classList.add('lang-' + next);
    document.documentElement.lang = next;
    try { localStorage.setItem('lang', next); } catch (e) {}
    applyPlaceholders();

}
