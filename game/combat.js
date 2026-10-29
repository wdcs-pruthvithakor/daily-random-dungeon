'use strict';
/* Daily Random Dungeon - combat: enemies, skills, consumables, companions, turn flow. */
(function (root) {
const E = root.Engine;
const D = root.DATA;
const { RANKS, RACE_BY, PROF_BY, KINDS, TIER_BY, STATS, hasTalent, say, refresh, addXp, masteryBonus, genItem } = E;

const INTENT_INFO = {
  attack: { label: 'Attack', mult: 1 }, heavy: { label: 'Heavy blow', mult: 1.8 }, flurry: { label: 'Flurry (2 hits)', mult: 0.6, hits: 2 },
  venom: { label: 'Venom strike', mult: 0.7 }, slam: { label: 'Slam', mult: 2.2 }, guard: { label: 'Bracing (takes half damage)', mult: 0 },
  bleed: { label: 'Rending claws', mult: 0.7 }, burn: { label: 'Fire blast', mult: 0.8 }, curse: { label: 'Curse', mult: 0.5 }, drain: { label: 'Life drain', mult: 0.8 },
  stagger: { label: 'Staggering blow', mult: 0.9 }, shield: { label: 'Raising a shield', mult: 0 }, summon: { label: 'Summoning help', mult: 0 },
};
const MUTS = {
  enraged: { name: 'Enraged', atk: 1.4, def: 0.7 },
  armored: { name: 'Armored', def: 2, hp: 1.2 },
  venomous: { name: 'Venomous', intent: { venom: 30 } },
  swift: { name: 'Swift', intent: { flurry: 40 } },
  regenerating: { name: 'Regenerating', regen: 0.06 },
  ancient: { name: 'Ancient', hp: 1.3, atk: 1.2, xp: 1.5 },
  vampiric: { name: 'Vampiric', intent: { drain: 35 } },
  cursed: { name: 'Cursed', intent: { curse: 35 } },
};

function anomaly(run, id) { return run.dungeon && run.dungeon.anomaly === id; }
function living(run) { return run.combat.enemies.filter(e => e.hp > 0); }
function healHp(run, n) {
  if (anomaly(run, 'weak_healing')) n *= 0.5;
  run.hp = Math.min(run.d.maxHp, run.hp + Math.round(n));
}

// ---------- Enemies ----------
function makeEnemy(tpl, run, opts) {
  const o = opts || {};
  const career = !!run.career, rk = RANKS[run.rankId];
  const rankScale = career ? rk.cs : rk.scale, exp = career ? 0.75 : 0.5;
  const dread = anomaly(run, 'rising_dread') ? 1.4 : 1;
  let hpS = rankScale * (1 + 0.15 * dread * run.heat);
  let atkS = (1 + 0.1 * dread * run.heat) * Math.pow(rankScale, exp);
  let xpM = 1, goldM = 1;
  if (anomaly(run, 'bloodmoon')) { atkS *= 1.15; xpM = 1.3; goldM = 1.3; }
  if (anomaly(run, 'fortune_surge')) hpS *= 1.1;
  const gold = tpl.gold || [10, 20];
  const e = {
    key: tpl.key, base: tpl.name, name: tpl.name, glyph: tpl.glyph, hp: tpl.hp * hpS, atk: tpl.atk * atkS, def: tpl.def * Math.pow(rankScale, exp),
    xp: tpl.xp * (1 + 0.1 * run.heat) * (career ? rk.xpMul : rankScale) * xpM,
    gold: run.loot.int(gold[0], gold[1]) * rk.rewards * (1 + 0.1 * run.heat) * goldM,
    intents: Object.assign({}, tpl.intents), muts: [], regen: 0, boss: !!o.boss, elite: !!o.elite, enraged: false, shield: 0,
    status: { burn: 0, poison: 0, stun: 0, chill: 0, bleed: 0, weaken: 0 }, guarding: false, intent: 'attack',
    drops: tpl.drops || [], summons: tpl.summons || null, phases: tpl.phases || null, phaseDone: [], counted: false,
  };
  for (const m of (o.muts || [])) {
    const M = MUTS[m];
    e.muts.push(M.name);
    if (M.atk) e.atk *= M.atk;
    if (M.def) e.def *= M.def;
    if (M.hp) e.hp *= M.hp;
    if (M.xp) e.xp *= M.xp;
    if (M.regen) e.regen = M.regen;
    if (M.intent) for (const k in M.intent) e.intents[k] = (e.intents[k] || 0) + M.intent[k];
  }
  if (o.elite) { e.hp *= 1.5; e.xp *= 2.2; e.gold *= 2; }
  if (o.boss) { e.xp *= 4; e.gold *= 4; }
  if (o.hpMult) e.hp *= o.hpMult;
  e.hp = Math.max(1, Math.round(e.hp)); e.maxHp = e.hp; e.atk = Math.round(e.atk * 10) / 10; e.def = Math.round(e.def * 10) / 10;
  if (e.muts.length) e.name = e.muts.join(' ') + ' ' + e.name;
  if (o.prefix) e.name = o.prefix + ' ' + e.name;
  if (o.minion) { e.status.stun = 1; e.xp *= 0.5; e.gold *= 0.3; e.minion = true; e.drops = []; }
  return e;
}

// Unique boss mechanics for career map dungeons.
const WARDENS = {
  bulwark: { name: 'Bulwark', icon: '🛡️', desc: 'Starts shielded (35% of its HP) and renews a shield every 3 turns.' },
  swarm: { name: 'Swarm Mother', icon: '🐝', desc: 'Calls a minion every 2 turns. Kill adds or burst the boss.' },
  frenzy: { name: 'Frenzied', icon: '💢', desc: 'Its attack grows 10% every turn. End the fight quickly.' },
  mirror: { name: 'Mirrored', icon: '🪞', desc: 'Reflects 20% of the damage you deal back at you (never lethal).' },
  hex: { name: 'Hexbound', icon: '🔮', desc: 'Curses you every other turn. Willpower helps you resist.' },
  tide: { name: 'Tidal', icon: '🌊', desc: 'Heals 6% of its max HP every turn. Burst it down.' },
};
function wardenTick(run, e) {
  const c = run.combat, w = e.warden;
  if (w === 'tide') e.hp = Math.min(e.maxHp, e.hp + Math.ceil(e.maxHp * 0.06));
  else if (w === 'frenzy') { e.atk = Math.round(e.atk * 1.1 * 10) / 10; say(run, `${e.name} grows more frenzied.`); }
  else if (w === 'bulwark' && c.turn % 3 === 0) { e.shield += Math.round(e.maxHp * 0.15); say(run, `${e.name} renews its shield.`); }
  else if (w === 'swarm' && c.turn % 2 === 0) summonEnemy(run, e.summons || run.dungeon.theme.pool[0]);
  else if (w === 'hex' && c.turn % 2 === 0) {
    if (run.rng.chance(run.d.wilRes)) say(run, 'You throw off the hex.'); else { run.weak = Math.max(run.weak, 2); say(run, `${e.name} hexes you.`); }
  }
}
function duelParty(run) {
  const d = run.duel, out = [];
  for (const m of d.members) {
    const e = makeEnemy(D.DUEL_ROLES[m.role], run, { hpMult: (d.hpMult || 1) * (d.legendary ? 1.3 : 1) });
    e.name = `${m.name} the ${D.DUEL_ROLES[m.role].name}`; e.drops = [];
    if (d.legendary) { e.atk = Math.round(e.atk * 1.15 * 10) / 10; e.xp *= 1.6; e.gold *= 1.6; }
    out.push(e);
  }
  return out;
}
function buildEncounter(run, type) {
  if (run.duel && type === 'boss') return duelParty(run);
  const th = run.dungeon.theme, rng = run.rng;
  const tpls = th.pool.map(k => D.MONSTERS[k]);
  if (type === 'boss') {
    const corrupted = run.dungeon.corrupted;
    const t = Object.assign({}, th.boss, { gold: [20, 30], xp: 20, atk: th.boss.atk * 0.88 });
    t.intents = Object.assign({}, th.boss.intents);
    if (corrupted) t.intents.venom = (t.intents.venom || 0) + 30;
    const boss = makeEnemy(t, run, { boss: true, hpMult: (corrupted ? 1.3 : 1) * 0.78, prefix: corrupted ? 'Corrupted' : '' });
    if (run.dungeon.warden && WARDENS[run.dungeon.warden]) {
      boss.warden = run.dungeon.warden;
      if (boss.warden === 'bulwark') boss.shield += Math.round(boss.maxHp * 0.35);
    }
    return [boss];
  }
  const mutKeys = Object.keys(MUTS);
  if (type === 'elite' || type === 'secret' || type === 'relic' || type === 'elite_sneak') {
    const m = [rng.pick(mutKeys)];
    if (run.heat >= 4 && rng.chance(0.35)) { const m2 = rng.pick(mutKeys); if (!m.includes(m2)) m.push(m2); }
    const out = [makeEnemy(rng.pick(tpls), run, { elite: true, muts: m })];
    const ob0 = run.mission && run.mission.objective;
    if (ob0 && ob0.kind === 'bounty' && type === 'elite' && !run.mprog.bountySeen) {
      run.mprog.bountySeen = true;
      const b = out[0]; b.bountyTarget = true; b.name = ob0.target; b.hp = b.maxHp = Math.round(b.hp * 1.25); b.xp *= 1.5; b.gold *= 2;
    }
    if (type !== 'elite_sneak' && rng.chance(0.5)) out.push(makeEnemy(rng.pick(tpls), run, {}));
    return out;
  }
  let n = Math.min(3, 1 + rng.int(0, 1) + (run.heat >= 2 ? 1 : 0) - (run.heat >= 5 && rng.chance(0.3) ? 1 : 0));
  if (type === 'ambush') n = Math.min(3, n + 1);
  const out = [];
  // hunt contracts: the target monster turns up often enough to finish the job
  const ob = run.mission && run.mission.objective;
  const huntKey = ob && ob.kind === 'hunt' ? th.pool.find(k => D.MONSTERS[k].name === ob.target) : null;
  for (let i = 0; i < Math.max(1, n); i++) {
    const rare = rng.chance(0.07 + run.heat * 0.01);
    const tpl = huntKey && rng.chance(i === 0 ? 0.92 : 0.5) ? D.MONSTERS[huntKey] : rng.pick(tpls);
    out.push(makeEnemy(tpl, run, rare ? { muts: [rng.pick(mutKeys)] } : {}));
  }
  return out;
}

function rollIntents(run) {
  for (const e of run.combat.enemies) {
    if (e.hp <= 0) continue;
    e.guarding = false;
    e.intent = run.rng.weighted(Object.keys(e.intents), k => e.intents[k]);
    if (e.intent === 'guard') e.guarding = true;
    if (e.intent === 'shield') { e.shield = Math.max(e.shield, Math.round(e.maxHp * 0.2)); }
    if (e.intent === 'summon' && living(run).length >= 4) e.intent = 'attack';
  }
}

function startCombat(run, type) {
  run.combat = { type, enemies: buildEncounter(run, type), turn: 1, ap: run.d.shaken ? 2 : 3, used: {}, over: false, won: false, target: 0, summary: null, firstHit: type === 'elite_sneak' };
  run.block = 0; run.counter = 0; run.stagger = false; run.parry = null;
  rollIntents(run);
  run.seenMons = run.seenMons || {};
  run.combat.enemies.forEach(e => { run.seenMons[e.base] = 1; });
  say(run, `Encounter: ${run.combat.enemies.map(e => e.name).join(', ')}.`);
  return run.combat;
}

function previewDamage(run, e) {
  const info = INTENT_INFO[e.intent];
  if (!info || !info.mult) return 0;
  let dmg = e.atk * info.mult * (1 - run.d.def / (run.d.def + 20));
  if (e.status.chill > 0) dmg *= 0.6;
  if (e.status.weaken > 0) dmg *= 0.75;
  dmg *= (1 - run.block) * (1 - (run.ward || 0));
  return Math.max(1, Math.round(dmg)) * (info.hits || 1);
}

function skillCost(run, id) {
  const s = E.effSkill(run.char, id);
  if (!s.en) return 0;
  return Math.max(1, s.en - (hasTalent(run.char, 'manaaffinity') ? 1 : 0) + (anomaly(run, 'silence') ? 1 : 0));
}
function canUse(run, id) {
  const c = run.combat, s = E.effSkill(run.char, id);
  if (!c || c.over || run.dead) return 'No combat';
  if (c.ap < s.ap) return 'Not enough AP';
  if (run.en < skillCost(run, id)) return 'Not enough ' + run.d.resName.toLowerCase();
  if (s.once && c.used[id]) return 'Already used this fight';
  if (s.hpCost && run.hp <= run.d.maxHp * s.hpCost + 1) return 'Too wounded';
  return null;
}
function applyStatus(e, st) { for (const k in st) e.status[k] = Math.max(e.status[k], st[k]); }

// ---------- Damage ----------
function absorb(e, dmg) {
  if (e.shield > 0) { const a = Math.min(e.shield, dmg); e.shield -= a; dmg -= a; }
  return dmg;
}
function dealHit(run, e, mult, opts) {
  const o = opts || {}, d = run.d, c = run.char;
  let raw = (run.curPow || d.power) * mult * (0.9 + run.rng.next() * 0.2) * d.dmgMult * (run.curHeavy || 1);
  const crit = o.forceCrit || run.rng.chance(d.crit);
  if (crit) raw *= d.critDmg;
  if (hasTalent(c, 'predator') && e.hp / e.maxHp < 0.4) raw *= 1.25;
  if (RACE_BY[c.race].fx.rage && run.hp / d.maxHp < 0.3) raw *= 1.3;
  if (run.blessing) raw *= 1.15;
  if (run.elixir) raw *= 1.25;
  if (run.buffs && run.buffs.dmg) raw *= 1 + run.buffs.dmg.pct;
  if (run.weak > 0) raw *= 0.75;
  if (o.execute && e.hp / e.maxHp < o.execute.below) raw *= 1 + o.execute.bonus;
  if (run.combat.firstHit) { raw *= 2; run.combat.firstHit = false; }
  const def = o.pierce ? 0 : e.def;
  let dmg = raw * (1 - def / (def + 20));
  if (e.guarding) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg));
  const total = dmg;
  dmg = absorb(e, dmg);
  e.hp -= dmg;
  if (d.lifesteal) healHp(run, Math.max(1, total * d.lifesteal));
  if (e.warden === 'mirror' && total > 0) { const rf = Math.round(total * 0.2); run.hp = Math.max(1, run.hp - rf); if (rf) say(run, `${e.name} reflects ${rf} damage back at you.`); }
  if (o.drain) healHp(run, total * o.drain);
  if (e.hp > 0) {
    if (d.burn && run.rng.chance(d.burn)) e.status.burn = Math.max(e.status.burn, 3);
    if (d.poison && run.rng.chance(d.poison)) e.status.poison = Math.max(e.status.poison, 4);
    if (d.chill && run.rng.chance(d.chill)) e.status.chill = Math.max(e.status.chill, 2);
  }
  checkPhases(run, e);
  say(run, `You hit ${e.name} for ${total}${crit ? ' (crit!)' : ''}.`);
  return total;
}
// Damage that does not crit, proc or use buffs: allies, spirits, bombs.
function fixedHit(run, e, mult, label, status) {
  let raw = run.d.power * mult * (0.9 + run.rng.next() * 0.2);
  let dmg = Math.max(1, Math.round(raw * (1 - e.def / (e.def + 20)) * (e.guarding ? 0.5 : 1)));
  dmg = absorb(e, dmg);
  e.hp -= dmg;
  if (status && e.hp > 0) applyStatus(e, status);
  checkPhases(run, e);
  say(run, `${label} hits ${e.name} for ${dmg}.`);
}
function summonEnemy(run, key, label) {
  const c = run.combat;
  if (!c || c.enemies.filter(x => x.hp > 0).length >= 5) return;
  const tpl = D.MONSTERS[key] || D.MONSTERS[run.dungeon.theme.pool[0]];
  const m = makeEnemy(tpl, run, { minion: true });
  m.intent = 'attack'; c.enemies.push(m);
  say(run, `${m.name} joins the fight!`);
}
function checkPhases(run, e) {
  if (!e.phases || e.hp <= 0) return;
  for (let i = 0; i < e.phases.length; i++) {
    const p = e.phases[i];
    if (e.phaseDone.includes(i) || e.hp / e.maxHp >= p.at) continue;
    e.phaseDone.push(i);
    e.enraged = true;
    say(run, p.say);
    if (p.atkMul) e.atk = Math.round(e.atk * p.atkMul * 10) / 10;
    if (p.shield) e.shield += Math.round(e.maxHp * p.shield);
    if (p.addIntents) for (const k in p.addIntents) e.intents[k] = (e.intents[k] || 0) + p.addIntents[k];
    if (p.summon) for (let n = 0; n < (p.count || 1); n++) summonEnemy(run, p.summon);
  }
}
function reap(run) {
  for (const e of run.combat.enemies) {
    if (e.hp <= 0 && !e.counted) {
      e.counted = true; run.stats.kills++;
      if (run.mprog) {
        const k = e.base; run.mprog.kills[k] = (run.mprog.kills[k] || 0) + 1;
        if (e.elite) run.mprog.elites++;
      }
      if (run.d.bloodthirst) healHp(run, run.d.maxHp * run.d.bloodthirst);
    }
  }
}
function applyBuff(run, b) {
  if (!b) return;
  if (!run.buffs) run.buffs = {};
  if (b.dmg) run.buffs.dmg = { pct: b.dmg, turns: b.turns };
  if (b.evade) run.buffs.evade = { pct: b.evade, turns: b.turns };
}
function playerEvade(run) { return Math.min(0.7, run.d.evade + (run.buffs && run.buffs.evade ? run.buffs.evade.pct : 0)); }

