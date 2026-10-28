'use strict';
// Usage: node tools/sim.js rolls [N] | bot [N] | career [N]   (RP=1 picks career missions at random)
const E = require('./load.js');
const mode = process.argv[2] || 'rolls';
const N = parseInt(process.argv[3] || (mode === 'rolls' ? '300000' : '300'), 10);

function rolls() {
  const tiers = {}, races = {}, pot = {}, luck = { '1-5': 0, '6-9': 0, '10+': 0 };
  const rng = new E.RNG('sim-rolls');
  let misfit = 0;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const c = E.makeCharacter(rng);
    tiers[c.tier] = (tiers[c.tier] || 0) + 1; races[c.race] = (races[c.race] || 0) + 1; pot[c.potential] = (pot[c.potential] || 0) + 1;
    luck[c.luck >= 10 ? '10+' : c.luck >= 6 ? '6-9' : '1-5']++;
    if (c.misfit) misfit++;
    seen.add(c.prof);
  }
  const pct = o => Object.entries(o).map(([k, v]) => `${k}: ${(v / N * 100).toFixed(3)}%`).join('\n  ');
  console.log('Profession tier:\n  ' + pct(tiers)); console.log('Potential:\n  ' + pct(pot)); console.log('Luck:\n  ' + pct(luck));
  console.log('Misfit: ' + (misfit / N * 100).toFixed(2) + '%'); console.log(`Professions seen: ${seen.size}/${E.PROFESSIONS.length}`);
}

// ----- bot -----
const FOCUS = char => { const k = E.KINDS[E.PROF_BY[char.prof].kind]; return E.STATS.slice().sort((a, b) => k.focus[b] - k.focus[a])[0]; };
const gearScore = x => !x ? -1 : (x.atk || 0) * 2 + (x.def || 0) * 2 + (x.en || 0) + (x.stat ? x.stat.v * 2 : 0) + x.affixes.length * 2 + (x.up || 0) * 3 + (x.dur === 0 ? -10 : 0);
function manage(run) {
  while (run.char.points > 0) E.allocate(run, FOCUS(run.char));
  E.autoSkills(run.char);
  for (const it of run.inv.slice()) if (gearScore(it) > gearScore(run.equip[it.slot])) E.equipItem(run, it.id);
}
function useCons(run) {
  const hpFrac = run.hp / run.d.maxHp;
  if (hpFrac < 0.5 && (run.poison || run.bleed || run.burn) && run.cons.antidote) E.useConsumable(run, 'antidote');
  if (hpFrac < 0.45 && run.cons.bandage) E.useConsumable(run, 'bandage');
}
function fight(run) {
  let guard = 0;
  while (!run.combat.over && guard++ < 250) {
    const ids = E.loadout(run.char);
    let acted = true;
    while (acted && !run.combat.over) {
      acted = false;
      const enemies = E.living(run);
      if (run.hp < run.d.maxHp * 0.35 && run.combat.ap >= 1) {
        if (run.cons.bandage && E.useConsumable(run, 'bandage').ok) { acted = true; continue; }
        if (run.potions > 0 && E.usePotionInCombat(run).ok) { acted = true; continue; }
        if (ids.includes('heal') && !E.canUse(run, 'heal') && E.act(run, 'heal', 0).ok) { acted = true; continue; }
      }
      if (enemies.length >= 2 && run.cons.fire_bomb && run.combat.ap >= 1 && E.useConsumable(run, 'fire_bomb').ok) { acted = true; continue; }
      const order = ids.filter(i => !['guard', 'attack', 'heal', 'fortify', 'arcaneguard', 'ironskin', 'bulwark', 'manashield', 'runeward', 'counter', 'divineshield', 'unbreakable', 'smokebomb', 'secondwind', 'focus', 'meditate', 'rally', 'warcry', 'shadowstep', 'blessing', 'purify', 'revive', 'arcanesurge'].includes(i))
        .sort((a, b) => (E.SKILLS[b].mult || 0) * (E.SKILLS[b].hits || 1) * (E.SKILLS[b].type === 'aoe' ? enemies.length : 1) - (E.SKILLS[a].mult || 0) * (E.SKILLS[a].hits || 1) * (E.SKILLS[a].type === 'aoe' ? enemies.length : 1));
      const t = enemies.slice().sort((a, b) => a.hp - b.hp)[0];
      const ti = run.combat.enemies.indexOf(t);
      for (const id of order.concat(['attack'])) {
        if (!E.canUse(run, id)) { const r = E.act(run, id, ti); acted = r.ok; break; }
      }
    }
    if (!run.combat.over) E.endTurn(run);
  }
  return run.combat.won;
}
function resolveEvent(run, ev) {
  const stats = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'DEX', 'LUK'];
  let best = 0, bs = -1;
  ev.choices.forEach((c, i) => {
    if (E.choiceBlocked(run, c)) return;
    let sc = c.check ? 3 + run.d.st[c.check.stat] / 6 : (c.out && c.out.rep < 0 ? 0 : 2);
    if (c.cost && c.cost.hpPct) sc -= 1;
    if (sc > bs) { bs = sc; best = i; }
  });
  void stats;
  return E.resolveChoice(run, ev, best);
}
function playRun(run) {
  const rows = run.dungeon.rows;
  const mission = run.mission;
  for (let row = 0; row <= rows.length; row++) {
    run.row = row;
    manage(run);
    useCons(run);
    if (run.hp < run.d.maxHp * 0.5) while (E.usePotion(run) && run.hp < run.d.maxHp * 0.7);
    let node = { type: 'boss' };
    if (row < rows.length) {
      const opts = rows[row];
      const hpLow = run.hp < run.d.maxHp * 0.6;
      let order = hpLow ? ['rest', 'shrine', 'treasure', 'camp', 'puzzle', 'combat'] : ['missing', 'relic', 'secret', 'treasure', 'event', 'puzzle', 'combat', 'trap', 'camp', 'shrine', 'elite', 'merchant'];
      if (mission && mission.type === 'hunt') order = ['combat'].concat(order);
      let pick = null;
      for (const p of order) { pick = opts.find(o => o.type === p); if (pick) break; }
      node = pick || opts[0];
    }
    E.enterNode(run, node);
    const t = node.type;
    let fightType = null;
    if (t === 'treasure') E.treasureChest(run);
    else if (t === 'shrine') E.shrinePray(run);
    else if (t === 'rest') E.restRoom(run);
    else if (t === 'camp') E.campSearch(run);
    else if (t === 'merchant') { E.buyPotion(run); }
    else if (t === 'event' || t === 'trap' || t === 'puzzle') { const r = resolveEvent(run, E.pickEvent(run, t)); fightType = r.fight; }
    else if (t === 'missing') { const r = resolveEvent(run, E.missingEvent()); fightType = r.fight; }
    else fightType = t;
    if (fightType) {
      const ft = fightType;
      E.startCombat(run, ft);
      const won = fight(run);
      if (run.dead || !won) return { win: false, row, run };
      if (ft === 'secret') E.claimSecret(run);
      if (ft === 'relic') E.claimRelic(run);
    }
    if (t === 'boss') break;
    E.advanceRoom(run);
  }
  return { win: true, row: rows.length, run };
}

