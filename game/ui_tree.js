'use strict';
/* UI: the skill tree panel (inside the Hero tab and the in-run hero sheet). */
(function (root) {
const UI = root.UI, E = UI.E, D = UI.D, S = UI.S, A = UI.actions;
const { esc } = UI;
const TIER_COL = ['', '#c9ccd1', '#6bd36b', '#5aa7ff', '#b36bff', '#ffcb3d', '#ff5a5a'];

function nodeRow(c, n, canAct, foreign) {
  const has = E.hasNode(c, n.id), why = has ? null : E.nodeWhy(c, n.id);
  const sk = n.skill ? D.SKILLS[n.skill] : null;
  const body = sk ? `<b>New skill: ${esc(sk.name)}</b> <span class="dim small">${sk.ap} AP${sk.en ? ' · ' + sk.en + ' energy' : ''}${sk.cd ? ' · cooldown ' + sk.cd + ' turns' : ''}</span><div class="small dim">${esc(sk.desc)}</div>` : `<b>${esc(n.name)}</b><div class="small dim">${esc(n.desc)}</div>`;
  const btn = has ? '<span class="tag" style="color:var(--good);border-color:var(--good)">✔ learned</span>'
    : canAct ? `<button class="tiny" data-act="learnnode" data-id="${n.id}" ${why ? 'disabled' : ''}>Learn (${n.cost} pt${n.cost > 1 ? 's' : ''})</button>` : `<span class="tag">${n.cost} pts</span>`;
  return `<div class="item ${has ? '' : 'locked'}" style="--c:${has ? '#7bd88f' : TIER_COL[n.tier]}"><div class="slot">${sk ? '✨' : n.passive ? '🛡️' : '⚙️'}</div><div class="body">${body}
    <div class="small"><span class="tag" style="color:${TIER_COL[n.tier]};border-color:${TIER_COL[n.tier]}">Tier ${n.tier} · ${n.label}</span> <span class="dim">level ${n.lvl}</span>${foreign ? ' <span class="tag" style="color:var(--accent)">🔑 secret manual</span>' : ''}${why && !has ? ` <span style="color:var(--bad)">${esc(why)}</span>` : ''}</div></div>${btn}</div>`;
}
UI.treePanel = function (run, canAct) {
  const c = run.char, kind = UI.kindOf(c.prof), sk = E.subKind(c), br = (E.TREE_BY_KIND[kind] || []).concat(sk && sk !== kind ? E.TREE_BY_KIND[sk] : []);
  const keys = (c.keys || []).map(id => E.TREE_NODES[id]).filter(n => n && !E.hasNode(c, n.id));
  const spent = E.treeSpent(c);
  const branches = br.map(b => {
    const got = b.nodes.filter(n => E.hasNode(c, n.id)).length, pts = b.nodes.reduce((a, n) => a + n.cost, 0);
    return `<details class="treebranch" ${got || S.treeOpen === b.id ? 'open' : ''}><summary><b>${esc(b.name)}</b>${b.kind !== kind ? ' <span class="tag" style="color:var(--accent)">Second awakening</span>' : ''} <span class="dim small">${got}/${b.nodes.length} · ${pts} pts for all · ${esc(b.desc)}</span></summary>${b.nodes.map(n => nodeRow(c, n, canAct, false)).join('')}</details>`;
  }).join('');
  const keyBlock = keys.length ? `<h3 style="margin-top:12px">🔑 Secret manuals</h3><p class="small dim">Found on the road. Each opens one node of any discipline, whatever your class or tier.</p>${keys.map(n => { const b = E.TREE_BRANCH_BY[n.branch]; return `<div class="small dim" style="margin-top:6px">${esc(b.name)} (${esc(b.kind)}) · tier ${n.tier}</div>${nodeRow(c, n, canAct, true)}`; }).join('')}` : '';
  const gate = `Tier 3 needs an Uncommon class, tier 4 a Rare class, tier 5 a Legendary class and tier 6 a Mythic class. A secret manual lifts that for one node.`;
  return `<div class="panel"><h3>🌳 Skill tree · ${Art.KIND_LABEL[kind]}</h3>
    <div class="small dim">Skill points: <b style="color:var(--accent)">${c.skillPts}</b> · Spent in the tree: <b>${spent}</b>. Three branches, six nodes each (25 points a branch), so you cannot have everything: specialise. Nodes upgrade your skills, add passives or give new skills. ${gate}</div>
    ${branches}${keyBlock}</div>`;
};
// the Hero tab shows the skill list first, then the tree
const baseSkills = UI.skillsPanel;
UI.skillsPanel = function (run, canAct) { return baseSkills(run, canAct) + UI.treePanel(run, canAct); };

Object.assign(A, {
  learnnode(d) {
    const r = UI.ctxRun(), id = d.id;
    S.treeOpen = E.TREE_NODES[id] ? E.TREE_NODES[id].branch : null;
    if (E.learnNode(r.char, id)) { S.msg = `Learned ${E.TREE_NODES[id].skill ? E.SKILLS[E.TREE_NODES[id].skill].name : E.TREE_NODES[id].name}.`; E.refresh(r); }
    if (S.screen === 'hub') { E.refresh(S.hub); UI.persist(); }
  },
  treereset() {
    const car = S.save.career, r = E.treeResetCareer(car);
    S.msg = r.msg; S.hub = E.careerHub(car); UI.persist();
  },
});
})(typeof globalThis !== 'undefined' ? globalThis : this);
