'use strict';
/* UI: the Guild hall (area board, rank test, courier jobs), arena tournaments, the palace or council, and the grand market. */
(function (root) {
const UI = root.UI, E = UI.E, D = UI.D, S = UI.S, A = UI.actions;
const { esc } = UI;
const RC = { F: '#7bd88f', E: '#6bc8ff', D: '#ffd36b', C: '#ff9b4a', B: '#ff6b6b', A: '#d66bff', S: '#ff4aa0' };
const rtag = r => `<span class="tag" style="color:${RC[r]};border-color:${RC[r]}">${r}</span>`;
const ri = r => E.CAREER_RANKS.indexOf(r);

// ---------- guild ----------
function testCard(car) {
  const t = E.rankTestInfo(car);
  if (t.max) return `<div class="panel"><h3>🎖️ Rank test</h3><p class="small dim">You hold the highest rank the Guild awards. Whispers of an SS rank remain just whispers.</p></div>`;
  const reasons = t.ok ? '' : `<div class="small" style="color:var(--bad)">Still needed: ${esc(t.reasons.join('; '))}.</div>`;
  return `<div class="panel" style="border-color:${RC[t.next]}"><div class="row between"><div style="flex:1;min-width:230px"><h3>🎖️ Rank advancement test: ${rtag(t.cur)} → ${rtag(t.next)}</h3>
    <div class="small dim">Rank is not given for time served. Pass the examiners' trial: a four-room dungeon of rank ${t.next} ending in a guardian (recommended level ${t.need}+, so go in prepared). Requirements: no minimum level, but ${t.wantQ} completed quests of rank ${t.cur} or higher (${Math.min(t.done, t.wantQ)}/${t.wantQ}), and a ${t.fee}g examination fee. Failing costs the fee and a day of rest. Dying in the trial is as real as anywhere.</div>${reasons}</div>
    <button class="primary" data-act="ranktest" ${t.ok ? '' : 'disabled'}>Take the ${t.next}-rank test (${t.fee}g)</button></div></div>`;
}
function courierCard(car) {
  const w = E.worldOf(car), c = car.courier;
  if (c) {
    const left = c.due - w.day;
    return `<div class="panel"><h3>📦 Courier job in progress</h3><div class="item" style="--c:#ffcb3d"><div class="slot">📦</div><div class="body"><b>${esc(c.parcel)} for ${esc(c.to.name)}</b><div class="small dim">${c.dist} tiles from ${esc(c.from)} · ${left >= 0 ? left + ' day(s) left' : '<span style="color:var(--bad)">late: half pay</span>'} · ${c.gold}g, ${c.credits} credits, ${c.rep} rep. The destination is marked on your map. Walk there to deliver.</div></div><button class="tiny danger" data-act="courierabandon">Abandon (-1 rep)</button></div></div>`;
  }
  const o = E.courierOffers(car);
  if (!o.length) return '';
  return `<div class="panel"><h3>📦 Courier jobs</h3><p class="small dim">Carry a parcel to another settlement. No fighting required, just a long walk. Late deliveries pay half.</p>${o.map(x => `<div class="item" style="--c:#ffcb3d"><div class="slot">📦</div><div class="body"><b>${esc(x.parcel)} to ${esc(x.to.name)}</b><div class="small dim">${x.dist} tiles · ${x.days} days · ${x.gold}g · ${x.credits} credits · ${x.rep} rep</div></div><button class="tiny" data-act="courieraccept" data-id="${esc(x.id)}">Take it</button></div>`).join('')}</div>`;
}
UI.guildPanel = function (car) {
  const place = E.guildPlace(car) || { name: 'Hearthhold', kind: 'home', zone: 0 };
  const zr = E.CAREER_RANKS[Math.min(place.zone, 6)], my = E.careerRank(car), up = E.CAREER_RANKS[ri(my) + 1];
  const kind = place.kind === 'capital' ? 'Capital Guild Hall' : place.kind === 'town' ? 'Town Guild Hall' : 'Guild Hall';
  const head = `<div class="panel"><h3>🏛️ ${kind}: ${esc(place.name)}</h3>
    <div class="small">Area rank ${rtag(zr)} · Your Guild rank ${rtag(my)} · Reputation <b style="color:var(--accent)">${car.rep}</b> (${E.repTitle(car.rep)})</div>
    <p class="small dim">Each guild posts contracts for the land around it, so the board here is mostly rank ${zr}, with a few lower-rank jobs${place.zone < 6 ? ' and now and then one rank above' : ''}. You may only accept contracts up to <b>one rank above your own${up ? ' (' + up + ')' : ''}</b>. Dungeons themselves are open to anyone: rank only sets the recommended level and the danger. To advance in rank you must pass the rank test below.</p>
    <p class="small dim">Guild Credits: <b style="color:var(--accent)">${car.credits}</b> · Quests completed: ${Object.values(car.qdone || {}).reduce((a, b) => a + b, 0)}${car.champs ? ' · Arena titles: ' + car.champs : ''}</p></div>`;
  const free = `<div class="panel"><h3>Free expedition</h3><p class="small dim">Skip the contracts and delve at your own pace (no mission rewards). Any rank is open to you. The tag shows how risky it is for your level.</p><div class="row">${E.CAREER_RANKS.map(r => {
    const rec = E.RANKS[r].rec, lvl = car.char.level, dg = lvl < rec - 3 ? ['Deadly', 'var(--bad)'] : lvl < rec ? ['Dangerous', '#ff8a3d'] : lvl > rec + 5 ? ['Easy', 'var(--dim)'] : ['Suitable', 'var(--good)'];
    return `<button data-act="freerun" data-rank="${r}" title="Recommended level ${rec}">${r}-rank <small style="color:${dg[1]}">${dg[0]}</small></button>`;
  }).join('')}</div></div>`;
  return head + testCard(car) + UI.guildBoardPanel(car) + courierCard(car) + free;
};

// ---------- arena ----------
UI.arenaPanel = function (car) {
  const s = E.arenaStatus(car);
  if (!s) return `<div class="panel"><h3>🎯 Arena</h3><p class="small dim">There is no arena here. Hearthhold and the capital cities host tournaments.</p></div>`;
  const where = s.place.kind === 'capital' ? `the ${esc(s.place.name)} Grand Arena` : 'the Hearthhold Arena';
  const intro = `<p class="small dim">Eight parties enter a knockout bracket in ${where}. You fight three bouts (quarterfinal, semifinal, final) against rival parties of rank ${s.rank}, and each win advances you. Bouts end in a yield, not a death: lose and you are simply out. Win the final for a purse, Guild Credits, reputation and a trophy.${s.place.kind === 'capital' ? ' Capital finals sometimes draw a <b>legendary party</b>, and beating one pays half again as much.' : ''}</p>`;
  if (s.t) {
    const rows = s.t.foes.map((f, i) => {
      const st = i < s.t.round ? '✔ won' : i === s.t.round ? '▶ next' : 'waiting';
      const col = i < s.t.round ? 'var(--good)' : i === s.t.round ? 'var(--accent)' : 'var(--dim)';
      return `<div class="item" style="--c:${f.legendary ? '#ffcb3d' : '#8fd0ff'}"><div class="slot">${f.legendary ? '🌟' : '👥'}</div><div class="body"><b>${esc(f.label)}: ${esc(f.name)}</b>${f.legendary ? ' <span class="tag" style="color:#ffcb3d;border-color:#ffcb3d">LEGENDARY</span>' : ''}
        <div class="small dim">${f.members.map(m => D.DUEL_ROLES[m.role].glyph + ' ' + esc(m.name) + ' (' + D.DUEL_ROLES[m.role].name + ')').join(' · ')}</div></div><span class="tag" style="color:${col}">${st}</span></div>`;
    }).join('');
    const next = s.t.foes[s.t.round];
    return `<div class="panel"><h3>🎯 ${esc(s.place.name)} tournament · ${rtag(s.t.rank)}</h3>${rows}
      <div class="row" style="margin-top:10px"><button class="primary big" data-act="tourneyfight">⚔️ Fight the ${esc(next.label.toLowerCase())}</button><button class="danger tiny" data-act="tourneyquit">Withdraw</button></div>
      <p class="small dim">Your hero's HP and energy are restored for every bout, but potions and consumables you use stay used. A hired party fights beside you.</p></div>`;
  }
  const note = s.other ? `<p class="small" style="color:var(--bad)">You are still in a bracket at ${esc(s.other.pname)}. Withdraw there first.</p>` : s.wait ? `<p class="small dim">The next bracket opens in ${s.wait} day${s.wait === 1 ? '' : 's'}.</p>` : '';
  return `<div class="panel"><h3>🎯 ${s.place.kind === 'capital' ? 'Grand Arena' : 'Arena'}</h3>${intro}${note}
    <div class="small">Entry fee <b style="color:var(--accent)">${s.fee}g</b> · Rank <b>${s.rank}</b>${car.champs ? ' · Titles won: ' + car.champs : ''}</div>
    <button class="primary big" data-act="tourneyjoin" ${s.ready && !s.other ? '' : 'disabled'}>🎯 Enter the tournament (${s.fee}g)</button></div>`;
};

// ---------- palace or council ----------
UI.palacePanel = function (car, n) {
  const p = E.palaceInfo(car, n), na = p.nation;
  const seat = na.ruler ? `<b>${esc(na.ruler.title)} ${esc(na.ruler.name)}</b>` : `the <b>${esc(na.council)}</b>`;
  const race = na.mixed ? 'a nation of many peoples' : `a nation of ${esc(na.race)}`;
  const head = `<div class="panel"><h3>${na.ruler ? '🏰 The Palace' : '🏛️ ' + esc(na.council)}: ${esc(na.full)}</h3>
    <p class="small">${esc(n.name)} is the capital of the ${esc(na.full)}, ${race}. It is ruled by ${seat}.${na.ruler ? ' The palace gates are guarded and its halls are full of petitioners.' : ' There is no throne here: the city is governed by committee, and the chamber hears petitions in the open.'}</p>
    <div class="small dim">Standing: ${p.favor}/3 royal deeds${p.knighted ? ' · <span style="color:var(--good)">' + (na.ruler ? 'Knighted' : 'Honorary citizen') + '</span>' : ''}. Do three royal deeds to be honoured with a permanent +1 LUK, 10 reputation and a legendary gift.</div>
    ${p.open ? '' : `<div class="small" style="color:var(--bad)">The guards turn you away. They only admit adventurers with at least ${p.need} reputation (you have ${car.rep}).</div>`}</div>`;
  if (!p.open) return head;
  const offers = E.royalOffers(car, n).map((m, i) => {
    const mt = D.MISSION_TYPES[m.type], tag = E.RANKS[m.rank].rec > car.char.level + 3 ? ['Dangerous', '#ff8a3d'] : ['Suitable', 'var(--good)'];
    return `<div class="scene ${UI.THEME_CLASS[m.themeId] || 'th-none'}" style="margin:0 0 10px"><div class="row between"><div style="flex:1;min-width:220px"><div style="font:700 18px var(--serif)">👑 ${mt.icon} ${mt.name} ${rtag(m.rank)}</div>
      <div class="small"><b>Royal decree</b> from ${esc(m.royal.issuer)} · ${esc(m.theme)} · ${m.rooms} rooms</div><div class="small"><b>Objective:</b> ${esc(m.objective.label)}</div>
      <div class="small"><span style="color:${tag[1]}">${tag[0]}</span> <span class="dim">· recommended level ${m.rec}</span></div>
      <div class="small dim">Reward: ${m.reward.gold}g · ${m.reward.credits} credits · ${m.reward.rep} rep · a ${E.RARITIES[m.reward.itemRarity].name} item · counts toward your standing</div></div>
      <button class="primary" data-act="royaltake" data-i="${i}">Accept</button></div></div>`;
  }).join('');
  return head + `<div class="panel"><h3>📜 Royal commissions</h3><p class="small dim">${na.ruler ? 'The crown' : 'The council'} sets harder tasks than the Guild, one rank above yours, for richer pay. The list changes after every expedition.</p>${offers}</div>`;
};

// ---------- grand market ----------
UI.grandPanel = function (car, n) {
  const g = E.grandStock(car, n);
  const items = g.items.map((it, i) => it.sold ? '' : UI.itemBlock(it, `<button class="tiny" data-act="grandbuy" data-i="${i}" ${car.gold >= it.price ? '' : 'disabled'}>Buy ${it.price}g</button>`)).join('') || '<p class="dim small">Sold out. New stock after your next expedition.</p>';
  return `<div class="panel"><h3>💎 Grand Market of ${esc(n.name)}</h3><p class="small dim">Only fine goods are sold here: every piece is at least uncommon, and the best are rare or better. Gold <b style="color:var(--accent)">${UI.fmt(car.gold)}</b>. Prices are steep.</p>${items}</div>`;
};

// ---------- the city card on the map ----------
UI.capitalBlurb = function (n) {
  const na = n.nation;
  return `<div class="small"><b>${esc(na.full)}</b> · ${na.mixed ? 'a mixed nation' : esc(na.race)} · ${na.ruler ? esc(na.ruler.title) + ' ' + esc(na.ruler.name) : esc(na.council)}</div>`;
};

// ---------- actions ----------
function fin(res) {
  if (res && res.msg) S.msg = res.msg;
  S.hub = E.careerHub(S.save.career);
  UI.persist();
}
function start(m) {
  const car = S.save.career;
  if (UI.stopWalk) UI.stopWalk();
  S.mode = 'career'; UI.persist();
  UI.startRun(E.careerNewRun(car, m));
}
Object.assign(A, {
  ranktest() {
    const car = S.save.career, m = E.rankTestStart(car);
    if (!m || m.error) { S.msg = m ? m.error : 'No test available.'; return; }
    start(m);
  },
  courieraccept(d) { fin(E.courierAccept(S.save.career, d.id)); },
  courierabandon() { fin(E.courierAbandon(S.save.career)); },
  tourneyjoin() { fin(E.tourneyEnter(S.save.career)); },
  tourneyquit() { if (window.confirm('Withdraw from the tournament? The fee is not refunded.')) fin(E.tourneyWithdraw(S.save.career)); },
  tourneyfight() {
    const car = S.save.career, m = E.tourneyFight(car);
    if (!m) { S.msg = 'You are not in a bracket here.'; return; }
    start(m);
    UI.beginCombat('boss');
  },
  royaltake(d) {
    const car = S.save.career, n = E.worldAt(car);
    if (!n || !n.capital) { S.msg = 'You must be in the capital.'; return; }
    const m = E.royalTake(car, n, +d.i);
    if (!m) { S.msg = 'The palace will not give you that commission.'; return; }
    start(m);
  },
  grandbuy(d) { const car = S.save.career, n = E.worldAt(car); if (n && n.capital) fin(E.grandBuy(car, n, +d.i)); },
});
})(typeof globalThis !== 'undefined' ? globalThis : this);
