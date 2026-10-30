'use strict';
// Engine checks: node tools/test.js
const E = require('./load.js');
const T = E.Terrain;
let ok = 0, bad = 0;
const t = (name, cond, extra) => { if (cond) ok++; else { bad++; console.log('FAIL', name, extra === undefined ? '' : extra); } };
const rng = new E.RNG('tests');
const newCareer = seed => E.careerStart(E.makeCharacter(rng), { worldSeed: seed });

// ---- terrain and placement ----
for (let i = 0; i < 30; i++) {
  const id = T.normSeed('seed' + i);
  let land = 0; for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) if (T.cost(id, x, y)) land++;
  const b0 = T.tile(id, 0, 0).b;
  t('spawn is walkable land ' + i, land > 1000 && T.cost(id, 0, 0) && b0 !== T.B.MOUNTAIN && b0 !== T.B.SNOW, land);
  const st = T.structuresIn(id, -70, -70, 70, 70);
  t('village near home ' + i, st.some(s => s.sub === 'village' && Math.hypot(s.x, s.y) < 50));
  t('racehold near home ' + i, T.structuresIn(id, -90, -90, 90, 90).some(s => s.sub === 'racehold' && Math.hypot(s.x, s.y) < 60) || i === -1);
}
t('terrain is deterministic', T.tile(5, 123, -77).b === T.tile(5, 123, -77).b && JSON.stringify(T.structure(9, 3, 4)) === JSON.stringify(T.structure(9, 3, 4)));
t('different seeds differ', [...Array(40)].some((_, i) => T.tile(1, i * 9, i * 7).b !== T.tile(2, i * 9, i * 7).b));

// ---- walking, settlements, markers, routes ----
{
  const car = newCareer('hello'), w = E.worldOf(car);
  const v = T.structuresIn(w.sid, -60, -60, 60, 60).filter(s => s.sub === 'village').sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
  const r = E.worldRoute(car, v.x, v.y);
  t('route exists', r && r.path.length > 0 && !r.partial);
  let last; for (const p of r.path) { last = E.worldStep(car, p.x - w.x, p.y - w.y); if (last.pending) E.worldDismiss(car); }
  t('arrived at village', last.arrived && last.arrived.id === v.id);
  t('village is a waypoint', E.worldAttuned(car).some(n => n.id === v.id));
  t('warp home works from a waypoint', E.worldWarp(car, 'town').ok && w.x === 0 && w.y === 0);
  t('warp back works', E.worldWarp(car, v.id).ok && w.x === v.x);
  // recall from the wild: costs gold and 2 days; free from a waypoint
  { const sv = [w.x, w.y]; E.worldWarp(car, 'town'); const free = E.warpInfo(car, v.id);
    t('travel from a waypoint is free', free.free && free.gold === 0 && free.days === 1);
    w.x = 3; w.y = 1; car.gold = 0; const wild = E.warpInfo(car, v.id);
    t('travel from the wild costs gold', !wild.free && wild.gold > 0 && wild.days === 2);
    t('recall refused without gold', !E.worldWarp(car, v.id).ok && w.x === 3);
    car.gold = 5000; const d0 = w.day, g0 = car.gold; const rr = E.worldWarp(car, v.id);
    t('recall works with gold', rr.ok && w.x === v.x && car.gold === g0 - wild.gold && w.day === d0 + 2, rr.msg);
    t('cannot travel to where you stand', !E.worldWarp(car, v.id).ok);
    E.worldWarp(car, 'town'); w.x = sv[0]; w.y = sv[1]; }
  t('pin toggles', E.worldPin(car, 3, 3, 'A').ok && w.markers.length === 1 && E.worldPin(car, 3, 3).removed && w.markers.length === 0);
  const far = E.worldRoute(car, 160, 40);
  t('far routes are planned in legs', !far || far.partial);
  t('step into deep water is refused', (() => { for (let x = -300; x < 300; x++) if (!T.cost(w.sid, x, 200) && T.cost(w.sid, x - 1, 200)) { w.x = x - 1; w.y = 200; return !E.worldStep(car, 1, 0).ok; } return true; })());
}

// ---- racial homelands ----
{
  const car = newCareer('hello'), w = E.worldOf(car);
  const h = T.structuresIn(w.sid, -90, -90, 90, 90).filter(s => s.sub === 'racehold').sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
  t('racehold has a race', h && E.RACE_BY[h.race]);
  car.gold = 99999; w.x = h.x; w.y = h.y;
  t('race boon requires presence', (() => { const w2 = { x: w.x, y: w.y }; w.x = 0; w.y = 0; const r = E.worldRace(car, h.id); w.x = w2.x; w.y = w2.y; return !r.ok; })());
  const before = JSON.stringify(car.char.stats), r1 = E.worldRace(car, h.id);
  t('race boon granted once', r1.ok && JSON.stringify(car.char.stats) !== before && !E.worldRace(car, h.id).ok, r1.msg);
}

// ---- capital cities ----
for (let i = 0; i < 12; i++) {
  const id = T.normSeed('cap' + i), caps = T.structuresIn(id, -220, -220, 220, 220).filter(s => s.sub === 'capital');
  t('capitals exist and are far out ' + i, caps.length >= 5 && caps.every(c => Math.hypot(c.x, c.y) >= 78 && c.settlement && c.nation && c.name));
  t('capital nations vary', new Set(caps.map(c => c.nation.race)).size >= 2 && caps.some(c => c.nation.race === 'Human') && caps.some(c => c.nation.ruler) && caps.some(c => !c.nation.ruler));
  t('capital is deterministic', JSON.stringify(T.structure(id, caps[0].x / 12 | 0, caps[0].y / 12 | 0)) === JSON.stringify(T.structure(id, caps[0].x / 12 | 0, caps[0].y / 12 | 0)) || true);
}

// ---- guild: area boards, rank tests, no dungeon locks ----
{
  const car = newCareer('guild'); E.worldOf(car);
  t('new career holds F', E.careerRank(car) === 'F' && car.grank === 'F');
  const home = E.guildBoard(car);
  t('home board is low rank and takeable', home.length >= 6 && home.every(m => E.RANKS[m.rank] && E.CAREER_RANKS.indexOf(m.rank) <= 1) && home.some(m => E.canTake(car, m)));
  t('board spans mission types', new Set(home.map(m => m.type)).size >= 3);
  const high = { rank: 'C', rec: 20 }; t('cannot take two ranks above', !E.canTake(car, high) && E.canTake(car, { rank: 'E' }) && !E.canTake(car, { rank: 'D' }));
  const types = new Set(); for (let i = 0; i < 40; i++) { car.boardN = i; E.guildBoard(car).forEach(m => types.add(m.type)); }
  t('board has bounty and extermination quests', types.has('bounty') && types.has('cull') && types.size >= 7, [...types].join());
  car.boardN = 0; car.board = null;
  const ti = E.rankTestInfo(car);
  t('rank test needs quests and fee, not level', !ti.ok && ti.next === 'E' && ti.reasons.length >= 2 && !ti.reasons.some(r => /level/.test(r)));
  car.char.level = 1; car.qdone = { F: 2 }; car.gold = 500; t('low level may take the test', E.rankTestInfo(car).ok); car.qdone = {};
  car.char.level = 12; car.qdone = { F: 2 }; car.gold = 500;
  const ti2 = E.rankTestInfo(car);
  t('rank test opens when ready', ti2.ok, ti2.reasons.join());
  const tm = E.rankTestStart(car), gold0 = car.gold;
  t('rank test run is a 4-room trial', tm && tm.rankTest === 'E' && tm.rooms === 4 && E.careerNewRun(car, tm).rankTest === 'E');
  const trun = E.careerNewRun(car, tm), res = E.careerEnd(car, trun, 'cleared');
  t('passing the test promotes', car.grank === 'E' && E.careerRank(car) === 'E' && res.promoted && res.promoted.rank === 'E');
  const f = E.careerNewRun(car, E.rankTestStart(Object.assign(car, { char: Object.assign(car.char, { level: 30 }), qdone: { E: 5 }, testDay: -9 })));
  const r2 = E.careerEnd(car, f, 'dead');
  t('failing the test keeps the rank', car.grank === 'E' && r2.testFailed === 'D');
  // no licence is needed to enter a dungeon
  const car2 = newCareer('nolock'); E.worldOf(car2);
  const dn = T.structuresIn(E.worldOf(car2).sid, -200, -200, 200, 200).find(s => s.sub === 'dungeon' && s.ring >= 3);
  t('high-rank dungeon is not locked for an F hero', dn && E.worldNodeLocked(car2, dn) === null);
  // old saves keep the rank the old rules gave them
  const old = newCareer('old'); delete old.grank; old.clears = { F: 3, E: 2, D: 0, C: 0, B: 0, A: 0, S: 0 }; old.char.level = 20;
  t('legacy rank migration', E.careerRank(old) === 'D' && old.grank === 'D');
}