function bot() {
  const rng = new E.RNG('bot');
  const byTier = {}, byKind = {};
  for (const rank of ['F', 'E', 'D']) {
    let wins = 0, rooms = 0; byTier[rank] = {};
    for (let i = 0; i < N; i++) {
      const c = E.makeCharacter(rng);
      const run = E.newRun(c, 'd' + i, rank, {});
      if (process.env.PARTY) run.party = { name: 'Bot party', members: [{ id: 'squire', name: 'A' }, { id: 'cleric', name: 'B' }], lootMul: 0.75, xpMul: 0.8, shield: 0.1, pw: 1 + 0.12 * ['F', 'E', 'D'].indexOf(rank) };
      const r = playRun(run);
      wins += r.win ? 1 : 0; rooms += r.row;
      const t = byTier[rank][c.tier] = byTier[rank][c.tier] || { n: 0, w: 0 };
      t.n++; t.w += r.win ? 1 : 0;
      const kd = byKind[rank] = byKind[rank] || {}, kk = kd[E.PROF_BY[c.prof].kind] = kd[E.PROF_BY[c.prof].kind] || { n: 0, w: 0 };
      kk.n++; kk.w += r.win ? 1 : 0;
    }
    console.log('  by kind: ' + Object.entries(byKind[rank]).map(([k, v]) => `${k} ${(v.w / v.n * 100).toFixed(0)}%`).join(' | '));
    console.log(`Rank ${rank}: win ${(wins / N * 100).toFixed(1)}%  avg rows reached ${(rooms / N).toFixed(2)}`);
    console.log('  by tier: ' + Object.entries(byTier[rank]).map(([k, v]) => `${k} ${(v.w / v.n * 100).toFixed(0)}% (n=${v.n})`).join(' | '));
  }
}

