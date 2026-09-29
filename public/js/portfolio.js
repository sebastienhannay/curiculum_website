document.addEventListener("DOMContentLoaded", function() {
    // Mobile Navbar handling
    if (typeof bootstrap !== 'undefined') {
        const navLinks = document.querySelectorAll('.nav-link');
        const menuToggle = document.getElementById('navbarNav');
        const bsCollapse = new bootstrap.Collapse(menuToggle, {toggle: false});

        navLinks.forEach((l) => {
            l.addEventListener('click', () => {
                if(menuToggle.classList.contains('show')){
                    bsCollapse.toggle();
                }
            })
        });
    }
});

function toggleLanguage() {
    const body = document.body;
    const html = document.documentElement;

    if (body.classList.contains('lang-en')) {
        body.classList.remove('lang-en');
        body.classList.add('lang-fr');
        html.lang = 'fr';
    } else {
        body.classList.remove('lang-fr');
        body.classList.add('lang-en');
        html.lang = 'en';
    }

}