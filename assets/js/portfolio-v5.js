(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const stages = [...document.querySelectorAll('.portfolio-v5__stage')];
  const cards = [...document.querySelectorAll('[data-stack-card]')];
  const flywheel = document.querySelector('[data-flywheel]');
  const flywheelProgress = flywheel?.querySelector('.flywheel__progress');
  const mounts = [...document.querySelectorAll('[data-flywheel-mount]')];
  const paused = () => document.body.classList.contains('motion-paused') || root.classList.contains('motion-paused');
  let activeStage = -1;
  let raf = 0;

  const arrangeStack = () => {
    const stack = cards[0]?.closest('[data-project-stack]');
    if (!stack || !cards.length) return;
    const slots = [...stack.querySelectorAll('.portfolio-v5__slot')];
    const baseStep = window.innerHeight * .85;
    const minimumDwell = window.innerHeight * .15;
    let cursor = 0;
    cards.forEach((card, i) => {
      const slot = slots[i];
      if (slot && card.parentElement !== stack) stack.insertBefore(card, slot);
      const height = card.offsetHeight;
      const spacer = slot || card.nextElementSibling;
      const stickyTop = parseFloat(getComputedStyle(card).top) || 0;
      const track = Math.max(baseStep, height * 2 + minimumDwell);
      const gap = i === cards.length - 1 ? track - height + stickyTop : track - height;
      if (spacer?.classList.contains('portfolio-v5__slot')) {
        spacer.style.height = `${gap}px`;
        spacer.style.minHeight = '0';
        spacer.setAttribute('aria-hidden', 'true');
      }
      card.dataset.stackStart = String(cursor);
      card.dataset.stackTrack = String(track);
      cursor += track;
    });
    stack.dataset.stackStep = String(baseStep);
  };

  const setActiveStage = index => {
    if (index === activeStage || index < 0) return;
    activeStage = index;
    stages.forEach((stage, i) => stage.classList.toggle('is-active', i === index));
    if (flywheel && mounts[index] && flywheel.parentElement !== mounts[index]) mounts[index].append(flywheel);
  };

  const setVisual = (stage, progress) => {
    const p = reduced.matches ? 1 : progress;
    const visual = stage.querySelector('[data-visual]');
    if (!visual) return;
    const type = visual.dataset.visual;
    if (type === 'escuchar') {
      visual.querySelectorAll('.listen-wave').forEach((wave, i) => {
        const local = clamp((p - i * .12) / .72);
        wave.style.transform = `scale(${(.2 + local * .8).toFixed(3)})`;
        wave.style.opacity = (.18 + local * .62).toFixed(3);
      });
    }
    if (type === 'analizar') {
      visual.querySelectorAll('.analysis-dot').forEach(dot => {
        const start = dot.dataset.start.split(',').map(Number);
        const end = dot.dataset.end.split(',').map(Number);
        const eased = 1 - Math.pow(1 - p, 2);
        const x = start[0] + (end[0] - start[0]) * eased;
        const y = start[1] + (end[1] - start[1]) * eased;
        dot.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
    }
    if (type === 'priorizar') {
      visual.querySelectorAll('.priority-card').forEach(card => {
        const start = card.dataset.start.split(',').map(Number);
        const end = card.dataset.end.split(',').map(Number);
        const eased = 1 - Math.pow(1 - p, 2);
        const x = start[0] + (end[0] - start[0]) * eased;
        const y = start[1] + (end[1] - start[1]) * eased;
        card.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
      const arrow = visual.querySelector('.priority-arrow');
      if (arrow) arrow.style.strokeDashoffset = String(260 * (1 - p));
      const dot = visual.querySelector('.priority-dot');
      if (dot) { dot.style.transform = `translateY(${(-38 * p).toFixed(1)}px)`; dot.style.transformBox = 'fill-box'; }
    }
    if (type === 'diseñar') {
      visual.querySelectorAll('.wireframe-draw').forEach(path => {
        path.style.strokeDashoffset = String(3000 * (1 - p));
      });
      visual.querySelectorAll('.wireframe-fill').forEach(fill => { fill.style.opacity = String(p); });
    }
    if (type === 'evaluar') {
      const trend = visual.querySelector('.eval-trend');
      if (trend) trend.style.strokeDashoffset = String(600 * (1 - p));
      const check = visual.querySelector('.eval-check');
      if (check) check.style.strokeDashoffset = String(200 * (1 - p));
      const after = visual.querySelector('.eval-after');
      if (after) { after.style.transform = `translateY(${(70 * (1 - p)).toFixed(1)}px)`; after.style.transformBox = 'fill-box'; }
    }
  };

  const updateCaseLinks = () => {
    cards.forEach((card, i) => {
      const link = card.querySelector('.portfolio-v5__case-link');
      if (!link) return;
      const target = link.getBoundingClientRect();
      const covered = cards.slice(i + 1).some(upperCard => {
        const upper = upperCard.getBoundingClientRect();
        return upper.left < target.right - 1
          && upper.right > target.left + 1
          && upper.top < target.bottom - 1
          && upper.bottom > target.top + 1;
      });
      link.classList.toggle('is-occluded', covered);
      link.toggleAttribute('inert', covered);
      link.inert = covered;
    });
  };

  const update = () => {
    raf = 0;
    const h = window.innerHeight;
    let closestIndex = -1;
    let closestDistance = Infinity;
    stages.forEach((stage, i) => {
      const rect = stage.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - h * .5);
      if (rect.bottom > h * .12 && rect.top < h * .88 && distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
      const sheet = stage.querySelector('.portfolio-v5__sheet');
      const stickyTop = sheet ? parseFloat(getComputedStyle(sheet).top) || 0 : 0;
      const stickySpan = sheet ? Math.max(rect.height - sheet.getBoundingClientRect().height, 1) : rect.height;
      const progress = clamp((stickyTop - rect.top) / stickySpan);
      setVisual(stage, paused() ? 1 : progress);
    });
    if (closestIndex >= 0) setActiveStage(closestIndex);
    if (flywheelProgress) {
      const list = document.querySelector('.portfolio-v5__stages');
      const listTop = list ? list.getBoundingClientRect().top : h;
      const progress = reduced.matches ? 1 : list ? clamp((h * .55 - listTop) / Math.max(list.getBoundingClientRect().height, 1)) : 0;
      flywheelProgress.style.strokeDashoffset = String(100 * (1 - progress));
    }

    if (cards.length) {
      const stack = cards[0].closest('[data-project-stack]');
      const trackTop = stack.getBoundingClientRect().top + window.scrollY;
      const lastStart = Number(cards[cards.length - 1].dataset.stackStart) || 0;
      cards.forEach((card, i) => {
        const start = Number(card.dataset.stackStart) || 0;
        const remaining = lastStart - start;
        const remainingCards = cards.length - 1 - i;
        const progress = reduced.matches ? 0 : paused() ? 1 : remaining <= 0 ? 0 : clamp((window.scrollY - trackTop - start) / remaining);
        const scale = 1 - remainingCards * .03 * progress;
        card.style.setProperty('--stack-scale', scale.toFixed(3));
      });
      updateCaseLinks();
    }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { arrangeStack(); schedule(); }, { passive: true });
  reduced.addEventListener?.('change', schedule);
  document.querySelector('[data-motion-toggle]')?.addEventListener('click', () => requestAnimationFrame(schedule));
  new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  arrangeStack();
  document.fonts?.ready.then(() => { arrangeStack(); schedule(); });
  update();
})();
