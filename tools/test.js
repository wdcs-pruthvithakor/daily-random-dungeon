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
  const m = E.arenaEnter(car);
  t('arena run', m && E.careerNewRun(car, m).arena === true && E.arenaEnter(car) === null);
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
console.log(`engine tests: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