// ---------- Player actions ----------
// Which power a skill scales from: its own discipline's attack stat (so a Tome spell on a warrior uses INT).
function skillPower(run, s) {
  const d = run.d, myKind = PROF_BY[run.char.prof].kind;
  const native = s.kinds.find(k => KINDS[k]);
  if (!native || s.kinds.includes('all') || s.kinds.includes(myKind)) return d.power;
  const stats = KINDS[native].atk;
  return Math.max(...stats.map(x => d.powerFor[x]));
}
function act(run, id, targetIdx) {
  const s = E.effSkill(run.char, id);
  run.curPow = skillPower(run, s); run.curHeavy = s.ap >= 2 ? run.d.heavy : 1;
  try {
    const r = act0(run, id, targetIdx);
    const c = run.combat;
    if (r.ok && c && !c.over && id !== 'attack' && c.refTurn !== c.turn && run.rng.chance(run.d.agiRefund)) {
      c.refTurn = c.turn; c.ap += 1; say(run, 'Your reflexes give you a free action (+1 AP).');
    }
    return r;
  } finally { run.curPow = 0; run.curHeavy = 1; }
}
function act0(run, id, targetIdx) {
  const err = canUse(run, id);
  if (err) return { ok: false, msg: err };
  const c = run.combat, s = E.effSkill(run.char, id), d = run.d;
  let target = c.enemies[targetIdx];
  if (!target || target.hp <= 0) target = living(run)[0];
  c.ap -= s.ap;
  run.en -= skillCost(run, id);
  if (s.once) c.used[id] = true;
  run.char.mastery[id] = (run.char.mastery[id] || 0) + 1;
  const mb = 1 + masteryBonus(run.char, id);
  if (s.hpCost) { run.hp -= Math.round(d.maxHp * s.hpCost); say(run, `You spend ${Math.round(s.hpCost * 100)}% HP.`); }
  const heal = pct => { if (pct) healHp(run, d.maxHp * pct); };

  if (s.type === 'hit') {
    const hits = s.hits || 1;
    for (let h = 0; h < hits; h++) {
      const t = s.random ? run.rng.pick(living(run)) : (target.hp > 0 ? target : living(run)[0]);
      if (!t) break;
      let mult = (s.mult || 1) * mb, force = false;
      if (s.gamble) {
        const u = run.rng.next();
        mult = (0.4 + 3.6 * Math.pow(u, 1 / (1 + d.st.LUK * 0.08))) * mb;
        say(run, `The dice roll... x${mult.toFixed(1)}`);
      }
      if (s.combo && Object.values(t.status).some(v => v > 0)) { mult *= 1.5; force = true; }
      if (s.punish && s.punish.intents.includes(t.intent)) { mult *= s.punish.mult; say(run, `You exploit ${t.name}'s opening.`); }
      if (s.sunder && t.shield > 0) { t.shield = 0; say(run, `You shatter ${t.name}'s shield.`); }
      const readIntent = t.intent;
      dealHit(run, t, mult, { pierce: s.pierce, forceCrit: force, drain: s.drain, execute: s.execute });
      if (s.status && t.hp > 0) applyStatus(t, s.status);
      if (s.interrupt && t.hp > 0 && s.interrupt.includes(readIntent) && !(t.status.stun > 0)) { t.status.stun = 1; say(run, `You interrupt ${t.name}!`); }
      if (d.echo && t.hp > 0 && id !== 'attack' && run.rng.chance(d.echo)) { say(run, 'Echo!'); dealHit(run, t, mult * 0.5, { pierce: s.pierce }); }
    }
    heal(s.pct);
  } else if (s.type === 'aoe') {
    const hits = s.hits || 1;
    for (let h = 0; h < hits; h++) for (const e of living(run)) dealHit(run, e, s.mult * mb, { pierce: s.pierce });
    if (s.status) for (const e of living(run)) applyStatus(e, s.status);
    heal(s.pct);
  } else if (s.type === 'heal') {
    healHp(run, d.maxHp * s.pct * (1 + d.st.WIS * 0.01));
    if (s.cleanse) run.poison = run.bleed = run.burn = run.weak = 0;
    say(run, 'You heal.');
  } else if (s.type === 'guard') {
    run.block = Math.max(run.block, s.block);
    if (s.refund) run.en = Math.min(d.maxEn, run.en + s.refund);
    if (s.reflect) run.counter = Math.max(run.counter || 0, s.reflect);
    if (s.parry) run.parry = { list: s.parry, counter: s.counter || 1.2, used: false };
    if (s.allStatus) for (const e of living(run)) applyStatus(e, s.allStatus);
    applyBuff(run, s.buff); heal(s.pct);
    say(run, 'You brace yourself.');
  } else if (s.type === 'buff') {
    applyBuff(run, s.buff); heal(s.pct);
    if (s.gainAp) c.ap += s.gainAp;
    say(run, `${s.name}!`);
  } else if (s.type === 'cleanse') {
    run.poison = run.bleed = run.burn = run.weak = 0; heal(s.pct);
    say(run, 'You purge your afflictions.');
  } else if (s.type === 'summon') {
    run.spirit = { turns: s.spirit.turns, pct: s.spirit.pct * mb };
    say(run, 'A spirit answers your call.');
  } else if (s.type === 'focus') {
    if (s.gainAp) c.ap += s.gainAp;
    if (s.refund) run.en = Math.min(d.maxEn, run.en + s.refund);
    heal(s.pct);
    say(run, 'You gather yourself.');
  } else if (s.type === 'rewind') {
    healHp(run, d.maxHp * 0.35); c.ap += 2; say(run, 'Time folds back. You recover and gain 2 AP.');
  } else if (s.type === 'phase') {
    for (const e of living(run)) e.status.stun = Math.max(e.status.stun, 1);
    say(run, 'Reality skips. Every enemy is stunned.');
  }
  reap(run);
  if (living(run).length === 0) return finish(run);
  return { ok: true };
}