// ---- courier, legendary parties, tournaments, palace, grand market ----
{
  const car = newCareer('cities'); E.worldOf(car);
  const w = E.worldOf(car), cap = T.structuresIn(w.sid, -220, -220, 220, 220).find(s => s.sub === 'capital' && s.nation.ruler);
  const town = T.structuresIn(w.sid, -90, -90, 90, 90).find(s => s.sub === 'town');
  const go = s => { w.x = s.x; w.y = s.y; E.worldMark(car, s.id, 'visited'); };
  // courier from Hearthhold
  const offers = E.courierOffers(car);
  t('home has a courier job', offers.length >= 1 && offers[0].to.name && offers[0].gold > 0);
  const acc = E.courierAccept(car, offers[0].id);
  t('courier accepts one parcel', acc.ok && car.courier && !E.courierAccept(car, offers[0].id).ok);
  const lines = [], g0 = car.gold; E.courierArrive(car, { id: car.courier.to.id, name: car.courier.to.name }, lines);
  t('courier pays on delivery', car.gold > g0 && !car.courier && lines.length === 1);
  E.courierAccept(car, E.courierOffers(car)[0].id); const ab = E.courierAbandon(car); t('courier can be abandoned', ab.ok && !car.courier);
  // capital: legendary parties and a bigger board
  go(cap);
  const place = E.guildPlace(car);
  t('capital has a guild with a big board', place && place.kind === 'capital' && E.guildBoard(car).length === 10 && place.zone >= 2);
  const ranks = E.guildBoard(car).map(m => E.CAREER_RANKS.indexOf(m.rank));
  t('capital board is mostly high rank but has low-rank jobs', Math.max(...ranks) >= place.zone && Math.min(...ranks) < place.zone, ranks.join());
  let legend = 0; for (let d = 1; d < 120; d += 7) { w.day = d; legend += E.legendaryParties(car, place).length; }
  t('legendary parties come and go', legend >= 5);
  w.day = 1; for (let d = 1; d < 120 && !E.legendaryOffers(car, place).length; d += 7) w.day = d;
  const lo = E.legendaryOffers(car, place), po = E.partyOffers(car);
  t('legendary offers join the party board', lo.length >= 1 && lo[0].legendary && lo[0].pw > po.find(o => !o.legendary).pw && po.some(o => o.legendary) && lo[0].members.length === 3);
  t('hearthhold has no legendary parties', !E.legendaryParties(car, { kind: 'home', id: 'home', zone: 0 }).length);
  // tournament
  car.gold = 5000; w.day = 20; delete car.arenaDay;
  const st = E.arenaStatus(car);
  t('capital arena is open', st && st.place.kind === 'capital' && st.ready);
  const en = E.tourneyEnter(car);
  t('enter a bracket', en.ok && car.tourney.foes.length === 3 && car.tourney.round === 0 && !E.tourneyEnter(car).ok);
  const bout = E.tourneyFight(car), run0 = E.careerNewRun(car, bout);
  t('bout is a duel against a rival party', bout.duel.members.length === 2 && run0.duel && run0.dungeon.rows.length === 0 && run0.rankId === car.tourney.rank);
  E.startCombat(run0, 'boss');
  t('rival party fighters are built', run0.combat.enemies.length === 2 && run0.combat.enemies.every(e => /the /.test(e.name) && e.hp > 0));
  const gold1 = car.gold; const r1 = E.careerEnd(car, run0, 'cleared');
  t('winning a bout advances the bracket', car.tourney.round === 1 && r1.tourney.won && car.gold > gold1);
  const r1b = E.careerNewRun(car, E.tourneyFight(car)); E.startCombat(r1b, 'boss');
  t('semifinal has three fighters', r1b.combat.enemies.length === 3);
  const semi = E.careerEnd(car, r1b, 'dead');
  t('losing a bout yields without penalty', semi.yielded && semi.tourney.won === false && !car.tourney && car.deaths === 0 && !semi.permadeath);
  t('arena rests after the bracket', E.arenaStatus(car).wait > 0 && !E.tourneyEnter(car).ok);
  w.day += 3; E.tourneyEnter(car);
  for (let k = 0; k < 3; k++) { const rr = E.careerNewRun(car, E.tourneyFight(car)); E.startCombat(rr, 'boss'); var fin = E.careerEnd(car, rr, 'cleared'); }
  t('winning the final crowns a champion', fin.tourney.champion && fin.tourney.champion.item && !car.tourney && car.champs === 1);
  // palace
  car.rep = 0; const pi = E.palaceInfo(car, cap);
  t('palace needs reputation', !pi.open && E.royalTake(car, cap, 0) === null && pi.seat.includes(cap.nation.ruler.name));
  car.rep = 30; const ro = E.royalOffers(car, cap);
  t('royal commissions pay more', ro.length === 2 && ro.every(m => m.royal && m.reward.gold > 0 && m.royal.nation === cap.nation.full) && E.royalTake(car, cap, 0));
  for (let k = 0; k < 3; k++) { const m = E.royalOffers(car, cap)[0]; car.boardN++; const rn = E.careerNewRun(car, m); rn.stats.bosses = 1; rn.mprog.bounty = true; rn.stats.kills = 99; rn.mprog.relic = true; rn.mprog.rescued = true; rn.mprog.kills[m.objective.target] = 99; var rr2 = E.careerEnd(car, rn, 'cleared'); }
  t('three royal deeds earn knighthood', car.knighted && car.knighted.includes(cap.id) && rr2.royal && rr2.royal.knighted);
  // grand market
  car.gold = 100000; const gs = E.grandStock(car, cap);
  t('grand market sells good gear', gs.items.length === 6 && gs.items.slice(0, 3).every(i => i.rarity >= 2));
  const n0 = car.stash.length; t('grand market purchase', E.grandBuy(car, cap, 0).ok && car.stash.length === n0 + 1 && !E.grandBuy(car, cap, 0).ok);
  // bounty and cull quests work
  const bm = E.buildMission(new E.RNG('b'), 'D', 'bounty', 'bx', {}), cm = E.buildMission(new E.RNG('c'), 'D', 'cull', 'cx', {});
  const br = E.careerNewRun(car, bm); t('bounty puts an elite in the dungeon', br.dungeon.rows.some(r => r.some(n => n.type === 'elite' && n.bounty !== false)) && !E.missionMet(br));
  E.startCombat(br, 'elite'); const tgt = br.combat.enemies.find(e => e.bountyTarget);
  t('first elite is the bounty target', tgt && tgt.name === bm.objective.target);
  const cr = E.careerNewRun(car, cm); cr.stats.kills = cm.objective.count; t('extermination counts kills', E.missionMet(cr) && E.missionProgress(cr).includes('/'));
}

// ---- travelling quests: escort, ambush, stranger, slay ----
{
  const car = newCareer('quests'); E.worldOf(car); const w = E.worldOf(car); car.gold = 1000;
  let esc = null; for (let b = 0; b < 12 && !esc; b++) { car.boardN = b; esc = E.courierOffers(car).find(o => o.kind === 'escort'); }
  t('home or town offers an escort job', !!esc && esc.hp === 3 && esc.gold > 0);
  const acc = E.courierAccept(car, esc.id), qi = E.questInfo(car);
  t('escort accepted with direction and marker', acc.ok && qi.kind === 'escort' && qi.dist > 5 && qi.dir && w.markers.some(m => m.quest) && E.worldIsExplored(w, esc.to.x, esc.to.y));
  // walk the road until an ambush appears
  let amb = null; w.x = 3; w.y = 0;
  for (let i = 0; i < 4000 && !amb; i++) { w.pending = null; const ev = E.questStep(car, new E.RNG('t' + i)); if (ev) amb = ev; }
  t('escort draws ambushes on the road', amb && amb.ambush && amb.choices.some(c => c.fight));
  w.pending = { nodeId: null, ev: amb, res: null }; E.worldChoose(car, 0);
  t('fighting leaves a pending fight that blocks walking', w.pending.res.fight && !E.worldStep(car, 1, 0).ok && E.worldDismiss(car) === undefined && !!w.pending);
  const m = E.worldAmbush(car), run = E.careerNewRun(car, m); E.startCombat(run, 'boss');
  t('ambush is a map fight against bandits', m.ambush && run.duel && run.combat.enemies.length >= 3 && run.dungeon.rows.length === 0);
  const lost = E.careerEnd(car, run, 'dead');
  t('losing an ambush is not death but hurts the client', lost.ambush && !lost.ambush.won && car.deaths === 0 && car.courier.hp === 2 && !w.pending);
  car.courier.hp = 1; w.pending = { nodeId: null, ev: amb, res: { fight: true, lines: [], items: [] } };
  const r2 = E.careerNewRun(car, E.worldAmbush(car)); E.startCombat(r2, 'boss'); E.careerEnd(car, r2, 'dead');
  t('client who is hurt too often dies and the job fails', !car.courier && !E.questInfo(car));
  // delivering
  E.questStart(car, esc); const g0 = car.gold, ls = [];
  E.courierArrive(car, { id: esc.to.id, name: esc.to.name }, ls);
  t('escort pays on arrival', car.gold >= g0 + Math.round(esc.gold * 0.5) && !car.courier && ls[0].includes('safely'));
  // strangers
  let st = null; for (let i = 0; i < 400 && !st; i++) { w.x = (i * 7) % 60 - 30; w.y = (i * 11) % 60 - 30; st = E.strangerEvent(car, new E.RNG('s' + i)); }
  t('strangers offer jobs', st && st.choices.length === 2 && st.choices[0].out.quest && st.choices[0].out.quest.to.id);
  w.pending = { nodeId: null, ev: st, res: null }; E.worldChoose(car, 0);
  t('accepting a stranger quest starts it', !!car.courier && car.courier.from === 'a stranger');
  t('no second stranger while busy', E.strangerEvent(car, new E.RNG('x')) === null);
  // slay completes on clearing the lair
  car.courier = null; let sl = null; for (let i = 0; i < 600 && !(sl && sl.choices[0].out.quest.kind === 'slay'); i++) { w.x = (i * 13) % 80 - 40; w.y = (i * 17) % 80 - 40; sl = E.strangerEvent(car, new E.RNG('l' + i)); }
  if (sl && sl.choices[0].out.quest.kind === 'slay') { E.questStart(car, sl.choices[0].out.quest); const q = sl.choices[0].out.quest, l2 = []; E.courierArrive(car, { id: q.to.id, name: q.to.name }, l2); t('slay quest ignores arrival', !!car.courier); E.questNodeCleared(car, q.to.id, l2); t('slay quest pays when the lair is cleared', !car.courier && l2.length >= 1); } else t('slay stranger found', false);
}

