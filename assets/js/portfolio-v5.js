(() => {
  'use strict';
  const root = document.documentElement;
  const section = document.querySelector('.method-v6');
  if (!section) return;
  const track = section.querySelector('[data-method-track]');
  const sticky = section.querySelector('[data-method-sticky]');
  const ring = section.querySelector('.method-ring');
  const arc = section.querySelector('.method-ring__arc');
  const orbit = section.querySelector('.method-ring__focus-orbit');
  const number = section.querySelector('[data-ring-number]');
  const name = section.querySelector('[data-ring-name]');
  const panels = [...section.querySelectorAll('[data-method-panel]')];
  const nodes = [...section.querySelectorAll('[data-method-node]')];
  const projectStack = document.querySelector('[data-project-stack]');
  const cards = projectStack ? [...projectStack.querySelectorAll('[data-project-card]')] : [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const stackReady = () => window.innerWidth >= 1024 && window.innerHeight >= 700;
  let enhanced = false;
  let stacked = false;
  let active = -1;
  let frame = 0;

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
      if (enhanced && i === index) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
      if (i < index && enhanced) node.dataset.passed = 'true';
      else delete node.dataset.passed;
    });
    if (!enhanced) nodes[0]?.setAttribute('aria-current', 'step');
  };

  const stageState = index => {
    if (index === active) return;
    active = index;
    panelState(index);
    if (number) number.textContent = String(index + 1).padStart(2, '0');
    if (name) name.textContent = nodes[index]?.querySelector('.method-ring__node-name')?.textContent || panels[index]?.querySelector('h3')?.textContent.toLocaleUpperCase('es');
    ring?.setAttribute('aria-label', 'Método en seis etapas: escuchar, analizar, priorizar, diseñar, comunicar, y medir y evaluar');
  };

  const renderMethod = () => {
    frame = 0;
    if (!track || !sticky || !enhanced) return;
    const rect = track.getBoundingClientRect();
    const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
    const trackTop = window.scrollY + rect.top;
    const progress = clamp((window.scrollY - trackTop) / travel, 0, 1);
    const index = Math.min(5, Math.floor(progress * 6));
    stageState(index);
    let fraction = index / 6;
    if (progress >= .96) fraction = 1;
    if (arc) arc.style.strokeDashoffset = String(100 - fraction * 100);
    if (orbit) orbit.style.transform = `rotate(${(fraction * 360).toFixed(3)}deg)`;
  };

  const queueRender = () => {
    if (!frame) frame = window.requestAnimationFrame(renderMethod);
  };

  const setEnhanced = next => {
    if (enhanced === next) return;
    enhanced = next;
    section.classList.toggle('is-enhanced', enhanced);
    if (!enhanced) {
      active = -1;
      panelState(0);
      if (number) number.textContent = '01';
      if (name) name.textContent = nodes[0]?.querySelector('.method-ring__node-name')?.textContent || 'ESCUCHAR';
      if (arc) arc.style.strokeDashoffset = '100';
      if (orbit) orbit.style.transform = 'rotate(0deg)';
    }
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
      if (!enhanced || !track || !sticky) return;
      const trackTop = window.scrollY + track.getBoundingClientRect().top;
      const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
      const target = trackTop + travel * ((i + .5) / 6);
      window.scrollTo({ top: target, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  });

  const updateLayout = () => {
    setEnhanced(window.innerHeight >= 560);
    setStacked(stackReady());
    queueRender();
  };

  window.addEventListener('scroll', queueRender, { passive: true });
  window.addEventListener('resize', updateLayout, { passive: true });
  reducedMotion.addEventListener?.('change', queueRender);
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