// ---------- Consumables ----------
function usePotion(run) {
  if (run.potions <= 0 || run.hp >= run.d.maxHp) return false;
  run.potions--;
  healHp(run, run.d.maxHp * 0.4 * run.d.potionMult);
  if (run.mprog) run.mprog.potions++;
  return true;
}
function usePotionInCombat(run) {
  const c = run.combat;
  if (!c || c.over || c.ap < 1 || run.potions <= 0 || run.hp >= run.d.maxHp) return { ok: false, msg: 'Cannot use a potion now' };
  c.ap--; usePotion(run); say(run, 'You drink a potion.');
  return { ok: true };
}
function useConsumable(run, id) {
  const def = D.CONSUMABLES[id], inCombat = !!(run.combat && !run.combat.over);
  if (!def || !run.cons[id]) return { ok: false, msg: 'None left' };
  if (inCombat && def.use === 'map') return { ok: false, msg: 'Cannot use that in combat' };
  if (!inCombat && def.use === 'combat') return { ok: false, msg: 'Only usable in combat' };
  if (inCombat && run.combat.ap < 1) return { ok: false, msg: 'Not enough AP' };
  const d = run.d;
  if (def.book) {
    if (run.char.skills.includes(def.book)) return { ok: false, msg: 'You already know that' };
    E.learnBook(run.char, def.book);
    say(run, `You learn ${D.SKILLS[def.book].name}.`);
  } else if (id === 'identify_scroll') {
    const it = run.inv.find(i => i.unknown && !i.revealed);
    if (!it) return { ok: false, msg: 'Nothing to identify' };
    it.revealed = true; say(run, it.cursed ? `${it.name} is cursed!` : `Identified: ${it.name}.`);
  } else if (id === 'antidote') {
    if (!run.poison && !run.bleed && !run.burn) return { ok: false, msg: 'You are not afflicted' };
    run.poison = run.bleed = run.burn = 0; say(run, 'You cure your afflictions.');
  } else if (id === 'bandage') {
    if (run.hp >= d.maxHp && !run.bleed) return { ok: false, msg: 'No need' };
    healHp(run, d.maxHp * 0.2); run.bleed = 0; say(run, 'You bandage your wounds.');
  } else if (id === 'mana_potion') {
    if (run.en >= d.maxEn) return { ok: false, msg: 'Energy is full' };
    run.en = Math.min(d.maxEn, run.en + Math.round(d.maxEn * 0.6)); say(run, 'You restore your energy.');
  } else if (id === 'strength_elixir') {
    if (run.elixir) return { ok: false, msg: 'Already active' };
    run.elixir = true; say(run, 'Strength surges through you.');
  } else if (id === 'ward_scroll') {
    if (run.ward) return { ok: false, msg: 'Already active' };
    run.ward = 0.15; say(run, 'A ward shimmers around you.');
  } else if (id === 'fire_bomb') {
    for (const e of living(run)) fixedHit(run, e, 1.2, 'The bomb', { burn: 3 });
  } else if (id === 'poison_flask') {
    for (const e of living(run)) fixedHit(run, e, 0.5, 'The flask', { poison: 4 });
  } else if (id === 'smoke_bomb') {
    for (const e of living(run)) e.status.stun = Math.max(e.status.stun, 1);
    say(run, 'Smoke fills the room. Enemies stumble.');
  } else if (id === 'haste_draught') {
    run.combat.ap += 1; say(run, 'You move faster.');
  } else if (id === 'escape_scroll') {
    run.cons[id]--; run.escaped = true;
    if (inCombat) { run.combat.over = true; run.combat.won = false; run.combat.fled = true; }
    say(run, 'You read the scroll and vanish.');
    return { ok: true, escaped: true };
  }
  run.cons[id]--;
  if (inCombat) {
    run.combat.ap -= (id === 'haste_draught' ? 0 : 1);
    reap(run);
    if (living(run).length === 0) return Object.assign({ ok: true }, finish(run));
  }
  return { ok: true };
}

