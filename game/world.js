'use strict';
/* Daily Random Dungeon - world: dungeons, events, missions, runs, and the career hub services. */
(function (root) {
const E = root.Engine;
const D = root.DATA;
const { RNG, RANKS, CAREER_RANKS, RACE_BY, PROF_BY, STATS, hasTalent, say, refresh, genItem, genUnknownRelic, derive, starterGear, lootCtx, addXp, healHp, addMat, randomCons } = E;

const rankIndex = id => CAREER_RANKS.indexOf(id);
const SPECIAL = ['shrine', 'camp', 'event', 'trap', 'puzzle', 'treasure', 'secret', 'merchant', 'missing', 'relic'];

// ---------- Dungeon ----------
const ROW_EARLY = { combat: 48, treasure: 12, shrine: 8, camp: 10, event: 12, trap: 10 };
const ROW_MID = { combat: 34, elite: 12, treasure: 9, shrine: 7, rest: 7, merchant: 6, camp: 5, event: 10, trap: 7, puzzle: 7 };

function generateDungeon(seed, rankId, opts) {
  const o = opts || {};
  const rank = RANKS[rankId], ri = rankIndex(rankId);
  const rng = new RNG(seed + '|layout|' + rankId);
  const themes = D.THEMES.filter(t => t.rankMin <= ri);
  const theme = o.themeId ? D.THEMES.find(t => t.id === o.themeId) : rng.pick(themes);
  const nRows = (o.rooms || rank.rooms) - 1;
  const rows = [];
  for (let i = 0; i < nRows; i++) {
    const n = rng.int(2, 3), opts2 = [];
    const table = i === 0 ? ROW_EARLY : ROW_MID;
    for (let j = 0; j < n; j++) opts2.push({ type: rng.weighted(Object.keys(table), k => table[k]), id: `r${i}n${j}` });
    if (i === nRows - 1 && !opts2.some(x => x.type === 'rest')) opts2[opts2.length - 1].type = 'rest';
    if (i === 0 && !opts2.some(x => x.type === 'combat')) opts2[0].type = 'combat';
    rows.push(opts2);
  }
  const corrupted = rng.chance(0.12) || !!o.corrupted;
  let anomaly = null;
  if (!o.noAnomaly && (o.anomaly || rng.chance(0.1 + 0.05 * ri))) anomaly = o.anomaly || rng.pick(Object.keys(D.ANOMALIES));
  return { seed, rankId, theme, rows, corrupted, rank, anomaly, warden: o.warden || null };
}
function placeSecret(dungeon, char, race) {
  const rng = new RNG(dungeon.seed + '|secret|' + char.name);
  const prof = PROF_BY[char.prof];
  const luck = char.luck + (hasTalent(char, 'fortune') ? 4 : 0);
  const chance = hasTalent(char, 'fated') ? 1 : Math.min(0.6, 0.12 + luck * 0.02 + (race.fx.secret || 0) + (prof.scout ? 0.12 : 0));
  dungeon.secretChance = chance;
  if (!rng.chance(chance)) return false;
  const rowIdx = rng.int(1, dungeon.rows.length - 2);
  dungeon.rows[rowIdx].push({ type: 'secret', id: `r${rowIdx}s`, hidden: true });
  return true;
}
function placeMissionNodes(dungeon, mission) {
  if (!mission) return;
  const rng = new RNG(dungeon.seed + '|mission');
  const n = dungeon.rows.length;
  if (mission.type === 'rescue') {
    const r = rng.int(1, Math.max(1, n - 3));
    dungeon.rows[r].push({ type: 'missing', id: `r${r}m` });
  } else if (mission.type === 'relic') {
    const r = rng.int(Math.max(1, Math.floor(n / 2)), n - 2);
    dungeon.rows[r].push({ type: 'relic', id: `r${r}x` });
  } else if (mission.type === 'bounty') {
    const r = rng.int(1, Math.max(1, n - 2));
    dungeon.rows[r].push({ type: 'elite', id: `r${r}b` });
  } else if (mission.type === 'explore') {
    // make sure there are enough special rooms (shrines, camps, events, chests, traps) to choose from
    const need = (mission.objective && mission.objective.count || 3) + 2, specials = ['shrine', 'camp', 'event', 'treasure', 'trap'];
    let placed = 0;
    for (let r = 1; r < n - 1 && placed < need; r += 1 + (placed % 2 ? 0 : 0)) {
      if (!dungeon.rows[r].some(o => SPECIAL.includes(o.type))) dungeon.rows[r][0] = { type: rng.pick(specials), id: `r${r}n0` };
      placed++;
    }
  }
}

// ---------- Run ----------
function makeRun(char, equip, seed, rankId, dungeon, opts) {
  const o = opts || {};
  const run = {
    char, seed, rankId, dungeon, equip, inv: [], mats: {}, cons: o.cons || {}, potions: o.potions != null ? o.potions : 2, gold: 0, heat: 0, row: 0,
    flags: {}, blessing: o.blessing ? 1 : 0, poison: 0, bleed: 0, burn: 0, weak: 0, block: 0, counter: 0, stagger: false, buffs: {}, spirit: null, ward: 0, elixir: false,
    log: [], rng: new RNG(seed + '|combat|' + char.name), loot: new RNG(seed + '|loot|' + char.name), combat: null, dead: false, escaped: false,
    stats: { kills: 0, bosses: 0, secrets: 0, rooms: 0 }, companion: o.companion || null, party: o.party || null, mission: o.mission || null, career: !!o.career, clues: 0, repGain: 0, creditGain: 0,
    mprog: { kills: {}, mats: {}, special: [], rescued: false, relic: false, elites: 0, secrets: 0, potions: 0, bounty: false, bountySeen: false },
  };
  run.d = derive(char, equip);
  run.hp = Math.round(run.d.maxHp * (o.hpFrac || 1)); run.en = run.d.maxEn;
  return run;
}
function newRun(char, seed, rankId, vaultPicks) {
  const c = JSON.parse(JSON.stringify(char));
  const race = RACE_BY[c.race];
  const dungeon = generateDungeon(seed, rankId);
  const secret = placeSecret(dungeon, c, race);
  const equip = starterGear(c);
  for (const slot of D.SLOTS) {
    const it = vaultPicks && vaultPicks[slot];
    if (it) equip[slot] = Object.assign({}, E.normalizeItem(it), { fromVault: true });
  }
  const run = makeRun(c, equip, seed, rankId, dungeon, {});
  run.secretShown = secret;
  return run;
}
function claimRelic(run) {
  const it = genUnknownRelic(run.loot, lootCtx(run));
  run.inv.push(it); run.mprog.relic = true;
  return it;
}
function claimSecret(run) {
  const it = genUnknownRelic(run.loot, lootCtx(run));
  run.inv.push(it); run.stats.secrets++; run.mprog.secrets++;
  return it;
}
function enterNode(run, node) {
  if (SPECIAL.includes(node.type) && node.id && !run.mprog.special.includes(node.id)) run.mprog.special.push(node.id);
  else if (SPECIAL.includes(node.type) && !node.id) run.mprog.special.push('x' + run.mprog.special.length);
}
function advanceRoom(run) {
  const notes = [];
  if (run.dead) return notes;
  run.row++; run.heat++; run.stats.rooms++;
  if (E.anomaly(run, 'toxic_air')) {
    const dmg = Math.max(1, Math.round(run.d.maxHp * 0.04));
    run.hp = Math.max(1, run.hp - dmg); notes.push(`Toxic air burns your lungs: -${dmg} HP.`); say(run, notes[notes.length - 1]);
  }
  return notes;
}
function missionMet(run) {
  const m = run.mission;
  if (!m) return false;
  const o = m.objective, p = run.mprog;
  switch (o.kind) {
    case 'clear': return run.stats.bosses > 0;
    case 'hunt': return (p.kills[o.target] || 0) >= o.count;
    case 'gather': return (p.mats[o.target] || 0) >= o.count;
    case 'explore': return p.special.length >= o.count;
    case 'rescue': return p.rescued;
    case 'relic': return p.relic;
    case 'bounty': return !!p.bounty;
    case 'cull': return run.stats.kills >= o.count;
    default: return false;
  }
}
function missionProgress(run) {
  const m = run.mission;
  if (!m) return null;
  const o = m.objective, p = run.mprog;
  switch (o.kind) {
    case 'clear': return run.stats.bosses > 0 ? 'Boss defeated' : 'Boss alive';
    case 'hunt': return `${Math.min(o.count, p.kills[o.target] || 0)}/${o.count}`;
    case 'gather': return `${Math.min(o.count, p.mats[o.target] || 0)}/${o.count}`;
    case 'explore': return `${Math.min(o.count, p.special.length)}/${o.count}`;
    case 'rescue': return p.rescued ? 'Rescued' : 'Missing';
    case 'relic': return p.relic ? 'Recovered' : 'Not found';
    case 'bounty': return p.bounty ? 'Target slain' : 'Target at large';
    case 'cull': return `${Math.min(o.count, run.stats.kills)}/${o.count}`;
    default: return '';
  }
}
function optionalMet(run) {
  const m = run.mission;
  if (!m || !m.optional) return false;
  const p = run.mprog;
  if (m.optional.id === 'nopotion') return p.potions === 0;
  if (m.optional.id === 'elite') return p.elites >= 1;
  if (m.optional.id === 'secret') return p.secrets >= 1;
  return false;
}

// ---------- Events ----------
function checkDc(run, off) { return 9 + Math.floor(RANKS[run.rankId].rec * 0.6) + (off || 0); }
function checkRoll(run, stat, off) {
  const val = stat === 'LUK' ? run.d.st.LUK : run.d.st[stat];
  const bonus = Math.floor(val / 2) + Math.floor(run.d.st.LUK / 3);
  const roll = run.loot.int(1, 20), dc = checkDc(run, off);
  return { ok: roll + bonus >= dc, roll, bonus, dc };
}
function pickEvent(run, cat) {
  const ri = rankIndex(run.rankId);
  const pool = D.EVENTS.filter(e => e.cat === cat && e.rankMin <= ri);
  const list = pool.length ? pool : D.EVENTS.filter(e => e.cat === cat);
  return run.loot.weighted(list, e => e.weight);
}
function missingEvent() {
  return { id: 'missing', cat: 'event', title: 'The Missing Expedition', icon: '🆘', text: 'A survivor from the lost expedition huddles in the corner, whispering a name over and over.',
    choices: [
      { label: 'Treat their wounds (potion)', cost: { potion: 1 }, out: { text: 'They weep with relief. You lead them to safety.', rescue: true, rep: 2, gold: [20, 40] } },
      { label: 'Calm them and find the way out (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'Your steady voice gets them moving. They are safe.', rescue: true, rep: 2, gold: [20, 40] }, lose: { text: 'They panic and flee. Perhaps they will find the exit.', rescue: true, rep: 0 } },
      { label: 'Leave them', out: { text: 'You leave them to their fate.', rep: -3 } }] };
}
function choiceBlocked(run, ch) {
  const c = ch.cost;
  if (!c) return null;
  if (c.potion && run.potions < c.potion) return 'No potion';
  if (c.gold && run.gold < c.gold) return 'Need ' + c.gold + ' gold';
  if (c.goldPct && run.gold < 5) return 'Not enough gold';
  if (c.hpPct && run.hp <= run.d.maxHp * (c.hpPct + 0.05)) return 'Too wounded';
  if (c.cons && !run.cons[c.cons]) return 'No ' + D.CONSUMABLES[c.cons].name;
  return null;
}
function goldAmount(run, g) {
  const v = Array.isArray(g) ? run.loot.int(g[0], g[1]) : g;
  return Math.round(v * RANKS[run.rankId].rewards * (run.career ? 1.1 : 1));
}
function applyOutcome(run, out, res, stake) {
  if (!out) return;
  if (out.rand) {
    const luckBoost = out.luckW ? 1 + run.d.st.LUK * 0.04 : 1;
    // luck skews the first (best) entry
    let total = 0; const ws = out.rand.map((e, i) => { const w = e[0] * (i === 0 ? luckBoost : 1); total += w; return w; });
    let r = run.loot.next() * total, chosen = out.rand[out.rand.length - 1][1];
    for (let i = 0; i < out.rand.length; i++) { r -= ws[i]; if (r < 0) { chosen = out.rand[i][1]; break; } }
    applyOutcome(run, chosen, res, stake);
  }
  if (out.text) res.lines.push(out.text);
  const ctx = lootCtx(run, out.minRarity ? { minRarity: out.minRarity } : {});
  if (out.gold) { const g = goldAmount(run, out.gold); run.gold += g; res.lines.push(`+${g} gold.`); }
  if (out.payout && stake) { run.gold += stake * out.payout; res.lines.push(`+${stake * out.payout} gold.`); }
  if (out.xp) { const x = Math.round(out.xp * RANKS[run.rankId].rewards); const ups = addXp(run, x); res.lines.push(`+${x} XP.`); if (ups.length) res.lines.push(`Level up! Now level ${run.char.level}.`); }
  if (out.hpPct) {
    if (out.hpPct > 0) { healHp(run, run.d.maxHp * out.hpPct); res.lines.push('You recover some HP.'); }
    else { const dmg = Math.round(run.d.maxHp * -out.hpPct); run.hp = Math.max(1, run.hp - dmg); res.lines.push(`You lose ${dmg} HP.`); }
  }
  if (out.status) { run[out.status] = Math.max(run[out.status] || 0, 3); res.lines.push(`You are afflicted: ${out.status}.`); }
  if (out.bless) { run.blessing = 1; res.lines.push('You are blessed: +15% damage for this dungeon.'); }
  if (out.curse) { run.weak = Math.max(run.weak, 4); res.lines.push('A curse saps your strength for a few turns.'); }
  if (out.item) { const it = genItem(run.loot, ctx); run.inv.push(it); res.items.push(it); }
  if (out.relic) { const it = genUnknownRelic(run.loot, lootCtx(run)); run.inv.push(it); res.items.push(it); }
  if (out.mats) for (const k in out.mats) { addMat(run, k, out.mats[k]); res.lines.push(`+${out.mats[k]} ${D.MATERIALS[k].name}.`); }
  if (out.matsRandom) {
    for (let i = 0; i < out.matsRandom; i++) { const k = run.loot.pick(run.dungeon.theme.mat); addMat(run, k, 1); }
    res.lines.push(`You gather ${out.matsRandom} materials from the ${run.dungeon.theme.name}.`);
  }
  if (out.cons) for (const k in out.cons) { run.cons[k] = (run.cons[k] || 0) + out.cons[k]; res.lines.push(`+${out.cons[k]} ${D.CONSUMABLES[k].name}.`); }
  if (out.consRandom) { const k = randomCons(run); res.lines.push(`You find a ${D.CONSUMABLES[k].name}.`); }
  if (out.potions) { run.potions += out.potions; res.lines.push(`+${out.potions} potion.`); }
  if (out.skillbook) {
    const unk = D.BOOK_SKILLS.filter(id => !run.char.skills.includes(id));
    const id = unk.length ? run.loot.pick(unk) : null;
    if (id) { run.cons['book_' + id] = (run.cons['book_' + id] || 0) + 1; res.lines.push(`You find a tome: ${D.SKILLS[id].name}.`); } else res.lines.push('You already know every tome.');
  }
  if (out.skillpt) { run.char.skillPts += out.skillpt; res.lines.push(`+${out.skillpt} skill point.`); }
  if (out.upgrade) {
    const w = run.equip.weapon;
    if (w && (w.up || 0) < 5) { w.up = (w.up || 0) + 1; refresh(run); res.lines.push(`${w.name} is now +${w.up}.`); } else res.lines.push('Nothing more can be done.');
  }
  if (out.stat) { const s = run.loot.pick(STATS); run.char.stats[s] += out.stat; refresh(run); res.lines.push(`+${out.stat} ${s} permanently.`); }
  if (out.rep) { run.repGain += out.rep; res.lines.push(`Guild reputation ${out.rep > 0 ? '+' : ''}${out.rep}.`); }
  if (out.credits) { run.creditGain += out.credits; res.lines.push(`+${out.credits} Guild Credits.`); }
  if (out.clue) { run.clues++; res.lines.push('You note a clue for your journal.'); }
  if (out.heat) run.heat += out.heat;
  if (out.chest) run.flags.chestBoost = true;
  if (out.revealSecret) res.revealSecret = true;
  if (out.rescue) { run.mprog.rescued = true; if (!run.companion) { const k = run.loot.pick(Object.keys(D.COMPANIONS)); run.companion = { id: k, name: 'Rescued ' + D.COMPANIONS[k].name, temp: true }; res.lines.push(`${run.companion.name} joins you for this dungeon.`); } }
  if (out.companion === 'rescued' && !run.companion) { const k = run.loot.pick(['squire', 'cleric', 'scout']); run.companion = { id: k, name: 'Rescued ' + D.COMPANIONS[k].name, temp: true }; res.lines.push(`${run.companion.name} joins you for this dungeon.`); }
  if (out.fight) res.fight = out.fight;
}
function resolveChoice(run, ev, idx) {
  const ch = ev.choices[idx];
  const res = { lines: [], items: [], fight: null, revealSecret: false, check: null };
  const blocked = choiceBlocked(run, ch);
  if (blocked) { res.lines.push(blocked); res.blocked = true; return res; }
  let stake = 0;
  if (ch.cost) {
    const c = ch.cost;
    if (c.potion) run.potions -= c.potion;
    if (c.gold) run.gold -= c.gold;
    if (c.goldPct) { stake = Math.max(1, Math.round(run.gold * c.goldPct)); run.gold -= stake; res.lines.push(`You put up ${stake} gold.`); }
    if (c.hpPct) { const dmg = Math.round(run.d.maxHp * c.hpPct); run.hp = Math.max(1, run.hp - dmg); res.lines.push(`You pay ${dmg} HP.`); }
    if (c.cons) run.cons[c.cons]--;
  }
  const rollOut = o => { if (o && o.rand && ch.luckWeighted) o.luckW = true; return o; };
  if (ch.check) {
    const r = checkRoll(run, ch.check.stat, ch.check.dc);
    res.check = r;
    res.lines.push(`${ch.check.stat} check: ${r.roll} + ${r.bonus} vs DC ${r.dc}: ${r.ok ? 'success' : 'failure'}.`);
    applyOutcome(run, r.ok ? ch.win : ch.lose, res, stake);
  } else applyOutcome(run, rollOut(ch.out), res, stake);
  run.log.push(`${ev.title}: ${ch.label}`);
  (run.seenEv = run.seenEv || {})[ev.id || ev.title] = 1;
  return res;
}

// ---------- Rooms ----------
function treasureChest(run, opts) {
  const o = opts || {};
  const rift = E.anomaly(run, 'treasure_rift');
  const ctx = lootCtx(run, (o.minRarity || rift) ? { minRarity: Math.max(o.minRarity || 0, rift ? 1 : 0) } : {});
  let rarity = E.rollRarity(run.loot, ctx);
  if (hasTalent(run.char, 'luckybreak') && !run.flags.luckybreak) { run.flags.luckybreak = true; rarity = Math.min(4, rarity + 1); }
  if (run.flags.chestBoost) { run.flags.chestBoost = false; rarity = Math.min(4, rarity + 1); }
  if (run.loot.chance(rift ? 0.15 : 0.3)) {
    const g = Math.round(run.loot.int(15, 30) * RANKS[run.rankId].rewards * (1 + 0.1 * run.heat) * (rift ? 1.5 : 1) * (run.career ? 1.1 : 1));
    run.gold += g;
    const out = { gold: g };
    if (run.loot.chance(0.4)) { const k = run.loot.pick(run.dungeon.theme.mat); addMat(run, k, 1 + (run.loot.chance(0.3) ? 1 : 0)); out.mat = k; }
    return out;
  }
  const it = genItem(run.loot, Object.assign(ctx, { rarity }));
  run.inv.push(it);
  return { item: it };
}
function shrinePray(run) {
  const luck = run.d.st.LUK, rng = run.loot;
  const pCurse = Math.max(0.05, 0.2 - 0.015 * luck);
  if (rng.next() < pCurse) {
    const loss = Math.round(run.d.maxHp * 0.15); run.hp = Math.max(1, run.hp - loss);
    return { text: `The shrine lashes out. You lose ${loss} HP.` };
  }
  const x = rng.next(), pRelic = 0.08 + luck * 0.01, pBless = 0.35, pHeal = 0.3;
  if (x < pRelic) { const it = genUnknownRelic(rng, lootCtx(run)); run.inv.push(it); return { text: 'The shrine offers a strange relic.', item: it }; }
  if (x < pRelic + pBless) { run.blessing = 1; return { text: 'A blessing settles over you: +15% damage for this dungeon.' }; }
  if (x < pRelic + pBless + pHeal) { const h = Math.round(run.d.maxHp * 0.35); healHp(run, h); return { text: `Warm light heals you.` }; }
  const g = Math.round(20 * RANKS[run.rankId].rewards * (run.career ? 1.1 : 1)); run.gold += g;
  return { text: `Coins gleam in the offering bowl: +${g} gold.` };
}
function restRoom(run) {
  const before = run.hp;
  healHp(run, run.d.maxHp * 0.4); run.en = run.d.maxEn; run.poison = run.bleed = run.burn = 0;
  return run.hp - before;
}
function campSearch(run) {
  const luck = run.d.st.LUK, rng = run.loot;
  const lore = rng.pick(D.CAMP_LORE);
  const passage = rng.chance(0.12 + luck * 0.015);
  const r = rng.next();
  const res = { lore, passage: null };
  if (r < 0.35) { run.potions++; res.text = 'You find a usable potion.'; }
  else if (r < 0.6) { const g = Math.round(rng.int(10, 25) * RANKS[run.rankId].rewards * (run.career ? 1.1 : 1)); run.gold += g; res.text = `You find ${g} gold.`; }
  else if (r < 0.8) { const k = randomCons(run, rng); res.text = `You find a ${D.CONSUMABLES[k].name}.`; }
  else { const it = genItem(rng, lootCtx(run)); run.inv.push(it); res.item = it; res.text = 'You find gear in an abandoned pack.'; }
  if (passage) res.passage = treasureChest(run, { minRarity: 1 });
  return res;
}
function consPrice(run, id) { return Math.round(D.CONSUMABLES[id].price * (1 + 0.12 * rankIndex(run.rankId))); }
function merchantStock(run) {
  const rng = new RNG(run.seed + '|merchant|' + run.row + run.char.name);
  const ctx = lootCtx(run);
  const gear = [genItem(rng, ctx), genItem(rng, Object.assign({}, ctx, { minRarity: 1 }))].map(it => Object.assign(it, { price: it.value * 4, kind: 'item' }));
  const pool = Object.keys(D.CONSUMABLES).filter(k => !D.CONSUMABLES[k].book);
  const cons = [];
  while (cons.length < 3) { const k = rng.pick(pool); if (!cons.some(c => c.id === k)) cons.push({ kind: 'cons', id: k, price: consPrice(run, k) }); }
  return gear.concat(cons);
}
function potionPrice(run) { return Math.round(15 * Math.pow(RANKS[run.rankId].rewards, 0.8)); }
function buyPotion(run) { const price = potionPrice(run); if (run.gold < price) return false; run.gold -= price; run.potions++; return true; }
function buyStock(run, stock, i) {
  const it = stock[i];
  if (!it || it.sold || run.gold < it.price) return false;
  run.gold -= it.price; it.sold = true;
  if (it.kind === 'cons') run.cons[it.id] = (run.cons[it.id] || 0) + 1;
  else { const c = Object.assign({}, it); delete c.price; delete c.sold; delete c.kind; run.inv.push(c); }
  return true;
}
function sellItem(run, id) {
  const idx = run.inv.findIndex(i => i.id === id);
  if (idx < 0) return 0;
  const v = E.sellValue(run.inv[idx]);
  run.inv.splice(idx, 1); run.gold += v;
  return v;
}

// ---------- Missions ----------
function buildMission(rng, rankId, type, key, extra) {
  const ri = rankIndex(rankId), rk = RANKS[rankId];
  const seed = 'c|' + key;
  const emergency = !!(extra && extra.emergency);
  const d = generateDungeon(seed, rankId, emergency ? { corrupted: true } : {});
  const theme = d.theme, mt = D.MISSION_TYPES[type];
  let objective;
  if (type === 'clear') objective = { kind: 'clear', label: `Defeat ${theme.boss.name}` };
  else if (type === 'hunt') {
    const tpl = D.MONSTERS[rng.pick(theme.pool)], count = 3 + ri;
    objective = { kind: 'hunt', target: tpl.name, count, label: `Defeat ${count} ${tpl.name}${count > 1 ? 's' : ''}` };
  } else if (type === 'gather') {
    const mat = rng.pick(theme.mat), count = 4 + ri;
    objective = { kind: 'gather', target: mat, count, label: `Collect ${count} ${D.MATERIALS[mat].name}` };
  } else if (type === 'explore') {
    const count = 3 + (ri >= 2 ? 1 : 0);
    objective = { kind: 'explore', count, label: `Enter ${count} special rooms (shrines, camps, events, traps, chests)` };
  } else if (type === 'bounty') {
    const first = ['Grimjaw', 'Ashmaw', 'Velka', 'Rotfang', 'Skarn', 'Moldred', 'Hexa', 'Brakk', 'Vorn', 'Nixa', 'Gorrash', 'Thessaly'], epi = ['the Butcher', 'Bonecrusher', 'the Red', 'Two-Tongues', 'the Unburied', 'of the Pit', 'Gravewalker', 'the Cruel'];
    const nm = `${rng.pick(first)} ${rng.pick(epi)}`;
    objective = { kind: 'bounty', target: nm, label: `Slay the wanted beast ${nm} (an elite hiding in the dungeon)` };
  } else if (type === 'cull') {
    const count = 6 + ri * 2;
    objective = { kind: 'cull', count, label: `Defeat ${count} monsters of any kind` };
  } else if (type === 'rescue') objective = { kind: 'rescue', label: 'Find and rescue the missing expedition member' };
  else objective = { kind: 'relic', relicName: rng.pick(D.RELIC_NAMES), label: 'Recover the relic from the sealed chamber' };
  const opt = rng.chance(0.65) ? rng.pick(Object.keys(D.OPTIONALS)) : null;
  const goldBase = Math.round(42 * rk.rewards * mt.mult * (emergency ? 1.5 : 1));
  const reward = { gold: goldBase, credits: 2 + ri * 2 + (emergency ? 3 : 0), rep: 2 + ri + (emergency ? 2 : 0), itemRarity: Math.min(4, 1 + Math.floor(ri / 2) + (emergency ? 1 : 0)) };
  return {
    id: seed, type, rank: rankId, seed, themeId: theme.id, theme: theme.name, boss: theme.boss.name, corrupted: d.corrupted, anomaly: d.anomaly, rooms: rk.rooms, rec: rk.rec,
    objective, optional: opt ? { id: opt, label: D.OPTIONALS[opt].label, bonus: D.OPTIONALS[opt].bonus } : null, reward, emergency,
  };
}

// ---------- Career ----------
function careerStart(char, opts) {
  const c = JSON.parse(JSON.stringify(char));
  return {
    char: c, equip: starterGear(c), stash: [], cons: { antidote: 1, bandage: 2 }, mats: {}, potions: 2, gold: 0, credits: 0, rep: 0,
    clears: { F: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 }, grank: 'F', qdone: {}, boardN: 0, board: null, shop: null, rumor: false, blessNext: false, companion: null,
    runs: 0, deaths: 0, hardcore: !!(opts && opts.hardcore), done: [], wseed: (opts && opts.worldSeed) ? String(opts.worldSeed).trim() : '',
  };
}
// Guild rank is earned only by passing a rank test (see guild.js). Older saves start from the rank the old rules would have given them.
function legacyRank(career) {
  let r = 'F';
  CAREER_RANKS.forEach((id, i) => { if (i === 0 || (career.clears[CAREER_RANKS[i - 1]] >= 1 && career.char.level >= RANKS[id].rec - 3)) r = id; });
  return r;
}
function careerRank(career) {
  if (!career.grank) career.grank = legacyRank(career);
  return career.grank;
}
// A licence covers your own rank; the board lets you take quests one rank above it. Dungeons themselves are open to everyone.
function careerUnlocked(career, rankId) { return rankIndex(rankId) <= rankIndex(careerRank(career)) + 1; }
function repTitle(rep) {
  let t = D.REP_TITLES[0][1];
  for (const [at, name] of D.REP_TITLES) if (rep >= at) t = name;
  return t;
}
function priceMul(career) { return 1 - Math.min(0.15, Math.max(0, career.rep) / 300); }
function careerBoard(career) { return E.guildBoard(career); }
function careerHub(career) {
  const run = makeRun(career.char, career.equip, 'hub', 'F', generateDungeon('hub', 'F', { noAnomaly: true }), { cons: career.cons, career: true });
  run.inv = career.stash; run.mats = career.mats; run.gold = career.gold; run.potions = career.potions;
  run.hp = run.d.maxHp; run.en = run.d.maxEn;
  return run;
}
function careerSyncFromHub(career, hub) { career.gold = hub.gold; career.potions = hub.potions; }
function careerNewRun(career, mission) {
  const char = JSON.parse(JSON.stringify(career.char));
  const dungeon = generateDungeon(mission.seed, mission.rank, { themeId: mission.themeId, anomaly: mission.anomaly || undefined, noAnomaly: !mission.free && !mission.anomaly, corrupted: mission.corrupted, rooms: mission.rooms || 0, warden: mission.warden || null });
  const secret = mission.duel ? false : placeSecret(dungeon, char, RACE_BY[char.race]);
  placeMissionNodes(dungeon, mission.free ? null : mission);
  const equip = {};
  for (const slot of D.SLOTS) { const it = career.equip[slot]; equip[slot] = it ? Object.assign({}, it, { fromVault: true }) : null; }
  const comp = career.companion ? { id: career.companion.id, name: career.companion.name } : null;
  const pt = career.party ? { name: career.party.name, members: career.party.members.map(m => Object.assign({}, m)), lootMul: career.party.lootMul, xpMul: career.party.xpMul, shield: career.party.shield, pw: career.party.pw } : null;
  const run = makeRun(char, equip, mission.seed, mission.rank, dungeon, {
    career: true, mission: mission.free ? null : mission, cons: Object.assign({}, career.cons), potions: career.potions, blessing: career.blessNext, companion: comp, party: pt,
    hpFrac: career.char.injuries && career.char.injuries.length ? 0.85 : 1,
  });
  run.nodeId = mission.nodeId || null; run.arena = !!mission.arena;
  run.duel = mission.duel || null; run.tourney = mission.tourney || null; run.rankTest = mission.rankTest || null;
  if (run.duel) run.seenMons = {};
  run.secretShown = secret; run.startCons = Object.assign({}, career.cons); run.startPotions = career.potions;
  career.blessNext = false;
  return run;
}
function careerEnd(career, run, outcome) {
  const rk = RANKS[run.rankId];
  const strip = it => it && Object.assign({}, it, { fromVault: false });
  const res = { gold: 0, banked: [], mats: {}, mission: null, penalties: [], permadeath: false, injury: null };
  // arena bouts are fought to a yield, not to the death
  if (run.duel && outcome === 'dead') { outcome = 'extracted'; res.yielded = true; }
  career.runs++;
  career.char = run.char;
  const m = run.mission;
  if (outcome !== 'dead') {
    if (outcome === 'cleared') { career.clears[run.rankId]++; run.gold += Math.round(40 * rk.rewards); }
    // mission settlement
    if (m) {
      const done = m.objective.kind === 'clear' ? outcome === 'cleared' : missionMet(run);
      if (done) {
        const optOk = optionalMet(run);
        const bonus = optOk ? 1 + m.optional.bonus : 1;
        const gold = Math.round(m.reward.gold * bonus), credits = m.reward.credits + (optOk ? 2 : 0), rep = m.reward.rep + (optOk ? 1 : 0);
        run.gold += gold; career.credits += credits; career.rep += rep;
        const item = genItem(new RNG(m.seed + '|reward'), { rarity: m.reward.itemRarity, heat: 0, luck: 0, rankMul: Math.pow(rk.cs, 0.5) });
        career.stash.push(item); res.banked.push(item);
        res.mission = { done: true, gold, credits, rep, optional: optOk, item };
        career.qdone = career.qdone || {}; career.qdone[m.rank] = (career.qdone[m.rank] || 0) + 1;
        if (m.royal) E.royalDone(career, m, res);
      } else {
        if (outcome === 'extracted') { career.rep = Math.max(0, career.rep - 1); }
        res.mission = { done: false, rep: outcome === 'extracted' ? -1 : 0 };
      }
    }
    career.gold += run.gold; res.gold = run.gold;
    career.credits += run.creditGain; career.rep += run.repGain;
    for (const it of run.inv) { const c = strip(it); career.stash.push(c); if (!it.fromVault) res.banked.push(c); }
    career.equip = {};
    for (const slot of D.SLOTS) career.equip[slot] = strip(run.equip[slot]);
    for (const k in run.mats) { career.mats[k] = (career.mats[k] || 0) + run.mats[k]; res.mats[k] = run.mats[k]; }
    career.cons = Object.assign({}, run.cons);
    for (const k of Object.keys(career.cons)) if (!career.cons[k]) delete career.cons[k];
    career.potions = Math.min(run.potions, 12);
    if (career.char.injuries) career.char.injuries = career.char.injuries.map(i => Object.assign({}, i, { left: i.left - 1 })).filter(i => i.left > 0);
    if (career.companion && !career.companion.temp) { career.companion.left--; if (career.companion.left <= 0) { res.penalties.push(`${career.companion.name} leaves your service.`); career.companion = null; } }
  } else {
    career.deaths++;
    if (career.hardcore) res.permadeath = true;
    const lostGold = Math.floor(career.gold * 0.15);
    career.gold -= lostGold; res.penalties.push(`Lost ${lostGold} gold.`);
    res.penalties.push('Lost everything you carried out of the dungeon.');
    const before = Object.assign({}, run.startCons || {});
    career.cons = {};
    for (const k in before) { const keep = before[k] - Math.ceil(before[k] * 0.3); if (keep > 0) career.cons[k] = keep; }
    if (Object.keys(before).length) res.penalties.push('Lost about a third of your consumables.');
    career.potions = Math.max(1, Math.floor((run.startPotions || 0) * 0.7));
    for (const slot of D.SLOTS) { const it = career.equip[slot]; if (it && it.maxDur) it.dur = Math.max(0, it.dur - Math.ceil(it.maxDur * 0.3)); }
    res.penalties.push('Your gear took heavy damage.');
    const lostXp = Math.floor(career.char.xp * 0.25); career.char.xp -= lostXp; if (lostXp) res.penalties.push(`Lost ${lostXp} XP.`);
    const rng = new RNG('injury|' + career.char.name + '|' + career.runs);
    const have = (career.char.injuries || []).map(i => i.id);
    const pool = Object.keys(D.INJURIES).filter(k => !have.includes(k));
    if (pool.length) {
      const id = rng.pick(pool);
      career.char.injuries = (career.char.injuries || []).concat([{ id, left: 3 }]); res.injury = id;
      res.penalties.push(`Injury: ${D.INJURIES[id].name} (${D.INJURIES[id].desc})`);
    }
    if (m) { career.rep = Math.max(0, career.rep - 2); res.mission = { done: false, rep: -2 }; }
    if (career.companion) { res.penalties.push(`${career.companion.name} was lost in the dungeon.`); career.companion = null; }
  }
  if (career.party) {
    const p = career.party; p.done++; p.left--;
    if (outcome !== 'cleared' && outcome !== 'extracted') res.penalties.push(`${p.name} pulled you out of the dungeon.`);
    if (p.left <= 0) { res.penalties.push(`${p.name} moves on to other work.`); career.party = null; }
  }
  career.boardN++; career.board = null; career.shop = null; career.rumor = false;
  E.guildAfterRun(career, run, outcome, res);
  E.worldAfterRun(career, run, outcome, res);
  while (career.stash.length > 40) {
    const idx = career.stash.reduce((mi, it, i, a) => (it.value < a[mi].value ? i : mi), 0);
    career.gold += E.sellValue(career.stash[idx]); career.stash.splice(idx, 1);
  }
  return res;
}

// ----- shops and services -----
function careerShop(career) {
  if (career.shop && career.shop.n === career.boardN) return career.shop;
  const rng = new RNG('shop|' + career.char.name + '|' + career.boardN);
  const top = careerRank(career);
  const ctx = { heat: 0, luck: 0, rankMul: Math.pow(RANKS[top].cs, 0.5), minRarity: 0 };
  const items = [];
  for (let i = 0; i < 8; i++) {
    const it = genItem(rng, Object.assign({}, ctx, { minRarity: i < 2 ? 1 : 0 }));
    items.push(Object.assign(it, { price: Math.round(it.value * 4 * priceMul(career)) }));
  }
  career.shop = { n: career.boardN, items };
  return career.shop;
}
function careerConsPrice(career, id) { return Math.max(1, Math.round(D.CONSUMABLES[id].price * (1 + 0.12 * rankIndex(careerRank(career))) * priceMul(career))); }
function careerPotionPrice(career) { return Math.max(1, Math.round(15 * Math.pow(RANKS[careerRank(career)].rewards, 0.8) * priceMul(career))); }
function buyShopItem(career, i) {
  const shop = careerShop(career), it = shop.items[i];
  if (!it || it.sold || career.gold < it.price) return false;
  career.gold -= it.price; it.sold = true;
  const c = Object.assign({}, it); delete c.price; delete c.sold;
  career.stash.push(c);
  return true;
}
function buyCareerCons(career, id) {
  if (id === 'potion') { const p = careerPotionPrice(career); if (career.gold < p) return false; career.gold -= p; career.potions++; return true; }
  const p = careerConsPrice(career, id);
  if (career.gold < p) return false;
  career.gold -= p; career.cons[id] = (career.cons[id] || 0) + 1;
  return true;
}
function creditPrice(id) { return D.CONSUMABLES[id].book ? 8 : 3; }
function buyWithCredits(career, id) {
  const p = creditPrice(id);
  if (career.credits < p) return false;
  career.credits -= p; career.cons[id] = (career.cons[id] || 0) + 1;
  return true;
}
function careerSell(career, id) {
  const idx = career.stash.findIndex(i => i.id === id);
  if (idx < 0) return 0;
  const v = E.sellValue(career.stash[idx]);
  career.stash.splice(idx, 1); career.gold += v;
  return v;
}
function findItem(career, id) {
  for (const slot of D.SLOTS) if (career.equip[slot] && career.equip[slot].id === id) return { it: career.equip[slot], where: 'equip', slot };
  const it = career.stash.find(i => i.id === id);
  return it ? { it, where: 'stash' } : null;
}
function hasMats(career, need) { return Object.keys(need).every(k => (career.mats[k] || 0) >= need[k]); }
function takeMats(career, need) { for (const k in need) { career.mats[k] -= need[k]; if (career.mats[k] <= 0) delete career.mats[k]; } }
function upgradeInfo(career, it) {
  const up = it.up || 0;
  if (up >= 5) return { max: true };
  const top = rankIndex(careerRank(career));
  const gold = Math.round((it.value + 12) * (1 + up) * 0.9 * priceMul(career));
  const mats = { ore: 1 + up };
  if (up >= 2) mats.scrap = up - 1;
  if (up >= 4) mats.crystal = 2;
  const chance = [1, 1, 1, 0.75, 0.55][up];
  void top;
  return { gold, mats, chance };
}
function smithUpgrade(career, id) {
  const f = findItem(career, id);
  if (!f) return { ok: false, msg: 'Item not found' };
  const info = upgradeInfo(career, f.it);
  if (info.max) return { ok: false, msg: 'Already +5' };
  if (career.gold < info.gold) return { ok: false, msg: 'Not enough gold' };
  if (!hasMats(career, info.mats)) return { ok: false, msg: 'Missing materials' };
  career.gold -= info.gold; takeMats(career, info.mats);
  const rng = new RNG('upg|' + id + '|' + (f.it.up || 0) + '|' + career.runs + '|' + career.gold);
  if (rng.chance(info.chance)) { f.it.up = (f.it.up || 0) + 1; return { ok: true, msg: `${f.it.name} is now +${f.it.up}.` }; }
  return { ok: true, failed: true, msg: 'The upgrade failed. Materials and gold are lost.' };
}
function repairCost(career, it) {
  if (it.dur === undefined || it.dur >= it.maxDur) return 0;
  return Math.max(1, Math.ceil((it.maxDur - it.dur) * (1 + (it.rarity || 0)) * 0.6 * priceMul(career) * (1 + 0.15 * rankIndex(careerRank(career)))));
}
function smithRepair(career, id) {
  const f = findItem(career, id);
  if (!f) return { ok: false, msg: 'Item not found' };
  const c = repairCost(career, f.it);
  if (!c) return { ok: false, msg: 'Nothing to repair' };
  if (career.gold < c) return { ok: false, msg: 'Not enough gold' };
  career.gold -= c; f.it.dur = f.it.maxDur;
  return { ok: true, msg: `${f.it.name} repaired.` };
}
function smithRepairAll(career) {
  let total = 0;
  for (const slot of D.SLOTS) { const it = career.equip[slot]; if (it) total += repairCost(career, it); }
  if (!total) return { ok: false, msg: 'Nothing to repair' };
  if (career.gold < total) return { ok: false, msg: 'Not enough gold' };
  career.gold -= total;
  for (const slot of D.SLOTS) { const it = career.equip[slot]; if (it && it.dur !== undefined) it.dur = it.maxDur; }
  return { ok: true, msg: `Equipment repaired for ${total} gold.` };
}
function enchantInfo(career, it) {
  if (it.affixes.length >= 3) return { max: true };
  return { gold: Math.round((it.value * 2 + 30) * priceMul(career)), mats: { dust: 2, gel: 1 } };
}
function smithEnchant(career, id) {
  const f = findItem(career, id);
  if (!f) return { ok: false, msg: 'Item not found' };
  const info = enchantInfo(career, f.it);
  if (info.max) return { ok: false, msg: 'Already fully enchanted' };
  if (career.gold < info.gold) return { ok: false, msg: 'Not enough gold' };
  if (!hasMats(career, info.mats)) return { ok: false, msg: 'Missing materials' };
  career.gold -= info.gold; takeMats(career, info.mats);
  const rng = new RNG('ench|' + id + '|' + f.it.affixes.length + '|' + career.runs + '|' + career.gold);
  const pool = Object.keys(D.AFFIXES).filter(a => !f.it.affixes.includes(a));
  const a = rng.pick(pool);
  f.it.affixes.push(a);
  if (f.it.affixes.length === 1) f.it.name = f.it.base + ' ' + D.AFFIXES[a].name;
  return { ok: true, msg: `Enchanted: ${D.AFFIXES[a].name} (${D.AFFIXES[a].desc}).` };
}
function smithSalvage(career, id) {
  const idx = career.stash.findIndex(i => i.id === id);
  if (idx < 0) return { ok: false, msg: 'Only stash items can be salvaged' };
  const it = career.stash[idx];
  career.stash.splice(idx, 1);
  const got = { ore: 1 + it.rarity };
  if (it.rarity >= 2) got.dust = 1 + (it.rarity >= 3 ? 1 : 0);
  if (it.rarity >= 3) got.crystal = 1;
  if (it.rarity >= 4) got.gem = 1;
  for (const k in got) career.mats[k] = (career.mats[k] || 0) + got[k];
  return { ok: true, msg: 'Salvaged: ' + Object.keys(got).map(k => `${got[k]} ${D.MATERIALS[k].name}`).join(', '), got };
}
function craft(career, recipeId) {
  const r = D.RECIPES.find(x => x.id === recipeId);
  if (!r) return { ok: false, msg: 'Unknown recipe' };
  if (career.gold < r.gold) return { ok: false, msg: 'Not enough gold' };
  if (!hasMats(career, r.inputs)) return { ok: false, msg: 'Missing materials' };
  career.gold -= r.gold; takeMats(career, r.inputs);
  const bonus = career.char && (PROF_BY[career.char.prof].alchemist) ? 1 : 0;
  for (const k in r.out) career.cons[k] = (career.cons[k] || 0) + r.out[k] + (bonus ? 1 : 0);
  return { ok: true, msg: `Crafted ${r.name}${bonus ? ' (Alchemist bonus +1)' : ''}.` };
}
function healCost(career, injId) { return Math.round(D.INJURIES[injId].cost * (1 + 0.3 * rankIndex(careerRank(career))) * priceMul(career)); }
function cureInjury(career, injId) {
  const c = healCost(career, injId);
  const inj = career.char.injuries || [];
  if (!inj.some(i => i.id === injId)) return { ok: false, msg: 'Not injured' };
  if (career.gold < c) return { ok: false, msg: 'Not enough gold' };
  career.gold -= c; career.char.injuries = inj.filter(i => i.id !== injId);
  return { ok: true, msg: `${D.INJURIES[injId].name} healed.` };
}
function blessingCost(career) { return Math.round(45 * (1 + 0.3 * rankIndex(careerRank(career))) * priceMul(career)); }
function buyBlessing(career) {
  const c = blessingCost(career);
  if (career.blessNext) return { ok: false, msg: 'You are already blessed' };
  if (career.gold < c) return { ok: false, msg: 'Not enough gold' };
  career.gold -= c; career.blessNext = true;
  return { ok: true, msg: 'The priest blesses you: +15% damage on your next expedition.' };
}
function hireCost(career, id) { return Math.round(D.COMPANIONS[id].cost * (1 + 0.2 * rankIndex(careerRank(career))) * priceMul(career)); }
function hireCompanion(career, id) {
  const c = hireCost(career, id);
  if (career.party) return { ok: false, msg: 'Leave your party first.' };
  if (career.companion) return { ok: false, msg: 'Dismiss your current companion first' };
  if (career.gold < c) return { ok: false, msg: 'Not enough gold' };
  const names = ['Brin', 'Tess', 'Korv', 'Mira', 'Dax', 'Fenn', 'Lura', 'Orin'];
  const rng = new RNG('hire|' + career.runs + '|' + id + '|' + career.gold);
  career.gold -= c; career.companion = { id, name: rng.pick(names) + ' the ' + D.COMPANIONS[id].name, left: 3 };
  return { ok: true, msg: `${career.companion.name} joins you for 3 expeditions.` };
}
// ---------- Temporary parties ----------
// Who is recruiting depends on the place you stand in (Hearthhold, a town, a village) and on how dangerous the area around it is.
// A party fights beside you and soaks damage, but takes its share of the gold, loot and XP.
const PARTY_NAMES = ['The Rusty Lanterns', 'Ash & Iron', 'The Gilded Rats', 'Moonlit Company', 'Red Hollow Guard', 'The Lucky Seven', 'Stormcallers', 'Thornwall Watch', 'The Ember Pact', 'Silent Oars', 'Hollow Crown', 'The Last Ladle'];
const PARTY_FIRST = ['Brin', 'Tess', 'Korv', 'Mira', 'Dax', 'Fenn', 'Lura', 'Orin', 'Sable', 'Pike', 'Ysolde', 'Garrick'];
function partyOffers(career) {
  const place = E.partyPlace(career); if (!place) return [];
  const w = E.worldOf(career), week = Math.floor((w.day || 1) / 7);
  const rng = new RNG(`party|${career.wseed}|${place.id}|${week}`);
  const count = place.kind === 'village' ? 2 : place.kind === 'racehold' ? 1 : 3;
  const ri = place.zone, rk = CAREER_RANKS[Math.min(ri, CAREER_RANKS.length - 1)], ids = Object.keys(D.COMPANIONS);
  const used = new Set(), out = [];
  for (let i = 0; i < count; i++) {
    let name; do { name = rng.pick(PARTY_NAMES); } while (used.has(name) && used.size < PARTY_NAMES.length); used.add(name);
    const size = rng.chance(place.kind === 'village' ? 0.15 : 0.45) ? 3 : 2;
    const roles = ids.slice(); const members = [];
    for (let m = 0; m < size; m++) { const r = roles.splice(rng.int(0, roles.length - 1), 1)[0]; members.push({ id: r, name: rng.pick(PARTY_FIRST) + ' the ' + D.COMPANIONS[r].name }); }
    out.push({
      id: `${place.id}:${week}:${i}`, name, members, place: place.name, zone: rk,
      minLevel: Math.max(1, RANKS[rk].rec - 2 + rng.int(0, 2)), needRuns: ri === 0 ? rng.int(0, 2) : rng.int(2, 5),
      stay: rng.int(2, 4), total: rng.int(5, 7), leavePay: Math.round((40 + 20 * size) * (1 + 0.5 * ri)),
      lootMul: +((size === 2 ? 0.75 : 0.62) + rng.next() * 0.06).toFixed(2), xpMul: +((size === 2 ? 0.8 : 0.68) + rng.next() * 0.06).toFixed(2),
      shield: size === 2 ? 0.1 : 0.16, pw: +(0.8 + 0.12 * ri).toFixed(2),
    });
  }
  if (place.kind === 'capital') for (const l of E.legendaryOffers(career, place)) out.push(l);
  return out;
}
function partyJoin(career, id) {
  if (career.party) return { ok: false, msg: 'You are already in a party. Leave it first.' };
  if (career.companion) return { ok: false, msg: 'Dismiss your companion first. A party and a hired companion do not mix.' };
  const o = partyOffers(career).find(x => x.id === id);
  if (!o) return { ok: false, msg: 'That party has moved on.' };
  if (career.char.level < o.minLevel) return { ok: false, msg: `They want someone of level ${o.minLevel} or more.` };
  if ((career.runs || 0) < o.needRuns) return { ok: false, msg: `They only take adventurers with ${o.needRuns}+ expeditions behind them.` };
  career.party = { id: o.id, name: o.name, members: o.members.map(m => Object.assign({}, m)), stay: o.stay, done: 0, left: o.total, leavePay: o.leavePay, lootMul: o.lootMul, xpMul: o.xpMul, shield: o.shield, pw: o.pw };
  return { ok: true, msg: `You join ${o.name}. Stay for at least ${o.stay} expeditions or pay ${o.leavePay}g to leave early.` };
}
function partyLeaveFee(career) { const p = career.party; return !p ? 0 : p.done >= p.stay ? 0 : p.leavePay; }
function partyLeave(career) {
  const p = career.party; if (!p) return { ok: false, msg: 'You are not in a party.' };
  const fee = partyLeaveFee(career);
  if (career.gold < fee) return { ok: false, msg: `Leaving early costs ${fee}g.` };
  career.gold -= fee; career.party = null;
  return { ok: true, msg: fee ? `You pay ${fee}g and leave ${p.name}.` : `You part ways with ${p.name} on good terms.` };
}
function dismissCompanion(career) { career.companion = null; return { ok: true, msg: 'Companion dismissed.' }; }
function rumorCost(career) { return Math.round(25 * (1 + 0.15 * rankIndex(careerRank(career))) * priceMul(career)); }
function buyRumor(career) {
  const c = rumorCost(career);
  if (career.rumor) return { ok: false, msg: 'You already heard this week\'s rumors' };
  if (career.gold < c) return { ok: false, msg: 'Not enough gold' };
  career.gold -= c; career.rumor = true;
  return { ok: true, msg: E.rumorText(career) };
}
function rumorText(career) { return D.RUMORS[(career.boardN + career.runs) % D.RUMORS.length] + ' The board now shows each dungeon\'s anomaly.'; }

Object.assign(E, {
  generateDungeon, placeSecret, newRun, makeRun, claimRelic, claimSecret, enterNode, advanceRoom, missionMet, missionProgress, optionalMet, checkDc, pickEvent, missingEvent, choiceBlocked, resolveChoice,
  treasureChest, shrinePray, restRoom, campSearch, merchantStock, potionPrice, buyPotion, buyStock, sellItem, consPrice, rankIndex, SPECIAL,
  careerStart, careerUnlocked, careerRank, repTitle, priceMul, careerBoard, careerHub, careerSyncFromHub, careerNewRun, careerEnd,
  buildMission, careerShop, careerConsPrice, careerPotionPrice, buyShopItem, buyCareerCons, creditPrice, buyWithCredits, careerSell, findItem, upgradeInfo, smithUpgrade, repairCost, smithRepair, smithRepairAll,
  enchantInfo, smithEnchant, smithSalvage, craft, healCost, cureInjury, blessingCost, buyBlessing, hireCost, hireCompanion, dismissCompanion, partyOffers, partyJoin, partyLeave, partyLeaveFee, rumorCost, buyRumor, rumorText,
  addXp: E.addXp,
});
})(typeof globalThis !== 'undefined' ? globalThis : this);
