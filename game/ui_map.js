'use strict';
/* UI: the world map (fog, nodes, travel) and the illustrated town. */
(function (root) {
const UI = root.UI, E = UI.E, D = UI.D, S = UI.S, A = UI.actions;
const { esc, bar } = UI;
const WD = () => E.WORLD;

// ---------- small seeded random for decoration ----------
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const SPRITES = [['🌳', '🌲', '🌾'], ['🌲', '🌳', '🍄'], ['⛰️', '🌾', '🪨'], ['🏔️', '🪨', '⛰️'], ['❄️', '🌲', '🏔️'], ['🌋', '🪨', '🔥'], ['💀', '🌀', '🪨']];
const RANK_COLOR = { F: '#7bd88f', E: '#6bc8ff', D: '#ffd36b', C: '#ff9b4a', B: '#ff6b6b', A: '#d66bff', S: '#ff4aa0', X: '#e8f4ff', Z: '#ff2020' };
const rcol = r => RANK_COLOR[r] || RANK_COLOR[r && r[0]] || '#fff';

function stateOf(n) { return n.state; }
function dangerOf(car, n) {
  if (!n.rank) return null;
  const t = E.threatOf(car, n.rank);
  return [t.label, t.color, `your power ${t.power} vs about ${t.need} expected here`];
}

// ---------- world map (canvas) ----------
const TS = 22;
let VW = 45, VH = 25;
// Fewer tiles on a phone so each one stays big enough to tap.
function fitView() { const nw = window.innerWidth < 700, w = nw ? 21 : 45, h = nw ? 19 : 25; const ch = w !== VW || h !== VH; VW = w; VH = h; return ch; }
fitView();
const Tr = () => E.Terrain;
const clampv = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rgb = (c, k) => `rgb(${clampv(c[0] * k, 0, 255) | 0},${clampv(c[1] * k, 0, 255) | 0},${clampv(c[2] * k, 0, 255) | 0})`;
const WATER = b => b <= 2 || b === 15;
let frame = 0, timer = null;

function drawDeco(g, dec, x0, y0, n) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x0 + x, y0 + y, w, h); };
  switch (dec) {
    case 1: R(9, 13, 4, 7, '#6b4423'); R(4, 3, 14, 11, '#2c7a2c'); R(6, 4, 7, 4, '#3f9d3f'); R(4, 11, 14, 3, '#226022'); break;
    case 2: R(9, 15, 4, 5, '#5a3a1c'); R(4, 11, 14, 4, '#1f5a3a'); R(6, 7, 10, 4, '#24683f'); R(8, 3, 6, 4, '#2c7a4a'); break;
    case 3: R(9, 4, 4, 15, '#3a8a3a'); R(5, 9, 4, 3, '#3a8a3a'); R(5, 7, 3, 5, '#3a8a3a'); R(13, 7, 4, 3, '#3a8a3a'); R(14, 5, 3, 5, '#3a8a3a'); R(9, 4, 1, 15, '#58b358'); break;
    case 4: { const cs = ['#e9514e', '#f5d142', '#f4f4f4', '#b46bff']; R(4, 6, 3, 3, cs[n & 3]); R(13, 12, 3, 3, cs[(n >> 2) & 3]); R(8, 15, 3, 3, cs[(n >> 4) & 3]); R(5, 7, 1, 4, '#2f7a2f'); break; }
    case 5: R(5, 11, 12, 8, '#6f6f78'); R(6, 10, 9, 3, '#9a9aa4'); R(5, 17, 12, 2, '#55555d'); break;
    case 6: R(10, 6, 3, 13, '#5a4430'); R(5, 8, 6, 2, '#5a4430'); R(12, 5, 6, 2, '#5a4430'); R(4, 6, 2, 3, '#5a4430'); break;
    case 7: R(10, 9, 3, 11, '#6b4a2a'); R(2, 4, 18, 5, '#7e9a38'); R(5, 3, 12, 2, '#9ab448'); break;
    case 8: R(10, 8, 3, 12, '#9a7a4a'); R(3, 5, 7, 3, '#2f8f3a'); R(12, 5, 7, 3, '#2f8f3a'); R(7, 2, 8, 3, '#3da24a'); break;
    case 9: R(4, 10, 1, 6, '#4f9a3a'); R(8, 8, 1, 8, '#58a842'); R(13, 11, 1, 5, '#4f9a3a'); R(17, 9, 1, 7, '#58a842'); break;
    case 10: R(8, 6, 6, 10, '#d7f2ff'); R(10, 4, 2, 14, '#ffffff'); break;
    default: break;
  }
}
function tileColor(w, wx, wy, qx, qy, t, tNW) {
  const base = Tr().BIOMES[t.b].c;
  let k = 1;
  if (!WATER(t.b)) k += clampv((t.e - tNW.e) * 5, -0.16, 0.16) + (t.e - 0.55) * 0.22;
  k += (Tr().h2(w.sid + 3, wx * 2 + qx, wy * 2 + qy) - 0.5) * 0.1;
  if (WATER(t.b) && ((Tr().h2(w.sid + 9, wx * 2 + qx, wy * 2 + qy) * 17 + (frame >> 1)) % 11) < 0.9) k += 0.2;
  return rgb(base, k);
}
function drawTown(g, ox, oy, w) {
  const night = (w.day % 8) >= 6, lit = night || (w.day % 8) === 5;
  const x = ox - 2 * TS, y = oy - 2 * TS;
  const house = (hx, hy, wall, roof) => {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + hx + 3, y + hy + 22, 26, 5);
    g.fillStyle = wall; g.fillRect(x + hx, y + hy + 8, 26, 16); g.fillStyle = roof; g.fillRect(x + hx - 3, y + hy + 2, 32, 8); g.fillRect(x + hx + 3, y + hy - 3, 20, 6);
    g.fillStyle = lit ? '#ffd97a' : '#2b3550'; g.fillRect(x + hx + 4, y + hy + 12, 5, 6); g.fillRect(x + hx + 17, y + hy + 12, 5, 6);
    g.fillStyle = '#3a2410'; g.fillRect(x + hx + 11, y + hy + 15, 5, 9);
  };
  g.fillStyle = '#b99a67'; g.fillRect(x + 4, y + 30, 5 * TS - 8, 3 * TS); g.fillStyle = '#c9ad7b'; g.fillRect(x + 2 * TS - 6, y + 2 * TS, 14, 3 * TS);
  house(6, 4, '#a07850', '#7a3b2e'); house(70, 2, '#b0a48a', '#8a2230'); house(40, 38, '#c0a070', '#c0803a'); house(5, 56, '#6a5a8a', '#3d2a66'); house(74, 54, '#6d6e7a', '#41424d');
  g.fillStyle = '#3b7cc0'; g.fillRect(x + 2 * TS - 6, y + 2 * TS + 8, 12, 12); g.fillStyle = '#cfe9ff'; g.fillRect(x + 2 * TS - 1, y + 2 * TS + 4, 2, 6);
  g.fillStyle = '#c0392b'; g.fillRect(x + 96, y - 10, 8, 20);
}
function drawSettlement(g, cx, cy, big, w, n) {
  const ph = w.day % 8, lit = ph >= 5;
  const house = (hx, hy, wall, roof, sc) => {
    const W = 24 * sc, Hh = 14 * sc;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(hx + 2, hy + Hh + 5, W, 4);
    g.fillStyle = wall; g.fillRect(hx, hy + 6, W, Hh); g.fillStyle = roof; g.fillRect(hx - 3, hy, W + 6, 8); g.fillRect(hx + 3, hy - 4, W - 6, 6);
    g.fillStyle = lit ? '#ffd97a' : '#2b3550'; g.fillRect(hx + 4, hy + 10, 5, 5); g.fillRect(hx + W - 9, hy + 10, 5, 5);
    g.fillStyle = '#3a2410'; g.fillRect(hx + W / 2 - 3, hy + Hh - 2, 6, 9);
  };
  const walls = ['#a07850', '#b0a48a', '#c0a070', '#8a6a46', '#9a7a58', '#a8a090'], roofs = ['#7a3b2e', '#8a2230', '#c0803a', '#5a3a1c', '#3a6fb5', '#41424d'];
  const cnt = big ? 6 : 3;
  g.fillStyle = '#b99a67'; g.fillRect(cx - (big ? 46 : 32), cy - 4, big ? 92 : 64, 12);
  for (let i = 0; i < cnt; i++) {
    const col = i % 3, row = (i / 3) | 0, hx = cx - (big ? 54 : 34) + col * (big ? 36 : 24) + (row ? 12 : 0), hy = cy - (big ? 36 : 28) + row * (big ? 32 : 0) + (col % 2) * 3;
    house(hx, hy, walls[(i + n.id.length) % 6], roofs[(i * 2 + n.id.length) % 6], big ? 1 : 0.9);
  }
  if (n.capital) {
    g.fillStyle = '#6e6a7c'; g.fillRect(cx - 12, cy - 58, 24, 30); g.fillStyle = '#8a869a'; g.fillRect(cx - 16, cy - 62, 32, 8);
    for (let k = -1; k <= 1; k++) g.fillRect(cx + k * 12 - 3, cy - 68, 6, 7);
    g.fillStyle = n.nation.ruler ? '#ffd24a' : '#9ec5ff'; g.fillRect(cx - 3, cy - 48, 6, 10);
  }
  g.fillStyle = '#c0392b'; g.fillRect(cx + (big ? 44 : 30), cy - (big ? 42 : 30), 4, 16); g.fillStyle = '#ffcb3d'; g.fillRect(cx + (big ? 44 : 30), cy - (big ? 42 : 30), 11, 6);
}
UI.drawHero = function (g, ox, oy, car) { return drawHero(g, ox, oy, car); };
function drawHero(g, ox, oy, car) {
  const c = car.char, col = (E.TIER_BY && UI.tierOf(c.tier) ? UI.tierOf(c.tier).color : '#ffcb3d');
  const bob = Math.round(Math.sin(frame / 4) * 1.5);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(ox + 4, oy + 18, 14, 4);
  g.fillStyle = '#1a1208'; g.fillRect(ox + 5, oy + 1 + bob, 12, 18);
  g.fillStyle = '#f1c9a0'; g.fillRect(ox + 7, oy + 2 + bob, 8, 7);
  g.fillStyle = '#3a2a1a'; g.fillRect(ox + 7, oy + 2 + bob, 8, 3);
  g.fillStyle = col; g.fillRect(ox + 6, oy + 10 + bob, 10, 7);
  g.fillStyle = '#2a2a3a'; g.fillRect(ox + 7, oy + 17 + bob, 3, 3); g.fillRect(ox + 12, oy + 17 + bob, 3, 3);
  g.fillStyle = '#fff'; g.fillRect(ox + 9, oy + 5 + bob, 1, 2); g.fillRect(ox + 12, oy + 5 + bob, 1, 2);
}
function label(g, text, x, y, color) {
  g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(10,8,20,.92)'; g.strokeText(text, x, y); g.fillStyle = color || '#fff'; g.fillText(text, x, y);
}
function drawWorld() {
  const cv = document.getElementById('worldcv');
  if (!cv) return false;
  const car = S.save.career; if (!car) return false;
  const w = E.worldOf(car), T = Tr(), g = cv.getContext('2d');
  const sight = E.worldSight(car);
  const sx = w.x - (VW >> 1), sy = w.y - (VH >> 1);
  g.imageSmoothingEnabled = false;
  const cache = {};
  const tt = (x, y) => cache[x + ',' + y] || (cache[x + ',' + y] = T.tile(w.sid, x, y));
  for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
    const wx = sx + i, wy = sy + j, x0 = i * TS, y0 = j * TS;
    if (!E.worldIsExplored(w, wx, wy)) {
      const n = T.h2(w.sid + 21, wx, wy);
      g.fillStyle = n < 0.5 ? '#0b0a12' : '#0e0c17'; g.fillRect(x0, y0, TS, TS);
      continue;
    }
    const t = tt(wx, wy), nw = tt(wx - 1, wy - 1), h = TS / 2;
    for (let q = 0; q < 4; q++) { g.fillStyle = tileColor(w, wx, wy, q & 1, q >> 1, t, nw); g.fillRect(x0 + (q & 1) * h, y0 + (q >> 1) * h, h, h); }
    if (t.dec) drawDeco(g, t.dec, x0, y0, (T.h2(w.sid + 33, wx, wy) * 255) | 0);
    const d = Math.hypot(wx - w.x, wy - w.y);
    if (d > sight - 2) { g.fillStyle = `rgba(8,6,20,${d > sight ? 0.52 : 0.52 * (d - (sight - 2)) / 2})`; g.fillRect(x0, y0, TS, TS); }
  }
  // the town
  const tx = (0 - sx) * TS + TS / 2, ty = (0 - sy) * TS + TS / 2;
  if (Math.abs(tx - VW * TS / 2) < VW * TS / 2 + 3 * TS && Math.abs(ty - VH * TS / 2) < VH * TS / 2 + 3 * TS) { drawTown(g, tx, ty, w); label(g, 'Hearthhold', tx, ty - 3 * TS + 8, '#ffe08a'); }
  // structures
  const nodes = E.worldNear(car, 30);
  for (const n of nodes) {
    const px = (n.x - sx) * TS, py = (n.y - sy) * TS;
    if (px < -3 * TS || py < -3 * TS || px > VW * TS + 3 * TS || py > VH * TS + 3 * TS) continue;
    const cx = px + TS / 2, cy = py + TS / 2, seen = n.state === 'seen';
    if (n.settlement && !seen) { drawSettlement(g, cx, cy, n.sub === 'town' || n.sub === 'capital', w, n); label(g, n.name, cx, cy + (n.sub === 'town' || n.sub === 'capital' ? 40 : 31), n.capital ? '#ffd24a' : '#ffe08a'); if (n.waystone) { g.font = '11px sans-serif'; g.fillText('✨', cx + 22, cy - 22); } continue; }
    const poi = E.WORLD.POI[n.sub];
    const col = seen ? '#8d88b8' : n.kind === 'dungeon' ? (UI.THEME_AURA[n.themeId] || '#ff8a3d') : n.secret ? '#7bf0ff' : '#ffe08a';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx, cy + 10, 11, 4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(18,14,30,.82)'; g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
    g.lineWidth = n.kind === 'dungeon' ? 2.5 : 1.8; g.strokeStyle = col; g.stroke();
    g.font = '15px "Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText(seen ? '❔' : poi.icon, cx, cy + 1);
    g.textBaseline = 'alphabetic';
    if (!seen) {
      label(g, n.name, cx, py + TS + 11, '#fff');
      if (n.rank) { g.fillStyle = '#14131f'; g.beginPath(); g.arc(cx + 11, cy - 11, 7, 0, 7); g.fill(); g.strokeStyle = rcol(n.rank); g.lineWidth = 1.6; g.stroke(); g.fillStyle = rcol(n.rank); g.font = '800 9px system-ui'; g.fillText(n.rank[0], cx + 11, cy - 8); }
      if (n.state === 'cleared') { g.font = '11px sans-serif'; g.fillText('✔️', cx - 12, cy - 8); }
      else if (n.kind === 'dungeon' && E.worldNodeLocked(car, n)) { g.font = '11px sans-serif'; g.fillText('🔒', cx - 12, cy - 8); }
      if (n.waystone) { g.font = '10px sans-serif'; g.fillText('✨', cx + 12, cy + 12); }
    }
  }
  // markers
  for (const m of (w.markers || [])) {
    const px = (m.x - sx) * TS, py = (m.y - sy) * TS;
    if (px < -TS || py < -TS || px > VW * TS || py > VH * TS) continue;
    g.fillStyle = '#4a3320'; g.fillRect(px + 8, py + 2, 2, 18); g.fillStyle = '#ff4a5a'; g.beginPath(); g.moveTo(px + 10, py + 2); g.lineTo(px + 21, py + 6); g.lineTo(px + 10, py + 10); g.fill();
    label(g, m.name, px + TS / 2, py + TS + 9, '#ffd3d8');
  }
  // compass pointers for off-screen markers and waypoints
  const targets = (w.markers || []).map(m => ({ x: m.x, y: m.y, c: '#ff6a78', t: m.name })).concat(E.worldAttuned(car).map(n => ({ x: n.x, y: n.y, c: '#7bf0ff', t: n.name })));
  if (Math.hypot(w.x, w.y) > 4) targets.push({ x: 0, y: 0, c: '#ffcb3d', t: 'Hearthhold' });
  const half = [VW * TS / 2, VH * TS / 2];
  targets.sort((p, q) => Math.hypot(p.x - w.x, p.y - w.y) - Math.hypot(q.x - w.x, q.y - w.y)).slice(0, 9).forEach(tg => {
    const dx = tg.x - w.x, dy = tg.y - w.y;
    if (Math.abs(dx) <= (VW >> 1) - 1 && Math.abs(dy) <= (VH >> 1) - 1) return;
    const k = Math.min((half[0] - 18) / Math.max(1, Math.abs(dx)), (half[1] - 16) / Math.max(1, Math.abs(dy)));
    const ex = half[0] + dx * k * 1, ey = half[1] + dy * k * 1, ang = Math.atan2(dy, dx);
    g.save(); g.translate(ex, ey); g.rotate(ang); g.fillStyle = tg.c; g.strokeStyle = '#0b0a14'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(10, 0); g.lineTo(-7, -7); g.lineTo(-3, 0); g.lineTo(-7, 7); g.closePath(); g.stroke(); g.fill(); g.restore();
    g.font = '600 10px system-ui'; g.textAlign = ex > half[0] ? 'right' : 'left'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,8,20,.9)';
    const tx = ex + (ex > half[0] ? -14 : 14), ty = ey + (ey > half[1] ? -8 : 11), txt = `${tg.t} · ${Math.round(Math.hypot(dx, dy))}`;
    g.strokeText(txt, tx, ty); g.fillStyle = '#fff'; g.fillText(txt, tx, ty); g.textAlign = 'center';
  });
  // walking route
  if (S.walk && S.walk.path) {
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (const p of S.walk.path) { const px = (p.x - sx) * TS + TS / 2 - 2, py = (p.y - sy) * TS + TS / 2 - 2; if (px > 0 && py > 0 && px < VW * TS && py < VH * TS) g.fillRect(px, py, 4, 4); }
    const last = S.walk.path[S.walk.path.length - 1];
    if (last) { g.strokeStyle = '#ffcb3d'; g.lineWidth = 2; g.strokeRect((last.x - sx) * TS + 2, (last.y - sy) * TS + 2, TS - 4, TS - 4); }
  }
  // hover
  if (S.hoverTile) { const hx = (S.hoverTile.x - sx) * TS, hy = (S.hoverTile.y - sy) * TS; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.strokeRect(hx + 1, hy + 1, TS - 2, TS - 2); }
  drawHero(g, (VW >> 1) * TS, (VH >> 1) * TS, car);
  // clouds and time of day
  const ph = w.day % 8;
  g.fillStyle = 'rgba(0,0,0,.07)';
  for (let k = 0; k < 4; k++) { const cx = ((frame * 0.35 + k * 300) % (VW * TS + 300)) - 150, cy = 60 + k * 120; g.beginPath(); g.ellipse(cx, cy, 130, 36, 0, 0, 7); g.fill(); }
  if (ph >= 6) { g.fillStyle = 'rgba(10,20,70,.4)'; g.fillRect(0, 0, VW * TS, VH * TS); }
  else if (ph === 5) { g.fillStyle = 'rgba(255,110,40,.13)'; g.fillRect(0, 0, VW * TS, VH * TS); }
  else if (ph === 0) { g.fillStyle = 'rgba(255,200,150,.1)'; g.fillRect(0, 0, VW * TS, VH * TS); }
  updateInfo(car);
  return true;
}
function describeTile(car, x, y) {
  const w = E.worldOf(car), T = Tr();
  if (!E.worldIsExplored(w, x, y)) return `(${x}, ${y}) · unexplored`;
  const t = T.tile(w.sid, x, y), z = E.worldZone(x, y);
  const s = T.structAt(w.sid, x, y), n = s ? E.worldNode(car, s.id) : null;
  const clock = ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Dusk', 'Night', 'Late night'][w.day % 8];
  const place = n && n.state !== 'hidden' ? ` · ${n.state === 'seen' ? 'something unknown' : n.name}` : '';
  return `(${x}, ${y}) · ${T.BIOMES[t.b].name} · zone ${T.zoneLabel(w.sid, x, y)}${place}`;
}
function updateInfo(car) {
  const w = E.worldOf(car), el = document.getElementById('mapinfo');
  if (!el) return;
  const clock = ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Dusk', 'Night', 'Late night'][w.day % 8];
  const tile = S.hoverTile || { x: w.x, y: w.y };
  el.textContent = `${S.hoverTile ? 'Pointing at ' : 'You: '}${describeTile(car, tile.x, tile.y)} · ${clock}, day ${w.day}`;
}
UI.stopWalk = (...a) => stopWalk(...a);
function stopWalk(msg, keepGoal) {
  if (S.walk && S.walk.iv) clearInterval(S.walk.iv);
  if (!keepGoal) S.goal = null;
  const had = !!S.walk; S.walk = null;
  if (had) { UI.persist(); }
  if (msg) S.msg = msg;
  return had;
}
function startWalk(path) {
  const car = S.save.career;
  stopWalk(undefined, true);
  S.walk = { path: path.slice(), iv: null, n: 0 };
  const tick = () => {
    const wk = S.walk;
    if (!wk || !document.getElementById('worldcv')) { stopWalk(); return; }
    const p = wk.path.shift(), w = E.worldOf(car);
    if (!p) { legEnd(''); return; }
    const r = E.worldStep(car, p.x - w.x, p.y - w.y);
    wk.n++;
    if (!r.ok) { finishWalk(r.msg); return; }
    if (r.arrived || r.pending) { S.goal = null; finishWalk(r.msg); return; }
    if (!wk.path.length) { legEnd(r.msg); return; }
    if (r.msg) S.msg = r.msg;
    drawWorld();
  };
  S.walk.iv = setInterval(tick, 65);
}
function legEnd(msg) {
  const g = S.goal;
  if (g) { stopWalk(undefined, true); const car = S.save.career, w = E.worldOf(car); if (!(w.pending && !w.pending.res)) { A.mapgo(g); if (S.walk) { drawWorld(); return; } } }
  finishWalk(msg);
}
function finishWalk(msg) {
  stopWalk(msg);
  const car = S.save.career; if (car) S.hub = E.careerHub(car);
  UI.persist(); UI.render(true);
}