// ---------- Rewards ----------
function lootCtx(run, extra) {
  return Object.assign({
    heat: run.heat, luck: run.d.st.LUK, relicSafe: !!RACE_BY[run.char.race].fx.relicSafe,
    rankMul: run.career ? Math.pow(RANKS[run.rankId].cs, 0.5) : 1, rarityBoost: anomaly(run, 'fortune_surge') ? 1.5 : 1,
  }, extra || {});
}
function addMat(run, id, n) {
  run.mats[id] = (run.mats[id] || 0) + n;
  if (run.mprog) run.mprog.mats[id] = (run.mprog.mats[id] || 0) + n;
}
function randomCons(run, rng) {
  const pool = Object.keys(D.CONSUMABLES).filter(k => !D.CONSUMABLES[k].book);
  const id = (rng || run.loot).pick(pool);
  run.cons[id] = (run.cons[id] || 0) + 1;
  return id;
}
function dropLoot(run, e, drops) {
  const ctx = lootCtx(run, { elite: e.elite || e.boss });
  if (e.boss) ctx.minRarity = 2;
  const chance = e.boss || e.elite ? 1 : 0.3 + run.d.st.LUK * 0.01;
  const share = run.party && !e.boss ? run.party.lootMul : 1;
  if (!e.minion && run.loot.chance(chance * share)) drops.push(genItem(run.loot, ctx));
  if (run.loot.chance(e.boss ? 1 : 0.12)) drops.push('potion');
  for (const m of e.drops) {
    const p = (e.boss ? 0.9 : e.elite ? 0.8 : 0.3 + run.d.st.LUK * 0.01) * share;
    if (run.loot.chance(p)) { const n = e.boss ? 3 : e.elite ? 2 : 1; addMat(run, m, n); drops.push({ mat: m, n }); }
  }
  if (!e.minion && run.loot.chance(e.boss ? 0.8 : e.elite ? 0.4 : 0.1)) drops.push({ cons: randomCons(run) });
  // gather contracts: the target material reliably drops, so the objective is always reachable
  const ob = run.mission && run.mission.objective;
  if (ob && ob.kind === 'gather' && !e.minion && D.MATERIALS[ob.target] && run.loot.chance(0.85)) {
    const n = e.boss ? 3 : e.elite ? 2 : 1 + (run.loot.chance(0.4) ? 1 : 0);
    addMat(run, ob.target, n); drops.push({ mat: ob.target, n });
  }
}
function wearGear(run) {
  for (const slot in run.equip) {
    const it = run.equip[slot];
    if (!it || it.dur === undefined) continue;
    if (slot === 'weapon' || run.loot.chance(0.35)) it.dur = Math.max(0, it.dur - 1);
  }
}
function finish(run) {
  const c = run.combat;
  c.over = true; c.won = true;
  let xp = 0, gold = 0; const drops = [];
  for (const e of c.enemies) {
    xp += e.xp; gold += e.gold;
    dropLoot(run, e, drops);
    if (RACE_BY[run.char.race].fx.absorb && (e.elite || e.boss)) {
      const s = run.loot.pick(STATS); run.char.stats[s]++; say(run, `You absorb the foe. +1 ${s}.`);
    }
    if (e.boss) run.stats.bosses++;
    if (e.bountyTarget && run.mprog) run.mprog.bounty = true;
  }
  let reduced = false;
  if (run.career) {
    const over = run.char.level - (RANKS[run.rankId].rec + 5);
    if (over > 0) { xp *= Math.max(0.1, 1 - 0.2 * over); reduced = true; }
  }
  if (run.party) { xp *= run.party.xpMul; gold *= run.party.lootMul; }
  gold = Math.round(gold); xp = Math.round(xp);
  run.gold += gold;
  const items = [], mats = [], cons = [];
  for (const dr of drops) {
    if (dr === 'potion') run.potions++;
    else if (dr.mat) mats.push(dr);
    else if (dr.cons) cons.push(dr.cons);
    else { run.inv.push(dr); items.push(dr); }
  }
  const ups = addXp(run, xp);
  run.en = run.d.maxEn;
  healHp(run, run.d.maxHp * 0.05);
  run.poison = run.bleed = run.burn = 0; run.weak = 0; run.block = 0; run.counter = 0; run.spirit = null; run.buffs = {};
  wearGear(run);
  c.summary = { reduced, xp, gold, items, mats, cons, potions: drops.filter(d => d === 'potion').length, levelUps: ups, names: c.enemies.map(e => e.name) };
  say(run, `Victory! +${xp} XP, +${gold} gold.`);
  return { ok: true, won: true };
}

