/* Scrap Nest — trees, goals, helpers. Buy-once nodes, not helper spam. */
'use strict';

const SAVE_KEY = 'scrap-nest-v1';
const CACHE_BUMP = 'scrap-nest-v1';

/** Upgrade Map — main claw / yard branch */
const TREE = [
  // id, name, desc, cost, req[], x, y (0-100 map %), fx
  { id: 'reach1', name: 'Wider Claw', desc: 'Claw radius +20%', cost: 12, req: [], x: 50, y: 88, fx: { reach: 1.2 } },
  { id: 'teeth1', name: 'Sharp Teeth', desc: 'Shred power +40%', cost: 18, req: ['reach1'], x: 28, y: 74, fx: { shred: 1.4 } },
  { id: 'cell1', name: 'Bigger Cell', desc: 'Power capacity +8s', cost: 22, req: ['reach1'], x: 72, y: 74, fx: { power: 8 } },
  { id: 'spawn1', name: 'Junk Rain', desc: 'Scrap piles spawn faster', cost: 35, req: ['teeth1'], x: 18, y: 58, fx: { spawn: 1.35 } },
  { id: 'magnet1', name: 'Part Magnet', desc: 'Parts drift toward claw', cost: 40, req: ['teeth1', 'cell1'], x: 50, y: 58, fx: { magnet: 1 } },
  { id: 'reach2', name: 'Long Arm', desc: 'Claw radius +30%', cost: 55, req: ['cell1'], x: 82, y: 58, fx: { reach: 1.3 } },
  { id: 'teeth2', name: 'Carbide Jaws', desc: 'Shred power +60%', cost: 70, req: ['spawn1', 'magnet1'], x: 32, y: 42, fx: { shred: 1.6 } },
  { id: 'cell2', name: 'Deep Battery', desc: 'Power capacity +12s', cost: 80, req: ['magnet1', 'reach2'], x: 68, y: 42, fx: { power: 12 } },
  { id: 'auto', name: 'Auto-Claw', desc: 'Idle shred while away from Nest', cost: 120, req: ['teeth2'], x: 20, y: 26, fx: { auto: 1 } },
  { id: 'value1', name: 'Appraiser Eye', desc: 'Parts per scrap +1', cost: 100, req: ['teeth2', 'cell2'], x: 50, y: 26, fx: { value: 1 } },
  { id: 'spawn2', name: 'Scrap Surge', desc: 'Even denser piles', cost: 110, req: ['cell2'], x: 80, y: 26, fx: { spawn: 1.4 } },
  { id: 'nestup1', name: 'Cozy Blanket', desc: 'Nest looks warmer; cats happier', cost: 60, req: ['magnet1'], x: 50, y: 72, fx: { nest: 1 }, side: true },
  { id: 'nestup2', name: 'Lamp Post', desc: 'Soft lamp in the Nest', cost: 90, req: ['nestup1', 'value1'], x: 50, y: 14, fx: { nest: 2 } },
  { id: 'reach3', name: 'Yard Sweep', desc: 'Claw radius +40%', cost: 180, req: ['auto', 'value1'], x: 32, y: 10, fx: { reach: 1.4 } },
  { id: 'teeth3', name: 'Plasma Edge', desc: 'Shred power +80%', cost: 200, req: ['value1', 'spawn2'], x: 68, y: 10, fx: { shred: 1.8 } },
  { id: 'prestige_gate', name: 'Nest Anchor', desc: 'Unlock Nest Reset (prestige)', cost: 250, req: ['nestup2', 'reach3'], x: 50, y: 2, fx: { prestigeUnlock: 1 } },
];

