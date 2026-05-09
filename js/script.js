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

    /* ─────────────────────────────────────────
       10. 3D HERO MODEL (THREE.JS)
    ───────────────────────────────────────── */
    function init3DHero() {
        const canvas = document.getElementById('hero3DCanvas');
        if (!canvas || typeof THREE === 'undefined') return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.set(18, 8, 28);
        camera.lookAt(0, 2, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // --- Holographic Materials ---
        const cyan = 0x00e5ff;
        const cyanDim = 0x006680;
        const gold = 0xffaa00;

        const wireMat = new THREE.MeshBasicMaterial({ color: cyan, wireframe: true, transparent: true, opacity: 0.7 });
        const wireMatDim = new THREE.MeshBasicMaterial({ color: cyanDim, wireframe: true, transparent: true, opacity: 0.3 });
        const solidGlow = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.1 });
        const edgeMat = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 });
        const goldMat = new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.7 });

        // Helper: add glowing edges to a mesh
        function addEdges(mesh, parent, mat) {
            const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
            const line = new THREE.LineSegments(edges, mat || edgeMat);
            line.position.copy(mesh.position);
            line.rotation.copy(mesh.rotation);
            line.scale.copy(mesh.scale);
            parent.add(line);
        }

        const pumpjacks = [];

        function createHoloPumpjack(x, y, z, scale, speed, phase, rotY = 0) {
            const g = new THREE.Group();
            g.position.set(x, y, z);
            g.rotation.y = rotY;
            g.scale.set(scale, scale, scale);
            scene.add(g);

            // Base platform
            const base = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 5), solidGlow);
            base.position.y = -4;
            g.add(base);
            addEdges(base, g);

            // Base skid rails
            const rail1 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.3), wireMat);
            rail1.position.set(0, -4, 2);
            g.add(rail1);
            const rail2 = rail1.clone();
            rail2.position.z = -2;
            g.add(rail2);

            // Samson Post (A-frame tower)
            const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 8, 8), wireMat);
            postL.position.set(0, 0, 1.5);
            postL.rotation.z = -0.08;
            g.add(postL); addEdges(postL, g);

            const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 8, 8), wireMat);
            postR.position.set(0, 0, -1.5);
            postR.rotation.z = -0.08;
            g.add(postR); addEdges(postR, g);

            // Cross braces on tower
            for (let i = 0; i < 3; i++) {
                const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), wireMatDim);
                brace.rotation.x = Math.PI / 2;
                brace.position.set(0, -2.5 + i * 2.5, 0);
                g.add(brace);
            }

            // Top bearing/pivot
            const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), goldMat);
            pivot.position.set(0, 3.8, 0);
            g.add(pivot);

            // Walking beam pivot group
            const beamPivot = new THREE.Group();
            beamPivot.position.set(0, 3.8, 0);
            g.add(beamPivot);

            // Walking beam (I-beam shape using box)
            const beam = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 0.8), wireMat);
            beamPivot.add(beam); addEdges(beam, beamPivot);

            // Horse head (curved arc)
            const headGeo = new THREE.TorusGeometry(2.2, 0.25, 16, 32, Math.PI * 0.6);
            const head = new THREE.Mesh(headGeo, wireMat);
            head.position.set(-6, -1.5, 0);
            head.rotation.z = Math.PI * 0.8;
            beamPivot.add(head); addEdges(head, beamPivot);

            // Counterweight end
            const cwBall = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), goldMat);
            cwBall.position.set(6, 0, 0);
            beamPivot.add(cwBall);

            // Crank assembly
            const crankPivot = new THREE.Group();
            crankPivot.position.set(4.5, -2, 0);
            g.add(crankPivot);

            // Counterweight disc
            const cw = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.4, 24), wireMat);
            cw.rotation.x = Math.PI / 2;
            crankPivot.add(cw); addEdges(cw, crankPivot);

            // Crank arm
            const crankArm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 0.25), wireMat);
            crankArm.position.set(1.25, 0, 0);
            crankPivot.add(crankArm);

            // Pitman arm
            const pitman = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 8), wireMatDim);
            g.add(pitman);

            // Polished rod (drill string going underground)
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 10, 8), wireMat);
            g.add(rod);

            // Wellhead at base
            const wellhead = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.2, 12), wireMat);
            wellhead.position.set(-7, -3.5, 0);
            g.add(wellhead); addEdges(wellhead, g);

            // Derrick tower (background)
            const derrick = new THREE.Group();
            derrick.position.set(3, 0, 0);
            g.add(derrick);
            for (let i = 0; i < 4; i++) {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 12, 6), wireMatDim);
                const angle = (i / 4) * Math.PI * 2;
                leg.position.set(Math.cos(angle) * 1.2, 2, Math.sin(angle) * 1.2);
                derrick.add(leg);
            }
            // Derrick top
            const derrickTop = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 6), goldMat);
            derrickTop.position.set(0, 8.5, 0);
            derrick.add(derrickTop);

            pumpjacks.push({ group: g, beamPivot, crankPivot, pitman, rod, speed, phase });
        }

        // Add multiple pumpjacks for full-page depth
        createHoloPumpjack(0, 0, 0, 1, 1.2, 0, 0);
        createHoloPumpjack(-20, -1, -15, 0.8, 0.9, Math.PI, Math.PI * 0.15);
        createHoloPumpjack(25, -3, -25, 1.2, 1.05, Math.PI / 2, -Math.PI * 0.1);
        createHoloPumpjack(10, 2, 25, 0.6, 1.3, Math.PI / 4, Math.PI * 0.8);
        createHoloPumpjack(-30, 4, 10, 0.7, 0.85, Math.PI * 1.5, Math.PI * 0.4);

        // --- Ground Grid ---
        const gridHelper = new THREE.GridHelper(120, 80, cyan, cyanDim);
        gridHelper.position.y = -4;
        gridHelper.material.opacity = 0.1;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        // Secondary radial grid
        const gridHelper2 = new THREE.PolarGridHelper(60, 16, 8, 128, cyanDim, cyanDim);
        gridHelper2.position.y = -4;
        gridHelper2.material.opacity = 0.05;
        gridHelper2.material.transparent = true;
        scene.add(gridHelper2);

        // --- Floating Particle Network ---
        const particleCount = 250;
        const particles = [];
        const pGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 });
        const pMatGold = new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.6 });

        for (let i = 0; i < particleCount; i++) {
            const m = new THREE.Mesh(pGeo, i % 5 === 0 ? pMatGold : pMat);
            const px = (Math.random() - 0.5) * 100;
            const py = (Math.random() - 0.3) * 40;
            const pz = (Math.random() - 0.5) * 80;
            m.position.set(px, py, pz);
            scene.add(m);
            particles.push({ mesh: m, baseX: px, baseY: py, baseZ: pz, speed: 0.2 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
        }

        // Connection lines between nearby particles
        const lineGeo = new THREE.BufferGeometry();
        const maxLines = 600;
        const linePositions = new Float32Array(maxLines * 6);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        lineGeo.setDrawRange(0, 0);
        const lineMat = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.1 });
        const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
        scene.add(linesMesh);

        // --- Subtle Lighting ---
        scene.add(new THREE.AmbientLight(0x003355, 0.5));

        // --- Interaction State ---
        let mouseX = 0, mouseY = 0;
        let scrollY = window.scrollY;
        
        const halfX = window.innerWidth / 2, halfY = window.innerHeight / 2;
        document.addEventListener('mousemove', e => {
            mouseX = (e.clientX - halfX) * 0.005;
            mouseY = (e.clientY - halfY) * 0.005;
        });

        window.addEventListener('scroll', () => {
            scrollY = window.scrollY;
        }, { passive: true });

        window.addEventListener('resize', () => {
            if (!canvas.parentElement) return;
            camera.aspect = canvas.parentElement.clientWidth / canvas.parentElement.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
        });

        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            // Animate pumpjacks
            pumpjacks.forEach(pj => {
                const a = t * pj.speed + pj.phase;
                pj.crankPivot.rotation.z = a;
                const ba = Math.sin(a) * 0.22;
                pj.beamPivot.rotation.z = ba;

                // Rod follows horse head tip
                const tipY = 3.8 + Math.sin(ba) * -7;
                pj.rod.position.set(-7, tipY - 5, 0);

                // Pitman arm connecting crank to beam
                const cpx = 4.5 + Math.cos(a) * 2.5;
                const cpy = -2 + Math.sin(a) * 2.5;
                const bbx = Math.cos(ba) * 6;
                const bby = 3.8 + Math.sin(ba) * 6;
                const mx = (cpx + bbx) / 2, my = (cpy + bby) / 2;
                const dx = bbx - cpx, dy = bby - cpy;
                pj.pitman.scale.y = Math.sqrt(dx * dx + dy * dy) / 7;
                pj.pitman.position.set(mx, my, 0);
                pj.pitman.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
            });

            // Animate particles (gentle float)
            particles.forEach(p => {
                p.mesh.position.y = p.baseY + Math.sin(t * p.speed + p.phase) * 1.2;
                p.mesh.position.x = p.baseX + Math.cos(t * p.speed * 0.5 + p.phase) * 0.5;
            });

            // Update connection lines
            let lineIdx = 0;
            const posArr = linesMesh.geometry.attributes.position.array;
            for (let i = 0; i < particles.length && lineIdx < maxLines; i++) {
                for (let j = i + 1; j < particles.length && lineIdx < maxLines; j++) {
                    const a = particles[i].mesh.position;
                    const b = particles[j].mesh.position;
                    const d = a.distanceTo(b);
                    if (d < 8) {
                        const idx = lineIdx * 6;
                        posArr[idx] = a.x; posArr[idx+1] = a.y; posArr[idx+2] = a.z;
                        posArr[idx+3] = b.x; posArr[idx+4] = b.y; posArr[idx+5] = b.z;
                        lineIdx++;
                    }
                }
            }
            linesMesh.geometry.setDrawRange(0, lineIdx * 2);
            linesMesh.geometry.attributes.position.needsUpdate = true;

            // Camera parallax + Scroll dynamics
            const scrollFactor = scrollY * 0.0015;
            const camRadius = 28;
            
            // As user scrolls, camera rotates around the scene and moves down
            const targetX = Math.sin(scrollFactor + mouseX) * camRadius;
            const targetZ = Math.cos(scrollFactor + mouseX) * camRadius;
            const targetY = 8 - scrollFactor * 4 - mouseY * 5;
            
            camera.position.x += (targetX - camera.position.x) * 0.04;
            camera.position.y += (targetY - camera.position.y) * 0.04;
            camera.position.z += (targetZ - camera.position.z) * 0.04;
            
            // Look slightly down and rotate look target slowly based on scroll
            camera.lookAt(Math.sin(scrollFactor) * 5, 2 - scrollFactor * 2, Math.cos(scrollFactor) * 5);

            renderer.render(scene, camera);
        }
        animate();
    }

    init3DHero();

});