function careerSim() {
  const checkpoints = [5, 10, 20, 40, 80, 150];
  const rngc = new E.RNG('career-bot');
  const agg = {}; checkpoints.forEach(c => { agg[c] = { lvl: 0, rank: {}, deaths: 0, gold: 0, mis: 0 }; });
  const delta = {}; const misTypes = {}; const misTry = {};
  const C = Math.min(N, 120);
  for (let i = 0; i < C; i++) {
    const career = E.careerStart(E.makeCharacter(rngc));
    let misDone = 0;
    for (let n = 1; n <= 150; n++) {
      const hub = E.careerHub(career);
      manage(hub); career.gold = hub.gold;
      // services
      E.smithRepairAll(career);
      for (const slot of E.SLOTS) { const it = career.equip[slot]; if (it && it.dur > 0 && career.gold > 200) { const r = E.smithUpgrade(career, it.id); void r; } }
      for (let k = 0; k < 3; k++) E.buyCareerCons(career, 'potion');
      if (career.gold > 150) { E.buyCareerCons(career, 'bandage'); E.buyCareerCons(career, 'antidote'); E.buyCareerCons(career, 'fire_bomb'); }
      for (const inj of (career.char.injuries || []).slice()) E.cureInjury(career, inj.id);
      const board = E.careerBoard(career);
      const lvl = career.char.level;
      const ok = board.filter(m => m.rec <= lvl + 1);
      const mission = process.env.RP ? board[Math.floor(rngc.next() * board.length)]
        : ((ok.sort((a, b) => b.rec - a.rec || (a.type === 'clear' ? -1 : 1))[0]) || board.slice().sort((a, b) => a.rec - b.rec)[0]);
      const run = E.careerNewRun(career, mission);
      const res = playRun(run);
      const settled = E.careerEnd(career, run, res.win ? 'cleared' : 'dead');
      misTry[mission.type] = (misTry[mission.type] || 0) + 1;
      if (settled.mission && settled.mission.done) { misDone++; misTypes[mission.type] = (misTypes[mission.type] || 0) + 1; }
      const d = Math.max(-12, Math.min(12, Math.round((lvl - mission.rec) / 3) * 3)); const b = (delta[d] = delta[d] || { n: 0, w: 0 }); b.n++; b.w += res.win ? 1 : 0;
      if (checkpoints.includes(n)) {
        const a = agg[n]; a.lvl += career.char.level; a.deaths += career.deaths; a.gold += career.gold; a.mis += misDone;
        const r = E.careerRank(career); a.rank[r] = (a.rank[r] || 0) + 1;
      }
    }
  }
  for (const c of checkpoints) {
    const a = agg[c];
    console.log(`after ${c} expeditions: avg level ${(a.lvl / C).toFixed(1)}, avg deaths ${(a.deaths / C).toFixed(1)}, missions done ${(a.mis / C).toFixed(1)}, gold ${(a.gold / C).toFixed(0)}, rank ${JSON.stringify(a.rank)}`);
  }
  console.log('win rate by (level - recommended):');
  Object.keys(delta).map(Number).sort((a, b) => a - b).forEach(d => console.log(`  ${d >= 0 ? '+' : ''}${d}: ${(delta[d].w / delta[d].n * 100).toFixed(0)}% (n=${delta[d].n})`));
  console.log('missions completed by type: ' + JSON.stringify(misTypes));
  console.log('completion rate by type: ' + Object.keys(misTry).map(k => `${k} ${(100 * (misTypes[k] || 0) / misTry[k]).toFixed(0)}% (${misTry[k]})`).join(', '));
}