/** Prestige permanent buffs — spend Nest Relics */
const PRESTIGE = [
  { id: 'pr_parts', name: 'Salvage Sense', desc: '+10% parts forever', cost: 1, req: [], x: 50, y: 85, fx: { partMult: 0.1 } },
  { id: 'pr_power', name: 'Evercell', desc: '+5s base power', cost: 1, req: [], x: 25, y: 70, fx: { basePower: 5 } },
  { id: 'pr_reach', name: 'Ghost Reach', desc: '+8% claw size forever', cost: 2, req: ['pr_parts'], x: 75, y: 70, fx: { reachMult: 0.08 } },
  { id: 'pr_bot1', name: 'Sweeper Bot', desc: 'Unlock helper: Sweeper Bot branch', cost: 3, req: ['pr_parts', 'pr_power'], x: 50, y: 50, fx: { helper: 'sweeper' } },
  { id: 'pr_shred', name: 'Hardened Teeth', desc: '+15% shred forever', cost: 2, req: ['pr_reach'], x: 80, y: 40, fx: { shredMult: 0.15 } },
  { id: 'pr_spawn', name: 'Junk Magnet Field', desc: '+20% spawn rate forever', cost: 3, req: ['pr_bot1'], x: 20, y: 40, fx: { spawnMult: 0.2 } },
  { id: 'pr_bot2', name: 'Grabber Bot', desc: 'Unlock helper: Grabber Bot branch', cost: 5, req: ['pr_bot1', 'pr_shred'], x: 50, y: 25, fx: { helper: 'grabber' } },
  { id: 'pr_value', name: 'Relic Appraiser', desc: '+1 base part per scrap', cost: 4, req: ['pr_spawn', 'pr_bot2'], x: 50, y: 10, fx: { baseValue: 1 } },
];

/** Helper bot branches — each bot has its own skill-tree */
const HELPERS = {
  sweeper: {
    name: 'Sweeper Bot',
    blurb: 'Circles the yard, nibbling scrap inside its own radius.',
    color: '#7ec8e3',
    tree: [
      { id: 'sw_on', name: 'Boot Sweeper', desc: 'Deploy Sweeper in the yard', cost: 40, req: [], x: 50, y: 80, fx: { botOn: 1 } },
      { id: 'sw_reach', name: 'Brush Span', desc: 'Sweeper radius +25%', cost: 60, req: ['sw_on'], x: 30, y: 55, fx: { botReach: 1.25 } },
      { id: 'sw_power', name: 'Motor Teeth', desc: 'Sweeper shred +50%', cost: 70, req: ['sw_on'], x: 70, y: 55, fx: { botShred: 1.5 } },
      { id: 'sw_speed', name: 'Zip Wheels', desc: 'Sweeper moves faster', cost: 90, req: ['sw_reach', 'sw_power'], x: 50, y: 30, fx: { botSpeed: 1.5 } },
      { id: 'sw_share', name: 'Part Link', desc: 'Sweeper finds +1 part/scrap', cost: 120, req: ['sw_speed'], x: 50, y: 10, fx: { botValue: 1 } },
    ],
  },
  grabber: {
    name: 'Grabber Bot',
    blurb: 'Snags high-value scrap and pulls it into your claw.',
    color: '#e3a87e',
    tree: [
      { id: 'gr_on', name: 'Boot Grabber', desc: 'Deploy Grabber in the yard', cost: 80, req: [], x: 50, y: 80, fx: { botOn: 1 } },
      { id: 'gr_rare', name: 'Rare Nose', desc: 'Prioritizes rich piles', cost: 100, req: ['gr_on'], x: 35, y: 50, fx: { botRare: 1 } },
      { id: 'gr_pull', name: 'Tow Cable', desc: 'Drags scrap into your claw', cost: 110, req: ['gr_on'], x: 65, y: 50, fx: { botPull: 1 } },
      { id: 'gr_value', name: 'Premium Grip', desc: '+2 parts on grabber kills', cost: 150, req: ['gr_rare', 'gr_pull'], x: 50, y: 20, fx: { botValue: 2 } },
    ],
  },
};