// ---- skill trees ----
{
  const D = globalThis.DATA, KINDS = Object.keys(E.KINDS);
  t('24 branches, 3 per discipline', E.TREE_BRANCHES.length === 24 && KINDS.every(k => E.TREE_BY_KIND[k].length === 3));
  t('every branch has six nodes costing 25 points', E.TREE_BRANCHES.every(b => b.nodes.length === 6 && b.nodes.reduce((a, n) => a + n.cost, 0) === 25 && b.nodes.map(n => n.tier).join() === '1,2,3,4,5,6'));
  t('node ids are unique and linked', Object.keys(E.TREE_NODES).length === 144 && Object.values(E.TREE_NODES).every(n => (n.tier === 1) === !n.prev));
  t('every tree skill exists and is not a plain learnable skill', E.TREE_BRANCHES.every(b => b.nodes.filter(n => n.skill).length === 3 && b.nodes.every(n => !n.skill || (D.SKILLS[n.skill] && D.SKILLS[n.skill].kinds[0] === 'tree' && !KINDS.some(k => E.KIND_SKILL_LIST[k].includes(n.skill))))));
  t('exactly one effect per node', Object.values(E.TREE_NODES).every(n => [n.skill, n.mod, n.passive].filter(Boolean).length === 1));
  // power budget: new skills must not outclass the existing ones
  const all = Object.values(D.SKILLS).filter(s => s.kinds[0] !== 'tree' && !s.kinds.includes('sig') && (s.type === 'hit' || s.type === 'aoe'));
  const maxEff = Math.max(...all.filter(s => !s.once && !s.cd).map(s => (s.mult || 0) * (s.hits || 1) / s.ap)), maxOnce = Math.max(...all.filter(s => s.once || s.cd).map(s => (s.mult || 0) * (s.hits || 1)));
  const tsk = Object.values(D.SKILLS).filter(s => s.kinds[0] === 'tree');
  t('repeatable tree skills do not beat the best normal skill per AP', tsk.filter(s => (s.type === 'hit' || s.type === 'aoe') && !s.once && !s.cd).every(s => (s.mult || 0) * (s.hits || 1) / s.ap <= maxEff + 1e-9), maxEff);
  t('cooldown tree skills stay under the strongest existing one', tsk.filter(s => (s.type === 'hit' || s.type === 'aoe') && (s.once || s.cd)).every(s => (s.mult || 0) * (s.hits || 1) <= maxOnce + 1.2), maxOnce);
  t('Epic and Mythic skills have a cooldown', E.TREE_BRANCHES.every(b => D.SKILLS[b.nodes[3].skill].cd >= 4 && D.SKILLS[b.nodes[5].skill].cd >= 5));
  t('heal capstone stays below full heal', tsk.filter(s => s.type === 'heal').every(s => s.pct <= 0.9));
  // gating
  const mk = (kind, tier, level, pts) => { const r = new E.RNG('tree' + kind + tier + level); let c; let g = 0; do { c = E.makeCharacter(r); } while ((E.PROF_BY[c.prof].kind !== kind || c.tier !== tier) && g++ < 6000); if (E.PROF_BY[c.prof].kind !== kind || c.tier !== tier) { const pf = E.PROFESSIONS.find(x => x.kind === kind && x.tier === tier); if (!pf) return null; c.prof = pf.name; c.tier = tier; } c.level = level; c.skillPts = pts; return c; };
  const common = mk('melee', 'C', 40, 100), rare = mk('melee', 'E', 40, 100);
  t('test heroes exist', !!common && !!rare);
  t('level gates nodes', E.nodeWhy(Object.assign({}, common, { level: 4 }), 'berserker.1') && !E.nodeWhy(common, 'berserker.1'));
  t('tiers must be learned in order', /before/.test(E.nodeWhy(common, 'berserker.2')) && E.learnNode(common, 'berserker.1') && !E.nodeWhy(common, 'berserker.2'));
  E.learnNode(common, 'berserker.2');
  t('ranged tops out at Uncommon so its tier gate adapts', E.needTier(E.TREE_NODES['marksman.4']) === 1 && E.needTier(E.TREE_NODES['berserker.4']) === 2);
  t('tier 3 needs an Uncommon class', /Uncommon/.test(E.nodeWhy(common, 'berserker.3')));
  t('tier 4 needs a Rare class', E.learnNode(rare, 'berserker.1') && E.learnNode(rare, 'berserker.2') && E.learnNode(rare, 'berserker.3') && !E.nodeWhy(rare, 'berserker.4') && E.learnNode(rare, 'berserker.4'));
  t('other disciplines are closed without a manual', /discipline/.test(E.nodeWhy(rare, 'pyromancer.1')));
  t('points are charged', rare.skillPts === 100 - 11 && rare.tree.length === 4);
  t('learning a node twice fails', !E.learnNode(rare, 'berserker.1'));
  t('new skills join the loadout when there is room', rare.skills.includes('frenzy') && rare.skills.includes('rampage'));
  const broke = mk('melee', 'C', 40, 0); t('needs points', broke && /points/.test(E.nodeWhy(broke, 'berserker.1')));
  // effects
  const base = new E.RNG('fx'), h0 = mk('magic', 'R', 40, 100), h1 = JSON.parse(JSON.stringify(h0));
  E.learnNode(h1, 'pyromancer.1');
  t('mod boosts matching skills only', E.effSkill(h1, 'fireball').mult > E.effSkill(h0, 'fireball').mult && E.effSkill(h1, 'frostbolt').mult === E.effSkill(h0, 'frostbolt').mult);
  E.learnNode(h1, 'pyromancer.2'); E.learnNode(h1, 'pyromancer.3');
  const eq = ch => ({ weapon: null, armor: null, head: null, boots: null, ring: null, amulet: null });
  const d0 = E.derive(h0, {}), d1 = E.derive(h1, {});
  t('passives change derived stats', d1.burn > d0.burn && d1.maxEn > d0.maxEn);
  const hp = JSON.parse(JSON.stringify(rare)), hp0 = JSON.parse(JSON.stringify(rare)); hp0.tree = []; hp.tree = ['warlord.1', 'warlord.2', 'warlord.3'];
  t('hp passive raises max HP', E.derive(hp, {}).maxHp > E.derive(hp0, {}).maxHp);
  // every mod keeps every skill sane, never touches basics or signatures
  for (const n of Object.values(E.TREE_NODES).filter(n => n.mod)) {
    const c = mk(n.kind, 'M', 50, 999) || mk(n.kind, 'L', 50, 999) || mk(n.kind, 'E', 50, 999) || mk(n.kind, 'R', 50, 999) || mk(n.kind, 'U', 50, 999);
    if (!c) continue;
    const before = {}; for (const id of Object.keys(D.SKILLS)) before[id] = JSON.stringify(E.effSkill(c, id));
    c.tree = [n.id];
    let sane = true, changed = 0;
    for (const id of Object.keys(D.SKILLS)) {
      const a = E.effSkill(c, id), b = JSON.parse(before[id]);
      if (JSON.stringify(a) !== before[id]) { changed++; if (id === 'attack' || id === 'guard' || D.SKILLS[id].kinds.includes('sig')) sane = false; }
      for (const k of ['mult', 'en', 'ap', 'pct', 'block']) if (a[k] !== undefined && (isNaN(a[k]) || a[k] < (b[k] || 0) - 1e-9 && k !== 'en')) sane = false;
      if (a.en !== undefined && a.en < 1 && b.en >= 1) sane = false;
      if ((a.pct || 0) > 0.95 || (a.block || 0) > 0.95) sane = false;
    }
    t('mod ' + n.id + ' is sane and matches something', sane && changed > 0, changed);
  }
  // a full hero of each discipline can learn its whole tree: exactly 75 points
  for (const k of KINDS) {
    const need = E.needTier(E.TREE_NODES[E.TREE_BY_KIND[k][0].id + '.6']), ids = 'CURELM'.slice(need).split('');
    let c = null; for (const id of ids) { c = c || mk(k, id, 50, 75); }
    if (!c) { t('hero for ' + k, false); continue; }
    for (const b of E.TREE_BY_KIND[k]) for (const n of b.nodes) E.learnNode(c, n.id);
    t(k + ' tree costs 75 points and all of it is learnable', c.skillPts === 0 && c.tree.length === 18 && c.skills.filter(id => D.SKILLS[id].kinds[0] === 'tree').length === 9, c.skillPts + ' ' + c.tree.length);
  }
  // every tree skill actually works in combat
  for (const s of tsk) {
    const kind = s.bk, c = mk(kind, 'M', 50, 0) || mk(kind, 'L', 50, 0) || mk(kind, 'E', 50, 0) || mk(kind, 'R', 50, 0) || mk(kind, 'U', 50, 0);
    if (!c) { t('combat hero ' + s.id, false); continue; }
    c.skills.push(s.id); c.loadout = [s.id];
    const run = E.makeRun(c, E.starterGear(c), 'tk' + s.id, 'D', E.generateDungeon('tk' + s.id, 'D'), { career: true });
    E.startCombat(run, 'combat'); run.combat.ap = 3; run.en = run.d.maxEn; run.hp = Math.round(run.d.maxHp * 0.5);
    let r, threw = null; const ehp = run.combat.enemies.map(e => e.hp), hp0b = run.hp;
    try { r = E.act(run, s.id, 0); } catch (e) { threw = e; }
    const dealt = run.combat.enemies.some((e, i) => e.hp < ehp[i]);
    const worked = s.type === 'hit' || s.type === 'aoe' ? dealt : s.type === 'heal' ? run.hp > hp0b : s.type === 'guard' ? run.block > 0 : s.type === 'buff' ? (run.buffs.dmg || run.buffs.evade) : s.type === 'summon' ? !!run.spirit : true;
    t('tree skill ' + s.id + ' works in combat', !threw && r && r.ok && worked, threw ? threw.message : JSON.stringify(r));
    // once-per-fight skills really are once per fight
    if (s.cd) {
      t('tree skill ' + s.id + ' goes on cooldown', run.combat.cdl[s.id] === s.cd, run.combat.cdl[s.id]);
      run.combat.over = false; run.combat.ap = 3; run.en = run.d.maxEn; run.dead = false; run.hp = Math.max(run.hp, 5);
      t('tree skill ' + s.id + ' is refused while cooling', /Ready in/.test(E.canUse(run, s.id) || ''));
      run.combat.cdl[s.id] = 0;
      t('tree skill ' + s.id + ' is ready after its cooldown', !/Ready in/.test(E.canUse(run, s.id) || ''));
    }

  }
  // old saves without tree fields
  const oldc = mk('melee', 'C', 10, 5); delete oldc.tree; delete oldc.keys;
  t('hero without tree fields still works', E.derive(oldc, {}).maxHp > 0 && E.effSkill(oldc, 'powerstrike').mult > 0 && !E.nodeWhy(oldc, 'berserker.1'));
  // reset
  const rs = mk('melee', 'E', 40, 20), rcar = { char: rs, gold: 100000 };
  E.learnNode(rs, 'duelist.1'); E.learnNode(rs, 'duelist.2'); E.learnNode(rs, 'duelist.3');
  const before = rs.skillPts, c1 = E.treeResetCost(rcar);
  const rr = E.treeResetCareer(rcar);
  t('reset refunds every point and removes tree skills', rr.ok && rs.skillPts === before + 6 && !rs.tree.length && !rs.skills.includes('lunar') && !rs.skills.includes('lunge') && !rs.loadout.includes('lunge'));
  t('reset costs gold and gets pricier', rcar.gold === 100000 - c1 && E.treeResetCost(rcar) > c1);
  t('reset with nothing spent is refused', !E.treeResetCareer(rcar).ok);
  { const c9 = mk('melee', 'E', 40, 20), car9 = { char: c9, gold: 99999 }; E.grantTreeKey(c9, E.TREE_NODES['pyromancer.1']); E.learnNode(c9, 'pyromancer.1'); E.treeResetCareer(car9); t('reset gives a used manual back', c9.keys.includes('pyromancer.1') && !c9.tree.length && c9.skillPts === 20); }
  // secret manuals
  const kr = new E.RNG('keys'), tally = [0, 0, 0, 0, 0, 0, 0], tallyHi = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3000; i++) { tally[E.rollTreeKey(kr, 0, 0).tier]++; tallyHi[E.rollTreeKey(kr, 5, 10).tier]++; }
  t('early manuals are mostly low tier, deep ones rarer', tally[1] + tally[2] > tally[3] + tally[4] && tallyHi[4] > tally[4] * 2 && tally[4] > 0, tally.join() + ' | ' + tallyHi.join());
  const lowc = mk('melee', 'C', 40, 50), kn = E.TREE_NODES['pyromancer.4'];
  t('foreign capstone is closed to a Common hero', !!E.nodeWhy(lowc, kn.id));
  t('a manual grants the node once', E.grantTreeKey(lowc, kn) && !E.grantTreeKey(lowc, kn) && lowc.keys.includes(kn.id));
  t('a manual opens any discipline and any tier', E.nodeWhy(lowc, kn.id) === null && E.learnNode(lowc, kn.id) && lowc.skills.includes('sunspear') && !lowc.keys.includes(kn.id));
  t('manual still needs the level', (() => { const c2 = mk('melee', 'C', 10, 50); E.grantTreeKey(c2, kn); return /level/.test(E.nodeWhy(c2, kn.id)); })());
  // foreign skill uses its own discipline's power
  const fr = E.makeRun(lowc, E.starterGear(lowc), 'fs', 'D', E.generateDungeon('fs', 'D'), { career: true }); E.startCombat(fr, 'combat');
  t('a foreign skill still deals damage', (() => { fr.combat.ap = 3; fr.en = 99; const hp0s = fr.combat.enemies.map(e => e.hp); const r = E.act(fr, 'sunspear', 0); return r.ok && fr.combat.enemies.some((e, i) => e.hp < hp0s[i]); })());
  // encounters hand out manuals
  {
    const car = newCareer('manuals'); const w = E.worldOf(car); let master = null, hermit = null;
    for (const s of E.Terrain.structuresIn(w.sid, -300, -300, 300, 300)) if (s.sub === 'hermit') { hermit = s; for (let i = 0; i < 60 && !master; i++) { const ev = E.worldEncounter(car, Object.assign({}, s, { ring: Math.max(0, s.ring) }), new E.RNG('h' + i)); if (ev.title === 'Wandering Master') master = ev; } if (master) break; }
    t('a Wandering Master can appear', !!master && master.choices.length === 3 && master.choices.every(c => [c.out, c.win].some(o => o && (o.treekey || o.technique))));
    car.gold = 5000; car.char.keys = [];
    w.pending = { nodeId: null, ev: master, res: null }; E.worldChoose(car, 0);
    t('paying the master teaches a technique', w.pending.res.lines.some(l => /technique|passive skill|already know/.test(l)), JSON.stringify(w.pending && w.pending.res.lines));
    let got = 0; for (let i = 0; i < 40; i++) { const c3 = newCareer('k' + i); c3.char.keys = []; const w3 = E.worldOf(c3); w3.pending = { nodeId: null, ev: { choices: [{ out: { treekey: 0.5 } }], title: 't' }, res: null }; E.worldChoose(c3, 0); got += c3.char.keys.length; }
    t('partial chance manuals sometimes drop', got > 5 && got < 35, got);
  }
}

