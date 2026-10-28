'use strict';
/* UI: the capital, Hearthhold, drawn on a tile grid with the CC0 Kenney "Tiny Town" and "Tiny Dungeon" sheets. */
(function (root) {
const UI = root.UI, E = UI.E, S = UI.S, A = UI.actions;

// ---------- assets ----------
const assets = UI.assets = { town: new Image(), dungeon: new Image(), ready: 0 };
function loaded() { assets.ready++; if (assets.ready >= 2 && UI.afterAssets) UI.afterAssets(); }
assets.town.onload = loaded; assets.dungeon.onload = loaded;
assets.town.src = 'assets/town.png'; assets.dungeon.src = 'assets/dungeon.png';
const ready = () => assets.ready >= 2;
function tile(g, sheet, idx, dx, dy, sc) {
  g.drawImage(sheet, (idx % 12) * 16, ((idx / 12) | 0) * 16, 16, 16, dx, dy, 16 * sc, 16 * sc);
}
UI.drawTile = tile;

// ---------- layout ----------
const TS = 16, SC = 2, COLS = 30, ROWS = 19, PX = TS * SC;
const HOUSE = {
  brownBlue: [[48, 49, 50], [60, 63, 62], [73, 85, 84]],
  brownRed: [[52, 53, 54], [64, 67, 66], [84, 85, 73]],
  stoneRed: [[52, 53, 54], [64, 67, 66], [88, 89, 76]],
  stoneBlue: [[48, 49, 50], [60, 63, 62], [76, 89, 88]],
  stoneBlue2: [[48, 51, 50], [60, 63, 62], [88, 89, 76]],
  brownRed2: [[52, 55, 54], [64, 67, 66], [73, 85, 84]],
  guild: [[52, 53, 53, 53, 54], [64, 65, 67, 65, 66], [88, 89, 76, 89, 88]],
};
const BUILDINGS = [
  { key: 'guild', name: 'Guild Hall', x: 12, y: 1, rows: HOUSE.guild, tip: 'Mission board, ranks, reputation' },
  { key: 'home', name: 'Barracks', x: 1, y: 2, rows: HOUSE.brownBlue, tip: 'Hero sheet, skills, equipment' },
  { key: 'academy', name: 'Academy', x: 5, y: 2, rows: HOUSE.stoneBlue2, tip: 'Respec stats, buy lessons' },
  { key: 'bank', name: 'Bank', x: 9, y: 2, rows: HOUSE.stoneBlue, tip: 'Keep gold safe from death' },
  { key: 'healer', name: 'Temple', x: 18, y: 2, rows: HOUSE.stoneRed, tip: 'Heal injuries, blessings' },
  { key: 'tavern', name: 'Tavern', x: 22, y: 2, rows: HOUSE.brownRed2, tip: 'Hire companions, rumors' },
  { key: 'store', name: 'Storehouse', x: 26, y: 2, rows: HOUSE.brownBlue, tip: 'Stash and supplies' },
  { key: 'market', name: 'Market', x: 1, y: 9, rows: HOUSE.brownRed, tip: 'General store, armory, tomes' },
  { key: 'smith', name: 'Smithy', x: 5, y: 9, rows: HOUSE.stoneBlue2, tip: 'Upgrade, repair, enchant' },
  { key: 'alchemy', name: 'Alchemist', x: 9, y: 9, rows: HOUSE.stoneRed, tip: 'Craft potions and bombs' },
  { key: 'arena', name: 'Arena', x: 19, y: 9, rows: HOUSE.stoneBlue, tip: 'Gauntlet for gold, credits and fame' },
];
const GATE = { key: 'gate', name: 'City Gate', x: 13, y: 15, rows: [[99, 100, 100, 101], [111, 112, 113, 114], [123, 124, 125, 126]], tip: 'Leave for the open world' };
const ALL = BUILDINGS.concat([GATE]);
BUILDINGS.forEach(b => { b.w = b.rows[0].length; b.h = 3; });
GATE.w = 4; GATE.h = 3;

function isPath(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  if ((x === 14 || x === 15) && y >= 4) return true;        // main avenue
  if (y === 6 || y === 7) return true;                       // upper road
  if (y === 13 || y === 14) return true;                     // lower road
  if (y === 5 && BUILDINGS.some(b => b.y === 2 && x === b.x + 1)) return true;       // door stubs
  if (y === 12 && BUILDINGS.some(b => b.y === 9 && x === b.x + 1)) return true;
  if (y === 4 && x >= 13 && x <= 15) return true;
  return false;
}
const hashN = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 144665) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function occupied(x, y) { return ALL.some(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); }

// scenery placed once from fixed rules + the world seed
function scenery(seed) {
  const out = [];
  const s = seed;
  const tryTree = (x, y, kind) => { if (!isPath(x, y) && !occupied(x, y) && !occupied(x, y - 1)) out.push({ x, y, kind }); };
  for (let y = 0; y < ROWS; y += 2) { tryTree(0, y, hashN(0, y, s) < 0.5 ? 'g' : 'o'); tryTree(COLS - 1, y, hashN(1, y, s) < 0.5 ? 'g' : 'o'); }
  for (let x = 2; x < COLS - 2; x += 3) { if (x >= 11 && x <= 18) continue; if (hashN(x, 0, s) < 0.7) tryTree(x, 0, 'g'); if (hashN(x, 18, s) < 0.7) tryTree(x, 18, hashN(x, 3, s) < 0.5 ? 'g' : 'o'); }
  for (let i = 0; i < 40; i++) { const x = (hashN(i, 7, s) * COLS) | 0, y = (hashN(i, 9, s) * ROWS) | 0; if (!isPath(x, y) && !occupied(x, y) && !occupied(x, y - 1) && y > 1) out.push({ x, y, kind: hashN(i, 11, s) < 0.5 ? 'b' : 's' }); }
  return out;
}
const TREE = { g: [4, 16], o: [3, 15] };

// ---------- state ----------
let timer = null, frame = 0, hover = null, npcs = null, sceneryCache = null, sceneryFor = null;
function initNpcs(seed) {
  const picks = [85, 86, 87, 88, 97, 98, 99, 100, 84];
  npcs = Array.from({ length: 7 }, (_, i) => {
    let x = 14, y = 8, tries = 0;
    for (; tries < 60; tries++) { const px = (hashN(i * 61 + tries, 31, seed) * COLS) | 0, py = (hashN(i * 61 + tries, 33, seed) * ROWS) | 0; if (isPath(px, py)) { x = px; y = py; break; } }
    return { x, y, tx: x, ty: y, t: 0, spr: picks[i % picks.length], flip: false, wait: (hashN(i, 35, seed) * 40) | 0 };
  });
}
function stepNpc(n) {
  if (n.wait > 0) { n.wait--; return; }
  if (n.t < 1) { n.t += 0.09; if (n.t >= 1) { n.x = n.tx; n.y = n.ty; n.t = 0; n.wait = 4 + ((Math.random() * 28) | 0); n.moving = false; } return; }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => isPath(n.x + dx, n.y + dy));
  if (!dirs.length) return;
  const [dx, dy] = dirs[(Math.random() * dirs.length) | 0];
  n.tx = n.x + dx; n.ty = n.y + dy; n.t = 0.0001; if (dx) n.flip = dx < 0;
}
const HERO_SPR = { melee: 96, tank: 97, ranged: 112, rogue: 88, magic: 84, support: 99, hybrid: 100, summon: 111 };

