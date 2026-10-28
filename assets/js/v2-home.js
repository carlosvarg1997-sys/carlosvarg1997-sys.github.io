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
})();