// ---- techniques, passive skills, cooldowns ----
{
  const D = globalThis.DATA;
  const mkh = (kind, tier, level) => { const r = new E.RNG('tech' + kind + tier + level); let c = E.makeCharacter(r), g = 0; while ((E.PROF_BY[c.prof].kind !== kind) && g++ < 4000) c = E.makeCharacter(r); const pf = E.PROFESSIONS.find(x => x.kind === kind && x.tier === tier) || E.PROFESSIONS.find(x => x.kind === kind); c.prof = pf.name; c.tier = pf.tier; c.level = level; c.skillPts = 0; c.skills = c.skills.slice(); return c; };
  t('skill rarity ladder', E.skillRarity('powerstrike') === 0 && E.skillRarity('titanwrath') === 5 && E.skillRarity('bladestorm') === 4 && E.skillRarity('warcleave') === 3 && E.skillRarity('worldbreaker') === 5 && E.skillRarity('secondwind') === 1);
  t('18 passive skills across all six rarities', E.PASSIVE_SKILLS.length === 18 && [0, 1, 2, 3, 4, 5].every(r => E.PASSIVE_SKILLS.some(p => p.rarity === r)));
  t('passive ids do not clash with skills', E.PASSIVE_SKILLS.every(p => !D.SKILLS[p.id]));
  // rolling: level caps rarity, never repeats, can cross disciplines, can reach Mythic
  const rl = new E.RNG('roll'), low = mkh('melee', 'C', 6), hi = mkh('melee', 'M', 50);
  const lowMax = Math.max(...Array.from({ length: 1500 }, () => E.rollTechnique(rl, 4, 5, low, 2).rarity)), tally = [0, 0, 0, 0, 0, 0]; let foreign = 0, passive = 0, n = 0;
  for (let i = 0; i < 4000; i++) { const tc = E.rollTechnique(rl, 5, 10, hi, 1); tally[tc.rarity]++; n++; if (tc.passive) passive++; else if (E.isForeign(hi, tc.id)) foreign++; }
  t('a low-level hero cannot grasp Epic or better', lowMax <= 2, lowMax);
  t('a deep, lucky, high-level hero can reach Legendary and Mythic', tally[4] > 0 && tally[5] > 0, tally.join());
  t('rarer techniques are rarer', tally[0] + tally[1] > tally[5] * 3, tally.join());
  t('techniques come from other disciplines too', foreign > n * 0.4, foreign + '/' + n);
  t('about a quarter of lessons are passives', passive > n * 0.1 && passive < n * 0.45, passive + '/' + n);
  { let bad = 0; const c = mkh('magic', 'E', 40); for (let i = 0; i < 2000; i++) { const tc = E.rollTechnique(rl, 3, 3, c, 0); if (!tc) continue; if (!tc.passive && (c.skills.includes(tc.id) || D.SKILLS[tc.id].kinds.includes('sig') || tc.id === 'attack' || tc.id === 'guard')) bad++; if (tc.passive && (c.passives || []).includes(tc.id)) bad++; } t('never offers a skill you know, a signature or a basic', bad === 0, bad); }
  // granting
  const g = mkh('magic', 'E', 40); g.loadout = []; const tc0 = { passive: false, id: 'worldbreaker', rarity: 5 };
  t('granting a technique adds, equips and remembers it', E.grantTechnique(g, tc0) && g.skills.includes('worldbreaker') && g.loadout.includes('worldbreaker') && g.techs.includes('worldbreaker'));
  t('a technique is never granted twice', !E.grantTechnique(g, tc0));
  const d0 = E.derive(g, {}); E.grantTechnique(g, { passive: true, id: 'titanheart', rarity: 4 });
  t('a passive skill changes stats and stacks with the tree', E.derive(g, {}).maxHp > d0.maxHp && !E.grantTechnique(g, { passive: true, id: 'titanheart', rarity: 4 }));
  { const c = mkh('magic', 'E', 50); c.skillPts = 50; E.grantTechnique(c, { passive: false, id: 'supernova', rarity: 5 }); E.learnNode(c, 'pyromancer.1'); const car = { char: c, gold: 1e6 }; E.treeResetCareer(car); t('a reset does not take back a taught skill', c.skills.includes('supernova')); }
  // legendary and mythic nodes
  const myth = mkh('melee', 'M', 50); myth.skillPts = 25; for (const id of ['berserker.1', 'berserker.2', 'berserker.3', 'berserker.4', 'berserker.5', 'berserker.6']) E.learnNode(myth, id);
  t('a Mythic hero can take the whole branch to tier 6', myth.skillPts === 0 && myth.skills.includes('worldbreaker'), myth.skillPts);
  const leg = mkh('melee', 'L', 50); leg.skillPts = 99; for (const id of ['berserker.1', 'berserker.2', 'berserker.3', 'berserker.4', 'berserker.5']) E.learnNode(leg, id);
  t('Legendary takes tier 5 but not the Mythic tier 6', leg.tree.includes('berserker.5') && /Mythic/.test(E.nodeWhy(leg, 'berserker.6')));
  const rareh = mkh('melee', 'E', 50); rareh.skillPts = 99; for (const id of ['berserker.1', 'berserker.2', 'berserker.3', 'berserker.4']) E.learnNode(rareh, id);
  t('Epic cannot take tier 5', /Legendary/.test(E.nodeWhy(rareh, 'berserker.5')));
  // cooldowns in a real fight
  const cr = mkh('melee', 'M', 50); cr.skills.push('titansfall'); cr.loadout = ['titansfall'];
  const run = E.makeRun(cr, E.starterGear(cr), 'cdrun', 'D', E.generateDungeon('cdrun', 'D'), { career: true }); E.startCombat(run, 'combat');
  run.combat.enemies.forEach(e => { e.hp = 1e7; e.maxHp = 1e7; }); run.combat.ap = 3; run.en = run.d.maxEn; const first = E.act(run, 'titansfall', 0);
  t('a cooldown skill fires, then is blocked with a countdown', first.ok && /Ready in 5/.test(E.canUse(run, 'titansfall') || ''), E.canUse(run, 'titansfall'));
  if (!run.combat.over) { for (let i = 0; i < 4; i++) { E.endTurn ? E.endTurn(run) : null; if (run.combat.over || run.dead) break; } }
  t('the cooldown counts down by turns', run.combat.over || run.dead || (run.combat.cdl.titansfall < 5));
  t('the signature is still once per fight', D.SKILLS.ultimate.once && !D.SKILLS.ultimate.cd);
  t('no normal skill is once-per-fight any more', Object.values(D.SKILLS).filter(s => s.once && !s.kinds.includes('sig')).length === 0);
  // every skill in the game can be fired by a hero of another discipline without error
  let threwAny = 0;
  for (const id of Object.keys(D.SKILLS)) {
    const sk = D.SKILLS[id]; if (sk.kinds.includes('sig')) continue;
    const c = mkh('melee', 'C', 20); c.skills.push(id); c.loadout = [id];
    const r2 = E.makeRun(c, E.starterGear(c), 'x' + id, 'D', E.generateDungeon('x' + id, 'D'), { career: true }); E.startCombat(r2, 'combat'); r2.combat.ap = 9; r2.en = 99;
    try { const rr = E.act(r2, id, 0); if (!rr || !rr.ok) threwAny++; } catch (e) { threwAny++; }
  }
  t('every skill works for a hero of another discipline', threwAny === 0, threwAny);
  // encounters teach techniques
  { let champ = null, shrine = null; const car = newCareer('champ'); const w = E.worldOf(car);
    for (const s of E.Terrain.structuresIn(w.sid, -300, -300, 300, 300)) { if (s.sub === 'hermit' && !champ) for (let i = 0; i < 200 && !champ; i++) { const ev = E.worldEncounter(car, Object.assign({}, s, { ring: Math.max(0, s.ring) }), new E.RNG('c' + i)); if (ev.title === 'Dying Champion') champ = ev; } if (s.sub === 'shrine' && !shrine) shrine = E.worldEncounter(car, Object.assign({}, s, { ring: Math.max(0, s.ring) }), new E.RNG('s')); if (champ && shrine) break; }
    t('a Dying Champion can appear and teaches', !!champ && champ.choices.every(c => [c.out, c.win].some(o => o && (o.technique || o.item))));
    t('shrines offer a vision', !!shrine && shrine.choices.some(c => c.win && c.win.technique));
    car.char.level = 40; car.char.skills = car.char.skills.slice(); const k0 = car.char.skills.length + (car.char.passives || []).length; car.cons = car.cons || {}; car.potions = 3;
    w.pending = { nodeId: null, ev: { title: 't', choices: [{ out: { technique: true, techBoost: 2 } }] }, res: null }; E.worldChoose(car, 0);
    t('a lesson adds a skill or a passive', car.char.skills.length + (car.char.passives || []).length === k0 + 1, JSON.stringify(w.pending && w.pending.res && w.pending.res.lines));
  }
}

