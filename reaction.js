'use strict';

// Decorative molecular trail: an illustration, not a chemical simulation.
(() => {
  const canvas = document.getElementById('reaction-trail');
  const toggle = document.getElementById('reaction-toggle');
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(any-pointer: fine)');
  if (!context) return;
  const MAX_PARTICLES = 72;
  const LIFE = 1250;
  const SPACING = 19;
  let particles = [], frame = 0, last = null, lastTime = 0, counter = 0;
  let enabled = true;
  let width = window.innerWidth, height = window.innerHeight;
  try { enabled = localStorage.getItem('solmaz-cursor-reaction') !== 'off'; } catch (_) {}
  const available = () => !reducedMotion.matches && finePointer.matches;
  const clear = () => {
    cancelAnimationFrame(frame); frame = 0;
    particles = []; last = null; lastTime = 0;
    context.clearRect(0, 0, width, height);
  };
  const resize = () => {
    width = window.innerWidth; height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    clear();
  };
  const updateControl = () => {
    toggle.hidden = !available();
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = `Cursor reaction: ${enabled ? 'on' : 'off'}`;
    if (!available() || !enabled) clear();
  };
  const atom = (x, y, radius, color, alpha, hollow = false) => {
    context.globalAlpha = alpha;
    context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 1;
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2);
    if (hollow) context.stroke(); else context.fill();
  };
  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, width, height);
    particles = particles.filter(p => now - p.born < LIFE);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const age = Math.max(0, (now - p.born) / LIFE);
      const fade = Math.pow(1 - age, 1.6) * .65;
      const normalX = Math.cos(p.angle + Math.PI / 2);
      const normalY = Math.sin(p.angle + Math.PI / 2);
      const drift = Math.sin(p.phase) * age * 12;
      const x = p.x + normalX * drift, y = p.y + normalY * drift - age * 9;
      const color = age > .4 ? p.product : p.reactant;
      const previous = particles[i - 1];
      if (previous && !p.breakBefore && Math.hypot(p.x - previous.x, p.y - previous.y) < 48) {
        const oldAge = Math.max(0, (now - previous.born) / LIFE);
        const oldDrift = Math.sin(previous.phase) * oldAge * 12;
        const px = previous.x + Math.cos(previous.angle + Math.PI / 2) * oldDrift;
        const py = previous.y + Math.sin(previous.angle + Math.PI / 2) * oldDrift - oldAge * 9;
        context.globalAlpha = fade * .65; context.strokeStyle = color; context.lineWidth = 1;
        context.beginPath(); context.moveTo(px, py); context.lineTo(x, y); context.stroke();
      }
      atom(x, y, p.large ? 3.8 : 2.2, color, fade, p.large);
      if (p.large) {
        // Side atoms move apart as the short-lived bonds disappear.
        const distance = 10 + age * 13;
        for (const side of [-1, 1]) {
          const sx = x + normalX * distance * side, sy = y + normalY * distance * side;
          context.globalAlpha = fade * (1 - age) * .7;
          context.beginPath(); context.moveTo(x, y); context.lineTo(sx, sy); context.stroke();
          atom(sx, sy, 1.8, p.product, fade * .9);
        }
      }
    }
    context.globalAlpha = 1;
    if (particles.length && enabled && available()) frame = requestAnimationFrame(draw);
  }
  function emit(x, y, angle, born, dark, breakBefore = false) {
    particles.push({x, y, angle, born, phase: counter * 1.7, large: counter++ % 3 === 0,
      reactant: dark ? '#b8dfcb' : '#2c8b77', product: dark ? '#f1c38e' : '#b16b3f', breakBefore});
    if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
  }
  window.addEventListener('pointermove', event => {
    if (!enabled || !available() || document.hidden || event.pointerType === 'touch') return;
    const now = performance.now();
    const next = {x: event.clientX, y: event.clientY};
    const dark = Boolean(event.target.closest?.('.contact-section'));
    if (!last || now - lastTime > 140 || Math.hypot(next.x - last.x, next.y - last.y) > 240) {
      last = next; emit(next.x, next.y, 0, now, dark, true);
    } else {
      const distance = Math.hypot(next.x - last.x, next.y - last.y);
      const angle = Math.atan2(next.y - last.y, next.x - last.x);
      const steps = Math.min(12, Math.floor(distance / SPACING));
      for (let step = 0; step < steps; step++) {
        last = {x: last.x + Math.cos(angle) * SPACING, y: last.y + Math.sin(angle) * SPACING};
        emit(last.x, last.y, angle, now, dark);
      }
    }
    lastTime = now;
    if (!frame && particles.length) frame = requestAnimationFrame(draw);
  }, {passive: true});
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('solmaz-cursor-reaction', enabled ? 'on' : 'off'); } catch (_) {}
    updateControl();
  });
  document.documentElement.addEventListener('pointerleave', () => { last = null; });
  window.addEventListener('scroll', () => { last = null; }, {passive: true});
  window.addEventListener('resize', resize, {passive: true});
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  reducedMotion.addEventListener('change', updateControl);
  finePointer.addEventListener('change', updateControl);
  resize(); updateControl();
})();
