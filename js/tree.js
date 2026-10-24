/* Scrap Nest — visual skill / prestige / helper trees */
'use strict';

const TreeUI = (() => {
  function render(container, nodes, bought, currency, opts) {
    opts = opts || {};
    const currencyName = opts.currencyName || 'parts';
    const onBuy = opts.onBuy || (() => {});
    const color = opts.color || '#4ecdc4';

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'tree';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tree-lines');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    for (const n of nodes) {
      for (const r of (n.req || [])) {
        const a = byId[r];
        if (!a) continue;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', n.x); line.setAttribute('y2', n.y);
        const owned = !!bought[r] && !!bought[n.id];
        const unlocked = !!bought[r];
        line.setAttribute('class', owned ? 'owned' : unlocked ? 'open' : 'locked');
        svg.appendChild(line);
      }
    }
    wrap.appendChild(svg);

    for (const n of nodes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tnode';
      btn.style.left = n.x + '%';
      btn.style.top = n.y + '%';
      btn.style.setProperty('--nc', color);
      const owned = !!bought[n.id];
      const unlocked = (n.req || []).every(r => bought[r]);
      const afford = currency >= n.cost;
      if (owned) btn.classList.add('owned');
      else if (!unlocked) btn.classList.add('locked');
      else if (!afford) btn.classList.add('cant');
      else btn.classList.add('buyable');

      btn.innerHTML = `<b>${esc(n.name)}</b><small>${owned ? 'OWNED' : n.cost + ' ' + currencyName}</small>`;
      btn.title = n.desc;
      btn.addEventListener('click', () => {
        showSheet(n, owned, unlocked, afford, currencyName, () => onBuy(n));
      });
      wrap.appendChild(btn);
    }
    container.appendChild(wrap);
  }

  function showSheet(n, owned, unlocked, afford, currencyName, buyFn) {
    let sheet = document.getElementById('treeSheet');
    if (!sheet) return;
    sheet.classList.remove('hidden');
    sheet.innerHTML = `
      <div class="sheet-card">
        <h3>${esc(n.name)}</h3>
        <p>${esc(n.desc)}</p>
        <div class="sheet-meta">${owned ? 'Already owned' : unlocked ? (afford ? 'Cost: <b>' + n.cost + '</b> ' + currencyName : 'Need <b>' + n.cost + '</b> ' + currencyName) : 'Requires earlier nodes'}</div>
        <div class="sheet-actions">
          ${!owned && unlocked && afford ? '<button class="btn primary" id="sheetBuy">Buy</button>' : ''}
          <button class="btn" id="sheetClose">Close</button>
        </div>
      </div>`;
    sheet.querySelector('#sheetClose').onclick = () => sheet.classList.add('hidden');
    const buy = sheet.querySelector('#sheetBuy');
    if (buy) buy.onclick = () => { sheet.classList.add('hidden'); buyFn(); };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { render };
})();