function damagePlayer(run, dmg, attacker) {
  if (run.party) dmg = Math.max(1, Math.round(dmg * (1 - partyShield(run))));
  run.hp -= dmg;
  if (attacker && run.d.thorns && attacker.hp > 0) {
    const r = Math.max(1, Math.round(dmg * run.d.thorns)); attacker.hp -= r; say(run, `${attacker.name} takes ${r} thorn damage.`); checkPhases(run, attacker);
  }
  if (attacker && run.counter && attacker.hp > 0) {
    const r = Math.max(1, Math.round(run.d.power * run.counter)); attacker.hp -= r; say(run, `You counter ${attacker.name} for ${r}.`); checkPhases(run, attacker);
  }
  if (run.hp <= 0) {
    if (hasTalent(run.char, 'secondwind') && !run.flags.secondwind) {
      run.flags.secondwind = true; run.hp = 1; say(run, 'Second Wind! You cling to life.'); return;
    }
    if (RACE_BY[run.char.race].fx.revive && !run.flags.revive) {
      run.flags.revive = true; run.hp = Math.round(run.d.maxHp * 0.5); say(run, 'A celestial light raises you from death.'); return;
    }
    if (!run.flags.laststand && run.rng.chance(run.d.lastStand)) {
      run.flags.laststand = true; run.hp = 1; say(run, 'Your will refuses to break. You survive with 1 HP.'); return;
    }
    run.dead = true; run.combat.over = true; run.combat.won = false;
    say(run, 'You have fallen.');
  }
}
function dotDamage(run) { return Math.max(1, Math.round(2 + run.heat * 0.6 + (run.career ? RANKS[run.rankId].cs * 0.2 : RANKS[run.rankId].scale * 0.1))); }

