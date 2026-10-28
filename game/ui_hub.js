'use strict';
/* UI: career start screens and the Guild hub (board, hero, bag, market, smithy, alchemy, town). */
(function (root) {
const UI = root.UI, E = UI.E, D = UI.D, S = UI.S, V = UI.views;
const { esc, bar, tierOf, tierTag, raceColor, kindOf } = UI;

V.careerhome = function () {
  const slots = UI.slotBar();
  return slots + `<div class="scene th-none motes"><h2>Career</h2><div class="dim">One adventurer. Seven ranks. A very long climb.</div></div>
    <div class="grid g2">
    <div class="panel modecard career"><h3>How it works</h3>
      <div class="tip">Roll three level-1 adventurers and keep one for the whole career. You have 3 career slots, so you can run several adventurers in parallel.</div>
      <div class="tip">Take missions from the Guild board: clear, hunt, gather, explore, rescue, relic recovery.</div>
      <div class="tip">Shop, upgrade, craft, heal, hire companions. Gear wears out and must be repaired.</div>
      <div class="tip">XP per level grows as <b>30 x level^2.2</b>. Level 30 needs 53k XP; level 49 needs 157k.</div>
      <div class="tip">Dying costs loot, gold, consumables, gear durability, XP, and gives an injury. Never your levels.</div>
      <div class="seedbox"><div class="small dim">🌱 World seed (optional). The same seed always makes the same world. Leave blank for a random one.</div>
        <div class="row"><input id="seedinput" class="seedinput" type="text" maxlength="40" placeholder="e.g. hello, minecraft, 1234" value="${esc(S.worldSeed || '')}"><button class="tiny" data-act="seedrandom">🎲 Random</button></div>
        <canvas id="seedprev" class="seedprev" width="360" height="210"></canvas><div class="small dim">Preview of the land around Hearthhold (yellow). Red = dungeons, orange = lairs.</div></div>
      <label class="check"><input type="checkbox" data-act="hardcore" ${S.hardcore ? 'checked' : ''}> Hardcore: death is permanent</label>
      <p><button class="primary big" data-act="careerbegin">Begin a new career</button></p></div>
    <div class="panel"><h3>Guild ranks</h3><table class="t"><tr><th>Rank</th><th>Rooms</th><th>Rec. level</th></tr>${E.CAREER_RANKS.map(r => `<tr><td><b>${r}</b></td><td>${E.RANKS[r].rooms}</td><td>${E.RANKS[r].rec}</td></tr>`).join('')}</table>
    <p class="small dim">Promotion needs a clear of the previous rank and a level close to the next rank's recommendation.</p>
    ${S.save.fallen.length ? `<h3 style="margin-top:12px">Hall of the Fallen</h3>${S.save.fallen.slice(-6).reverse().map(f => `<div class="small dim">☠️ ${esc(f.name)} the ${esc(f.prof)}: level ${f.level}, rank ${f.rank}, ${f.runs} expeditions</div>`).join('')}` : ''}</div></div>`;
};
V.careerroll = function () {
  const cards = S.save.careerRolls.map((c, i) => UI.charCard(c, i, 'careerpick')).join('');
  return `<h2>Begin your career${S.hardcore ? ' <span class="tag" style="color:var(--bad);border-color:var(--bad)">HARDCORE</span>' : ''}</h2><p class="dim small">Three adventurers, all level 1. Choose one to carry from F-rank to the top. You can reroll all three while starting.</p>
    <p class="row rollbar"><button data-act="careerreroll">Reroll all three <kbd>R</kbd></button><button data-act="careerhome">Back <kbd>Esc</kbd></button></p>
    <div class="grid g3 rollcards">${cards}</div>`;
};

// ---------- hub ----------
function dangerTag(lvl, rec) {
  return lvl < rec - 3 ? ['Deadly', 'var(--bad)'] : lvl < rec ? ['Dangerous', '#ff8a3d'] : lvl > rec + 5 ? ['Outleveled: reduced XP', 'var(--dim)'] : ['Suitable', 'var(--good)'];
}
function missionCard(car, m, i) {
  const rk = E.RANKS[m.rank], mt = D.MISSION_TYPES[m.type], lvl = car.char.level;
  const tag = dangerTag(lvl, m.rec), cls = UI.THEME_CLASS[m.themeId] || 'th-none';
  const an = m.anomaly && car.rumor ? `<div class="small" style="color:var(--accent)">${E.ANOMALIES[m.anomaly].icon} ${esc(E.ANOMALIES[m.anomaly].name)}: ${esc(E.ANOMALIES[m.anomaly].desc)}</div>` : (m.anomaly ? '<div class="small dim">❔ Anomaly detected (buy a rumor at the tavern to learn more)</div>' : '');
  return `<div class="scene ${cls}" style="margin:0"><div class="row between"><div style="flex:1;min-width:220px">
    <div style="font:700 19px var(--serif)">${mt.icon} ${mt.name}${m.emergency ? ' <span class="tag" style="color:var(--bad);border-color:var(--bad)">EMERGENCY</span>' : ''}</div>
    <div class="small">${m.rank}-rank · ${esc(m.theme)} · ${m.rooms} rooms · boss ${esc(m.boss)}${m.corrupted ? ' <span style="color:var(--purple)">(corrupted)</span>' : ''}</div>
    <div class="small"><b>Objective:</b> ${esc(m.objective.label)}</div>
    ${m.optional ? `<div class="small dim">Bonus: ${esc(m.optional.label)} (+${Math.round(m.optional.bonus * 100)}% gold)</div>` : ''}
    ${an}
    <div class="small"><span style="color:${tag[1]}">${tag[0]}</span> <span class="dim">· recommended level ${m.rec}</span></div>
    <div class="small dim">Reward: ${m.reward.gold}g · ${m.reward.credits} credits · ${m.reward.rep} rep · ${E.RARITIES[m.reward.itemRarity].name} item</div></div>
    <button class="primary" data-act="embark" data-i="${i}">Embark</button></div></div>`;
}
function hubBoard(car) {
  const board = E.careerBoard(car);
  const rows = board.map((m, i) => missionCard(car, m, i)).join('');
  const quick = `<div class="panel"><h3>Free expedition</h3><p class="small dim">Skip the contracts and delve at your own pace (no mission rewards).</p><div class="row">${E.CAREER_RANKS.filter(r => E.careerUnlocked(car, r)).map(r => `<button data-act="freerun" data-rank="${r}">${r}-rank</button>`).join('')}</div></div>`;
  return `<div class="panel"><div class="row between"><h3 style="flex:1">Guild mission board</h3><button class="tiny" data-act="refreshboard" ${car.gold >= 40 ? '' : 'disabled'}>Refresh board (40g)</button></div><div class="grid g2">${rows}</div>
    <p class="small dim">Each expedition refreshes the board. Completing a mission pays gold, Guild Credits, reputation and a gear reward. Objectives other than clearing the boss can be finished and then extracted.</p></div>${quick}`;
}
function hubHero(car) {
  const hub = S.hub;
  const talents = car.char.talents.map(id => `<div class="small"><b>${esc(E.TALENT_BY[id].name)}:</b> <span class="dim">${esc(E.TALENT_BY[id].desc)}</span></div>`).join('');
  return `<div class="grid g2"><div>${UI.sheetPanel(hub, true)}<div class="panel"><h3>Talents</h3>${talents}</div>${UI.equipPanel(hub, true)}</div><div>${UI.skillsPanel(hub, true)}</div></div>`;
}
function hubBag(car) {
  const hub = S.hub;
  return `<div class="grid g2"><div>${UI.invPanel(hub, 'Stash (safe)', { salvage: true, empty: 'Empty. Loot you bring home lands here. Stash holds 40 items.' })}</div>
    <div>${UI.consPanel(hub, { combat: false, empty: true })}<div class="panel"><h3>Materials</h3>${UI.matsLine(car.mats)}<p class="small dim">Used by the Blacksmith and Alchemist.</p></div>
    <div class="panel"><h3>Potions</h3><p>${car.potions} healing potion(s). Heal 40% max HP in a dungeon.</p></div></div></div>`;
}
function hubMarket(car) {
  const consIds = Object.keys(E.CONSUMABLES).filter(k => !E.CONSUMABLES[k].book);
  const gen = [`<div class="item" style="--c:#ff8a8a"><div class="slot">🧪</div><div class="body"><b>Healing Potion</b><div class="small dim">Heal 40% max HP. You hold ${car.potions}.</div></div><button class="tiny" data-act="potbuy" ${car.gold >= E.careerPotionPrice(car) ? '' : 'disabled'}>Buy ${E.careerPotionPrice(car)}g</button></div>`]
    .concat(consIds.map(id => { const c = E.CONSUMABLES[id], p = E.careerConsPrice(car, id); return `<div class="item" style="--c:#8fd0ff"><div class="slot">${c.glyph}</div><div class="body"><b>${esc(c.name)}</b> <span class="dim small">(have ${car.cons[id] || 0})</span><div class="small dim">${esc(c.desc)}</div></div><button class="tiny" data-act="consbuy" data-id="${id}" ${car.gold >= p ? '' : 'disabled'}>Buy ${p}g</button></div>`; })).join('');
  const shop = E.careerShop(car);
  const arm = shop.items.map((it, i) => it.sold ? '' : UI.itemBlock(it, `<button class="tiny" data-act="shopbuy" data-i="${i}" ${car.gold >= it.price ? '' : 'disabled'}>Buy ${it.price}g</button>`)).join('') || '<p class="dim small">Sold out. New stock after your next expedition.</p>';
  const credit = Object.keys(E.CONSUMABLES).filter(k => E.CONSUMABLES[k].book || ['strength_elixir', 'ward_scroll', 'escape_scroll'].includes(k)).map(id => {
    const c = E.CONSUMABLES[id], p = E.creditPrice(id);
    return `<div class="item" style="--c:#ffcb3d"><div class="slot">${c.glyph}</div><div class="body"><b>${esc(c.name)}</b><div class="small dim">${esc(c.desc)}</div></div><button class="tiny" data-act="credbuy" data-id="${id}" ${car.credits >= p ? '' : 'disabled'}>${p} credits</button></div>`;
  }).join('');
  return `<div class="grid g2"><div><div class="panel"><h3>🏪 General store</h3><p class="small dim">Gold: <b style="color:var(--accent)">${car.gold}</b>. Prices scale with your rank. Reputation gives up to 15% off.</p>${gen}</div></div>
    <div><div class="panel"><h3>⚔️ Armory (rotating stock)</h3>${arm}</div>
    <div class="panel"><h3>🏛️ Guild credit shop</h3><p class="small dim">Credits: <b style="color:var(--accent)">${car.credits}</b>. Earned from missions. Tomes teach skills from other disciplines.</p>${credit}</div></div></div>`;
}
function hubSmith(car) {
  const all = [];
  for (const s of E.SLOTS) if (car.equip[s]) all.push({ it: car.equip[s], where: 'equipped' });
  for (const it of car.stash) all.push({ it, where: 'stash' });
  if (S.smithSel && !all.some(x => x.it.id === S.smithSel)) S.smithSel = null;
  const list = all.map(x => UI.itemBlock(x.it, `<button class="tiny ${S.smithSel === x.it.id ? 'primary' : ''}" data-act="smithsel" data-id="${x.it.id}">${S.smithSel === x.it.id ? 'Selected' : 'Select'}</button>`, { sel: S.smithSel === x.it.id })).join('') || '<p class="dim small">No items.</p>';
  let detail = '<p class="dim small">Select an item to upgrade, repair, enchant or salvage it.</p>';
  const f = S.smithSel ? E.findItem(car, S.smithSel) : null;
  if (f && !(f.it.unknown && !f.it.revealed)) {
    const it = f.it, up = E.upgradeInfo(car, it), rp = E.repairCost(car, it), en = E.enchantInfo(car, it);
    const matsTxt = m => Object.keys(m).map(k => `<span class="tag" style="${(car.mats[k] || 0) >= m[k] ? '' : 'color:var(--bad)'}">${E.MATERIALS[k].glyph} ${E.MATERIALS[k].name} ${car.mats[k] || 0}/${m[k]}</span>`).join('');
    detail = `${UI.itemBlock(it, '')}
      <div class="panel" style="margin:8px 0"><h3>Upgrade</h3>${up.max ? '<p class="dim small">Already +5.</p>' : `<div class="small">+${(it.up || 0)} → +${(it.up || 0) + 1} (+10% stats). Success ${Math.round(up.chance * 100)}%. Cost ${up.gold}g</div><div>${matsTxt(up.mats)}</div><button class="tiny" data-act="upgrade" data-id="${it.id}">Upgrade</button>`}</div>
      <div class="panel" style="margin:8px 0"><h3>Repair</h3>${rp ? `<div class="small">Restore ${it.maxDur - it.dur} durability for ${rp}g.</div><button class="tiny" data-act="repair" data-id="${it.id}" ${car.gold >= rp ? '' : 'disabled'}>Repair</button>` : '<p class="dim small">In perfect condition.</p>'}</div>
      <div class="panel" style="margin:8px 0"><h3>Enchant</h3>${en.max ? '<p class="dim small">Already carries three affixes.</p>' : `<div class="small">Add a random affix. Cost ${en.gold}g</div><div>${matsTxt(en.mats)}</div><button class="tiny" data-act="enchant" data-id="${it.id}">Enchant</button>`}</div>
      ${f.where === 'stash' ? `<div class="panel" style="margin:8px 0"><h3>Salvage</h3><div class="small">Break it into materials.</div><button class="tiny danger" data-act="salvage" data-id="${it.id}">Salvage</button></div>` : '<p class="small dim">Unequip an item first to salvage it.</p>'}`;
  } else if (f) detail = '<p class="dim small">Identify or equip this relic first to reveal its nature.</p>';
  return `<div class="grid g2"><div><div class="panel"><div class="row between"><h3 style="flex:1">⚒️ Items</h3><button class="tiny" data-act="repairall">Repair all equipped</button></div>${list}</div></div>
    <div><div class="panel"><h3>Blacksmith</h3><p class="small dim">Gold <b style="color:var(--accent)">${car.gold}</b>. Upgrades above +2 can fail and then the materials are lost.</p>${detail}</div><div class="panel"><h3>Materials</h3>${UI.matsLine(car.mats)}</div></div></div>`;
}
function hubAlchemy(car) {
  const rows = E.RECIPES.map(r => {
    const ok = car.gold >= r.gold && Object.keys(r.inputs).every(k => (car.mats[k] || 0) >= r.inputs[k]);
    const inputs = Object.keys(r.inputs).map(k => `<span class="tag" style="${(car.mats[k] || 0) >= r.inputs[k] ? '' : 'color:var(--bad)'}">${E.MATERIALS[k].glyph} ${E.MATERIALS[k].name} ${car.mats[k] || 0}/${r.inputs[k]}</span>`).join('');
    const out = Object.keys(r.out).map(k => `${r.out[k]}× ${E.CONSUMABLES[k].name}`).join(', ');
    return `<div class="item" style="--c:#7bd88f"><div class="slot">${E.CONSUMABLES[Object.keys(r.out)[0]].glyph}</div><div class="body"><b>${esc(r.name)}</b> <span class="dim small">→ ${out} · ${r.gold}g</span><div>${inputs}</div></div><button class="tiny" data-act="craft" data-id="${r.id}" ${ok ? '' : 'disabled'}>Craft</button></div>`;
  }).join('');
  const bonus = E.PROF_BY[car.char.prof].alchemist ? '<p class="small" style="color:var(--good)">Alchemist bonus: every craft yields +1.</p>' : '';
  return `<div class="grid g2"><div class="panel"><h3>⚗️ Alchemy bench</h3><p class="small dim">Turn monster and dungeon materials into supplies. Gold <b style="color:var(--accent)">${car.gold}</b>.</p>${bonus}${rows}</div>
    <div><div class="panel"><h3>Materials</h3>${UI.matsLine(car.mats)}</div>${UI.consPanel(S.hub, { combat: false, empty: true })}</div></div>`;
}
// Temporary parties: who is recruiting here depends on the place and on the danger of the area around it.
UI.partyPanel = function (car) {
  const p = car.party, place = E.partyPlace(car);
  const mem = ms => ms.map(m => `<span class="tag" title="${esc(D.COMPANIONS[m.id].desc)}">${D.COMPANIONS[m.id].glyph} ${esc(m.name)}</span>`).join(' ');
  const pct = x => Math.round((1 - x) * 100) + '%';
  let cur = '';
  if (p) {
    const fee = E.partyLeaveFee(car);
    cur = `<div class="item" style="--c:#8fd0ff"><div class="slot">👥</div><div class="body"><b>${esc(p.name)}</b> <span class="dim small">(${p.left} expeditions left, ${p.done} done)</span><div>${mem(p.members)}</div>
      <div class="small dim">Takes ${pct(p.lootMul)} of gold and drops, ${pct(p.xpMul)} of XP. Absorbs about ${Math.round(p.shield * 100)}% of damage and fights every turn.</div></div>
      <button class="tiny danger" data-act="partyleave" ${car.gold >= fee ? '' : 'disabled'} title="${fee ? 'Leaving before the minimum stay costs ' + fee + 'g' : 'You have served your minimum stay'}">${fee ? 'Leave (' + fee + 'g)' : 'Leave'}</button></div>`;
  }
  let board = '';
  if (!place) board = '<p class="dim small">No one is recruiting here. Visit Hearthhold, a town or a village.</p>';
  else if (!p) {
    const offers = E.partyOffers(car);
    board = `<p class="small dim">${esc(place.name)} (area rank ${E.CAREER_RANKS[Math.min(place.zone, 6)]}). The notice board changes every week.</p>` + offers.map(o => {
      const why = car.companion ? 'Dismiss your companion first' : car.char.level < o.minLevel ? `Needs level ${o.minLevel}` : (car.runs || 0) < o.needRuns ? `Needs ${o.needRuns} expeditions` : '';
      return `<div class="item" style="--c:#8fd0ff"><div class="slot">👥</div><div class="body"><b>${esc(o.name)}</b> <span class="dim small">· rank ${o.zone} area</span><div>${mem(o.members)}</div>
        <div class="small dim">Level ${o.minLevel}+ · ${o.needRuns}+ expeditions · stay ${o.stay}+ or pay ${o.leavePay}g · works ${o.total} expeditions · gold/loot ${pct(o.lootMul)}, XP ${pct(o.xpMul)}, damage -${Math.round(o.shield * 100)}%</div></div>
        <button class="tiny" data-act="partyjoin" data-id="${esc(o.id)}" ${why ? 'disabled' : ''} title="${esc(why)}">${why || 'Join'}</button></div>`;
    }).join('');
  }
  return `<div class="panel"><h3>👥 Parties</h3><p class="small dim">Adventuring with a party is safer, because its members fight beside you and soak damage, but they keep a share of the gold, loot and XP. Support heroes make a party hit harder.</p>${cur}${board}</div>`;
};
function townPanels(car) {
  const inj = car.char.injuries || [];
  const healer = inj.length ? inj.map(i => `<div class="item" style="--c:#ff8a8a"><div class="slot">${E.INJURIES[i.id].icon}</div><div class="body"><b>${esc(E.INJURIES[i.id].name)}</b> <span class="dim small">(${i.left} expedition${i.left > 1 ? 's' : ''} left)</span><div class="small dim">${esc(E.INJURIES[i.id].desc)}</div></div><button class="tiny" data-act="cure" data-id="${i.id}" ${car.gold >= E.healCost(car, i.id) ? '' : 'disabled'}>Heal ${E.healCost(car, i.id)}g</button></div>`).join('') : '<p class="dim small">You are in good health.</p>';
  const comp = car.companion ? `<div class="item" style="--c:#8fe08f"><div class="slot">${D.COMPANIONS[car.companion.id].glyph}</div><div class="body"><b>${esc(car.companion.name)}</b> <span class="dim small">(${car.companion.left} expeditions left)</span><div class="small dim">${esc(D.COMPANIONS[car.companion.id].desc)}</div></div><button class="tiny danger" data-act="dismiss">Dismiss</button></div>` : '<p class="dim small">No companion. Hire one below. Companions act every turn but are lost if you die.</p>';
  const hire = Object.keys(D.COMPANIONS).map(id => { const c = D.COMPANIONS[id], p = E.hireCost(car, id); return `<div class="item" style="--c:#8fe08f"><div class="slot">${c.glyph}</div><div class="body"><b>${esc(c.name)}</b><div class="small dim">${esc(c.desc)}</div></div><button class="tiny" data-act="hire" data-id="${id}" ${car.gold >= p && !car.companion ? '' : 'disabled'}>Hire ${p}g</button></div>`; }).join('');
  const rumor = car.rumor ? `<p class="small" style="color:var(--accent)">${esc(E.rumorText(car))}</p>` : `<button class="tiny" data-act="rumor" ${car.gold >= E.rumorCost(car) ? '' : 'disabled'}>Buy a rumor (${E.rumorCost(car)}g): reveal anomalies on the board</button>`;
  const rep = car.rep, titles = D.REP_TITLES, ti = titles.findIndex(t => t[0] > rep), next = ti < 0 ? null : titles[ti];
  const ranks = E.CAREER_RANKS.map(r => `<tr><td><b>${r}</b></td><td>${E.RANKS[r].rec - 3}+</td><td>${car.clears[r]}</td><td>${E.careerUnlocked(car, r) ? '✔' : '🔒'}</td></tr>`).join('');
  const healerP = `<div class="panel"><h3>⛪ Healer</h3><p class="small dim">Injuries from defeat fade after a few expeditions, or you can pay to heal them.</p>${healer}
      <div class="item" style="--c:#ffe08a"><div class="slot">✨</div><div class="body"><b>Priest's blessing</b><div class="small dim">+15% damage on your next expedition.${car.blessNext ? ' (active)' : ''}</div></div><button class="tiny" data-act="bless" ${car.gold >= E.blessingCost(car) && !car.blessNext ? '' : 'disabled'}>${E.blessingCost(car)}g</button></div></div>`;
  const partyP = UI.partyPanel(car);
  const tavernP = `
<div class="panel"><h3>🍺 Tavern</h3>${comp}<h3 style="margin-top:10px">Hire a companion</h3>${hire}<div style="margin-top:8px">${rumor}</div></div>${partyP}`;
  const guildP = `
<div class="panel"><h3>🏛️ Guild hall</h3><p>Reputation: <b style="color:var(--accent)">${rep}</b> (${E.repTitle(rep)})${next ? ` · next title at ${next[0]}` : ''}</p>${bar(rep, next ? next[0] : Math.max(1, rep), 'xp')}
      <p class="small dim">Reputation lowers shop prices (up to 15%). Completing missions raises it; abandoning or failing them lowers it.</p><p>Guild Credits: <b style="color:var(--accent)">${car.credits}</b></p>
      <table class="t"><tr><th>Rank</th><th>Level</th><th>Clears</th><th>Open</th></tr>${ranks}</table></div>`;
  const recordP = `
<div class="panel"><h3>Career record</h3><div class="small">Expeditions ${car.runs} · Defeats ${car.deaths}${car.hardcore ? ' · <span style="color:var(--bad)">Hardcore</span>' : ''}</div></div>
    ${S.save.fallen.length ? `<div class="panel"><h3>Hall of the Fallen</h3>${S.save.fallen.slice(-6).reverse().map(f => `<div class="small dim">☠️ ${esc(f.name)} the ${esc(f.prof)}: level ${f.level}, rank ${f.rank}</div>`).join('')}</div>` : ''}`;
  return { healer: healerP, tavern: tavernP, guild: guildP, record: recordP };
}
V.hub = function () {
  const car = S.save.career, c = car.char, t = tierOf(c.tier);
  const need = E.xpNeeded(c.level, true), rank = E.careerRank(car);
  const idx = E.CAREER_RANKS.indexOf(rank), nextR = E.CAREER_RANKS[idx + 1];
  const nextInfo = nextR ? `Next rank ${nextR}: clear a ${rank}-rank dungeon and reach level ${E.RANKS[nextR].rec - 3}.` : 'You hold the highest rank. SS and beyond are rumors.';
  const sub = [['map', '🗺️ Map'], ['town', '🏰 Town'], ['board', '📜 Board'], ['hero', '🧙 Hero'], ['bag', '🎒 Bag'], ['market', '🏪 Market'], ['smith', '⚒️ Smithy'], ['alchemy', '⚗️ Alchemy']];
  const nav = `<div class="subtabs">${sub.map(([id, n]) => `<button class="${S.hubTab === id ? 'on' : ''}" data-act="hubtab" data-sub="${id}">${n}${id === 'hero' && (c.points > 0 || c.skillPts > 0) ? ' <span class="dot"></span>' : ''}</button>`).join('')}</div>`;
  if (!sub.some(x => x[0] === S.hubTab)) S.hubTab = 'map';
  const away = !E.worldInTown(car) && ['board', 'market', 'smith', 'alchemy'].includes(S.hubTab);
  const body = away ? UI.awayPanel(car) : { board: hubBoard, hero: hubHero, bag: hubBag, market: hubMarket, smith: hubSmith, alchemy: hubAlchemy, town: UI.hubTownView, map: UI.hubMap }[S.hubTab](car);
  const comp = (car.companion ? `<span class="tag" style="color:var(--good)">${D.COMPANIONS[car.companion.id].glyph} ${esc(car.companion.name)}</span>` : '') + (car.party ? `<span class="tag" style="color:var(--good)">👥 ${esc(car.party.name)}</span>` : '');
  return UI.slotBar() + `<div class="panel charcard tier-${c.tier}" style="border-color:${t.color};--glow:${t.color}44">
    <div class="charhead">${UI.portrait(c, 92)}<div class="info">
      <div class="charname">${esc(c.name)} ${car.hardcore ? '<span class="tag" style="color:var(--bad);border-color:var(--bad)">HARDCORE</span>' : ''}</div>
      <div><span style="color:${raceColor(c.race)}">${esc(c.race)}</span> · <span class="badge" style="color:${t.color}">${Art.emblem(kindOf(c.prof), t.color, 18)} <b>${esc(c.prof)}</b></span> ${tierTag(c.tier)}</div>
      <div class="small dim">Guild rank <b style="color:var(--accent)">${rank}</b> · ${E.repTitle(car.rep)} · Level <b>${c.level}</b>${c.level >= E.CAREER_MAX_LEVEL ? ' (max)' : ''} · ${c.potential}</div>
      <div class="small dim" style="margin-top:4px">XP ${UI.fmt(c.xp)} / ${UI.fmt(need)}</div>${bar(c.xp, need, 'xp')}
      <div class="small" style="margin-top:6px">Gold <b style="color:var(--accent)">${UI.fmt(car.gold)}</b> · Credits <b>${car.credits}</b> · Potions <b>${car.potions}</b> · Expeditions ${car.runs} · Defeats ${car.deaths} ${comp}${car.blessNext ? '<span class="tag" style="color:var(--accent)">✨ Blessed</span>' : ''}</div>
      <div style="margin-top:4px">${UI.injuryTags(c)}</div>
    </div></div><div class="small dim">${esc(nextInfo)}</div></div>
  ${nav}${body}<p class="row"><button class="danger tiny" data-act="retire">Retire this career</button></p>`;
};
UI.hubParts = { hubBoard, hubHero, hubBag, hubMarket, hubSmith, hubAlchemy, townPanels };
})(typeof globalThis !== 'undefined' ? globalThis : this);
