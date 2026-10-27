(() => {
 const chapters = document.querySelector('[data-video-chapters]');
 const video = document.querySelector('#lingbot-video');
 if (!chapters || !video) return;
 chapters.addEventListener('click', event => {
  const button = event.target.closest('button[data-time]');
  if (!button) return;
  const time = Number(button.dataset.time);
  if (!Number.isFinite(time) || time < 0) return;
  video.currentTime = time;
  video.focus({preventScroll: true});
  video.scrollIntoView({behavior: 'smooth', block: 'center'});
 });
})();
