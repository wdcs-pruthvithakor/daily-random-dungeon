'use strict';
/* UI base: state, save, helpers and shared components. */
(function (root) {
const E = root.Engine, D = root.DATA;
const UI = root.UI = { views: {}, actions: {} };
UI.E = E; UI.D = D;

UI.NODE_ICON = { combat: '⚔️', elite: '☠️', treasure: '🎁', shrine: '⛩️', rest: '🔥', merchant: '💰', camp: '⛺', secret: '❓', boss: '👑', event: '🎭', trap: '🪤', puzzle: '🧩', missing: '🆘', relic: '🏺', unknown: '❔' };
UI.NODE_NAME = { combat: 'Monsters', elite: 'Elite enemy', treasure: 'Treasure chamber', shrine: 'Shrine', rest: 'Rest chamber', merchant: 'Merchant', camp: 'Abandoned camp', secret: 'Suspicious wall', boss: 'Boss chamber', event: 'Strange encounter', trap: 'Trapped passage', puzzle: 'Puzzle room', missing: 'Signs of the missing', relic: 'Sealed chamber', unknown: 'Unknown room' };
UI.NODE_HINT = { combat: 'A fight. Safe XP and loot.', elite: 'Mutated foe. Better loot, more danger.', treasure: 'A chest. Gold or gear.', shrine: 'Pray for a blessing. Or a curse.', rest: 'Heal 40% HP and restore energy.', merchant: 'Spend gold on gear and supplies.', camp: 'Search for supplies. Lore inside.', secret: 'Something hidden. Your luck found it.', boss: 'The end of the dungeon.', event: 'Something unusual. Choices matter.', trap: 'A hazard. Use your skills.', puzzle: 'A challenge for the mind or the muscle.', missing: 'The missing expedition may be near.', relic: 'The relic is guarded by something fierce.', unknown: 'The fog hides what lies within.' };
UI.THEME_CLASS = { catacombs: 'th-catacombs', warrens: 'th-warrens', crystal: 'th-crystal', sunken: 'th-sunken', fungal: 'th-fungal', forge: 'th-forge', frozen: 'th-frozen', fortress: 'th-fortress', machine: 'th-machine', graveyard: 'th-graveyard' };
UI.THEME_AURA = { catacombs: '#a78bff', warrens: '#9bd24a', crystal: '#5adcff', sunken: '#3cc8be', fungal: '#c68bff', forge: '#ff7a3c', frozen: '#9ad8ff', fortress: '#b36bd0', machine: '#7fb0ff', graveyard: '#e0d08a' };
UI.SLOT_ICON = { weapon: '🗡️', offhand: '🛡️', head: '🪖', chest: '🥋', hands: '🧤', feet: '🥾', ring: '💍', amulet: '📿' };
UI.TABS = [
  { id: 'home', icon: '🏠', name: 'Home' }, { id: 'daily', icon: '⚔️', name: 'Daily' }, { id: 'career', icon: '👑', name: 'Career' },
  { id: 'codex', icon: '📖', name: 'Codex' }, { id: 'vault', icon: '🎒', name: 'Vault' }, { id: 'guide', icon: '❓', name: 'Guide' },
];
UI.VALID = { daily: ['dailyhome', 'roll', 'prep', 'map', 'combat', 'event', 'end'], career: ['careerhome', 'careerroll', 'hub', 'map', 'combat', 'event', 'end'] };

// ---------- save ----------
const KEY = 'drd_save_v2', OLD_KEY = 'drd_save_v1';
UI.DEFAULT = () => ({
  v: 2, gold: 0, vault: [], clears: { F: 0, E: 0, D: 0 },
  journal: { races: [], profs: [], monsters: [], bosses: [], secrets: 0, clues: 0, events: [], anomalies: [], mats: [], missions: 0 },
  best: 0, runs: 0, last: null, career: null, careerRolls: null, fallen: [],
  slot: 0, parked: {},   // career slots: `career` is the active one, the others wait in `parked`
});
let memSave = null;
UI.loadSave = function () {
  const base = UI.DEFAULT();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = Object.assign(base, JSON.parse(raw));
      s.journal = Object.assign(base.journal, s.journal);
      s.vault = (s.vault || []).map(E.normalizeItem);
      if (s.career) { s.career.stash = (s.career.stash || []).map(E.normalizeItem); }
      s.parked = s.parked || {}; s.slot = s.slot || 0;
      for (const k in s.parked) s.parked[k].stash = (s.parked[k].stash || []).map(E.normalizeItem);
      return s;
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) { // carry over what still makes sense from the first prototype
      const o = JSON.parse(old);
      base.gold = o.gold || 0; base.clears = Object.assign(base.clears, o.clears || {}); base.best = o.best || 0; base.runs = o.runs || 0; base.last = o.last || null;
      if (o.journal) for (const k of ['races', 'profs', 'monsters', 'bosses']) base.journal[k] = o.journal[k] || [];
      base.journal.secrets = (o.journal && o.journal.secrets) || 0; base.journal.clues = (o.journal && o.journal.clues) || 0;
    }
  } catch (e) { /* storage unavailable */ }
  return memSave || base;
};
UI.persist = function () {
  memSave = UI.S.save;
  try { localStorage.setItem(KEY, JSON.stringify(UI.S.save)); } catch (e) { /* ignore */ }
};
UI.today = function () {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const S = UI.S = {
  tab: 'home', mode: 'daily', screen: 'dailyhome', codex: 'races', hubTab: 'board', smithSel: null, save: UI.loadSave(), rolls: [], picked: 0, rank: 'F', picks: {}, run: null, hub: null,
  ev: null, rollSeed: null, date: UI.today(), msg: '', prev: null, prevFor: null, pendingFight: null, hardcore: false, sectionOpen: {},
};

// ---------- helpers ----------
UI.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
UI.pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100));
UI.bar = (cur, max, cls) => `<div class="bar ${cls}"><i style="width:${UI.pct(cur, max)}%"></i></div>`;
UI.tierOf = id => E.TIERS[E.TIER_BY[id]];
UI.tierTag = id => `<span class="tag" style="color:${UI.tierOf(id).color};border-color:${UI.tierOf(id).color}">${UI.tierOf(id).name}</span>`;
UI.raceColor = n => E.RACE_TIER_COLOR[E.RACE_BY[n].tier];
UI.kindOf = prof => E.PROF_BY[prof].kind;
UI.runActive = () => !!S.run && ['map', 'combat', 'event'].includes(S.screen);
UI.rankUnlocked = r => r === 'F' || (r === 'E' && S.save.clears.F >= 1) || (r === 'D' && S.save.clears.E >= 1);
UI.guildRank = () => S.save.clears.E >= 1 ? 'D' : S.save.clears.F >= 1 ? 'E' : 'F';
UI.addUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };
UI.ctxRun = () => (S.screen === 'hub' ? S.hub : S.run);
UI.fmt = n => Math.round(n).toLocaleString();
const { esc, bar } = UI;

