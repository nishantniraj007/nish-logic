/**
 * book-bg.js
 * Animated flipping book pages on warm golden background.
 */
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;
  const pages = [];
  const PAGE_COUNT = 12;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initPages();
  }

  function initPages(){
    pages.length = 0;
    for(let i = 0; i < PAGE_COUNT; i++){
      pages.push({
        phase: (i / PAGE_COUNT) * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.3,
        width: 120 + Math.random() * 80,
        height: 160 + Math.random() * 60,
        x: W * 0.3 + (Math.random() - 0.5) * W * 0.1,
        y: H * 0.45 + (Math.random() - 0.5) * H * 0.08,
        alpha: 0.06 + Math.random() * 0.08
      });
    }
  }

  function drawPage(p, time){
    const flipAngle = Math.sin(time * p.speed + p.phase);
    const scaleX = Math.cos(flipAngle * Math.PI * 0.5);
    const w = p.width * Math.abs(scaleX);
    const h = p.height;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Page shadow
    ctx.shadowColor = 'rgba(120,80,0,0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;

    // Page body
    const brightness = 0.88 + Math.abs(scaleX) * 0.12;
    ctx.fillStyle = `rgba(255, ${Math.floor(248*brightness)}, ${Math.floor(220*brightness)}, ${p.alpha})`;
    ctx.beginPath();

    if(scaleX >= 0){
      // Right page — slight curve on right edge
      ctx.moveTo(-w/2, -h/2);
      ctx.lineTo(w/2 - 8, -h/2);
      ctx.quadraticCurveTo(w/2 + 4, -h/2 + h*0.1, w/2, -h/2 + h*0.5);
      ctx.quadraticCurveTo(w/2 + 4, -h/2 + h*0.9, w/2 - 8, h/2);
      ctx.lineTo(-w/2, h/2);
      ctx.closePath();
    } else {
      // Left page mirror
      ctx.moveTo(w/2, -h/2);
      ctx.lineTo(-w/2 + 8, -h/2);
      ctx.quadraticCurveTo(-w/2 - 4, -h/2 + h*0.1, -w/2, -h/2 + h*0.5);
      ctx.quadraticCurveTo(-w/2 - 4, -h/2 + h*0.9, -w/2 + 8, h/2);
      ctx.lineTo(w/2, h/2);
      ctx.closePath();
    }
    ctx.fill();

    // Page lines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(180,130,0,${p.alpha * 0.4})`;
    ctx.lineWidth = 0.5;
    const lineCount = 8;
    for(let l = 0; l < lineCount; l++){
      const ly = -h/2 + 20 + (l / lineCount) * (h - 40);
      const lx1 = -w/2 + 10;
      const lx2 = w/2 - 10;
      ctx.beginPath();
      ctx.moveTo(lx1, ly);
      ctx.lineTo(lx2, ly);
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw(){
    // Warm golden background
    ctx.fillStyle = '#f5a800';
    ctx.fillRect(0, 0, W, H);

    // Subtle radial glow in center
    const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H)*0.6);
    grd.addColorStop(0, 'rgba(255,200,50,0.4)');
    grd.addColorStop(1, 'rgba(200,120,0,0.3)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    t += 0.015;

    // Draw book spine in center
    const spineW = 18;
    const spineH = 220;
    const sx = W/2, sy = H/2;
    ctx.save();
    ctx.translate(sx, sy);
    const spineGrd = ctx.createLinearGradient(-spineW/2, 0, spineW/2, 0);
    spineGrd.addColorStop(0, 'rgba(100,60,0,0.25)');
    spineGrd.addColorStop(0.5, 'rgba(180,120,0,0.35)');
    spineGrd.addColorStop(1, 'rgba(100,60,0,0.25)');
    ctx.fillStyle = spineGrd;
    ctx.fillRect(-spineW/2, -spineH/2, spineW, spineH);
    ctx.restore();

    // Draw all pages
    pages.forEach(p => drawPage(p, t));

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
