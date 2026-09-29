document.addEventListener("DOMContentLoaded", function () {
    // iOS spring feel
    AOS.init({ duration: 800, easing: 'ease-out-back', once: true, offset: 40 });

    document.getElementById('year').textContent = new Date().getFullYear();
    applyPlaceholders();

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        initScrollEffects();
        initCounters();
    }

    // Close the mobile menu after tapping a link
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

// Scroll-driven motion: hero phones fan out, screenshots drift at their own
// speed (data-speed), background glows follow, numbers count up.
// Uses the individual `translate` / `rotate` / `scale` properties so it
// composes with the layout transforms and AOS entrance animations.
function initScrollEffects() {
    const bar = document.querySelector('.scroll-progress');
    const hero = document.querySelector('.hero');
    const [left, center, right] = ['.phone-left', '.phone-center', '.phone-right'].map((s) => hero.querySelector(s));
    const orbs = [...hero.querySelectorAll('.ambient-orb')];
    const drifters = [...document.querySelectorAll('[data-speed]')];
    const glow = document.querySelector('.dark-glow');
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    let queued = false;

    function update() {
        queued = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        const max = document.documentElement.scrollHeight - vh;
        bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

        // Hero: 0 at top, 1 once the phones have scrolled mostly out of view
        const p = clamp(y / (hero.offsetHeight * 0.75), 0, 1);
        const e = 1 - Math.pow(1 - p, 2); // ease-out
        const spread = Math.min(70, window.innerWidth * 0.06); // gentler fan-out on phones
        left.style.translate = `${-e * spread}px ${e * 50}px`;
        left.style.rotate = `${-e * 7}deg`;
        right.style.translate = `${e * spread}px ${e * 50}px`;
        right.style.rotate = `${e * 7}deg`;
        center.style.translate = `0 ${-e * 40}px`;
        center.style.scale = `${1 + e * 0.05}`;
        orbs.forEach((o, i) => { o.style.translate = `0 ${y * (0.15 + i * 0.1)}px`; });

        // Parallax: offset from the viewport centre, measured on the (untransformed) parent
        drifters.forEach((el) => {
            const r = el.parentElement.getBoundingClientRect();
            if (r.bottom < -300 || r.top > vh + 300) return;
            const d = r.top + r.height / 2 - vh / 2;
            el.style.translate = `0 ${(-d * parseFloat(el.dataset.speed)).toFixed(1)}px`;
        });

        if (glow) {
            const r = glow.parentElement.getBoundingClientRect();
            glow.style.translate = `0 ${clamp(-r.top * 0.35, -200, 600).toFixed(1)}px`;
        }
    }

    const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
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

    // Refresh layout calculations for the spring animations
    setTimeout(() => AOS.refresh(), 100);
}