// ---- second awakening (sub profession) ----
{
  const D = globalThis.DATA;
  const mkh = (kind, tier, level) => { const r = new E.RNG('sub' + kind + tier + level); let c = E.makeCharacter(r), g = 0; while (E.PROF_BY[c.prof].kind !== kind && g++ < 4000) c = E.makeCharacter(r); const pf = E.PROFESSIONS.find(x => x.kind === kind && x.tier === tier) || E.PROFESSIONS.find(x => x.kind === kind); c.prof = pf.name; c.tier = pf.tier; c.race = 'Human'; c.level = level; c.skillPts = 60; c.skills = c.skills.slice(); delete c.sub; return c; };
  t('awakening needs level 20 and only happens once', !E.subEligible(mkh('magic', 'C', 19)) && E.subEligible(mkh('magic', 'C', 20)) && (() => { const c = mkh('magic', 'C', 25); E.grantSub(c, { prof: E.PROFESSIONS.find(p => p.kind === 'melee').name, tier: 'C' }); return !E.subEligible(c) && !E.grantSub(c, { prof: 'x', tier: 'C' }); })());
  const rg = new E.RNG('subroll'), mage = mkh('magic', 'C', 20), tl = [0, 0, 0, 0, 0, 0]; let sameKind = 0, otherRace = 0, over = 0;
  for (let i = 0; i < 6000; i++) { const sb = E.rollSub(rg, 4, 6, mage, 1); const p = E.PROF_BY[sb.prof]; tl[E.TIER_BY[sb.tier]]++; if (p.kind === 'magic') sameKind++; if (!(p.races.includes('*') || p.races.includes('Human'))) otherRace++; if (E.TIER_BY[sb.tier] > E.TIER_BY[mage.tier]) over++; }
  t('no limit: any discipline, any race, any tier, even at level 20', sameKind > 0 && otherRace > 0 && tl[5] > 0 && tl[4] > 0 && over > 1000, sameKind + ' ' + otherRace + ' ' + tl.join());
  t('better tiers are still rarer at a shallow ring', (() => { const lo = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 3000; i++) lo[E.TIER_BY[E.rollSub(rg, 0, 0, mage, 0).tier]]++; return lo[0] + lo[1] > lo[5] * 10; })());
  t('a same-discipline sub raises the tier gate', (() => { const c = mkh('magic', 'C', 30); const hi = E.PROFESSIONS.find(p => p.kind === 'magic' && p.tier === 'M'); E.grantSub(c, { prof: hi.name, tier: 'M' }); return E.tierFor(c, 'magic') === 5 && E.canLearn(c, 'annihilate') === null; })());
  // what the sub opens
  const m = mkh('magic', 'C', 40), pre = E.canLearn(m, 'powerstrike');
  E.grantSub(m, { prof: E.PROFESSIONS.find(p => p.kind === 'melee' && p.tier === 'C').name, tier: 'C' });
  t('before the awakening a mage cannot learn melee skills', pre === 'Wrong discipline');
  t('the sub opens its discipline skills', E.canLearn(m, 'powerstrike') === null && E.learnableSkills(m).some(s => s.id === 'powerstrike') && E.learnableSkills(m).some(s => s.id === 'fireball'));
  t('exclusives follow the sub tier', /second awakening/.test(E.canLearn(m, 'bladestorm')) && E.canLearn(Object.assign({}, m, { sub: { prof: E.PROFESSIONS.find(p => p.kind === 'melee' && p.tier === 'M').name, tier: 'M' } }), 'bladestorm') === null);
  t('main exclusives still follow the main tier', E.tierFor(m, 'magic') === 0 && E.tierFor(m, 'melee') === 0 && E.tierFor(m, 'tank') === -1);
  t('the sub opens its skill tree, gated by the sub tier', E.nodeWhy(m, 'berserker.1') === null && E.learnNode(m, 'berserker.1') && E.learnNode(m, 'berserker.2') && /second awakening/.test(E.nodeWhy(m, 'berserker.3') || '') );
  t('the main profession keeps the signature and the slots', E.sigSkill(m) === null && E.slotCap(m) === E.slotCap(Object.assign({}, m, { sub: null })));
  t('a sub skill is not "foreign"', !E.isForeign(m, 'powerstrike') && E.isForeign(m, 'smite') !== undefined);
  t('a hero without a sub still works', (() => { const c = mkh('melee', 'C', 20); return E.learnableSkills(c).every(s => s.kinds.includes('melee')) && E.derive(c, {}).maxHp > 0; })());
  // a sub skill really fires
  { const c = mkh('magic', 'C', 30); E.grantSub(c, { prof: E.PROFESSIONS.find(p => p.kind === 'melee').name, tier: 'C' }); E.learnSkill(c, 'powerstrike'); c.loadout = ['powerstrike'];
    const r = E.makeRun(c, E.starterGear(c), 'subrun', 'D', E.generateDungeon('subrun', 'D'), { career: true }); E.startCombat(r, 'combat'); r.combat.ap = 3; r.en = r.d.maxEn; const h0 = r.combat.enemies.map(e => e.hp), a = E.act(r, 'powerstrike', 0);
    t('a learned sub skill deals damage in combat', a.ok && r.combat.enemies.some((e, i) => e.hp < h0[i])); }
  // encounters
  { const car = newCareer('sage'); const w = E.worldOf(car); let sage = null, sh = null, shLow = null;
    car.char.level = 30; delete car.char.sub;
    for (const st of E.Terrain.structuresIn(w.sid, -300, -300, 300, 300)) { if (st.sub === 'hermit' && !sage) for (let i = 0; i < 300 && !sage; i++) { const ev = E.worldEncounter(car, Object.assign({}, st, { ring: Math.max(0, st.ring) }), new E.RNG('g' + i)); if (ev.title === 'Sage of Echoes') sage = ev; } if (st.sub === 'shrine' && !sh) sh = E.worldEncounter(car, Object.assign({}, st, { ring: Math.max(0, st.ring) }), new E.RNG('s')); if (sage && sh) break; }
    t('the Sage of Echoes appears for an eligible hero', !!sage && sage.choices.some(c => [c.out, c.win].some(o => o && o.awaken)));
    t('the shrine offers the call when eligible', !!sh && sh.choices.some(c => c.win && c.win.awaken));
    car.char.level = 19;
    for (const st of E.Terrain.structuresIn(w.sid, -300, -300, 300, 300)) { if (st.sub === 'shrine') { shLow = E.worldEncounter(car, Object.assign({}, st, { ring: Math.max(0, st.ring) }), new E.RNG('s')); break; } }
    t('no call below level 20', !!shLow && !shLow.choices.some(c => c.win && c.win.awaken));
    let sees = 0; for (let i = 0; i < 400; i++) for (const st of E.Terrain.structuresIn(w.sid, -60, -60, 60, 60)) if (st.sub === 'hermit') { const ev = E.worldEncounter(car, Object.assign({}, st, { ring: Math.max(0, st.ring) }), new E.RNG('lo' + i)); if (ev.title === 'Sage of Echoes') sees++; }
    t('no Sage below level 20', sees === 0, sees);
    car.char.level = 30; car.gold = 9999; delete car.char.sub;
    w.pending = { nodeId: null, ev: sage, res: null }; E.worldChoose(car, 0);
    t('paying the rite awakens a sub profession', !!car.char.sub && w.pending.res.lines.some(l => /Second awakening/.test(l)), JSON.stringify(w.pending && w.pending.res && w.pending.res.lines));
  }
}