function encounterPanel(car) {
  const w = E.worldOf(car), p = w.pending;
  if (!p) return '';
  const ev = p.ev, res = p.res;
  const tag = ev.road ? '<span class="tag">Road event</span>' : (ev.revisit ? '<span class="tag">Return visit: reduced XP</span>' : '');
  if (res) {
    const lines = res.lines.map(l => `<p>${esc(l)}</p>`).join('');
    const items = res.items.map(it => UI.itemBlock(it, '')).join('');
    const go = res.fight ? `<button class="primary big" data-act="mapfight">⚔️ Fight! <kbd>Enter</kbd></button>` : `<button class="primary" data-act="mapdismiss">Continue <kbd>Enter</kbd></button>`;
    return `<div class="panel encounter fade"${res.fight ? ' style="border-color:var(--bad)"' : ''}><h2>${ev.icon} ${esc(ev.title)} ${tag}</h2>${lines}${items}<p>${go}</p></div>`;
  }
  const hub = S.hub;
  const choices = ev.choices.map((ch, i) => {
    const c = ch.cost || {};
    const bad = (c.gold && car.gold < c.gold) || (c.potion && car.potions < c.potion);
    const chk = ch.check ? ` <span class="dim small">(+${Math.floor((hub.d.st[ch.check.stat] || 0) / 2) + Math.floor(hub.d.st.LUK / 3)} vs d20)</span>` : '';
    return `<button class="choice" data-act="mapchoose" data-i="${i}" ${bad ? 'disabled' : ''}><kbd>${i + 1}</kbd> ${esc(ch.label)}${chk}</button>`;
  }).join('');
  return `<div class="panel encounter fade"><h2>${ev.icon} ${esc(ev.title)} ${tag}</h2><p>${esc(ev.text)}</p><div class="choices">${choices}</div></div>`;
}
// The job you are on: where to go, which way, how far, how long you have left.
function questPanel(car) {
  const q = E.questInfo(car); if (!q) return '';
  const left = q.left >= 0 ? `${q.left} day${q.left === 1 ? '' : 's'} left` : '<span style="color:var(--bad)">late: half pay</span>';
  const hearts = q.kind === 'escort' ? ` · ${esc(q.parcel)} ${'❤️'.repeat(Math.max(0, q.hp))}${'🖤'.repeat(Math.max(0, 3 - q.hp))}` : '';
  const verb = { courier: 'Deliver ' + q.parcel + ' to', escort: 'Escort ' + q.parcel + ' to', errand: 'Find what was lost at', slay: 'Clear out', survey: 'Investigate' }[q.kind || 'courier'];
  const w = E.worldOf(car), here = w.x === q.to.x && w.y === q.to.y;
  const note = q.kind === 'survey' ? 'Walk there, enter and clear it to learn what it was. It is unrated and not balanced for you.' : q.kind === 'slay' ? 'Walk there, enter the lair and win.' : q.kind === 'escort' ? 'Walk the whole way. Bandits and beasts may ambush you on the road, and if your client is hurt too often they will not survive.' : 'Walk to it. A road ambush is possible on the way.';
  return `<div class="panel" style="border-color:#ffcb3d"><div class="row between"><div style="flex:1;min-width:230px"><h3>${q.k.icon} Current job: ${q.k.name}</h3>
    <div><b>${verb} ${esc(q.to.name)}</b></div>
    <div class="small"><span style="font-size:20px;color:var(--accent)">${q.arrow}</span> <b>${q.dist}</b> tiles to the <b>${q.dir}</b> · ${left}${hearts}</div>
    <div class="small dim">${note} It is flagged on the map; an arrow at the edge of the screen points the way. Reward ${q.gold}g, ${q.credits} credits, ${q.rep} rep.${here ? ' <b>You are here.</b>' : ''}</div></div>
    <div class="row"><button class="primary" data-act="mapgo" data-x="${q.to.x}" data-y="${q.to.y}">${here ? 'Look around' : '🧭 Walk there'}</button><button class="tiny danger" data-act="courierabandon">Abandon</button></div></div></div>`;
}
function hereCard(car) {
  const w = E.worldOf(car), n = E.worldAt(car);
  if (!n || n.state === 'hidden') return '';
  const poi = E.WORLD.POI[n.sub];
  let body = '', act = '';
  if (n.settlement) {
    body = `<p class="small">${esc(poi.blurb)}</p>${n.capital ? UI.capitalBlurb(n) : ''}<div class="small dim">Services here: ${n.capital ? 'inn, healer, Guild hall and rank test, grand arena, ' + (n.nation.ruler ? 'palace' : 'council chamber') + ', grand market, smithy, alchemist, bank, academy, legendary parties.' : n.race ? 'inn, healer, market and the elders of the ' + esc(n.race) + '.' : n.sub === 'town' ? 'inn, healer, market, smithy, alchemist, Guild hall and rank test.' : 'inn, healer, general store.'}</div>`;
    act = `<button class="primary big" data-act="settleenter">${poi.icon} Enter ${esc(n.name)}</button>`;
  } else if (n.kind === 'dungeon') {
    const rk = E.RANKS[n.rank], th = D.THEMES.find(t => t.id === n.themeId), dg = dangerOf(car, n);
    const wd = n.warden ? E.WARDENS[n.warden] : null, lock = E.worldNodeLocked(car, n);
    body = `<div class="small"><b>${rk.wild ? esc(E.rankLabel(n.rank)) + ' land' : n.rank + '-rank'}</b> · ${esc(th.name)} · ${n.rooms || rk.rooms} rooms · boss <b>${esc(th.boss.name)}</b></div>
      <div class="small"><span style="color:${dg[1]}">${dg[0]}</span> <span class="dim">· ${dg[2]} · recommended level ${rk.rec}</span></div>
      ${wd ? `<div class="small" style="color:var(--accent)">${wd.icon} <b>${wd.name} boss:</b> ${esc(wd.desc)}</div>` : ''}
      <div class="small dim">${n.clears ? `Cleared ${n.clears}×. Replays pay normal loot and XP.` : 'First clear: gold, a gear drop, credits, reputation and a big XP bonus.'}</div>
      <div class="small dim">${rk.wild ? (n.rank[0] === 'Z' ? '<b style="color:#ff6060">Forbidden land.</b> No guild has ever mapped it and no rank applies. Nothing here is balanced for you; the rewards are the best in the world.' : 'Beyond the Guild\'s maps. No rank applies; the threat only grows with distance.') : 'Any hero may enter. Rank ' + n.rank + ' only sets the recommended level and the danger.'}</div>`;
    act = `<button class="primary big" data-act="mapenter" data-id="${n.id}">⚔️ Enter ${esc(n.name)}</button>`;
  } else {
    const wait = n.cd && w.day < n.cd;
    body = `<p class="small">${esc(poi.blurb)}</p><div class="small dim">${wait ? `Picked clean for now. Returns in ${n.cd - w.day} day(s).` : (n.state === 'visited' ? 'Visited. You may come back for more.' : 'Not yet explored.')}</div>`;
    act = `<button class="primary" data-act="mapexplore" ${wait || (w.pending && !w.pending.res) ? 'disabled' : ''}>Explore here</button>`;
  }
  const way = n.waystone ? ' <span class="tag" style="color:#7bf0ff;border-color:#7bf0ff">🗿 attuned</span>' : '';
  return `<div class="panel nodepanel"><h3>${poi.icon} ${esc(n.name)}${way}</h3><div class="small dim">${esc(Tr().BIOMES[n.biome].name)} · zone ${Tr().zoneLabel(E.worldOf(car).sid, n.x, n.y)}</div>${body}<div style="margin-top:10px">${act}</div></div>`;
}
function nearbyPanel(car) {
  const w = E.worldOf(car);
  const list = E.worldNear(car, 70).filter(n => !(n.x === w.x && n.y === w.y)).sort((p, q) => Math.hypot(p.x - w.x, p.y - w.y) - Math.hypot(q.x - w.x, q.y - w.y)).slice(0, 12);
  const rows = list.map(n => {
    if (n.state === 'seen') { const d0 = Math.round(Math.hypot(n.x - w.x, n.y - w.y)); return `<div class="item" style="--c:#8d88b8"><div class="slot">❔</div><div class="body"><b>Unexplored place</b><div class="small dim">${d0} tiles · get closer (5 tiles) or scout to learn what it is</div></div><button class="tiny" data-act="mapgo" data-x="${n.x}" data-y="${n.y}">Go</button></div>`; }
    const poi = E.WORLD.POI[n.sub], d = Math.round(Math.hypot(n.x - w.x, n.y - w.y)), dg = dangerOf(car, n);
    const wi = n.waystone ? E.warpInfo(car, n.id) : null, wpoor = wi && car.gold < wi.gold, wpend = w.pending && !w.pending.res;
    const warp = wi ? `<button class="tiny" data-act="mapwarp" data-id="${esc(n.id)}" ${wpoor || wpend ? 'disabled' : ''} title="Fast travel (${wi.free ? 'free' : wi.gold + 'g'}, ${wi.days} day${wi.days > 1 ? 's' : ''})">🗿 ${wi.free ? 'Travel' : wi.gold + 'g'}</button> ` : '';
    return `<div class="item" style="--c:${n.kind === 'dungeon' ? '#ff8a3d' : '#8fd0ff'}"><div class="slot">${poi.icon}</div><div class="body"><b>${esc(n.name)}</b>${n.rank ? ` <span class="tag" style="color:${rcol(n.rank)};border-color:${rcol(n.rank)}">${E.RANKS[n.rank].wild ? E.RANKS[n.rank].name + ' ' + E.RANKS[n.rank].tier : n.rank}</span>` : ''}${n.state === 'cleared' ? ' <span class="tag">✔ cleared</span>' : ''}
      <div class="small dim">${d} tiles · ${esc(Tr().BIOMES[n.biome].name)}${dg ? ` · <span style="color:${dg[1]}">${dg[0]}</span>` : ''}</div></div><div class="row">${warp}<button class="tiny" data-act="mapgo" data-x="${n.x}" data-y="${n.y}">Go</button></div></div>`;
  }).join('');
  return `<div class="panel"><h3>🧭 Places nearby</h3>${rows || '<p class="small dim">Nothing spotted yet. Walk out and explore, or scout.</p>'}</div>`;
}

