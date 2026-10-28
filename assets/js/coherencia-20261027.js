/* Coherencia 2026-10-27:
   1) Cifras estáticas y CTA inmediato en hero;
   2) Vitrina interactiva al scroll en #casos (los 4 proyectos van cambiando uno por uno al hacer scroll o clic). */
(function () {
  'use strict';

  var FINAL = ['117', '+80', '93'];

  function fijarCifras() {
    var nodos = document.querySelectorAll('.hero__numbers strong');
    for (var i = 0; i < nodos.length && i < FINAL.length; i++) {
      if (nodos[i].textContent !== FINAL[i]) nodos[i].textContent = FINAL[i];
    }
  }

  function liberarCta() {
    if (!document.getAnimations) return;
    var animaciones = document.getAnimations();
    for (var i = 0; i < animaciones.length; i++) {
      var efecto = animaciones[i].effect;
      var objetivo = efecto && efecto.target;
      if (objetivo && objetivo.closest && objetivo.closest('.hero__actions')) {
        try { animaciones[i].finish(); } catch (e) {}
      }
    }
    var acciones = document.querySelector('.hero__actions');
    if (acciones) {
      acciones.style.opacity = '1';
      acciones.style.visibility = 'visible';
    }
  }

  function iniciarVitrinaCasos() {
    var seccion = document.getElementById('casos');
    if (!seccion) return;

    var tarjetas = Array.prototype.slice.call(seccion.querySelectorAll('.project-card[data-case-card]'));
    var pestanas = Array.prototype.slice.call(seccion.querySelectorAll('.projects__tab[data-case-tab]'));
    var contador = seccion.querySelector('[data-case-counter]');
    if (tarjetas.length < 4) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;
    if (!reduce) {
      root.classList.add('casos-scroll-ready');
    }

    var nombres = ['ENSUTEX', 'SOL Y TIERRA', 'MARLEY COFFEE', 'MODOFAN'];
    var activo = 0;
    var bloqueoClickHasta = 0;

    function estaPausado() {
      return (
        root.classList.contains('motion-paused') ||
        document.body.classList.contains('motion-paused') ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      );
    }

    function activarCaso(indice, animar) {
      var idx = Math.max(0, Math.min(tarjetas.length - 1, indice));
      var cambio = idx !== activo;
      activo = idx;

      for (var i = 0; i < tarjetas.length; i++) {
        var esActivo = i === idx;
        tarjetas[i].classList.toggle('is-active-case', esActivo);
        tarjetas[i].classList.add('is-in');
        var img = tarjetas[i].querySelector('.project-card__media img');
        if (img) img.classList.add('is-in');
      }

      for (var j = 0; j < pestanas.length; j++) {
        var tabActiva = j === idx;
        pestanas[j].classList.toggle('is-active', tabActiva);
        pestanas[j].setAttribute('aria-pressed', tabActiva ? 'true' : 'false');
      }

      if (contador) {
        var num = idx + 1 < 10 ? '0' + (idx + 1) : String(idx + 1);
        contador.textContent = 'PROYECTO ' + num + ' DE 04 · ' + (nombres[idx] || '');
      }

      if (cambio && animar && !estaPausado() && tarjetas[idx].animate) {
        try {
          tarjetas[idx].animate(
            [
              { opacity: 0.72, transform: 'translate3d(0, 14px, 0)' },
              { opacity: 1, transform: 'translate3d(0, 0, 0)' }
            ],
            { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );
          var mediaImg = tarjetas[idx].querySelector('.project-card__media img');
          if (mediaImg && mediaImg.animate) {
            mediaImg.animate(
              [
                { transform: 'scale(1.03)' },
                { transform: 'scale(1)' }
              ],
              { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            );
          }
        } catch (e) {}
      }
    }

    function actualizarPorScroll() {
      if (estaPausado()) return;
      var rect = seccion.getBoundingClientRect();
      var recorrible = Math.max(1, seccion.offsetHeight - window.innerHeight);
      var avance = Math.min(recorrible, Math.max(0, -rect.top));
      var ratio = avance / recorrible;
      var progresoBarra = Math.max(0.15, Math.min(1, ratio * 0.85 + 0.15));
      seccion.style.setProperty('--casos-progress', progresoBarra.toFixed(4));

      if (Date.now() < bloqueoClickHasta) return;
      var nuevoIndice = Math.min(tarjetas.length - 1, Math.floor(ratio * tarjetas.length * 0.9999));
      if (nuevoIndice !== activo) {
        activarCaso(nuevoIndice, true);
      }
    }

    pestanas.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        bloqueoClickHasta = Date.now() + 650;
        activarCaso(idx, true);
        var progresoClick = ((idx + 1) / tarjetas.length).toFixed(4);
        seccion.style.setProperty('--casos-progress', progresoClick);

        if (!estaPausado()) {
          var topSeccion = window.scrollY + seccion.getBoundingClientRect().top;
          var recorrible = Math.max(0, seccion.offsetHeight - window.innerHeight);
          var destino = topSeccion + (recorrible * (idx + 0.15)) / tarjetas.length;
          window.scrollTo({ top: destino, behavior: 'smooth' });
        }
      });
    });

    var esperando = false;
    function alHacerScroll() {
      if (esperando) return;
      esperando = true;
      requestAnimationFrame(function () {
        esperando = false;
        actualizarPorScroll();
      });
    }

    window.addEventListener('scroll', alHacerScroll, { passive: true });
    window.addEventListener('resize', alHacerScroll, { passive: true });
    activarCaso(0, false);
    actualizarPorScroll();
  }

  function iniciar() {
    requestAnimationFrame(liberarCta);
    fijarCifras();
    iniciarVitrinaCasos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  window.addEventListener('load', function () {
    liberarCta();
    fijarCifras();
  });
  setTimeout(fijarCifras, 2500);
  setTimeout(fijarCifras, 4500);
})();
