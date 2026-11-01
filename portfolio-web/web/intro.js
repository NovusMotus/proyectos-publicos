'use strict';
(() => {
  class IntroClock {
    constructor({ request, cancel, frame, end, duration = 12000 }) {
      Object.assign(this, { request, cancel, frame, end, duration });
      this.elapsed = 0; this.intent = false; this.allowed = false; this.pending = null; this.last = null;
    }
    get running() { return this.intent && this.allowed && this.elapsed < this.duration; }
    sync() {
      if (this.pending !== null) this.cancel(this.pending);
      this.pending = null; this.last = null; this.frame(this.elapsed, this.running);
      if (this.running) this.pending = this.request(time => this.tick(time));
    }
    tick(time) {
      this.pending = null; if (!this.running) return;
      if (this.last !== null) this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, time - this.last));
      this.last = time; this.frame(this.elapsed, this.running);
      if (this.elapsed >= this.duration) { this.intent = false; this.last = null; this.end(); }
      else if (this.running) this.pending = this.request(next => this.tick(next));
    }
    play() { if (this.elapsed >= this.duration) this.elapsed = 0; this.intent = true; this.sync(); }
    pause() { this.intent = false; this.sync(); }
    permit(value) { if (this.allowed !== value) { this.allowed = value; this.sync(); } }
    seek(time) { this.elapsed = Math.max(0, Math.min(time, this.duration)); this.intent = false; this.sync(); }
  }
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, value) => a + (b - a) * value;
  const phase = (start, end, time) => clamp((time - start) / (end - start));
  const smooth = (start, end, time) => { const p = phase(start, end, time); return p * p * (3 - 2 * p); };
  // A deterministic timeline: every visible pose, including particles, uses this clock.
  function motionPose(milliseconds, width, height, mobile = width < 625) {
    const t = milliseconds / 1000;
    const visual = mobile ? { x: 0, y: height * .48, w: width, h: height * .50 } : { x: width * .46, y: 0, w: width * .54, h: height };
    const cx = visual.x + visual.w / 2, cy = visual.y + visual.h / 2;
    const cardW = Math.min(162, visual.w / 3.35, visual.h / 2.30), cardH = cardW * .70;
    const settle = smooth(8.6, 10.4, t), opening = smooth(2.1, 3.2, t);
    const cards = Array.from({ length: 9 }, (_, i) => {
      const entry = 1 - Math.pow(1 - phase(2.55 + i * .10, 3.9 + i * .10, t), 3);
      const angle = i * 2.39996 + t * .20 + (1 - entry) * 2.4;
      const orbitX = cx + Math.cos(angle) * visual.w * .31;
      const orbitY = cy + Math.sin(angle) * Math.min(visual.h * .29, visual.w * .28);
      const gridX = cx + (i % 3 - 1) * (cardW * 1.08);
      const gridY = cy + (Math.floor(i / 3) - 1) * (cardH * 1.12);
      return { x: mix(cx, mix(orbitX, gridX, settle), entry), y: mix(cy, mix(orbitY, gridY, settle), entry),
        width: cardW, height: cardH, scale: mix(.08, 1, entry), opacity: phase(2.55 + i * .10, 2.9 + i * .10, t),
        rotate: (1 - entry) * 130 + (1 - settle) * Math.sin(i * 1.8 + t * .75) * 9,
        tilt: (1 - settle) * Math.sin(i + t * .55) * 19 };
    });
    return { t, mobile, visual, cx, cy, cards, opening, settle, charge: smooth(0, 2.2, t),
      capsule: { scale: (mobile ? .65 : 1) * (.75 + .25 * smooth(0, 1.8, t)), yaw: smooth(0, 2.2, t) * 360,
        roll: Math.sin(t * 3) * (1 - opening) * 9, bob: Math.sin(t * 2.3) * 9, opacity: 1 - smooth(3.05, 3.8, t) },
      network: smooth(5.1, 6.1, t) * (1 - smooth(8.7, 9.6, t)), exit: smooth(11.2, 12, t) };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { IntroClock, motionPose }; return; }
  const $ = id => document.getElementById(id), dialog = $('intro-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const media = matchMedia('(prefers-reduced-motion: reduce)'), scenes = [...dialog.querySelectorAll('.intro-scene')];
  const chapters = [...dialog.querySelectorAll('[data-intro-scene]')], seenKey = 'portfolio-intro-v9-seen';
  const stage = dialog.querySelector('.intro-stage'), canvas = stage.querySelector('canvas'), context = canvas.getContext('2d');
  const cards = [...stage.querySelectorAll('.intro-project')], capsule = stage.querySelector('.intro-object');
  const shellTop = stage.querySelector('.intro-shell-top'), shellBottom = stage.querySelector('.intro-shell-bottom');
  const method = [...stage.querySelectorAll('.intro-method span')], revealMark = stage.querySelector('.intro-reveal-mark');
  scenes.forEach(scene => { const heading = scene.querySelector('h2'); const wrap = node => {
    [...node.childNodes].forEach(child => { if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
      const word = document.createElement('span'); word.className = 'intro-word'; word.textContent = child.textContent; child.replaceWith(word);
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') wrap(child); });
  }; wrap(heading); });
  let previousFocus = null, shown = false, lastSecond = -1, lastScene = -1, width = 0, height = 0, lastTime = 0;
  function drawMotion(time) {
    lastTime = time;
    if (!width || !height) return;
    // Reduced motion gets composed still frames, with no autonomous motion.
    const sample = media.matches ? Math.min(10500, Math.floor(time / 3000) * 3000 + 1500) : time;
    const p = motionPose(sample, width, height, innerWidth <= 680), { t, cx, cy, visual } = p;
    const capsuleY = cy - 88 + p.capsule.bob;
    capsule.style.transform = `translate3d(${cx - 86}px,${capsuleY}px,0) scale(${p.capsule.scale}) rotateY(${p.capsule.yaw}deg) rotateZ(${p.capsule.roll}deg)`;
    capsule.style.opacity = p.capsule.opacity;
    shellTop.style.transform = `translateY(${-p.opening * 155}px) rotateZ(${-p.opening * 32}deg) rotateX(${p.opening * 40}deg)`;
    shellBottom.style.transform = `translateY(${p.opening * 130}px) rotateZ(${p.opening * 28}deg)`;
    capsule.querySelector('.intro-seam').style.opacity = 1 - p.opening;
    capsule.querySelector('.intro-object-caption').style.opacity = 1 - smooth(1.7, 2.2, t);
    cards.forEach((card, i) => {
      const v = p.cards[i]; card.style.width = `${v.width}px`; card.style.height = `${v.height}px`;
      card.style.opacity = v.opacity; card.style.zIndex = String(Math.round(v.y));
      card.style.transform = `translate3d(${v.x - v.width / 2}px,${v.y - v.height / 2}px,0) scale(${v.scale}) rotateZ(${v.rotate}deg) rotateY(${v.tilt}deg)`;
    });
    const positions = [[cx - visual.w * .29, visual.y + visual.h * .08], [cx + visual.w * .18, visual.y + visual.h * .45], [cx - 30, visual.y + visual.h * .90]];
    method.forEach((chip, i) => { chip.style.opacity = p.network; chip.style.transform = `translate(${positions[i][0] - 35}px,${positions[i][1] + Math.sin(t * 1.4 + i) * 5}px)`; });
    revealMark.style.opacity = p.settle; revealMark.style.transform = `translate(${cx - (p.mobile ? 58 : 80)}px,${cy - (p.mobile ? 55 : 72)}px) scale(${1 + p.exit * .3})`;
    scenes.forEach((scene, i) => {
      const local = t - i * 3, entrance = i === 0 ? smooth(0, .7, t) : smooth(0, .6, local);
      scene.style.opacity = i === 0 ? 1 - smooth(2.7, 3, t) : entrance * (1 - smooth(2.7, 3, local));
      scene.querySelectorAll('.intro-word').forEach((word, j) => {
        const e = 1 - Math.pow(1 - phase(j * .10, .7 + j * .10, Math.max(0, local)), 3);
        word.style.transform = `translate3d(${(1 - e) * (j % 2 ? -38 : 38)}px,${(1 - e) * 24}px,0)`;
        word.style.opacity = i === 0 ? .5 + .5 * e : e;
      });
      const caption = scene.querySelector(':scope > span'); if (caption) caption.style.transform = `translateY(${(1 - entrance) * 15}px)`;
    });
    if (!context) return;
    const c = context; c.clearRect(0, 0, width, height);
    const glow = c.createRadialGradient(cx, cy, 0, cx, cy, visual.w * .65);
    glow.addColorStop(0, `rgba(94,183,158,${.11 + .08 * Math.sin(t * 1.5) ** 2})`); glow.addColorStop(1, 'rgba(94,183,158,0)');
    c.fillStyle = glow; c.fillRect(0, 0, width, height);
    // Moving perspective floor and travelling points give the shot a continuous camera feel.
    c.strokeStyle = '#94cfbd10'; c.lineWidth = 1;
    for (let i = -7; i <= 7; i++) { c.beginPath(); c.moveTo(cx + i * 8, cy); c.lineTo(cx + i * visual.w * .18, height); c.stroke(); }
    for (let i = 0; i < 9; i++) { const z = ((i / 9 + t * .045) % 1) ** 2; const y = cy + z * (height - cy); c.beginPath(); c.moveTo(visual.x, y); c.lineTo(width, y); c.stroke(); }
    for (let i = 0; i < 60; i++) {
      const angle = i * 2.39996 + t * (.1 + i % 3 * .025), radius = visual.w * (.12 + (i % 13) / 20);
      const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius * .58;
      c.fillStyle = i % 4 ? '#bcdfc73d' : '#e6c98a99'; c.beginPath(); c.arc(x, y, i % 7 === 0 ? 1.8 : .8, 0, Math.PI * 2); c.fill();
    }
    const ringFade = 1 - smooth(3.1, 4.2, t);
    if (ringFade > 0) for (let i = 0; i < 3; i++) {
      c.save(); c.translate(cx, cy + p.capsule.bob); c.rotate(t * (.55 + i * .15) + i * 1.05);
      c.strokeStyle = `rgba(${i === 1 ? '231,202,149' : '165,229,203'},${ringFade * (.22 + p.charge * .24)})`; c.lineWidth = i === 1 ? 1.5 : .8;
      c.beginPath(); c.ellipse(0, 0, (p.mobile ? 75 : 126) + i * 13 + p.opening * 90, (p.mobile ? 32 : 56) + i * 8, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    const burst = phase(2.15, 4.7, t);
    if (burst > 0 && burst < 1) { c.strokeStyle = `rgba(184,230,187,${(1 - burst) * .55})`; c.lineWidth = 1 + (1 - burst) * 3; c.beginPath(); c.arc(cx, cy, 20 + burst * visual.w * .75, 0, Math.PI * 2); c.stroke(); }
    if (p.network > 0) {
      c.lineWidth = 1;
      p.cards.forEach((card, i) => { const next = p.cards[(i + 3) % 9]; c.strokeStyle = `rgba(174,222,192,${p.network * .40})`; c.beginPath(); c.moveTo(card.x, card.y); c.quadraticCurveTo(cx, cy, next.x, next.y); c.stroke();
        const q = (t * .35 + i * .13) % 1, x = (1-q)**2 * card.x + 2*(1-q)*q*cx + q*q*next.x, y = (1-q)**2*card.y + 2*(1-q)*q*cy + q*q*next.y;
        c.fillStyle = `rgba(232,211,161,${p.network})`; c.beginPath(); c.arc(x,y,2.4,0,Math.PI*2); c.fill(); });
    }
    if (p.exit > 0) { c.strokeStyle = `rgba(174,222,192,${(1 - p.exit) * .6})`; c.lineWidth = 3; c.beginPath(); c.arc(cx,cy,p.exit * Math.hypot(width,height),0,Math.PI*2); c.stroke(); }
  }
  function resizeMotion() {
    width = stage.clientWidth; height = stage.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawMotion(lastTime);
  }
  new ResizeObserver(resizeMotion).observe(stage);
  const seconds = value => `00:${String(Math.floor(value / 1000)).padStart(2, '0')}`;
  function render(time, playing) {
    const scene = Math.min(3, Math.floor(time / 3000));
    dialog.dataset.playhead = String(Math.round(time));
    dialog.dataset.scene = String(scene); dialog.dataset.playing = String(playing);
    if (scene !== lastScene) {
      scenes.forEach((element, index) => { element.hidden = index !== scene; });
      chapters.forEach((button, index) => button.setAttribute('aria-pressed', String(index === scene))); lastScene = scene;
    }
    drawMotion(time);
    $('intro-progress').value = time;
    const second = Math.floor(time / 1000);
    if (second !== lastSecond) { $('intro-time').textContent = `${seconds(time)} / 00:12`; lastSecond = second; }
    $('intro-duration').textContent = media.matches ? 'NOVUS MOTUS / AVANCE MANUAL' : 'NOVUS MOTUS / 12 S';
    $('intro-open').textContent = media.matches ? '▶ Ver presentación · avance manual' : '▶ Ver presentación animada · 12 s';
    $('intro-play').disabled = media.matches;
    $('intro-play').textContent = media.matches ? 'Movimiento reducido' : playing ? 'Pausar' : document.documentElement.dataset.motion !== 'on' ? 'Reproducir con movimiento' : 'Reproducir';
  }
  const clock = new IntroClock({ request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id), frame: render, end: () => closeIntro() });
  function refreshPermission() { clock.permit(dialog.open && !document.hidden && !media.matches && document.documentElement.dataset.motion === 'on'); render(clock.elapsed, clock.running); }
  function closeIntro() { clock.pause(); if (dialog.open) dialog.close(); }
  function openIntro() {
    if (dialog.open) return;
    previousFocus = document.activeElement; lastSecond = -1; clock.seek(0);
    dialog.querySelector('.intro-transcript').open = false;
    document.body.classList.remove('intro-revealed');
    dialog.showModal(); resizeMotion(); shown = true; document.documentElement.classList.add('intro-is-open');
    refreshPermission(); if (!media.matches) clock.play();
  }
  $('intro-open').addEventListener('click', openIntro);
  $('intro-skip').addEventListener('click', closeIntro); $('intro-finish').addEventListener('click', closeIntro);
  $('intro-play').addEventListener('click', () => {
    if (clock.running) clock.pause();
    else if (!media.matches) {
      if (document.documentElement.dataset.motion !== 'on') $('motion-toggle').click();
      refreshPermission(); clock.play();
    }
  });
  chapters.forEach(button => button.addEventListener('click', () => clock.seek(Number(button.dataset.introScene) * 3000 + 700)));
  dialog.querySelector('.intro-transcript').addEventListener('toggle', event => { if (event.target.open) clock.pause(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeIntro(); });
  dialog.addEventListener('close', () => {
    clock.pause(); document.documentElement.classList.remove('intro-is-open');
    document.body.classList.add('intro-revealed');
    if (shown) { try { sessionStorage.setItem(seenKey, 'yes'); } catch {} }
    const target = previousFocus && previousFocus !== document.body && previousFocus.isConnected ? previousFocus : $('page-title');
    target.setAttribute('tabindex', target.tabIndex < 0 ? '-1' : String(target.tabIndex)); target.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', refreshPermission); media.addEventListener('change', refreshPermission);
  new MutationObserver(refreshPermission).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  render(0, false);
  const params = new URLSearchParams(location.search), deep = ['project', 'capability', 'topic'].some(key => params.has(key)) || Boolean(location.hash);
  let seen = false; try { seen = sessionStorage.getItem(seenKey) === 'yes'; } catch {}
  // Capture the incoming URL before app initialization can add its default node.
  if (params.get('intro') === '1' || (!deep && !seen && !media.matches)) openIntro();
})();
