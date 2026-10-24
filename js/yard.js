/* Scrap Nest — one-screen yard: claw radius shreds scrap automatically */
'use strict';

const Yard = (() => {
  let piles = [];
  let floats = []; // floating part numbers
  let bots = [];
  let claw = { x: 0, y: 0, active: false };
  let power = 1;
  let powerMax = 1;
  let runParts = 0;
  let elapsed = 0;
  let spawnAcc = 0;
  let shredAcc = 0;
  let w = 360, h = 640;
  let stats = null;
  let fx = null;
  let helperStates = {};
  let ended = false;
  let lowWarned = false;

  function reset(canvasW, canvasH, statsIn, fxIn, helpersIn) {
    w = canvasW; h = canvasH;
    stats = statsIn;
    fx = fxIn;
    helperStates = helpersIn || {};
    piles = [];
    floats = [];
    bots = [];
    runParts = 0;
    elapsed = 0;
    spawnAcc = 0;
    shredAcc = 0;
    ended = false;
    lowWarned = false;
    const basePower = 18 + (fx.power || 0) + (fx.basePower || 0);
    powerMax = basePower;
    power = basePower;
    claw.x = w * 0.5;
    claw.y = h * 0.45;
    claw.active = true;
    // seed a few piles
    for (let i = 0; i < 5; i++) spawnPile(true);
    // helper bots
    if (helperStates.sweeper && helperStates.sweeper.botOn) {
      bots.push({ id: 'sweeper', x: w * 0.3, y: h * 0.5, a: 0, color: '#7ec8e3', hs: helperStates.sweeper });
    }
    if (helperStates.grabber && helperStates.grabber.botOn) {
      bots.push({ id: 'grabber', x: w * 0.7, y: h * 0.55, a: 1, color: '#e3a87e', hs: helperStates.grabber });
    }
  }

  function clawRadius() {
    const base = Math.min(w, h) * 0.11;
    return base * (fx.reach || 1) * (1 + (fx.reachMult || 0));
  }

  function shredDps() {
    return 14 * (fx.shred || 1) * (1 + (fx.shredMult || 0));
  }

  function spawnRate() {
    return 1.1 * (fx.spawn || 1) * (1 + (fx.spawnMult || 0));
  }

  function pickKind() {
    const r = Math.random();
    if (r < 0.02) return SCRAP_KINDS[4]; // glow core rare
    if (r < 0.12) return SCRAP_KINDS[3];
    if (r < 0.35) return SCRAP_KINDS[2];
    if (r < 0.65) return SCRAP_KINDS[1];
    return SCRAP_KINDS[0];
  }

  function spawnPile(force) {
    if (piles.length > 28 && !force) return;
    const kind = pickKind();
    const pad = 36;
    const top = 70;
    const bot = h - 90;
    let x, y, ok = false;
    for (let t = 0; t < 12; t++) {
      x = pad + Math.random() * (w - pad * 2);
      y = top + Math.random() * (bot - top);
      ok = piles.every(p => (p.x - x) ** 2 + (p.y - y) ** 2 > (p.r + kind.r + 8) ** 2);
      if (ok) break;
    }
    piles.push({
      x, y, r: kind.r, kind, hp: kind.hp, maxHp: kind.hp,
      rot: Math.random() * Math.PI, shake: 0,
    });
  }

  function setPointer(x, y, down) {
    claw.x = x; claw.y = y;
    if (down !== undefined) claw.active = !!down;
  }

  function partsFor(pile) {
    return pile.kind.parts + (fx.value || 0) + (fx.baseValue || 0);
  }

  function award(n, x, y) {
    const mult = 1 + (fx.partMult || 0);
    const got = Math.max(1, Math.round(n * mult));
    runParts += got;
    floats.push({ x, y, t: 0, txt: '+' + got, vy: -40 });
    return got;
  }

  function damagePile(p, dmg, source) {
    p.hp -= dmg;
    p.shake = 0.12;
    if (p.hp <= 0) {
      let bonus = 0;
      if (source && source.botValue) bonus += source.botValue;
      const got = award(partsFor(p) + bonus, p.x, p.y);
      stats.piles++;
      SFX.pop();
      const ix = piles.indexOf(p);
      if (ix >= 0) piles.splice(ix, 1);
      return got;
    }
    return 0;
  }

  function update(dt) {
    if (ended) return { ended: true, runParts, power, powerMax };
    elapsed += dt;
    power -= dt;
    if (power < 4 && !lowWarned) { lowWarned = true; SFX.powerLow(); }
    if (power <= 0) {
      power = 0;
      ended = true;
      SFX.returnNest();
      return { ended: true, runParts, power, powerMax };
    }

    // spawn
    spawnAcc += dt * spawnRate();
    while (spawnAcc >= 1) { spawnAcc -= 1; spawnPile(false); }

    const R = clawRadius();
    const dps = shredDps();
    let shredded = false;

    // player claw
    if (claw.active || fx.auto) {
      for (const p of piles.slice()) {
        const dx = p.x - claw.x, dy = p.y - claw.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= R + p.r * 0.5) {
          damagePile(p, dps * dt, null);
          shredded = true;
          // light magnet pull of pile toward claw if magnet
          if (fx.magnet) {
            const pull = 40 * fx.magnet * dt;
            p.x -= (dx / (dist || 1)) * pull * 0.15;
            p.y -= (dy / (dist || 1)) * pull * 0.15;
          }
        }
      }
    }

    // magnet: float numbers already awarded; also gently pull nearby scrap into radius edge
    if (fx.magnet) {
      for (const p of piles) {
        const dx = claw.x - p.x, dy = claw.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < R * 2.2 && dist > R) {
          const pull = 55 * fx.magnet * dt;
          p.x += (dx / dist) * pull;
          p.y += (dy / dist) * pull;
        }
      }
    }

    // bots
    for (const b of bots) {
      const hs = b.hs;
      const br = clawRadius() * 0.55 * (hs.botReach || 1);
      const bdps = shredDps() * 0.35 * (hs.botShred || 1);
      const spd = 55 * (hs.botSpeed || 1);
      // wander / chase
      let target = null;
      let best = 1e9;
      for (const p of piles) {
        let score = Math.hypot(p.x - b.x, p.y - b.y);
        if (hs.botRare && p.kind.parts >= 6) score *= 0.4;
        if (score < best) { best = score; target = p; }
      }
      if (target) {
        const dx = target.x - b.x, dy = target.y - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        b.x += (dx / dist) * spd * dt;
        b.y += (dy / dist) * spd * dt;
        if (hs.botPull) {
          // drag scrap toward player claw
          target.x += (claw.x - target.x) * 0.35 * dt;
          target.y += (claw.y - target.y) * 0.35 * dt;
        }
        if (dist < br + target.r) {
          damagePile(target, bdps * dt, hs);
          shredded = true;
        }
      } else {
        b.a += dt;
        b.x += Math.cos(b.a) * 20 * dt;
        b.y += Math.sin(b.a * 0.7) * 20 * dt;
      }
      b.x = Math.max(20, Math.min(w - 20, b.x));
      b.y = Math.max(60, Math.min(h - 80, b.y));
    }

    if (shredded) {
      shredAcc += dt;
      if (shredAcc > 0.07) { shredAcc = 0; SFX.shred(); }
    }

    for (const f of floats) { f.t += dt; f.y += f.vy * dt; }
    floats = floats.filter(f => f.t < 0.9);

    for (const p of piles) if (p.shake > 0) p.shake -= dt;

    return { ended: false, runParts, power, powerMax };
  }

  function draw(ctx) {
    // yard ground
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a221c');
    g.addColorStop(1, '#1a1512');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // dusty dots
    ctx.fillStyle = 'rgba(180,150,100,0.08)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + elapsed * 3) % w;
      const y = (i * 53) % h;
      ctx.fillRect(x, y, 2, 2);
    }

    // scrap piles
    for (const p of piles) {
      const sh = p.shake > 0 ? (Math.random() - 0.5) * 3 : 0;
      drawScrap(ctx, p.x + sh, p.y + sh, p);
    }

    // bots
    for (const b of bots) {
      const br = clawRadius() * 0.55 * (b.hs.botReach || 1);
      ctx.beginPath();
      ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
      ctx.strokeStyle = b.color + '55';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1520';
      ctx.fillRect(b.x - 3, b.y - 2, 2, 2);
      ctx.fillRect(b.x + 1, b.y - 2, 2, 2);
    }

    // claw
    const R = clawRadius();
    ctx.beginPath();
    ctx.arc(claw.x, claw.y, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(78,205,196,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(78,205,196,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(claw.x, claw.y, R * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(78,205,196,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // claw arms
    ctx.strokeStyle = '#e8c070';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = elapsed * 2 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(claw.x + Math.cos(a) * R * 0.25, claw.y + Math.sin(a) * R * 0.25);
      ctx.lineTo(claw.x + Math.cos(a) * R * 0.92, claw.y + Math.sin(a) * R * 0.92);
      ctx.stroke();
    }
    // cable up
    ctx.beginPath();
    ctx.moveTo(claw.x, 0);
    ctx.lineTo(claw.x, claw.y - R * 0.2);
    ctx.strokeStyle = 'rgba(232,192,112,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // floats
    ctx.font = 'bold 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (const f of floats) {
      ctx.globalAlpha = 1 - f.t / 0.9;
      ctx.fillStyle = '#f0c040';
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawScrap(ctx, x, y, p) {
    const k = p.kind;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.rot);
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = k.color;
    if (k.id === 'tin') {
      ctx.fillRect(-k.r * 0.6, -k.r * 0.7, k.r * 1.2, k.r * 1.4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-k.r * 0.5, -k.r * 0.5, k.r * 0.3, k.r);
    } else if (k.id === 'bolt') {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.2;
        ctx.fillRect(Math.cos(a) * 6 - 3, Math.sin(a) * 6 - 3, 6, 6);
      }
    } else if (k.id === 'panel') {
      ctx.beginPath();
      ctx.moveTo(-k.r, -k.r * 0.5);
      ctx.lineTo(k.r * 0.8, -k.r * 0.7);
      ctx.lineTo(k.r, k.r * 0.6);
      ctx.lineTo(-k.r * 0.7, k.r * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (k.id === 'motor') {
      ctx.beginPath();
      ctx.arc(0, 0, k.r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a4450';
      ctx.fillRect(-4, -k.r, 8, k.r * 2);
    } else {
      ctx.shadowColor = '#6ec8ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, k.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // hp bar
    if (hpRatio < 0.99) {
      ctx.rotate(-p.rot);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-12, k.r + 4, 24, 4);
      ctx.fillStyle = hpRatio > 0.4 ? '#4ecdc4' : '#e07050';
      ctx.fillRect(-12, k.r + 4, 24 * hpRatio, 4);
    }
    ctx.restore();
  }

  function getRunParts() { return runParts; }
  function isEnded() { return ended; }

  return { reset, update, draw, setPointer, clawRadius, getRunParts, isEnded, get claw() { return claw; } };
})();