// Fast travel to Hearthhold and every attuned waypoint. Free from a waypoint, for gold from the wild.
function travelPanel(car) {
  const w = E.worldOf(car), att = E.worldAttuned(car);
  const list = [{ id: 'town', name: 'Hearthhold', icon: '🏰', x: 0, y: 0 }].concat(att.map(n => ({ id: n.id, name: n.name, icon: n.settlement ? E.WORLD.POI[n.sub].icon : '🗿', x: n.x, y: n.y })));
  const rows = list.map(n => ({ n, i: E.warpInfo(car, n.id) })).filter(r => r.i && r.i.dist >= 0.5).sort((a, b) => a.i.dist - b.i.dist).map(({ n, i }) => {
    const pend = w.pending && !w.pending.res, poor = car.gold < i.gold;
    const cost = i.free ? `${i.days} day` : `${i.gold}g · ${i.days} days`;
    return `<div class="item" style="--c:#7bf0ff"><div class="slot">${n.icon}</div><div class="body"><b>${esc(n.name)}</b> <span class="tag" style="color:${RANK_COLOR[E.CAREER_RANKS[E.worldZone(n.x, n.y)]]}">${E.CAREER_RANKS[E.worldZone(n.x, n.y)]}</span><div class="small dim">${Math.round(i.dist)} tiles away</div></div><button class="tiny" data-act="mapwarp" data-id="${esc(n.id)}" ${pend || poor ? 'disabled' : ''} title="${poor ? 'Not enough gold' : ''}">Travel · ${cost}</button></div>`;
  }).join('');
  const free = E.warpInfo(car, 'town').free;
  return `<div class="panel"><h3>🗿 Fast travel</h3><p class="small dim">${free ? 'You are at a waypoint: travel is free and takes a day.' : 'You are in the wild: recalling costs gold and two days. Walk to a waystone or settlement to travel free.'} Waystones and any settlement you have visited are waypoints. Double-click a waypoint on the map, or press <kbd>H</kbd> to go home.</p>${rows || '<p class="small dim">No other waypoints yet. Attune waystones and visit villages and towns.</p>'}</div>`;
}
function settlementView(car, n) {
  const P = UI.hubParts, tp = P.townPanels(car), poi = E.WORLD.POI[n.sub];
  const tabs = n.capital ? [['inn', '🍺 Inn'], ['board', '📜 Guild'], ['arena', '🎯 Arena'], ['palace', n.nation.ruler ? '🏰 Palace' : '🏛️ Council'], ['grand', '💎 Grand market'], ['market', '🏪 Store'], ['smith', '⚒️ Smithy'], ['alchemy', '⚗️ Alchemist'], ['bank', '🏦 Bank'], ['academy', '🎓 Academy']] : n.race ? [['inn', '🍺 Inn'], ['market', '🏪 Market'], ['elders', '🧓 Elders']] : n.sub === 'town' ? [['inn', '🍺 Inn'], ['market', '🏪 Market'], ['smith', '⚒️ Smithy'], ['alchemy', '⚗️ Alchemist'], ['board', '📜 Guild board']] : [['inn', '🍺 Inn'], ['market', '🏪 General store']];
  const t = tabs.some(x => x[0] === S.settleTab) ? S.settleTab : 'inn';
  const body = { inn: () => tp.tavern + tp.healer, elders: () => racePanel(car, n), market: () => P.hubMarket(car), smith: () => P.hubSmith(car), alchemy: () => P.hubAlchemy(car), board: () => P.hubBoard(car), arena: () => UI.arenaPanel(car), palace: () => UI.palacePanel(car, n), grand: () => UI.grandPanel(car, n), bank: () => bankPanel(car), academy: () => academyPanel(car) }[t]();
  const nav = `<div class="subtabs">${tabs.map(([id, nm]) => `<button class="${t === id ? 'on' : ''}" data-act="settletab" data-sub="${id}">${nm}</button>`).join('')}</div>`;
  return `<div class="scene th-none motes"><div class="row between"><div><div style="font:700 22px var(--serif)">${poi.icon} ${esc(n.name)}</div><div class="small dim">${esc(poi.blurb)} A waypoint: fast-travel here from town or any other waypoint.${n.capital ? ' ' + esc(n.nation.full) + '.' : ''}</div></div><button data-act="settleleave">← Back to the map</button></div></div>${nav}${body}`;
}
function racePanel(car, n) {
  const b = E.raceBoon(car, n), r = b.raceInfo, mine = car.char.race === n.race;
  const names = Object.keys(car.boons || {});
  return `<div class="panel"><h3>🧓 Elders of the ${esc(n.race)}</h3><p class="small">${esc(r ? r.trait : '')}</p>
    <div class="item" style="--c:#ffcb3d"><div class="slot">${mine ? '🏅' : '🤝'}</div><div class="body"><b>${mine ? 'Rite of Kinship' : 'Become a Friend of the ' + esc(n.race)}</b>
      <div class="small dim">${mine ? 'They honour one of their own for free: +2 ' + b.stat + ' permanently and +5 reputation.' : 'A gift of ' + b.cost + ' gold earns their trust: +1 ' + b.stat + ' permanently.'} Each people grants this once.</div></div>
      <button class="tiny" data-act="raceboon" data-id="${n.id}" ${b.taken || (!mine && car.gold < b.cost) ? 'disabled' : ''}>${b.taken ? 'Honoured' : (mine ? 'Accept' : b.cost + 'g')}</button></div>
    <p class="small dim">Peoples honoured so far: <b>${names.length}</b>${names.length ? ' (' + names.map(esc).join(', ') + ')' : ''}. Eighteen peoples live across the world, in the lands that suit them.</p></div>`;
}
function markersPanel(car) {
  const w = E.worldOf(car), ms = w.markers || [];
  const rows = ms.map(m => `<div class="item" style="--c:#ff6a78"><div class="slot">🚩</div><div class="body"><b>${esc(m.name)}</b><div class="small dim">${Math.round(Math.hypot(m.x - w.x, m.y - w.y))} tiles · (${m.x}, ${m.y})</div></div><div class="row"><button class="tiny" data-act="mapgo" data-x="${m.x}" data-y="${m.y}">Go</button><button class="tiny" data-act="mapunpin" data-id="${m.id}" title="Remove marker">✕</button></div></div>`).join('');
  return `<div class="panel"><h3>🚩 Markers</h3>${rows || '<p class="small dim">No markers yet. Pin a spot to find your way back later.</p>'}
    <div class="row" style="margin-top:8px"><button class="tiny" data-act="mappinhere">📍 Pin this spot</button><button class="tiny" data-act="mapov">${S.showOv ? 'Hide' : 'Show'} overview map</button></div>
    <p class="small dim">Tip: right-click any tile on the map to drop or remove a marker. Off-screen markers and waypoints show as arrows at the edge.</p></div>`;
}
function overviewPanel() {
  if (!S.showOv) return '';
  return `<div class="panel"><h3>🗺️ Overview (explored land)</h3><canvas id="overviewcv" class="overview" width="500" height="500"></canvas><div class="small dim">Click an explored spot to travel there. Gold squares are settlements, cyan are waypoints, red flags are your markers, orange dots are dungeons.</div></div>`;
}
UI.hubMap = function (car) {
  fitView();
  const w = E.worldOf(car);
  if (S.settle) {
    const here = E.worldAt(car);
    if (here && here.id === S.settle && here.settlement) return settlementView(car, here);
    S.settle = null;
  }
  const pending = w.pending && !w.pending.res;
  const seeds = `<span class="tag" title="Same seed, same world">🌱 ${esc(w.seed)}</span>`;
  const z = E.worldZone(w.x, w.y);
  const status = `<div class="panel mapbar"><div class="row between">
    <div class="small"><b>Day ${w.day}</b> · Zone <b style="color:${rcol(Tr().wildOf(w.sid, w.x, w.y) || E.CAREER_RANKS[z])}">${Tr().zoneLabel(w.sid, w.x, w.y)}</b> · ${seeds} <button class="tiny" data-act="mapcopy" title="Copy the world seed">Copy seed</button></div>
    <div class="row"><button data-act="mapscout" ${pending ? 'disabled' : ''} title="Spend a day to survey the land and find hidden places">🔭 Scout (1 day)</button><button data-act="mappinhere" title="Drop a marker here">📍 Pin</button>${E.worldInTown(car) ? '<button data-act="hubtab" data-sub="town">🏰 Enter town</button>' : `<button data-act="mapreturn" ${pending ? 'disabled' : ''}>🏠 Return home</button>`}</div></div>
    <div class="small dim" style="margin-top:4px">Walk with <b>WASD / arrow keys</b>, the on-screen arrows, or <b>tap a tile</b> to auto-walk. Press and hold a tile to pin it; double-tap a waypoint to fast-travel there. Dark areas are unexplored. Danger grows with distance from Hearthhold (zones F to S). Every new place gives XP.</div></div>`;
  return `${status}${encounterPanel(car)}${questPanel(car)}<div class="mapwrap"><canvas id="worldcv" width="${VW * TS}" height="${VH * TS}"></canvas><div id="mapinfo" class="mapinfo"></div></div>
    <div class="dpad"><button class="u" data-act="mapstep" data-dx="0" data-dy="-1" aria-label="North">▲</button><button class="l" data-act="mapstep" data-dx="-1" data-dy="0" aria-label="West">◀</button><button class="c" data-act="mapstep" data-dx="0" data-dy="0" aria-label="Stop">■</button><button class="r" data-act="mapstep" data-dx="1" data-dy="0" aria-label="East">▶</button><button class="d" data-act="mapstep" data-dx="0" data-dy="1" aria-label="South">▼</button></div>
    <div class="grid g2">${hereCard(car) || '<div class="panel"><h3>🧭 On the road</h3><p class="small dim">Nothing here but open land. Click anywhere explored to walk there.</p></div>'}${nearbyPanel(car)}</div>
    <div class="grid g2">${travelPanel(car)}${markersPanel(car)}</div>${overviewPanel()}`;
};

