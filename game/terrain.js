'use strict';
/* Daily Random Dungeon - terrain: seeded, infinite, Minecraft-style world generation (biomes, rivers, structures, pathfinding). */
(function (root) {
const E = root.Engine;
const D = root.DATA;
const { CAREER_RANKS } = E;

// ---------- hashing and noise ----------
function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function h2(seed, x, y) {
  let h = (seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(seed, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(seed, x0, y0), b = h2(seed, x0 + 1, y0), c = h2(seed, x0, y0 + 1), d = h2(seed, x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(seed, x, y, oct) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += vnoise(seed + i * 101, x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const contrast = (v, k) => clamp((v - 0.5) * k + 0.5, 0, 1);

// ---------- biomes ----------
const B = { DEEP: 0, OCEAN: 1, SHALLOW: 2, BEACH: 3, PLAINS: 4, FOREST: 5, TAIGA: 6, TUNDRA: 7, DESERT: 8, SAVANNA: 9, JUNGLE: 10, SWAMP: 11, HILLS: 12, MOUNTAIN: 13, SNOW: 14, RIVER: 15 };
const BIOMES = [
  { name: 'Deep Ocean', c: [31, 63, 138], cost: 0 }, { name: 'Ocean', c: [42, 93, 176], cost: 0 }, { name: 'Shallows', c: [66, 132, 214], cost: 3 },
  { name: 'Beach', c: [226, 214, 158], cost: 1 }, { name: 'Plains', c: [124, 200, 80], cost: 1 }, { name: 'Forest', c: [58, 150, 62], cost: 1.4 },
  { name: 'Taiga', c: [60, 122, 92], cost: 1.6 }, { name: 'Tundra', c: [184, 207, 208], cost: 1.5 }, { name: 'Desert', c: [230, 207, 122], cost: 1.3 },
  { name: 'Savanna', c: [182, 178, 88], cost: 1.1 }, { name: 'Jungle', c: [44, 140, 42], cost: 2 }, { name: 'Swamp', c: [82, 108, 62], cost: 2 },
  { name: 'Hills', c: [120, 138, 90], cost: 2 }, { name: 'Mountains', c: [134, 134, 142], cost: 3 }, { name: 'Snowy Peaks', c: [240, 246, 255], cost: 4 },
  { name: 'River', c: [74, 143, 224], cost: 3 },
];
// decor codes
const DEC = { NONE: 0, TREE: 1, PINE: 2, CACTUS: 3, FLOWER: 4, ROCK: 5, DEAD: 6, ACACIA: 7, PALM: 8, TALLGRASS: 9, ICE: 10 };

const SEA = 0.4;
function sampleTile(seed, x, y) {
  const d = Math.hypot(x, y);
  let e = contrast(fbm(seed, x * 0.017, y * 0.017, 5), 1.7);
  const d2 = d + (fbm(seed + 11, x * 0.045, y * 0.045, 2) - 0.5) * 34;   // ragged edge for the home landmass
  e += clamp(1 - d2 / 70, 0, 1) * 0.28;                    // a guaranteed home continent
  if (d2 < 34) e = Math.max(e, SEA + 0.07 + (34 - d2) * 0.0015);
  if (d < 30) e = Math.min(e, 0.62 + d * 0.004);            // no mountains on the doorstep
  const m = contrast(fbm(seed + 7001, x * 0.013 + 40, y * 0.013 - 90, 3), 1.8);
  let t = contrast(fbm(seed + 9103, x * 0.01 - 70, y * 0.01 + 30, 3), 1.8);
  let b;
  if (e < SEA - 0.12) b = B.DEEP;
  else if (e < SEA - 0.03) b = B.OCEAN;
  else if (e < SEA) b = B.SHALLOW;
  else if (e < SEA + 0.025) b = B.BEACH;
  else {
    const rv = Math.abs(fbm(seed + 313, x * 0.02 + 11, y * 0.02 - 5, 3) - 0.5);
    if (rv < 0.009 && e < 0.72 && d > 6) b = B.RIVER;
    else if (e > 0.84) b = t < 0.4 ? B.SNOW : B.MOUNTAIN;
    else if (e > 0.74) b = B.HILLS;
    else if (t < 0.3) b = m < 0.5 ? B.TUNDRA : B.TAIGA;
    else if (t > 0.66) b = m < 0.4 ? B.DESERT : (m < 0.6 ? B.SAVANNA : B.JUNGLE);
    else if (m > 0.64 && e < 0.55) b = B.SWAMP;
    else if (m > 0.5) b = B.FOREST;
    else b = B.PLAINS;
    if (d < 7 && (b === B.RIVER || b === B.DESERT || b === B.SNOW || b === B.MOUNTAIN || b === B.TUNDRA || b === B.SWAMP || b === B.JUNGLE)) b = B.PLAINS;
  }
  const r = h2(seed + 5, x, y);
  let dec = DEC.NONE;
  switch (b) {
    case B.PLAINS: dec = r < 0.035 ? DEC.TREE : r < 0.16 ? DEC.FLOWER : r < 0.3 ? DEC.TALLGRASS : 0; break;
    case B.FOREST: dec = r < 0.42 ? DEC.TREE : r < 0.5 ? DEC.FLOWER : 0; break;
    case B.TAIGA: dec = r < 0.4 ? DEC.PINE : 0; break;
    case B.TUNDRA: dec = r < 0.04 ? DEC.PINE : r < 0.09 ? DEC.ICE : 0; break;
    case B.DESERT: dec = r < 0.04 ? DEC.CACTUS : r < 0.06 ? DEC.DEAD : 0; break;
    case B.SAVANNA: dec = r < 0.06 ? DEC.ACACIA : r < 0.3 ? DEC.TALLGRASS : 0; break;
    case B.JUNGLE: dec = r < 0.55 ? DEC.TREE : r < 0.62 ? DEC.FLOWER : 0; break;
    case B.SWAMP: dec = r < 0.14 ? DEC.DEAD : r < 0.26 ? DEC.TALLGRASS : 0; break;
    case B.HILLS: dec = r < 0.08 ? DEC.ROCK : r < 0.14 ? DEC.PINE : 0; break;
    case B.MOUNTAIN: dec = r < 0.1 ? DEC.ROCK : 0; break;
    case B.BEACH: dec = r < 0.02 ? DEC.PALM : 0; break;
    default: break;
  }
  return { b, e, dec };
}

// ---------- chunk cache ----------
const CH = 32, cache = new Map();
function chunk(seed, cx, cy) {
  const key = seed + '|' + cx + '|' + cy;
  let c = cache.get(key);
  if (c) { cache.delete(key); cache.set(key, c); return c; }
  c = { b: new Uint8Array(CH * CH), e: new Uint8Array(CH * CH), d: new Uint8Array(CH * CH) };
  for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
    const t = sampleTile(seed, cx * CH + i, cy * CH + j);
    c.b[j * CH + i] = t.b; c.e[j * CH + i] = Math.round(clamp(t.e, 0, 1) * 255); c.d[j * CH + i] = t.dec;
  }
  cache.set(key, c);
  if (cache.size > 220) cache.delete(cache.keys().next().value);
  return c;
}
function tile(seed, x, y) {
  const cx = Math.floor(x / CH), cy = Math.floor(y / CH), c = chunk(seed, cx, cy);
  const i = (y - cy * CH) * CH + (x - cx * CH);
  return { b: c.b[i], e: c.e[i] / 255, dec: c.d[i] };
}
function cost(seed, x, y) { return BIOMES[tile(seed, x, y).b].cost; }

// ---------- structures ----------
const CELL = 12;
const PRE = ['Forsaken', 'Whispering', 'Ashen', 'Hollow', 'Gilded', 'Sunless', 'Rotting', 'Silent', 'Starless', 'Broken', 'Drowned', 'Burning', 'Frozen', 'Ancient', 'Lost', 'Weeping'];
const SUBS = [
  ['dungeon', 15], ['lair', 11], ['spring', 7], ['shrine', 9], ['ruins', 11], ['grove', 7], ['mine', 7], ['trader', 7], ['hermit', 9], ['waystone', 7], ['vault', 2], ['village', 5], ['town', 1.6], ['racehold', 4],
];
const SET_A = ['Oak', 'Pine', 'Stone', 'River', 'Elm', 'Raven', 'Silver', 'Amber', 'Fox', 'Hawk', 'Willow', 'Iron', 'Gold', 'Sun', 'Moon', 'Bright'];
const SET_B = ['ford', 'haven', 'stead', 'wick', 'brook', 'mere', 'fall', 'cross', 'watch', 'hollow', 'gate', 'ton'];
const SUBNAME = { capital: 'Capital', racehold: 'Homeland', village: 'Village', town: 'Town', spring: 'Spring', shrine: 'Shrine', ruins: 'Ruins', grove: 'Grove', mine: 'Old Mine', trader: 'Trader Camp', hermit: 'Wanderer', waystone: 'Waystone', vault: 'Vault', lair: 'Lair', dungeon: 'Dungeon' };
const THEME_BY_BIOME = {
  [B.PLAINS]: ['catacombs', 'fortress', 'warrens'], [B.FOREST]: ['warrens', 'fungal', 'catacombs'], [B.TAIGA]: ['frozen', 'warrens'], [B.TUNDRA]: ['frozen', 'catacombs'],
  [B.DESERT]: ['forge', 'graveyard', 'catacombs'], [B.SAVANNA]: ['warrens', 'graveyard', 'forge'], [B.JUNGLE]: ['sunken', 'fungal'], [B.SWAMP]: ['sunken', 'fungal', 'catacombs'],
  [B.HILLS]: ['crystal', 'warrens', 'machine'], [B.MOUNTAIN]: ['crystal', 'forge', 'machine'], [B.SNOW]: ['frozen', 'crystal'], [B.BEACH]: ['sunken', 'catacombs'],
};
// Racial homelands: each race lives in the biomes that suit it. Rarer races only appear further from home.
const RACE_BIOME = {
  [B.PLAINS]: ['Human', 'Halfling', 'Beastkin', 'Reincarnated Soul'], [B.FOREST]: ['Elf', 'Fae', 'Beastkin', 'Halfling'], [B.TAIGA]: ['Elf', 'Dwarf', 'Beastkin'],
  [B.TUNDRA]: ['Dwarf', 'Undead-born', 'Dragonkin'], [B.DESERT]: ['Lizardfolk', 'Demonkin', 'Orc'], [B.SAVANNA]: ['Beastkin', 'Orc', 'Lizardfolk'],
  [B.JUNGLE]: ['Lizardfolk', 'Fae', 'Slime'], [B.SWAMP]: ['Slime', 'Lizardfolk', 'Undead-born', 'Vampire-blooded'], [B.HILLS]: ['Dwarf', 'Gnome', 'Orc', 'Halfling'],
  [B.MOUNTAIN]: ['Dwarf', 'Dragonkin', 'Construct', 'Celestial', 'Void-touched'], [B.SNOW]: ['Celestial', 'Dragonkin', 'Vampire-blooded', 'Void-touched'], [B.BEACH]: ['Human', 'Lizardfolk', 'Slime'],
};
const RACE_MIN_RING = { Dragonkin: 2, Demonkin: 2, 'Undead-born': 1, 'Vampire-blooded': 3, Celestial: 3, Construct: 3, 'Void-touched': 4, 'Reincarnated Soul': 4, Slime: 1, Fae: 1 };
const RACE_PLACE = { Human: 'Keep', Elf: 'Treehall', Dwarf: 'Deepforge', Beastkin: 'Den', Halfling: 'Burrow', Orc: 'Warcamp', Gnome: 'Workshop', Lizardfolk: 'Marsh Village', Dragonkin: 'Roost', Fae: 'Glade', 'Undead-born': 'Crypt Hamlet', Demonkin: 'Pit', 'Vampire-blooded': 'Manor', Celestial: 'Sanctum', Construct: 'Foundry', 'Void-touched': 'Rift Camp', Slime: 'Pool', 'Reincarnated Soul': 'Soul Shrine' };
const WARDENS = () => Object.keys(E.WARDENS || {});
// Capital cities: random, several per world, only in high-rank lands. Each belongs to a nation (usually human, sometimes another people or a mix),
// and many (not all) have a palace and a ruler.
const NATION_A = ['Aur', 'Vael', 'Kor', 'Thal', 'Brae', 'Ost', 'Mer', 'Dun', 'Sol', 'Ryn', 'Hal', 'Zar', 'Eld', 'Cal', 'Nor', 'Vess'];
const NATION_B = ['andor', 'ethia', 'mark', 'heim', 'gard', 'oria', 'land', 'vale', 'ania', 'reach', 'dria', 'mont'];
const POLITY = ['Kingdom', 'Kingdom', 'Kingdom', 'Empire', 'Duchy', 'Principality', 'Theocracy'], POLITY_FREE = ['Republic', 'Concord', 'Free League', 'Commonwealth'];
const RULER_BY_RACE = { Human: ['King', 'Queen', 'Emperor', 'Empress', 'Duke'], Elf: ['High Queen', 'High King', 'Archdruid'], Dwarf: ['High King', 'Forge-Queen'], Beastkin: ['Alpha', 'Great Matriarch'], Halfling: ['Mayor-General', 'Thane'],
  Orc: ['Warlord', 'Warchief'], Gnome: ['Grand Artificer', 'Magister'], Lizardfolk: ['Sun-Speaker', 'Tide-King'], Dragonkin: ['Dragon Sovereign', 'Wyrm-Queen'], Fae: ['Faerie Queen', 'Summer King'], 'Undead-born': ['Lich-Regent', 'Bone King'],
  Demonkin: ['Overlord', 'Infernal Duchess'], 'Vampire-blooded': ['Blood Countess', 'Elder Lord'], Celestial: ['Archon', 'Seraph-Regent'], Construct: ['Prime Unit', 'Architect-King'], 'Void-touched': ['Rift Sovereign'], Slime: ['Great Ooze'], 'Reincarnated Soul': ['Returned King'] };
const COUNCIL = ['Council of Elders', 'High Senate', 'Guild Assembly', 'Council of Nine', 'Grand Moot'];
const RULER_FIRST = ['Aldric', 'Maren', 'Theron', 'Isolde', 'Kaelen', 'Odessa', 'Varric', 'Lysandra', 'Borin', 'Seraphine', 'Cassian', 'Ilmara', 'Torvald', 'Nyssa', 'Edric', 'Sorrel'];
const RULER_LAST = ['Stormvale', 'Ironcrown', 'the Just', 'the Elder', 'Dawnbringer', 'Blackthorn', 'Silverhand', 'the Bold', 'Highmoor', 'the Wise', 'Ashenford', 'the Unyielding'];
function nationOf(seed, hs, biome, ring, r) {
  const all = Object.keys(RULER_BY_RACE);
  let race = 'Human', mixed = false;
  const k = r(31);
  if (k < 0.16) mixed = true;
  else if (k > 0.58) { const pool = (RACE_BIOME[biome] || ['Human']).filter(rn => ring >= (RACE_MIN_RING[rn] || 0)); race = (pool.length ? pool : ['Human'])[Math.floor(r(32) * (pool.length || 1))]; }
  const nm = NATION_A[Math.floor(r(33) * NATION_A.length)] + NATION_B[Math.floor(r(34) * NATION_B.length)];
  const palace = r(36) < 0.68;
  const polity = (palace ? POLITY : POLITY_FREE)[Math.floor(r(35) * (palace ? POLITY : POLITY_FREE).length)];
  let ruler = null;
  if (palace) {
    const titles = RULER_BY_RACE[mixed ? 'Human' : race] || ['King'];
    ruler = { title: titles[Math.floor(r(37) * titles.length)], name: RULER_FIRST[Math.floor(r(38) * RULER_FIRST.length)] + ' ' + RULER_LAST[Math.floor(r(39) * RULER_LAST.length)] };
  }
  const council = COUNCIL[Math.floor(r(40) * COUNCIL.length)];
  return { name: nm, polity, full: `${polity} of ${nm}`, race: mixed ? 'Mixed' : race, mixed, palace, ruler, council, all: all.length };
}
function zoneOf(x, y) { return Math.min(CAREER_RANKS.length - 1, Math.floor(Math.hypot(x, y) / 26)); }
function structure(seed, cx, cy) {
  const hs = hashStr(seed + '|cell|' + cx + '|' + cy);
  const r = k => h2(hs, k, 17);
  const ox = cx * CELL + 1 + Math.floor(r(1) * (CELL - 2)), oy = cy * CELL + 1 + Math.floor(r(2) * (CELL - 2));
  const d = Math.hypot(ox, oy);
  if (d < 4) return null;
  const near = d < 34;
  const isCap = d >= 78 && r(21) < 0.034;
  if (!isCap && r(3) > (near ? 0.7 : 0.55)) return null;
  const t = tile(seed, ox, oy), bio = BIOMES[t.b];
  if (!bio.cost || t.b === B.SHALLOW || t.b === B.RIVER) return null;
  const ring = zoneOf(ox, oy);
  if (isCap) {
    const nation = nationOf(seed, hs, t.b, ring, r);
    const cn = SET_A[Math.floor(r(8) * SET_A.length)] + SET_B[Math.floor(r(9) * SET_B.length)];
    return { id: cx + ',' + cy, x: ox, y: oy, sub: 'capital', ring, biome: t.b, secret: false, kind: 'poi', settlement: true, capital: true, nation, name: cn.charAt(0).toUpperCase() + cn.slice(1) + ' City' };
  }
  const mid = d > 12 && d < 52;
  let weights = SUBS.map(([k, w]) => [k, k === 'dungeon' && near ? w * 1.6 : (k === 'village' && mid ? w * 5 : (k === 'town' && d > 26 && d < 70 ? w * 4 : w))]);
  let tot = weights.reduce((a, b) => a + b[1], 0), pick = r(4) * tot, sub = 'dungeon';
  for (const [k, w] of weights) { pick -= w; if (pick < 0) { sub = k; break; } }
  if (d > 14 && d < 44 && r(10) < 0.22) sub = 'village';
  else if (d > 20 && d < 50 && r(13) < 0.12) sub = 'racehold';
  const theme = (() => {
    const pool = (THEME_BY_BIOME[t.b] || ['catacombs']).map(id => D.THEMES.find(x => x.id === id)).filter(th => th && th.rankMin <= ring);
    const all = D.THEMES.filter(th => th.rankMin <= ring);
    const list = pool.length ? pool : all;
    return list[Math.floor(r(5) * list.length)];
  })();
  const pre = PRE[Math.floor(r(6) * PRE.length)];
  const s = { id: cx + ',' + cy, x: ox, y: oy, sub, ring, biome: t.b, secret: sub === 'vault' };
  s.kind = sub === 'dungeon' || sub === 'lair' ? 'dungeon' : 'poi';
  if (sub === 'dungeon') { s.themeId = theme.id; s.name = `${pre} ${theme.name}`; s.rank = CAREER_RANKS[ring]; const w = WARDENS(); s.warden = ring >= 1 && w.length ? w[Math.floor(r(7) * w.length)] : null; }
  else if (sub === 'lair') { s.themeId = theme.id; s.name = `${pre} Lair`; s.rank = CAREER_RANKS[ring]; s.rooms = 4; }
  else if (sub === 'racehold') {
    const pool = (RACE_BIOME[t.b] || ['Human']).filter(rn => ring >= (RACE_MIN_RING[rn] || 0));
    s.race = (pool.length ? pool : ['Human'])[Math.floor(r(12) * (pool.length || 1))];
    s.settlement = true; s.name = `${SET_A[Math.floor(r(8) * SET_A.length)]}${SET_B[Math.floor(r(9) * SET_B.length)]} ${RACE_PLACE[s.race] || 'Hold'}`;
  } else if (sub === 'village' || sub === 'town') { s.settlement = true; s.name = `${SET_A[Math.floor(r(8) * SET_A.length)]}${SET_B[Math.floor(r(9) * SET_B.length)]}`; s.name = s.name + (sub === 'town' ? ' Town' : ' Village'); }
  else s.name = `${pre} ${SUBNAME[sub]}`;
  return s;
}
function structAt(seed, x, y) {
  const s = structure(seed, Math.floor(x / CELL), Math.floor(y / CELL));
  return s && s.x === x && s.y === y ? s : null;
}
function structuresIn(seed, x0, y0, x1, y1) {
  const out = [];
  for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
    const s = structure(seed, cx, cy);
    if (s && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) out.push(s);
  }
  return out;
}
function structById(seed, id) { const p = id.split(',').map(Number); return p.length === 2 && !p.some(isNaN) ? structure(seed, p[0], p[1]) : null; }

// ---------- pathfinding (A*, 4-way) ----------
function path(seed, a, b, limit) {
  const max = limit || 9000;
  if (a.x === b.x && a.y === b.y) return [];
  if (!cost(seed, b.x, b.y)) return null;
  const key = (x, y) => x + ',' + y;
  const open = [], g = new Map(), from = new Map(), closed = new Set();
  const hf = (x, y) => Math.abs(x - b.x) + Math.abs(y - b.y);
  const push = n => { open.push(n); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p].f <= open[i].f) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, s = i; if (l < open.length && open[l].f < open[s].f) s = l; if (r < open.length && open[r].f < open[s].f) s = r; if (s === i) break; [open[s], open[i]] = [open[i], open[s]]; i = s; } } return top; };
  g.set(key(a.x, a.y), 0); push({ x: a.x, y: a.y, f: hf(a.x, a.y) });
  let n = 0;
  while (open.length && n++ < max) {
    const cur = pop(), ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue; closed.add(ck);
    if (cur.x === b.x && cur.y === b.y) {
      const out = []; let k = ck;
      while (k !== key(a.x, a.y)) { const [x, y] = k.split(',').map(Number); out.push({ x, y }); k = from.get(k); }
      return out.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, ny = cur.y + dy, c = cost(seed, nx, ny);
      if (!c) continue;
      const nk = key(nx, ny), ng = g.get(ck) + c;
      if (closed.has(nk) || (g.has(nk) && g.get(nk) <= ng)) continue;
      g.set(nk, ng); from.set(nk, ck); push({ x: nx, y: ny, f: ng + hf(nx, ny) });
    }
  }
  return null;
}
function normSeed(s) {
  const str = String(s == null ? '' : s).trim();
  return str === '' ? null : hashStr(str);
}

E.Terrain = { RACE_BIOME, RACE_PLACE, B, BIOMES, DEC, CH, CELL, SEA, hashStr, h2, tile, cost, chunk, structure, structAt, structuresIn, structById, zoneOf, path, normSeed, SUBNAME };
})(typeof globalThis !== 'undefined' ? globalThis : this);
