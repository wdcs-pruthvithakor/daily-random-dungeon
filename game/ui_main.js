'use strict';
/* UI main: flow, actions, rendering, init. */
(function (root) {
const UI = root.UI, E = UI.E, D = UI.D, S = UI.S, V = UI.views, A = UI.actions;
const { esc, tierOf, addUnique } = UI;

// ---------- rendering ----------
function renderChrome() {
  const sv = S.save, car = sv.career;
  document.getElementById('top').innerHTML = `<div class="brand">Daily Random Dungeon<small>Roll. Delve. Ascend.</small></div>
    <div class="wallet">Banked gold <b>${UI.fmt(sv.gold)}</b>${car ? ` · Career gold <b>${UI.fmt(car.gold)}</b>` : ''}<br>Vault ${sv.vault.length}/24 · Daily rank ${UI.guildRank()}${car ? ` · Career rank ${E.careerRank(car)}` : ''}</div>`;
  const active = UI.runActive();
  document.getElementById('tabs').innerHTML = UI.TABS.map(t => {
    const blocked = active && (t.id === 'daily' || t.id === 'career') && S.mode !== t.id;
    const dot = active && S.mode === t.id && (t.id === 'daily' || t.id === 'career') ? '<span class="dot" title="Run in progress"></span>' : '';
    return `<button class="tab ${S.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}" ${blocked ? 'disabled title="Finish or extract your current run first"' : ''}>${t.icon} ${t.name}${dot}</button>`;
  }).join('');
}
function viewMain() {
  switch (S.tab) {
    case 'home': return V.home();
    case 'daily': case 'career': return V[S.screen]();
    case 'codex': return V.codex();
    case 'vault': return V.vault();
    default: return V.guide();
  }
}
UI.render = function (keepScroll) {
  renderChrome();
  document.getElementById('main').innerHTML = (S.msg ? `<div class="panel small toast">${esc(S.msg)}</div>` : '') + viewMain();
  S.msg = '';
  if (UI.afterRender) UI.afterRender();
  const log = document.getElementById('log');
  if (log) log.scrollTop = log.scrollHeight;
  if (!keepScroll) window.scrollTo(0, 0);
};

// ---------- run flow ----------
function note(msg) { S.msg = msg; }
function beginCombat(type) {
  const run = S.run;
  E.startCombat(run, type);
  run.combat.enemies.forEach(e => { addUnique(S.save.journal.monsters, e.base); if (e.boss) addUnique(S.save.journal.bosses, e.base); });
  S.screen = 'combat'; S.prev = null; S.prevFor = null;
}
function startRunCommon(run) {
  S.run = run; S.ev = null; S.screen = 'map';
  if (run.dungeon.anomaly) addUnique(S.save.journal.anomalies, run.dungeon.anomaly);
}
UI.startRun = startRunCommon;
function endRun(outcome) {
  const run = S.run, sv = S.save, rank = E.RANKS[run.rankId];
  let res;
  const career = S.mode === 'career';
  if (career) {
    res = E.careerEnd(sv.career, run, outcome);
  } else {
    res = { gold: 0, banked: [], mats: {}, penalties: [], mission: null };
    if (outcome === 'cleared') { run.stats.rooms++; run.gold += Math.round(40 * rank.rewards); sv.clears[run.rankId]++; }
    if (outcome !== 'dead') {
      res.gold = run.gold; sv.gold += run.gold;
      const found = run.inv.concat(Object.values(run.equip).filter(i => i && !i.fromVault && !i.starter));
      for (const it of found) {
        if (it.fromVault) continue;
        const clean = Object.assign({}, it, { fromVault: false });
        sv.vault.push(clean); res.banked.push(clean);
      }
      while (sv.vault.length > 24) {
        const idx = sv.vault.reduce((m, it, i, a) => (it.value < a[m].value ? i : m), 0);
        sv.gold += E.sellValue(sv.vault[idx]); sv.vault.splice(idx, 1);
      }
    }
    sv.runs++; sv.best = Math.max(sv.best, run.stats.rooms);
  }
  const j = sv.journal;
  j.clues += run.clues || 0; j.secrets += run.stats.secrets || 0;
  for (const k of Object.keys(run.mats)) addUnique(j.mats, k);
  if (res.mission && res.mission.done) j.missions++;
  const c = run.char, th = run.dungeon.theme.name;
  const line = outcome === 'cleared' ? `You defeated ${th}'s guardian with ${run.stats.rooms} rooms cleared.`
    : outcome === 'extracted' ? `You left ${th} after ${run.stats.rooms} room(s) with your loot intact.`
    : career ? (res.permadeath ? `${c.name} fell in ${th}. In hardcore mode, that is the end.` : `You fell in ${th} after ${run.stats.rooms} room(s) and woke up at the Guild, injured.`) : `You fell in ${th} after ${run.stats.rooms} room(s).`;
  const share = `${career ? 'Daily Random Dungeon - Career' : 'Daily Random Dungeon ' + S.date}\n${c.name} the ${c.race} ${c.prof} (${tierOf(c.tier).name}, LUK ${run.d.st.LUK})\n${th} [${run.rankId}]${run.dungeon.anomaly ? ' ' + E.ANOMALIES[run.dungeon.anomaly].name : ''} - ${outcome === 'cleared' ? 'CLEARED' : outcome === 'extracted' ? 'extracted' : 'died'} · rooms ${run.stats.rooms} · heat ${run.heat} · Lv ${c.level}${run.stats.secrets ? ' · secret found' : ''}${res.mission && res.mission.done ? ' · mission complete' : ''}`;
  sv.last = share;
  if (career && res.permadeath) {
    const car = sv.career;
    sv.fallen.push({ name: c.name, prof: c.prof, level: c.level, rank: E.careerRank(car), runs: car.runs });
    sv.career = null;
  }
  S.ev = Object.assign({ outcome, line, share, career }, res);
  S.screen = 'end';
  UI.persist();
}
function advance() {
  const run = S.run;
  if (run.dead) return endRun('dead');
  E.advanceRoom(run);
  S.screen = 'map'; S.ev = null;
}
function setupHub() {
  const car = S.save.career;
  S.mode = 'career'; S.hub = E.careerHub(car); S.run = null; S.ev = null; S.screen = 'hub';
}
function hubDone(res) {
  if (res && res.msg) note(res.msg);
  if (S.hub) E.refresh(S.hub);
  UI.persist();
}

// ---------- actions ----------
Object.assign(A, {
  tab(d) {
    const t = d.tab;
    if (t === 'daily' || t === 'career') {
      if (UI.runActive() && S.mode !== t) return;
      if (S.mode !== t || !UI.VALID[t].includes(S.screen)) {
        if (t === 'daily') { S.mode = 'daily'; S.screen = 'dailyhome'; }
        else if (S.save.career) setupHub();
        else { S.mode = 'career'; S.screen = 'careerhome'; }
      }
    }
    S.tab = t;
  },
  codex(d) { S.codex = d.sub; },
  guide(d) { S.guide = d.sub; },
  hubtab(d) { S.hubTab = d.sub; },
  dailyhome() { S.tab = 'daily'; S.mode = 'daily'; S.screen = 'dailyhome'; },
  careerhome() { S.tab = 'career'; S.mode = 'career'; if (S.save.career) setupHub(); else S.screen = 'careerhome'; },
  rank(d) { if (UI.rankUnlocked(d.rank)) S.rank = d.rank; },
  roll() {
    S.rolls = E.rollThree(S.rollSeed || S.date);
    S.rolls.forEach(c => { addUnique(S.save.journal.races, c.race); addUnique(S.save.journal.profs, c.prof); });
    UI.persist(); S.screen = 'roll';
  },
  rollrandom() { S.rollSeed = 'random-' + Date.now() + '-' + Math.random(); A.roll(); },
  rolldaily() { S.rollSeed = null; A.roll(); },
  reroll() {
    if (S.save.gold < 50) return;
    S.save.gold -= 50; S.rollSeed = 'reroll-' + Date.now();
    A.roll();
  },
  pick(d) { S.picked = +d.i; S.picks = {}; S.screen = 'prep'; },
  vpick(d) { S.picks[d.slot] = S.picks[d.slot] === d.id ? null : d.id; },
  vsell(d) {
    const sv = S.save, idx = sv.vault.findIndex(i => i.id === d.id);
    if (idx >= 0) { sv.gold += E.sellValue(sv.vault[idx]); sv.vault.splice(idx, 1); UI.persist(); }
  },
  start() {
    const picks = {};
    for (const slot in S.picks) if (S.picks[slot]) picks[slot] = S.save.vault.find(i => i.id === S.picks[slot]);
    S.mode = 'daily';
    startRunCommon(E.newRun(S.rolls[S.picked], S.date, S.rank, picks));
  },
  hardcore(d, el) { S.hardcore = !!el.checked; },
  careerbegin() {
    const sv = S.save;
    if (!sv.careerRolls) {
      sv.careerRolls = E.rollThree('career-' + Date.now() + '-' + Math.random());
      sv.careerRolls.forEach(c => { addUnique(sv.journal.races, c.race); addUnique(sv.journal.profs, c.prof); });
      UI.persist();
    }
    S.mode = 'career'; S.screen = 'careerroll';
  },
  careerreroll() { S.save.careerRolls = null; A.careerbegin(); },
  careerpick(d) {
    const sv = S.save;
    sv.career = E.careerStart(sv.careerRolls[+d.i], { hardcore: S.hardcore, worldSeed: S.worldSeed });
    sv.careerRolls = null; S.hubTab = 'map'; UI.persist();
    setupHub();
  },
  slotswitch(d) {
    const sv = S.save, n = +d.n;
    if (S.run || n === sv.slot || !(n >= 0 && n < UI.CAREER_SLOTS)) return;
    if (A.mapstop) A.mapstop();
    if (sv.career) sv.parked[sv.slot] = sv.career; else delete sv.parked[sv.slot];
    sv.career = sv.parked[n] || null; delete sv.parked[n];
    sv.slot = n; sv.careerRolls = null;
    S.hub = null; S.settle = null; S.townAt = null; S.msg = ''; S.hubTab = 'map';
    UI.persist();
    if (sv.career) setupHub(); else { S.mode = 'career'; S.screen = 'careerhome'; }
  },
  careerhub() { S.tab = 'career'; if (S.save.career) setupHub(); else { S.mode = 'career'; S.screen = 'careerhome'; } },
  embark(d) {
    const car = S.save.career;
    S.mode = 'career';
    startRunCommon(E.careerNewRun(car, E.careerBoard(car)[+d.i]));
  },
  freerun(d) {
    const car = S.save.career;
    S.mode = 'career';
    startRunCommon(E.careerNewRun(car, { free: true, seed: `f|${car.char.name}|${car.boardN}|${d.rank}`, rank: d.rank }));
  },
  refreshboard() {
    const car = S.save.career;
    if (car.gold < 40) return;
    car.gold -= 40; car.boardN++; car.board = null; car.shop = null; car.rumor = false;
    hubDone({ msg: 'The board is refreshed.' });
  },
  retire() { if (window.confirm('Retire this career? The character is lost for good.')) { S.save.career = null; S.screen = 'careerhome'; UI.persist(); } },
  wipe() { if (window.confirm('Erase all saved progress?')) { S.save = UI.DEFAULT(); UI.persist(); } },

  // character management (hub or run)
  alloc(d) { E.allocate(UI.ctxRun(), d.stat); if (S.screen === 'hub') hubDone(); },
  learn(d) { const r = UI.ctxRun(); if (E.learnSkill(r.char, d.id)) note(`Learned ${E.SKILLS[d.id].name}.`); if (S.screen === 'hub') hubDone(); },
  evolve(d) { const r = UI.ctxRun(); if (E.evolveSkill(r.char, d.id, d.br)) { note('Skill evolved.'); E.refresh(r); } if (S.screen === 'hub') hubDone(); },
  lo(d) { const r = UI.ctxRun(); if (!E.toggleLoadout(r.char, d.id)) note(`You can equip ${E.slotCap(r.char)} skills at most.`); if (S.screen === 'hub') hubDone(); },
  equip(d) { E.equipItem(UI.ctxRun(), d.id); if (S.screen === 'hub') hubDone(); },
  unequip(d) { E.unequipItem(UI.ctxRun(), d.slot); if (S.screen === 'hub') hubDone(); },
  sell(d) {
    if (S.screen === 'hub') { const v = E.careerSell(S.save.career, d.id); hubDone({ msg: `Sold for ${v} gold.` }); } else E.sellItem(S.run, d.id);
  },
  salvage(d) { const r = E.smithSalvage(S.save.career, d.id); hubDone(r); },
  usecons(d) {
    const run = UI.ctxRun();
    if (S.screen === 'hub' && d.id === 'escape_scroll') return note('Escape scrolls are for dungeons.');
    const r = E.useConsumable(run, d.id);
    if (!r.ok) return note(r.msg);
    if (S.screen === 'hub') { hubDone(); return; }
    if (r.escaped) endRun('extracted');
  },
  potion() { if (E.usePotion(S.run)) S.run.log.push('You drink a potion.'); },
  extract() { endRun('extracted'); },

  // dungeon nodes
  node(d) {
    const run = S.run, type = d.type, node = { type, id: d.id };
    run.trail = run.trail || {}; run.trail[run.row] = d.id || d.type;
    E.enterNode(run, node);
    if (['combat', 'elite', 'boss', 'secret', 'relic'].includes(type)) return beginCombat(type);
    S.screen = 'event';
    if (type === 'treasure') {
      const t = E.treasureChest(run);
      const lines = [t.gold ? `You find ${t.gold} gold.` : 'You open the chest.'];
      if (t.mat) lines.push(`Among the coins: a ${E.MATERIALS[t.mat].name}.`);
      S.ev = { icon: 'treasure', title: 'Treasure chamber', lines, items: t.item ? [t.item] : [] };
    } else if (type === 'rest') {
      const h = E.restRoom(run);
      S.ev = { icon: 'rest', title: 'Rest chamber', lines: [`You rest, recover ${h} HP, restore your ${run.d.resName.toLowerCase()}, and clear afflictions.`] };
    } else if (type === 'shrine') S.ev = { icon: 'shrine', kind: 'shrine', title: 'Shrine' };
    else if (type === 'camp') S.ev = { icon: 'camp', kind: 'camp', title: 'Abandoned camp' };
    else if (type === 'merchant') S.ev = { icon: 'merchant', kind: 'merchant', title: 'Merchant', stock: E.merchantStock(run) };
    else if (type === 'missing') S.ev = { kind: 'dyn', icon: 'missing', title: 'The Missing Expedition', event: E.missingEvent(), res: null };
    else {
      const ev = E.pickEvent(run, type);
      addUnique(S.save.journal.events, ev.id);
      S.ev = { kind: 'dyn', glyph: ev.icon, title: ev.title, event: ev, res: null };
    }
  },
  choose(d) {
    const run = S.run, ev = S.ev;
    const res = E.resolveChoice(run, ev.event, +d.i);
    if (res.blocked) return note(res.lines[0]);
    ev.res = res;
    if (res.revealSecret) {
      const row = run.dungeon.rows[run.row + 1];
      if (row && !row.some(o => o.type === 'secret')) { row.push({ type: 'secret', id: `r${run.row + 1}s`, hidden: true }); res.lines.push('A hidden path will appear in the next room.'); }
    }
  },
  fightnow() { beginCombat(S.ev.res.fight); },
  pray() {
    const r = E.shrinePray(S.run);
    S.ev = { icon: 'shrine', title: 'Shrine', lines: [r.text], items: r.item ? [r.item] : [] };
  },
  search() {
    const run = S.run, r = E.campSearch(run);
    const lines = [r.lore, r.text], items = [];
    if (r.item) items.push(r.item);
    run.clues++;
    if (r.passage) {
      lines.push('Behind a collapsed crate you spot a hidden passage...');
      if (r.passage.gold) lines.push(`It holds ${r.passage.gold} gold.`);
      if (r.passage.item) items.push(r.passage.item);
    }
    S.ev = { icon: 'camp', title: 'Abandoned camp', lines, items };
  },
  camprest() {
    const run = S.run, h = Math.round(run.d.maxHp * 0.25);
    E.healHp(run, h);
    S.ev = { icon: 'camp', title: 'Abandoned camp', lines: [`You rest and recover some HP.`] };
  },
  buy(d) { E.buyStock(S.run, S.ev.stock, +d.i); },
  bpotion() { E.buyPotion(S.run); },
  next() { advance(); },

  // combat
  target(d) { const c = S.run.combat; if (!c.over && c.enemies[+d.i].hp > 0) c.target = +d.i; },
  skill(d) {
    const run = S.run, c = run.combat;
    const r = E.act(run, d.id, c.target);
    if (!r.ok) note(r.msg);
    const t = c.enemies[c.target];
    if (!t || t.hp <= 0) { const n = c.enemies.findIndex(e => e.hp > 0); if (n >= 0) c.target = n; }
  },
  cpotion() { const r = E.usePotionInCombat(S.run); if (!r.ok) note(r.msg); },
  endturn() {
    E.endTurn(S.run);
    const c = S.run.combat, n = c.enemies.findIndex(e => e.hp > 0);
    if (n >= 0 && (c.target >= c.enemies.length || c.enemies[c.target].hp <= 0)) c.target = n;
  },
  after() {
    const run = S.run, c = run.combat;
    if (run.escaped) return endRun('extracted');
    if (run.dead || !c.won) return endRun('dead');
    if (c.type === 'boss') return endRun('cleared');
    if (c.type === 'secret' || c.type === 'relic') {
      const rel = c.type === 'secret' ? E.claimSecret(run) : E.claimRelic(run);
      const m = run.mission;
      S.screen = 'event';
      S.ev = { icon: c.type === 'secret' ? 'secret' : 'relic', title: c.type === 'secret' ? 'The hidden chamber' : 'The sealed chamber', lines: [c.type === 'secret' ? 'Behind the guardian, a relic rests on a pedestal. Its true nature is hidden.' : `You recover ${m && m.objective.relicName ? 'the ' + m.objective.relicName : 'the relic'}. Its aura is strange.`], items: [rel] };
      return;
    }
    advance();
  },
  copy() {
    try { navigator.clipboard.writeText(S.ev.share); note('Copied to clipboard.'); } catch (e) { note('Select the text above and copy it manually.'); }
  },

  // hub services
  smithsel(d) { S.smithSel = S.smithSel === d.id ? null : d.id; },
  upgrade(d) { hubDone(E.smithUpgrade(S.save.career, d.id)); },
  repair(d) { hubDone(E.smithRepair(S.save.career, d.id)); },
  repairall() { hubDone(E.smithRepairAll(S.save.career)); },
  enchant(d) { hubDone(E.smithEnchant(S.save.career, d.id)); },
  craft(d) { hubDone(E.craft(S.save.career, d.id)); },
  shopbuy(d) { const car = S.save.career; if (E.buyShopItem(car, +d.i)) hubDone({ msg: 'Purchased. It is in your stash.' }); },
  consbuy(d) { if (E.buyCareerCons(S.save.career, d.id)) hubDone(); },
  potbuy() { if (E.buyCareerCons(S.save.career, 'potion')) hubDone(); },
  credbuy(d) { if (E.buyWithCredits(S.save.career, d.id)) hubDone({ msg: 'Purchased.' }); },
  cure(d) { hubDone(E.cureInjury(S.save.career, d.id)); },
  bless() { hubDone(E.buyBlessing(S.save.career)); },
  hire(d) { hubDone(E.hireCompanion(S.save.career, d.id)); },
  partyjoin(d) { hubDone(E.partyJoin(S.save.career, d.id)); },
  partyleave() { hubDone(E.partyLeave(S.save.career)); },
  dismiss() { hubDone(E.dismissCompanion(S.save.career)); },
  rumor() { hubDone(E.buyRumor(S.save.career)); },
});

// ---------- events ----------
const app = document.getElementById('app');
app.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = A[el.dataset.act];
  if (!act) return;
  const keep = ['target', 'skill', 'cpotion', 'alloc', 'equip', 'unequip', 'sell', 'potion', 'vpick', 'buy', 'bpotion', 'codex', 'guide', 'vsell', 'usecons', 'learn', 'evolve', 'lo', 'hubtab',
    'raceboon', 'bankdep', 'bankwd', 'respec', 'lesson', 'mapgo', 'mapstop', 'mappin', 'mappinhere', 'mapunpin', 'mapov', 'settleenter', 'settleleave', 'settletab', 'mapexplore', 'mapwarp', 'mapcopy', 'seedrandom', 'mapscout', 'mapchoose', 'mapdismiss', 'mapreturn', 'townat', 'smithsel', 'upgrade', 'repair', 'repairall', 'enchant', 'craft', 'shopbuy', 'consbuy', 'potbuy', 'credbuy', 'cure', 'bless', 'hire', 'dismiss', 'rumor', 'salvage', 'choose', 'hardcore', 'refreshboard'].includes(el.dataset.act);
  act(el.dataset, el);
  if (['hub', 'dailyhome', 'careerhome'].includes(S.screen) || ['tab', 'vsell', 'slotswitch'].includes(el.dataset.act)) UI.persist();
  UI.render(keep);
});
// roll screens: R rerolls, 1-3 choose a character, Esc goes back (the buttons are clicked, so the normal handler runs)
window.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target.tagName || ''))) return;
  const roll = S.screen === 'careerroll' ? { re: 'careerreroll', pick: 'careerpick', back: 'careerhome' } : S.screen === 'roll' ? { re: 'reroll', pick: 'pick', back: 'dailyhome' } : null;
  if (!roll) return;
  const k = ev.key.toLowerCase();
  const btn = k === 'r' ? document.querySelector(`[data-act="${roll.re}"]`) : /^[1-3]$/.test(k) ? document.querySelector(`[data-act="${roll.pick}"][data-i="${+k - 1}"]`) : k === 'escape' ? document.querySelector(`[data-act="${roll.back}"]`) : null;
  if (btn && !btn.disabled) { ev.preventDefault(); btn.click(); }
});
app.addEventListener('toggle', ev => {
  const d = ev.target;
  if (d.tagName === 'DETAILS' && d.dataset.sec) S.sectionOpen[d.dataset.sec] = d.open;
}, true);

UI.render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
