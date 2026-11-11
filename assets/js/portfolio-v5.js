(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const captureAttribution = () => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      const current = {};
      let found = false;
      keys.forEach(k => {
        const val = sp.get(k);
        if (val) {
          current[k] = val;
          found = true;
        }
      });
      if (found) {
        sessionStorage.setItem('cv_portfolio_utm', JSON.stringify(current));
        return current;
      }
      const saved = sessionStorage.getItem('cv_portfolio_utm');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  };
  const utmContext = captureAttribution();
  const trackEvent = (eventName, params = {}) => {
    const payload = {
      event: eventName,
      page_path: window.location.pathname,
      ...utmContext,
      ...params
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }
  };
  trackEvent('page_view_portfolio', {
    page_title: document.title,
    referrer: document.referrer || 'direct'
  });
  const isMotionOff = () =>
    reducedMotion.matches ||
    root.classList.contains('motion-paused') ||
    document.body.classList.contains('motion-paused');

  // ---------------------------------------------------------------------------
  // 1. Máquina de escribir rápida (Fast Typewriter) para títulos y copys clave
  // ---------------------------------------------------------------------------
  // Aparición suave por palabras: cada palabra se funde con un leve ascenso,
  // a un ritmo cercano al de lectura (sin cursor ni saltos por letra).
  const activeTypewriters = new Map();

  const restoreTypewriter = el => {
    const state = activeTypewriters.get(el);
    if (state) {
      if (state.timer) clearTimeout(state.timer);
      activeTypewriters.delete(el);
    }
    if (el && typeof el.__origHTML === 'string') {
      el.innerHTML = el.__origHTML;
    }
  };

  const runTypewriter = (el, durationMs = 520, delayMs = 0) => {
    if (!el || isMotionOff()) return;
    if (el.dataset.twDone === 'true') return;
    if (typeof el.__origHTML !== 'string') {
      el.__origHTML = el.innerHTML;
    }

    if (/^H[1-6]$/.test(el.tagName) && !el.hasAttribute('aria-label')) {
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    }

    const words = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const frag = document.createDocumentFragment();
      const parts = (node.nodeValue || '').split(/(\s+)/);
      parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.append(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'tw-word is-pending';
          span.textContent = part;
          frag.append(span);
          words.push(span);
        }
      });
      node.replaceWith(frag);
    });

    if (!words.length) {
      restoreTypewriter(el);
      return;
    }

    // Títulos a ritmo ágil (~44 ms) y copys a ~22 ms, sutil y elegante sin exagerar
    const isHeading = /^H[1-6]$/.test(el.tagName);
    const stagger = isHeading
      ? Math.min(46, 800 / words.length)
      : Math.min(22, 540 / words.length);
    const fade = isHeading ? 420 : 320;
    words.forEach((w, i) => {
      w.style.transitionDuration = fade + 'ms';
      w.style.transitionDelay = Math.round(delayMs + i * stagger) + 'ms';
    });

    const state = { timer: 0 };
    activeTypewriters.set(el, state);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (activeTypewriters.get(el) !== state) return;
      words.forEach(w => w.classList.remove('is-pending'));
      el.dataset.twDone = 'true';
    }));
  };
  // Observador de entrada para títulos y copys en las 5 pestañas
  const initScrollTypewriter = () => {
    const heroTargets = [
      document.querySelector('.hero h1'),
      document.querySelector('.case-hero h1')
    ].filter(Boolean);

    heroTargets.forEach(el => {
      runTypewriter(el, 520, 80);
    });

    if (!('IntersectionObserver' in window)) return;

    // Solo animar títulos principales para evitar parpadeos en párrafos de texto
    const scrollTargets = [
      ...document.querySelectorAll('.portfolio-v5__section-head h2'),
      ...document.querySelectorAll('.projects-v6__copy h3'),
      ...document.querySelectorAll('.portfolio-v5__profile h2'),
      ...document.querySelectorAll('.ai-method-card__head h3'),
      ...document.querySelectorAll('.editorial-card h3'),
      ...document.querySelectorAll('.contact h2'),
      ...document.querySelectorAll('.case-step h2'),
      ...document.querySelectorAll('#aporte h2'),
      ...document.querySelectorAll('.case-end h2')
    ].filter(el => !heroTargets.includes(el));

    const seen = new WeakSet();
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting || seen.has(entry.target)) return;
          seen.add(entry.target);
          io.unobserve(entry.target);
          runTypewriter(entry.target, 480, 20);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }
    );

    scrollTargets.forEach(el => io.observe(el));
  };

  initScrollTypewriter();

  // ---------------------------------------------------------------------------
  // 1B. Coreografía lateral de tarjetas + cascada de elementos internos + tilt
  // ---------------------------------------------------------------------------
  const initLateralCardReveal = () => {
    if (isMotionOff() || !('IntersectionObserver' in window)) return;
    const cardsToReveal = [
      ...document.querySelectorAll('[data-card-reveal]'),
      ...document.querySelectorAll('.portfolio-v5__profile-copy > p'),
      ...document.querySelectorAll('.ai-method-step')
    ];
    if (!cardsToReveal.length) return;

    const revealed = new WeakSet();
    let userHasScrolled = window.scrollY > 8;
    window.addEventListener('scroll', () => { userHasScrolled = true; }, { passive: true, once: true });

    const animateCardIn = (card, delayMs = 0) => {
      if (!card || isMotionOff() || typeof card.animate !== 'function') return;
      const dirAttr = card.getAttribute('data-card-reveal');
      const dir = dirAttr === 'right' ? 1 : dirAttr === 'left' ? -1 : 1;
      const isMobile = window.innerWidth <= 760;
      const offsetX = (isMobile ? 18 : 36) * dir;
      // Revelado unificado del bloque sin apagar hijos a cero para evitar parpadeos
      // Sin opacidad: sólo desplazamiento. Bajar la opacidad de un bloque
      // grande sobre fondo claro se lee como un destello de luz al entrar.
      card.animate(
        [
          { transform: `translate3d(${offsetX}px, 12px, 0)` },
          { transform: 'translate3d(0, 0, 0)' }
        ],
        {
          duration: 520,
          delay: delayMs,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        }
      );
    };

    const cardObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting || revealed.has(entry.target)) return;
          revealed.add(entry.target);
          cardObserver.unobserve(entry.target);
          if (userHasScrolled || entry.boundingClientRect.top > 100) {
            animateCardIn(entry.target, 0);
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.12 }
    );

    cardsToReveal.forEach((card, i) => {
      if (!card.hasAttribute('data-card-reveal')) {
        card.setAttribute('data-card-reveal', i % 2 === 0 ? 'left' : 'right');
      }
      if (!revealed.has(card)) cardObserver.observe(card);
    });
  };

  initLateralCardReveal();

  // ---------------------------------------------------------------------------
  // 1C. Escena Cinética Interactiva en el Fondo Derecho del Hero (Canvas + SVG)
  // ---------------------------------------------------------------------------
  const initHeroKineticCanvas = () => {
    const canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let rafId = 0;
    let pointerX = 0.65;
    let pointerY = 0.5;
    let targetX = 0.65;
    let targetY = 0.5;

    const particles = Array.from({ length: 28 }, (_, i) => ({
      angle: (i / 28) * Math.PI * 2,
      radius: 58 + (i % 5) * 38,
      speed: (i % 2 === 0 ? 1 : -1) * (0.0035 + (i % 4) * 0.0014),
      size: i % 4 === 0 ? 2.8 : 1.8,
      isMolten: i % 3 === 0
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const heroEl = canvas.closest('.hero');
    if (heroEl) {
      heroEl.addEventListener('pointermove', e => {
        const r = heroEl.getBoundingClientRect();
        targetX = clamp((e.clientX - r.left) / Math.max(1, r.width), 0.2, 0.95);
        targetY = clamp((e.clientY - r.top) / Math.max(1, r.height), 0.1, 0.9);
      }, { passive: true });
    }

    const drawFrame = t => {
      ctx.clearRect(0, 0, w, h);
      pointerX += (targetX - pointerX) * 0.06;
      pointerY += (targetY - pointerY) * 0.06;

      const cx = w * 0.58 + (pointerX - 0.65) * 42;
      const cy = h * 0.5 + (pointerY - 0.5) * 28;
      const time = t * 0.001;

      // 1. Halo metálico reactivo en el fondo derecho
      const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.min(w, h) * 0.52);
      halo.addColorStop(0, 'rgba(255, 90, 31, 0.18)');
      halo.addColorStop(0.42, 'rgba(215, 220, 232, 0.08)');
      halo.addColorStop(1, 'rgba(11, 12, 15, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // 2. Ondas armónicas metálicas (Fog Silver + Molten Orange)
      for (let waveIdx = 0; waveIdx < 3; waveIdx++) {
        ctx.beginPath();
        const isOrange = waveIdx === 0;
        ctx.strokeStyle = isOrange
          ? 'rgba(255, 90, 31, 0.36)'
          : waveIdx === 1
            ? 'rgba(228, 229, 232, 0.22)'
            : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isOrange ? 2 : 1.2;

        for (let x = 0; x <= w; x += 10) {
          const norm = x / Math.max(1, w);
          const yOffset =
            Math.sin(norm * 5.2 + time * (1.4 + waveIdx * 0.35) + waveIdx) * (24 + waveIdx * 11) +
            Math.cos(norm * 2.8 - time * 0.9) * 12;
          const y = cy + yOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 3. Partículas orbitales de telemetría
      particles.forEach(p => {
        if (!isMotionOff()) p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * p.radius * 1.18;
        const py = cy + Math.sin(p.angle) * p.radius * 0.84;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.isMolten ? '#FF5A1F' : '#E4E5E8';
        ctx.fill();

        if (p.isMolten) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 90, 31, 0.18)';
          ctx.fill();
        }
      });

      if (!isMotionOff()) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(0);
    document.addEventListener('aos:motion-change', () => {
      cancelAnimationFrame(rafId);
      if (!isMotionOff()) rafId = requestAnimationFrame(drawFrame);
    });
  };

  initHeroKineticCanvas();

  // ---------------------------------------------------------------------------
  // 1D. Modo protagonista al reproducir el video de presentación (#perfil)
  // ---------------------------------------------------------------------------
  const initProfileFilmCinema = () => {
    const profileSection = document.querySelector('.portfolio-v5__profile');
    const slot = document.querySelector('[data-profile-film-slot]');
    const frameEl = document.querySelector('[data-profile-film-frame]');
    const backdrop = document.querySelector('[data-profile-film-backdrop]');
    const closeBtn = document.querySelector('[data-profile-film-close]');
    const hitBtn = document.querySelector('[data-profile-film-hit]');
    const video = frameEl?.querySelector('.profile-film__video');
    if (!profileSection || !slot || !frameEl || !backdrop || !video) return;

    let isCinema = false;
    let activeAnim = null;
    let backdropAnim = null;
    let finishTimer = 0;

    const clearPending = () => {
      if (finishTimer) {
        clearTimeout(finishTimer);
        finishTimer = 0;
      }
      if (activeAnim) {
        activeAnim.cancel();
        activeAnim = null;
      }
      if (backdropAnim) {
        backdropAnim.cancel();
        backdropAnim = null;
      }
    };

    const finishCloseState = restoreFocus => {
      clearPending();
      backdrop.hidden = true;
      profileSection.classList.remove('is-film-focus');
      slot.style.removeProperty('min-height');
      frameEl.removeAttribute('role');
      frameEl.removeAttribute('aria-modal');
      frameEl.removeAttribute('aria-label');
      if (hitBtn) hitBtn.hidden = false;
      if (restoreFocus) {
        (hitBtn || video).focus({ preventScroll: true });
      }
    };

    const openCinema = () => {
      if (document.fullscreenElement === video) return;
      clearPending();
      if (hitBtn) hitBtn.hidden = true;
      if (isCinema) {
        backdrop.hidden = false;
        return;
      }

      const first = frameEl.getBoundingClientRect();
      slot.style.minHeight = `${Math.round(first.height)}px`;

      isCinema = true;
      profileSection.classList.add('is-film-focus');
      backdrop.hidden = false;
      if (closeBtn) closeBtn.hidden = false;
      frameEl.classList.add('is-cinema');
      frameEl.setAttribute('role', 'dialog');
      frameEl.setAttribute('aria-modal', 'true');
      frameEl.setAttribute('aria-label', 'Video de presentación de Carlos Vargas ampliado');
      trackEvent('video_profile_play_focus', { source: 'profile_film' });

      if (isMotionOff() || typeof frameEl.animate !== 'function') return;

      const last = frameEl.getBoundingClientRect();
      const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
      const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
      const scale = first.width / Math.max(1, last.width);

      backdropAnim = backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 240, easing: 'ease-out' }
      );
      activeAnim = frameEl.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})` },
          { transform: 'translate3d(0, 0, 0) scale(1)' }
        ],
        { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    };

    const closeCinema = ({ pauseVideo = true, restoreFocus = false } = {}) => {
      if (!isCinema) return;
      clearPending();

      const first = frameEl.getBoundingClientRect();
      if (pauseVideo && !video.paused && !video.ended) {
        video.pause();
      }

      isCinema = false;
      frameEl.classList.remove('is-cinema');
      if (closeBtn) closeBtn.hidden = true;

      if (isMotionOff() || typeof frameEl.animate !== 'function') {
        finishCloseState(restoreFocus);
        return;
      }

      const last = frameEl.getBoundingClientRect();
      const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
      const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
      const scale = first.width / Math.max(1, last.width);

      backdropAnim = backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 240, easing: 'ease-in', fill: 'forwards' }
      );
      activeAnim = frameEl.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})` },
          { transform: 'translate3d(0, 0, 0) scale(1)' }
        ],
        { duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        finishCloseState(restoreFocus);
      };
      activeAnim.addEventListener?.('finish', done, { once: true });
      finishTimer = window.setTimeout(done, 380);
    };

    hitBtn?.addEventListener('click', () => {
      if (hitBtn) hitBtn.hidden = true;
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { if (!isCinema && hitBtn) hitBtn.hidden = false; });
      }
    });
    video.addEventListener('play', openCinema);
    video.addEventListener('ended', () => closeCinema({ pauseVideo: false, restoreFocus: false }));
    closeBtn?.addEventListener('click', () => closeCinema({ pauseVideo: true, restoreFocus: true }));
    backdrop.addEventListener('click', () => closeCinema({ pauseVideo: true, restoreFocus: true }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isCinema) {
        event.preventDefault();
        closeCinema({ pauseVideo: true, restoreFocus: true });
      }
    });
    document.addEventListener('fullscreenchange', () => {
      if (!isCinema) return;
      backdrop.hidden = document.fullscreenElement === video;
    });
  };

  initProfileFilmCinema();

  // ---------------------------------------------------------------------------
  // 2. Páginas de Proyectos: Camino Guiado + Consola de Flujo HD ([data-case-journey])
  // ---------------------------------------------------------------------------
  const journey = document.querySelector('[data-case-journey]');
  if (journey) {
    const steps = [...journey.querySelectorAll('[data-case-step]')];
    const tabs = [...journey.querySelectorAll('[data-case-tab]')];
    const panes = [...journey.querySelectorAll('[data-case-panel], [data-case-pane]')];
    const status = journey.querySelector('[data-case-status]');
    let activeStep = -1;
    let manualCaseLockUntil = 0;

    const syncCaseVideos = (index, delayMs = 0) => {
      const isDesktopStage = window.innerWidth > 960;
      journey.querySelectorAll('video').forEach(v => v.pause());
      if (isMotionOff()) return;
      const playActive = () => {
        if (isMotionOff()) return;
        const container = isDesktopStage ? panes[index] : steps[index]?.querySelector('.case-step__inline-media');
        const vid = container?.querySelector('video');
        if (vid) vid.play().catch(() => {});
      };
      if (delayMs > 0) {
        const startLater = () => window.setTimeout(playActive, delayMs);
        if (document.readyState === 'complete') startLater();
        else window.addEventListener('load', startLater, { once: true });
      } else {
        playActive();
      }
    };

    const activateCaseStep = (index, animateCopy = false) => {
      if (index === activeStep) return;
      activeStep = index;
      const totalStr = String(steps.length).padStart(2, '0');
      const currStr = String(index + 1).padStart(2, '0');
      if (status) status.textContent = `PASO ${currStr} / ${totalStr}`;

      steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      panes.forEach((pane, i) => {
        const active = i === index;
        pane.classList.toggle('is-active', active);
        pane.hidden = !active;
        if (active) {
          pane.removeAttribute('hidden');
          pane.removeAttribute('aria-hidden');
        } else {
          pane.setAttribute('hidden', '');
          pane.setAttribute('aria-hidden', 'true');
        }
      });
      syncCaseVideos(index, animateCopy ? 0 : 800);

      if (animateCopy && !isMotionOff()) {
        const titleEl = steps[index]?.querySelector('h2');
        if (titleEl && !titleEl.dataset.twDone) runTypewriter(titleEl, 480, 0);
        // Sin opacidad: el panel se desliza, no se apaga (evita el velo al cambiar de caso).
        panes[index]?.animate?.(
          [
            { transform: 'translate3d(14px, 0, 0)' },
            { transform: 'translate3d(0, 0, 0)' }
          ],
          { duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
      }
    };

    activateCaseStep(0, false);

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        manualCaseLockUntil = performance.now() + 700;
        activateCaseStep(i, true);
        trackEvent('case_step_select', { step: i + 1, page: location.pathname });
        steps[i]?.scrollIntoView({ behavior: isMotionOff() ? 'auto' : 'smooth', block: 'center' });
      });
      tab.addEventListener('keydown', event => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const next = (i + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        tabs[next]?.focus();
        tabs[next]?.click();
      });
    });

    steps.forEach((step, i) => {
      step.addEventListener('click', event => {
        if (event.target.closest('a, button, video')) return;
        activateCaseStep(i, true);
      });
    });

    if ('IntersectionObserver' in window) {
      const stepObserver = new IntersectionObserver(
        entries => {
          if (performance.now() < manualCaseLockUntil) return;
          const visible = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible[0]) {
            const idx = Number(visible[0].target.dataset.caseStep);
            if (!Number.isNaN(idx)) activateCaseStep(idx, true);
          }
        },
        { rootMargin: '-20% 0px -32% 0px', threshold: [0.15, 0.4, 0.7] }
      );
      steps.forEach(step => stepObserver.observe(step));
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const editorialCard = link.closest('[data-editorial-card]');
    if (editorialCard) {
      trackEvent('select_editorial_idea', {
        idea_id: editorialCard.getAttribute('data-editorial-card') || '',
        href
      });
    } else if (href.includes('Carlos_Vargas_CV')) {
      trackEvent('click_cv', { href });
    } else if (href.startsWith('mailto:')) {
      trackEvent('click_contact', { href });
    } else if (href.includes('linkedin.com')) {
      trackEvent('click_linkedin', { href });
    } else if (href.includes('proyectos/')) {
      trackEvent('select_project', { href });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Portada: Consola Interactiva Conectada (#enfoque) + Vitrina de Proyectos
  // ---------------------------------------------------------------------------
  const section = document.querySelector('.method-v6');
  if (!section) return;
  const track = section.querySelector('[data-method-track]');
  const sticky = section.querySelector('[data-method-sticky]');
  const ring = section.querySelector('.method-ring');
  const arc = section.querySelector('.method-ring__arc');
  const spoke = section.querySelector('[data-ring-spoke]');
  const orbit = section.querySelector('.method-ring__focus-orbit');
  const number = section.querySelector('[data-ring-number]');
  const name = section.querySelector('[data-ring-name]');
  const bridgeLabel = section.querySelector('[data-bridge-label]');
  const diagrams = [...section.querySelectorAll('[data-core-visual]')];
  const panels = [...section.querySelectorAll('[data-method-panel]')];
  const nodes = [...section.querySelectorAll('[data-method-node]')];
  const projectStack = document.querySelector('[data-project-stack]');
  const cards = projectStack ? [...projectStack.querySelectorAll('[data-project-card]')] : [];
  const stackReady = () => false;
  const scrollLockReady = () => window.innerHeight >= 500 && !isMotionOff();
  let enhanced = false;
  let scrollLocked = false;
  let stacked = false;
  let active = -1;
  let frame = 0;
  let manualLockUntil = 0;

  const totalSteps = Math.max(1, panels.length);
  const stepAngle = 360 / totalSteps;

  const syncWheelGeometry = index => {
    const angle = index * stepAngle;
    const arcFill = index === 0 ? Math.round((100 / totalSteps) * 0.45) : (index / totalSteps) * 100;
    if (ring) ring.style.setProperty('--spoke-angle', `${angle}deg`);
    if (spoke) spoke.style.setProperty('--spoke-angle', `${angle}deg`);
    if (orbit) orbit.style.transform = `rotate(${angle}deg)`;
    if (arc) arc.style.strokeDashoffset = String((100 - arcFill).toFixed(2));
  };

  const panelState = index => {
    panels.forEach((panel, i) => {
      const current = i === index;
      panel.classList.toggle('is-active', current);
      if (enhanced && current) {
        panel.removeAttribute('aria-hidden');
        panel.inert = false;
      } else if (enhanced) {
        panel.setAttribute('aria-hidden', 'true');
        panel.inert = true;
      } else {
        panel.removeAttribute('aria-hidden');
        panel.inert = false;
      }
    });
    nodes.forEach((node, i) => {
      if (i === index) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
      if (i < index) node.dataset.passed = 'true';
      else delete node.dataset.passed;
    });
    diagrams.forEach((diag, i) => {
      diag.classList.toggle('is-active', i === index);
    });
  };

  const stageState = (index, animateTransition = false) => {
    const changed = index !== active;
    active = index;
    panelState(index);
    syncWheelGeometry(index);
    const stepStr = String(index + 1).padStart(2, '0');
    if (number) number.textContent = stepStr;
    if (name) name.textContent = nodes[index]?.querySelector('.method-ring__node-name')?.textContent || panels[index]?.querySelector('h3')?.textContent.toLocaleUpperCase('es');
    if (bridgeLabel) bridgeLabel.textContent = `MOMENTO ${stepStr}`;
    ring?.setAttribute('aria-label', `Cómo trabajo en ${totalSteps} momentos: investigar, priorizar, diseñar y activar, y medir y aprender`);
    if (changed && animateTransition && !isMotionOff()) {
      const activePanel = panels[index];
      const titleEl = activePanel?.querySelector('h3');
      if (titleEl && !titleEl.dataset.twDone) runTypewriter(titleEl, 440, 0);
      // Sin opacidad: igual que el resto, el panel entra deslizándose sin destello.
      activePanel?.animate?.(
        [
          { transform: 'translate3d(10px, 0, 0)' },
          { transform: 'translate3d(0, 0, 0)' }
        ],
        { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      diagrams[index]?.animate?.(
        [
          { transform: 'scale(0.95)' },
          { transform: 'scale(1)' }
        ],
        { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    }
  };

  const renderMethod = () => {
    frame = 0;
    if (!track || !sticky || !enhanced) return;
    if (!scrollLocked) {
      if (active < 0) stageState(0, false);
      return;
    }
    if (performance.now() < manualLockUntil) return;
    const rect = track.getBoundingClientRect();
    const isMobile = window.innerWidth <= 760;
    const entryOffset = isMobile ? 140 : 0;
    const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
    const effectiveTravel = Math.max(1, travel - entryOffset);
    const trackTop = window.scrollY + rect.top;
    const currentY = window.scrollY - trackTop;
    const progress = clamp((currentY - entryOffset) / effectiveTravel, 0, 1);
    const index = Math.min(totalSteps - 1, Math.floor(progress * totalSteps));
    stageState(index, active >= 0);
  };

  const queueRender = () => {
    if (!frame) frame = window.requestAnimationFrame(renderMethod);
  };

  const setEnhanced = (nextEnhanced, nextScrollLocked) => {
    enhanced = nextEnhanced;
    scrollLocked = nextScrollLocked;
    section.classList.toggle('is-enhanced', enhanced);
    section.classList.toggle('is-scroll-locked', enhanced && scrollLocked);
    if (active < 0) stageState(0, false);
    queueRender();
  };

  const setStacked = next => {
    if (!projectStack || stacked === next) return;
    stacked = next;
    const slots = [...projectStack.querySelectorAll('.projects-v6__slot')];
    cards.forEach((card, i) => {
      const slot = slots[i];
      if (!slot) return;
      if (stacked) {
        projectStack.insertBefore(card, slot);
        slot.setAttribute('aria-hidden', 'true');
        slot.style.height = '0px';
        slot.style.minHeight = '0px';
        card.style.setProperty('--stack-scale', String(1 - (cards.length - 1 - i) * .03));
        card.style.setProperty('--stack-top', `calc(var(--header-h) + 24px + ${i * 28}px)`);
      } else {
        slot.append(card);
        slot.removeAttribute('aria-hidden');
        slot.style.removeProperty('height');
        slot.style.removeProperty('min-height');
        card.style.removeProperty('--stack-scale');
        card.style.removeProperty('--stack-top');
        card.style.removeProperty('position');
      }
    });
    projectStack.classList.toggle('is-stacked', stacked);
  };

  nodes.forEach((node, i) => {
    node.setAttribute('aria-controls', panels[i]?.id || '');
    node.addEventListener('click', () => {
      stageState(i, true);
      trackEvent('method_step_select', { step: i + 1 });
      if (!scrollLocked || !track || !sticky) return;
      const isMobile = window.innerWidth <= 760;
      const entryOffset = isMobile ? 140 : 0;
      const trackTop = window.scrollY + track.getBoundingClientRect().top;
      const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
      const effectiveTravel = Math.max(1, travel - entryOffset);
      const target = trackTop + entryOffset + effectiveTravel * ((i + 0.5) / totalSteps);
      manualLockUntil = performance.now() + 650;
      window.scrollTo({ top: target, behavior: isMotionOff() ? 'auto' : 'smooth' });
    });
    node.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : nodes.length - 1;
      const next = (i + delta) % nodes.length;
      nodes[next]?.focus();
      stageState(next, true);
      trackEvent('method_step_select', { step: next + 1, source: 'keyboard' });
    });
  });

  const updateLayout = () => {
    setEnhanced(true, scrollLockReady());
    setStacked(stackReady());
    queueRender();
  };

  window.addEventListener('scroll', queueRender, { passive: true });
  window.addEventListener('resize', updateLayout, { passive: true });
  reducedMotion.addEventListener?.('change', updateLayout);
  updateLayout();
  if (document.fonts?.ready) document.fonts.ready.then(updateLayout);
  if (projectStack) {
    projectStack.addEventListener('focusin', event => {
      const current = event.target.closest('.projects-v6__link');
      if (!current || !stacked) return;
      cards.forEach(card => card.querySelector('.projects-v6__link')?.classList.toggle('is-occluded', card !== current.closest('.projects-v6__card')));
    });
    projectStack.addEventListener('focusout', event => {
      if (!projectStack.contains(event.relatedTarget)) cards.forEach(card => card.querySelector('.projects-v6__link')?.classList.remove('is-occluded'));
    });
  }
})();
