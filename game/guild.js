'use strict';
/* Daily Random Dungeon - the Guild and the cities: area boards, rank tests, courier jobs, arena tournaments between parties,
   legendary parties, the palace (royal commissions) and the grand market of capital cities. */
(function (root) {
const E = root.Engine;
const D = root.DATA;
const T = E.Terrain;
const { RNG, RANKS, CAREER_RANKS } = E;
const ri = id => CAREER_RANKS.indexOf(id);
const rankOf = i => CAREER_RANKS[Math.max(0, Math.min(CAREER_RANKS.length - 1, i))];

// ---------- where you stand ----------
// A guild hall exists in Hearthhold, every town and every capital. The rank of the area sets the rank of the contracts on its board.
function guildPlace(career) {
  if (E.worldInTown(career)) return { id: 'home', name: 'Hearthhold', kind: 'home', zone: 0 };
  const n = E.worldAt(career);
  if (n && n.settlement && n.state !== 'hidden' && (n.sub === 'town' || n.sub === 'capital')) return { id: n.id, name: n.name, kind: n.sub, zone: E.worldZone(n.x, n.y), node: n };
  return null;
}
const gIdx = career => ri(E.careerRank(career));

// ---------- the board ----------
const canTake = (career, m) => ri(m.rank) <= gIdx(career) + 1;
function takeNote(career, m) { return canTake(career, m) ? '' : `Needs rank ${rankOf(ri(m.rank) - 1)} (the Guild lets you take one rank above your own)`; }
function guildBoard(career) {
  const place = guildPlace(career) || { id: 'home', name: 'Hearthhold', kind: 'home', zone: 0 };
  if (career.board && career.board.n === career.boardN && career.board.pid === place.id) return career.board.missions;
  const rng = new RNG(`board|${career.char.name}|${career.boardN}|${place.id}`);
  const z = place.zone, count = place.kind === 'capital' ? 10 : place.kind === 'town' ? 7 : 6;
  const types = Object.keys(D.MISSION_TYPES), missions = [];
  for (let k = 0; k < count; k++) {
    // mostly area-rank work, a rank up now and then, and always a few lower-rank jobs
    const r = rng.next();
    // big guilds always keep a couple of low-rank jobs for newcomers
    const i = k === 0 ? z : (k <= 2 && z >= 2) ? rng.int(0, z - 2) : r < 0.46 ? z : r < 0.6 ? z + 1 : r < 0.82 ? z - 1 : rng.int(0, z);
    const rank = rankOf(Math.max(0, i));
    const type = k === 0 ? 'clear' : rng.weighted(types, t => D.MISSION_TYPES[t].weight);
    const emergency = k === count - 1 && rng.chance(0.35);
    const m = E.buildMission(rng, rank, type, `${career.char.name}|${career.boardN}|${place.id}|${k}`, { emergency });
    m.place = place.name;
    missions.push(m);
  }
  missions.sort((a, b) => ri(a.rank) - ri(b.rank));
  career.board = { n: career.boardN, pid: place.id, missions };
  return missions;
}

// ---------- rank tests ----------
function rankTestInfo(career) {
  const cur = E.careerRank(career), i = ri(cur), next = CAREER_RANKS[i + 1];
  if (!next) return { max: true, cur };
  const need = RANKS[next].rec - 3, qd = career.qdone || {};
  let done = 0; for (let j = i; j < CAREER_RANKS.length; j++) done += qd[CAREER_RANKS[j]] || 0;
  const wantQ = 2, fee = Math.round(40 * RANKS[next].rewards);
  const w = E.worldOf(career), wait = career.testDay != null ? Math.max(0, 1 - (w.day - career.testDay)) : 0;
  const reasons = [];
  if (done < wantQ) reasons.push(`${wantQ} completed quests of rank ${cur} or higher (${done} done)`);
  if (career.gold < fee) reasons.push(`${fee} gold for the examiners`);
  if (wait) reasons.push(`a day of rest after your last attempt`);
  return { cur, next, need, done, wantQ, fee, wait, reasons, ok: !reasons.length };
}
function rankTestStart(career) {
  const info = rankTestInfo(career);
  if (info.max) return null;
  if (!info.ok) return { error: `You still need: ${info.reasons.join(', ')}.` };
  career.gold -= info.fee;
  const w = E.worldOf(career); career.testDay = w.day;
  const th = D.THEMES.filter(t => t.rankMin <= ri(info.next));
  const rng = new RNG(`test|${career.char.name}|${info.next}|${career.runs}`);
  return { free: true, rankTest: info.next, seed: `test|${career.char.name}|${info.next}|${career.runs}`, rank: info.next, themeId: rng.pick(th).id, rooms: 4 };
}

// ---------- travelling quests: courier, escort, errand, slay ----------
// One travelling quest at a time lives in career.courier. It marks its destination on the map, may bring ambushes on the road,
// and completes when you arrive (or, for "slay", when the lair is cleared).
const SETTLE = ['village', 'town', 'capital', 'racehold'];
const KINDS = { courier: { icon: '📦', name: 'Courier job' }, escort: { icon: '🧳', name: 'Escort' }, errand: { icon: '🔎', name: 'Errand' }, slay: { icon: '🐲', name: 'Hunt' } };
const CLIENT = ['a merchant', 'a pilgrim', 'a scholar', 'a young noble', 'a healer', 'a surveyor', 'a runaway apprentice', 'a travelling bard'];
function dir8(dx, dy) {
  const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'], arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  const i = Math.round(Math.atan2(dy, dx) / (Math.PI / 4) + 8) % 8;
  return { name: names[i], arrow: arrows[i] };
}
function questInfo(career) {
  const q = career.courier; if (!q) return null;
  const w = E.worldOf(career), dx = q.to.x - w.x, dy = q.to.y - w.y, d = Math.hypot(dx, dy), dr = dir8(dx, dy);
  return Object.assign({}, q, { dist: Math.round(d), dir: dr.name, arrow: dr.arrow, left: q.due - w.day, k: KINDS[q.kind || 'courier'] });
}
function courierOffers(career) {
  const place = guildPlace(career); if (!place) return [];
  const w = E.worldOf(career);
  const rng = new RNG(`courier|${career.wseed}|${place.id}|${career.boardN}`);
  const here = place.id === 'home' ? { x: 0, y: 0 } : place.node;
  const cands = T.structuresIn(w.sid, here.x - 70, here.y - 70, here.x + 70, here.y + 70).filter(s => SETTLE.includes(s.sub) && s.id !== place.id && Math.hypot(s.x - here.x, s.y - here.y) > 12);
  const n = place.kind === 'capital' ? 3 : place.kind === 'town' ? 2 : 1, out = [], z = place.zone;
  for (let k = 0; k < n && cands.length; k++) {
    const s = cands.splice(rng.int(0, cands.length - 1), 1)[0];
    const dist = Math.round(Math.hypot(s.x - here.x, s.y - here.y));
    out.push({ id: `${place.id}:${career.boardN}:${k}`, kind: 'courier', to: { id: s.id, name: s.name, x: s.x, y: s.y, sub: s.sub }, dist, days: Math.ceil(dist / 7) + 4,
      gold: Math.round((25 + dist * 1.3) * (1 + 0.25 * z)), credits: 1 + z, rep: 1 + Math.floor(dist / 35), from: place.name, parcel: rng.pick(['sealed letters', 'a locked coffer', 'medicine crates', 'a royal writ', 'rare seeds', 'a wrapped blade']) });
  }
  // escort jobs: a client walks with you and bandits and beasts attack on the road
  const ne = place.kind === 'capital' ? 2 : place.kind === 'town' ? 1 : (rng.chance(0.5) ? 1 : 0);
  for (let k = 0; k < ne && cands.length; k++) {
    const s = cands.splice(rng.int(0, cands.length - 1), 1)[0];
    const dist = Math.round(Math.hypot(s.x - here.x, s.y - here.y)), who = rng.pick(CLIENT);
    out.push({ id: `${place.id}:${career.boardN}:e${k}`, kind: 'escort', to: { id: s.id, name: s.name, x: s.x, y: s.y, sub: s.sub }, dist, days: Math.ceil(dist / 6) + 5, hp: 3,
      gold: Math.round((60 + dist * 2.2) * (1 + 0.3 * z)), credits: 2 + z, rep: 2 + Math.floor(dist / 30), from: place.name, parcel: who });
  }
  return out;
}
function questMarker(career, q) {
  const w = E.worldOf(career); w.markers = (w.markers || []).filter(m => !m.quest);
  w.mk = (w.mk || 0) + 1;
  w.markers.push({ id: 'q' + w.mk, x: q.to.x, y: q.to.y, name: `${(KINDS[q.kind] || KINDS.courier).icon} ${q.to.name}`.slice(0, 24), quest: true });
}
function questStart(career, q) {
  const w = E.worldOf(career);
  career.courier = Object.assign({ kind: 'courier', steps: 0, cool: 0 }, q, { due: w.day + q.days });
  E.worldMark(career, q.to.id, 'known'); E.worldRevealAt(career, q.to.x, q.to.y, 4);
  questMarker(career, career.courier);
  return career.courier;
}
function courierAccept(career, id) {
  if (career.courier) return { ok: false, msg: 'You already have a job on the road. Finish or abandon it first.' };
  const o = courierOffers(career).find(x => x.id === id);
  if (!o) return { ok: false, msg: 'That job is gone.' };
  const q = questStart(career, o), i = questInfo(career);
  return { ok: true, msg: o.kind === 'escort' ? `${o.parcel} (your client) joins you. Take them to ${o.to.name}, ${i.dist} tiles to the ${i.dir}, by day ${q.due}. Expect trouble on the road.` : `You take ${o.parcel} for ${o.to.name}, ${i.dist} tiles to the ${i.dir}, by day ${q.due}. It is marked on your map.` };
}
function clearQuest(career) { career.courier = null; const w = E.worldOf(career); w.markers = (w.markers || []).filter(m => !m.quest); }
function courierAbandon(career) {
  if (!career.courier) return { ok: false, msg: 'You have no job on the road.' };
  const c = career.courier; clearQuest(career); career.rep = Math.max(0, career.rep - 1);
  return { ok: true, msg: `You drop the job (${c.parcel}). The Guild notes it (-1 reputation).` };
}
function questPay(career, c, late, lines, where) {
  const f = late ? 0.5 : 1, g = Math.round(c.gold * f), cr = late ? 0 : c.credits, rp = late ? 0 : c.rep;
  career.gold += g; career.credits += cr; career.rep += rp;
  if (c.xpFrac) { const hub = E.careerHub(career), amt = Math.round(E.xpNeeded(career.char.level, true) * c.xpFrac); if (amt) { E.addXp(hub, amt); career.char = hub.char; lines.push(`+${amt} XP.`); } }
  const k = c.kind || 'courier';
  const alive = k === 'escort' ? (c.hp > 0) : true;
  lines.push(late ? `You complete the job at ${where}, but you are late. Half pay: ${g} gold.` : k === 'escort' ? `You deliver ${c.parcel} safely to ${where}${c.hp < 3 ? ' (a bit battered)' : ''}! +${g} gold, +${cr} credits, +${rp} reputation.` : k === 'errand' ? `Errand done at ${where}! +${g} gold, +${cr} credits, +${rp} reputation.` : `Delivered ${c.parcel} to ${where}! +${g} gold, +${cr} credits, +${rp} reputation.`);
  void alive; clearQuest(career);
}
function courierArrive(career, node, lines) {
  const c = career.courier; if (!c || c.to.id !== node.id || c.kind === 'slay') return;
  questPay(career, c, E.worldOf(career).day > c.due, lines, node.name);
}
// A lair or dungeon cleared for a "slay" quest.
function questNodeCleared(career, nodeId, lines) {
  const c = career.courier; if (!c || c.kind !== 'slay' || c.to.id !== nodeId) return;
  questPay(career, c, false, lines, c.to.name);
}
// Strangers on the road ask for help. Returns an encounter or null.
function strangerEvent(career, rng) {
  if (career.courier) return null;
  const w = E.worldOf(career), z = E.worldZone(w.x, w.y), kind = rng.pick(['escort', 'errand', 'slay', 'escort']);
  const around = T.structuresIn(w.sid, w.x - 55, w.y - 55, w.x + 55, w.y + 55).filter(s => !s.secret && Math.hypot(s.x - w.x, s.y - w.y) > 10);
  const pool = kind === 'escort' ? around.filter(s => SETTLE.includes(s.sub)) : kind === 'slay' ? around.filter(s => s.sub === 'lair') : around.filter(s => ['ruins', 'grove', 'mine', 'shrine', 'spring', 'hermit'].includes(s.sub));
  if (!pool.length) return null;
  const s = pool[rng.int(0, pool.length - 1)], dist = Math.round(Math.hypot(s.x - w.x, s.y - w.y)), who = rng.pick(CLIENT);
  const q = { kind, to: { id: s.id, name: s.name, x: s.x, y: s.y, sub: s.sub }, dist, days: Math.ceil(dist / 6) + 5, from: 'a stranger', parcel: who, xpFrac: 0.05,
    gold: Math.round((50 + dist * 1.8) * (1 + 0.3 * z) * (kind === 'slay' ? 1.5 : 1)), credits: 1 + z, rep: 2, hp: 3 };
  const text = kind === 'escort' ? `${who[0].toUpperCase() + who.slice(1)} begs you to be their escort to ${s.name}: "The roads are not safe. I can pay."`
    : kind === 'slay' ? `A frightened local points toward ${s.name}: "Monsters nest there and they have taken everything. Clear them out and I will pay what I have."`
    : `A stranger presses a request on you: "I lost something precious near ${s.name}. Go there and see what you can find. I will pay on your return."`;
  return { road: true, nodeName: 'A stranger', icon: kind === 'escort' ? '🧳' : kind === 'slay' ? '🐲' : '🔎', title: kind === 'escort' ? 'A traveller asks for protection' : kind === 'slay' ? 'A local begs for help' : 'A stranger has a request',
    text: text + ` (${dist} tiles away, about ${q.gold} gold.)`, choices: [
      { label: kind === 'escort' ? 'Agree to escort them' : kind === 'slay' ? 'Accept the hunt' : 'Take the errand', out: { text: 'You accept. It is marked on your map.', quest: q } },
      { label: 'Decline politely', out: { text: 'They thank you anyway and move on.' } }] };
}
// An ambush on the road: a fight on the map. Escort jobs draw more of them.
function ambushEvent(career, rng) {
  const w = E.worldOf(career), z = E.worldZone(w.x, w.y), q = career.courier, esc = q && q.kind === 'escort';
  const foes = rng.pick([['Road bandits', 'bandits'], ['Highwaymen', 'highwaymen'], ['Raiders', 'raiders'], ['Cutthroats', 'cutthroats']]);
  const pay = Math.round(40 * (1 + z * 0.6));
  return { road: true, ambush: true, nodeName: 'Ambush!', icon: '⚔️', title: `Ambush: ${foes[0]}!`, text: `${foes[0]} spring from cover${esc ? ' and go for your client' : ''}. Choose quickly.`, ambushName: foes[0], choices: [
    { label: 'Draw steel and fight', fight: true, out: { text: 'You step forward to meet them.' } },
    { label: `Pay them off (${pay}g)`, cost: { gold: pay }, out: { text: 'They take the coin and melt away.' } },
    { label: 'Slip away (AGI)', check: { stat: 'AGI', dc: esc ? 1 : -1 }, win: { text: 'You lose them in the brush.' }, lose: { text: 'They catch you!', fight: true } }] };
}
function questStep(career, rng) {
  const q = career.courier; if (!q) return null;
  const w = E.worldOf(career); q.cool = (q.cool || 0) + 1;
  if (q.cool < 9) return null;
  const z = E.worldZone(w.x, w.y), p = (q.kind === 'escort' ? 0.045 : 0.02) * (1 + z * 0.12);
  if (!rng.chance(p)) return null;
  q.cool = 0;
  return ambushEvent(career, rng);
}
// The fight itself: a rival party of fighters, fought to a yield.
function worldAmbush(career) {
  const w = E.worldOf(career), p = w.pending;
  if (!p || !p.res || !p.res.fight) return null;
  const z = E.worldZone(w.x, w.y), rk = rankOf(z), rng = new RNG(`ambush|${w.seed}|${w.day}|${w.x}|${w.y}|${career.runs}`);
  const q = career.courier, n = Math.min(3, 2 + (q && q.kind === 'escort' ? 1 : 0) + (z >= 4 ? 1 : 0)), roles = ROLES.slice(), members = [];
  for (let m = 0; m < n; m++) members.push({ role: roles.splice(rng.int(0, roles.length - 1), 1)[0], name: rng.pick(FIRST) });
  return { free: true, ambush: true, duel: { name: p.ev.ambushName || 'Bandits', members, hpMult: 0.85 + 0.03 * z, legendary: false, label: 'Ambush' }, seed: `amb|${w.seed}|${w.day}|${career.runs}`, rank: rk, themeId: 'warrens', rooms: 1 };
}
// ---------- legendary parties ----------
const LEGEND = ['The Hundred Blades', 'Crimson Dawn', 'Order of the Last Sun', 'The Unbroken Few', 'Starfall Vanguard', 'The Nine Wardens', 'Wyrmbane Company', 'The Silent Choir', 'Ironbound Saints', 'The Wandering Crown'];
const QUOTE = ['"We closed three rifts last winter. The fourth will not close itself."', '"Strength is cheap. Surviving the fifth floor is not."', '"Any fool can start a legend. We are still finishing ours."', '"Bring coin, bring nerve, and leave your pride at the door."', '"The deeper you go, the quieter it gets. That is when we start listening."'];
const FIRST = ['Aldren', 'Brisa', 'Cato', 'Dessa', 'Eryk', 'Fiora', 'Galen', 'Hesper', 'Ivor', 'Jora', 'Kestrel', 'Lothar', 'Mirelle', 'Naro', 'Ozan', 'Perrin'];
const ROLES = Object.keys(D.DUEL_ROLES);
function legendaryParties(career, place) {
  if (!place || place.kind !== 'capital') return [];
  const w = E.worldOf(career), week = Math.floor((w.day || 1) / 7);
  const rng = new RNG(`legend|${career.wseed}|${place.id}|${week}`);
  const n = rng.chance(0.7) ? (rng.chance(0.3) ? 2 : 1) : 0, used = new Set(), out = [];
  for (let k = 0; k < n; k++) {
    let name; do { name = rng.pick(LEGEND); } while (used.has(name)); used.add(name);
    const roles = ROLES.slice(), members = [];
    for (let m = 0; m < 3; m++) members.push({ role: roles.splice(rng.int(0, roles.length - 1), 1)[0], name: rng.pick(FIRST) });
    out.push({ id: `${place.id}:L${week}:${k}`, name, members, quote: rng.pick(QUOTE) });
  }
  return out;
}
// Hireable: a legendary party works only a few expeditions, but fights far harder than a common one.
function legendaryOffers(career, place) {
  const z = Math.min(place.zone, 6), rk = rankOf(z), COMP = Object.keys(D.COMPANIONS);
  return legendaryParties(career, place).map((l, i) => {
    const rng = new RNG(`legendoffer|${l.id}`);
    const roles = COMP.slice(), members = [];
    for (let m = 0; m < 3; m++) { const r = roles.splice(rng.int(0, roles.length - 1), 1)[0]; members.push({ id: r, name: l.members[m].name + ' the ' + D.COMPANIONS[r].name }); }
    return { id: l.id + ':hire', name: l.name, legendary: true, quote: l.quote, members, place: place.name, zone: rk, minLevel: RANKS[rk].rec + 2, needRuns: 8, stay: 2, total: 4, leavePay: Math.round(300 * (1 + 0.3 * z)),
      lootMul: 0.52, xpMul: 0.6, shield: 0.22, pw: +(0.8 + 0.12 * z + 0.55).toFixed(2) };
  });
}

// ---------- arena tournaments ----------
// Eight parties enter, you fight three bouts (quarter, semi, final) against rival parties. Win a bout and you advance. Bouts are fought to a yield, not to the death.
const RIVAL = ['The Rusty Lanterns', 'Ash & Iron', 'The Gilded Rats', 'Moonlit Company', 'Red Hollow Guard', 'The Lucky Seven', 'Stormcallers', 'Thornwall Watch', 'The Ember Pact', 'Silent Oars', 'Hollow Crown', 'The Last Ladle', 'Boar & Blade', 'The Gray Lanterns'];
const LABELS = ['Quarterfinal', 'Semifinal', 'Final'];
function arenaPlace(career) {
  if (E.worldInTown(career)) return { id: 'home', name: 'Hearthhold', kind: 'home', zone: gIdx(career), arena: true };
  const n = E.worldAt(career);
  if (n && n.sub === 'capital' && n.state !== 'hidden') return { id: n.id, name: n.name, kind: 'capital', zone: E.worldZone(n.x, n.y), arena: true, node: n };
  return null;
}
function arenaStatus(career) {
  const p = arenaPlace(career); if (!p) return null;
  const w = E.worldOf(career), t = career.tourney && career.tourney.pid === p.id ? career.tourney : null;
  const wait = career.arenaDay != null ? Math.max(0, 2 - (w.day - career.arenaDay)) : 0;
  const rk = rankOf(p.zone), fee = Math.round(30 * RANKS[rk].rewards);
  return { place: p, t, wait, fee, rank: rk, ready: !wait && career.gold >= fee, other: career.tourney && !t ? career.tourney : null };
}
function buildFoes(career, p, rk) {
  const w = E.worldOf(career), rng = new RNG(`tour|${career.wseed}|${p.id}|${w.day}|${career.runs}`);
  const used = new Set(), foes = [], z = ri(rk);
  const leg = p.kind === 'capital' ? legendaryParties(career, p) : [];
  for (let r = 0; r < 3; r++) {
    let name; do { name = rng.pick(RIVAL); } while (used.has(name)); used.add(name);
    const size = r === 0 ? 2 : 3, roles = ROLES.slice(), members = [];
    for (let m = 0; m < size; m++) members.push({ role: roles.splice(rng.int(0, roles.length - 1), 1)[0], name: rng.pick(FIRST) });
    let legendary = false;
    if (r === 2 && p.kind === 'capital' && (leg.length || rng.chance(0.4))) {
      const L = leg.length ? leg[0] : { name: rng.pick(LEGEND), members };
      name = L.name; legendary = true;
      if (leg.length) for (let m = 0; m < 3; m++) members[m] = L.members[m];
    }
    foes.push({ name, members, hpMult: [0.85, 0.95, 1.05][r] * (0.9 + 0.04 * z), legendary, label: LABELS[r] });
  }
  return foes;
}
function tourneyEnter(career) {
  const s = arenaStatus(career);
  if (!s) return { ok: false, msg: 'There is no arena here.' };
  if (s.t) return { ok: false, msg: 'You are already in the bracket.' };
  if (career.tourney) return { ok: false, msg: 'You are still entered in another arena. Withdraw there first.' };
  if (s.wait) return { ok: false, msg: `The next bracket opens in ${s.wait} day${s.wait === 1 ? '' : 's'}.` };
  if (career.gold < s.fee) return { ok: false, msg: `The entry fee is ${s.fee} gold.` };
  career.gold -= s.fee;
  career.tourney = { pid: s.place.id, pname: s.place.name, rank: s.rank, round: 0, foes: buildFoes(career, s.place, s.rank), fee: s.fee, day: E.worldOf(career).day };
  return { ok: true, msg: `You enter the ${s.place.name} bracket (${s.rank}-rank). Good luck.` };
}
function tourneyFight(career) {
  const t = career.tourney, p = arenaPlace(career);
  if (!t || !p || t.pid !== p.id || t.round > 2) return null;
  const f = t.foes[t.round];
  return { free: true, arena: true, tourney: true, duel: f, seed: `duel|${t.pid}|${t.day}|${t.round}|${career.runs}`, rank: t.rank, themeId: 'fortress', rooms: 1 };
}
function tourneyWithdraw(career) {
  if (!career.tourney) return { ok: false, msg: 'You are not in a bracket.' };
  career.tourney = null; career.arenaDay = E.worldOf(career).day;
  return { ok: true, msg: 'You withdraw from the tournament. The entry fee is not refunded.' };
}
function tourneyPrize(t, round) { return round >= 2 ? 3 : round + 1; }
function guildAfterRun(career, run, outcome, res) {
  // road ambush
  if (run.ambush) {
    const w = E.worldOf(career), q = career.courier;
    w.pending = null;
    if (outcome === 'cleared') res.ambush = { won: true, text: 'You beat the attackers back.' };
    else {
      const lost = Math.floor(career.gold * 0.1); career.gold -= lost;
      res.ambush = { won: false, lost, text: `You are beaten back and robbed of ${lost} gold.` };
      if (q && q.kind === 'escort') {
        q.hp = (q.hp || 3) - 1;
        if (q.hp <= 0) { res.ambush.text += ` ${q.parcel} did not survive the road. The job is failed.`; career.rep = Math.max(0, career.rep - 3); clearQuest(career); }
        else res.ambush.text += ` ${q.parcel} is hurt (${q.hp}/3 left).`;
      }
    }
  }
  // rank test
  if (run.rankTest) {
    if (outcome === 'cleared') {
      career.grank = run.rankTest; career.rep += 5; career.credits += 2 + ri(run.rankTest);
      res.promoted = { rank: run.rankTest, credits: 2 + ri(run.rankTest), rep: 5 };
    } else res.testFailed = run.rankTest;
  }
  // tournament bout
  if (run.tourney && career.tourney) {
    const t = career.tourney, f = t.foes[t.round], z = ri(t.rank), rk = RANKS[t.rank];
    if (outcome === 'cleared') {
      const g = Math.round(35 * rk.rewards * (t.round + 1));
      career.gold += g;
      res.tourney = { won: true, label: f.label, foe: f.name, gold: g, legendary: f.legendary };
      t.round++;
      if (t.round >= 3) {
        const bonus = Math.round(220 * rk.rewards * (f.legendary ? 1.5 : 1)), cr = 4 + 2 * z, rp = 5 + 2 * z + (f.legendary ? 4 : 0);
        career.gold += bonus; career.credits += cr; career.rep += rp; career.champs = (career.champs || 0) + 1;
        const item = E.genItem(new RNG(`trophy|${t.pid}|${t.day}`), { minRarity: Math.min(4, 2 + Math.floor(z / 2) + (f.legendary ? 1 : 0)), luck: 0, heat: 0, rankMul: Math.pow(rk.cs, 0.5) });
        career.stash.push(item); res.banked.push(item);
        res.tourney.champion = { gold: bonus, credits: cr, rep: rp, item };
        career.tourney = null; career.arenaDay = E.worldOf(career).day;
      }
    } else {
      res.tourney = { won: false, label: f.label, foe: f.name };
      career.tourney = null; career.arenaDay = E.worldOf(career).day;
    }
  }
}

// ---------- palace and council: royal commissions ----------
const AUDIENCE_REP = 10;
function palaceInfo(career, node) {
  const n = node.nation, fav = (career.favor || {})[node.id] || 0;
  return { nation: n, ruler: n.ruler, seat: n.ruler ? `${n.ruler.title} ${n.ruler.name}` : n.council, favor: fav, knighted: (career.knighted || []).includes(node.id), open: career.rep >= AUDIENCE_REP, need: AUDIENCE_REP };
}
function royalOffers(career, node) {
  const rng = new RNG(`royal|${career.wseed}|${node.id}|${career.boardN}`);
  const z = Math.max(E.worldZone(node.x, node.y), 0), rank = rankOf(Math.min(gIdx(career) + 1, Math.max(z, gIdx(career))));
  const info = palaceInfo(career, node), out = [];
  const types = ['clear', 'bounty', 'relic', 'hunt', 'rescue', 'cull'];
  for (let k = 0; k < 2; k++) {
    const type = rng.pick(types), m = E.buildMission(rng, rank, type, `royal|${node.id}|${career.boardN}|${k}`, {});
    m.reward = { gold: Math.round(m.reward.gold * 2.3), credits: Math.round(m.reward.credits * 2), rep: Math.round(m.reward.rep * 2) + 2, itemRarity: Math.min(4, m.reward.itemRarity + 1) };
    m.royal = { id: node.id, issuer: info.seat, nation: node.nation.full, city: node.name };
    out.push(m);
  }
  return out;
}
function royalDone(career, m, res) {
  career.favor = career.favor || {}; career.favor[m.royal.id] = (career.favor[m.royal.id] || 0) + 1;
  res.royal = { favor: career.favor[m.royal.id], issuer: m.royal.issuer, nation: m.royal.nation };
  if (career.favor[m.royal.id] >= 3) {
    career.knighted = career.knighted || [];
    if (!career.knighted.includes(m.royal.id)) {
      career.knighted.push(m.royal.id);
      career.char.stats.LUK += 1; career.rep += 10;
      const item = E.genItem(new RNG(`gift|${m.royal.id}|${career.runs}`), { rarity: 4, heat: 0, luck: 0, rankMul: 1.5 });
      career.stash.push(item); res.banked.push(item);
      res.royal.knighted = true;
    }
  }
}
function royalTake(career, node, i) {
  const m = royalOffers(career, node)[i];
  if (!m) return null;
  if (career.rep < AUDIENCE_REP) return null;
  return m;
}

// ---------- grand market ----------
function grandStock(career, node) {
  if (career.grand && career.grand.id === node.id && career.grand.n === career.boardN) return career.grand;
  const rng = new RNG(`grand|${career.wseed}|${node.id}|${career.boardN}`);
  const z = rankOf(E.worldZone(node.x, node.y)), items = [];
  for (let i = 0; i < 6; i++) {
    const it = E.genItem(rng, { minRarity: i < 3 ? 2 : 1, luck: 0, heat: 0, rankMul: Math.pow(RANKS[z].cs, 0.5) });
    items.push(Object.assign(it, { price: Math.round(it.value * 4.6 * E.priceMul(career)) }));
  }
  career.grand = { id: node.id, n: career.boardN, items };
  return career.grand;
}
function grandBuy(career, node, i) {
  const g = grandStock(career, node), it = g.items[i];
  if (!it || it.sold) return { ok: false, msg: 'Sold.' };
  if (career.gold < it.price) return { ok: false, msg: 'Not enough gold.' };
  if (career.stash.length >= 40) return { ok: false, msg: 'Your stash is full (40 items).' };
  career.gold -= it.price; it.sold = true;
  const c = Object.assign({}, it); delete c.price; delete c.sold;
  career.stash.push(c);
  return { ok: true, msg: `Bought ${it.name || 'an item'} for ${it.price}g.` };
}

Object.assign(E, { questInfo, questStart, questStep, strangerEvent, ambushEvent, worldAmbush, questNodeCleared, dir8, guildPlace, guildBoard, canTake, takeNote, rankTestInfo, rankTestStart, courierOffers, courierAccept, courierAbandon, courierArrive, legendaryParties, legendaryOffers,
  arenaPlace, arenaStatus, tourneyEnter, tourneyFight, tourneyWithdraw, tourneyPrize, guildAfterRun, palaceInfo, royalOffers, royalTake, royalDone, grandStock, grandBuy, AUDIENCE_REP });
})(typeof globalThis !== 'undefined' ? globalThis : this);