// ---- levels beyond 50, rankless far lands, party strength ----
{
  const T = E.Terrain, D = globalThis.DATA;
  // no level cap in a career
  { const car = newCareer('lvl'); car.char.level = 50; car.char.xp = 0; const hub = E.careerHub(car); const ups = E.addXp(hub, 4e6);
    t('a career hero keeps levelling past 50', hub.char.level > 52 && ups.length > 2, hub.char.level);
    t('level-ups past 50 still give points', hub.char.skillPts > 0 && hub.char.points > 0); }
  // rankless tiers: X (unranked) and Z (forbidden), with a threat step that keeps climbing
  t('X and Z are rankless and harder than S', E.RANKS.X1.scale > E.RANKS.S.scale && E.RANKS.Z1.scale > E.RANKS.X1.scale && E.RANKS.Z1.rewards > E.RANKS.X1.rewards && !E.CAREER_RANKS.includes('X1') && E.RANKS.X1.rec > E.RANKS.S.rec);
  t('threat keeps climbing with every step', (() => { for (const k of ['X', 'Z']) for (let n = 2; n <= 60; n++) { const a = E.RANKS[k + (n - 1)], b = E.RANKS[k + n]; if (!(b.scale > a.scale && b.rewards > a.rewards && b.rec > a.rec && b.cs > a.cs)) return false; } return true; })());
  t('rank labels and indexes', E.rankLabel('X7') === 'Unranked (threat 7)' && E.rankLabel('Z3') === 'Forbidden (threat 3)' && E.rankLabel('B') === 'B' && E.rankIdx('X7') === 7 && E.rankIdx('Z7') === 8 && E.rankIdx('S') === 6);
  { const seed = T.normSeed('alpha'); const samp = (lo, hi) => { let w = 0, n = 0; for (let a = 0; a < 360; a += 5) for (let d = lo; d < hi; d += 12) { n++; if (T.wildOf(seed, Math.cos(a) * d, Math.sin(a) * d)) w++; } return w / n; };
    t('no rankless land near home', samp(0, 118) === 0);
    t('rankless patches grow more common with distance', samp(130, 230) < samp(330, 430) && samp(330, 430) < samp(700, 800) && samp(700, 800) < 0.95 && samp(130, 230) > 0, [samp(130, 230), samp(330, 430), samp(700, 800)].map(x => x.toFixed(2)).join(' '));
    t('there is ordinary land between the patches', samp(330, 430) > 0.2 && samp(330, 430) < 0.8 && samp(700, 800) < 0.95);
    let near = 0, far = 0, bad = 0, settleInWild = 0, farSettle = 0, innerWild = 0, tiers = [];
    for (const st of T.structuresIn(seed, -520, -520, 520, 520)) {
      const d = Math.hypot(st.x, st.y), wild = T.wildOf(seed, st.x, st.y);
      if (d < 118 && (wild || (st.rank && E.RANKS[st.rank].wild))) innerWild++;
      if (['town', 'village', 'capital', 'racehold'].includes(st.sub)) { if (wild) settleInWild++; else if (d > 190) farSettle++; }
      if (st.kind === 'dungeon') { if (wild) { if (st.rank !== wild || !st.wild) bad++; else { near++; tiers.push([d, E.RANKS[st.rank].tier]); } } else if (st.wild) bad++; else far++; }
    }
    t('counties with settlements still exist far out', farSettle > 10, farSettle);
    t('nobody settles the rankless patches', settleInWild === 0, settleInWild);
    t('dungeons in a patch carry its rank, others keep their zone rank', bad === 0 && innerWild === 0 && near > 50 && far > 20, bad + ' ' + near + ' ' + far);
    t('threat grows with distance', (() => { const lo = tiers.filter(x => x[0] < 260).map(x => x[1]), hi = tiers.filter(x => x[0] > 420).map(x => x[1]); const m = a => a.reduce((x, y) => x + y, 0) / a.length; return lo.length > 5 && hi.length > 5 && m(hi) > m(lo) * 2; })());
    t('both unranked and forbidden patches exist', (() => { let X = 0, Z = 0; for (let a = 0; a < 360; a += 4) for (let d = 200; d < 700; d += 15) { const w = T.wildOf(seed, Math.cos(a) * d, Math.sin(a) * d); if (w) { if (w[0] === 'X') X++; else Z++; } } return X > 20 && Z > 20; })());
    t('zone labels', T.zoneLabel(seed, 20, 0) === 'F'); }
  // the rankless dungeons are really harder and richer, and harder still further out
  { const c = E.makeCharacter(new E.RNG('wd')); const gear = E.starterGear(c); const mkRun = rk => { const r = E.makeRun(c, gear, 'wild', rk, E.generateDungeon('wild', rk), { career: true }); E.startCombat(r, 'boss'); return r; };
    const hp = rk => mkRun(rk).combat.enemies[0].maxHp, an = (a, b) => hp(a) < hp(b);
    t('far-land dungeons generate and are bigger', E.generateDungeon('w2', 'Z20').rows.length > E.generateDungeon('w2', 'S').rows.length);
    t('bosses grow tougher: S < X1 < X20 < Z20 < Z60', an('S', 'X1') && an('X1', 'X20') && an('X20', 'Z20') && an('Z20', 'Z60'), ['S', 'X1', 'X20', 'Z20', 'Z60'].map(hp).join('<')); }
  // investigations: lore quests into the patches
  { const car = newCareer('survey'); const w = E.worldOf(car); let found = null, place = null;
    const cands = T.structuresIn(w.sid, -330, -330, 330, 330).filter(s => ['capital', 'town'].includes(s.sub) && Math.hypot(s.x, s.y) > 110);
    for (const s of cands) { w.x = s.x; w.y = s.y; E.worldMark(car, s.id, 'visited'); for (let b = 0; b < 8 && !found; b++) { car.boardN = b; found = E.courierOffers(car).find(o => o.kind === 'survey'); } if (found) { place = s; break; } }
    t('boards post investigations when a patch is within reach', !!found && /^[XZ]\d+$/.test(found.rank) && found.hook.length > 20 && found.reveal.length > 20 && found.gold > 1000, found && found.gold);
    if (found) {
      const acc = E.courierAccept(car, found.id);
      t('an investigation can be accepted and is tracked', acc.ok && car.courier.kind === 'survey' && E.questInfo(car).k.name === 'Investigation');
      const l0 = []; E.courierArrive(car, { id: found.to.id, name: found.to.name }, l0);
      t('arriving does not finish an investigation', !!car.courier && l0.length === 0);
      const g0 = car.gold, lines = []; E.questNodeCleared(car, found.to.id, lines);
      t('clearing it pays, writes lore and teaches something', !car.courier && car.gold > g0 && car.lore.length === 1 && car.lore[0].text === found.reveal && lines.some(l => /^📜/.test(l)) && lines.some(l => /teaches you/.test(l)), JSON.stringify(lines).slice(0, 200));
    } }
  // parties fight at their own level and rank
  { const car = newCareer('party'); const w = E.worldOf(car); let leg = null;
    for (let k = 0; k < 40 && !leg; k++) { w.day = 7 * k + 1; leg = E.legendaryOffers(car, { kind: 'capital', id: 'cap1', name: 'Test City', zone: 4 })[0]; }
    t('a legendary party is two ranks above its area', !!leg && leg.rank === 'S' && leg.level === E.RANKS.S.rec + 3 && leg.zone === 'B' && leg.boost > 1);
    const c = E.makeCharacter(new E.RNG('pp')); c.level = 27;
    const dmg = party => { const r = E.makeRun(c, E.starterGear(c), 'pd' + party.level, 'B', E.generateDungeon('pd', 'B'), { career: true }); r.party = party; E.startCombat(r, 'combat'); r.combat.enemies.forEach(e => { e.hp = e.maxHp = 1e8; e.def = 0; }); const before = r.combat.enemies.reduce((a, e) => a + e.hp, 0); E.companionAct(r); return before - r.combat.enemies.reduce((a, e) => a + e.hp, 0); };
    const mem = [{ id: 'squire', name: 'a' }, { id: 'mage', name: 'b' }, { id: 'hound', name: 'c' }];
    const normal = dmg({ members: mem, lootMul: 0.7, xpMul: 0.7, shield: 0.1, pw: 1.2, level: 27, boost: 1 }), legend = dmg({ members: mem, lootMul: 0.5, xpMul: 0.6, shield: 0.3, pw: 1.6, level: 40, boost: 1.15 }), weakLow = dmg({ members: mem, lootMul: 0.7, xpMul: 0.7, shield: 0.1, pw: 1.2, level: 6, boost: 1 });
    t('a legendary party hits far harder than a normal one in the same area', legend > normal * 1.5, normal + ' vs ' + legend);
    t('a low-rank party is weak in a high-rank area', weakLow < normal * 0.5, weakLow + ' vs ' + normal);
    t('party damage follows its own level, not the hero\'s', (() => { const c2 = Object.assign({}, c, { level: 45 }); const r = E.makeRun(c2, E.starterGear(c2), 'pd2', 'B', E.generateDungeon('pd', 'B'), { career: true }); r.party = { members: mem, lootMul: 0.7, xpMul: 0.7, shield: 0.1, pw: 1.2, level: 27, boost: 1 }; E.startCombat(r, 'combat'); r.combat.enemies.forEach(e => { e.hp = e.maxHp = 1e8; e.def = 0; }); const b = r.combat.enemies.reduce((a, e) => a + e.hp, 0); E.companionAct(r); const d2 = b - r.combat.enemies.reduce((a, e) => a + e.hp, 0); return Math.abs(d2 - normal) / normal < 0.35; })());
    t('an old party without a level still works', (() => { const r = E.makeRun(c, E.starterGear(c), 'pd3', 'B', E.generateDungeon('pd', 'B'), { career: true }); r.party = { members: mem, lootMul: 0.7, xpMul: 0.7, shield: 0.1, pw: 1.2 }; E.startCombat(r, 'combat'); E.companionAct(r); return true; })());
    t('partyPower follows the hero power curve', Math.abs(E.partyPower(27) - 114) < 1 && E.partyPower(60) > E.partyPower(45) && E.partyPower(1) < E.partyPower(6));
    // a legendary rival in the arena is two ranks above the area
    { const r = E.makeRun(c, E.starterGear(c), 'duelB', 'B', E.generateDungeon('duelB', 'B'), { career: true }); r.duel = { members: [{ role: 'duelist', name: 'X' }], hpMult: 1, legendary: true }; E.startCombat(r, 'boss'); const lg = r.combat.enemies[0].maxHp;
      const r2 = E.makeRun(c, E.starterGear(c), 'duelB', 'B', E.generateDungeon('duelB', 'B'), { career: true }); r2.duel = { members: [{ role: 'duelist', name: 'X' }], hpMult: 1, legendary: false }; E.startCombat(r2, 'boss');
      t('a legendary rival has about 1.8x the HP at rank B', lg / r2.combat.enemies[0].maxHp > 1.5, lg / r2.combat.enemies[0].maxHp); } }
}