// ---------- Companion ----------
// A support hero makes the whole party hit harder, and a tank draws fire for them.
function partyAura(run) { const k = PROF_BY[run.char.prof].kind; return k === 'support' ? 1.5 : k === 'summon' ? 1.2 : 1; }
function partyShield(run) {
  if (!run.party) return 0;
  const k = PROF_BY[run.char.prof].kind;
  return Math.min(0.5, run.party.shield + (k === 'support' ? 0.1 : k === 'tank' ? 0.08 : 0));
}
function companionAct(run) {
  if (run.companion) companionTurn(run, run.companion, 1);
  if (run.party) for (const m of run.party.members) { if (!living(run).length) break; companionTurn(run, m, run.party.pw * partyAura(run) * 0.45); }
}
function companionTurn(run, comp, pwr) {
  const alive = living(run);
  if (!alive.length) return;
  const weakest = alive.slice().sort((a, b) => a.hp - b.hp)[0];
  const lvlMul = (1 + run.char.level * 0.02) * pwr;
  if (comp.id === 'squire') fixedHit(run, weakest, 0.5 * lvlMul, comp.name);
  else if (comp.id === 'cleric') { healHp(run, run.d.maxHp * 0.08 * Math.min(1.5, pwr)); say(run, `${comp.name} heals you.`); }
  else if (comp.id === 'hound') fixedHit(run, weakest, 0.35 * lvlMul, comp.name, { bleed: 3 });
  else if (comp.id === 'mage') for (const e of alive) fixedHit(run, e, 0.25 * lvlMul, comp.name);
  else if (comp.id === 'scout') fixedHit(run, weakest, (run.rng.chance(0.25) ? 0.9 : 0.45) * lvlMul, comp.name);
  else fixedHit(run, weakest, 0.4 * lvlMul, comp.name);
}