// ---------- town ----------
const TOWN_B = {
  guild: { name: 'Guild Hall', tab: 'Mission board, reputation, ranks' },
  market: { name: 'Market', tab: 'General store, armory, credit shop' },
  smith: { name: 'Smithy', tab: 'Upgrade, repair, enchant, salvage' },
  alchemy: { name: 'Alchemist', tab: 'Craft potions and bombs' },
  healer: { name: 'Temple', tab: 'Heal injuries, blessings' },
  tavern: { name: 'Tavern', tab: 'Hire companions, buy rumors' },
  home: { name: 'Barracks', tab: 'Hero, skills, equipment' },
  store: { name: 'Storehouse', tab: 'Stash and supplies' },
  bank: { name: 'Bank', tab: 'Keep gold safe' },
  academy: { name: 'Academy', tab: 'Respec, lessons' },
  arena: { name: 'Arena', tab: 'Gauntlet' },
};
function bankPanel(car) {
  const bank = car.bank || 0;
  const btn = (act, n, label, ok) => `<button class="tiny" data-act="${act}" data-n="${n}" ${ok ? '' : 'disabled'}>${label}</button>`;
  return `<div class="panel"><h3>🏦 Bank of Hearthhold</h3><p class="small dim">Gold in the vault is safe when you die (death takes 15% of the gold you carry). The vault earns 0.4% interest every day you spend on the road, up to 150 gold a day.</p>
    <p>Carried <b style="color:var(--accent)">${UI.fmt(car.gold)}</b> · In the vault <b style="color:var(--good)">${UI.fmt(bank)}</b></p>
    <div class="row" style="gap:6px;flex-wrap:wrap"><span class="small dim">Deposit:</span>${btn('bankdep', 100, '100', car.gold >= 1)}${btn('bankdep', 1000, '1,000', car.gold >= 1)}${btn('bankdep', 'all', 'All', car.gold >= 1)}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><span class="small dim">Withdraw:</span>${btn('bankwd', 100, '100', bank >= 1)}${btn('bankwd', 1000, '1,000', bank >= 1)}${btn('bankwd', 'all', 'All', bank >= 1)}</div></div>`;
}
function academyPanel(car) {
  const c = car.char, alloc = c.alloc || {}, pts = Object.values(alloc).reduce((a, b) => a + b, 0);
  const rc = E.respecCost(car), lc = E.lessonCost(car), cap = E.lessonCap(car), got = car.lessons || 0;
  return `<div class="panel"><h3>🎓 Academy</h3><p class="small dim">The masters can undo your training or teach you more.</p>
    <div class="item" style="--c:#8fd0ff"><div class="slot">🔄</div><div class="body"><b>Respec stats</b><div class="small dim">Refunds the ${pts} stat point${pts === 1 ? '' : 's'} you have spent since the Academy began keeping records. Costs ${rc}g and rises each time.</div></div><button class="tiny" data-act="respec" ${pts && car.gold >= rc ? '' : 'disabled'}>${rc}g</button></div>
    <div class="item" style="--c:#ffe08a"><div class="slot">📖</div><div class="body"><b>Buy a lesson</b><div class="small dim">+1 skill point for ${lc} Guild Credits. You can learn ${cap - got} more lesson${cap - got === 1 ? '' : 's'} at your level (1 per 5 levels).</div></div><button class="tiny" data-act="lesson" ${got < cap && car.credits >= lc ? '' : 'disabled'}>${lc} cr</button></div>
    <div class="item" style="--c:#7bd88f"><div class="slot">🌳</div><div class="body"><b>Unlearn the skill tree</b><div class="small dim">Refunds the ${E.treeSpent(c)} points you have spent in the tree and removes its skills. Costs ${E.treeResetCost(car)}g and rises each time.</div></div><button class="tiny" data-act="treereset" ${E.treeSpent(c) && car.gold >= E.treeResetCost(car) ? '' : 'disabled'}>${E.treeResetCost(car)}g</button></div>
    <p class="small dim">Credits: <b>${car.credits}</b></p></div>`;
}
function arenaPanel(car) { return UI.arenaPanel(car); }
UI.hubTownView = function (car) {
  const w = E.worldOf(car), P = UI.hubParts;
  const home = E.worldInTown(car);
  const clock = ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Dusk', 'Night', 'Late night'][w.day % 8];
  const at = S.townAt || null;
  let panel = '';
  if (!home) panel = awayPanel(car);
  else if (at) {
    const tp = P.townPanels(car);
    const body = {
      guild: () => P.hubBoard(car) + tp.guild + UI.partyPanel(car) + tp.record, market: () => P.hubMarket(car), smith: () => P.hubSmith(car), alchemy: () => P.hubAlchemy(car),
      healer: () => tp.healer, tavern: () => tp.tavern, home: () => P.hubHero(car), store: () => P.hubBag(car), bank: () => bankPanel(car), academy: () => academyPanel(car), arena: () => arenaPanel(car),
    }[at]();
    panel = `<div class="panel"><div class="row between"><h3>${TOWN_B[at].name}</h3><button class="tiny" data-act="townat" data-b="">← Back to the square</button></div></div>${body}`;
  } else panel = `<div class="panel"><h3>Hearthhold</h3><p class="small dim">${clock}, day ${w.day}. Tap a building to go inside. Hearthhold is your home city, not a capital. The Guild Hall holds the mission board; the market and smithy keep your gear in shape; the temple heals injuries; the tavern hires companions. The great capitals lie far out in dangerous lands.</p></div>`;
  return `<div class="townwrap ${home ? '' : 'away'}">${UI.townCanvas()}${home ? '' : '<div class="awaylabel">You are away from town</div>'}</div>${panel}`;
};
function awayPanel(car) {
  const w = E.worldOf(car), days = Math.min(4, Math.max(1, Math.ceil(Math.hypot(w.x, w.y) / 14)));
  return `<div class="panel" style="border-color:var(--accent)"><h3>🗺️ You are away from town</h3><p class="small dim">You are ${(E.worldAt(car) && E.worldAt(car).name) ? 'at ' + esc(E.worldAt(car).name) : 'out in the wilds'}. The shops, board and services are in Hearthhold.</p>
    <button class="primary" data-act="mapreturn">Walk back to town (${days} day${days > 1 ? 's' : ''})</button> <button data-act="hubtab" data-sub="map">Open the map</button></div>`;
}
UI.awayPanel = awayPanel;