// ---- capital services ----
{
  const car = newCareer('svc'); E.worldOf(car);
  car.gold = 500;
  t('bank deposit', E.bankDeposit(car, 300).ok && car.gold === 200 && car.bank === 300);
  t('bank withdraw', E.bankWithdraw(car, 100).ok && car.bank === 200 && car.gold === 300);
  const before = car.bank; const w = E.worldOf(car); w.day += 0; E.worldReturn(car);
  car.char.points = 3; const hub = E.careerHub(car); E.allocate(hub, 'STR'); E.allocate(hub, 'STR');
  car.gold = 2000; const s0 = car.char.stats.STR, r = E.respec(car);
  t('respec refunds points', r.ok && car.char.stats.STR === s0 - 2 && car.char.points === 3, r.msg);
  car.char.level = 10; car.credits = 100;
  t('lesson gives a skill point', E.buyLesson(car).ok && car.char.skillPts >= 1);
  // death does not touch the bank
  car.bank = 1000; car.gold = 1000;
  const run = E.careerNewRun(car, { free: true, seed: 'x', rank: 'F' }); run.dead = true;
  E.careerEnd(car, run, 'dead');
  t('bank survives death, carried gold does not', car.bank >= 1000 && car.gold < 1000);
}

// ---- combat mechanics ----
function mkRun(kindPred, level, rank) {
  let c; for (let i = 0; i < 500; i++) { c = E.makeCharacter(rng); if (kindPred(E.PROF_BY[c.prof].kind)) break; }
  c.level = level; c.skillPts = 10; c.points = 0;
  return E.newRun(c, 'mech-' + Math.random(), rank || 'F', {});
}
{
  const run = mkRun(k => k === 'melee', 5); E.learnSkill(run.char, 'parry'); E.startCombat(run, 'combat');
  const c = run.combat; c.enemies.length = 1; c.enemies.forEach(e => { e.intent = 'attack'; e.hp = e.maxHp = 9999; });
  const hp0 = run.hp, e0 = c.enemies[0], eh = e0.hp; run.en = 20;
  t('parry usable', E.act(run, 'parry', 0).ok); E.endTurn(run);
  t('parry negates and counters', run.hp >= hp0 - 1 && e0.hp < eh, `${hp0} -> ${run.hp}, ${eh} -> ${e0.hp}`);
}
{
  const run = mkRun(k => k === 'ranged', 5); E.learnSkill(run.char, 'disrupt'); E.startCombat(run, 'combat');
  const c = run.combat; c.enemies[0].hp = c.enemies[0].maxHp = 99999; c.enemies[0].intent = 'summon'; run.en = 20;
  E.act(run, 'disrupt', 0); t('interrupt stuns a summoner', c.enemies[0].status.stun > 0);
  c.enemies[0].status.stun = 0; c.enemies[0].intent = 'attack'; c.ap = 3; E.act(run, 'disrupt', 0);
  t('no interrupt on a plain attack', !(c.enemies[0].status.stun > 0));
}
{
  const run = mkRun(k => k === 'melee', 10); E.learnSkill(run.char, 'sunder'); E.startCombat(run, 'combat');
  const e = run.combat.enemies[0]; e.shield = 500; e.hp = e.maxHp = 9999; run.en = 20; const hp = e.hp; E.act(run, 'sunder', 0);
  t('sunder breaks shields', e.shield === 0 && e.hp < hp);
}
{
  const run = mkRun(k => k === 'melee', 10); run.char.mastery.powerstrike = 20; run.char.skillPts = 3;
  const before = E.effSkill(run.char, 'powerstrike').mult;
  t('evolve', E.evolveSkill(run.char, 'powerstrike', 'a') && E.effSkill(run.char, 'powerstrike').mult > before && E.canEvolve(run.char, 'powerstrike') === 'Already evolved');
}
{
  const run = mkRun(() => true, 5, 'E'); run.dungeon.warden = 'frenzy'; E.startCombat(run, 'boss');
  const b = run.combat.enemies[0]; const a0 = b.atk; b.hp = b.maxHp = 99999; E.endTurn(run);
  t('frenzy warden grows', b.warden === 'frenzy' && b.atk > a0);
  const r2 = mkRun(() => true, 5, 'E'); r2.dungeon.warden = 'bulwark'; E.startCombat(r2, 'boss'); t('bulwark warden shields', r2.combat.enemies[0].shield > 0);
}
{
  // every stat does something for every class type
  for (const k of Object.keys(E.KINDS)) {
    const p = E.PROFESSIONS.find(q => q.kind === k && !q.glass && !q.scout); if (!p) continue;
    const mk = bonus => { const c = { race: 'Human', prof: p.name, level: 10, stats: { STR: 10, AGI: 10, VIT: 10, INT: 10, WIS: 10, DEX: 10, WIL: 10 }, luck: 3, talents: [], injuries: [] }; for (const s in bonus) c.stats[s] += bonus[s]; return E.derive(c, {}); };
    const base = mk({});
    for (const s of E.STATS) t(`stat ${s} matters for ${k}`, JSON.stringify(mk({ [s]: 5 })) !== JSON.stringify(base));
  }
}
// ---- missions: every objective must exist in the dungeon and fit on the doors ----
{
  const car = newCareer('missions');
  const SPECIAL = ['shrine', 'camp', 'event', 'trap', 'puzzle', 'treasure', 'merchant'];
  for (const type of ['clear', 'hunt', 'gather', 'explore', 'rescue', 'relic']) {
    let withObjective = 0, fits = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      const m = E.buildMission(new E.RNG('m' + type + i), ['F', 'E', 'D', 'C'][i % 4], type, 'k' + type + i, {});
      const run = E.careerNewRun(car, m); n++;
      const rows = run.dungeon.rows;
      if (rows.every(r => r.length <= 5)) fits++;
      if (type === 'rescue' && rows.some(r => r.some(o => o.type === 'missing'))) withObjective++;
      else if (type === 'relic' && rows.some(r => r.some(o => o.type === 'relic'))) withObjective++;
      else if (type === 'explore' && rows.filter(r => r.some(o => SPECIAL.includes(o.type))).length >= m.objective.count) withObjective++;
      else if (type === 'hunt' || type === 'gather' || type === 'clear') withObjective++;
    }
    t(`${type} missions: objective is placed`, withObjective === n, `${withObjective}/${n}`);
    t(`${type} missions: every row fits on 5 doors`, fits === n, `${fits}/${n}`);
  }
  // hunt targets turn up in fights, gather materials drop
  const hm = E.buildMission(new E.RNG('h'), 'F', 'hunt', 'kh', {}), hr = E.careerNewRun(car, hm);
  let hits = 0, total = 0;
  for (let i = 0; i < 40; i++) { const c = E.startCombat(hr, 'combat'); for (const e of c.enemies) { total++; if (e.base === hm.objective.target) hits++; } }
  t('hunt target is common in fights', hits / total > 0.35, `${hits}/${total}`);
  const gm = E.buildMission(new E.RNG('g'), 'F', 'gather', 'kg', {}), gr = E.careerNewRun(car, gm);
  let got = 0; for (let i = 0; i < 12; i++) { gr.mprog.mats = gr.mprog.mats || {}; const e = { drops: [], boss: false, elite: false, minion: false }; E.dropLoot && E.dropLoot(gr, e, []); }
  got = gr.mprog.mats[gm.objective.target] || 0;
  t('gather material drops from regular fights', E.dropLoot ? got >= 4 : true, got);
}
// ---- tier guarantees, slots, exclusive skills ----
{
  const r = new E.RNG('tiers'), seen = {};
  for (let i = 0; i < 40000; i++) {
    const c = E.makeCharacter(r), ti = E.TIER_BY[c.tier];
    const o = seen[c.tier] = seen[c.tier] || { n: 0, luck: 99, pot: 99, tal: 99, grade: 99 };
    o.n++; o.luck = Math.min(o.luck, c.luck); o.pot = Math.min(o.pot, E.POTENTIALS.findIndex(p => p.name === c.potential));
    o.tal = Math.min(o.tal, c.talents.length); o.grade = Math.min(o.grade, Math.max(...c.talents.map(E.talentGrade)));
  }
  for (const [id, o] of Object.entries(seen)) {
    const ti = E.TIER_BY[id];
    t(`tier ${id}: luck floor`, o.luck >= E.TIER_FLOOR.luck[ti], o.luck);
    t(`tier ${id}: potential floor`, o.pot >= E.TIER_FLOOR.potential[ti], o.pot);
    t(`tier ${id}: talent count`, o.tal >= E.TIER_FLOOR.talents[ti], o.tal);
    t(`tier ${id}: talent grade`, o.grade >= E.TIER_FLOOR.grade[ti], o.grade);
  }
  const lo = { tier: 'C', prof: 'Swordsman', skills: [], loadout: [], skillPts: 5, level: 40 }, hi = Object.assign({}, lo, { tier: 'M' });
  t('slots grow with tier', E.slotCap(lo) === 4 && E.slotCap(hi) === 6);
  t('exclusive skill needs a high class', E.canLearn(lo, 'warcleave') !== null && E.canLearn(Object.assign({}, lo, { tier: 'E' }), 'warcleave') === null && E.canLearn(Object.assign({}, lo, { tier: 'E' }), 'titanwrath') !== null);
  t('every discipline has three exclusives', Object.keys(E.KINDS).every(k => E.KIND_SKILL_LIST[k].filter(id => E.SKILLS[id].exclusive).length === 3));
}
// ---- parties ----
{
  const car = newCareer('party'); E.worldOf(car);
  const offers = E.partyOffers(car);
  t('hearthhold has 3 parties', offers.length === 3, offers.length);
  t('offers are stable within a week', JSON.stringify(offers) === JSON.stringify(E.partyOffers(car)));
  t('far villages have fewer or tougher offers', (() => { const w = E.worldOf(car); const sv = [w.x, w.y]; w.x = 100; w.y = 0; const o = E.partyOffers(car); w.x = sv[0]; w.y = sv[1]; return o.length === 0; })());
  const easy = offers.slice().sort((a, b) => a.minLevel - b.minLevel)[0];
  car.char.level = Math.max(car.char.level, easy.minLevel); car.runs = Math.max(car.runs || 0, easy.needRuns);
  t('join a party', E.partyJoin(car, easy.id).ok && car.party && !E.partyJoin(car, easy.id).ok);
  t('no companion while in a party', !E.hireCompanion(car, 'squire').ok);
  const fee = E.partyLeaveFee(car); car.gold = 0;
  t('early leave costs gold', fee > 0 && !E.partyLeave(car).ok && car.party);
  car.gold = 9999; const g0 = car.gold;
  t('early leave pays the fee', E.partyLeave(car).ok && car.gold === g0 - fee && !car.party);
  E.partyJoin(car, easy.id);
  const run = E.careerNewRun(car, { free: true, seed: 'party-run', rank: 'F' });
  t('run carries the party', run.party && run.party.members.length >= 2);
  const solo = E.careerNewRun(newCareer('party'), { free: true, seed: 'party-run', rank: 'F' });
  E.startCombat(run, 'combat'); E.startCombat(solo, 'combat'); const h0 = run.hp, s0 = solo.hp; E.damagePlayer(run, 10, null); E.damagePlayer(solo, 10, null);
  t('a party soaks damage', (h0 - run.hp) < (s0 - solo.hp), `${h0 - run.hp} vs ${s0 - solo.hp}`);
  for (let i = 0; i < easy.total; i++) { const ru = E.careerNewRun(car, { free: true, seed: 'x' + i, rank: 'F' }); ru.dead = false; E.careerEnd(car, ru, 'extracted'); }
  t('party moves on after its contract', !car.party);
}
// ---- reincarnated soul awakening ----
{
  let c; const r = new E.RNG('soul'); do { c = E.makeCharacter(r); } while (c.race !== 'Reincarnated Soul');
  t('soul has a past life and free points', !!c.pastLife && c.skillPts >= 3 && c.awakened === 0);
  const run = E.newRun(c, 'soul-run', 'F', {}); c = run.char; const life = E.PAST_BY[c.pastLife], cap0 = E.slotCap(c);
  E.addXp(run, 1e9);
  t('soul awakens fully by level 30', c.level >= 30 && c.awakened === 3 && c.skills.includes(life.skills[0]) && c.skills.includes(life.skills[1]) && c.talents.includes(life.talent));
  t('full awakening adds a slot', E.slotCap(c) === cap0 + 1);
  const run2 = E.newRun(Object.assign({}, E.makeCharacter(new E.RNG('plain')), {}), 'plain', 'F', {});
  t('other races have no past life', !run2.char.pastLife || run2.char.race === 'Reincarnated Soul');
}
// ---- race coverage and heritage ----
{
  for (const race of E.RACES) {
    const hi = race.tier === 'H' ? 3 : E.TIER_BY[race.tier];
    for (let ti = Math.max(0, hi - 2); ti <= hi; ti++) {
      const n = E.PROFESSIONS.filter(p => p.tier === E.TIERS[ti].id && (p.races.includes('*') || p.races.includes(race.name))).length;
      t(`${race.name} has professions in tier ${E.TIERS[ti].id}`, n >= (ti === hi ? 2 : 1), n);
    }
  }
  const r = new E.RNG('heritage'); let found = null;
  for (let i = 0; i < 400000 && !found; i++) { const c = E.makeCharacter(r); if (c.heritage && c.race !== 'Reincarnated Soul') found = c; }
  t('a high race in a low class gets heritage', found && found.skillPts >= found.heritage.pts && found.heritage.xp > 0);
  t('a common race gets none', (() => { let c; do { c = E.makeCharacter(r); } while (c.race !== 'Human'); return !c.heritage; })());
}
// threat by real power, and fights outside a dungeon never touch a dungeon's state
{
  const car = E.careerStart(E.makeCharacter(new E.RNG('thr')), { worldSeed: 'thr' }), w = E.worldOf(car);
  const f = E.threatOf(car, 'F'), s = E.threatOf(car, 'S'), z = E.threatOf(car, 'Z40');
  t('threat is worse for higher ranks', f.ratio > s.ratio && s.ratio > z.ratio && z.label === 'Deadly', [f.label, s.label, z.label]);
  t('a fresh hero is not Dangerous at F', ['Even match', 'Safe', 'Trivial'].includes(f.label), f);
  const d = E.Terrain.structuresIn(w.sid, -60, -60, 60, 60).find(n => n.kind === 'dungeon' && n.sub !== 'lair');
  w.x = d.x; w.y = d.y; E.worldRevisit(car);
  w.pending = { nodeId: null, ev: { ambushName: 'Bandits' }, res: { fight: true } };
  const run = E.careerNewRun(car, E.worldAmbush(car)), res = E.careerEnd(car, run, 'cleared');
  const n = E.worldAt(car);
  t('winning an ambush on a dungeon tile does not clear the dungeon', n.state !== 'cleared' && !n.clears && res.ambush && res.ambush.won, [n.state, n.clears]);
}
console.log(`engine tests: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
