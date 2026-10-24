/* Scrap Nest — boot, nest hub, cats, cycle loop, prestige */
'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const cv = $('cv');
  const ctx = cv.getContext('2d');

  let state = load() || defaultState();
  let screen = 'nest'; // nest | yard
  let tab = 'home';
  let last = performance.now();
  let tutStep = state.tutDone ? -1 : 0;
  let tutTimer = 0;
  let hint = '';
  let hintT = 0;
  let nestCats = [
    { name: 'Pip', x: 0.28, y: 0.62, vx: 0.02, mood: 0, color: '#d4a574' },
    { name: 'Bolt', x: 0.68, y: 0.58, vx: -0.015, mood: 0, color: '#8a9bb0' },
  ];
  let pointerDown = false;
  let dpr = 1;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const d = defaultState();
      return Object.assign(d, s, {
        stats: Object.assign(d.stats, s.stats || {}),
        bought: s.bought || {},
        prestige: s.prestige || {},
        helperBought: s.helperBought || {},
        helpersUnlocked: s.helpersUnlocked || [],
        goalsDone: s.goalsDone || {},
      });
    } catch { return null; }
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }

  function computeFx() {
    const t = applyFx(TREE, state.bought);
    const p = applyFx(PRESTIGE, state.prestige);
    return {
      reach: t.reach,
      shred: t.shred,
      power: t.power,
      spawn: t.spawn,
      magnet: t.magnet,
      auto: t.auto,
      value: t.value,
      nest: t.nest,
      partMult: p.partMult || 0,
      basePower: p.basePower || 0,
      reachMult: p.reachMult || 0,
      shredMult: p.shredMult || 0,
      spawnMult: p.spawnMult || 0,
      baseValue: p.baseValue || 0,
      prestigeUnlock: !!state.bought.prestige_gate,
    };
  }

  function helperBundle() {
    const out = {};
    for (const id of state.helpersUnlocked) {
      out[id] = helperFx(id, state.helperBought);
    }
    // also unlock from prestige purchases
    for (const n of PRESTIGE) {
      if (state.prestige[n.id] && n.fx && n.fx.helper) {
        if (!state.helpersUnlocked.includes(n.fx.helper)) {
          state.helpersUnlocked.push(n.fx.helper);
        }
        out[n.fx.helper] = helperFx(n.fx.helper, state.helperBought);
      }
    }
    return out;
  }

  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(r.width * dpr);
    cv.height = Math.floor(r.height * dpr);
    cv.style.width = r.width + 'px';
    cv.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cssSize() {
    return { w: cv.width / dpr, h: cv.height / dpr };
  }

  function pointerPos(e) {
    const rect = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function onPointer(e, down) {
    if (screen !== 'yard') return;
    e.preventDefault();
    SFX.unlock();
    const p = pointerPos(e);
    if (down === true) pointerDown = true;
    if (down === false) pointerDown = false;
    // Keep on Mining style: hover/drag area always active while pointer present
    Yard.setPointer(p.x, p.y, true);
    if (tutStep === 0) { tutStep = 1; tutTimer = 0; }
  }

  cv.addEventListener('pointerdown', e => onPointer(e, true));
  cv.addEventListener('pointermove', e => onPointer(e, undefined));
  cv.addEventListener('pointerup', e => onPointer(e, false));
  cv.addEventListener('pointerleave', () => { if (screen === 'yard') Yard.setPointer(Yard.claw.x, Yard.claw.y, !!computeFx().auto); });

  function startCycle() {
    SFX.unlock();
    SFX.startMusic();
    const { w, h } = cssSize();
    Yard.reset(w, h, state.stats, computeFx(), helperBundle());
    screen = 'yard';
    $('nest').classList.add('hidden');
    $('hud').classList.remove('hidden');
    runPartsUI(0);
    if (!state.tutDone) {
      tutStep = Math.max(tutStep, 0);
      showTut();
    }
    save();
  }

  function endCycle() {
    const got = Yard.getRunParts();
    state.parts += got;
    state.stats.lifetimeParts += got;
    if (got > state.stats.bestCycle) state.stats.bestCycle = got;
    screen = 'nest';
    $('hud').classList.add('hidden');
    $('nest').classList.remove('hidden');
    setTab('home');
    showHint('+' + got + ' parts brought home');
    checkGoals();
    refreshNest();
    save();
    if (tutStep >= 1 && tutStep < 3) { tutStep = 2; showTut(); }
  }

  function runPartsUI(n) {
    $('runParts').textContent = String(Math.floor(n));
  }

  function refreshNest() {
    $('partsTxt').textContent = String(Math.floor(state.parts));
    $('relicTxt').textContent = String(Math.floor(state.relics));
    const relicChip = $('relicChip');
    if (state.relics > 0 || computeFx().prestigeUnlock || state.stats.resets > 0) {
      relicChip.classList.remove('hidden');
    } else relicChip.classList.add('hidden');

    const fx = computeFx();
    $('digSub').textContent = Math.round(18 + fx.power + fx.basePower) + 's power · drag claw over scrap';
    renderGoalCard();
    renderNestScene();
    updateTabsVisibility();
    $('btnMute').textContent = state.mute ? 'Unmute' : 'Mute';
    $('btnMusic').textContent = state.music ? 'Music on' : 'Music off';
  }

  function updateTabsVisibility() {
    const fx = computeFx();
    $('tabBtnRelic').classList.toggle('hidden', !(fx.prestigeUnlock || state.stats.resets > 0 || state.relics > 0));
    const hasHelper = state.helpersUnlocked.length > 0 || PRESTIGE.some(n => state.prestige[n.id] && n.fx && n.fx.helper);
    $('tabBtnBot').classList.toggle('hidden', !hasHelper);
  }

  function renderGoalCard() {
    const g = currentGoal();
    const el = $('goalCard');
    if (!g) {
      el.innerHTML = '<div class="goal-done">All starter goals complete. Keep shredding.</div>';
      $('goalChip').classList.add('hidden');
      return;
    }
    el.innerHTML = `<div class="goal-label">Goal</div><div class="goal-text">${g.text}</div>`;
    $('goalChip').classList.remove('hidden');
    $('goalChipTxt').textContent = g.text;
  }

  function currentGoal() {
    for (const g of GOALS) {
      if (!state.goalsDone[g.id]) return g;
    }
    return null;
  }

  function checkGoals() {
    for (const g of GOALS) {
      if (!state.goalsDone[g.id] && g.check(state)) {
        state.goalsDone[g.id] = true;
        showHint('Goal: ' + g.text);
        SFX.buy();
      }
    }
    renderGoalCard();
  }

  function renderNestScene() {
    const fx = computeFx();
    const nest = $('nestScene');
    nest.dataset.level = String(fx.nest || 0);
    // cats drawn on canvas overlay in nest mode via CSS positions updated
    const layer = $('catLayer');
    layer.innerHTML = '';
    const { w, h } = nest.getBoundingClientRect();
    for (const c of nestCats) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cat';
      el.style.left = (c.x * 100) + '%';
      el.style.top = (c.y * 100) + '%';
      el.style.setProperty('--cc', c.color);
      el.setAttribute('aria-label', 'Pet ' + c.name);
      el.innerHTML = `<span class="cat-body"></span><span class="cat-name">${c.name}</span>`;
      el.onclick = () => petCat(c);
      layer.appendChild(el);
    }
  }

  function petCat(c) {
    SFX.pet();
    c.mood = 1;
    state.stats.pets++;
    showHint(c.name + ' purrs');
    checkGoals();
    save();
  }

  function setTab(name) {
    tab = name;
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('on'));
    const panel = $('tab-' + name);
    if (panel) panel.classList.remove('hidden');
    const btn = document.querySelector('.tabbtn[data-tab="' + name + '"]');
    if (btn) btn.classList.add('on');
    if (name === 'map') renderMainTree();
    if (name === 'relic') renderPrestige();
    if (name === 'bot') renderHelperTrees();
    if (name === 'home') refreshNest();
  }

  function renderMainTree() {
    TreeUI.render($('upMap'), TREE, state.bought, state.parts, {
      currencyName: 'parts',
      color: '#4ecdc4',
      onBuy: (n) => {
        if (!canBuy(n, state.bought, state.parts)) { SFX.deny(); return; }
        state.parts -= n.cost;
        state.bought[n.id] = true;
        if (n.fx && n.fx.nest) state.nestLevel = Math.max(state.nestLevel, n.fx.nest);
        SFX.buy();
        checkGoals();
        refreshNest();
        renderMainTree();
        save();
        if (tutStep === 2) { tutStep = 3; state.tutDone = true; showTut(); }
      },
    });
  }

  function renderPrestige() {
    const gain = relicsForReset(state);
    $('caveCard').innerHTML = `
      <h3>Nest Reset</h3>
      <p>Trade your Upgrade Map progress for <b>Nest Relics</b>. Parts &amp; map nodes reset; relics &amp; helper unlocks stay.</p>
      <p class="relic-gain">This reset would grant <b>${gain}</b> relics.</p>
      <button class="btn danger" id="btnReset" ${gain < 1 ? 'disabled' : ''}>Reset Nest (+${gain} relics)</button>
    `;
    const br = $('btnReset');
    if (br) br.onclick = doPrestige;
    TreeUI.render($('prMap'), PRESTIGE, state.prestige, state.relics, {
      currencyName: 'relics',
      color: '#c080ff',
      onBuy: (n) => {
        if (!canBuy(n, state.prestige, state.relics)) { SFX.deny(); return; }
        state.relics -= n.cost;
        state.prestige[n.id] = true;
        if (n.fx && n.fx.helper && !state.helpersUnlocked.includes(n.fx.helper)) {
          state.helpersUnlocked.push(n.fx.helper);
          showHint('Unlocked ' + HELPERS[n.fx.helper].name);
        }
        SFX.buy();
        checkGoals();
        refreshNest();
        renderPrestige();
        save();
      },
    });
  }

  function doPrestige() {
    const gain = relicsForReset(state);
    if (gain < 1) { SFX.deny(); return; }
    if (!confirm('Nest Reset? You get ' + gain + ' relics. Upgrade Map and parts clear. Prestige & helpers stay.')) return;
    state.relics += gain;
    state.parts = 0;
    state.bought = {};
    state.nestLevel = 0;
    state.stats.resets++;
    SFX.prestige();
    showHint('Nest Reset! +' + gain + ' relics');
    checkGoals();
    refreshNest();
    renderPrestige();
    save();
  }

  function renderHelperTrees() {
    const box = $('botMaps');
    box.innerHTML = '';
    const unlocked = new Set(state.helpersUnlocked);
    for (const n of PRESTIGE) {
      if (state.prestige[n.id] && n.fx && n.fx.helper) unlocked.add(n.fx.helper);
    }
    if (unlocked.size === 0) {
      box.innerHTML = '<p class="empty">Unlock a helper bot on the Relic map first.</p>';
      return;
    }
    for (const id of unlocked) {
      const h = HELPERS[id];
      if (!h) continue;
      const sec = document.createElement('div');
      sec.className = 'bot-sec';
      sec.innerHTML = `<h3 style="color:${h.color}">${h.name}</h3><p class="bot-blurb">${h.blurb}</p><div class="mapwrap" id="botmap-${id}"></div>`;
      box.appendChild(sec);
      TreeUI.render(sec.querySelector('.mapwrap'), h.tree, state.helperBought, state.parts, {
        currencyName: 'parts',
        color: h.color,
        onBuy: (n) => {
          if (!canBuy(n, state.helperBought, state.parts)) { SFX.deny(); return; }
          state.parts -= n.cost;
          state.helperBought[n.id] = true;
          SFX.buy();
          checkGoals();
          refreshNest();
          renderHelperTrees();
          save();
        },
      });
    }
  }

  function showHint(msg) {
    hint = msg; hintT = 2.2;
    const el = $('hint');
    el.textContent = msg;
    el.style.opacity = '1';
  }

  function showTut() {
    const tut = $('tut');
    if (tutStep < 0 || state.tutDone && tutStep >= 3) {
      tut.classList.add('hidden');
      return;
    }
    const lines = [
      'Drag your finger — the claw shreds anything inside the ring.',
      'Power drains. When it hits zero you return to the Nest with parts.',
      'Spend parts on the Upgrade Map. Bigger claw, sharper teeth.',
      'Nice! Keep cycling. Nest Reset unlocks helper bots later.',
    ];
    if (tutStep >= lines.length) { tut.classList.add('hidden'); state.tutDone = true; save(); return; }
    tut.classList.remove('hidden');
    $('tutTxt').textContent = lines[tutStep];
  }

  $('tutSkip').onclick = () => { state.tutDone = true; tutStep = -1; $('tut').classList.add('hidden'); save(); };
  $('btnDig').onclick = () => startCycle();
  $('btnSurface').onclick = () => {
    // early return keeps earned parts
    if (screen === 'yard') {
      // force end but keep power leftover unused
      endCycle();
    }
  };
  $('btnMute').onclick = () => {
    state.mute = !state.mute;
    SFX.setMute(state.mute);
    refreshNest();
    save();
  };
  $('btnMusic').onclick = () => {
    state.music = !state.music;
    SFX.setMusic(state.music);
    refreshNest();
    save();
  };
  $('btnMuteRun').onclick = () => {
    state.mute = !state.mute;
    SFX.setMute(state.mute);
    $('btnMuteRun').textContent = state.mute ? 'Unmute' : 'Mute';
    save();
  };
  document.querySelectorAll('.tabbtn').forEach(b => {
    b.addEventListener('click', () => setTab(b.dataset.tab));
  });
  $('btnResetSave').onclick = () => {
    if (!confirm('Wipe all Scrap Nest save data?')) return;
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    refreshNest();
    setTab('home');
    showHint('Save wiped');
  };

  function drawNestBg() {
    // nest decorative canvas behind UI? We use CSS scene; optional sparkle on cv when nest
    const { w, h } = cssSize();
    ctx.clearRect(0, 0, w, h);
    const fx = computeFx();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (fx.nest >= 2) {
      g.addColorStop(0, '#2a2038');
      g.addColorStop(1, '#1a1428');
    } else if (fx.nest >= 1) {
      g.addColorStop(0, '#2a2418');
      g.addColorStop(1, '#1a1612');
    } else {
      g.addColorStop(0, '#221c18');
      g.addColorStop(1, '#14100e');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // soft lamp
    if (fx.nest >= 2) {
      const lg = ctx.createRadialGradient(w * 0.5, h * 0.2, 10, w * 0.5, h * 0.35, w * 0.55);
      lg.addColorStop(0, 'rgba(255,210,140,0.25)');
      lg.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
    }
    // blanket
    if (fx.nest >= 1) {
      ctx.fillStyle = 'rgba(180,90,90,0.35)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.72, w * 0.35, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();

    if (hintT > 0) {
      hintT -= dt;
      if (hintT <= 0) $('hint').style.opacity = '0';
    }

    // nest cats wander
    if (screen === 'nest') {
      for (const c of nestCats) {
        c.x += c.vx * dt;
        if (c.x < 0.15 || c.x > 0.85) c.vx *= -1;
        if (c.mood > 0) c.mood -= dt;
      }
      // throttle DOM cat moves
      if ((now / 200 | 0) !== ((now - dt * 1000) / 200 | 0)) {
        document.querySelectorAll('.cat').forEach((el, i) => {
          const c = nestCats[i];
          if (!c) return;
          el.style.left = (c.x * 100) + '%';
          el.classList.toggle('happy', c.mood > 0);
        });
      }
      drawNestBg();
    }

    if (screen === 'yard') {
      const st = Yard.update(dt);
      Yard.draw(ctx);
      runPartsUI(st.runParts);
      const pct = Math.max(0, st.power / st.powerMax);
      $('powerFill').style.width = (pct * 100) + '%';
      $('powerTxt').textContent = Math.ceil(st.power) + 's';
      $('powerFill').classList.toggle('low', pct < 0.25);
      if (st.ended) endCycle();
      // guided first 30s
      if (!state.tutDone && tutStep === 1) {
        tutTimer += dt;
        if (tutTimer > 8) { tutStep = 2; /* wait until nest */ }
      }
    }

    requestAnimationFrame(loop);
  }

  // boot
  SFX.setMute(state.mute);
  SFX.setMusic(state.music);
  window.addEventListener('resize', resize);
  resize();
  refreshNest();
  setTab('home');
  if (!state.tutDone) showTut();
  // register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  requestAnimationFrame(loop);
})();
