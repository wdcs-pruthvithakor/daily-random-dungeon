'use strict';
/* UI views: home, daily, run screens, codex, vault, guide. */
(function (root) {
const UI = root.UI, E = UI.E, D = UI.D, S = UI.S, V = UI.views;
const { esc, bar, tierOf, tierTag, raceColor, kindOf } = UI;

UI.detail = (id, title, html) => `<details class="sec" data-sec="${id}" ${S.sectionOpen[id] ? 'open' : ''}><summary>${title}</summary>${html}</details>`;

// ---------- home ----------
V.home = function () {
  const sv = S.save, car = sv.career, j = sv.journal;
  const career = car
    ? `<p>Continue with <b>${esc(car.char.name)}</b> the ${esc(car.char.race)} ${esc(car.char.prof)}, level <b>${car.char.level}</b>, Guild rank <b>${E.careerRank(car)}</b> (${E.repTitle(car.rep)}).</p><button class="primary big" data-act="tab" data-tab="career">Continue career</button>`
    : `<p>Start at level 1 and climb from F to S rank. Guild missions, shops, a blacksmith, alchemy, companions, injuries and levels that get brutally slow.</p><button class="primary big" data-act="tab" data-tab="career">Begin a career</button>`;
  const tiles = [
    ['Daily clears', sv.clears.F + sv.clears.E + sv.clears.D], ['Best depth', sv.best + ' rooms'], ['Runs', sv.runs], ['Professions found', `${j.profs.length}/${E.PROFESSIONS.length}`],
    ['Races found', `${j.races.length}/${E.RACES.length}`], ['Missions done', j.missions || 0],
  ].map(([k, v]) => `<div class="panel" style="text-align:center;margin:0"><div class="dim small">${k}</div><div style="font:700 24px var(--serif);color:var(--accent)">${v}</div></div>`).join('');
  const last = sv.last ? `<div class="panel"><h3>Last result</h3><pre class="share">${esc(sv.last)}</pre></div>` : '';
  return `<div class="herobox">${Art.hero()}<div class="herotext"><h1>Every run starts with a roll.</h1><div class="dim">Three adventurers. One choice. A dungeon that is different every day.</div><div class="small dim" style="margin-top:4px">Today's seed: ${S.date}</div></div></div>
  <div class="grid g2">
    <div class="panel modecard daily"><div class="ico-lg">⚔️</div><h2>Daily Dungeon</h2><p>Everyone gets the same dungeon today. Roll three characters, push as deep as you dare, and extract your loot before Heat catches you.</p><button class="primary big" data-act="tab" data-tab="daily">Play today's dungeon</button></div>
    <div class="panel modecard career"><div class="ico-lg">👑</div><h2>Career</h2>${career}</div>
  </div>
  <h3>Your legend</h3><div class="grid g3" style="margin-bottom:14px">${tiles}</div>${last}
  <p class="small dim"><button class="tiny danger" data-act="wipe">Reset all save data</button></p>`;
};

// ---------- daily ----------
V.dailyhome = function () {
  const ranks = ['F', 'E', 'D'].map(r => {
    const ok = UI.rankUnlocked(r), rk = E.RANKS[r];
    const d = E.generateDungeon(S.date, r);
    const an = d.anomaly ? E.ANOMALIES[d.anomaly] : null;
    return `<button class="panel ${S.rank === r ? 'primary' : ''}" style="text-align:left;margin:0" data-act="rank" data-rank="${r}" ${ok ? '' : 'disabled'}>
      <div class="row between"><b style="font:700 22px var(--serif)">${r}-rank</b>${ok ? '' : '<span>🔒</span>'}</div>
      <div class="small">${ok ? esc(d.theme.name) : r === 'E' ? 'Clear an F-rank dungeon' : 'Clear an E-rank dungeon'}</div>
      <div class="small dim">${rk.rooms} rooms${ok ? ' · boss ' + esc(d.theme.boss.name) : ''}</div>
      ${ok && an ? `<div class="small" style="color:var(--accent)">${an.icon} ${esc(an.name)}</div>` : ''}</button>`;
  }).join('');
  const last = S.save.last ? `<div class="panel"><h3>Last result</h3><pre class="share">${esc(S.save.last)}</pre></div>` : '';
  return `<div class="scene th-none motes"><h2>Daily Dungeon</h2><div class="dim">Seed ${S.date}. The layout, theme and anomaly are the same for everyone today; your adventurer is your own.</div></div>
    <div class="panel"><h3>Choose dungeon rank</h3><div class="grid g3">${ranks}</div></div>
    <div class="panel"><h3>Roll your adventurer</h3>
      <p class="small dim">Random rolls are free and different every time. The daily set is the same for everyone today.</p>
      <div class="row"><button class="primary big" data-act="rollrandom">🎲 Roll random characters</button><button class="big" data-act="rolldaily">📅 Roll today's daily characters</button></div></div>${last}`;
};
V.roll = function () {
  const cards = S.rolls.map((c, i) => UI.charCard(c, i, 'pick')).join('');
  return `<h2>Choose your adventurer</h2><p class="dim small">The other two are discarded. Hidden traits stay hidden until level 5.</p>
    <p class="row rollbar"><button data-act="reroll" ${S.save.gold >= 50 ? '' : 'disabled'}>Reroll all three (50 gold) <kbd>R</kbd></button><button data-act="dailyhome">Back <kbd>Esc</kbd></button></p>
    <div class="grid g3 rollcards">${cards}</div>`;
};
V.prep = function () {
  const c = S.rolls[S.picked], vault = S.save.vault;
  const slots = E.SLOTS.map(slot => {
    const items = vault.filter(i => i.slot === slot);
    if (!items.length) return '';
    return `<h3>${E.SLOT_NAMES[slot]}</h3>` + items.map(it => UI.itemBlock(it, `<button class="tiny ${S.picks[slot] === it.id ? 'primary' : ''}" data-act="vpick" data-slot="${slot}" data-id="${it.id}">${S.picks[slot] === it.id ? 'Equipped' : 'Equip'}</button>`)).join('');
  }).join('');
  return `<h2>Prepare</h2>
    <div class="grid g2">${UI.charCard(c, 0, null)}
    <div class="panel"><h3>Vault</h3>${slots || '<p class="dim small">Your vault is empty. Gear you carry out of a dungeon is stored here forever.</p>'}</div></div>
    <p class="row"><button class="primary big" data-act="start">Enter the ${S.rank}-rank dungeon</button><button data-act="roll">Back</button></p>`;
};

// ---------- run shared ----------
function themeClass(run) { return UI.THEME_CLASS[run.dungeon.theme.id] || 'th-none'; }
function sceneBanner(run, extra) {
  const th = run.dungeon.theme, rows = run.dungeon.rows.length + 1;
  const dots = [];
  for (let i = 0; i < rows; i++) dots.push(`<i class="${i < run.row ? 'done' : i === run.row ? 'now' : ''} ${i === rows - 1 ? 'boss' : ''}">${i === rows - 1 ? '👑' : i + 1}</i>`);
  return `<div class="scene dg ${themeClass(run)} motes" style="${UI.dungeonBgStyle(th.id)}"><div class="row between"><div><div style="font:700 20px var(--serif)">${th.name}</div><div class="small dim">${run.rankId}-rank${run.career ? ' expedition' : ' dungeon'} · Heat ${run.heat} · Room ${Math.min(run.row + 1, rows)}/${rows}</div></div>${extra || ''}</div>
    ${UI.anomalyBanner(run.dungeon.anomaly)}<div class="path">${dots.join('<span class="dim">-</span>')}</div></div>`;
}
function statusChips(run) {
  const t = [];
  if (run.poison) t.push(`☣ Poison ${run.poison}`);
  if (run.bleed) t.push(`🩸 Bleeding ${run.bleed}`);
  if (run.burn) t.push(`🔥 Burning ${run.burn}`);
  if (run.weak) t.push(`😵 Weakened ${run.weak}`);
  if (run.blessing) t.push('✨ Blessed');
  if (run.elixir) t.push('💪 Elixir');
  if (run.ward) t.push('🛡️ Warded');
  if (run.spirit) t.push(`👻 Spirit ${run.spirit.turns}`);
  if (run.buffs && run.buffs.dmg) t.push(`⚔ +${Math.round(run.buffs.dmg.pct * 100)}% dmg ${run.buffs.dmg.turns}`);
  if (run.buffs && run.buffs.evade) t.push(`💨 +${Math.round(run.buffs.evade.pct * 100)}% evade ${run.buffs.evade.turns}`);
  return t.map(x => `<span class="tag st">${x}</span>`).join('');
}
function runHeader(run, hit) {
  const c = run.char, d = run.d;
  const comp = (run.companion ? `<span class="tag" style="color:var(--good)">${D.COMPANIONS[run.companion.id].glyph} ${esc(run.companion.name)}</span>` : '') + (run.party ? `<span class="tag" style="color:var(--good)" title="${esc(run.party.members.map(m => m.name).join(', '))}">👥 ${esc(run.party.name)}</span>` : '');
  return `<div class="panel player ${hit ? 'hit' : ''}">
    <div class="row between"><div class="row" style="gap:10px">${UI.portrait(c, 46)}<div><b>${esc(c.name)}</b> <span style="color:${tierOf(c.tier).color}">${esc(c.prof)}</span><div class="small dim">Level ${c.level} · ${comp}</div></div></div>
    <div class="small">Gold at risk <b style="color:var(--accent)">${run.gold}</b> · Potions <b>${run.potions}</b> · Loot <b>${run.inv.length}</b></div></div>
    <div class="grid g3" style="gap:10px;margin-top:8px"><div><div class="small">HP ${Math.round(run.hp)}/${d.maxHp}</div>${bar(run.hp, d.maxHp, 'hp')}</div>
    <div><div class="small">${d.resName} ${run.en}/${d.maxEn}</div>${bar(run.en, d.maxEn, 'en')}</div>
    <div><div class="small dim">XP ${UI.fmt(c.xp)}/${UI.fmt(E.xpNeeded(c.level, run.career))}</div>${bar(c.xp, E.xpNeeded(c.level, run.career), 'xp')}</div></div>
    <div style="margin-top:6px">${statusChips(run)}${UI.injuryTags(c)}</div>
  </div>`;
}
function missionPanel(run) {
  const m = run.mission;
  if (!m) return '';
  const mt = D.MISSION_TYPES[m.type], met = E.missionMet(run);
  const opt = m.optional ? `<div class="small"><span class="tag" style="color:${E.optionalMet(run) ? 'var(--good)' : 'var(--dim)'}">${E.optionalMet(run) ? '✔' : '○'} Bonus: ${esc(m.optional.label)} (+${Math.round(m.optional.bonus * 100)}% gold)</span></div>` : '';
  return `<div class="panel mission"><div class="row between"><h3 style="flex:1">${mt.icon} ${mt.name}${m.emergency ? ' · EMERGENCY' : ''}</h3><span class="tag" style="color:${met ? 'var(--good)' : 'var(--accent)'}">${met ? 'Objective complete' : esc(E.missionProgress(run))}</span></div>
    <div class="small">${esc(m.objective.label)}${m.objective.kind === 'relic' ? ` (${esc(m.objective.relicName)})` : ''}</div>${opt}
    <div class="small dim">Reward: ${m.reward.gold}g · ${m.reward.credits} credits · ${m.reward.rep} rep + a ${E.RARITIES[m.reward.itemRarity].name} item${met && m.objective.kind !== 'clear' ? '. You can extract now to claim it.' : ''}</div></div>`;
}
function heroSections(run) {
  return UI.sheetPanel(run, true)
    + UI.detail('equip', '🛡️ Equipment', UI.equipPanel(run, true))
    + UI.detail('skills', '✨ Skills', UI.skillsPanel(run, true));
}

// ---------- map ----------
V.map = function () {
  const run = S.run, rows = run.dungeon.rows;
  const fog = E.anomaly(run, 'fog') && !(run.d.scout || run.d.st.LUK >= 8);
  let nodes;
  if (run.row >= rows.length) {
    const b = run.dungeon.theme.boss;
    nodes = `<button class="node t-boss" data-act="node" data-type="boss"><span class="orb">${b.glyph}</span><span><b>${esc(b.name)}</b>${run.dungeon.corrupted ? ' <span style="color:var(--purple)">(Corrupted)</span>' : ''}<br><small class="dim">${UI.NODE_HINT.boss}</small></span></button>`;
  } else {
    nodes = rows[run.row].map(o => {
      const shown = fog && o.type !== 'secret' ? 'unknown' : o.type;
      return `<button class="node t-${shown} ${o.type === 'secret' ? 'secret' : ''}" data-act="node" data-type="${o.type}" data-id="${o.id}"><span class="orb">${UI.NODE_ICON[shown]}</span><span><b>${UI.NODE_NAME[shown]}</b><br><small class="dim">${UI.NODE_HINT[shown]}</small></span></button>`;
    }).join('');
  }
  const note = run.dungeon.secretChance !== undefined ? `Secret-room chance for this character was ${Math.round(run.dungeon.secretChance * 100)}%.` : '';
  const act = `<div class="row"><button data-act="potion" ${run.potions > 0 && run.hp < run.d.maxHp ? '' : 'disabled'}>🧪 Drink potion (${run.potions})</button><button class="danger" data-act="extract">🚪 Extract now and bank your loot</button></div>`;
  return `${sceneBanner(run)}${missionPanel(run)}${runHeader(run)}
    <div class="panel"><h3>Choose your path</h3>${UI.dungeonMap(run)}<details class="nodelist"><summary class="small dim">Chamber list (hints and keyboard-friendly)</summary><div class="nodes">${nodes}</div></details><p class="small dim">${note}</p>${act}</div>
    ${UI.consPanel(run, { combat: false })}
    <div class="grid g2"><div>${heroSections(run)}</div><div>${UI.invPanel(run, 'Carried loot (at risk)')}
      <div class="panel"><h3>Materials</h3>${UI.matsLine(run.mats)}</div><div class="panel"><h3>Log</h3>${UI.logBlock(run, 8)}</div></div></div>`;
};

// ---------- combat ----------
function enemyStatus(e) {
  const t = [];
  if (e.shield > 0) t.push(`🛡 shield ${Math.round(e.shield)}`);
  if (e.status.burn) t.push(`🔥 burn ${e.status.burn}`);
  if (e.status.poison) t.push(`☣ poison ${e.status.poison}`);
  if (e.status.bleed) t.push(`🩸 bleed ${e.status.bleed}`);
  if (e.status.stun) t.push('💫 stun');
  if (e.status.chill) t.push(`❄ chill ${e.status.chill}`);
  if (e.status.weaken) t.push(`😵 weak ${e.status.weaken}`);
  if (e.status.burn && e.status.poison) t.push('Toxic Blaze');
  return t.map(x => `<span class="tag st">${x}</span>`).join('');
}
V.combat = function () {
  const run = S.run, c = run.combat;
  const prev = S.prevFor === c ? S.prev : null;
  const aura = UI.THEME_AURA[run.dungeon.theme.id] || '#ff6a5a';
  const enemies = c.enemies.map((e, i) => {
    const dead = e.hp <= 0, info = E.INTENT_INFO[e.intent];
    const lost = prev && prev.e[i] !== undefined ? Math.round(prev.e[i] - e.hp) : 0;
    const intent = dead ? '' : e.status.stun ? '<span class="intent">Stunned</span>' : `<span class="intent">Next: ${info.label}${info.mult ? ' (~' + E.previewDamage(run, e) + ' dmg)' : ''}</span>`;
    return `<div class="enemy ${e.boss ? 'boss' : ''} ${i === c.target && !dead ? 'sel' : ''} ${dead ? 'dead' : ''} ${lost > 0 ? 'hit' : ''}" data-act="target" data-i="${i}">
      ${lost > 0 ? `<div class="float">-${lost}</div>` : ''}
      <div class="glyph" style="--aura:${e.boss ? '#ffcb3d' : e.elite ? '#ff4aa0' : aura}"><span>${e.glyph || Art.monsterGlyph(e.name)}</span></div>
      <div class="row between"><b>${esc(e.name)}</b><span>${e.boss ? '👑' : e.elite ? '☠️' : ''}</span></div>${e.warden ? `<div class="small" style="color:var(--accent)" title="${esc(E.WARDENS[e.warden].desc)}">${E.WARDENS[e.warden].icon} ${E.WARDENS[e.warden].name}: ${esc(E.WARDENS[e.warden].desc)}</div>` : ''}
      <div class="dim small">HP ${Math.max(0, Math.round(e.hp))}/${e.maxHp} · DEF ${e.def}</div>
      ${bar(Math.max(0, e.hp), e.maxHp, 'hp')}<div class="small" style="margin:4px 0">${intent}${e.enraged ? ' <span style="color:var(--bad)">ENRAGED</span>' : ''}</div>${enemyStatus(e)}</div>`;
  }).join('');
  const playerHit = !!(prev && prev.p > run.hp);
  S.prev = { e: c.enemies.map(e => e.hp), p: run.hp }; S.prevFor = c;
  let controls;
  if (c.over) {
    if (c.fled) controls = `<div class="panel"><h3>Escaped</h3><p>You vanish from the fight with your loot intact.</p><button class="primary big" data-act="after">Continue</button></div>`;
    else if (c.won) {
      const s = c.summary;
      const items = s.items.map(it => UI.itemBlock(it, '')).join('');
      const mats = s.mats.map(m => `<span class="tag">${E.MATERIALS[m.mat].glyph} ${E.MATERIALS[m.mat].name} ×${m.n}</span>`).join('');
      const cons = s.cons.map(k => `<span class="tag">${E.CONSUMABLES[k].glyph} ${E.CONSUMABLES[k].name}</span>`).join('');
      controls = `<div class="panel fade"><h3>Victory</h3><p>+${s.xp} XP · +${s.gold} gold${s.potions ? ' · +' + s.potions + ' potion' : ''}${s.levelUps.length ? ' · <b style="color:var(--accent)">Level ' + s.levelUps[s.levelUps.length - 1] + '!</b>' : ''}${s.reduced ? ' · <span class="dim">outleveled: XP reduced</span>' : ''}</p><div>${mats}${cons}</div>${items}<button class="primary big pulse" data-act="after">Continue</button></div>`;
    } else controls = `<div class="panel"><h3 style="color:var(--bad)">Defeated</h3><p>You lose everything you were carrying.</p><button class="primary big" data-act="after">Continue</button></div>`;
  } else {
    const btns = E.loadout(run.char).map(id => {
      const s = E.effSkill(run.char, id), err = E.canUse(run, id), cost = E.skillCost(run, id), mr = E.masteryRank(run.char, id);
      return `<button data-act="skill" data-id="${id}" ${err ? 'disabled' : ''} title="${esc(s.desc)}"><b>${esc(s.name)}</b><small><span class="cost">${s.ap} AP${cost ? ' · ' + cost + ' ' + run.d.resName : ''}</span>${s.once ? (s.charges > 1 ? ' · ' + (s.charges - ((run.combat.used || {})[id] || 0)) + '/' + s.charges + ' left' : ' · once') : ''}${mr ? ' · ' + E.MASTERY[mr].name : ''}</small><small>${esc(s.desc)}</small></button>`;
    }).join('');
    controls = `<div class="panel"><div class="row between"><h3 style="flex:1">Turn ${c.turn} · <span style="color:var(--accent)">${c.ap} AP</span></h3><span class="small dim">Block ${Math.round(run.block * 100)}%${run.counter ? ' · Counter' : ''}</span></div>
      <div class="skills">${btns}<button data-act="cpotion" ${c.ap >= 1 && run.potions > 0 && run.hp < run.d.maxHp ? '' : 'disabled'}><b>🧪 Potion</b><small><span class="cost">1 AP</span> · ${run.potions} left</small><small>Heal 40% max HP.</small></button></div>
      <p><button class="primary big" data-act="endturn">End turn</button></p></div>${UI.consPanel(run, { combat: true })}`;
  }
  const label = { boss: 'Boss fight', elite: 'Elite fight', secret: 'Hidden chamber', relic: 'Guarded relic', ambush: 'Ambush!', elite_sneak: 'Sneak attack' }[c.type] || 'Combat';
  const comp = (run.companion && !c.over ? `<div class="small dim" style="margin-bottom:8px">${D.COMPANIONS[run.companion.id].glyph} ${esc(run.companion.name)}: ${esc(D.COMPANIONS[run.companion.id].desc)}</div>` : '') + (run.party && !c.over ? `<div class="small dim" style="margin-bottom:8px">👥 ${esc(run.party.name)}: ${run.party.members.map(m => D.COMPANIONS[m.id].glyph + ' ' + esc(m.name)).join(', ')}. They fight every turn and absorb damage.</div>` : '');
  return `${sceneBanner(run, `<span class="tag" style="color:var(--accent)">${label}</span>`)}${runHeader(run, playerHit)}${comp}
    <div class="arena dg" style="${UI.dungeonBgStyle(run.dungeon.theme.id)}">${enemies}</div><div style="height:14px"></div>${controls}<div class="panel"><h3>Log</h3>${UI.logBlock(run, 12)}</div>`;
};

// ---------- events ----------
function choiceHint(run, ch) {
  const bits = [];
  if (ch.check) bits.push(`${ch.check.stat} check · DC ${E.checkDc(run, ch.check.dc)}`);
  if (ch.cost) {
    const c = ch.cost;
    if (c.potion) bits.push('costs a potion');
    if (c.gold) bits.push(`costs ${c.gold}g`);
    if (c.goldPct) bits.push(`stakes ${Math.round(c.goldPct * 100)}% of your gold`);
    if (c.hpPct) bits.push(`costs ${Math.round(c.hpPct * 100)}% HP`);
    if (c.cons) bits.push(`uses ${E.CONSUMABLES[c.cons].name}`);
  }
  if (ch.hint) bits.push(ch.hint);
  return bits.join(' · ');
}
V.event = function () {
  const run = S.run, ev = S.ev;
  const lines = (ev.lines || []).map(l => `<p>${esc(l)}</p>`).join('');
  const items = (ev.items || []).map(it => UI.itemBlock(it, '')).join('');
  let body = '';
  if (ev.kind === 'shrine') body = `<p>A weathered shrine hums with old power.</p><div class="row"><button class="primary" data-act="pray">🙏 Pray</button><button data-act="next">Walk on</button></div>`;
  else if (ev.kind === 'camp') body = `<p>Bedrolls, a cold fire, and signs of a hasty exit.</p><div class="row"><button class="primary" data-act="search">🔎 Search the camp</button><button data-act="camprest">Rest here (heal 25%)</button></div>`;
  else if (ev.kind === 'merchant') {
    const stock = ev.stock.map((it, i) => it.sold ? '' : it.kind === 'cons'
      ? `<div class="item" style="--c:#8fd0ff"><div class="slot">${E.CONSUMABLES[it.id].glyph}</div><div class="body"><b>${esc(E.CONSUMABLES[it.id].name)}</b><div class="small dim">${esc(E.CONSUMABLES[it.id].desc)}</div></div><button class="tiny" data-act="buy" data-i="${i}" ${run.gold >= it.price ? '' : 'disabled'}>Buy ${it.price}g</button></div>`
      : UI.itemBlock(it, `<button class="tiny" data-act="buy" data-i="${i}" ${run.gold >= it.price ? '' : 'disabled'}>Buy ${it.price}g</button>`)).join('');
    body = `<p>A hooded merchant spreads a cloth of wares. You have <b style="color:var(--accent)">${run.gold}</b> gold. Sell loot from your pack on the map screen.</p>${stock}
      <div class="row"><button data-act="bpotion" ${run.gold >= E.potionPrice(run) ? '' : 'disabled'}>🧪 Buy potion (${E.potionPrice(run)}g)</button><button class="primary" data-act="next">Leave</button></div>`;
  } else if (ev.kind === 'dyn') {
    if (ev.res) {
      const r = ev.res;
      body = `${r.fight ? `<button class="primary big" data-act="fightnow">Fight!</button>` : `<button class="primary big" data-act="next">Continue</button>`}`;
    } else {
      body = `<p>${esc(ev.event.text)}</p><div class="choices">${ev.event.choices.map((ch, i) => {
        const why = E.choiceBlocked(run, ch);
        return `<button class="choice" data-act="choose" data-i="${i}" ${why ? 'disabled' : ''}><b>${esc(ch.label)}</b><small>${esc(why || choiceHint(run, ch))}</small></button>`;
      }).join('')}</div>`;
    }
  } else body = `<button class="primary big" data-act="next">Continue</button>`;
  const dynLines = ev.res ? ev.res.lines.map(l => `<p>${esc(l)}</p>`).join('') : '';
  const dynItems = ev.res ? ev.res.items.map(it => UI.itemBlock(it, '')).join('') : '';
  return `${sceneBanner(run)}${missionPanel(run)}${runHeader(run)}<div class="panel fade"><h2>${UI.NODE_ICON[ev.icon] || ev.glyph || ''} ${esc(ev.title)}</h2>${lines}${items}${dynLines}${dynItems}${body}</div>
    ${ev.kind === 'merchant' || ev.kind === 'dyn' ? UI.consPanel(run, { combat: false }) : ''}<div class="panel"><h3>Log</h3>${UI.logBlock(run, 6)}</div>`;
};

// ---------- end ----------
V.end = function () {
  const r = S.ev;
  const head = r.yielded ? '<h2 style="color:var(--accent)">🏳️ You yielded</h2>' : r.promoted ? `<h2 style="color:var(--good)">🎖️ Promoted to rank ${r.promoted.rank}!</h2>` : r.permadeath ? '<h2 style="color:var(--bad)">☠️ Your career is over</h2>' : r.outcome === 'cleared' ? '<h2 style="color:var(--good)">🏆 Dungeon cleared!</h2>' : r.outcome === 'extracted' ? '<h2 style="color:var(--accent)">🚪 Extracted safely</h2>' : '<h2 style="color:var(--bad)">💀 You died</h2>';
  const items = r.banked.map(it => UI.itemBlock(it, '')).join('');
  const m = r.mission;
  const missionBlock = m ? (m.done
    ? `<div class="panel mission"><h3>Mission complete</h3><p>+${m.gold} gold · +${m.credits} Guild Credits · +${m.rep} reputation${m.optional ? ' · bonus objective done!' : ''}</p></div>`
    : `<div class="panel mission"><h3>Mission not completed</h3><p class="dim">${m.rep ? 'Reputation ' + m.rep + '.' : ''}</p></div>`) : '';
  const pen = r.penalties && r.penalties.length ? `<div class="panel" style="border-color:var(--bad)"><h3 style="color:var(--bad)">Penalties</h3>${r.penalties.map(p => `<div class="small">• ${esc(p)}</div>`).join('')}</div>` : '';
  const mats = r.mats && Object.keys(r.mats).length ? `<div>${UI.matsLine(r.mats)}</div>` : '';
  const tn = r.tourney ? (r.tourney.won ? `<div class="panel mission"><h3>🎯 ${esc(r.tourney.label)} won against ${esc(r.tourney.foe)}${r.tourney.legendary ? ' 🌟' : ''}</h3><p>+${r.tourney.gold} gold${r.tourney.champion ? `</p><p><b style="color:var(--accent)">🏆 Tournament champion!</b> Purse +${r.tourney.champion.gold} gold · +${r.tourney.champion.credits} credits · +${r.tourney.champion.rep} reputation · a trophy item${r.tourney.legendary ? ' (a legendary party fell)' : ''}.</p><p class="dim small">The arena rests for two days.` : ' You advance to the next bout.'}</p></div>` : `<div class="panel" style="border-color:var(--bad)"><h3>🎯 Knocked out in the ${esc(r.tourney.label.toLowerCase())} by ${esc(r.tourney.foe)}</h3><p class="dim">You yielded and left unharmed. The arena rests for two days.</p></div>`) : '';
  const pr = r.promoted ? `<div class="panel mission"><h3>🎖️ Rank test passed</h3><p>The examiners welcome you as a rank ${r.promoted.rank} adventurer. +${r.promoted.rep} reputation · +${r.promoted.credits} credits. New contracts and areas open up.</p></div>` : r.testFailed ? `<div class="panel" style="border-color:var(--bad)"><h3>🎖️ Rank test failed</h3><p class="dim">The ${r.testFailed}-rank trial beat you. Rest a day, train, and try again.</p></div>` : '';
  const ry = r.royal ? `<div class="panel mission"><h3>👑 Royal deed for ${esc(r.royal.nation)}</h3><p>${esc(r.royal.issuer)} is pleased. Royal deeds done: ${r.royal.favor}/3.${r.royal.knighted ? ' <b style="color:var(--accent)">You are honoured by the nation: +1 LUK, +10 reputation and a legendary gift.</b>' : ''}</p></div>` : '';
  const fc = r.firstClear ? `<div class="panel mission"><h3>🏆 First clear: ${esc(r.firstClear.name)}</h3><p>+${r.firstClear.gold} gold · +${r.firstClear.credits} credits · +${r.firstClear.rep} reputation · a gear reward</p></div>` : '';
  const disc = r.disc && r.disc.length ? `<div class="panel"><h3>🔎 Discoveries</h3>${r.disc.map(d => `<div class="small">• ${esc(d.label)} <b style="color:var(--accent)">+${UI.fmt(d.xp)} XP</b></div>`).join('')}${r.ups && r.ups.length ? `<p class="small" style="color:var(--good)">Level up! Now level ${r.ups[r.ups.length - 1]}.</p>` : ''}</div>` : '';
  const home = r.homeDays ? `<p class="small dim">You wake up back in Hearthhold (${r.homeDays} day${r.homeDays > 1 ? 's' : ''} later).</p>` : r.stayed ? '<p class="small dim">You step out of the dungeon and stay where you are. Use the map to keep exploring, or Return home from the map.</p>' : '';
  const back = r.career && !r.permadeath ? '<button class="primary big" data-act="careerhub">Return to the Guild</button>' : r.career ? '<button class="primary big" data-act="careerhome">Continue</button>' : '<button class="primary big" data-act="dailyhome">Back to Daily</button>';
  return `<div class="scene th-none motes">${head}<p>${esc(r.line)}</p></div>${missionBlock}${pr}${tn}${ry}${fc}${disc}${pen}<div class="panel fade">${home}
    ${r.outcome === 'dead' && !r.yielded ? `<p class="dim">Your carried gold and loot are lost.${r.career ? '' : ' Your vault and banked gold are safe.'}</p>` : `<p>Banked <b style="color:var(--accent)">${r.gold}</b> gold${r.banked.length ? ' and ' + r.banked.length + ' item(s)' : ''}.</p>${mats}${items}`}
    <h3>Share</h3><pre class="share" id="share">${esc(r.share)}</pre>
    <div class="row"><button data-act="copy">Copy result</button>${back}</div></div>`;
};

// ---------- codex ----------
const RACE_TO_TIER = { C: 'C', U: 'U', R: 'R', E: 'E', H: 'L', L: 'L', M: 'M' };
const RACE_TIER_NAME = { C: 'Common', U: 'Uncommon', R: 'Rare', E: 'Epic', H: 'Hidden', L: 'Legendary', M: 'Mythic' };
const locked = (n, h) => `<div class="dexcard locked"><div class="art" style="font-size:44px">${Art.lockedEmblem(h || 46)}</div><div class="nm">???</div>${n || ''}</div>`;
V.codex = function () {
  const j = S.save.journal;
  const subs = [['races', '🧬 Races'], ['profs', '🎓 Professions'], ['monsters', '👹 Monsters'], ['skills', '✨ Skills'], ['talents', '🌟 Talents'], ['items', '⚔️ Gear'], ['mats', '⛏️ Materials'], ['cons', '🧪 Consumables'], ['events', '🎭 Events'], ['world', '🌐 World']];
  const nav = `<div class="subtabs">${subs.map(([id, n]) => `<button class="${S.codex === id ? 'on' : ''}" data-act="codex" data-sub="${id}">${n}</button>`).join('')}</div>`;
  let body = '';
  const sub = S.codex;
  if (sub === 'races') {
    body = `<p class="small dim">Races discovered: <b>${j.races.length}/${E.RACES.length}</b>. A Primordial race is rumored to exist once per world.</p><div class="dex">` + E.RACES.map(r => {
      if (!j.races.includes(r.name)) return locked('<div class="small dim">Undiscovered</div>', 54);
      const col = E.RACE_TIER_COLOR[r.tier], fake = { name: r.name, race: r.name, tier: RACE_TO_TIER[r.tier], prof: 'Swordsman' };
      return `<div class="dexcard"><div class="tierbar" style="background:${col}"></div><div class="art">${UI.portrait(fake, 96)}</div><div class="nm" style="color:${col}">${esc(r.name)}</div><div class="small dim">${RACE_TIER_NAME[r.tier]} · weight ${r.weight}</div><div class="small" style="margin-top:4px">${esc(r.trait)}</div></div>`;
    }).join('') + '</div>';
  } else if (sub === 'profs') {
    body = `<p class="small dim">Professions discovered: <b>${j.profs.length}/${E.PROFESSIONS.length}</b>. Rarer professions get bigger stat budgets, drawbacks and signature skills.</p>` + E.TIERS.map(t => {
      const list = E.PROFESSIONS.filter(p => p.tier === t.id), found = list.filter(p => j.profs.includes(p.name)).length;
      const cards = list.map(p => {
        if (!j.profs.includes(p.name)) return locked('');
        const ids = E.KIND_SKILL_LIST[p.kind].filter(id => E.SKILLS[id].lvl <= 1).concat(E.TIER_BY[t.id] >= 2 ? [p.sig || 'ultimate'] : []);
        return `<div class="dexcard"><div class="tierbar" style="background:${t.color}"></div><div class="art">${Art.emblem(p.kind, t.color, 56)}</div><div class="nm" style="color:${t.color}">${esc(p.name)}</div><div class="small dim">${Art.KIND_LABEL[p.kind]} · ${E.KINDS[p.kind].res}${p.scout ? ' · Scout' : ''}${p.alchemist ? ' · Alchemist' : ''}</div>
          <div class="small" style="margin-top:4px"><b>Drawback:</b> <span class="dim">${esc(p.drawback)}</span></div><div class="small dim">Starts with: ${esc(ids.map(id => E.SKILLS[id].name).join(', '))}</div><div class="small dim">${p.races.includes('*') ? 'Any race' : esc(p.races.join(', '))}</div></div>`;
      }).join('');
      return `<div class="prog"><h3 style="color:${t.color}">${t.name} · ${found}/${list.length}</h3><div class="dex">${cards}</div></div>`;
    }).join('') + `<div class="prog"><h3>Hidden professions</h3><p class="small dim">Some professions cannot be rolled. They awaken through conditions: flawless duels, forbidden shrines, ancient relics. Eight exist. None are found yet.</p></div>`;
  } else if (sub === 'monsters') {
    body = `<p class="small dim">Monsters met: <b>${j.monsters.length}</b> · Bosses felled: <b>${j.bosses.length}</b>. Rare mutations (${Object.values(E.MUTS).map(m => m.name).join(', ')}) can appear on any monster.</p>` + E.THEMES.map(t => {
      const cards = t.pool.map(k => E.MONSTERS[k]).map(m => {
        const seen = j.monsters.some(n => n.includes(m.name));
        return seen ? `<div class="dexcard"><div class="art" style="font-size:52px">${m.glyph}</div><div class="nm">${esc(m.name)}</div><div class="small dim">HP ${m.hp} · ATK ${m.atk} · DEF ${m.def}</div><div class="small dim">${Object.keys(m.intents).map(k => E.INTENT_INFO[k].label).join(', ')}</div><div class="small dim">Drops: ${m.drops.map(d => E.MATERIALS[d].name).join(', ')}</div></div>` : `<div class="dexcard locked"><div class="art" style="font-size:52px">❔</div><div class="nm">???</div></div>`;
      }).join('');
      const bseen = j.bosses.some(n => n.includes(t.boss.name));
      const boss = bseen ? `<div class="dexcard"><div class="tierbar" style="background:var(--accent)"></div><div class="art" style="font-size:60px">${t.boss.glyph}</div><div class="nm">👑 ${esc(t.boss.name)}</div><div class="small dim">HP ${t.boss.hp} · ATK ${t.boss.atk} · DEF ${t.boss.def}</div><div class="small dim">${t.boss.phases.length} phases: ${t.boss.phases.map(p => p.say).join(' ')}</div></div>` : `<div class="dexcard locked"><div class="art" style="font-size:60px">❔</div><div class="nm">??? (Boss)</div></div>`;
      return `<div class="prog"><h3>${t.name} <span class="dim" style="text-transform:none;letter-spacing:0">(from ${E.CAREER_RANKS[t.rankMin]}-rank)</span></h3><div class="dex">${cards}${boss}</div></div>`;
    }).join('');
  } else if (sub === 'skills') {
    const groups = [['Basic', ['attack', 'guard']]].concat(Object.keys(E.KIND_SKILL_LIST).map(k => [Art.KIND_LABEL[k] + ' (' + k + ')', E.KIND_SKILL_LIST[k]]), [['Tomes (learned from books)', D.BOOK_SKILLS], ['Signature', Object.values(E.SKILLS).filter(s => s.kinds.includes('sig')).map(s => s.id)]]);
    body = `<p class="small dim">Every discipline has eleven skills unlocking from level 1 to 35. Skills level up through use: Novice, Practiced, Adept, Expert, Master (+8% each).</p>` + groups.map(([g, ids]) => `<div class="prog"><h3>${g}</h3><div class="grid g4">${ids.map(id => { const s = E.SKILLS[id]; return `<div class="panel" style="margin:0"><b>${esc(s.name)}</b> ${s.lvl > 1 ? `<span class="tag">Lv ${s.lvl}</span>` : ''}<div class="small"><span style="color:var(--accent)">${s.ap} AP</span>${s.en ? ' · <span style="color:#8fd0ff">' + s.en + ' energy</span>' : ''}${s.once ? ' · once per fight' : ''}</div><div class="small dim">${esc(s.desc)}</div></div>`; }).join('')}</div></div>`).join('');
  } else if (sub === 'talents') {
    body = `<div class="grid g3">${E.TALENTS.map(t => `<div class="panel" style="margin:0"><b>${esc(t.name)}</b> <span class="dim small">weight ${t.weight}</span><div class="small dim">${esc(t.desc)}</div></div>`).join('')}</div>
      <h3 style="margin-top:14px">Hidden traits (revealed at level 5)</h3><div class="grid g4">${E.HIDDEN_TRAITS.map(h => `<div class="panel" style="margin:0"><b>${esc(h.name)}</b><div class="small dim">${esc(h.desc)}</div></div>`).join('')}</div>`;
  } else if (sub === 'items') {
    body = `<p class="small dim">Eight equipment slots. Items have rarity, up to three affixes, upgrade levels (+5) and durability.</p><h3>Affixes</h3><div class="grid g4">${Object.values(E.AFFIXES).map(a => `<div class="panel" style="margin:0"><b>${esc(a.name)}</b><div class="small dim">${esc(a.desc)}</div></div>`).join('')}</div>`
      + E.SLOTS.map(s => `<div class="prog"><h3>${UI.SLOT_ICON[s]} ${E.SLOT_NAMES[s]}</h3><div>${D.BASES[s].map(b => `<span class="tag">${esc(b.n)}${b.atk ? ' ATK' + b.atk : ''}${b.def ? ' DEF' + b.def : ''}${b.en ? ' EN' + b.en : ''}</span>`).join('')}</div></div>`).join('');
  } else if (sub === 'mats') {
    body = `<p class="small dim">Materials drop from monsters, chests and events. Use them for upgrades, enchanting and alchemy. Found: <b>${j.mats.length}/${Object.keys(E.MATERIALS).length}</b>.</p><div class="dex">${Object.entries(E.MATERIALS).map(([k, m]) => j.mats.includes(k)
      ? `<div class="dexcard"><div class="art" style="font-size:44px">${m.glyph}</div><div class="nm">${esc(m.name)}</div><div class="small dim">Tier ${m.tier + 1}</div><div class="small dim">From: ${E.THEMES.filter(t => t.mat.includes(k)).map(t => t.name).join(', ') || 'Chests and salvage'}</div></div>` : `<div class="dexcard locked"><div class="art" style="font-size:44px">❔</div><div class="nm">???</div></div>`).join('')}</div>`;
  } else if (sub === 'cons') {
    body = `<div class="grid g3">${Object.entries(E.CONSUMABLES).filter(([k, c]) => !c.book).map(([k, c]) => `<div class="panel" style="margin:0"><div class="row"><span style="font-size:26px">${c.glyph}</span><div><b>${esc(c.name)}</b><div class="small dim">${esc(c.desc)}</div><div class="small dim">${c.use === 'both' ? 'Map and combat' : c.use === 'combat' ? 'Combat only' : 'Map only'} · ${c.price}g</div></div></div></div>`).join('')}</div>
      <h3 style="margin-top:14px">Recipes</h3><div class="grid g3">${E.RECIPES.map(r => `<div class="panel" style="margin:0"><b>${esc(r.name)}</b><div class="small dim">${Object.keys(r.inputs).map(k => r.inputs[k] + ' ' + E.MATERIALS[k].name).join(', ')} + ${r.gold}g</div></div>`).join('')}</div>`;
  } else if (sub === 'events') {
    body = `<p class="small dim">Random encounters in dungeons: events, traps and puzzles. Discovered: <b>${j.events.length}/${D.EVENTS.length}</b>. Many use a stat check: d20 + stat/2 + luck/3 against a difficulty that scales with rank.</p><div class="dex">${D.EVENTS.map(e => j.events.includes(e.id)
      ? `<div class="dexcard"><div class="art" style="font-size:44px">${e.icon}</div><div class="nm">${esc(e.title)}</div><div class="small dim">${e.cat === 'trap' ? 'Trap' : e.cat === 'puzzle' ? 'Puzzle' : 'Event'} · ${e.choices.length} choices</div><div class="small dim">${esc(e.text)}</div></div>` : `<div class="dexcard locked"><div class="art" style="font-size:44px">❔</div><div class="nm">???</div></div>`).join('')}</div>`;
  } else {
    body = `<h3>Anomalies</h3><p class="small dim">Dungeons sometimes carry an anomaly. Seen: <b>${j.anomalies.length}/${Object.keys(E.ANOMALIES).length}</b>.</p><div class="grid g3">${Object.entries(E.ANOMALIES).map(([k, a]) => j.anomalies.includes(k) ? `<div class="panel" style="margin:0"><b>${a.icon} ${esc(a.name)}</b><div class="small dim">${esc(a.desc)}</div></div>` : `<div class="panel dim" style="margin:0">❔ ???</div>`).join('')}</div>
      <h3 style="margin-top:14px">Injuries</h3><div class="grid g3">${Object.values(E.INJURIES).map(a => `<div class="panel" style="margin:0"><b>${a.icon} ${esc(a.name)}</b><div class="small dim">${esc(a.desc)} Healer: ${a.cost}g</div></div>`).join('')}</div>
      <h3 style="margin-top:14px">Companions</h3><div class="grid g3">${Object.values(E.COMPANIONS).map(c => `<div class="panel" style="margin:0"><b>${c.glyph} ${esc(c.name)}</b><div class="small dim">${esc(c.desc)} Hire: ${c.cost}g</div></div>`).join('')}</div>
      <h3 style="margin-top:14px">Mission types</h3><div class="grid g3">${Object.values(E.MISSION_TYPES).map(m => `<div class="panel" style="margin:0"><b>${m.icon} ${esc(m.name)}</b></div>`).join('')}</div>
      <h3 style="margin-top:14px">Dungeon themes</h3><div class="grid g3">${E.THEMES.map(t => `<div class="panel" style="margin:0"><b>${esc(t.name)}</b><div class="small dim">From ${E.CAREER_RANKS[t.rankMin]}-rank. Materials: ${t.mat.map(m => E.MATERIALS[m].name).join(', ')}</div></div>`).join('')}</div>`;
  }
  return `<h2>📖 Codex</h2>${nav}${body}`;
};

// ---------- vault ----------
V.vault = function () {
  const sv = S.save;
  const items = sv.vault.map(it => UI.itemBlock(it, `<button class="tiny" data-act="vsell" data-id="${it.id}">Sell ${E.sellValue(it)}g</button>`)).join('');
  const car = sv.career;
  const stash = car ? car.stash.map(it => UI.itemBlock(it, '')).join('') : '';
  return `<h2>🎒 Vault</h2><div class="grid g2">
    <div class="panel"><h3>Daily vault (${sv.vault.length}/24)</h3><p class="small dim">Gear you extracted from daily dungeons. Equip it on any new daily character. Selling gives banked gold, which pays for rerolls.</p>${items || '<p class="dim small">Empty.</p>'}</div>
    <div class="panel"><h3>Career stash${car ? ' (' + car.stash.length + '/40)' : ''}</h3>${car ? `<p class="small dim">Manage this gear at the Guild in the Career tab.</p>${stash || '<p class="dim small">Empty.</p>'}<h3>Materials</h3>${UI.matsLine(car.mats)}` : '<p class="dim small">No career yet.</p>'}</div></div>`;
};

// ---------- guide ----------
const gp = (h, body) => `<div class="panel"><h3>${h}</h3>${body}</div>`;
const gt = (head, rows) => `<table class="t"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td>${i === 0 ? '<b>' + c + '</b>' : c}</td>`).join('')}</tr>`).join('')}</table>`;
const GUIDE_STATS = Object.keys(E.STAT_NAMES).map(k => [k, E.STAT_NAMES[k], E.STAT_ROLE[k]]);
const GUIDE = {
  start() {
    return `<div class="grid g2">${gp('Quick start',
      '<div class="tip">Roll three adventurers and pick one. Rare professions have bigger stat budgets but drawbacks.</div><div class="tip">Each room, pick a path. Fights, events, traps, puzzles, shrines, camps and merchants shape the run.</div><div class="tip">Heat rises by 1 every room. Enemies grow and loot improves. You can extract between rooms to bank your haul.</div><div class="tip">Die and you lose what you carried. In Career your levels are safe unless Hardcore is on.</div>')}
    ${gp('Daily vs Career', gt(['', 'Daily', 'Career'], [
      ['Character', 'Roll 3, pick 1, every day', 'One persistent hero'],
      ['Ranks', 'F, E, D (unlock in order)', 'F to S (promotion by a rank test)'],
      ['Levels', 'Reset each run (max 30)', 'Kept. Cap 50'],
      ['XP to next level', '25 x level^1.5', '30 x level^2.2'],
      ['Gold', 'Banked, pays for rerolls (50g)', 'Spent at shops, smithy, healer'],
      ['Death', 'Lose carried loot', 'Loot, gold, XP, durability, injury']]))}</div>`;
  },
  stats() {
    const rows = GUIDE_STATS.map(([k, n, d]) => [k + ' ' + n, d]);
    return `<div class="grid g2">${gp('Primary stats', gt(['Stat', 'What it does'], rows) + '<p class="small dim">You roll a starting spread from your profession tier (see Rolls). Each level gives you stat points equal to your Potential (3 to 6). Events can test STR, AGI, VIT, INT, WIS, DEX or LUK, so a balanced build has more options.</p>')}
    ${gp('Derived stats (what you see in combat)', gt(['Stat', 'Formula'], [
      ['Max HP', '(20 + VIT x 4 + level x 3) x multipliers. Glass professions x0.8. Each cursed item x0.9. Vitality affix x1.1.'],
      ['Energy (Stamina or Mana)', '8 + (casters: (INT+WIS)/2, others: (VIT+WIL)/2) + gear. Non-casters use Stamina, casters use Mana.'],
      ['Energy regen', '2 per turn + WIL/6 + Swiftness gear.'],
      ['Power', '2 + attack stat x 0.65 + weapon attack + level x 0.4. Skills multiply this.'],
      ['Defense', '(gear + race bonus + VIT/3). Damage taken is reduced by DEF / (DEF + 20).'],
      ['Crit chance', '5% + (DEX + AGI) x 0.8% + gear. Capped at 60%.'],
      ['Skill power', 'Each skill scales from the attack stat of its own discipline. A Tome spell on a warrior scales from INT.'],
      ['Crit damage', 'x1.5 base, plus DEX x 0.5%, race and Brutality gear.'],
      ['Evade', 'AGI x 1.2% + gear. Capped at 40% (70% with buffs).'],
      ['Lifesteal', 'From race, profession and Leech gear. Heals a share of damage dealt.'],
      ['Damage mult', 'x1 normally. Cursed Genius x1.25. Broken Arm x0.85.']]))}
    ${gp('Attack stat by profession type', gt(['Type', 'Attacks with', 'Energy'], Object.keys(E.KINDS).map(k => [k, E.KINDS[k].atk.join(' / '), E.KINDS[k].res])) + '<p class="small dim">Hybrid professions use the higher of STR and INT.</p>')}</div>`;
  },
  combat() {
    return `<div class="grid g2">${gp('Turn flow', '<div class="tip">You get 3 Action Points (AP) per turn. Attack is free of energy. Skills cost AP and energy. Using a potion or consumable costs 1 AP.</div><div class="tip">Enemies show their next move above their head. Plan around it: block heavy hits, stun summoners, break shields.</div><div class="tip">After your AP is spent, press End Turn. Energy regenerates at the start of your turn.</div><div class="tip">Stagger or Shaken Nerves drops you to 2 AP.</div>')}
    ${gp('Statuses on you', gt(['Status', 'Effect'], [
      ['Poison', 'Damage each turn for a few turns. An Antidote, shrine, camp or the Cleanse skill removes it.'],
      ['Bleed', 'Damage each turn. A Bandage or Antidote stops it. The Bandage also heals.'],
      ['Burn', 'Damage each turn. Some races are immune.'],
      ['Weak', 'Your damage is x0.75 while active.'],
      ['Block / Ward', 'Block reduces the next hits. Ward Scroll reduces all damage 15% for the dungeon.']]))}
    ${gp('Statuses on enemies', gt(['Status', 'Effect'], [
      ['Burn', 'Ticks 30% of your power per turn for 3 turns.'],
      ['Poison', 'Ticks 25% of your power per turn for 4 turns.'],
      ['Bleed', 'Ticks 20% of your power per turn.'],
      ['Toxic Blaze', 'Burn and poison together: all ticks x1.5.'],
      ['Chill', 'Enemy deals 40% less damage.'],
      ['Weaken', 'Enemy deals 25% less damage.'],
      ['Stun', 'Enemy skips its turn.'],
      ['Shield', 'Absorbs damage before HP. Break it with big hits.'],
      ['Bracing', 'The enemy takes half damage this turn, so wait or use DoTs.']]))}
    ${gp('Enemy moves', gt(['Move', 'What it does'], [
      ['Attack / Flurry / Slam', 'Plain damage. Slam hits very hard.'],
      ['Venom / Bleed / Burn', 'Damage plus the matching status on you.'],
      ['Curse', 'Weakens you for a few turns.'],
      ['Drain', 'Heals the enemy by the damage dealt.'],
      ['Stagger', 'Costs you 1 AP next turn.'],
      ['Shield', 'The enemy gains a damage-absorbing shield.'],
      ['Summon', 'Calls another monster. Kill or stun the summoner first.']]))}
    ${gp('Mutations', gt(['Mutation', 'Effect'], [
      ['Enraged', '+40% attack, -30% defense'], ['Armored', '+2 defense, +20% HP'], ['Venomous', 'Can poison you'], ['Swift', 'Can flurry'],
      ['Regenerating', 'Heals 6% HP per turn'], ['Ancient', '+30% HP, +20% attack, +50% XP'], ['Vampiric', 'Can drain'], ['Cursed', 'Can curse']]) + '<p class="small dim">Elites and bosses always give more loot. Bosses change phase at 66% and 33% HP.</p>')}</div>`;
  },
  skills() {
    return `<div class="grid g2">${gp('Learning skills', '<p class="small">You gain stat points (your Potential, 3 to 6) and 1 skill point per level. Each discipline has eleven skills that unlock between level 1 and 35. Spend a skill point to learn one, then place it in one of four loadout slots on the Hero tab.</p>')}
    ${gp('Reactive skills', '<p class="small">Every discipline has two skills that read the enemy&#39;s telegraphed move. <b>Interrupt</b> skills cancel a matching action (a summon, curse, heavy blow, shield). <b>Parry</b> guards negate the first matching attack this turn and counter it. <b>Sunder</b> and <b>punish</b> skills shatter shields and hit bracing foes harder. Look at the enemy&#39;s Next move before you choose.</p>')}
    ${gp('Evolutions', '<p class="small">When a skill reaches Practiced rank (15 uses) you can spend 1 skill point to evolve it, once, into one of two branches. For example a strike becomes Precision (+30% damage, ignores defense) or Rending (bleeds, costs 1 less energy). Two heroes of the same class end up with different skills.</p>' + gt(['Type', 'Branch A', 'Branch B'], Object.keys(E.EVOLUTIONS).map(k => [k, E.EVOLUTIONS[k].a.name + ': ' + E.EVOLUTIONS[k].a.desc, E.EVOLUTIONS[k].b.name + ': ' + E.EVOLUTIONS[k].b.desc])))}
    ${gp('Mastery', '<p class="small">Skills level up as you use them. Each mastery rank gives +8% effect (five ranks).</p>')}
    ${gp('Signature skills', '<p class="small">Rare and higher professions have a signature skill. It is always equipped and does not use a slot. Signatures are your strongest move (4 to 5x damage, usually ignoring defense) and scale with tier: Rare x1, Epic x1.2, Legendary x1.45, Mythic x1.75 and Mythic heroes can use theirs twice per fight.</p>')}
    ${gp('Tomes', '<p class="small">A Tome teaches a skill from another discipline. Buy them at the credit shop or find them as loot. Reading one uses it up.</p>')}
    ${gp('Cost', '<p class="small">A skill costs AP and energy. Silence makes every skill cost 1 more energy. Mana Drought slows energy regeneration.</p>')}
    ${gp('Effect types', gt(['Effect', 'Meaning'], [
      ['Multi-hit', 'Several smaller hits. Good against shields.'], ['Execute', 'Extra damage to low-HP enemies.'], ['Lifedrain', 'Heal for part of the damage.'],
      ['Buff', 'Boost damage, evade or defense for some turns.'], ['Counter', 'Hit back when attacked.'], ['Summon spirit', 'A spirit strikes each turn.'],
      ['Heal / Cleanse', 'Heal and remove statuses.']]))}</div>`;
  },
  rolls() {
    const tierRows = E.TIERS.map(t => [`<span style="color:${t.color}">${t.name}</span>`, t.weight + '%', t.budget + ' +/- ' + t.var]);
    const potRows = E.POTENTIALS.map(p => [p.name, p.weight + '%', p.pts]);
    return `<div class="grid g2">${gp('How a character is rolled', '<ol class="small"><li>Pick a race (weighted by rarity).</li><li>Pick a profession tier (table below).</li><li>Pick a profession from that race&#39;s pool. About 6% of rolls are a misfit that ignores the pool.</li><li>Spread the stat budget over the 7 stats by the profession type.</li><li>Roll Potential and Luck separately.</li><li>Roll talents. A hidden trait is revealed at level 5 (extra points, or a bonus to every stat).</li></ol>')}
    ${gp('Profession rarity and stat budget', gt(['Tier', 'Share of rolls', 'Stat budget'], tierRows) + '<p class="small dim">Rarer tiers have more stat points. Many also have a drawback (for example lower HP) and a signature skill.</p>')}
    ${gp('Potential', gt(['Potential', 'Chance', 'Points / level'], potRows) + '<p class="small dim">Potential is the number of stat points you gain per level. You spend them yourself on the Hero tab.</p>')}
    ${gp('Luck', '<p class="small">Rolled once. Cannot be bought. See Stats for the full list of what it affects.</p>')}
    ${gp('Tier guarantees', gt(['Class tier', 'Min. Luck', 'Min. Potential', 'Talents', 'Best talent', 'Skill slots'], E.TIERS.map((t, i) => [`<span style="color:${t.color}">${t.name}</span>`, Math.max(E.TIER_FLOOR.luck[i], 0), E.POTENTIALS[E.TIER_FLOOR.potential[i]].name, E.TIER_FLOOR.talents[i], ['any', 'any', 'any', 'Good+', 'Great+', 'Great+'][i], E.SLOTS_BY_TIER[i]])) + '<p class="small dim">Rarer classes are always born with strong luck, more talents and better odds of a Sleeping Dragon. A Mythic can never roll ordinary Luck or talents. Every race can roll at least two professions in its own tier and one in each of the two tiers below it. A high race tier lifts the floors too, and a high race that rolls a lower class gets <b>Heritage</b> (up to 3 free skill points and +8% XP per tier of difference): a Mythic race such as Reincarnated Soul (which also has a hidden <b>past life</b> that awakens at levels 5, 15 and 30: stats, then a powerful exclusive skill, then a Mythic skill, a talent and an extra slot) acts like a class one tier lower for Luck, Potential and talent quality, and adds stat points, even with a Common class. Epic, Legendary and Mythic classes also learn <b>exclusive skills</b> that lower classes never can.</p>')}
    ${gp('Race', '<p class="small">Races give bonuses such as defense, HP, XP, potion strength, evade, crit damage or lifesteal. Some have immunities (for example burn). See the Codex.</p>')}
    ${gp('Talents', '<p class="small">Small passive perks that add to stats, XP, or special effects. Some talents have a cost (Cursed Genius: +25% damage and +50% XP, but -20% HP).</p>')}</div>`;
  },
  dungeon() {
    const rankRows = E.CAREER_RANKS.map(r => [r, E.RANKS[r].rooms, E.RANKS[r].rec, E.RANKS[r].rewards + 'x']);
    return `<div class="grid g2">${gp('Rooms', gt(['Room', 'What happens'], [
      ['Fight / Elite', 'Combat. Elites are tougher and drop better loot.'], ['Boss', 'The last room. Has phases. Drops the best loot.'],
      ['Event', 'A choice, trap or puzzle. Checks roll d20 + stat/2 + Luck/3 against a DC.'], ['Treasure', 'Chest with gold and gear. Some are trapped.'],
      ['Shrine', 'A blessing, a heal or a gamble.'], ['Rest', 'Heal 40% HP and restore energy.'], ['Camp', 'Search for supplies. May carry lore.'], ['Trap / Puzzle', 'Hazard or challenge. Resolved with a stat check.'], ['Merchant', 'Buy potions and gear with gold earned this run.'],
      ['Secret', 'A hidden room. Luck, the Beastkin race and scouts raise the chance to find it.']]))}
    ${gp('Heat', '<p class="small">Heat goes up by 1 every room. Each point makes enemies stronger and gold and loot better. Extract when it gets risky.</p>')}
    ${gp('Event checks', '<p class="small">Roll d20 + (stat / 2) + (Luck / 3). The DC is 9 + (rank level x 0.6) + the choice&#39;s difficulty. Beat it for the good outcome. Bad outcomes can cost HP, gold or give a status.</p>')}
    ${gp('Anomalies', gt(['Anomaly', 'Effect'], Object.values(D.ANOMALIES).map(a => [a.icon + ' ' + a.name, a.desc])))}
    ${gp('Ranks', gt(['Rank', 'Rooms', 'Rec. level', 'Reward'], rankRows))}</div>`;
  },
  world() {
    const T = E.Terrain;
    return `<div class="grid g2">${gp('A world made from a seed', '<p class="small">Every Career has its own procedurally generated world, like a block-world sandbox. Type a <b>world seed</b> before you begin (or leave it blank for a random one) and the preview shows the land around Hearthhold. The same seed always makes the same continents, rivers, biomes and structures, so you can share seeds with friends. The world is endless.</p>')}
    ${gp('Walking and fog', '<p class="small">Walk with <b>WASD / arrow keys</b>, or click any explored tile to auto-walk there with pathfinding. You see 8 tiles around you. Everything else is dark until you walk near it. Explored land stays on the map. Deep water blocks you; shallows and rivers can be waded through slowly.</p><p class="small">Terrain affects travel: plains are quick, forests, swamps and hills are slow, mountains are slower still. About 8 movement cost makes a day.</p>')}
    ${gp('Biomes', gt(['Biome', 'Travel cost'], T.BIOMES.filter(b => b.cost).map(b => [b.name, b.cost + ' per tile'])) + '<p class="small dim">Biomes come from elevation, temperature and moisture noise: oceans, beaches, plains, forests, taiga, tundra, deserts, savanna, jungle, swamps, hills, mountains and snowy peaks, with rivers cutting through.</p>')}
    ${gp('Zones: danger by distance', '<p class="small">The further you walk from Hearthhold, the more dangerous the land. Distance rings map to Guild ranks: zone F near home, then E, D, C, B, A and S far out. Dungeons and lairs take their rank from their zone, and a dungeon&#39;s theme matches its biome (frozen halls in snow, a forge in the desert, and so on).</p>')}
    ${gp('Scouting', '<p class="small">Spend a day to survey from where you stand: reveals a wide circle of terrain and the places in it. The chance is 50% + Luck x 3%, +20% for scouts, plus race and talent bonuses. Secret vaults are only found by scouting. Unexplored places show as <b>?</b> until you get within 5 tiles or scout them.</p>')}
    ${gp('Places', gt(['Place', 'What it does'], Object.values(E.WORLD.POI).filter(p => p.name !== 'Dungeon').map(p => [p.icon + ' ' + p.name, p.blurb])) + '<p class="small dim">Places pay off once, then return after some days at reduced XP. Every new place gives discovery XP.</p>')}
    ${gp('Capital cities', '<p class="small">Hearthhold is only <b>your home city</b>. The real <b>capitals</b> are random, there are several in every world, and they stand in the high-rank lands far from home (rank C and beyond). Each belongs to a nation: usually human, but it may be a land of elves, orcs, dragonkin or another people, or a <b>mixed</b> nation. Some nations have a <b>palace and a ruler</b> (a king, queen, emperor, warlord, high queen and so on, whatever suits the people); others are run by a council. A capital offers: a big <b>Guild Hall</b> with the rank test, a <b>Grand Arena</b>, a <b>palace or council chamber</b> with royal commissions, a <b>Grand Market</b> of fine gear, plus smithy, alchemist, bank, academy and an inn. <b>Legendary parties</b> gather in capitals: you can hire one, or meet one in the arena final.</p>')}
    ${gp('Arena tournaments', '<p class="small">The arena in Hearthhold and in every capital runs a <b>knockout tournament</b> of eight parties. You fight three bouts (quarterfinal, semifinal, final) against rival parties of the area&#39;s rank. Win a bout and you advance. Bouts end in a yield rather than a death, so a loss costs only the entry fee, but a win pays: prize money for each bout and, for the title, a purse, Guild Credits, reputation and a trophy item. Capital finals can pit you against a <b>legendary party</b> for even bigger rewards. The arena rests for two days after a bracket.</p>')}
    ${gp('Palace and royal commissions', '<p class="small">In a capital with a palace (or a council chamber), a hero with <b>10+ reputation</b> is admitted. The ruler sets <b>royal commissions</b> one rank above your Guild rank for rich rewards. Complete three royal deeds for one nation and you are honoured: permanent +1 LUK, 10 reputation and a legendary gift.</p>')}
    ${gp('Hearthhold, your home city', '<p class=\"small\">Your home city is a pixel-art town with eleven places: the Guild Hall (missions), Barracks (hero), Academy, Bank, Temple, Tavern, Storehouse, Market, Smithy, Alchemist, Arena, and the city gate to the world. It is a small starter city, not one of the great capitals. Villagers wander the streets and the town changes with the time of day.</p>' + gt(['Place', 'What it does'], [['Bank', 'Keep gold safe from death (carried gold loses 15% when you die). The vault earns 0.4% interest per day, up to 150.'], ['Academy', 'Respec the stat points you spend (cost rises each time) and buy lessons for Guild Credits: 1 skill point per lesson, one lesson per 5 levels.'], ['Arena', 'A three-bout knockout tournament against rival parties at your Guild rank. Win to advance; the title pays a purse, credits, reputation and a trophy. Open every 2 days.']]))}
    ${gp('Racial homelands', '<p class=\"small\">Eighteen peoples live across the world in the lands that suit them: elves in forests, dwarves in hills and mountains, orcs in drylands, lizardfolk in marsh and desert, and rarer peoples (celestials, constructs, void-touched) far from home. Each homeland has an inn, a market and <b>elders</b>. Your own kin honour you for free (+2 to the race&#39;s signature stat, +5 reputation); outsiders befriend you for a gift of gold (+1). Each people grants this once, so exploring the whole world makes your hero stronger.</p>')}
    ${gp('Villages and towns', '<p class=\"small\">The world has other settlements. A <b>village</b> has an inn (hire companions, buy rumors, heal injuries, a priest&#39;s blessing) and a general store. A <b>town</b> adds a market, smithy, alchemist and a Guild board. Visiting a settlement makes it a <b>waypoint</b> you can fast-travel to. Several are always within reach of your starting land.</p>')}
    ${gp('Waystones and waypoints', '<p class=\"small\">Attune to a waystone, or visit a village or town, and it becomes a waypoint. You can fast-travel between waypoints and Hearthhold for one day each, but only from town or from another waypoint. Off-screen waypoints show as coloured arrows at the edge of the map.</p>')}
    ${gp('Markers and the overview', '<p class=\"small\"><b>Right-click</b> any tile to drop a marker (right-click it again to remove it), or press Pin. Markers show as red flags with distance arrows when off-screen, and can be listed and travelled to from the Markers panel. The <b>overview map</b> shows everything you have explored; click an explored spot to travel there. Long trips are walked in legs automatically.</p>')}
    ${gp('Inside a dungeon', '<p class=\"small\">Dungeons are a first-person 3D view. Each chamber shows the doors you can take, each with a plaque for the room behind it. Click a door or press 1 to 5 and you walk through it. Walls, floors and doors take their colour from the dungeon theme; the boss waits behind a big red double door. Fights happen in front of the same halls.</p>')}
    ${gp('Dungeons and lairs', '<p class="small">A <b>lair</b> is a four-room dungeon with a rich hoard. The first clear of any map dungeon gives gold, a gear drop, credits, reputation and a large XP bonus. After a delve you are carried home.</p>')}
    ${gp('Boss wardens', gt(['Warden', 'Mechanic'], Object.values(E.WARDENS).map(w => [w.icon + ' ' + w.name, w.desc])) + '<p class="small dim">Dungeons from rank E upward have a warden. It is shown on the boss in combat.</p>')}
    ${gp('Firsts and XP', '<p class="small">Besides discoveries you earn XP for your first encounter with each monster type, each dungeon event, and each dungeon theme. Exploring new land keeps levelling you without grinding the same board.</p>')}
    ${gp('Time', '<p class="small">Each day, injuries tick down every 2 days and the Guild board and shops refresh every 4 days. The map and town show morning, dusk and night. Services such as the board, market and smithy need you to be in Hearthhold.</p>')}
    ${gp('Town', '<p class="small">Hearthhold has eight buildings: Guild Hall (mission board), Market, Smithy, Alchemist, Temple, Tavern, Barracks (hero sheet) and Storehouse (bag).</p>')}</div>`;
  },
  gear() {
    const rar = E.RARITIES.map(r => `<span class="tag" style="color:${r.color};border-color:${r.color}">${r.name}</span>`).join('');
    return `<div class="grid g2">${gp('Slots and rarity', '<p class="small">Eight slots: weapon, off-hand, head, chest, hands, feet, ring, amulet. Higher rarity means better base stats and more affixes.</p><div>' + rar + '</div>')}
    ${gp('Item stats', gt(['Stat', 'Meaning'], [
      ['ATK', 'Adds to your Power (weapons mostly).'], ['DEF', 'Adds to Defense.'], ['EN', 'Adds to max energy.'], ['CRIT', 'Adds to crit chance.'], ['EVADE', 'Adds to evade chance.'],
      ['+stat', 'A bonus to one of the 7 primary stats.']]))}
    ${gp('Affixes', gt(['Affix', 'Effect'], Object.values(D.AFFIXES).map(a => [a.name, a.desc])))}
    ${gp('Durability', '<p class="small">Gear loses durability in fights. At 0 it is Broken and gives only 50% of its stats. Repair at the Smithy.</p>')}
    ${gp('Upgrades (+1 to +5)', '<p class="small">Each level adds to the item&#39;s numbers. Chance of failure rises with level. Failure loses the gold and materials but never destroys the item.</p>')}
    ${gp('Unknown relics and curses', '<p class="small">Unknown relics may be cursed (-10% max HP each). Use an Identify Scroll to check. Void-touched characters are never hit by curses.</p>')}
    ${gp('Selling and salvage', '<p class="small">Selling pays 50% of value. Salvage at the Smithy to get materials for upgrades and alchemy.</p>')}</div>`;
  },
  career() {
    return `<div class="grid g2">${gp('Levels and XP', '<p class="small">XP for the next level is <b>30 x level^2.2</b>. Dungeons more than 5 levels under you pay reduced XP. Cap level 50.</p>')}
    ${gp('Promotion: the rank test', '<p class="small">Rank is earned, not given. At any Guild Hall (Hearthhold, a town or a capital) you can take the <b>rank advancement test</b> once you have finished 2 quests of your rank or higher and can pay the examination fee. There is no minimum level, but the trial is tuned for the next rank&#39;s recommended level. The test is a four-room dungeon of the next rank ending in a guardian. Pass and you are promoted; fail and you pay the fee and rest a day.</p>')}
    ${gp('Area boards and quest ranks', '<p class="small">Every Guild Hall posts contracts <b>for its own area</b>. Hearthhold lists mostly F and E work; a town further out lists harder jobs; a capital lists ten, mostly of its area rank. Every board also keeps a few <b>lower-rank</b> jobs. You can only accept a contract up to <b>one rank above your own</b>. Quest types: clear, hunt, gather, explore, rescue, relic, <b>bounty</b> (find and slay a named elite hiding in the dungeon), <b>extermination</b> (defeat a number of any monsters) and <b>courier</b> jobs (carry a parcel across the world, no fighting).</p>')}
    ${gp('Dungeons are open to all', '<p class="small">No rank is needed to enter any dungeon, whatever your level. The dungeon&#39;s rank only gives a <b>recommended level</b> and a <b>danger rating</b> (Suitable, Dangerous, Deadly) so you can decide whether it is wise.</p>')}
    ${gp('Mission board', gt(['Type', 'Goal'], [
      ['Clear', 'Reach the final room.'], ['Hunt', 'Kill a number of a monster type.'], ['Gather', 'Collect materials.'], ['Explore', 'Visit a number of rooms or events.'],
      ['Rescue', 'Find the survivor.'], ['Relic', 'Recover a relic from the vault.'], ['Emergency', 'Rare, time-limited, high reward.']]) + '<p class="small dim">Every contract has an optional bonus objective. Rewards: gold, Guild Credits, reputation, an item.</p>')}
    ${gp('Hub', gt(['Tab', 'Use'], [
      ['Map', 'Walk the seeded world: biomes, fog, places, dungeons.'], ['Town', 'Illustrated Hearthhold with every building.'], ['Board', 'Pick missions. Refresh for 40g.'], ['Hero', 'Spend points, learn skills, equip.'], ['Bag', 'Stash, consumables, materials.'],
      ['Market', 'General Store, Armory (rotates), credit shop.'], ['Smithy', 'Upgrade, repair, enchant, salvage.'], ['Alchemy', 'Craft potions and bombs.'],
      ['Town', 'Healer, Tavern, Guild hall.']]))}
    ${gp('Injuries', gt(['Injury', 'Effect', 'Cure'], Object.values(D.INJURIES).map(i => [i.icon + ' ' + i.name, i.desc, i.cost + 'g'])) + '<p class="small dim">Injuries heal after 3 expeditions or can be cured early at the healer.</p>')}
    ${gp('Death penalty', '<p class="small">Lose carried loot, 15% gold, about a third of consumables, 25% of the current XP bar and 30% durability. You get a random injury and lose your companion. Levels are kept. Hardcore makes death permanent and records you in the Hall of the Fallen.</p>')}
    ${gp('Reputation', '<p class="small">Missions give Guild reputation. Titles unlock and shops charge up to 15% less.</p>')}</div>`;
  },
  items() {
    return `<div class="grid g2">${gp('Consumables', gt(['Item', 'Effect', 'Price'], Object.entries(D.CONSUMABLES).filter(([k]) => !k.startsWith('book_')).map(([k, c]) => [c.glyph + ' ' + c.name, c.desc, c.price + 'g'])))}
    ${gp('Fast travel', '<p class="small">Hearthhold, attuned <b>waystones</b> and every village or town you have visited are <b>waypoints</b>. From any waypoint (or town) you can travel to any other for free in one day. From the open wild you can still <b>recall</b> to a waypoint for gold (about 30 + 0.8 per tile) and two days. Use the Fast travel panel on the Map tab, double-click a waypoint tile, or press <kbd>H</kbd> to go home when it is free.</p>')}
    ${gp('Parties', '<p class="small">At <b>Hearthhold</b> (tavern or Guild Hall) and in every <b>town or village</b> you visit, a notice board lists parties recruiting <b>for that area</b>: the more dangerous the land around the settlement, the stronger the party and the higher its entry level. The board changes every week.</p><ul class="small"><li><b>Requirements:</b> a minimum level and a minimum number of past expeditions.</li><li><b>Minimum stay:</b> leave before it is served and you pay a fee. After that, leaving is free.</li><li><b>Contract:</b> a party works 5 to 7 expeditions and then moves on.</li><li><b>Upside:</b> 2 or 3 members fight beside you every turn and the party soaks 10% to 16% of the damage you take. A <b>support</b> hero makes the party hit 50% harder and a tank hero adds extra cover.</li><li><b>Downside:</b> the party keeps about 25% to 40% of the gold, loot and mission drops, and 20% to 32% of the XP. Bosses always drop their loot.</li><li>You cannot hold a party and a hired companion at once.</li></ul>')}
    ${gp('Companions', gt(['Companion', 'Effect', 'Cost'], Object.values(D.COMPANIONS).map(c => [c.glyph + ' ' + c.name, c.desc, c.cost + 'g'])) + '<p class="small dim">Hired at the tavern. Lost on death. Rescued survivors join for one dungeon only.</p>')}</div>`;
  },
};
const GUIDE_TABS = [['start', 'Start'], ['stats', 'Stats'], ['rolls', 'Rolls'], ['combat', 'Combat'], ['skills', 'Skills'], ['world', 'World'], ['dungeon', 'Dungeon'], ['gear', 'Gear'], ['items', 'Items'], ['career', 'Career']];
V.guide = function () {
  const g = GUIDE[S.guide] ? S.guide : 'start';
  const nav = `<div class="subtabs">${GUIDE_TABS.map(([id, n]) => `<button class="${g === id ? 'on' : ''}" data-act="guide" data-sub="${id}">${n}</button>`).join('')}</div>`;
  return `<h2>❓ Guide</h2>${nav}${GUIDE[g]()}`;
};
})(typeof globalThis !== 'undefined' ? globalThis : this);