// ---------- Turn flow ----------
function endTurn(run) {
  const c = run.combat;
  if (c.over) return;
  if (run.spirit) {
    const alive = living(run);
    if (alive.length) fixedHit(run, run.rng.pick(alive), run.spirit.pct, 'Your spirit');
    run.spirit.turns--; if (run.spirit.turns <= 0) run.spirit = null;
  }
  companionAct(run);
  reap(run);
  if (living(run).length === 0) { finish(run); return; }
  // status ticks
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    const toxic = e.status.burn > 0 && e.status.poison > 0 ? 1.5 : 1;
    const tick = f => Math.max(2, Math.round(run.d.power * f * toxic * run.d.dotPot));
    if (e.status.burn > 0) { const dm = absorb(e, tick(0.3)); e.hp -= dm; e.status.burn--; say(run, `${e.name} burns for ${dm}${toxic > 1 ? ' (Toxic Blaze!)' : ''}.`); }
    if (e.hp > 0 && e.status.poison > 0) { const dm = absorb(e, tick(0.25)); e.hp -= dm; e.status.poison--; say(run, `${e.name} suffers poison for ${dm}.`); }
    if (e.hp > 0 && e.status.bleed > 0) { const dm = absorb(e, tick(0.2)); e.hp -= dm; e.status.bleed--; say(run, `${e.name} bleeds for ${dm}.`); }
    if (e.hp > 0 && e.regen) e.hp = Math.min(e.maxHp, e.hp + Math.ceil(e.maxHp * e.regen));
    if (e.hp > 0 && e.warden) wardenTick(run, e);
    checkPhases(run, e);
  }
  reap(run);
  if (living(run).length === 0) { finish(run); return; }
  // enemy phase
  for (const e of c.enemies.slice()) {
    if (e.hp <= 0 || run.dead) continue;
    if (e.status.stun > 0) { e.status.stun--; say(run, `${e.name} is stunned.`); continue; }
    const info = INTENT_INFO[e.intent];
    if (e.intent === 'summon') {
      const key = e.summons || run.dungeon.theme.pool[0];
      summonEnemy(run, key); continue;
    }
    if (!info || !info.mult) { say(run, `${e.name} ${e.intent === 'shield' ? 'raises a barrier' : 'braces'}.`); continue; }
    if (run.parry && !run.parry.used && run.parry.list.includes(e.intent)) {
      run.parry.used = true; say(run, `You parry ${e.name}'s ${info.label}!`);
      fixedHit(run, e, run.parry.counter, 'Your counter');
      if (e.hp <= 0) { reap(run); if (living(run).length === 0) { finish(run); return; } }
      continue;
    }
    const hits = info.hits || 1;
    for (let h = 0; h < hits && !run.dead; h++) {
      if (run.rng.chance(playerEvade(run))) { say(run, `You dodge ${e.name}'s attack.`); continue; }
      let dmg = e.atk * info.mult * (0.9 + run.rng.next() * 0.2) * (1 - run.d.def / (run.d.def + 20));
      if (e.status.chill > 0) dmg *= 0.6;
      if (e.status.weaken > 0) dmg *= 0.75;
      dmg *= (1 - run.block) * (1 - (run.ward || 0));
      dmg = Math.max(1, Math.round(dmg));
      say(run, `${e.name} uses ${info.label} for ${dmg}.`);
      damagePlayer(run, dmg, e);
      if (e.intent === 'drain') e.hp = Math.min(e.maxHp, e.hp + Math.round(dmg * 0.5));
    }
    if (run.dead) break;
    if (e.intent === 'venom') run.poison = Math.max(run.poison, 3);
    else if (e.intent === 'bleed') run.bleed = Math.max(run.bleed, 3);
    else if (e.intent === 'burn' && !RACE_BY[run.char.race].fx.burnImmune) run.burn = Math.max(run.burn, 3);
    else if (e.intent === 'curse') { if (run.rng.chance(run.d.wilRes)) say(run, 'You shrug off the curse.'); else run.weak = Math.max(run.weak, 2); }
    else if (e.intent === 'stagger') { if (run.rng.chance(run.d.wilRes)) say(run, 'You hold your footing.'); else run.stagger = true; }
    if (e.status.chill > 0) e.status.chill--;
    if (e.status.weaken > 0) e.status.weaken--;
  }
  reap(run);
  if (run.dead) return;
  if (living(run).length === 0) { finish(run); return; }
  // player afflictions
  const res = RACE_BY[run.char.race].fx.poisonRes ? 0.5 : 1;
  for (const [k, f, nm] of [['poison', res, 'Poison'], ['bleed', 1, 'Bleeding'], ['burn', 1, 'Burning']]) {
    if (run[k] > 0 && !run.dead) {
      const dm = Math.max(1, Math.round(dotDamage(run) * f * (1 - run.d.dotRes))); run[k]--;
      say(run, `${nm} deals ${dm}.`); damagePlayer(run, dm, null);
    }
  }
  if (run.dead) return;
  if (run.weak > 0) run.weak--;
  if (run.buffs) for (const k of Object.keys(run.buffs)) { run.buffs[k].turns--; if (run.buffs[k].turns <= 0) delete run.buffs[k]; }
  // new turn
  c.turn++; c.ap = run.stagger ? 2 : 3; run.stagger = false; run.block = 0; run.counter = 0; run.parry = null;
  run.en = Math.min(run.d.maxEn, run.en + Math.max(0, run.d.regen - (anomaly(run, 'mana_drought') ? 2 : 0)));
  rollIntents(run);
}

Object.assign(E, {
  INTENT_INFO, MUTS, WARDENS, anomaly, living, healHp, makeEnemy, buildEncounter, startCombat, previewDamage, skillCost, canUse, act, usePotion, usePotionInCombat, useConsumable,
  lootCtx, addMat, randomCons, dropLoot, finish, endTurn, summonEnemy, applyStatus, damagePlayer, livingEnemies: living,
});
})(typeof globalThis !== 'undefined' ? globalThis : this);
