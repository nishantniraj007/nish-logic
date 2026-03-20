/**
 * expert-analyser-bg.js
 * Rotating concentric rings — purple/blue glowing rectangles vortex.
 */
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;

  const RINGS = 28;
  const RECTS_PER_RING = 80;
  const RECT_W = 10;
  const RECT_H = 5;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function draw(){
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0,0,W,H);
    t += 0.004;

    const cx = W/2, cy = H/2;
    const maxR = Math.min(W,H) * 0.48;
    const minR = maxR * 0.18;

    for(let r = 0; r < RINGS; r++){
      const frac = r / (RINGS - 1);
      const radius = minR + (maxR - minR) * frac;
      const count = Math.floor(RECTS_PER_RING * (0.4 + frac * 0.6));
      // Alternate ring rotation direction for vortex feel
      const dir = r % 2 === 0 ? 1 : -1;
      const speed = 0.3 + frac * 0.5;
      const ringAngle = t * speed * dir;

      // Color: inner rings more blue, outer rings more purple
      const hue = 240 + frac * 50; // 240=blue → 290=purple
      const lightness = 45 + frac * 20;
      const alpha = 0.5 + frac * 0.4;

      for(let i = 0; i < count; i++){
        const angle = ringAngle + (i / count) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI/2);

        // Glow
        ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
        ctx.shadowBlur = 6;

        const rw = RECT_W * (0.5 + frac * 0.7);
        const rh = RECT_H * (0.5 + frac * 0.5);

        ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
        ctx.fillRect(-rw/2, -rh/2, rw, rh);

        ctx.restore();
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  // Clear fully on first frame
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);
  draw();
})();