// ---------- components ----------
UI.statBlock = function (c, d, spend) {
  const rows = E.STATS.map(s => {
    const total = d ? d.st[s] : c.stats[s];
    const btn = spend && c.points > 0 ? `<button class="tiny" data-act="alloc" data-stat="${s}">+</button>` : '';
    return `<div class="stat" title="${E.STAT_NAMES[s]}: ${E.STAT_ROLE[s]}"><span>${s}</span><span><b>${total}</b> ${btn}</span></div>`;
  }).join('');
  const luck = d ? d.st.LUK : c.luck;
  return `<div class="stats">${rows}<div class="stat luck ${luck >= 10 ? 'hi' : ''}" title="${E.STAT_ROLE.LUK}"><span>LUK</span><b>${luck}</b></div></div>`;
};
UI.itemBlock = function (it, buttons, opts) {
  const o = opts || {}, r = E.RARITIES[it.rarity];
  const durPct = it.maxDur ? Math.round(100 * it.dur / it.maxDur) : 100;
  const durBar = it.maxDur && !(it.unknown && !it.revealed) ? `<div class="bar dur" title="Durability ${it.dur}/${it.maxDur}"><i style="width:${durPct}%;${durPct <= 25 ? 'background:#ff5a5a' : ''}"></i></div>` : '';
  return `<div class="item r${it.rarity} ${o.sel ? 'sel' : ''}" style="--c:${r.color}"><div class="slot">${UI.SLOT_ICON[it.slot]}</div><div class="body"><div><b style="color:${r.color}">${esc(E.itemTitle(it))}</b> <span class="dim small">${r.name} ${E.SLOT_NAMES[it.slot].toLowerCase()}${it.dur === 0 ? ' · <span style="color:var(--bad)">BROKEN</span>' : ''}</span></div><div class="small dim">${esc(E.itemLine(it))}</div>${durBar}</div><div class="row">${buttons || ''}</div></div>`;
};
UI.logBlock = (run, n) => `<div class="log" id="log">${run.log.slice(-n).map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
UI.portrait = (c, size) => Art.portrait(c, size);

// ---------- career slots ----------
UI.CAREER_SLOTS = 3;
UI.slotBar = function () {
  const sv = S.save;
  const btns = [...Array(UI.CAREER_SLOTS).keys()].map(n => {
    const car = n === sv.slot ? sv.career : sv.parked[n], on = n === sv.slot;
    const label = car ? `${esc(car.char.name)} · ${esc(car.char.prof)} · Lv ${car.char.level} · rank ${E.careerRank(car)}${car.hardcore ? ' · ☠️' : ''}` : 'Empty slot';
    return `<button class="slotbtn ${on ? 'on' : ''}" data-act="slotswitch" data-n="${n}" ${on ? 'aria-current="true"' : ''}><b>Slot ${n + 1}</b><span>${label}</span></button>`;
  }).join('');
  return `<div class="panel slotbar"><div class="small dim">Career slots: pursue several adventurers at once. Each slot keeps its own character, world, gold and stash. Switch any time between expeditions.</div><div class="slots">${btns}</div></div>`;
};
UI.charCard = function (c, i, chooseBtn) {
  const prof = E.PROF_BY[c.prof], race = E.RACE_BY[c.race], t = UI.tierOf(c.tier);
  const talents = c.talents.map(id => `<div class="small"><b>${esc(E.TALENT_BY[id].name)}:</b> <span class="dim">${esc(E.TALENT_BY[id].desc)}</span></div>`).join('');
  const total = E.STATS.reduce((a, s) => a + c.stats[s], 0);
  return `<div class="panel charcard tier-${c.tier}" style="border-color:${t.color};--glow:${t.color}55">
    <div class="charhead">${UI.portrait(c, 104)}<div class="info">
      <div class="charname">${esc(c.name)}</div>
      <div><span style="color:${UI.raceColor(c.race)}">${esc(c.race)}</span></div>
      <div class="badge" style="color:${t.color}">${Art.emblem(prof.kind, t.color, 22)} <b>${esc(c.prof)}</b></div>
      <div style="margin-top:6px">${UI.tierTag(c.tier)}<span class="tag">${Art.KIND_LABEL[prof.kind]}</span><span class="tag">${c.potential}</span>${c.misfit ? '<span class="tag" style="color:var(--accent)">Misfit +2 LUK</span>' : ''}${c.heritage ? `<span class="tag" style="color:var(--accent)" title="A high-tier race in a lower class is compensated">Heritage +${c.heritage.pts} skill pt, +${Math.round(c.heritage.xp * 100)}% XP</span>` : ''}</div>
    </div></div>
    ${UI.statBlock(c, null, false)}
    <div class="small dim">Stat total ${total} · ${c.ppl} points per level</div>
    <div class="small" style="margin-top:6px"><b>Race:</b> <span class="dim">${esc(race.trait)}</span></div>
    <div class="small"><b>Drawback:</b> <span class="dim">${esc(prof.drawback)}</span></div>
    ${talents}
    <div class="small"><b>Hidden:</b> <span class="dim">???</span></div>${c.pastLife ? '<div class="small"><b>Past life:</b> <span class="dim">??? (wakes at levels 5, 15 and 30)</span></div>' : ''}
    <div class="small dim" style="margin:6px 0">Skills: ${E.loadout(c).map(id => E.SKILLS[id].name).join(', ')}</div>
    ${chooseBtn ? `<button class="primary" data-act="${chooseBtn}" data-i="${i}">Choose ${esc(c.name)} <kbd>${i + 1}</kbd></button>` : ''}
  </div>`;
};

// equipment grid: all slots with unequip buttons
UI.equipPanel = function (run, canAct) {
  const slots = E.SLOTS.map(s => {
    const it = run.equip[s];
    if (!it) return `<div class="item dim small"><div class="slot">${UI.SLOT_ICON[s]}</div><div class="body">${E.SLOT_NAMES[s]}: empty</div></div>`;
    return UI.itemBlock(it, canAct ? `<button class="tiny" data-act="unequip" data-slot="${s}">Unequip</button>` : '');
  }).join('');
  return `<div class="panel"><h3>Equipment</h3>${slots}</div>`;
};
UI.injuryTags = function (c) {
  return (c.injuries || []).map(i => `<span class="tag" style="color:var(--bad);border-color:var(--bad)" title="${esc(E.INJURIES[i.id].desc)}">${E.INJURIES[i.id].icon} ${E.INJURIES[i.id].name} (${i.left})</span>`).join('');
};
UI.sheetPanel = function (run, spend) {
  const c = run.char, d = run.d;
  const pts = c.points > 0 ? `<div class="small" style="color:var(--accent)">${c.points} stat point(s) to spend</div>` : '';
  const inj = UI.injuryTags(c);
  return `<div class="panel"><h3>Character</h3>${pts}${UI.statBlock(c, d, spend)}
    <div class="small dim">ATK power ${d.power.toFixed(1)} · DEF ${d.def} · Crit ${Math.round(d.crit * 100)}% · Evade ${Math.round(d.evade * 100)}% · HP ${d.maxHp} · ${d.resName} ${d.maxEn}${d.lifesteal ? ' · Lifesteal ' + Math.round(d.lifesteal * 100) + '%' : ''}${d.thorns ? ' · Thorns ' + Math.round(d.thorns * 100) + '%' : ''}</div>
    <div class="small dim">Talents: ${c.talents.map(t => E.TALENT_BY[t].name).join(', ')}${c.hiddenRevealed ? ' · Hidden: ' + E.HIDDEN_TRAITS.find(h => h.id === c.hidden).name : ''}</div>
    ${c.pastLife ? `<div class="small" style="color:var(--accent)">Past life: ${c.awakened ? 'you were ' + E.PAST_BY[c.pastLife].name : '???'} · awakening ${c.awakened}/3${c.awakened < 3 ? ' (next at level ' + E.AWAKEN_AT[c.awakened] + ')' : ''}</div>` : ''}
    ${inj ? `<div style="margin-top:6px">${inj}</div>` : ''}</div>`;
};
UI.skillsPanel = function (run, canAct) {
  const c = run.char, kind = UI.kindOf(c.prof);
  const learn = E.learnableSkills(c);
  const known = c.skills.map(id => E.SKILLS[id]);
  const row = s => {
    const known_ = c.skills.includes(s.id), why = known_ ? null : E.canLearn(c, s.id);
    const eq = c.loadout.includes(s.id);
    const mr = E.masteryRank(c, s.id), mname = E.MASTERY[mr].name, uses = c.mastery[s.id] || 0;
    const ev = E.effSkill(c, s.id), evOpt = known_ && E.EVOLUTIONS[s.type];
    const evBlock = !evOpt || s.kinds.includes('sig') ? '' : (E.evoChoice(c, s.id) ? `<div class="small" style="color:var(--accent)">Evolved: <b>${esc(ev.evo.name)}</b> (${esc(ev.evo.desc)})</div>`
      : (canAct ? ['a', 'b'].map(br => { const o = E.EVOLUTIONS[s.type][br], why = E.canEvolve(c, s.id); return `<button class="tiny" data-act="evolve" data-id="${s.id}" data-br="${br}" ${why ? 'disabled' : ''} title="${esc(why || 'Costs 1 skill point')}">Evolve: ${esc(o.name)} (${esc(o.desc)})</button>`; }).join(' ') : ''));
    const btn = known_ ? (canAct ? `<button class="tiny ${eq ? 'primary' : ''}" data-act="lo" data-id="${s.id}">${eq ? 'Equipped' : 'Equip'}</button>` : (eq ? '<span class="tag" style="color:var(--accent)">Equipped</span>' : ''))
      : (canAct ? `<button class="tiny" data-act="learn" data-id="${s.id}" ${why ? 'disabled' : ''}>${why || 'Learn (1 pt)'}</button>` : `<span class="tag">Lv ${s.lvl}</span>`);
    return `<div class="item ${known_ ? '' : 'locked'}" style="--c:${known_ ? '#8fd0ff' : '#555'}"><div class="slot">✨</div><div class="body"><div><b>${esc(s.name)}</b>${s.exclusive ? ' <span class="tag" style="color:var(--accent)">Exclusive</span>' : ''} <span class="dim small">${s.ap} AP${s.en ? ' · ' + s.en + ' energy' : ''}${s.once ? ' · once' : ''} · Lv ${s.lvl}${known_ ? ' · ' + mname + ' (' + uses + ' uses, +' + mr * 8 + '%)' : ''}</span></div><div class="small dim">${esc(s.desc)}</div>${s.punish || s.interrupt || s.parry ? '<div class="small" style="color:#8fd0ff">Reactive: reads the enemy\'s next move</div>' : ''}${evBlock}</div><div class="row">${btn}</div></div>`;
  };
  const books = known.filter(s => s.kinds.includes('book')).map(row).join('');
  const sig = E.sigSkill(c);
  return `<div class="panel"><h3>Skills · ${Art.KIND_LABEL[kind]}</h3>
    <div class="small dim">Skill points: <b style="color:var(--accent)">${c.skillPts}</b> · Equipped ${c.loadout.length}/${E.slotCap(c)}. Skills grow stronger with use.${sig ? ' Signature: <b>' + E.SKILLS[sig].name + '</b> is always equipped.' : ''}</div>
    ${learn.map(row).join('')}${books ? '<h3 style="margin-top:10px">Tomes</h3>' + books : ''}</div>`;
};
UI.consPanel = function (run, opts) {
  const o = opts || {}, inCombat = !!o.combat;
  const ids = Object.keys(run.cons).filter(k => run.cons[k] > 0 && E.CONSUMABLES[k]);
  if (!ids.length && !o.empty) return '';
  const rows = ids.map(id => {
    const d = E.CONSUMABLES[id];
    const usable = inCombat ? d.use !== 'map' : d.use !== 'combat';
    return `<button class="cons" data-act="usecons" data-id="${id}" ${usable ? '' : 'disabled'} title="${esc(d.desc)}"><span class="g">${d.glyph}</span><b>${esc(d.name)}</b> ×${run.cons[id]}<small>${esc(d.desc)}</small></button>`;
  }).join('');
  return `<div class="panel"><h3>Consumables</h3>${rows ? `<div class="conslist">${rows}</div>` : '<p class="dim small">None. Buy supplies in town, craft them, or find them in dungeons.</p>'}</div>`;
};
UI.matsLine = function (mats) {
  const ids = Object.keys(mats).filter(k => mats[k] > 0);
  if (!ids.length) return '<span class="dim small">No materials.</span>';
  return ids.map(k => `<span class="tag" title="${esc(E.MATERIALS[k].name)}">${E.MATERIALS[k].glyph} ${esc(E.MATERIALS[k].name)} ×${mats[k]}</span>`).join('');
};
UI.invPanel = function (run, label, opts) {
  const o = opts || {};
  if (!run.inv.length) return o.empty ? `<div class="panel"><h3>${label}</h3><p class="dim small">${o.empty}</p></div>` : '';
  const items = run.inv.map(it => UI.itemBlock(it, `<button class="tiny" data-act="equip" data-id="${it.id}">Equip</button><button class="tiny" data-act="sell" data-id="${it.id}">Sell ${E.sellValue(it)}g</button>${o.salvage ? `<button class="tiny" data-act="salvage" data-id="${it.id}">Salvage</button>` : ''}`)).join('');
  return `<div class="panel"><h3>${label}</h3>${items}</div>`;
};
UI.anomalyBanner = function (an) {
  if (!an) return '';
  const a = E.ANOMALIES[an];
  return `<div class="anom" title="${esc(a.desc)}"><span>${a.icon}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`;
};
})(typeof globalThis !== 'undefined' ? globalThis : this);