// ---------- actions ----------
function after(res) {
  if (res && res.msg) S.msg = res.msg;
  if (S.hub) E.refresh(S.hub);
  UI.persist();
}
const hubFresh = () => { const car = S.save.career; S.hub = E.careerHub(car); };
Object.assign(A, {
  mapgo(d) {
    const car = S.save.career, w = E.worldOf(car), x = +d.x, y = +d.y;
    if (w.pending && !w.pending.res) { S.msg = 'Finish what you are doing here first.'; return; }
    if (w.x === x && w.y === y) { S.msg = 'You are already there.'; return; }
    const r = E.worldRoute(car, x, y);
    if (!r || !r.path.length) { S.msg = 'No walkable route there (water or sea in the way).'; S.goal = null; return; }
    S.goal = r.partial ? { x, y, legs: ((S.goal && S.goal.x === x && S.goal.y === y) ? S.goal.legs : 0) + 1 } : null;
    if (S.goal && S.goal.legs > 14) { S.goal = null; S.msg = 'That route is too winding. Try a closer marker.'; return; }
    startWalk(r.path);
  },
  mappin(d) { const car = S.save.career; const r = E.worldPin(car, +d.x, +d.y); S.msg = r.msg; UI.persist(); },
  mappinhere() { const car = S.save.career, w = E.worldOf(car); const r = E.worldPin(car, w.x, w.y); S.msg = r.msg; UI.persist(); },
  mapunpin(d) { E.worldUnpin(S.save.career, d.id); UI.persist(); },
  mapov() { S.showOv = !S.showOv; },
  settleenter() { const n = E.worldAt(S.save.career); if (n && n.settlement) { S.settle = n.id; S.settleTab = 'inn'; hubFresh(); } },
  settleleave() { S.settle = null; },
  raceboon(d) { const car = S.save.career; const r = E.worldRace(car, d.id); hubFresh(); after(r); },
  settletab(d) { S.settleTab = d.sub; },
  mapstop() { stopWalk(); },
  mapscout() { stopWalk(); const car = S.save.career; const r = E.worldScout(car); hubFresh(); after(r); },
  mapchoose(d) { const car = S.save.career; const r = E.worldChoose(car, +d.i); hubFresh(); after(r); },
  mapfight() {
    stopWalk(); const car = S.save.career, m = E.worldAmbush(car);
    if (!m) { S.msg = 'Nothing to fight.'; return; }
    S.mode = 'career'; UI.persist(); UI.startRun(E.careerNewRun(car, m)); UI.beginCombat('boss');
  },
  mapdismiss() { const car = S.save.career; E.worldDismiss(car); after(); },
  mapexplore() {
    const car = S.save.career;
    const r = E.worldRevisit(car); hubFresh(); after(r);
  },
  mapreturn() { stopWalk(); const car = S.save.career; const r = E.worldReturn(car); hubFresh(); after(r); },
  mapwarp(d) { stopWalk(); const car = S.save.career; const r = E.worldWarp(car, d.id); hubFresh(); after(r); },
  mapcopy() {
    const car = S.save.career, seed = E.worldOf(car).seed;
    try { navigator.clipboard.writeText(seed); S.msg = 'Seed copied: ' + seed; } catch (e) { S.msg = 'Seed: ' + seed; }
  },
  townat(d) { S.townAt = d.b || null; },
  mapenter(d) {
    const car = S.save.career;
    const m = E.worldEnter(car, d.id);
    if (!m) { S.msg = 'You cannot enter that from here.'; return; }
    stopWalk();
    S.mode = 'career';
    UI.startRun(E.careerNewRun(car, m));
  },
  seedrandom() { S.worldSeed = E.randomSeedText(); },
  bankdep(d) { const car = S.save.career; const r = E.bankDeposit(car, d.n === 'all' ? car.gold : +d.n); hubFresh(); after(r); },
  bankwd(d) { const car = S.save.career; const r = E.bankWithdraw(car, d.n === 'all' ? (car.bank || 0) : +d.n); hubFresh(); after(r); },
  respec() { const car = S.save.career; const r = E.respec(car); hubFresh(); after(r); },
  lesson() { const car = S.save.career; const r = E.buyLesson(car); hubFresh(); after(r); },
});

