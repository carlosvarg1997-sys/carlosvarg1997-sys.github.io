/* Carlos Vargas — v4 sobre la v2: movimiento al leer.
   Se suma al reveal tipográfico de v2-home.js sin pisarlo. Con movimiento
   reducido o sin JS, el contenido queda visible y quieto. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const paused = () => document.body.classList.contains('motion-paused') || root.classList.contains('motion-paused');
  if (!reduce.matches) root.classList.add('v4-motion');

  // Progreso de lectura.
  const bar = document.createElement('div');
  bar.className = 'v4-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);

  // Embudo AARRR: la etapa activa sigue al lector y el flywheel avanza con él.
  const funnel = document.querySelector('.funnel');
  const stages = funnel ? [...funnel.querySelectorAll('.funnel-stage')] : [];
  const nodes = funnel ? [...funnel.querySelectorAll('.flywheel__node')] : [];
  const label = funnel?.querySelector('[data-flywheel-label]');
  const list = funnel?.querySelector('.funnel__stages');
  let active = -1;
  const setStage = index => {
    if (index === active) return;
    active = index;
    stages.forEach((stage, i) => stage.classList.toggle('is-active', i === index));
    nodes.forEach((node, i) => node.classList.toggle('is-active', i === index));
    if (label && stages[index]) label.textContent = stages[index].dataset.stageName;
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--v4-scroll', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');
    if (list && stages.length) {
      const box = list.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (innerHeight * .55 - box.top) / Math.max(1, box.height)));
      funnel.style.setProperty('--v4-funnel', progress.toFixed(4));
      setStage(Math.min(stages.length - 1, Math.floor(progress * stages.length)));
    }
  };
  // rAF para el cuadro siguiente; el temporizador cubre navegadores que pausan rAF.
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { if (ticking) update(); });
    setTimeout(() => { if (ticking) update(); }, 120);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();

  if (reduce.matches || !('IntersectionObserver' in window)) return;

  // Imágenes y videos que se descubren al entrar.
  const media = [...document.querySelectorAll([
    '.project-card__media img', '.evidence-item img', '.proof img', '.proof video',
    '.hero-media video', '.panel-story__frame video', '.c-media img'
  ].join(','))];
  const marks = [];
  media.forEach(item => item.classList.add('v4-media'));
  marks.forEach(item => item.classList.add('v4-mark'));

  const mediaObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      mediaObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -14% 0px', threshold: .12 });
  [...media, ...marks].forEach(item => mediaObserver.observe(item));

  // 1. Tarjetas que entran en cascada. La clase .v4-cascade solo se agrega
  //    aquí: sin JS, el contenido nunca queda oculto.
  const cardGroups = [
    ['.project-grid', '.project-card'],
    ['.tools__grid', '.tool-card'],
    ['.skills__list', ':scope > a'],
    ['.proof-list', '.proof']
  ];
  const cards = [];
  cardGroups.forEach(([containerSelector, itemSelector]) => {
    document.querySelectorAll(containerSelector).forEach(container => {
      [...container.querySelectorAll(itemSelector)].forEach(card => {
        if (card.parentElement !== container) return;
        card.classList.add('v4-cascade-item');
        cards.push(card);
      });
    });
  });

  // La galería de evidencias se desplaza en horizontal: sus tarjetas se
  // revelan juntas cuando la galería entra en pantalla, no cuando cada una
  // cruza el viewport (las que quedan a la derecha nunca lo harían).
  const gallery = document.querySelector('.evidence__track');
  const galleryCards = gallery ? [...gallery.querySelectorAll(':scope > .evidence-item')] : [];
  galleryCards.forEach(card => card.classList.add('v4-cascade-item'));

  let cascadeFired = false;
  let fallbackTimer = 0;
  const stopFallback = () => {
    if (!fallbackTimer) return;
    clearTimeout(fallbackTimer);
    fallbackTimer = 0;
  };
  const cascadeObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting);
    if (!visible.length) return;
    cascadeFired = true;
    stopFallback();
    visible.sort((a, b) =>
      a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    visible.forEach((entry, index) => {
      entry.target.style.setProperty('--v4-delay', `${Math.min(index, 4) * 80}ms`);
      entry.target.classList.add('is-in');
      cascadeObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

  const galleryObserver = galleryCards.length ? new IntersectionObserver((entries, observer) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    cascadeFired = true;
    stopFallback();
    galleryCards.forEach((card, index) => {
      card.style.setProperty('--v4-delay', `${Math.min(index, 4) * 80}ms`);
      card.classList.add('is-in');
    });
    observer.disconnect();
  }, { threshold: .12 }) : null;

  if ((cards.length || galleryCards.length) && !paused()) {
    try {
      root.classList.add('v4-cascade');
      cards.forEach(card => cascadeObserver.observe(card));
      if (galleryObserver) galleryObserver.observe(gallery);
      // Respaldo: si el observador no dispara, muestra lo que ya está a la vista.
      const fallbackCheck = () => {
        fallbackTimer = 0;
        if (cascadeFired) return;
        [...cards, ...galleryCards].forEach(card => {
          const rect = card.getBoundingClientRect();
          if (rect.top < innerHeight * .95 && rect.bottom > 0) card.classList.add('is-in');
        });
        fallbackTimer = setTimeout(fallbackCheck, 1500);
      };
      fallbackTimer = setTimeout(fallbackCheck, 1500);
    } catch {
      root.classList.remove('v4-cascade');
      [...cards, ...galleryCards].forEach(card => card.classList.add('is-in'));
    }
  }

  // 4. Cifras con contexto: cuentan una sola vez al verse. El HTML ya trae
  //    el valor final; aquí solo se envuelve el número para animarlo.
  const counterPattern = /\b(117(?=\s+pedidos\b)|85(?=\s+clientes\b)|67(?=\s+arriendos\b)|74(?=\s+colegios\b)|93(?=\s+documentos\b))/gi;
  const counterTest = /\b(?:117(?=\s+pedidos\b)|85(?=\s+clientes\b)|67(?=\s+arriendos\b)|74(?=\s+colegios\b)|93(?=\s+documentos\b))/i;
  const counters = [];
  const main = document.querySelector('main');
  if (main && !paused()) {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !counterTest.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,textarea')) return NodeFilter.FILTER_REJECT;
        if (parent.closest('[data-static], .project-card__status, .hero__cred')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(node => {
      const text = node.nodeValue;
      const fragment = document.createDocumentFragment();
      let last = 0;
      text.replace(counterPattern, (match, _group, offset) => {
        if (offset > last) fragment.append(text.slice(last, offset));
        const span = document.createElement('span');
        span.className = 'v4-count';
        span.dataset.v4Count = match;
        span.dataset.v4Digits = String(match.length);
        span.style.setProperty('--v4-digits', match.length);
        span.textContent = match;
        fragment.append(span);
        counters.push(span);
        last = offset + match.length;
        return match;
      });
      if (last < text.length) fragment.append(text.slice(last));
      node.replaceWith(fragment);
    });
  }

  const counterObserver = counters.length ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      const end = Number(node.dataset.v4Count);
      counterObserver.unobserve(node);
      if (paused()) {
        node.textContent = String(end);
        return;
      }
      const started = performance.now();
      const tick = now => {
        if (paused()) {
          node.textContent = String(end);
          return;
        }
        const progress = Math.min(1, (now - started) / 800);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = String(Math.round(end * eased));
        if (progress < 1) requestAnimationFrame(tick);
        else node.textContent = String(end);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 }) : null;
  if (counterObserver) counters.forEach(counter => counterObserver.observe(counter));

  // 5. Profundidad leve: solo el trazo decorativo del hero (aria-hidden).
  const depth = document.querySelector('.hero .hero__route');
  let depthFrame = 0;
  const paintDepth = () => {
    depthFrame = 0;
    if (!depth) return;
    if (paused() || innerWidth < 768) {
      depth.style.transform = '';
      return;
    }
    const hero = depth.closest('.hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, 1 - rect.bottom / innerHeight));
    depth.style.transform = `translate3d(0,${(progress * -20).toFixed(2)}px,0)`;
  };
  if (depth) {
    depth.classList.add('v4-depth');
    const queueDepth = () => {
      if (!depthFrame) depthFrame = requestAnimationFrame(paintDepth);
    };
    addEventListener('scroll', queueDepth, { passive: true });
    addEventListener('resize', queueDepth, { passive: true });
    paintDepth();
  }

  // Pausar el movimiento (botón de la v2, body o html) deja todo en su estado final.
  const applyPause = () => {
    if (!paused()) return;
    [...media, ...marks].forEach(item => item.classList.add('is-in'));
    [...cards, ...galleryCards].forEach(card => card.classList.add('is-in'));
    counters.forEach(counter => { counter.textContent = counter.dataset.v4Count; });
    stopFallback();
    cascadeObserver.disconnect();
    galleryObserver?.disconnect();
    counterObserver?.disconnect();
    if (depth) depth.style.transform = '';
  };
  document.querySelector('[data-motion-toggle]')?.addEventListener('click', applyPause);
  if ('MutationObserver' in window) {
    new MutationObserver(applyPause).observe(root, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(applyPause).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
