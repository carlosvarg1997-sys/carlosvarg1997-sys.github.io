/* One real recording at a time; the public experience remains directly accessible. */
document.querySelectorAll('[data-experience]').forEach(experience=>{
 const video=experience.querySelector('video');
 const caption=experience.querySelector('.experience__caption');
 const buttons=[...experience.querySelectorAll('[data-clip]')];
 const link=experience.querySelector('[data-clip-link]');
 let version=0;
 buttons.forEach(button=>button.addEventListener('click',()=>{
  if(button.getAttribute('aria-pressed')==='true')return;
  version++;
  const current=version,wasPlaying=!video.paused;
  video.pause();
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const key=button.dataset.clip;
  video.poster='../assets/img/actual/'+key+'-poster.webp';
  video.querySelector('source').src='../assets/video/actual/'+key+'.mp4';
  video.setAttribute('aria-label',button.textContent.trim());
  caption.textContent=button.dataset.caption;
  link.href='../assets/video/actual/'+key+'.mp4';
  video.load();
  // Feedback breve al cambiar de recorrido; el contenido siempre permanece visible.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && video.animate) {
   video.animate([{opacity:.82},{opacity:1}],{duration:240,easing:'ease-out'});
  }
  if(wasPlaying)video.addEventListener('canplay',()=>{if(current===version)video.play().catch(()=>{})},{once:true});
 }));
 video.addEventListener('play',()=>document.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause()}));
 video.addEventListener('error',()=>{caption.textContent='Puedes abrir la grabación directamente o explorar el proyecto con los enlaces de abajo.'});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause()});
});
