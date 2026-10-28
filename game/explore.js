'use strict';
/* Daily Random Dungeon - explore: the seeded tile world (walking, fog, scouting, structures, points of interest, discovery XP). */
(function (root) {
const E = root.Engine;
const D = root.DATA;
const { RNG, RANKS, CAREER_RANKS, STATS, RACE_BY, PROF_BY, genItem, genUnknownRelic, xpNeeded, addXp, hasTalent } = E;
const T = E.Terrain;

const POI = {
  spring: { name: 'Spring', icon: '⛲', blurb: 'Clear water that mends the weary.' },
  shrine: { name: 'Shrine', icon: '🕯️', blurb: 'A quiet altar. Something listens.' },
  ruins: { name: 'Ruins', icon: '🏛️', blurb: 'Crumbling stone and old secrets.' },
  grove: { name: 'Grove', icon: '🌿', blurb: 'Rich growth, good for foraging.' },
  mine: { name: 'Old Mine', icon: '⛏️', blurb: 'Ore and crystal in the rock.' },
  trader: { name: 'Trader Camp', icon: '🏕️', blurb: 'A wandering trader sets up here.' },
  hermit: { name: 'Wanderer', icon: '🧙', blurb: 'A stranger with a story.' },
  waystone: { name: 'Waystone', icon: '🗿', blurb: 'Attune to it for fast travel.' },
  lair: { name: 'Monster Lair', icon: '🐲', blurb: 'A short, dangerous delve with a rich hoard.', dungeon: true },
  vault: { name: 'Hidden Vault', icon: '💎', blurb: 'Nobody was meant to find this.', secret: true },
  racehold: { name: 'Homeland', icon: '🛖', blurb: 'The home of a people. An inn, a market, and elders who may honour you.', settlement: true },
  village: { name: 'Village', icon: '🏘️', blurb: 'An inn, a general store and a waystone. A safe place to rest.', settlement: true },
  town: { name: 'Town', icon: '🏙️', blurb: 'An inn, market, smithy, alchemist and a waystone.', settlement: true },
  dungeon: { name: 'Dungeon', icon: '🏰', blurb: 'A full dungeon with a guardian.', dungeon: true },
};
const SIGHT = 8;        // tiles you can see around you
const CHUNK = 16;       // explored-memory chunk size

// ---------- world state ----------
function randomSeedText() {
  const A = ['amber', 'brisk', 'cinder', 'dusk', 'ember', 'frost', 'gale', 'hollow', 'iron', 'jade', 'kelp', 'lunar', 'moss', 'north', 'onyx', 'pine'];
  const N = ['fox', 'peak', 'vale', 'reef', 'crown', 'thorn', 'field', 'ridge', 'brook', 'hollow', 'spire', 'shore'];
  return A[Math.floor(Math.random() * A.length)] + '-' + N[Math.floor(Math.random() * N.length)] + '-' + Math.floor(Math.random() * 9000 + 1000);
}
function worldOf(career) {
  if (career.world && career.world.v === 2) return career.world;
  const old = career.world;
  if (!career.wseed || /\|/.test(career.wseed)) career.wseed = randomSeedText();
  const w = { v: 2, seed: career.wseed, sid: T.normSeed(career.wseed), day: old ? old.day : 1, cost: 0, x: 0, y: 0, steps: 0, ex: {}, st: {}, pending: null, selected: null,
    disc: old && old.disc ? old.disc : { mon: {}, ev: {}, theme: {}, node: {} }, log: [] };
  if (!w.disc.node) w.disc.node = {};
  career.world = w;
  markView(w, 0, 0, SIGHT + 4);
  return w;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inTown = w => Math.hypot(w.x, w.y) <= 2.5;
function worldInTown(career) { return inTown(worldOf(career)); }
// Where a party can be joined: Hearthhold, or a village / town / homeland you are standing in. The area decides who is hiring.
function partyPlace(career) {
  const w = worldOf(career);
  if (inTown(w)) return { id: 'home', name: 'Hearthhold', kind: 'home', zone: 0 };
  const n = atNode(career);
  if (n && n.settlement && n.state !== 'hidden') return { id: n.id, name: n.name, kind: n.race ? 'racehold' : n.sub, zone: zoneAt(n.x, n.y) };
  return null;
}

// explored memory: 16x16 bit chunks, plain arrays so the save stays JSON
function exKey(x, y) { return Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK); }
function isEx(w, x, y) {
  const c = w.ex[exKey(x, y)]; if (!c) return false;
  const i = (((y % CHUNK) + CHUNK) % CHUNK) * CHUNK + (((x % CHUNK) + CHUNK) % CHUNK);
  return (c[i >> 3] >> (i & 7)) & 1;
}
function markEx(w, x, y) {
  const k = exKey(x, y); let c = w.ex[k];
  if (!c) { c = w.ex[k] = new Array(CHUNK * CHUNK / 8).fill(0); }
  const i = (((y % CHUNK) + CHUNK) % CHUNK) * CHUNK + (((x % CHUNK) + CHUNK) % CHUNK);
  const had = (c[i >> 3] >> (i & 7)) & 1;
  c[i >> 3] |= 1 << (i & 7);
  return !had;
}
function markView(w, cx, cy, r) {
  let n = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1 && markEx(w, cx + dx, cy + dy)) n++;
  return n;
}
function sightOf(career) {
  const prof = PROF_BY[career.char.prof];
  return SIGHT + (prof.scout ? 3 : 0) + (hasTalent(career.char, 'fated') ? 1 : 0);
}
function revealRadius(career, r, withStructs) {
  const w = worldOf(career);
  const n = markView(w, w.x, w.y, r);
  if (withStructs) for (const s of T.structuresIn(w.sid, w.x - r, w.y - r, w.x + r, w.y + r)) if (!s.secret && dist(s, w) <= r) upgrade(w, s, 'known');
  return n;
}

// ---------- structures ----------
const REACH = { hidden: 0, seen: 1, known: 2, visited: 3, cleared: 4 };
function stateOf(w, s) {
  const d = w.st[s.id];
  if (d && d.state) return d.state;
  return !s.secret && isEx(w, s.x, s.y) ? 'seen' : 'hidden';
}
function upgrade(w, s, st) {
  const cur = stateOf(w, s);
  if (REACH[cur] >= REACH[st]) return false;
  w.st[s.id] = Object.assign({}, w.st[s.id], { state: st });
  return true;
}
function nodeOf(career, id) {
  const w = worldOf(career);
  const s = T.structById(w.sid, id);
  if (!s) return null;
  const d = w.st[id] || {};
  return Object.assign({}, s, { state: stateOf(w, s), cd: d.cd, clears: d.clears, waystone: d.waystone });
}
function commit(career, n) {
  const w = worldOf(career);
  w.st[n.id] = { state: n.state, cd: n.cd, clears: n.clears, waystone: n.waystone };
}
function raise(n, st) { if (REACH[n.state] < REACH[st]) n.state = st; }
function structsNear(career, r) {
  const w = worldOf(career);
  return T.structuresIn(w.sid, w.x - r, w.y - r, w.x + r, w.y + r).map(s => nodeOf(career, s.id)).filter(n => n.state !== 'hidden');
}
function knownNodes(career, r) {
  const w = worldOf(career);
  return structsNear(career, r).filter(n => REACH[n.state] >= 2).sort((a, b) => dist(a, w) - dist(b, w));
}
const nodeRank = n => (n.rank || CAREER_RANKS[Math.max(0, n.ring || 0)]);
const zoneAt = (x, y) => T.zoneOf(x, y);

// ---------- hero helpers ----------
function hubOf(career) { return E.careerHub(career); }
function awardXp(career, amount) {
  if (amount <= 0 || career.char.level >= E.CAREER_MAX_LEVEL) return [];
  const hub = hubOf(career);
  const ups = addXp(hub, amount);
  career.char = hub.char;
  return ups;
}
const xpFor = (career, frac) => Math.round(xpNeeded(career.char.level, true) * frac);

// ---------- day tick ----------
function tickDays(career, n) {
  const w = worldOf(career);
  for (let i = 0; i < n; i++) {
    w.day++;
    if (w.day % 2 === 0 && career.char.injuries && career.char.injuries.length) {
      career.char.injuries = career.char.injuries.map(x => Object.assign({}, x, { left: x.left - 1 })).filter(x => x.left > 0);
    }
    if (w.day % 4 === 0) { career.boardN++; career.board = null; career.shop = null; career.rumor = false; }
    if (career.bank > 0) career.bank += Math.min(150, Math.floor(career.bank * 0.004));
  }
}

// ---------- encounters ----------
const ROAD = [
  { id: 'wolves', icon: '🐺', title: 'Hungry wolves', text: 'A pack shadows you on the road.', choices: [
    { label: 'Stand and fight (STR)', check: { stat: 'STR', dc: 0 }, win: { text: 'You drive them off and skin one.', mats: { bone: 2 }, xpFrac: 0.01 }, lose: { text: 'You scare them away but lose some supplies.', potions: -1 } },
    { label: 'Throw them rations', cost: { potion: 0 }, out: { text: 'They lose interest.', xpFrac: 0 } }] },
  { id: 'peddler', icon: '🛒', title: 'Roadside peddler', text: 'A peddler waves you down.', choices: [
    { label: 'Buy a potion (30g)', cost: { gold: 30 }, out: { text: 'Fair enough.', potions: 1 } },
    { label: 'Haggle (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'They throw in a bandage.', cons: { bandage: 2 } }, lose: { text: 'They shrug and pack up.' } },
    { label: 'Wave them off', out: { text: 'You move on.' } }] },
  { id: 'cache', icon: '📦', title: 'Abandoned cache', text: 'A half-buried supply cache by the road.', choices: [
    { label: 'Dig it out (STR)', check: { stat: 'STR', dc: -2 }, win: { text: 'Useful supplies.', gold: [20, 40], consRandom: 1 }, lose: { text: 'Rotted through.' } },
    { label: 'Search carefully (DEX)', check: { stat: 'DEX', dc: 0 }, win: { text: 'A hidden compartment.', item: { minRarity: 1 } }, lose: { text: 'Empty.' } }] },
  { id: 'scout', icon: '🧭', title: 'Lost scout', text: 'A guild scout shares what they know.', choices: [
    { label: 'Trade news', out: { text: 'They sketch the roads ahead.', reveal: 2, rep: 1 } }] },
  { id: 'lucky', icon: '🍀', title: 'A fortunate find', text: 'Something glints in the grass.', choices: [
    { label: 'Pick it up (LUK)', check: { stat: 'LUK', dc: -3 }, win: { text: 'A lost purse.', gold: [40, 90] }, lose: { text: 'Just a button.' } }] },
  { id: 'toll', icon: '🛡️', title: 'Bandit toll', text: 'Bandits demand a toll for the road.', choices: [
    { label: 'Pay 40g', cost: { gold: 40 }, out: { text: 'They let you pass.' } },
    { label: 'Intimidate (WIL)', check: { stat: 'WIL', dc: 0 }, win: { text: 'They back down. One drops a purse.', gold: [15, 35] }, lose: { text: 'They rough you up and take 10% of your gold.', goldLossPct: 0.1 } },
    { label: 'Slip past (AGI)', check: { stat: 'AGI', dc: -1 }, win: { text: 'You are gone before they notice.', xpFrac: 0.01 }, lose: { text: 'They snatch some gold.', goldLossPct: 0.06 } }] },
];
function mk(title, icon, text, choices, extra) { return Object.assign({ title, icon, text, choices }, extra || {}); }
function ringGold(node, a, b) { return [Math.round(a * (1 + node.ring * 0.5)), Math.round(b * (1 + node.ring * 0.5))]; }
function makeEncounter(career, node, rng) {
  const g = (a, b) => ringGold(node, a, b);
  const ring = Math.max(0, node.ring);
  switch (node.sub) {
    case 'spring': return mk(node.name, '⛲', 'Cold, clear water pools between mossy stones.', [
      { label: 'Drink deeply', out: { text: 'Your aches fade. Injuries heal.', cure: true, potions: 1 } },
      { label: 'Bottle the water', out: { text: 'You fill your flasks.', cons: { bandage: 2 } } },
      { label: 'Meditate by the water (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'A calm clarity settles over you.', bless: true, xpFrac: 0.04 }, lose: { text: 'Only ripples.' } }]);
    case 'shrine': return mk(node.name, '🕯️', 'A weathered altar, cold candles, and the feeling of being watched.', [
      { label: 'Pray (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'Warmth flows through you.', bless: true, xpFrac: 0.03 }, lose: { text: 'The shrine is silent.' } },
      { label: `Offer ${40 + ring * 30} gold`, cost: { gold: 40 + ring * 30 }, luckW: true, out: { rand: [[1, { text: 'A vision of your own potential.', stat: 1 }], [3, { text: 'A blessing and a gift.', bless: true, credits: 2 }], [6, { text: 'A faint warmth.', xpFrac: 0.04 }]] } },
      { label: 'Take the offerings (STR)', check: { stat: 'STR', dc: 1 }, win: { text: 'You pocket old coins and a relic.', gold: g(40, 70), relic: true }, lose: { text: 'A chill follows you. You drop some gold.', goldLossPct: 0.08 } }]);
    case 'ruins': return mk(node.name, '🏛️', 'Half-collapsed halls and glyph-covered walls.', [
      { label: 'Search the rubble (DEX)', check: { stat: 'DEX', dc: 0 }, win: { text: 'Beneath a slab you find something good.', item: { minRarity: 1 }, matsRandom: 2 }, lose: { text: 'You find scraps.', matsRandom: 1 } },
      { label: 'Decipher the glyphs (INT)', check: { stat: 'INT', dc: 1 }, win: { text: 'A lost lesson, written in stone.', skillbook: true, xpFrac: 0.05 }, lose: { text: 'You make partial sense of it.', xpFrac: 0.015 } },
      { label: 'Dig carefully (VIT)', check: { stat: 'VIT', dc: 0 }, win: { text: 'An unknown relic.', relic: true }, lose: { text: 'The dig yields nothing.' } }]);
    case 'grove': return mk(node.name, '🌿', 'Moss, herbs, and quiet bird calls.', [
      { label: 'Forage carefully (AGI)', check: { stat: 'AGI', dc: -1 }, win: { text: 'A bountiful harvest.', matsRandom: 4 + ring, consRandom: 1 }, lose: { text: 'Slim pickings.', matsRandom: 1 } },
      { label: 'Rest under the trees', out: { text: 'A restful afternoon.', potions: 1, cure: true } },
      { label: 'Follow strange tracks (LUK)', check: { stat: 'LUK', dc: -1 }, win: { text: 'The tracks lead to a hidden cache.', item: { minRarity: 1 }, gold: g(20, 50) }, lose: { text: 'The trail goes cold.' } }]);
    case 'mine': return mk(node.name, '⛏️', 'Rusted tracks lead into the dark.', [
      { label: 'Work the vein (STR)', check: { stat: 'STR', dc: -1 }, win: { text: 'A heavy load of ore.', matsRandom: 5 + ring }, lose: { text: 'You chip out a little.', matsRandom: 1 } },
      { label: 'Look for gems (LUK)', check: { stat: 'LUK', dc: 0 }, win: { text: 'A glittering seam.', gold: g(60, 120), matsRandom: 2 }, lose: { text: 'Plain rock.' } },
      { label: 'Salvage the old tools', out: { text: 'Some usable scrap.', matsRandom: 2 } }]);
    case 'trader': return mk(node.name, '🏕️', 'A cheerful trader with a laden cart.', [
      { label: `Buy a tome (${90 + ring * 30}g)`, cost: { gold: 90 + ring * 30 }, out: { text: 'A well-thumbed tome.', skillbook: true } },
      { label: 'Buy 3 potions (50g)', cost: { gold: 50 }, out: { text: 'Fresh brews.', potions: 3 } },
      { label: `Buy a mystery relic (${110 + ring * 40}g)`, cost: { gold: 110 + ring * 40 }, out: { text: 'Wrapped in cloth, humming faintly.', relic: true } },
      { label: 'Trade gossip (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'They pay for your stories.', gold: g(40, 80), reveal: 2 }, lose: { text: 'Nothing new.' } }], { cd: 10 });
    case 'hermit': {
      const v = rng.int(0, 3);
      if (v === 0) return mk('Veteran Hermit', '🧓', 'A scarred veteran tends a tiny fire.', [
        { label: `Study under them (${60 + ring * 40}g)`, cost: { gold: 60 + ring * 40 }, out: { text: 'Hard-won lessons.', skillpt: 1 } },
        { label: 'Share a meal', out: { text: 'Stories and stew.', xpFrac: 0.04, rep: 1 } },
        { label: 'Spar (STR)', check: { stat: 'STR', dc: 1 }, win: { text: 'They nod, impressed.', xpFrac: 0.06 }, lose: { text: 'You learn by getting hit.', xpFrac: 0.02 } }]);
      if (v === 1) return mk('Wandering Smith', '🔨', 'A smith with a portable anvil.', [
        { label: 'Ask for a tune-up (free)', out: { text: 'They sharpen your weapon.', upgrade: true } },
        { label: 'Trade scrap (give 1 potion)', cost: { potion: 1 }, out: { text: 'They hand over spare parts.', matsRandom: 4 } }]);
      if (v === 2) return mk('Stranded Traveller', '🧳', 'A traveller with a broken wheel and a long face.', [
        { label: 'Help repair it (DEX)', check: { stat: 'DEX', dc: -1 }, win: { text: 'They pay you well and spread your name.', gold: g(40, 80), rep: 3 }, lose: { text: 'You try your best.', rep: 1 } },
        { label: 'Give them a potion', cost: { potion: 1 }, out: { text: 'They are grateful.', rep: 2, credits: 1 } }]);
      return mk('Wandering Scholar', '📜', 'A scholar surrounded by maps.', [
        { label: 'Trade maps', out: { text: 'They mark the nearby paths.', reveal: 3 } },
        { label: 'Ask about the old world (INT)', check: { stat: 'INT', dc: 0 }, win: { text: 'A fascinating account.', xpFrac: 0.05, credits: 2 }, lose: { text: 'Over your head.', xpFrac: 0.01 } }]);
    }
    case 'waystone': return mk(node.name, '🗿', 'A humming standing stone etched with routes.', [
      { label: node.waystone ? 'Study the routes again' : 'Attune to the stone', out: { text: node.waystone ? 'The map in your mind sharpens.' : 'The stone answers. You can now travel between waystones in a day.', waystone: true, reveal: 3, xpFrac: 0.03 } }]);
    case 'vault': return mk(node.name, '💎', 'A sealed door, long forgotten.', [
      { label: 'Pick the lock (DEX)', check: { stat: 'DEX', dc: 1 }, win: { text: 'It opens.', item: { minRarity: 3 }, credits: 4 + ring, gold: g(80, 140) }, lose: { text: 'The lock holds, but you pry out a prize.', item: { minRarity: 2 } } },
      { label: 'Study the runes (INT)', check: { stat: 'INT', dc: 1 }, win: { text: 'The runes yield a secret.', item: { minRarity: 3 }, skillpt: 1 }, lose: { text: 'A trap spits gold at you.', gold: g(40, 80) } }]);
    default: return mk(node.name, '❔', 'Nothing here.', [{ label: 'Leave', out: { text: 'You move on.' } }]);
  }
}

// ---------- outcome application ----------
function pickMat(career, node, rng) {
  const themes = D.THEMES.filter(t => t.rankMin <= Math.max(0, node.ring));
  return rng.pick(rng.pick(themes).mat);
}
function applyOut(career, node, out, res, rng, ctx) {
  if (!out) return;
  if (out.rand) {
    let total = 0; const ws = out.rand.map((e, i) => { const wgt = e[0] * (i === 0 && ctx.luckW ? 1 + ctx.luck * 0.04 : 1); total += wgt; return wgt; });
    let r = rng.next() * total, chosen = out.rand[out.rand.length - 1][1];
    for (let i = 0; i < out.rand.length; i++) { r -= ws[i]; if (r < 0) { chosen = out.rand[i][1]; break; } }
    applyOut(career, node, chosen, res, rng, ctx);
  }
  const rk = RANKS[nodeRank(node)], ring = Math.max(0, node.ring);
  const lootCtx = { heat: 1 + ring, luck: ctx.luck, rankMul: Math.pow(rk.cs, 0.5), minRarity: out.item && out.item.minRarity || 0 };
  const stash = it => {
    if (career.stash.length >= 40) { const v = E.sellValue(it); career.gold += v; res.lines.push(`Stash full: sold ${E.itemTitle(it)} for ${v}g.`); } else career.stash.push(it);
    res.items.push(it);
  };
  if (out.text) res.lines.push(out.text);
  if (out.gold) { const v = Array.isArray(out.gold) ? rng.int(out.gold[0], out.gold[1]) : out.gold; const gg = Math.round(v * (ctx.revisit ? 0.5 : 1)); career.gold += gg; res.lines.push(`+${gg} gold.`); }
  if (out.goldLossPct) { const l = Math.floor(career.gold * out.goldLossPct); career.gold -= l; res.lines.push(`-${l} gold.`); }
  if (out.xpFrac) {
    const amt = xpFor(career, out.xpFrac * (ctx.revisit ? 0.35 : 1));
    if (amt > 0) { const ups = awardXp(career, amt); res.lines.push(`+${amt} XP.`); if (ups.length) res.lines.push(`Level up! Now level ${career.char.level}.`); }
  }
  if (out.potions) { career.potions = Math.max(0, Math.min(12, career.potions + out.potions)); res.lines.push(`${out.potions > 0 ? '+' : ''}${out.potions} potion${Math.abs(out.potions) > 1 ? 's' : ''}.`); }
  if (out.cons) for (const k in out.cons) { career.cons[k] = (career.cons[k] || 0) + out.cons[k]; res.lines.push(`+${out.cons[k]} ${D.CONSUMABLES[k].name}.`); }
  if (out.consRandom) {
    const ids = Object.keys(D.CONSUMABLES).filter(k => !D.CONSUMABLES[k].book);
    for (let i = 0; i < out.consRandom; i++) { const k = rng.pick(ids); career.cons[k] = (career.cons[k] || 0) + 1; res.lines.push(`+1 ${D.CONSUMABLES[k].name}.`); }
  }
  if (out.mats) for (const k in out.mats) { career.mats[k] = (career.mats[k] || 0) + out.mats[k]; res.lines.push(`+${out.mats[k]} ${D.MATERIALS[k].name}.`); }
  if (out.matsRandom) {
    const got = {};
    for (let i = 0; i < out.matsRandom; i++) { const k = pickMat(career, node, rng); got[k] = (got[k] || 0) + 1; career.mats[k] = (career.mats[k] || 0) + 1; }
    res.lines.push('Gathered: ' + Object.keys(got).map(k => `${got[k]}× ${D.MATERIALS[k].name}`).join(', ') + '.');
  }
  if (out.item) { const it = genItem(rng, lootCtx); stash(it); res.lines.push(`Found: ${E.itemTitle(it)}.`); }
  if (out.relic) { const it = genUnknownRelic(rng, lootCtx); stash(it); res.lines.push('You find an unknown relic.'); }
  if (out.skillbook) {
    const unk = D.BOOK_SKILLS.filter(id => !career.char.skills.includes(id));
    if (unk.length) { const id = rng.pick(unk); career.cons['book_' + id] = (career.cons['book_' + id] || 0) + 1; res.lines.push(`You gain a tome: ${D.SKILLS[id].name}.`); } else { career.credits += 4; res.lines.push('You know every tome. +4 Guild Credits.'); }
  }
  if (out.skillpt) { career.char.skillPts += out.skillpt; res.lines.push(`+${out.skillpt} skill point.`); }
  if (out.stat) { const s = rng.pick(STATS); career.char.stats[s] += out.stat; res.lines.push(`+${out.stat} ${s} permanently.`); }
  if (out.rep) { career.rep = Math.max(0, career.rep + out.rep); res.lines.push(`Guild reputation ${out.rep > 0 ? '+' : ''}${out.rep}.`); }
  if (out.credits) { career.credits += out.credits; res.lines.push(`+${out.credits} Guild Credits.`); }
  if (out.upgrade) {
    const w = career.equip.weapon;
    if (w && (w.up || 0) < 5) { w.up = (w.up || 0) + 1; res.lines.push(`${w.name} is now +${w.up}.`); } else res.lines.push('Your weapon cannot be improved further.');
  }
  if (out.cure) { if (career.char.injuries && career.char.injuries.length) { career.char.injuries = []; res.lines.push('Your injuries are healed.'); } }
  if (out.bless) { career.blessNext = true; res.lines.push('Blessed: +15% damage on your next expedition.'); }
  if (out.waystone) node.waystone = true;
  if (out.reveal) { const n = revealRadius(career, 6 + out.reveal * 4, true); res.lines.push(n ? 'The map fills in around you.' : 'You already know this land well.'); }
}
function rollCheck(career, stat, off, node) {
  const hub = hubOf(career);
  const val = hub.d.st[stat] || 0;
  const bonus = Math.floor(val / 2) + Math.floor(hub.d.st.LUK / 3);
  const rng = new RNG(worldOf(career).seed + '|chk|' + (node ? node.id : 'road') + '|' + worldOf(career).day + '|' + career.runs);
  const roll = rng.int(1, 20), dc = 9 + Math.floor(RANKS[node ? nodeRank(node) : 'F'].rec * 0.6) + (off || 0);
  return { ok: roll + bonus >= dc, roll, bonus, dc };
}

// ---------- public actions ----------
function setPending(career, node, ev, first) {
  const w = worldOf(career);
  w.pending = { nodeId: node ? node.id : null, ev, res: null, first: !!first };
}
function arrive(career, node, lines) {
  const w = worldOf(career);
  const first = !(w.disc.node[node.id]);
  w.disc.node[node.id] = 1;
  const discover = () => {
    const amt = xpFor(career, 0.03); const ups = awardXp(career, amt);
    lines.push(`Discovered ${node.name}! +${amt} XP.`); if (ups.length) lines.push(`Level up! Now level ${career.char.level}.`);
  };
  if (node.settlement) {
    raise(node, 'visited');
    const fresh = !node.waystone; node.waystone = true;
    if (first) discover();
    if (fresh) lines.push(`${node.name} is now a waypoint: you can fast-travel here.`);
    commit(career, node);
    return;
  }
  if (node.kind === 'dungeon') {
    raise(node, node.state === 'cleared' ? 'cleared' : 'known');
    if (first) discover();
    commit(career, node);
    return;
  }
  const usable = !node.cd || w.day >= node.cd;
  if (!usable) { raise(node, 'visited'); commit(career, node); lines.push(`${node.name} has been picked clean. Come back in ${node.cd - w.day} day(s).`); return; }
  const revisit = (node.state === 'visited' || node.state === 'cleared');
  raise(node, 'known');
  const rng = new RNG(w.seed + '|enc|' + node.id + '|' + (revisit ? w.day : 0));
  const ev = makeEncounter(career, node, rng);
  ev.revisit = revisit; ev.nodeName = node.name;
  if (first) discover();
  commit(career, node);
  setPending(career, node, ev, first);
}
function atNode(career) {
  const w = worldOf(career), s = T.structAt(w.sid, w.x, w.y);
  return s ? nodeOf(career, s.id) : null;
}
// One step on the grid. Returns { ok, msg, arrived, day, pending }.
function worldStep(career, dx, dy) {
  const w = worldOf(career);
  if (w.pending && !w.pending.res) return { ok: false, msg: 'Finish what you are doing here first.' };
  const nx = w.x + dx, ny = w.y + dy, c = T.cost(w.sid, nx, ny);
  if (!c) return { ok: false, msg: 'Deep water blocks the way.' };
  w.pending = null;
  w.x = nx; w.y = ny; w.steps++; w.cost += c;
  const lines = [];
  let day = false;
  while (w.cost >= 8) {
    w.cost -= 8; tickDays(career, 1); day = true;
    const rr = new RNG(w.seed + '|road|' + w.day);
    if (!w.pending && !inTown(w) && !T.structAt(w.sid, nx, ny) && rr.chance(0.17)) setPending(career, null, Object.assign({ road: true, nodeName: 'On the road' }, rr.pick(ROAD)), false);
  }
  markView(w, nx, ny, sightOf(career));
  for (const s of T.structuresIn(w.sid, nx - 5, ny - 5, nx + 5, ny + 5)) if (!s.secret && dist(s, w) <= 5) upgrade(w, s, 'known');
  let arrived = null;
  const s = T.structAt(w.sid, nx, ny);
  if (s) {
    arrived = nodeOf(career, s.id);
    if (arrived.state === 'hidden') { arrived.state = 'seen'; }
    arrive(career, arrived, lines);
    arrived = nodeOf(career, s.id);
  }
  return { ok: true, msg: lines.join(' '), arrived, day, pending: !!w.pending };
}
function worldRevisit(career) {
  const w = worldOf(career), n = atNode(career);
  if (!n) return { ok: false, msg: 'Nothing here.' };
  if (w.pending && !w.pending.res) return { ok: false, msg: 'Finish what you are doing here first.' };
  const lines = [];
  arrive(career, n, lines);
  return { ok: true, msg: lines.join(' ') };
}
function worldRoute(career, x, y) {
  const w = worldOf(career);
  const p = T.path(w.sid, { x: w.x, y: w.y }, { x, y }, 9000);
  if (p) return { path: p, partial: false };
  const dx = x - w.x, dy = y - w.y, dd = Math.hypot(dx, dy);
  if (dd < 8) return null;
  for (const step of [34, 24, 14]) {
    if (dd <= step) continue;
    const tx = Math.round(w.x + dx / dd * step), ty = Math.round(w.y + dy / dd * step);
    for (const [ox, oy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [5, 5], [-5, 5], [5, -5], [-5, -5]]) {
      const cx = tx + ox, cy = ty + oy;
      if (!T.cost(w.sid, cx, cy)) continue;
      const q = T.path(w.sid, { x: w.x, y: w.y }, { x: cx, y: cy }, 6000);
      if (q && q.length) return { path: q, partial: true };
    }
  }
  return null;
}
// Map markers: pin a spot, toggle it off by pinning the same tile again.
function worldPin(career, x, y, name) {
  const w = worldOf(career);
  w.markers = w.markers || [];
  const i = w.markers.findIndex(m => m.x === x && m.y === y);
  if (i >= 0) { w.markers.splice(i, 1); return { ok: true, removed: true, msg: 'Marker removed.' }; }
  if (w.markers.length >= 24) return { ok: false, msg: 'You can keep at most 24 markers.' };
  w.mk = (w.mk || 0) + 1;
  w.markers.push({ id: 'm' + w.mk, x, y, name: (name || 'Marker ' + w.mk).slice(0, 24) });
  return { ok: true, msg: 'Marker placed.' };
}
function worldUnpin(career, id) { const w = worldOf(career); w.markers = (w.markers || []).filter(m => m.id !== id); }
function worldKnownAll(career) {
  const w = worldOf(career);
  return Object.keys(w.st).map(id => nodeOf(career, id)).filter(n => n && REACH[n.state] >= 2).sort((a, b) => dist(a, w) - dist(b, w));
}
function worldPathTo(career, x, y) {
  const w = worldOf(career);
  return T.path(w.sid, { x: w.x, y: w.y }, { x, y }, 14000);
}
function worldScout(career) {
  const w = worldOf(career);
  if (w.pending && !w.pending.res) return { ok: false, msg: 'Finish what you are doing here first.' };
  const hub = hubOf(career), prof = PROF_BY[career.char.prof], race = RACE_BY[career.char.race];
  const p = Math.min(0.92, 0.5 + hub.d.st.LUK * 0.03 + (prof.scout ? 0.2 : 0) + (race.fx.secret || 0) + (hasTalent(career.char, 'fated') ? 0.2 : 0));
  tickDays(career, 1);
  const R = 16;
  const tiles = markView(w, w.x, w.y, R);
  const rng = new RNG(w.seed + '|scout|' + w.day + '|' + w.x + '|' + w.y);
  let found = 0, secrets = 0;
  for (const s of T.structuresIn(w.sid, w.x - R, w.y - R, w.x + R, w.y + R)) {
    if (dist(s, w) > R) continue;
    const st = stateOf(w, s);
    if (s.secret) { if (st === 'hidden' && rng.chance(p * 0.55)) { upgrade(w, s, 'known'); found++; secrets++; } }
    else if (REACH[st] < 2 && rng.chance(p)) { upgrade(w, s, 'known'); found++; }
  }
  if (!found && !tiles) return { ok: true, msg: 'You scout for a day. You already know this land.' };
  const amt = xpFor(career, 0.006 * found + 0.0004 * Math.min(tiles, 120)); const ups = amt > 0 ? awardXp(career, amt) : [];
  return { ok: true, msg: `Scouting from the high ground reveals ${tiles} new tiles and ${found} place${found === 1 ? '' : 's'}${secrets ? ' (including something hidden!)' : ''}. +${amt} XP.${ups.length ? ' Level up!' : ''}` };
}
function worldChoose(career, idx) {
  const w = worldOf(career), p = w.pending;
  if (!p || p.res) return { ok: false, msg: 'Nothing to decide.' };
  const ch = p.ev.choices[idx]; if (!ch) return { ok: false, msg: 'No such choice.' };
  const node = p.nodeId ? nodeOf(career, p.nodeId) : null;
  const c = ch.cost || {};
  if (c.gold && career.gold < c.gold) return { ok: false, msg: `Need ${c.gold} gold.` };
  if (c.potion && career.potions < c.potion) return { ok: false, msg: 'No potion to spare.' };
  const hub = hubOf(career);
  const rng = new RNG(w.seed + '|out|' + (p.nodeId || 'road') + '|' + w.day + '|' + career.runs + '|' + idx);
  const res = { lines: [], items: [], check: null };
  if (c.gold) career.gold -= c.gold;
  if (c.potion) career.potions -= c.potion;
  const ctx = { luck: hub.d.st.LUK, luckW: !!ch.luckW, revisit: !!p.ev.revisit };
  const fakeNode = node || { id: 'road', ring: zoneAt(w.x, w.y), sub: 'road' };
  if (ch.check) {
    const r = rollCheck(career, ch.check.stat, ch.check.dc, fakeNode);
    res.check = r;
    res.lines.push(`${ch.check.stat} check: ${r.roll} + ${r.bonus} vs DC ${r.dc}: ${r.ok ? 'success' : 'failure'}.`);
    applyOut(career, fakeNode, r.ok ? ch.win : ch.lose, res, rng, ctx);
  } else applyOut(career, fakeNode, ch.out, res, rng, ctx);
  p.res = res;
  if (node) {
    raise(node, 'visited');
    if (!(POI[node.sub] && POI[node.sub].dungeon)) { node.cd = w.day + (p.ev.cd || (node.sub === 'spring' ? 6 : 12)); if (node.sub === 'waystone') node.cd = 0; }
    // applyOut may have attuned the waystone on the working copy
    commit(career, node);
  }
  w.log.push(`Day ${w.day}: ${p.ev.title}`); if (w.log.length > 30) w.log.shift();
  return { ok: true, msg: '' };
}
function worldDismiss(career) { const w = worldOf(career); w.pending = null; }
function attuned(career) {
  const w = worldOf(career);
  return Object.keys(w.st).filter(id => w.st[id].waystone).map(id => nodeOf(career, id)).filter(Boolean);
}
function worldReturn(career) {
  const w = worldOf(career);
  if (inTown(w)) return { ok: false, msg: 'You are already in town.' };
  if (w.pending && !w.pending.res) return { ok: false, msg: 'Finish what you are doing here first.' };
  const here = atNode(career);
  const warp = attuned(career).length && here && here.waystone;
  const days = warp ? 1 : Math.min(4, Math.max(1, Math.ceil(Math.hypot(w.x, w.y) / 14)));
  w.pending = null; tickDays(career, days); w.x = 0; w.y = 0; markView(w, 0, 0, sightOf(career));
  return { ok: true, msg: warp ? 'The waystone carries you home in a day.' : `You walk home. ${days} day${days > 1 ? 's' : ''} pass.` };
}
function worldWarp(career, id) {
  const w = worldOf(career);
  if (w.pending && !w.pending.res) return { ok: false, msg: 'Finish what you are doing here first.' };
  const here = atNode(career);
  if (!(inTown(w) || (here && here.waystone))) return { ok: false, msg: 'You must be in town or at an attuned waystone.' };
  if (id === 'town') { w.x = 0; w.y = 0; } else {
    const n = nodeOf(career, id);
    if (!n || !n.waystone) return { ok: false, msg: 'That waystone is not attuned.' };
    w.x = n.x; w.y = n.y;
  }
  w.pending = null; tickDays(career, 1); markView(w, w.x, w.y, sightOf(career));
  return { ok: true, msg: 'The waystone hums. A day later you step out elsewhere.' };
}
function worldEnter(career, id) {
  const w = worldOf(career), node = nodeOf(career, id);
  if (!node || !node.rank || node.x !== w.x || node.y !== w.y) return null;
  return { free: true, seed: `w|${w.seed}|${id}|${node.clears || 0}|${career.runs}`, rank: node.rank, themeId: node.themeId, nodeId: id, rooms: node.rooms || 0, warden: node.warden || null, nodeName: node.name };
}
function nodeLocked(career, node) {
  if (!node.rank) return null;
  return E.careerUnlocked(career, node.rank) ? null : `Needs the ${node.rank} licence`;
}

// ---------- after a dungeon ----------
function worldAfterRun(career, run, outcome, res) {
  const w = worldOf(career);
  res.disc = res.disc || [];
  res.ups = res.ups || [];
  const add = (label, frac) => {
    const amt = xpFor(career, frac); if (amt <= 0) return;
    const ups = awardXp(career, amt); res.disc.push({ label, xp: amt }); if (ups.length) res.ups = res.ups.concat(ups);
  };
  let budget = 0.25;
  const take = (label, frac) => { if (budget <= 0) return; const f = Math.min(frac, budget); budget -= f; add(label, f); };
  for (const m of Object.keys(run.seenMons || {})) if (!w.disc.mon[m]) { w.disc.mon[m] = 1; take(`First encounter: ${m}`, 0.012); }
  for (const e of Object.keys(run.seenEv || {})) if (!w.disc.ev[e]) { w.disc.ev[e] = 1; take(`First seen: ${e.replace(/_/g, ' ')}`, 0.015); }
  if (!w.disc.theme[run.dungeon.theme.id]) { w.disc.theme[run.dungeon.theme.id] = 1; take(`First delve: ${run.dungeon.theme.name}`, 0.03); }
  const node = run.nodeId ? nodeOf(career, run.nodeId) : null;
  if (node && outcome === 'cleared') {
    const first = !node.clears;
    node.clears = (node.clears || 0) + 1; node.state = 'cleared';
    commit(career, node);
    const ring = Math.max(0, node.ring);
    markView(w, node.x, node.y, 14);
    if (first) {
      const g = Math.round(60 * (1 + ring * 0.8) * RANKS[node.rank].rewards * (node.sub === 'lair' ? 1.2 : 1));
      career.gold += g; career.credits += 3 + ring * 2; career.rep += 3 + ring;
      add(`First clear: ${node.name}`, node.sub === 'lair' ? 0.1 : 0.14);
      const it = genItem(new RNG(w.seed + '|first|' + node.id), { minRarity: Math.min(4, 1 + Math.floor(ring / 2) + (node.sub === 'lair' ? 1 : 0)), luck: 0, heat: 2 + ring, rankMul: Math.pow(RANKS[node.rank].cs, 0.5) });
      career.stash.push(it); res.banked.push(it);
      res.firstClear = { name: node.name, gold: g, credits: 3 + ring * 2, rep: 3 + ring, item: it };
    }
  }
  // the hero always comes home after a delve
  const far = Math.hypot(w.x, w.y);
  const days = Math.max(1, Math.min(3, Math.ceil(far / 18)));
  tickDays(career, days); w.x = 0; w.y = 0; w.pending = null;
  markView(w, 0, 0, sightOf(career));
  res.homeDays = days;
}

// ---------- capital services ----------
function bankDeposit(career, n) {
  n = Math.min(Math.floor(n), career.gold);
  if (!(n > 0)) return { ok: false, msg: 'You have nothing to deposit.' };
  career.gold -= n; career.bank = (career.bank || 0) + n;
  return { ok: true, msg: `Deposited ${n} gold. It is safe from death.` };
}
function bankWithdraw(career, n) {
  n = Math.min(Math.floor(n), career.bank || 0);
  if (!(n > 0)) return { ok: false, msg: 'Your account is empty.' };
  career.bank -= n; career.gold += n;
  return { ok: true, msg: `Withdrew ${n} gold.` };
}
// Racial homelands: the elders honour their own kin for free and befriend outsiders for a gift. Each race gives one permanent boon.
function raceStat(raceName) {
  const r = E.RACE_BY[raceName], keys = Object.keys((r && r.mods) || {});
  return keys.length ? keys.slice().sort((a, b) => r.mods[b] - r.mods[a])[0] : STATS[T.hashStr(raceName) % STATS.length];
}
function raceBoon(career, node) {
  const own = career.char.race === node.race, taken = (career.boons || {})[node.race];
  const stat = raceStat(node.race), cost = 150 * (Math.max(0, node.ring) + 1);
  return { own, taken: !!taken, stat, cost, gain: own ? 2 : 1, raceInfo: E.RACE_BY[node.race] };
}
function worldRace(career, id) {
  const node = nodeOf(career, id);
  if (!node || !node.race) return { ok: false, msg: 'Nothing here.' };
  const w = worldOf(career);
  if (node.x !== w.x || node.y !== w.y) return { ok: false, msg: 'You must be in the settlement.' };
  const info = raceBoon(career, node);
  if (info.taken) return { ok: false, msg: 'The elders have already honoured you.' };
  if (!info.own && career.gold < info.cost) return { ok: false, msg: `The elders expect a gift of ${info.cost} gold.` };
  if (!info.own) career.gold -= info.cost;
  career.boons = career.boons || {}; career.boons[node.race] = info.own ? 'kin' : 'friend';
  career.char.stats[info.stat] += info.gain;
  career.rep += info.own ? 5 : 2;
  const amt = xpFor(career, 0.05); const ups = awardXp(career, amt);
  return { ok: true, msg: info.own ? `The ${node.race} elders recognise their kin. +${info.gain} ${info.stat} permanently, +5 reputation, +${amt} XP.` : `You are named a Friend of the ${node.race}. +1 ${info.stat} permanently, +${amt} XP.${ups.length ? ' Level up!' : ''}` };
}
const respecCost = career => Math.round(60 * career.char.level * (1 + 0.15 * (career.char.respecs || 0)));
function respec(career) {
  const c = career.char, alloc = c.alloc || {};
  let pts = 0; for (const s in alloc) pts += alloc[s];
  if (!pts) return { ok: false, msg: 'You have not spent any stat points since the Academy began keeping records.' };
  const cost = respecCost(career);
  if (career.gold < cost) return { ok: false, msg: `The Academy charges ${cost} gold.` };
  career.gold -= cost;
  for (const s in alloc) c.stats[s] -= alloc[s];
  c.points += pts; c.alloc = {}; c.respecs = (c.respecs || 0) + 1;
  return { ok: true, msg: `Your ${pts} stat points are refunded. Spend them anew.` };
}
const lessonCap = career => Math.floor(career.char.level / 5);
const lessonCost = career => 10 + 3 * (career.lessons || 0);
function buyLesson(career) {
  if ((career.lessons || 0) >= lessonCap(career)) return { ok: false, msg: 'The masters have nothing more to teach you at your level.' };
  const cost = lessonCost(career);
  if (career.credits < cost) return { ok: false, msg: `A lesson costs ${cost} Guild Credits.` };
  career.credits -= cost; career.lessons = (career.lessons || 0) + 1; career.char.skillPts += 1;
  return { ok: true, msg: 'The masters teach you something new. +1 skill point.' };
}
function arenaEnter(career) {
  const w = worldOf(career);
  if (career.arenaDay != null && w.day - career.arenaDay < 2) return null;
  career.arenaDay = w.day;
  return { free: true, arena: true, seed: `arena|${career.char.name}|${career.runs}|${w.day}`, rank: E.careerRank(career), themeId: 'fortress', rooms: 5 };
}
const arenaReady = career => career.arenaDay == null || worldOf(career).day - career.arenaDay >= 2;

Object.assign(E, { partyPlace, worldOf, worldNode: nodeOf, worldInTown, worldAt: atNode, bankDeposit, bankWithdraw, respec, respecCost, buyLesson, lessonCost, lessonCap, arenaEnter, arenaReady, worldRace, raceBoon, worldStep, worldRevisit, worldPathTo, worldRoute, worldPin, worldUnpin, worldKnownAll, worldScout, worldChoose, worldDismiss, worldReturn, worldWarp, worldEnter, worldAfterRun, worldNodeLocked: nodeLocked,
  worldKnown: knownNodes, worldNear: structsNear, worldAttuned: attuned, worldIsExplored: isEx, worldSight: sightOf, worldZone: zoneAt, randomSeedText,
  WORLD: { POI, SIGHT, ROAD }, nodeRank });
})(typeof globalThis !== 'undefined' ? globalThis : this);