function worldSim() {
  const rngc = new E.RNG('world-bot');
  const C = Math.min(N, 30), STEPS = 140;
  const agg = { lvl: 0, deaths: 0, found: 0, poi: 0, dungeons: 0, firstClears: 0, day: 0, steps: 0, tiles: 0, errors: 0, lvlAt: {}, farthest: 0, stuck: 0 };
  for (let i = 0; i < C; i++) {
    const career = E.careerStart(E.makeCharacter(rngc), { worldSeed: 'bot-' + i });
    const w = E.worldOf(career);
    let poiDone = 0, firsts = 0, far = 0;
    const walk = (x, y) => {
      const path = E.worldPathTo(career, x, y);
      if (!path || !path.length) return false;
      for (const p of path) {
        const r = E.worldStep(career, p.x - w.x, p.y - w.y);
        far = Math.max(far, Math.hypot(w.x, w.y));
        if (!r.ok || r.pending || r.arrived) return true;
      }
      return true;
    };
    for (let step = 1; step <= STEPS; step++) {
      try {
        const hub = E.careerHub(career); manage(hub); career.gold = hub.gold;
        E.smithRepairAll(career);
        for (let k = 0; k < 3; k++) E.buyCareerCons(career, 'potion');
        for (const inj of (career.char.injuries || []).slice()) E.cureInjury(career, inj.id);
        if (w.pending) {
          if (!w.pending.res) { const n = w.pending.ev.choices.length; let ok = false; for (let c = 0; c < n && !ok; c++) ok = E.worldChoose(career, c).ok; if (ok) poiDone++; }
          E.worldDismiss(career); continue;
        }
        const lvl = career.char.level;
        const near = E.worldKnown(career, 60).filter(n => !(w.x === n.x && w.y === n.y));
        const here = E.worldAt(career);
        if (here && here.kind === 'dungeon' && !E.worldNodeLocked(career, here) && lvl >= E.RANKS[here.rank].rec - 2) {
          const m = E.worldEnter(career, here.id);
          const run = E.careerNewRun(career, m);
          const res = playRun(run);
          const settled = E.careerEnd(career, run, res.win ? 'cleared' : 'dead');
          agg.dungeons += res.win ? 1 : 0; if (settled.firstClear) firsts++;
          continue;
        }
        const fresh = near.filter(n => n.kind === 'poi' && (!n.cd || w.day >= n.cd) && !w.disc.node[n.id]);
        const dun = near.filter(n => n.kind === 'dungeon' && !E.worldNodeLocked(career, n) && lvl >= E.RANKS[n.rank].rec - 2).sort((a, b) => ((a.clears ? 1 : 0) - (b.clears ? 1 : 0)) || (E.RANKS[b.rank].rec - E.RANKS[a.rank].rec));
        let target = fresh[0] && step % 3 !== 0 ? fresh[0] : (dun[0] || fresh[0]);
        if (!target) { const again = near.filter(n => n.kind === 'poi' && (!n.cd || w.day >= n.cd)); target = again[0]; }
        if (target && walk(target.x, target.y)) continue;
        const r = E.worldScout(career); void r;
        // wander outward
        let moved = false;
        for (let k = 0; k < 6 && !moved; k++) {
          const ang = rngc.next() * Math.PI * 2, rad = 10 + rngc.next() * 14;
          moved = walk(Math.round(w.x + Math.cos(ang) * rad), Math.round(w.y + Math.sin(ang) * rad));
        }
        if (!moved) agg.stuck++;
      } catch (e) { agg.errors++; if (agg.errors < 4) console.log('ERR', e.stack.split('\n').slice(0, 4).join(' | ')); break; }
      if ([40, 80, 140].includes(step)) agg.lvlAt[step] = (agg.lvlAt[step] || 0) + career.char.level;
    }
    agg.lvl += career.char.level; agg.deaths += career.deaths; agg.poi += poiDone; agg.firstClears += firsts; agg.day += w.day; agg.steps += w.steps; agg.farthest += far;
    agg.found += Object.keys(w.st).length;
  }
  console.log(`world bot (${C} careers x ${STEPS} steps): avg level ${(agg.lvl / C).toFixed(1)}, deaths ${(agg.deaths / C).toFixed(1)}, days ${(agg.day / C).toFixed(0)}, steps walked ${(agg.steps / C).toFixed(0)}, farthest ${(agg.farthest / C).toFixed(0)} tiles`);
  console.log(`  places touched ${(agg.found / C).toFixed(1)}, encounters ${(agg.poi / C).toFixed(1)}, dungeon clears ${(agg.dungeons / C).toFixed(1)}, first clears ${(agg.firstClears / C).toFixed(1)}, stuck ${agg.stuck}, errors ${agg.errors}`);
  console.log('  level at step: ' + Object.keys(agg.lvlAt).map(k => `${k}: ${(agg.lvlAt[k] / C).toFixed(1)}`).join(', '));
}

if (mode === 'rolls') rolls(); else if (mode === 'bot') bot(); else if (mode === 'world') worldSim(); else careerSim();
