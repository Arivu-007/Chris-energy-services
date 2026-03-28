/**
 * Chris Energy Services – Main JavaScript
 * Features: Mobile nav, scroll effects, stats counter, form handling, animations
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─────────────────────────────────────────
       1. MOBILE NAV TOGGLE
    ───────────────────────────────────────── */
    const menuToggle = document.getElementById('menuToggle');
    const mainNav    = document.getElementById('mainNav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('mobile-open');
            menuToggle.classList.toggle('open', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen);
            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close nav when a link is clicked
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('mobile-open');
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                mainNav.classList.remove('mobile-open');
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }

    /* ─────────────────────────────────────────
       2. HEADER SCROLL EFFECT
    ───────────────────────────────────────── */
    const header = document.getElementById('header');

    if (header) {
        const onScroll = () => {
            header.classList.toggle('scrolled', window.scrollY > 40);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll(); // run once on load
    }

    /* ─────────────────────────────────────────
       3. ACTIVE NAV LINK ON SCROLL
    ───────────────────────────────────────── */
    const sections = document.querySelectorAll('section[id], div[id]');
    const navLinks  = document.querySelectorAll('.nav-link');

    const observeSections = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(section => observeSections.observe(section));

    /* ─────────────────────────────────────────
       4. SCROLL REVEAL ANIMATIONS
    ───────────────────────────────────────── */
    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger delay for elements within the same parent
                const siblings = Array.from(entry.target.parentElement.querySelectorAll('.reveal'));
                const sibIndex = siblings.indexOf(entry.target);
                const delay = Math.min(sibIndex * 80, 320);

                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);

                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    reveals.forEach(el => revealObserver.observe(el));

    /* ─────────────────────────────────────────
       5. ANIMATED STATS COUNTER
    ───────────────────────────────────────── */
    const statItems = document.querySelectorAll('.stat-item');

    function animateCounter(el) {
        const numberEl = el.querySelector('.stat-number');
        const suffixEl  = el.querySelector('.stat-suffix');
        if (!numberEl) return;

        const target = parseInt(numberEl.getAttribute('data-target') || '0', 10);
        const duration = 1800;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            numberEl.textContent = current.toLocaleString();
            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statItems.forEach(item => statsObserver.observe(item));

    /* ─────────────────────────────────────────
       6. SMOOTH SCROLL FOR ANCHOR LINKS
    ───────────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset;

                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        });
    });

    /* ─────────────────────────────────────────
       7. ENQUIRY FORM HANDLING
    ───────────────────────────────────────── */
    const form        = document.getElementById('enquiryForm');
    const formMessage = document.getElementById('formMessage');
    const submitBtn   = document.getElementById('submitEnquiryBtn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset messages
            if (formMessage) {
                formMessage.className = 'form-message';
                formMessage.textContent = '';
            }

            // Basic validation
            const name    = document.getElementById('name')?.value.trim();
            const email   = document.getElementById('email')?.value.trim();
            const message = document.getElementById('message')?.value.trim();

            if (!name || !email || !message) {
                showFormMessage('error', '⚠ Please fill in all required fields.');
                return;
            }

            // Email format check
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showFormMessage('error', '⚠ Please enter a valid email address.');
                return;
            }

            // Simulate submission (replace with real endpoint if available)
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Sending…`;
            }

            await new Promise(resolve => setTimeout(resolve, 1500));

            showFormMessage('success', '✓ Thank you! Your enquiry has been received. We\'ll be in touch shortly.');
            form.reset();

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Submit Enquiry`;
            }
        });
    }

    function showFormMessage(type, text) {
        if (!formMessage) return;
        formMessage.className = `form-message ${type}`;
        formMessage.textContent = text;
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ─────────────────────────────────────────
       8. ADD SPIN ANIMATION FOR LOADER
    ───────────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    /* ─────────────────────────────────────────
       9. SERVICE CARDS – pre-fill dropdown on CTA click
    ───────────────────────────────────────── */
    const serviceCtaMap = {
        'pipeRepairCta':      'pipe-repair',
        'pipelineServicesCta':'pipeline-services',
        'powerUtilitiesCta':  'power-utilities',
        'inspectionCta':      'inspection-testing',
    };

    Object.entries(serviceCtaMap).forEach(([btnId, value]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const select = document.getElementById('service');
                if (select) select.value = value;
            });
        }
    });

});
