'use strict';
/* UI: first-person 3D dungeon (a small raycaster over the CC0 Kenney Tiny Dungeon tiles).
   Each room choice is a door in a chamber. Pick one and the camera walks through it. */
(function (root) {
const UI = root.UI, E = UI.E, S = UI.S, A = UI.actions;

const RW = 480, RH = 270, SCALE = 2, HF = 1.55;   // HF: how tall the walls are
const PAL = {
  catacombs: { tint: [150, 130, 190], glow: '#a78bff' }, warrens: { tint: [210, 160, 100], glow: '#ffb35a' }, crystal: { tint: [110, 170, 240], glow: '#5adcff' },
  sunken: { tint: [90, 190, 190], glow: '#3cc8be' }, fungal: { tint: [190, 130, 220], glow: '#c68bff' }, forge: { tint: [235, 130, 90], glow: '#ff7a3c' },
  frozen: { tint: [160, 205, 245], glow: '#bfe8ff' }, fortress: { tint: [170, 130, 210], glow: '#d08bff' }, machine: { tint: [130, 160, 215], glow: '#7fb0ff' },
  graveyard: { tint: [215, 195, 130], glow: '#f0dc86' },
};
const palOf = id => PAL[id] || PAL.catacombs;
function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------- textures (64x64, built from the 16x16 tiles) ----------
const TEXN = 64;
const texCache = {};
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tileTo(c, idx, sc, dx, dy) {
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(UI.assets.dungeon, (idx % 12) * 16, ((idx / 12) | 0) * 16, 16, 16, dx || 0, dy || 0, 16 * sc, 16 * sc);
}
function tintTo(c, rgb, strength) {
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
}
function data(c) { return new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer); }
function makeSet(themeId) {
  if (texCache[themeId]) return texCache[themeId];
  const pal = palOf(themeId), t = pal.tint;
  const mk = (idx, tintv, extra) => { const c = canvas(TEXN, TEXN); tileTo(c, idx, 4, 0, 0); if (extra) extra(c.getContext('2d')); if (tintv) tintTo(c, tintv); return c; };
  const wall = mk(40, t), wall2 = mk(58, t), slab = mk(58, [t[0] * 0.42, t[1] * 0.42, t[2] * 0.46].map(v => v | 0));
  const floor = mk(49, [t[0] * 0.9, t[1] * 0.9, t[2] * 0.9].map(v => v | 0));
  const floor2 = mk(50, [t[0] * 0.85, t[1] * 0.85, t[2] * 0.85].map(v => v | 0));
  // banners and torch walls are painted on top of a brick base
  const bannerT = canvas(TEXN, TEXN); { const g = bannerT.getContext('2d'); g.drawImage(wall, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(UI.assets.dungeon, (29 % 12) * 16, ((29 / 12) | 0) * 16, 16, 16, 8, 4, 48, 48); }
  const gargoyle = canvas(TEXN, TEXN); { const g = gargoyle.getContext('2d'); g.drawImage(wall, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(UI.assets.dungeon, (19 % 12) * 16, ((19 / 12) | 0) * 16, 16, 16, 8, 8, 48, 48); }
  const torch = [0, 1, 2].map(f => {
    const c = canvas(TEXN, TEXN), g = c.getContext('2d'); g.drawImage(wall, 0, 0);
    g.fillStyle = '#2a1c10'; g.fillRect(29, 30, 6, 20); g.fillRect(25, 28, 14, 5);
    const fl = [[24, 7], [28, 11], [22, 6]][f];
    g.fillStyle = '#ff6a14'; g.fillRect(27, 30 - fl[1] - 4, 10, fl[1] + 4);
    g.fillStyle = '#ffc040'; g.fillRect(29, 30 - fl[1], 6, fl[1]);
    g.fillStyle = '#fff2a8'; g.fillRect(31, 30 - fl[1] + 3, 2, Math.max(3, fl[1] - 5));
    g.fillStyle = 'rgba(255,190,90,.22)'; g.fillRect(8, 2, 48, 56);
    return c;
  });
  const set = { wall, wall2, bannerT, gargoyle, torch, floor, floor2, slab };
  set.walls = [null, data(wall), data(wall2), data(torch[0]), data(torch[1]), data(torch[2]), data(bannerT), data(gargoyle)];
  set.floorD = data(floor); set.floor2D = data(floor2); set.slabD = data(slab);
  texCache[themeId] = set;
  return set;
}
function doorTexture(type, boss, themeId, half) {
  const c = canvas(TEXN, TEXN), g = c.getContext('2d'), set = makeSet(themeId);
  g.drawImage(set.wall, 0, 0); g.imageSmoothingEnabled = false;
  if (boss) {
    g.drawImage(UI.assets.dungeon, ((half ? 47 : 46) % 12) * 16, (((half ? 47 : 46) / 12) | 0) * 16, 16, 16, 0, 0, 64, 64);
    g.fillStyle = 'rgba(200,30,30,.28)'; g.fillRect(0, 0, 64, 64);
  } else {
    g.drawImage(UI.assets.dungeon, (45 % 12) * 16, ((45 / 12) | 0) * 16, 16, 16, 0, 0, 64, 64);
    // plaque with the room icon above the door
    g.fillStyle = 'rgba(12,9,20,.92)'; g.fillRect(14, 3, 36, 20); g.strokeStyle = '#d8b45a'; g.lineWidth = 2; g.strokeRect(14, 3, 36, 20);
    g.font = '15px "Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText(UI.NODE_ICON[type] || '❔', 32, 14);
  }
  return data(c);
}

// ---------- a chamber ----------
const GW = 9, GH = 6;
function chamber(run, themeId) {
  const rows = run.dungeon.rows, boss = run.row >= rows.length;
  const opts = boss ? [{ type: 'boss', id: 'boss' }] : rows[run.row];
  const k = opts.length, h = hash(run.dungeon.seed + ':' + run.row);
  const grid = Array.from({ length: GH }, (_, y) => Array.from({ length: GW }, (_, x) => (x === 0 || y === 0 || x === GW - 1 || y === GH - 1) ? 1 : 0));
  // dressing
  for (const [x, y] of [[0, 2], [0, 4], [8, 2], [8, 4]]) grid[y][x] = 3;
  for (const x of [1, 7]) grid[0][x] = (h >> x) & 1 ? 6 : 7;
  for (let x = 1; x < GW - 1; x++) if (grid[0][x] === 1 && (x + h) % 3 === 0) grid[0][x] = 2;
  const doors = [];
  const place = (cells, o, face) => { cells.forEach((c, n) => { grid[c[1]][c[0]] = 10 + doors.length; }); doors.push({ idx: doors.length, cells, o, face }); };
  if (boss) {
    grid[0][4] = 10; grid[0][5] = 10; doors.push({ idx: 0, cells: [[4, 0], [5, 0]], o: opts[0], face: 'N', boss: true });
  } else {
    // the camera sees cells 2 to 6 of the far wall, so every door (up to five, with objective and secret rooms) goes there
    const xs = { 1: [4], 2: [3, 5], 3: [2, 4, 6], 4: [2, 3, 5, 6], 5: [2, 3, 4, 5, 6] }[Math.min(5, k)];
    opts.slice(0, 5).forEach((o, i) => place([[xs[i], 0]], o, 'N'));
  }
  const fog = E.anomaly(run, 'fog') && !(run.d.scout || run.d.st.LUK >= 8);
  const textures = doors.map(d => d.boss ? [doorTexture('boss', true, themeId, false), doorTexture('boss', true, themeId, true)] : [doorTexture(fog && d.o.type !== 'secret' ? 'unknown' : d.o.type, false, themeId)]);
  return { grid, doors, textures, boss, startX: boss ? 5.0 : 4.5, startY: 4.85, k };
}

// ---------- rendering ----------
const buf = canvas(RW, RH), bctx = buf.getContext('2d'), img = bctx.createImageData(RW, RH), px = new Uint32Array(img.data.buffer);
function shade(col, k) {
  const r = (col & 255) * k, g = ((col >> 8) & 255) * k, b = ((col >> 16) & 255) * k;
  return (255 << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
}
function cast(ch, cam, themeId, frame, hoverIdx, out) {
  const set = makeSet(themeId), dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * 0.66, ply = dx * 0.66;
  const sky = shade(0xff0a0810, 1);
  // floor and ceiling
  const half = RH >> 1;
  const rx0 = dx - plx, ry0 = dy - ply, rx1 = dx + plx, ry1 = dy + ply;
  for (let y = half + 1; y < RH; y++) {
    const p = y - half, rowDist = (0.5 * RH * HF) / p;
    const sx = rowDist * (rx1 - rx0) / RW, sy = rowDist * (ry1 - ry0) / RW;
    let fx = cam.x + rowDist * rx0, fy = cam.y + rowDist * ry0;
    const fog = Math.max(0.16, 1.18 - rowDist * 0.115);
    for (let x = 0; x < RW; x++) {
      const cx = Math.floor(fx), cy = Math.floor(fy), tx = ((fx - cx) * TEXN) & 63, ty = ((fy - cy) * TEXN) & 63;
      const fl = ((cx + cy) & 1) ? set.floorD : set.floor2D;
      px[y * RW + x] = shade(fl[ty * TEXN + tx], fog);
      px[(RH - 1 - y) * RW + x] = shade(set.slabD[ty * TEXN + tx], fog * 0.9);
      fx += sx; fy += sy;
    }
  }
  for (let x = 0; x < RW; x++) px[half * RW + x] = sky;
  // walls
  for (let x = 0; x < RW; x++) {
    const camX = 2 * x / RW - 1, rdx = dx + plx * camX, rdy = dy + ply * camX;
    let mx = Math.floor(cam.x), my = Math.floor(cam.y);
    const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
    let stepX, stepY, sdx, sdy, side = 0, hit = 0, guard = 0;
    if (rdx < 0) { stepX = -1; sdx = (cam.x - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - cam.x) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (cam.y - my) * ddy; } else { stepY = 1; sdy = (my + 1 - cam.y) * ddy; }
    while (!hit && guard++ < 40) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= GW || my >= GH) { hit = 1; break; }
      hit = ch.grid[my][mx];
    }
    const dist = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
    const lh = Math.floor(RH * HF / dist);
    const y0 = Math.max(0, (RH - lh) >> 1), y1 = Math.min(RH - 1, (RH + lh) >> 1);
    let wx = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx; wx -= Math.floor(wx);
    let tx = Math.floor(wx * TEXN); if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TEXN - 1 - tx;
    let tex;
    if (hit >= 10) { const d = ch.doors[hit - 10]; const di = d.boss ? (mx === d.cells[0][0] ? 0 : 1) : 0; tex = ch.textures[hit - 10][di]; }
    else if (hit === 3) tex = set.walls[3 + (frame % 3)];
    else tex = set.walls[hit] || set.walls[1];
    const lit = Math.max(0.18, 1.2 - dist * 0.12) * (side ? 0.78 : 1) * (hit >= 10 && hit - 10 === hoverIdx ? 1.4 : 1);
    const step = TEXN / lh; let tpos = (y0 - (RH - lh) / 2) * step;
    for (let y = y0; y <= y1; y++) { const ty = Math.min(TEXN - 1, tpos | 0); tpos += step; px[y * RW + x] = shade(tex[ty * TEXN + tx], lit); }
    if (out) { out.hit[x] = hit; out.top[x] = y0; out.bot[x] = y1; }
  }
  bctx.putImageData(img, 0, 0);
}

// ---------- scene state ----------
let scene = null, timer = null, frame = 0, anim = null;
function themeId(run) { return run.dungeon.theme.id; }
function build(run) {
  const cur = run.dungeon.rows[run.row];
  const key = run.dungeon.seed + ':' + run.row + ':' + run.seed + ':' + (cur ? cur.map(o => o.type + o.id).join(',') : 'boss');
  if (scene && scene.key === key) return scene;
  const ch = chamber(run, themeId(run));
  scene = { key, ch, cam: { x: ch.startX, y: ch.startY, a: -Math.PI / 2 }, hover: -1, geo: { hit: new Uint8Array(RW), top: new Int16Array(RW), bot: new Int16Array(RW) } };
  anim = null;
  return scene;
}
function doorScreen(sc, idx) {
  let a = -1, b = -1;
  for (let x = 0; x < RW; x++) if (sc.geo.hit[x] === 10 + idx) { if (a < 0) a = x; b = x; }
  return a < 0 ? null : { a, b, top: sc.geo.top[(a + b) >> 1], bot: sc.geo.bot[(a + b) >> 1] };
}
function render() {
  const cv = document.getElementById('dungeoncv'), run = S.run;
  if (!cv || !run || !UI.assets || UI.assets.ready < 2) return !!cv;
  const sc = build(run), g = cv.getContext('2d'), th = run.dungeon.theme;
  g.imageSmoothingEnabled = false;
  const cam = Object.assign({}, sc.cam);
  if (!anim) { cam.x += Math.sin(frame / 9) * 0.012; cam.y += Math.cos(frame / 11) * 0.01; }
  cast(sc.ch, cam, themeId(run), frame, sc.hover, sc.geo);
  g.drawImage(buf, 0, 0, RW * SCALE, RH * SCALE);
  // door labels and keys
  g.textAlign = 'center';
  sc.ch.doors.forEach((d, i) => {
    const ds = doorScreen(sc, i); if (!ds) return;
    const star = objectiveDoor(run, d) ? '★ ' : '';
    const name = d.boss ? th.boss.name : star + (UI.NODE_NAME[d.o.type] || d.o.type);
    const cx = (ds.a + ds.b) / 2 * SCALE, cy = Math.min(RH * SCALE - 12, ds.bot * SCALE + 16);
    g.font = '700 13px system-ui, sans-serif'; const label = (d.boss ? '' : (i + 1) + '. ') + name, tw = g.measureText(label).width + 16;
    g.fillStyle = sc.hover === i ? 'rgba(70,48,10,.95)' : 'rgba(10,8,18,.82)'; g.fillRect(cx - tw / 2, cy - 14, tw, 20);
    g.strokeStyle = d.boss ? '#c0392b' : sc.hover === i ? '#ffcb3d' : '#6b5a2a'; g.lineWidth = 1.5; g.strokeRect(cx - tw / 2 + .5, cy - 13.5, tw - 1, 19);
    g.fillStyle = d.boss ? '#ff9a8a' : sc.hover === i ? '#fff3b0' : '#ffe08a'; g.fillText(label, cx, cy + 1);
  });
  // header and hint
  g.fillStyle = 'rgba(8,6,16,.78)'; g.fillRect(0, 0, RW * SCALE, 28);
  g.font = '700 14px system-ui'; g.fillStyle = '#ffe08a'; g.textAlign = 'left';
  const total = run.dungeon.rows.length + 1;
  g.fillText(`${th.name} · room ${Math.min(run.row + 1, total)} / ${total} · heat ${run.heat}`, 12, 19);
  g.textAlign = 'right'; g.fillStyle = '#b9bfdc';
  const hd = sc.hover >= 0 ? sc.ch.doors[sc.hover] : null;
  g.fillText(hd ? (hd.boss ? 'The guardian waits.' : (UI.NODE_HINT[hd.o.type] || '')) : `Click a door, or press 1-${Math.max(1, sc.ch.doors.length)}`, RW * SCALE - 12, 19); g.textAlign = 'center';
  // walk-through fade
  if (anim) { const k = Math.min(1, (performance.now() - anim.t0) / anim.dur); if (k > 0.65) { g.fillStyle = `rgba(0,0,0,${(k - 0.65) / 0.35})`; g.fillRect(0, 0, RW * SCALE, RH * SCALE); } }
  return true;
}
function objectiveDoor(run, d) {
  const ob = run.mission && run.mission.objective;
  if (!ob || d.boss) return false;
  return (ob.kind === 'rescue' && d.o.type === 'missing') || (ob.kind === 'relic' && d.o.type === 'relic');
}
function enter(idx) {
  const sc = scene; if (!sc || anim) return;
  const d = sc.ch.doors[idx]; if (!d) return;
  const c = d.cells[0], mid = d.boss ? 5.0 : c[0] + 0.5;
  const to = d.face === 'N' ? { x: mid, y: 1.1, a: -Math.PI / 2 } : d.face === 'W' ? { x: 1.1, y: c[1] + 0.5, a: Math.PI } : { x: GW - 1.1, y: c[1] + 0.5, a: 0 };
  anim = { t0: performance.now(), dur: 650, from: Object.assign({}, sc.cam), to, idx };
}
function stepAnim() {
  if (!anim || !scene) return;
  const k = Math.min(1, (performance.now() - anim.t0) / anim.dur), e = k * k * (3 - 2 * k);
  let da = anim.to.a - anim.from.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  scene.cam = { x: anim.from.x + (anim.to.x - anim.from.x) * e, y: anim.from.y + (anim.to.y - anim.from.y) * e, a: anim.from.a + da * Math.min(1, e * 1.2) };
  if (k >= 1) {
    const o = scene.ch.doors[anim.idx].o; anim = null;
    A.node({ type: o.type, id: o.id }); UI.render();
  }
}
UI.dungeonMap = function () { return `<canvas id="dungeoncv" class="dungeoncv" width="${RW * SCALE}" height="${RH * SCALE}"></canvas>`; };

// ---------- static backdrop for combat and banners ----------
const bgCache = {};
UI.dungeonBg = function (tid) {
  if (!UI.assets || UI.assets.ready < 2) return '';
  if (bgCache[tid]) return bgCache[tid];
  const fake = { dungeon: { rows: [[{ type: 'combat', id: 'a' }, { type: 'event', id: 'b' }, { type: 'treasure', id: 'c' }]], seed: 'bg' + tid, theme: { id: tid } }, row: 0, id: 'bg', heat: 0, d: { scout: true, st: { LUK: 0 } } };
  const ch = chamber(fake, tid);
  const cam = { x: 4.5, y: 4.6, a: -Math.PI / 2 };
  cast(ch, cam, tid, 0, -1, null);
  const c = canvas(RW, RH); c.getContext('2d').drawImage(buf, 0, 0);
  return (bgCache[tid] = c.toDataURL());
};
UI.dungeonBgStyle = function (tid) {
  const u = UI.dungeonBg(tid);
  return u ? `background-image:url(${u});background-size:cover;background-position:center 60%;image-rendering:pixelated;` : '';
};

// ---------- wiring ----------
function doorAtEvent(ev, cv) {
  if (!scene) return -1;
  const r = cv.getBoundingClientRect(), x = Math.max(0, Math.min(RW - 1, Math.floor((ev.clientX - r.left) / r.width * RW)));
  const h = scene.geo.hit[x];
  return h >= 10 ? (scene.ch.doors[h - 10] ? h - 10 : -1) : -1;
}
function labelHit(ev, cv) {
  if (!scene) return -1;
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * RW, y = (ev.clientY - r.top) / r.height * RH;
  for (let i = 0; i < scene.ch.doors.length; i++) { const ds = doorScreen(scene, i); if (ds && y > ds.bot && y < ds.bot + 14 && x > ds.a - 30 && x < ds.b + 30) return i; }
  return -1;
}
const prevAfter = UI.afterRender;
UI.afterRender = function () {
  if (prevAfter) prevAfter();
  const cv = document.getElementById('dungeoncv');
  if (cv && !cv._bound) {
    cv._bound = true;
    cv.addEventListener('mousemove', ev => { if (!scene) return; const i = doorAtEvent(ev, cv); scene.hover = i >= 0 ? i : labelHit(ev, cv); cv.style.cursor = scene.hover >= 0 ? 'pointer' : 'default'; });
    cv.addEventListener('mouseleave', () => { if (scene) scene.hover = -1; });
    cv.addEventListener('click', ev => { let i = doorAtEvent(ev, cv); if (i < 0) i = labelHit(ev, cv); if (i >= 0) enter(i); });
  }
  if (cv) render();
  if (cv && !timer) timer = setInterval(() => { frame++; stepAnim(); if (!render()) { clearInterval(timer); timer = null; } }, 80);
  if (!cv && timer) { clearInterval(timer); timer = null; scene = null; }
};
const prevAssets = UI.afterAssets;
UI.afterAssets = function () { if (prevAssets) prevAssets(); if (document.getElementById('dungeoncv')) render(); if (document.querySelector('.dg')) UI.render(true); };
window.addEventListener('keydown', ev => {
  if (S.screen !== 'map' || !document.getElementById('dungeoncv') || !S.run || !scene) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target.tagName || ''))) return;
  const n = parseInt(ev.key, 10); if (!(n >= 1 && n <= 5)) return;
  const idx = scene.ch.boss ? 0 : n - 1;
  if (scene.ch.doors[idx]) { ev.preventDefault(); enter(idx); }
});
})(typeof globalThis !== 'undefined' ? globalThis : this);
