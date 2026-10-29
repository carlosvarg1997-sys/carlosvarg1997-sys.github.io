(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const trackEvent = (eventName, params = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
  };
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

  const runTypewriter = (el, durationMs = 580, delayMs = 0) => {
    if (!el || isMotionOff()) return;
    if (typeof el.__origHTML !== 'string') {
      el.__origHTML = el.innerHTML;
    }
    restoreTypewriter(el);

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

    // Títulos a ~115 ms; textos largos a ~52 ms (ritmo ágil y directo sin demorar la lectura).
    const isHeading = /^H[1-6]$/.test(el.tagName);
    const stagger = isHeading
      ? Math.min(115, 2200 / words.length)
      : Math.min(52, 1200 / words.length);
    const fade = isHeading ? 620 : 400;
    words.forEach((w, i) => {
      w.style.transitionDuration = fade + 'ms';
      w.style.transitionDelay = Math.round(delayMs + i * stagger) + 'ms';
    });

    const state = { timer: 0 };
    activeTypewriters.set(el, state);

    // Dos frames para que el estado inicial se pinte y la transición sí ocurra.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (activeTypewriters.get(el) !== state) return;
      words.forEach(w => w.classList.remove('is-pending'));
    }));

    state.timer = setTimeout(() => restoreTypewriter(el),
      Math.round(delayMs + words.length * stagger + fade + 120));
  };
  // Observador de entrada para títulos y copys en las 5 pestañas
  const initScrollTypewriter = () => {
    const heroTargets = [
      document.querySelector('.hero h1'),
      document.querySelector('.hero__content > p:not(.eyebrow):not(.hero__cred)'),
      document.querySelector('.case-hero h1'),
      document.querySelector('.case-hero__lead')
    ].filter(Boolean);

    heroTargets.forEach(el => {
      const isHeading = /^H[1-6]$/.test(el.tagName);
      runTypewriter(el, isHeading ? 520 : 420, isHeading ? 80 : 100);
    });

    if (!('IntersectionObserver' in window)) return;

    const scrollTargets = [
      ...document.querySelectorAll('.portfolio-v5__section-head h2'),
      ...document.querySelectorAll('.portfolio-v5__section-head > p:last-child'),
      ...document.querySelectorAll('.projects-v6__copy h3'),
      ...document.querySelectorAll('.projects-v6__description'),
      ...document.querySelectorAll('.portfolio-v5__profile h2'),
      ...document.querySelectorAll('.portfolio-v5__tool-groups h3'),
      ...document.querySelectorAll('.contact h2'),
      ...document.querySelectorAll('.contact > p:not(.eyebrow)'),
      ...document.querySelectorAll('.case-step h2'),
      ...document.querySelectorAll('#aporte h2'),
      ...document.querySelectorAll('#aporte p'),
      ...document.querySelectorAll('.case-end h2')
    ].filter(el => !heroTargets.includes(el));

    const seen = new WeakSet();
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting || seen.has(entry.target)) return;
          seen.add(entry.target);
          io.unobserve(entry.target);
          const isHeading = /^H[1-6]$/.test(entry.target.tagName);
          runTypewriter(entry.target, isHeading ? 500 : 420, isHeading ? 20 : 60);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.18 }
    );

    scrollTargets.forEach(el => io.observe(el));
  };

  initScrollTypewriter();

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
        const copyEl = steps[index]?.querySelector('p[data-typewriter="copy"]');
        if (titleEl) runTypewriter(titleEl, 540, 0);
        if (copyEl) runTypewriter(copyEl, 420, 60);
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
    if (href.includes('Carlos_Vargas_CV.pdf')) trackEvent('click_cv', { href });
    else if (href.startsWith('mailto:')) trackEvent('click_contact', { href });
    else if (href.includes('linkedin.com')) trackEvent('click_linkedin', { href });
    else if (href.includes('proyectos/')) trackEvent('select_project', { href });
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
  const stackReady = () => window.innerWidth >= 1024 && window.innerHeight >= 700;
  const scrollLockReady = () => window.innerHeight >= 500 && !isMotionOff();
  let enhanced = false;
  let scrollLocked = false;
  let stacked = false;
  let active = -1;
  let frame = 0;
  let manualLockUntil = 0;

  const syncWheelGeometry = index => {
    const angle = index * 60;
    const arcFill = index === 0 ? 8 : (index / 6) * 100;
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
    if (bridgeLabel) bridgeLabel.textContent = `ETAPA ${stepStr}`;
    ring?.setAttribute('aria-label', 'Método en seis etapas: escuchar, analizar, priorizar, diseñar, comunicar, y medir y evaluar');
    if (changed && animateTransition && !isMotionOff()) {
      const activePanel = panels[index];
      const titleEl = activePanel?.querySelector('h3');
      const leadEl = activePanel?.querySelector('.method-v6__lead');
      if (titleEl) runTypewriter(titleEl, 500, 0);
      if (leadEl) runTypewriter(leadEl, 420, 60);
      diagrams[index]?.animate?.(
        [
          { transform: 'scale(0.84)' },
          { transform: 'scale(1)' }
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
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
    const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
    const trackTop = window.scrollY + rect.top;
    const progress = clamp((window.scrollY - trackTop) / travel, 0, 1);
    const index = Math.min(5, Math.floor(progress * 6));
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
      const trackTop = window.scrollY + track.getBoundingClientRect().top;
      const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
      const target = trackTop + travel * ((i + 0.5) / 6);
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