function draw() {
  const cv = document.getElementById('towncv');
  if (!cv || !ready()) return !!cv;
  const car = S.save.career; if (!car) return false;
  const w = E.worldOf(car), g = cv.getContext('2d'), seed = E.Terrain.hashStr(w.seed) % 1000;
  g.imageSmoothingEnabled = false;
  if (!npcs) initNpcs(seed);
  if (sceneryFor !== seed) { sceneryCache = scenery(seed); sceneryFor = seed; }
  const T = assets.town, D = assets.dungeon;
  // ground
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    let idx = 0;
    if (isPath(x, y)) {
      const n = !isPath(x, y - 1), s2 = !isPath(x, y + 1), wst = !isPath(x - 1, y), e = !isPath(x + 1, y);
      const row = n ? 0 : s2 ? 2 : 1, col = wst ? 0 : e ? 2 : 1;
      idx = 12 + row * 12 + col;
      if (!n && !s2 && !wst && !e) idx = 25;
    } else { const r = hashN(x, y, seed); idx = r < 0.07 ? 1 : r < 0.1 ? 2 : r < 0.18 ? 1 : 0; }
    tile(g, T, idx, x * PX, y * PX, SC);
  }
  // plaza fountain-ish well and lamp posts
  tile(g, T, 83, 13 * PX, 10 * PX, SC); tile(g, T, 130, 16 * PX, 10 * PX, SC); tile(g, T, 131, 16 * PX, 11 * PX, SC);
  // scenery behind buildings
  const drawables = [];
  for (const s2 of sceneryCache) drawables.push({ y: s2.y, f: () => {
    if (s2.kind === 'b') tile(g, T, 5, s2.x * PX, s2.y * PX, SC);
    else if (s2.kind === 's') tile(g, T, 17, s2.x * PX, s2.y * PX, SC);
    else { tile(g, T, TREE[s2.kind][0], s2.x * PX, (s2.y - 1) * PX, SC); tile(g, T, TREE[s2.kind][1], s2.x * PX, s2.y * PX, SC); }
  } });
  // buildings
  const night = (w.day % 8) >= 6, dusk = (w.day % 8) === 5;
  for (const b of ALL) drawables.push({ y: b.y + b.h, f: () => {
    const hot = hover && hover.key === b.key;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(b.x * PX + 4, (b.y + b.h) * PX - 6, b.w * PX - 4, 10);
    for (let r = 0; r < b.rows.length; r++) for (let c = 0; c < b.rows[r].length; c++) tile(g, T, b.rows[r][c], (b.x + c) * PX, (b.y + r - (hot ? 0.06 : 0)) * PX, SC);
    if (b.key === 'gate') { /* gate uses the town sheet tiles */ }
  } });
  // villagers
  for (const n of npcs) drawables.push({ y: n.y + n.t + 1, f: () => {
    const px = (n.x + (n.tx - n.x) * Math.min(1, n.t)) * PX, py = (n.y + (n.ty - n.y) * Math.min(1, n.t)) * PX - 6 + (n.t > 0 ? Math.round(Math.sin(frame * 1.2) * 1.5) : 0);
    g.save(); if (n.flip) { g.translate(px + PX, py); g.scale(-1, 1); tile(g, D, n.spr, 0, 0, SC); } else tile(g, D, n.spr, px, py, SC); g.restore();
  } });
  // the hero in the square
  const kind = UI.kindOf(car.char.prof);
  drawables.push({ y: 11.5, f: () => {
    const px = 14.5 * PX, py = 11 * PX + Math.round(Math.sin(frame / 2) * 1.5);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 4, py + 26, 24, 5);
    tile(g, D, HERO_SPR[kind] || 96, px, py, SC);
    g.font = '700 11px system-ui'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(8,6,16,.95)'; g.strokeText(car.char.name, px + 16, py - 4); g.fillStyle = '#ffe08a'; g.fillText(car.char.name, px + 16, py - 4);
  } });
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.f());
  // labels
  g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'center';
  for (const b of ALL) {
    const hot = hover && hover.key === b.key;
    const cx = (b.x + b.w / 2) * PX, cy = (b.y) * PX - 4 - (hot ? 4 : 0);
    const tw = g.measureText(b.name).width + 14;
    g.fillStyle = hot ? 'rgba(60,44,10,.95)' : 'rgba(14,11,24,.85)'; g.fillRect(cx - tw / 2, cy - 14, tw, 18);
    g.strokeStyle = hot ? '#ffcb3d' : '#6b5a2a'; g.lineWidth = 1.5; g.strokeRect(cx - tw / 2 + .5, cy - 13.5, tw - 1, 17);
    g.fillStyle = hot ? '#fff3b0' : '#ffe08a'; g.fillText(b.name, cx, cy - 1);
  }
  // time of day
  if (night) { g.fillStyle = 'rgba(10,18,60,.42)'; g.fillRect(0, 0, cv.width, cv.height);
    for (const b of ALL) { if (b.key === 'gate') continue; const gx = (b.x + b.w / 2) * PX, gy = (b.y + 2.5) * PX; const gr = g.createRadialGradient(gx, gy, 2, gx, gy, 46); gr.addColorStop(0, 'rgba(255,210,120,.5)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.fillRect(gx - 50, gy - 50, 100, 100); } }
  else if (dusk) { g.fillStyle = 'rgba(255,120,50,.14)'; g.fillRect(0, 0, cv.width, cv.height); }
  else if ((w.day % 8) === 0) { g.fillStyle = 'rgba(255,200,150,.1)'; g.fillRect(0, 0, cv.width, cv.height); }
  const info = document.getElementById('towninfo');
  if (info) info.textContent = hover ? `${hover.name}: ${hover.tip}` : 'Hearthhold, capital of the realm. Tap a building to go inside.';
  return true;
}
function hit(ev, cv) {
  const r = cv.getBoundingClientRect(), tx = Math.floor((ev.clientX - r.left) / r.width * COLS), ty = Math.floor((ev.clientY - r.top) / r.height * ROWS);
  return ALL.find(b => tx >= b.x && tx < b.x + b.w && ty >= b.y - 1 && ty < b.y + b.h) || null;
}
UI.townCanvas = function () { return `<canvas id="towncv" class="towncv" width="${COLS * PX}" height="${ROWS * PX}"></canvas><div id="towninfo" class="mapinfo"></div>`; };
UI.afterAssets = function () { draw(); };
const prevAfter = UI.afterRender;
UI.afterRender = function () {
  if (prevAfter) prevAfter();
  const cv = document.getElementById('towncv');
  if (cv && !cv._bound) {
    cv._bound = true;
    cv.addEventListener('mousemove', ev => { hover = hit(ev, cv); cv.style.cursor = hover ? 'pointer' : 'default'; });
    cv.addEventListener('mouseleave', () => { hover = null; });
    cv.addEventListener('click', ev => {
      const b = hit(ev, cv); if (!b) return;
      if (b.key === 'gate') { S.hubTab = 'map'; UI.render(); return; }
      A.townat({ b: b.key }); UI.render(true);
    });
  }
  if (cv) { draw(); }
  if (cv && !timer) timer = setInterval(() => { frame++; for (const n of (npcs || [])) stepNpc(n); if (!draw()) { clearInterval(timer); timer = null; } }, 110);
  if (!cv && timer) { clearInterval(timer); timer = null; }
};
})(typeof globalThis !== 'undefined' ? globalThis : this);