const GOALS = [
  { id: 'g1', text: 'Shred your first scrap pile', check: s => s.stats.piles >= 1 },
  { id: 'g2', text: 'Earn 20 parts in one cycle', check: s => s.stats.bestCycle >= 20 },
  { id: 'g3', text: 'Buy Wider Claw on the Upgrade Map', check: s => !!s.bought.reach1 },
  { id: 'g4', text: 'Buy 3 Upgrade Map nodes', check: s => Object.keys(s.bought).length >= 3 },
  { id: 'g5', text: 'Pet a Nest cat', check: s => s.stats.pets >= 1 },
  { id: 'g6', text: 'Unlock Nest Anchor (prestige gate)', check: s => !!s.bought.prestige_gate },
  { id: 'g7', text: 'Perform a Nest Reset', check: s => s.stats.resets >= 1 },
  { id: 'g8', text: 'Boot the Sweeper Bot', check: s => !!(s.helperBought.sw_on) },
];

const SCRAP_KINDS = [
  { id: 'tin', name: 'Tin Can', hp: 8, parts: 1, r: 14, color: '#9a9ea6' },
  { id: 'bolt', name: 'Bolt Heap', hp: 14, parts: 2, r: 16, color: '#7a7060' },
  { id: 'panel', name: 'Rust Panel', hp: 22, parts: 3, r: 20, color: '#c07040' },
  { id: 'motor', name: 'Dead Motor', hp: 40, parts: 6, r: 22, color: '#5a6a78' },
  { id: 'core', name: 'Glow Core', hp: 55, parts: 12, r: 18, color: '#6ec8ff' },
];

function defaultState() {
  return {
    parts: 0,
    relics: 0,
    bought: {},
    prestige: {},
    helperBought: {},
    nestLevel: 0,
    helpersUnlocked: [],
    stats: { piles: 0, bestCycle: 0, pets: 0, resets: 0, lifetimeParts: 0 },
    goalsDone: {},
    tutDone: false,
    mute: false,
    music: true,
  };
}

function applyFx(list, boughtSet) {
  const out = {
    reach: 1, shred: 1, power: 0, spawn: 1, magnet: 0, auto: 0, value: 0, nest: 0,
    partMult: 0, basePower: 0, reachMult: 0, shredMult: 0, spawnMult: 0, baseValue: 0,
  };
  for (const n of list) {
    if (!boughtSet[n.id] || !n.fx) continue;
    for (const [k, v] of Object.entries(n.fx)) {
      if (k === 'helper' || k === 'prestigeUnlock' || k === 'nest') {
        if (k === 'nest') out.nest = Math.max(out.nest, v);
        continue;
      }
      if (typeof v === 'number') {
        if (k.endsWith('Mult') || k === 'partMult' || k === 'reachMult' || k === 'shredMult' || k === 'spawnMult') out[k] = (out[k] || 0) + v;
        else if (k === 'reach' || k === 'shred' || k === 'spawn' || k === 'botReach' || k === 'botShred' || k === 'botSpeed') out[k] = (out[k] || 1) * v;
        else out[k] = (out[k] || 0) + v;
      }
    }
  }
  return out;
}

function helperFx(helperId, bought) {
  const h = HELPERS[helperId];
  if (!h) return {};
  const out = { botOn: 0, botReach: 1, botShred: 1, botSpeed: 1, botValue: 0, botRare: 0, botPull: 0 };
  for (const n of h.tree) {
    if (!bought[n.id] || !n.fx) continue;
    for (const [k, v] of Object.entries(n.fx)) {
      if (k === 'botOn' || k === 'botRare' || k === 'botPull' || k === 'botValue') out[k] = (out[k] || 0) + v;
      else out[k] = (out[k] || 1) * v;
    }
  }
  return out;
}

function canBuy(node, bought, parts) {
  if (bought[node.id]) return false;
  if (parts < node.cost) return false;
  return (node.req || []).every(r => bought[r]);
}

function relicsForReset(state) {
  // Soft prestige: based on lifetime + current parts + nodes bought
  const nodes = Object.keys(state.bought).length;
  const life = state.stats.lifetimeParts + state.parts;
  const raw = Math.floor(Math.sqrt(life / 80) + nodes / 4);
  return Math.max(0, raw);
}
