(() => {
  const menuButton = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('#site-nav');
  if (menuButton && nav) {
    const closeMenu = () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.querySelector('span').textContent = '+';
    };
    menuButton.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.querySelector('span').textContent = open ? '−' : '+';
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    window.matchMedia('(min-width:761px)').addEventListener('change', closeMenu);
  }

  const motionButton = document.querySelector('[data-motion-toggle]');
  if (motionButton) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) {
      document.body.classList.add('motion-paused');
      motionButton.setAttribute('aria-pressed', 'true');
      motionButton.textContent = 'REANUDAR MOVIMIENTO';
    }
    motionButton.addEventListener('click', () => {
      const paused = document.body.classList.toggle('motion-paused');
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.textContent = paused ? 'REANUDAR MOVIMIENTO' : 'PAUSAR MOVIMIENTO';
    });
  }

  const steps = [...document.querySelectorAll('[data-method-step]')];
  const graphics = [...document.querySelectorAll('[data-method-graphic]')];
  if (steps.length && graphics.length && 'IntersectionObserver' in window) {
    const activate = number => {
      steps.forEach(step => step.classList.toggle('is-active', step.dataset.methodStep === number));
      graphics.forEach(graphic => graphic.classList.toggle('is-active', graphic.dataset.methodGraphic === number));
    };
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) activate(visible[0].target.dataset.methodStep);
    }, { rootMargin: '-28% 0px -32% 0px', threshold: [0, .1, .35, .6, 1] });
    steps.forEach(step => observer.observe(step));
  }


  // One typographic signature, applied at key transitions. Content is visible without JS.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMotionPaused = () => document.body.classList.contains('motion-paused') || document.documentElement.classList.contains('motion-paused');
  const activeReveals = new Set();
  if ('IntersectionObserver' in window && !reduceMotion.matches && 'animate' in Element.prototype) {
    const revealTargets = [...document.querySelectorAll([
      '.statement__copy h2', '.statement__copy>p:last-child',
      '.section-heading h2', '.section-heading>p:last-child',
      '.method-step h3', '.method-step p',
      '.agentic h2', '.agentic__content>p:not(.eyebrow)',
      '.panel-story__overlay h2',
      '.profile h2', '.profile__copy p',
      '.contact h2', '.contact>p:not(.eyebrow)',
      '.case-hero h1', '.case-hero__lead', '.section h2', '.section__grid p',
      '.decision>div', '.reading', '.next-link', '.case-end h2'
    ].join(','))];
    const heroTitle = document.querySelector('.hero h1');
    // Titulares por grupos de palabras: portada, casos y h2 de sección.
    // Se reutiliza el mismo sistema cinético; nunca se parte letra por letra.
    const groupedTitles = [...new Set([
      heroTitle,
      ...document.querySelectorAll('.case-hero h1'),
      ...document.querySelectorAll('.section-heading h2'),
      ...document.querySelectorAll('.statement__copy h2'),
      ...document.querySelectorAll('.agentic h2'),
      ...document.querySelectorAll('.panel-story__overlay h2'),
      ...document.querySelectorAll('.profile h2'),
      ...document.querySelectorAll('.contact h2'),
      ...document.querySelectorAll('.section h2')
    ].filter(Boolean))];
    const kineticCopy = new Set();
    const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
    const characters = text => segmenter ? [...segmenter.segment(text)].map(part => part.segment) : Array.from(text);

    // Preserve authored line breaks and nested color spans before splitting text.
    revealTargets.forEach(target => {
      if (!/^H[1-6]$/.test(target.tagName) || !target.querySelector('br')) return;
      const nodes = [...target.childNodes];
      target.setAttribute('aria-label', nodes.map(node => node.nodeName === 'BR' ? ' ' : node.textContent).join('').replace(/\s+/g, ' ').trim());
      target.replaceChildren();
      let line = document.createElement('span');
      line.className = 'motion-line';
      nodes.forEach(node => {
        if (node.nodeName === 'BR') {
          target.append(line);
          line = document.createElement('span');
          line.className = 'motion-line';
        } else line.append(node);
      });
      target.append(line);
    });

    const splitWords = (target, mode) => {
      if (mode === 'chars' && /^H[1-6]$/.test(target.tagName) && !target.hasAttribute('aria-label')) {
        target.setAttribute('aria-label', target.textContent.replace(/\s+/g, ' ').trim());
      }
      target.dataset.kinetic = mode;
      const textNodes = [];
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(node => {
        const fragment = document.createDocumentFragment();
        for (const token of node.textContent.match(/\s+|\S+/gu) || []) {
          if (/^\s+$/u.test(token)) { fragment.append(document.createTextNode(token)); continue; }
          const word = document.createElement('span');
          word.className = 'kinetic-word';
          if (mode === 'chars') {
            for (const grapheme of characters(token)) {
              const char = document.createElement('span');
              char.className = 'kinetic-char';
              char.textContent = grapheme;
              word.append(char);
            }
          } else word.textContent = token;
          fragment.append(word);
        }
        node.replaceWith(fragment);
      });
    };
    groupedTitles.forEach(target => {
      splitWords(target, 'words');
      target.dataset.kineticGroups = '';
    });
    kineticCopy.forEach(target => splitWords(target, 'words'));

    const kineticTargets = [...groupedTitles, ...kineticCopy];
    // Batch reads before writes. A restored deep link starts fully readable.
    const armable = kineticTargets.filter(target =>
      target.closest('.hero') || target.closest('.case-hero') || target.getBoundingClientRect().top >= innerHeight * .65
    );
    armable.forEach(target => target.classList.add('kinetic-ready'));

    const play = (piece, frames, options) => {
      const animation = piece.animate(frames, { fill: 'both', easing: 'cubic-bezier(.22,1,.36,1)', ...options });
      activeReveals.add(animation);
      animation.finished.then(() => {
        // Persist the painted endpoint before canceling WAAPI; no frame returns to the faint state.
        piece.style.opacity = '1';
        piece.style.transform = 'none';
        animation.cancel();
        activeReveals.delete(animation);
      }).catch(() => activeReveals.delete(animation));
      return animation;
    };
    const reveal = (target, offset = 0) => {
      if (isMotionPaused() || target.matches('p,.reading,.decision>div,.next-link')) return;
      if (target.dataset.kinetic) {
        if (!target.classList.contains('kinetic-ready') || target.dataset.kineticStarted) return;
        target.dataset.kineticStarted = '';
        const isChars = target.dataset.kinetic === 'chars';
        const isGrouped = target.hasAttribute('data-kinetic-groups');
        const pieces = [...target.querySelectorAll(isChars ? '.kinetic-char' : '.kinetic-word')];
        // 2–4 grupos de palabras; las palabras de un grupo entran juntas.
        const groupCount = isGrouped ? Math.min(4, Math.max(2, Math.ceil(pieces.length / 3))) : 1;
        const groupSize = isGrouped ? Math.max(1, Math.ceil(pieces.length / groupCount)) : 1;
        const animations = pieces.map((piece, index) => play(piece, [
          { opacity: .8, transform: isChars ? 'translate3d(0,.48em,0) scaleY(.82)' : 'translate3d(0,.38em,0)' },
          { opacity: .94, transform: 'translate3d(0,-.025em,0) scaleY(1.018)', offset: .78 },
          { opacity: 1, transform: 'translate3d(0,0,0) scaleY(1)' }
        ], {
          duration: isGrouped ? 420 : isChars ? 930 : 820,
          delay: offset + (isGrouped
            ? Math.floor(index / groupSize) * 80
            : Math.min(index * (isChars ? 18 : 42), isChars ? 520 : 420))
        }));
        Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
          target.classList.remove('kinetic-ready');
        });
        return;
      }
      const lines = [...target.querySelectorAll(':scope > .motion-line')];
      (lines.length ? lines : [target]).forEach((piece, index) => {
        const isCard = target.matches('.project-card,.tool-card,.evidence-item,.skills__list a,.proof,.decision>div,.next-link');
        play(piece, [
          { opacity: .8, transform: `translate3d(0,${isCard ? 24 : 36}px,0) scale(.975)` },
          { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }
        ], { duration: isCard ? 760 : 890, delay: index * 150 });
      });
    };
    // Enter the reading band before animating; large mobile headings need only a
    // small visible portion so the effect happens while the reader is looking.
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '-4% 0px -22% 0px', threshold: .16 });
    revealTargets.filter(target => !target.closest('.hero')).forEach(target => revealObserver.observe(target));
    // Respaldo: un texto que queda en pantalla sin llegar a la banda de lectura
    // (por ejemplo, al final de la página) se revela igual; nunca queda tenue.
    const fallbackObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        fallbackObserver.unobserve(entry.target);
        setTimeout(() => reveal(entry.target), 1200);
      });
    });
    armable.filter(target => !target.closest('.hero')).forEach(target => fallbackObserver.observe(target));

    if (heroTitle) {
      const heroCopy = document.querySelector('.hero__content>p:not(.eyebrow)');
      const heroEyebrow = document.querySelector('.hero__content>.eyebrow');
      const heroActions = document.querySelector('.hero__actions');
      const startHero = () => {
        if (isMotionPaused()) return;
        if (heroEyebrow) play(heroEyebrow, [
          { opacity: .8, transform: 'translate3d(0,15px,0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)' }
        ], { duration: 560 });
        reveal(heroTitle, 100);
        if (heroCopy) reveal(heroCopy, 500);

      };
      document.fonts.ready.then(() => requestAnimationFrame(startHero));
    }
  }

  motionButton?.addEventListener('click', () => {
    if (isMotionPaused()) {
      document.querySelectorAll('.kinetic-ready').forEach(target => target.classList.remove('kinetic-ready'));
      activeReveals.forEach(animation => animation.cancel());
      activeReveals.clear();
    }
  });

  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const move = direction => {
      const first = gallery.querySelector('.evidence-item');
      if (!first) return;
      const distance = first.getBoundingClientRect().width + 20;
      gallery.scrollBy({ left: distance * direction, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    document.querySelector('[data-gallery-prev]')?.addEventListener('click', () => move(-1));
    document.querySelector('[data-gallery-next]')?.addEventListener('click', () => move(1));
    gallery.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
  }

  const panelVideo = document.querySelector('.panel-story video');
  if (panelVideo) {
    panelVideo.addEventListener('play', () => panelVideo.closest('.panel-story__frame')?.classList.add('is-playing'));
    const showOverlay = () => panelVideo.closest('.panel-story__frame')?.classList.remove('is-playing');
    panelVideo.addEventListener('pause', showOverlay);
    panelVideo.addEventListener('ended', showOverlay);
  }
})();