// ---------- canvas lifecycle ----------
function bindCanvas() {
  const cv = document.getElementById('worldcv');
  if (!cv) return;
  const tileAt = ev => {
    const r = cv.getBoundingClientRect(), car = S.save.career, w = E.worldOf(car);
    const i = Math.floor((ev.clientX - r.left) / r.width * VW), j = Math.floor((ev.clientY - r.top) / r.height * VH);
    return { x: w.x - (VW >> 1) + i, y: w.y - (VH >> 1) + j };
  };
  cv.addEventListener('mousemove', ev => { S.hoverTile = tileAt(ev); updateInfo(S.save.career); });
  cv.addEventListener('mouseleave', () => { S.hoverTile = null; });
  // touch: tapping shows what is there, holding pins the tile (the touch version of right-click)
  let lpTimer = 0, lpFired = 0, touchAt = 0, sx0 = 0, sy0 = 0;
  cv.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse') return;
    touchAt = Date.now(); sx0 = ev.clientX; sy0 = ev.clientY;
    S.hoverTile = tileAt(ev); updateInfo(S.save.career);
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => { lpFired = Date.now(); const t = tileAt({ clientX: sx0, clientY: sy0 }); A.mappin({ x: t.x, y: t.y }); drawWorld(); UI.render(true); }, 650);
  });
  cv.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse' && Math.hypot(ev.clientX - sx0, ev.clientY - sy0) > 10) clearTimeout(lpTimer); });
  for (const e of ['pointerup', 'pointercancel']) cv.addEventListener(e, () => clearTimeout(lpTimer));
  cv.addEventListener('dblclick', ev => {   // double-click a waypoint to fast travel to it
    const t = tileAt(ev), car = S.save.career;
    const wp = t.x === 0 && t.y === 0 ? { id: 'town' } : E.worldAttuned(car).find(n => n.x === t.x && n.y === t.y);
    if (!wp) return;
    stopWalk(); const r = E.worldWarp(car, wp.id); hubFresh(); after(r); UI.render(true);
  });
  cv.addEventListener('contextmenu', ev => { ev.preventDefault(); if (Date.now() - touchAt < 2000) return; const t = tileAt(ev); A.mappin({ x: t.x, y: t.y }); drawWorld(); UI.render(true); });
  cv.addEventListener('click', ev => {
    if (Date.now() - lpFired < 900) return;
    const t = tileAt(ev), car = S.save.career, w = E.worldOf(car);
    if (S.walk) { stopWalk(); drawWorld(); return; }
    if (!E.worldIsExplored(w, t.x, t.y)) { S.msg = 'Unexplored. Walk closer or scout first.'; UI.render(true); return; }
    A.mapgo({ x: t.x, y: t.y }); drawWorld(); if (S.msg) UI.render(true);
  });
  drawWorld();
}
function drawOverview() {
  const cv = document.getElementById('overviewcv'), car = S.save.career;
  if (!cv || !car) return;
  const w = E.worldOf(car), T = Tr(), g = cv.getContext('2d'), R = 125, px = 2;
  g.fillStyle = '#0b0a12'; g.fillRect(0, 0, cv.width, cv.height);
  for (let j = -R; j < R; j++) for (let i = -R; i < R; i++) {
    const wx = w.x + i, wy = w.y + j;
    if (!E.worldIsExplored(w, wx, wy)) continue;
    const t = T.tile(w.sid, wx, wy);
    g.fillStyle = rgb(T.BIOMES[t.b].c, WATER(t.b) ? 1 : 0.85 + t.e * 0.3); g.fillRect((i + R) * px, (j + R) * px, px, px);
  }
  const dot = (x, y, c, sz) => { g.fillStyle = c; g.fillRect((x - w.x + R) * px - sz / 2, (y - w.y + R) * px - sz / 2, sz, sz); };
  dot(0, 0, '#ffcb3d', 7);
  for (const n of E.worldKnownAll(car)) { if (Math.abs(n.x - w.x) > R || Math.abs(n.y - w.y) > R) continue; dot(n.x, n.y, n.settlement ? '#ffd24a' : n.waystone ? '#7bf0ff' : n.kind === 'dungeon' ? '#ff7a3a' : '#ffffff', n.settlement ? 6 : 4); }
  for (const m of (w.markers || [])) dot(m.x, m.y, '#ff4a5a', 6);
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(R * px - 4, R * px - 4, 8, 8);
  if (!cv._bound) {
    cv._bound = true;
    cv.addEventListener('click', ev => {
      const r = cv.getBoundingClientRect(), w2 = E.worldOf(S.save.career);
      const x = w2.x + Math.floor((ev.clientX - r.left) / r.width * cv.width / px) - R, y = w2.y + Math.floor((ev.clientY - r.top) / r.height * cv.height / px) - R;
      if (!E.worldIsExplored(w2, x, y)) { S.msg = 'Unexplored. Scout or walk closer first.'; UI.render(true); return; }
      A.mapgo({ x, y }); if (S.walk) { S.showOv = false; UI.render(true); } else UI.render(true);
    });
  }
}
function previewSeed(canvas, seedText) {
  const T = Tr(), sid = T.normSeed(seedText) != null ? T.normSeed(seedText) : T.hashStr('preview'), g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, px = 3, cols = Math.floor(W / px), rows = Math.floor(H / px);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i - (cols >> 1), y = j - (rows >> 1), t = T.tile(sid, x, y), c = T.BIOMES[t.b].c, k = WATER(t.b) ? 1 : 0.85 + t.e * 0.3;
    g.fillStyle = rgb(c, k); g.fillRect(i * px, j * px, px, px);
  }
  for (const s of T.structuresIn(sid, -(cols >> 1), -(rows >> 1), cols >> 1, rows >> 1)) { if (s.secret) continue; g.fillStyle = s.sub === 'dungeon' ? '#ff4a3a' : s.sub === 'lair' ? '#ff9b3a' : '#fff'; g.fillRect(((cols >> 1) + s.x) * px - 1, ((rows >> 1) + s.y) * px - 1, 4, 4); }
  g.fillStyle = '#ffd94a'; g.fillRect((cols >> 1) * px - 3, (rows >> 1) * px - 3, 8, 8); g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect((cols >> 1) * px - 3, (rows >> 1) * px - 3, 8, 8);
}
UI.previewSeed = previewSeed;
UI.afterRender = function () {
  bindCanvas();
  drawOverview();
  const pv = document.getElementById('seedprev');
  if (pv) previewSeed(pv, S.worldSeed || 'preview');
  const inp = document.getElementById('seedinput');
  if (inp && !inp._bound) { inp._bound = true; inp.addEventListener('input', () => { S.worldSeed = inp.value; const p = document.getElementById('seedprev'); if (p) previewSeed(p, inp.value || 'preview'); }); }
  const live = !!document.getElementById('worldcv');
  if (live && !timer) timer = setInterval(() => { frame++; if (!drawWorld()) { clearInterval(timer); timer = null; } }, 140);
  if (!live && timer) { clearInterval(timer); timer = null; }
};
// keyboard for road encounters: 1-9 pick a choice, Enter / Space / Esc continue
window.addEventListener('keydown', ev => {
  if (S.tab !== 'career' || S.screen !== 'hub' || S.hubTab !== 'map' || !document.getElementById('worldcv')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target.tagName || '')) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const car = S.save.career, p = car && E.worldOf(car).pending; if (!p) return;
  if (p.res) {
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); if (p.res.fight) A.mapfight(); else { A.mapdismiss(); UI.render(true); } }
  } else if (/^[1-9]$/.test(ev.key)) {
    const i = +ev.key - 1, ch = p.ev.choices[i], c = (ch && ch.cost) || {};
    if (!ch) return; ev.preventDefault();
    if ((c.gold && car.gold < c.gold) || (c.potion && car.potions < c.potion)) return;
    A.mapchoose({ i }); UI.render(true);
  }
}, true);
window.addEventListener('keydown', ev => {
  if (S.tab !== 'career' || S.screen !== 'hub' || S.hubTab !== 'map' || !document.getElementById('worldcv')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target.tagName || '')) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === 'h' || ev.key === 'H') {   // H: fast travel home, only when it is free
    const car = S.save.career, w = E.worldOf(car), i = E.warpInfo(car, 'town');
    if (i && i.free && i.dist >= 0.5 && !(w.pending && !w.pending.res)) { ev.preventDefault(); stopWalk(); const r = E.worldWarp(car, 'town'); hubFresh(); after(r); UI.render(true); }
    return;
  }
  const dir = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] }[ev.key];
  if (!dir) return;
  ev.preventDefault();
  stepBy(dir[0], dir[1]);
});
function stepBy(dx, dy) {
  stopWalk();
  const car = S.save.career, r = E.worldStep(car, dx, dy);
  if (!r.ok) { S.msg = r.msg; drawWorld(); return; }
  if (r.msg) S.msg = r.msg;
  if (r.arrived || r.pending) { hubFresh(); UI.persist(); UI.render(true); return; }
  drawWorld(); S.keySteps = (S.keySteps || 0) + 1; if (S.keySteps % 10 === 0) UI.persist();
}
A.mapstep = d => { const dx = +d.dx, dy = +d.dy; if (!dx && !dy) { stopWalk(); return; } stepBy(dx, dy); };
let rsz = 0;
window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { if (document.getElementById('worldcv') && fitView()) UI.render(true); }, 200); });
})(typeof globalThis !== 'undefined' ? globalThis : this);
