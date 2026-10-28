'use strict';
/* Daily Random Dungeon - core: RNG, characters, items, derived stats, skills. */
(function (root) {
const E = root.Engine = root.Engine || {};
const D = root.DATA;

// ---------- RNG ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
class RNG {
  constructor(seed) { this.f = mulberry32(typeof seed === 'string' ? hashStr(seed) : seed >>> 0); }
  next() { return this.f(); }
  int(a, b) { return a + Math.floor(this.f() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  weighted(items, wfn) {
    let total = 0;
    const ws = items.map(i => { const w = wfn(i); total += w; return w; });
    let r = this.f() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  }
}

// ---------- Static data ----------
const STATS = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'DEX', 'WIL']; // spendable; LUK is separate and never spendable
const STAT_ROLE = {
  STR: 'Heavy blows: skills costing 2+ AP deal +0.6% damage per point (max +24%). Attack stat for melee, tank and hybrid.',
  AGI: 'Evade +1.2%, crit +0.8% per point. Each skill has an AGI x 0.8% chance (max 25%) to refund 1 AP, once per turn. Attack stat for rogues.',
  VIT: 'Max HP +4 per point, defense +1 per 3 points, and Stamina for non-casters.',
  INT: 'Poison, burn and bleed you inflict hurt +2% more per point (max +80%). Mana for casters. Attack stat for magic, summon and hybrid. Skills from a Tome scale from their own discipline stat.',
  WIS: 'Healing +1% per point, potions +1% per point, and damage-over-time on you is reduced 1.5% per point (max 45%). Mana for casters. Attack stat for support.',
  DEX: 'Crit +0.8% and crit damage +0.5% per point. Attack stat for ranged.',
  WIL: 'Energy regen +1 per 6 points, chance to shrug off Stagger and Curse (2% per point, max 50%), and a chance to survive a killing blow once per dungeon (1.2% per point, max 25%).',
  LUK: 'Rolled at creation, never spendable. Loot rarity, secret rooms, drop chance, Gamble rolls and event checks.',
};
const STAT_NAMES = { STR: 'Strength', AGI: 'Agility', VIT: 'Vitality', INT: 'Intelligence', WIS: 'Wisdom', DEX: 'Dexterity', WIL: 'Willpower', LUK: 'Luck' };
const TIERS = [
  { id: 'C', name: 'Common',    weight: 60,  budget: 40, var: 4,  color: '#c9ccd1' },
  { id: 'U', name: 'Uncommon',  weight: 25,  budget: 46, var: 5,  color: '#6bd36b' },
  { id: 'R', name: 'Rare',      weight: 10,  budget: 54, var: 6,  color: '#5aa7ff' },
  { id: 'E', name: 'Epic',      weight: 4,   budget: 62, var: 7,  color: '#b36bff' },
  { id: 'L', name: 'Legendary', weight: 0.9, budget: 72, var: 8,  color: '#ffcb3d' },
  { id: 'M', name: 'Mythic',    weight: 0.1, budget: 85, var: 10, color: '#ff5a5a' },
];
const TIER_BY = Object.fromEntries(TIERS.map((t, i) => [t.id, i]));
const POTENTIALS = [
  { name: 'Ordinary', weight: 40, pts: 3 }, { name: 'Promising', weight: 30, pts: 3 }, { name: 'Exceptional', weight: 18, pts: 4 },
  { name: 'Genius', weight: 8, pts: 4 }, { name: 'Extraordinary', weight: 3.5, pts: 5 }, { name: 'Mythic', weight: 0.5, pts: 6 },
];
const RACES = [
  { name: 'Human', tier: 'C', weight: 30, mods: {}, fx: { xp: 0.1 }, trait: 'Adaptable: +10% XP.' },
  { name: 'Elf', tier: 'C', weight: 18, mods: { INT: 2, DEX: 1 }, fx: { maxEn: 4 }, trait: 'Deep mana reserves (+4 energy).' },
  { name: 'Dwarf', tier: 'C', weight: 16, mods: { VIT: 2 }, fx: { poisonRes: 1 }, trait: 'Poison hurts half as much.' },
  { name: 'Beastkin', tier: 'C', weight: 16, mods: { AGI: 2 }, fx: { secret: 0.06 }, trait: 'Keen senses find hidden rooms.' },
  { name: 'Halfling', tier: 'U', weight: 5, mods: { DEX: 1 }, fx: { luckFloor: 3 }, trait: 'Born lucky (LUK never below 3).' },
  { name: 'Orc', tier: 'U', weight: 5, mods: { STR: 3 }, fx: { rage: 1 }, trait: 'Rage: +30% damage below 30% HP.' },
  { name: 'Gnome', tier: 'U', weight: 4, mods: { INT: 2 }, fx: { potion: 0.25 }, trait: 'Potions heal 25% more.' },
  { name: 'Lizardfolk', tier: 'U', weight: 3, mods: { AGI: 1, VIT: 1 }, fx: { poisonRes: 1 }, trait: 'Cold-blooded: poison resistant.' },
  { name: 'Dragonkin', tier: 'R', weight: 1.5, mods: { STR: 2, VIT: 1 }, fx: { burnImmune: 1, hpMult: 0.1 }, trait: 'Scaled: +10% HP, immune to burning.' },
  { name: 'Fae', tier: 'R', weight: 1.2, mods: { AGI: 2, WIS: 1 }, fx: { evade: 0.08 }, trait: 'Slippery: +8% evasion.' },
  { name: 'Undead-born', tier: 'R', weight: 1.0, mods: { VIT: 1, WIL: 2 }, fx: { lifesteal: 0.08, potion: -0.5 }, trait: 'Drain heals 8% of damage; potions heal half.' },
  { name: 'Demonkin', tier: 'R', weight: 0.8, mods: { INT: 2, WIL: 1 }, fx: { critDmg: 0.25 }, trait: 'Crits hit 25% harder.' },
  { name: 'Vampire-blooded', tier: 'E', weight: 0.4, mods: { AGI: 1, STR: 1, INT: 1 }, fx: { lifesteal: 0.12 }, trait: 'Blood drain heals 12% of damage.' },
  { name: 'Celestial', tier: 'H', weight: 0.25, mods: { WIS: 3, WIL: 2 }, fx: { revive: 1 }, trait: 'Once per run, rise again at 50% HP.' },
  { name: 'Construct', tier: 'H', weight: 0.25, mods: { VIT: 3 }, fx: { def: 3 }, trait: 'Plated body: +3 defense.' },
  { name: 'Void-touched', tier: 'H', weight: 0.15, mods: { INT: 1, WIS: 1 }, fx: { relicSafe: 1 }, trait: 'Unknown relics are never cursed.' },
  { name: 'Slime', tier: 'L', weight: 0.1, mods: {}, fx: { absorb: 1 }, trait: 'Absorb: +1 random stat per elite or boss kill.' },
  { name: 'Reincarnated Soul', tier: 'M', weight: 0.05, mods: { WIL: 2, INT: 1, WIS: 1 }, fx: { extraTalent: 1, xp: 0.25, startSkillPts: 3 }, trait: 'Remembers a past life: an extra talent, +25% XP and 3 free skill points at the start.' },
];
const RACE_BY = Object.fromEntries(RACES.map(r => [r.name, r]));
const RACE_TIER_COLOR = { C: '#c9ccd1', U: '#6bd36b', R: '#5aa7ff', E: '#b36bff', H: '#ff9d4d', L: '#ffcb3d', M: '#ff5a5a' };
const KINDS = {
  melee:   { focus: { STR: 3, VIT: 2, DEX: 1, AGI: 1, WIL: 1, INT: 0, WIS: 0 }, atk: ['STR'], res: 'Stamina', caster: false },
  tank:    { focus: { VIT: 3, STR: 2, WIL: 2, WIS: 1, AGI: 0, DEX: 0, INT: 0 }, atk: ['STR'], res: 'Stamina', caster: false },
  ranged:  { focus: { DEX: 3, AGI: 2, STR: 1, VIT: 1, WIL: 1, INT: 0, WIS: 0 }, atk: ['DEX'], res: 'Stamina', caster: false },
  rogue:   { focus: { AGI: 3, DEX: 2, STR: 1, VIT: 1, WIL: 0, INT: 0, WIS: 0 }, atk: ['AGI'], res: 'Stamina', caster: false },
  magic:   { focus: { INT: 3, WIS: 2, WIL: 1, VIT: 1, STR: 0, AGI: 0, DEX: 0 }, atk: ['INT'], res: 'Mana', caster: true },
  support: { focus: { WIS: 3, WIL: 2, INT: 1, VIT: 1, STR: 0, AGI: 0, DEX: 0 }, atk: ['WIS'], res: 'Mana', caster: true },
  hybrid:  { focus: { STR: 2, INT: 2, AGI: 1, VIT: 1, WIL: 1, DEX: 1, WIS: 0 }, atk: ['STR', 'INT'], res: 'Mana', caster: true },
  summon:  { focus: { INT: 2, WIS: 2, WIL: 1, VIT: 1, STR: 0, AGI: 0, DEX: 0 }, atk: ['INT'], res: 'Mana', caster: true },
};
function P(name, tier, kind, races, drawback, extra) {
  return Object.assign({ name, tier, kind, races: races.split(','), drawback }, extra || {});
}
const PROFESSIONS = [
  P('Swordsman', 'C', 'melee', '*', 'No spike, no weakness.'),
  P('Warrior', 'C', 'melee', 'Human,Orc,Dwarf,Dragonkin', 'Burns stamina fast.'),
  P('Archer', 'C', 'ranged', 'Elf,Beastkin,Human,Fae', 'Weak up close.'),
  P('Apprentice Mage', 'C', 'magic', 'Elf,Human,Gnome,Fae,Demonkin,Slime', 'Fragile.'),
  P('Acolyte', 'C', 'support', 'Human,Dwarf,Halfling,Celestial', 'Low damage.'),
  P('Rogue', 'C', 'rogue', 'Beastkin,Halfling,Human,Vampire-blooded', 'Low defense.'),
  P('Guardian', 'C', 'tank', 'Dwarf,Human,Orc,Construct', 'Slow killer.'),
  P('Scout', 'C', 'ranged', 'Beastkin,Elf,Halfling', 'Modest damage.', { scout: true }),
  P('Brawler', 'C', 'melee', 'Beastkin,Orc,Human,Dwarf,Slime', 'Gear matters less, so does loot.'),
  P('Spearman', 'U', 'melee', 'Lizardfolk,Human,Beastkin,Dragonkin', 'Needs space.'),
  P('Tamer', 'U', 'summon', 'Beastkin,Fae,Human', 'Pets die.'),
  P('Alchemist', 'U', 'summon', 'Gnome,Halfling,Elf', 'Consumable-hungry.', { alchemist: true }),
  P('Hunter', 'U', 'ranged', 'Beastkin,Elf,Orc', 'Needs tracking time.', { scout: true }),
  P('Bard', 'U', 'support', 'Halfling,Fae,Human', 'Rhythm-bound.'),
  P('Blacksmith', 'U', 'tank', 'Dwarf,Orc,Human', 'Slow.', { smith: true }),
  P('Cook', 'U', 'support', 'Halfling,Human', 'Weak early combat.', { cook: true }),
  P('Shaman', 'U', 'summon', 'Orc,Lizardfolk,Beastkin', 'Totem-dependent.'),
  P('Druid', 'U', 'magic', 'Elf,Fae,Beastkin', 'Nature-bound.'),
  P('Monk', 'U', 'melee', 'Human,Dwarf,Beastkin', 'Gear-light.'),
  P('Engineer', 'U', 'ranged', 'Gnome,Construct,Dwarf', 'Gadgets break.'),
  P('Berserker', 'U', 'melee', 'Orc,Human', 'No defense.', { glass: true }),
  P('Spellblade', 'R', 'hybrid', 'Human,Elf,Dragonkin,Demonkin', 'Juggles mana and stamina.'),
  P('Shadow Dancer', 'R', 'rogue', 'Beastkin,Elf,Fae,Vampire-blooded', 'Dies to any mistake.', { glass: true }),
  P('Paladin', 'R', 'tank', 'Human,Dwarf,Celestial', 'Oath-bound.'),
  P('Necromancer', 'R', 'summon', 'Undead-born,Human,Demonkin', 'Needs corpses.'),
  P('Warlock', 'R', 'magic', 'Demonkin,Human', 'Pact costs.'),
  P('Illusionist', 'R', 'magic', 'Fae,Elf', 'Weak to true sight.'),
  P('Runesmith', 'R', 'hybrid', 'Dwarf,Gnome,Construct', 'Rune-hungry.', { smith: true }),
  P('Venom Dancer', 'R', 'rogue', 'Lizardfolk,Beastkin', 'Slow burn.'),
  P('Beast Lord', 'R', 'summon', 'Beastkin,Orc', 'Fragile solo.'),
  P('Gambler', 'R', 'rogue', 'Halfling,Human', 'High variance. Loves Luck.', { sig: 'gamble' }),
  P('Sage', 'R', 'support', 'Elf,Gnome,Human,Void-touched,Reincarnated Soul', 'Knowledge over force.', { scout: true }),
  P('Rune Knight', 'E', 'hybrid', 'Dwarf,Human,Construct', 'Slow to set up.'),
  P('Blood Mage', 'E', 'magic', 'Vampire-blooded,Demonkin,Human', 'Spends HP as a resource.', { sig: 'bloodpact' }),
  P('Spirit Weaver', 'E', 'summon', 'Fae,Elf', 'Spirits need tending.'),
  P('Death Knight', 'E', 'melee', 'Undead-born,Human', 'Cursed.', { fx: { lifesteal: 0.06 } }),
  P('Grand Alchemist', 'E', 'summon', 'Gnome,Elf', 'Ingredient costs.', { alchemist: true }),
  P('Dragoon', 'E', 'melee', 'Lizardfolk,Dragonkin', 'Committed to every jump.'),
  P('Treasure Hunter', 'E', 'rogue', 'Halfling,Beastkin', 'Greedy.', { scout: true }),
  P('Beastmaster', 'E', 'summon', 'Beastkin,Fae', 'Needs bonds.'),
  P('Battle Mage', 'E', 'hybrid', 'Human,Orc,Dwarf', 'Heavy and slow.'),
  P('Dragon Knight', 'L', 'melee', 'Dragonkin,Human', 'Slow awakening.'),
  P('Chronomancer', 'L', 'magic', 'Void-touched,Fae,Elf', 'Weak early, strong with the right items.', { sig: 'rewind', glass: true }),
  P('Soul Reaper', 'L', 'melee', 'Undead-born,Demonkin,Celestial', 'Feeds on fragments.', { sig: 'devour' }),
  P('Archmage', 'L', 'magic', 'Elf,Human,Gnome', 'Costly spells.'),
  P('Saint', 'L', 'support', 'Celestial,Human', 'Little offense.'),
  P('Sword Saint', 'L', 'melee', 'Human,Beastkin,Orc', 'One-note mastery.'),
  P('Devourer', 'L', 'hybrid', 'Slime,Demonkin', 'Unstable.', { sig: 'devour' }),
  P('Demon Lord Candidate', 'L', 'magic', 'Demonkin', 'Corruption risk.'),
  P('Shadow Monarch', 'L', 'summon', 'Beastkin,Undead-born,Human', 'Soldiers need souls.'),
  P('Worldbreaker', 'M', 'melee', 'Dragonkin,Human,Orc', 'Breaks everything, including your gear budget.', { sig: 'quake' }),
  P('Void Walker', 'M', 'rogue', 'Void-touched,Fae', 'Unstable footing.', { sig: 'phase' }),
  P('Hero of the Prophecy', 'M', 'hybrid', 'Reincarnated Soul,Human', 'Expected to win.'),
  P('Demon King', 'M', 'magic', 'Demonkin', 'The Guild hunts you.'),
  P('Sage of All Things', 'M', 'support', 'Human,Elf,Reincarnated Soul,Slime', 'Jack of all trades.', { scout: true }),
  P('Fate Weaver', 'M', 'support', 'Fae,Void-touched,Celestial,Human', 'Fate wants a price.', { sig: 'gamble' }),
];
const PROF_BY = Object.fromEntries(PROFESSIONS.map(p => [p.name, p]));
// Every race can roll at least two professions in its own tier and in each of the two tiers below it, so a rare race never
// silently falls several tiers down. Gaps are filled with the most exclusive professions of that tier.
const raceIdx = race => race.tier === 'H' ? 3 : TIER_BY[race.tier];
for (const race of RACES) {
  const hi = raceIdx(race);
  for (let ti = Math.max(0, hi - 2); ti <= hi; ti++) {
    const has = () => PROFESSIONS.filter(p => p.tier === TIERS[ti].id && (p.races.includes('*') || p.races.includes(race.name)));
    const need = ti === hi ? 2 : 1;
    if (has().length >= need) continue;
    const cand = PROFESSIONS.filter(p => p.tier === TIERS[ti].id && !p.races.includes('*') && !p.races.includes(race.name)).sort((a, b) => a.races.length - b.races.length || (a.name < b.name ? -1 : 1));
    for (const p of cand.slice(0, need - has().length)) p.races.push(race.name);
  }
}
const TALENTS = [
  { id: 'ironwill', name: 'Iron Will', weight: 30, mods: { WIL: 2 }, desc: '+2 Willpower.' },
  { id: 'quicklearner', name: 'Quick Learner', weight: 30, desc: '+20% XP.' },
  { id: 'predator', name: "Predator's Instinct", weight: 14, desc: '+25% damage to enemies below 40% HP.' },
  { id: 'manaaffinity', name: 'Efficient Casting', weight: 14, desc: 'Skills cost 1 less energy.' },
  { id: 'secondwind', name: 'Second Wind', weight: 6, desc: 'Survive a lethal hit once per run.' },
  { id: 'luckybreak', name: 'Lucky Break', weight: 6, desc: 'Your first chest is a rarity better.' },
  { id: 'fortune', name: "Fortune's Child", weight: 1.5, mods: { LUK: 4 }, desc: '+4 Luck.' },
  { id: 'fated', name: 'Fated', weight: 0.5, desc: 'A secret room always appears.' },
  { id: 'cursedgenius', name: 'Cursed Genius', weight: 0.5, desc: '+25% damage and +50% XP, but -20% max HP.' },
];
const TALENT_BY = Object.fromEntries(TALENTS.map(t => [t.id, t]));
const HIDDEN_TRAITS = [
  { id: 'none', name: 'Nothing Special', weight: 50, desc: 'Nothing stirred.' },
  { id: 'latebloomer', name: 'Late Bloomer', weight: 28, desc: '+4 stat points at level 5.' },
  { id: 'latent', name: 'Latent Power', weight: 17, desc: '+1 to every stat at level 5.' },
  { id: 'dragon', name: 'Sleeping Dragon', weight: 5, desc: '+8 stat points at level 5.' },
];
const FIRST = ['Ar', 'Bel', 'Cor', 'Dra', 'El', 'Fen', 'Gar', 'Hal', 'Iri', 'Jor', 'Kal', 'Lys', 'Mor', 'Nia', 'Or', 'Pyr', 'Quin', 'Ren', 'Syl', 'Tor', 'Ul', 'Vex', 'Wyn', 'Yar', 'Zeph'];
const LAST = ['an', 'dric', 'eth', 'ia', 'ion', 'ora', 'rik', 'thas', 'wen', 'us', 'ara', 'os', 'ys', 'el', 'ak'];
const RARITIES = [
  { name: 'Common', color: '#c9ccd1', mult: 1, value: 5, affixes: 0 },
  { name: 'Uncommon', color: '#6bd36b', mult: 1.4, value: 12, affixes: 1 },
  { name: 'Rare', color: '#5aa7ff', mult: 1.9, value: 30, affixes: 1 },
  { name: 'Epic', color: '#b36bff', mult: 2.6, value: 70, affixes: 2 },
  { name: 'Legendary', color: '#ffcb3d', mult: 3.6, value: 160, affixes: 3 },
];
// rec = recommended level (career), xpMul = career XP multiplier, cs = career enemy scale
const RANKS = {
  F: { rooms: 6, scale: 1.0, rewards: 1.0, rec: 1, xpMul: 1, cs: 1 },
  E: { rooms: 8, scale: 1.65, rewards: 1.6, rec: 6, xpMul: 2.9, cs: 3.4 },
  D: { rooms: 10, scale: 2.6, rewards: 2.4, rec: 12, xpMul: 6.3, cs: 8 },
  C: { rooms: 12, scale: 4.2, rewards: 3.5, rec: 19, xpMul: 13.9, cs: 16 },
  B: { rooms: 14, scale: 6.0, rewards: 5.0, rec: 27, xpMul: 25, cs: 30 },
  A: { rooms: 16, scale: 8.5, rewards: 7.0, rec: 36, xpMul: 46, cs: 55 },
  S: { rooms: 18, scale: 12, rewards: 10, rec: 45, xpMul: 83, cs: 95 },
};
const CAREER_RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const MAX_LEVEL = 30;
const CAREER_MAX_LEVEL = 50;
const MAX_SLOTS = 4;
// Reincarnated Souls carry a hidden past life that wakes in three stages (levels 5, 15, 30).
const AWAKEN_AT = [5, 15, 30];
const PAST_LIVES = [
  { id: 'archmage', name: 'an Archmage', stats: { INT: 3, WIS: 2 }, skills: ['prismray', 'annihilate'], talent: 'manaaffinity', line: 'Spells you never learned flow from your hands.' },
  { id: 'warlord', name: 'a Warlord', stats: { STR: 3, VIT: 2 }, skills: ['bladestorm', 'titanwrath'], talent: 'predator', line: 'You remember a thousand battlefields.' },
  { id: 'saint', name: 'a Saint', stats: { WIS: 3, WIL: 2 }, skills: ['sanctward', 'miracle'], talent: 'secondwind', line: 'A forgotten prayer answers you.' },
  { id: 'shadow', name: 'a Shadow King', stats: { AGI: 3, DEX: 2 }, skills: ['vanish', 'thousandcuts'], talent: 'luckybreak', line: 'Your hands know a thief\'s oldest tricks.' },
  { id: 'player', name: 'the Last Player of a Lost Game', stats: { STR: 1, AGI: 1, VIT: 1, INT: 1, WIS: 1, DEX: 1, WIL: 1 }, luck: 2, skills: ['elementrift', 'ascendantedge'], talent: 'fortune', line: 'A glowing window opens in your mind: [SYSTEM ONLINE].' },
];
const PAST_BY = Object.fromEntries(PAST_LIVES.map(p => [p.id, p]));
// Higher classes get more equipped-skill slots, and the floors below keep a Mythic roll from ever feeling ordinary.
const SLOTS_BY_TIER = [4, 4, 4, 5, 5, 6];
const TIER_FLOOR = {
  luck:      [0, 1, 2, 4, 6, 9],
  potential: [0, 0, 0, 1, 2, 3],   // index into POTENTIALS
  talents:   [1, 1, 1, 2, 2, 3],
  grade:     [0, 0, 0, 1, 2, 2],   // best talent grade guaranteed: 1 good, 2 great
};
function slotCap(char) { return (SLOTS_BY_TIER[TIER_BY[char.tier]] || MAX_SLOTS) + (char.awakened >= 3 ? 1 : 0); }
const MASTERY = [{ name: 'Novice', at: 0 }, { name: 'Practiced', at: 15 }, { name: 'Adept', at: 40 }, { name: 'Expert', at: 90 }, { name: 'Master', at: 180 }];

// ---------- Characters ----------
function pickProfession(rng, race, tier) {
  for (let ti = TIER_BY[tier.id]; ti >= 0; ti--) {
    const id = TIERS[ti].id;
    const misfit = rng.chance(0.06);
    const pool = PROFESSIONS.filter(p => p.tier === id && (misfit || p.races.includes('*') || p.races.includes(race.name)));
    if (pool.length) {
      const prof = rng.pick(pool);
      return { prof, misfit: !(prof.races.includes('*') || prof.races.includes(race.name)) };
    }
  }
  return { prof: PROF_BY.Swordsman, misfit: false };
}
// 0 plain, 1 good, 2 great, 3 legendary (Cursed Genius trades HP for power, so it never counts as a guarantee)
function talentGrade(id) { const w = TALENT_BY[id].weight; return id === 'cursedgenius' ? 1 : w >= 30 ? 0 : w >= 14 ? 1 : w >= 6 ? 2 : 3; }
function makeCharacter(rng) {
  const race = rng.weighted(RACES, r => r.weight);
  const wantedTier = rng.weighted(TIERS, t => t.weight);
  const { prof, misfit } = pickProfession(rng, race, wantedTier);
  const tier = TIERS[TIER_BY[prof.tier]];
  const kind = KINDS[prof.kind];
  const stats = {};
  STATS.forEach(s => { stats[s] = 1; });
  const rIdx = race.tier === 'H' ? 3 : TIER_BY[race.tier];
  let pts = tier.budget + rng.int(-tier.var, tier.var) - STATS.length + Math.max(0, Math.round((TIERS[rIdx].budget - tier.budget) / 3));
  while (pts-- > 0) stats[rng.weighted(STATS, s => kind.focus[s] + 0.35)]++;
  for (const [s, v] of Object.entries(race.mods)) stats[s] += v;
  if (misfit) stats[rng.pick(STATS)] += 2;
  const ti = TIER_BY[prof.tier], rti = race.tier === 'H' ? 3 : TIER_BY[race.tier];
  const r = rng.next();
  let luck = r < 0.02 ? rng.int(10, 14) : r < 0.12 ? rng.int(6, 9) : rng.int(1, 5);
  if (race.fx.luckFloor) luck = Math.max(luck, race.fx.luckFloor);
  if (misfit) luck += 2;
  // higher classes and races are born luckier: a Mythic never rolls ordinary luck
  const lf = Math.max(TIER_FLOOR.luck[ti], TIER_FLOOR.luck[rti] - 1);
  if (luck < lf) luck = lf + rng.int(0, 3);
  const ei = Math.max(ti, rti - 1), pf = TIER_FLOOR.potential[ei];
  const potential = rng.weighted(POTENTIALS, p => p.weight * (1 + 0.1 * ti * POTENTIALS.indexOf(p)) * (POTENTIALS.indexOf(p) < pf ? 0 : 1));
  // talents: more of them and better ones for higher classes
  const talents = [];
  const nTalents = TIER_FLOOR.talents[ti] + (race.fx.extraTalent ? 1 : 0);
  const flat = 1 / (1 + 0.3 * ti);
  while (talents.length < nTalents) {
    const t = rng.weighted(TALENTS, x => Math.pow(x.weight, flat));
    if (!talents.includes(t.id)) talents.push(t.id);
  }
  if (!talents.some(id => talentGrade(id) >= TIER_FLOOR.grade[ei])) {
    const pool = TALENTS.filter(t => talentGrade(t.id) >= TIER_FLOOR.grade[ei] && !talents.includes(t.id));
    if (pool.length) talents[0] = rng.weighted(pool, x => x.weight).id;
  }
  const gap = Math.max(0, rti - ti);
  const heritage = !race.fx.startSkillPts && gap > 0 ? { pts: Math.min(3, gap), xp: +(Math.min(3, gap) * 0.08).toFixed(2) } : null;
  const pastLife = race.fx.startSkillPts ? rng.pick(PAST_LIVES).id : null;
  const hidden = rng.weighted(HIDDEN_TRAITS, h => h.id === 'none' ? h.weight * Math.max(0.2, 1 - 0.15 * ti) : h.id === 'dragon' ? h.weight * (1 + 0.6 * ti) : h.weight).id;
  const name = rng.pick(FIRST) + rng.pick(LAST);
  const known = D.KIND_SKILL_LIST[prof.kind].filter(id => D.SKILLS[id].lvl <= 1);
  return {
    name, race: race.name, prof: prof.name, tier: prof.tier, misfit, potential: potential.name, ppl: potential.pts,
    talents, hidden, hiddenRevealed: false, pastLife, awakened: 0, heritage, stats, luck, level: 1, xp: 0, points: 0,
    skills: known.slice(), loadout: known.slice(), skillPts: (race.fx.startSkillPts || 0) + (heritage ? heritage.pts : 0), mastery: {}, injuries: [],
  };
}
function rollThree(seed) {
  const rng = new RNG(seed);
  return [makeCharacter(rng), makeCharacter(rng), makeCharacter(rng)];
}
function hasTalent(char, id) { return char.talents.includes(id); }

// ---------- Skills ----------
function sigSkill(char) { return TIER_BY[char.tier] >= 2 ? (PROF_BY[char.prof].sig || 'ultimate') : null; }
function loadout(char) {
  const ids = ['attack', ...char.loadout, 'guard'];
  const sig = sigSkill(char);
  if (sig) ids.push(sig);
  return ids;
}
function masteryRank(char, id) {
  const uses = (char.mastery && char.mastery[id]) || 0;
  let r = 0;
  MASTERY.forEach((m, i) => { if (uses >= m.at) r = i; });
  return r;
}
function masteryBonus(char, id) { return masteryRank(char, id) * 0.08; }

// Skill evolutions: at Practiced rank a skill can be attuned once to one of two branches (1 skill point).
const EVOLUTIONS = {
  hit: { a: { name: 'Precision', desc: '+30% damage and ignores enemy defense', mods: { multMul: 1.3, pierce: true } }, b: { name: 'Rending', desc: 'Also causes bleeding and costs 1 less energy', mods: { addStatus: { bleed: 3 }, enMinus: 1 } } },
  aoe: { a: { name: 'Wide', desc: '+25% damage', mods: { multMul: 1.25 } }, b: { name: 'Crippling', desc: 'Also weakens every enemy', mods: { addStatus: { weaken: 2 } } } },
  guard: { a: { name: 'Bastion', desc: '+15% block and regain 1 energy', mods: { blockAdd: 0.15, refundAdd: 1 } }, b: { name: 'Thorned', desc: 'Attackers take heavy damage back', mods: { reflectAdd: 0.8 } } },
  buff: { a: { name: 'Lasting', desc: 'Lasts 2 turns longer', mods: { turnsAdd: 2 } }, b: { name: 'Surge', desc: 'Also grants 1 AP', mods: { gainApAdd: 1 } } },
  heal: { a: { name: 'Mending', desc: '+40% healing', mods: { pctMul: 1.4 } }, b: { name: 'Cleansing', desc: 'Also removes afflictions', mods: { cleanse: true } } },
  summon: { a: { name: 'Enduring', desc: 'The spirit lasts 2 turns longer', mods: { spiritTurnsAdd: 2 } }, b: { name: 'Pack', desc: 'The spirit hits 50% harder', mods: { spiritMul: 1.5 } } },
};
function evoChoice(char, id) { return char.evo && char.evo[id] ? char.evo[id] : null; }
function effSkill(char, id) {
  const s = D.SKILLS[id], br = evoChoice(char, id), def = EVOLUTIONS[s.type];
  if (!br || !def) return s;
  const ev = def[br], m = ev.mods, c = Object.assign({}, s);
  if (m.multMul && c.mult) c.mult = c.mult * m.multMul;
  if (m.pierce) c.pierce = true;
  if (m.addStatus) c.status = Object.assign({}, c.status, m.addStatus);
  if (m.enMinus && c.en) c.en = Math.max(1, c.en - m.enMinus);
  if (m.blockAdd) c.block = Math.min(0.95, (c.block || 0) + m.blockAdd);
  if (m.refundAdd) c.refund = (c.refund || 0) + m.refundAdd;
  if (m.reflectAdd) c.reflect = (c.reflect || 0) + m.reflectAdd;
  if (m.turnsAdd && c.buff) c.buff = Object.assign({}, c.buff, { turns: c.buff.turns + m.turnsAdd });
  if (m.gainApAdd) c.gainAp = (c.gainAp || 0) + m.gainApAdd;
  if (m.pctMul && c.pct) c.pct = c.pct * m.pctMul;
  if (m.cleanse) c.cleanse = true;
  if (c.spirit && m.spiritTurnsAdd) c.spirit = Object.assign({}, c.spirit, { turns: c.spirit.turns + m.spiritTurnsAdd });
  if (c.spirit && m.spiritMul) c.spirit = Object.assign({}, c.spirit, { pct: c.spirit.pct * m.spiritMul });
  c.name = s.name + ' · ' + ev.name; c.desc = s.desc + ' (' + ev.desc + ')'; c.evo = ev;
  return c;
}
function canEvolve(char, id) {
  const s = D.SKILLS[id];
  if (!s || !char.skills.includes(id)) return 'Not known';
  if (!EVOLUTIONS[s.type] || s.kinds.includes('sig') || id === 'attack') return 'Cannot evolve';
  if (evoChoice(char, id)) return 'Already evolved';
  if (masteryRank(char, id) < 1) return 'Needs Practiced rank (15 uses)';
  if (char.skillPts < 1) return 'No skill points';
  return null;
}
function evolveSkill(char, id, br) {
  if (canEvolve(char, id) || !EVOLUTIONS[D.SKILLS[id].type][br]) return false;
  char.skillPts--; char.evo = char.evo || {}; char.evo[id] = br;
  return true;
}
function learnableSkills(char) {
  const kind = PROF_BY[char.prof].kind;
  return D.KIND_SKILL_LIST[kind].map(id => D.SKILLS[id]);
}
function canLearn(char, id) {
  const s = D.SKILLS[id];
  if (!s || char.skills.includes(id)) return 'Already known';
  if (s.kinds.includes('book')) return 'Needs a tome';
  if (!s.kinds.includes(PROF_BY[char.prof].kind)) return 'Wrong discipline';
  if (s.minTier && TIER_BY[char.tier] < TIER_BY[s.minTier]) return 'Needs a ' + TIERS[TIER_BY[s.minTier]].name + ' class or higher';
  if (char.level < s.lvl) return 'Needs level ' + s.lvl;
  if (char.skillPts < 1) return 'No skill points';
  return null;
}
function learnSkill(char, id) {
  if (canLearn(char, id)) return false;
  char.skillPts--; char.skills.push(id);
  if (char.loadout.length < slotCap(char)) char.loadout.push(id);
  return true;
}
function learnBook(char, id) {
  if (char.skills.includes(id)) return false;
  char.skills.push(id);
  if (char.loadout.length < slotCap(char)) char.loadout.push(id);
  return true;
}
function toggleLoadout(char, id) {
  const i = char.loadout.indexOf(id);
  if (i >= 0) { char.loadout.splice(i, 1); return true; }
  if (!char.skills.includes(id) || char.loadout.length >= slotCap(char)) return false;
  char.loadout.push(id);
  return true;
}
// Bots and tests: learn everything affordable, keep the best-unlocked skills equipped.
function autoSkills(char) {
  for (const s of learnableSkills(char)) if (!canLearn(char, s.id)) learnSkill(char, s.id);
  if (char.loadout.length < slotCap(char)) {
    for (const id of char.skills.slice().reverse()) {
      if (char.loadout.length >= slotCap(char)) break;
      if (!char.loadout.includes(id)) char.loadout.push(id);
    }
  }
}

// ---------- Items ----------
function itemScale(heat) { return 1 + 0.08 * heat; }
function rollRarity(rng, ctx) {
  const luckMul = 1 + Math.min(ctx.luck || 0, 14) * 0.05;
  const heatMul = 1 + 0.05 * (ctx.heat || 0);
  const boost = ctx.rarityBoost || 1;
  const base = [60, 28, 9, 2.5, 0.5];
  const min = ctx.minRarity || 0;
  return rng.weighted([0, 1, 2, 3, 4], i => {
    if (i < min) return 0;
    let w = base[i];
    if (i >= 1) w *= heatMul * (ctx.elite ? 1.5 : 1);
    if (i >= 2) w *= luckMul * boost;
    return w;
  });
}
function genItem(rng, ctx) {
  const rarity = Math.min(4, ctx.rarity != null ? ctx.rarity : rollRarity(rng, ctx));
  const R = RARITIES[rarity];
  const slot = ctx.slot || rng.weighted(D.SLOTS, s => D.SLOT_WEIGHT[s]);
  const sc = R.mult * itemScale(ctx.heat || 0) * (ctx.rankMul || 1);
  const it = {
    id: 'i' + Math.floor(rng.next() * 1e9).toString(36), slot, rarity, atk: 0, def: 0, en: 0, crit: 0, evade: 0, stat: null, affixes: [],
    up: 0, cursed: false, unknown: false, revealed: true, fromVault: false,
  };
  const base = rng.pick(D.BASES[slot]);
  if (base.atk) it.atk = Math.max(1, Math.round(base.atk * sc));
  if (base.def) it.def = Math.max(1, Math.round(base.def * sc));
  if (base.en) it.en = Math.max(1, Math.round(base.en * R.mult));
  it.crit = base.crit || 0; it.evade = base.evade || 0;
  if (slot === 'ring' || slot === 'amulet') {
    if (rng.chance(0.03)) it.stat = { stat: 'LUK', v: rarity >= 3 ? 2 : 1 };
    else it.stat = { stat: rng.pick(STATS), v: Math.max(1, Math.round(R.mult * 1.3 * (slot === 'amulet' ? 1 : 1.2))) };
  }
  const nAff = R.affixes && (rarity !== 1 || rng.chance(0.5)) ? R.affixes : 0;
  const ids = Object.keys(D.AFFIXES);
  while (it.affixes.length < nAff) {
    const a = rng.pick(ids);
    if (!it.affixes.includes(a)) it.affixes.push(a);
  }
  it.base = base.n;
  it.name = base.n + (it.affixes.length ? ' ' + D.AFFIXES[it.affixes[0]].name : '');
  it.value = Math.round(R.value * itemScale(ctx.heat || 0) * (ctx.rankMul || 1));
  it.maxDur = 20 + rarity * 8; it.dur = it.maxDur;
  return it;
}
function genUnknownRelic(rng, ctx) {
  const it = genItem(rng, Object.assign({}, ctx, { rarity: rng.int(2, 4) }));
  it.unknown = true; it.revealed = false;
  it.cursed = !ctx.relicSafe && rng.chance(0.2);
  if (it.cursed) {
    it.atk = Math.round(it.atk * 1.5); it.def = Math.round(it.def * 1.5);
    if (it.stat) it.stat.v = Math.round(it.stat.v * 1.5);
  }
  it.value = Math.round(it.value * 1.5);
  return it;
}
function normalizeItem(it) {
  if (!it) return it;
  if (it.slot === 'armor') it.slot = 'chest';
  if (it.slot === 'charm') it.slot = 'ring';
  if (it.up === undefined) it.up = 0;
  if (it.maxDur === undefined) { it.maxDur = 20 + (it.rarity || 0) * 8; it.dur = it.maxDur; }
  return it;
}
function sellValue(it) { return Math.max(1, Math.floor(it.value * (1 + 0.3 * (it.up || 0)) * 0.5)); }
function itemTitle(it) { return it.unknown && !it.revealed ? 'Unknown Relic' : it.name + (it.up ? ' +' + it.up : ''); }
function itemMult(it) { return (1 + 0.1 * (it.up || 0)) * (it.dur !== undefined && it.dur <= 0 ? 0.5 : 1); }
function itemLine(it) {
  if (it.unknown && !it.revealed) return 'True properties unknown. May be cursed.';
  const m = itemMult(it), p = [];
  if (it.atk) p.push('ATK +' + Math.round(it.atk * m));
  if (it.def) p.push('DEF +' + Math.round(it.def * m));
  if (it.en) p.push('Energy +' + Math.round(it.en * m));
  if (it.crit) p.push('Crit ' + (it.crit > 0 ? '+' : '') + Math.round(it.crit * 100) + '%');
  if (it.evade) p.push('Evade ' + (it.evade > 0 ? '+' : '') + Math.round(it.evade * 100) + '%');
  if (it.stat) p.push(it.stat.stat + ' +' + Math.max(1, Math.round(it.stat.v * m)));
  it.affixes.forEach(a => p.push(D.AFFIXES[a].desc));
  if (it.cursed) p.push('CURSED: -10% max HP');
  if (it.dur !== undefined) p.push(it.dur <= 0 ? 'BROKEN (50% stats)' : `Durability ${it.dur}/${it.maxDur}`);
  return p.join(' / ');
}
function starterGear(char) {
  const kind = PROF_BY[char.prof].kind;
  const w = D.BASES.weapon[D.START_WEAPON[kind]];
  const mk = (slot, base, extra) => Object.assign({ id: 'start-' + slot, slot, rarity: 0, atk: 0, def: 0, en: 0, crit: 0, evade: 0, stat: null, affixes: [], up: 0, cursed: false, unknown: false, revealed: true, fromVault: true, base: base.n, name: base.n, value: 2, starter: true, maxDur: 20, dur: 20 }, { atk: base.atk || 0, def: base.def || 0, en: base.en || 0, crit: base.crit || 0, evade: base.evade || 0 }, extra || {});
  const eq = {};
  D.SLOTS.forEach(s => { eq[s] = null; });
  eq.weapon = mk('weapon', w);
  eq.chest = mk('chest', D.BASES.chest[0]);
  return eq;
}

// ---------- Derived stats ----------
function derive(char, equip) {
  const prof = PROF_BY[char.prof], kind = KINDS[prof.kind], race = RACE_BY[char.race];
  const st = Object.assign({}, char.stats, { LUK: char.luck });
  char.talents.forEach(t => { const m = TALENT_BY[t].mods; if (m) for (const k in m) st[k] += m[k]; });
  const inj = (char.injuries || []).map(i => i.id);
  if (inj.includes('cursed_mark')) st.LUK = Math.max(0, st.LUK - 2);
  const items = Object.values(equip).filter(Boolean);
  let weaponAtk = 0, def = race.fx.def || 0, en = race.fx.maxEn || 0, crit = 0, evade = race.fx.evade || 0, critDmg = 0;
  let regen = 0, lifesteal = (race.fx.lifesteal || 0) + ((prof.fx && prof.fx.lifesteal) || 0);
  let burn = 0, poison = 0, chill = 0, echo = 0, thorns = 0, bloodthirst = 0, cursedCount = 0, vitality = 0;
  for (const it of items) {
    const m = itemMult(it);
    weaponAtk += it.atk * m; def += it.def * m; en += it.en * m; crit += it.crit; evade += it.evade;
    if (it.stat) st[it.stat.stat] += Math.max(1, Math.round(it.stat.v * m));
    if (it.cursed) cursedCount++;
    for (const a of it.affixes) {
      if (a === 'flames') burn += 0.3;
      else if (a === 'venom') poison += 0.3;
      else if (a === 'frost') chill += 0.25;
      else if (a === 'leech') lifesteal += 0.08;
      else if (a === 'swiftness') regen += 1;
      else if (a === 'precision') crit += 0.1;
      else if (a === 'brutal') critDmg += 0.2;
      else if (a === 'guardian') def += 2;
      else if (a === 'thorns') thorns += 0.15;
      else if (a === 'vitality') vitality++;
      else if (a === 'focus') en += 3;
      else if (a === 'fortune') st.LUK += 1;
      else if (a === 'echoes') echo += 0.15;
      else if (a === 'bloodthirst') bloodthirst += 0.03;
    }
  }
  const atkStat = Math.max(...kind.atk.map(s => st[s]));
  const powerOf = stat => 2 + st[stat] * 0.65 + weaponAtk + char.level * 0.4;
  const powerFor = {};
  for (const s of ['STR', 'AGI', 'DEX', 'INT', 'WIS']) powerFor[s] = powerOf(s);
  let hpMult = 1 + (race.fx.hpMult || 0);
  if (prof.glass) hpMult *= 0.8;
  if (hasTalent(char, 'cursedgenius')) hpMult *= 0.8;
  if (inj.includes('deep_wound')) hpMult *= 0.85;
  hpMult *= Math.pow(0.9, cursedCount) * Math.pow(1.1, vitality);
  const maxHp = Math.max(10, Math.round((20 + st.VIT * 4 + char.level * 3) * hpMult));
  const caster = kind.caster;
  let maxEn = 8 + (caster ? Math.floor((st.INT + st.WIS) / 2) : Math.floor((st.VIT + st.WIL) / 2)) + Math.round(en);
  if (inj.includes('concussion')) maxEn = Math.round(maxEn * 0.8);
  let dmgMult = 1 + (hasTalent(char, 'cursedgenius') ? 0.25 : 0);
  if (inj.includes('broken_arm')) dmgMult *= 0.85;
  return {
    st, maxHp, maxEn, regen: 2 + Math.floor(st.WIL / 6) + regen,
    power: 2 + atkStat * 0.65 + weaponAtk + char.level * 0.4,
    def: Math.round((def + Math.floor(st.VIT / 3)) * 10) / 10,
    crit: Math.min(0.6, 0.05 + (st.DEX + st.AGI) * 0.008 + crit),
    critDmg: 1.5 + (race.fx.critDmg || 0) + critDmg + st.DEX * 0.005,
    powerFor, heavy: 1 + Math.min(0.24, st.STR * 0.006), dotPot: 1 + Math.min(0.8, st.INT * 0.02), dotRes: Math.min(0.45, st.WIS * 0.015),
    agiRefund: Math.min(0.25, st.AGI * 0.008), wilRes: Math.min(0.5, st.WIL * 0.02), lastStand: Math.min(0.25, st.WIL * 0.012),
    evade: Math.max(0, Math.min(0.4, st.AGI * 0.012 + evade)),
    lifesteal, burn, poison, chill, echo, thorns, bloodthirst, dmgMult, shaken: inj.includes('shaken'),
    resName: kind.res, potionMult: 1 + (race.fx.potion || 0) + (prof.cook ? 0.5 : 0) + st.WIS * 0.01, scout: !!prof.scout,
  };
}

// ---------- Run-like helpers (work on both runs and the career hub) ----------
function refresh(run) {
  const oldMax = run.d ? run.d.maxHp : 0;
  run.d = derive(run.char, run.equip);
  if (run.d.maxHp > oldMax) run.hp += run.d.maxHp - oldMax;
  run.hp = Math.min(run.hp, run.d.maxHp);
  run.en = Math.min(run.en, run.d.maxEn);
}
function say(run, msg) { if (!run.log) run.log = []; run.log.push(msg); if (run.log.length > 60) run.log.shift(); }
function xpNeeded(level, career) { return career ? Math.round(30 * Math.pow(level, 2.2)) : Math.round(25 * Math.pow(level, 1.5)); }
function addXp(run, amount) {
  const c = run.char, race = RACE_BY[c.race];
  const mult = 1 + (race.fx.xp || 0) + (c.heritage ? c.heritage.xp : 0) + (hasTalent(c, 'quicklearner') ? 0.2 : 0) + (hasTalent(c, 'cursedgenius') ? 0.5 : 0);
  c.xp += Math.round(amount * mult);
  const ups = [];
  const cap = run.career ? CAREER_MAX_LEVEL : MAX_LEVEL;
  while (c.level < cap && c.xp >= xpNeeded(c.level, run.career)) {
    c.xp -= xpNeeded(c.level, run.career); c.level++; c.points += c.ppl; c.skillPts++;
    ups.push(c.level);
    if (c.level === 5 && !c.hiddenRevealed) revealHidden(run);
    if (c.pastLife) awaken(run);
  }
  if (ups.length) {
    refresh(run);
    run.hp = Math.min(run.d.maxHp, run.hp + Math.round(run.d.maxHp * 0.12));
    say(run, `Level up! Now level ${c.level}. ${c.points} stat point(s) and ${c.skillPts} skill point(s) to spend.`);
  }
  return ups;
}
function awaken(run) {
  const c = run.char, life = PAST_BY[c.pastLife];
  while (life && c.awakened < 3 && c.level >= AWAKEN_AT[c.awakened]) {
    const st = ++c.awakened;
    if (st === 1) {
      for (const k in life.stats) c.stats[k] += life.stats[k];
      if (life.luck) c.luck += life.luck;
      say(run, `Memories surface: you were ${life.name}. ${life.line}`);
    } else {
      const id = life.skills[st - 2];
      if (!c.skills.includes(id)) { c.skills.push(id); if (c.loadout.length < slotCap(c)) c.loadout.push(id); }
      say(run, `Past-life power awakens: ${D.SKILLS[id].name}.`);
      if (st === 3) {
        if (!c.talents.includes(life.talent)) c.talents.push(life.talent);
        say(run, `Full awakening! You gain ${TALENT_BY[life.talent].name} and an extra skill slot.`);
      }
    }
  }
}
function revealHidden(run) {
  const c = run.char;
  c.hiddenRevealed = true;
  const h = HIDDEN_TRAITS.find(x => x.id === c.hidden);
  if (h.id === 'latebloomer') c.points += 4;
  else if (h.id === 'dragon') c.points += 8;
  else if (h.id === 'latent') STATS.forEach(s => { c.stats[s]++; });
  say(run, `Hidden trait revealed: ${h.name}. ${h.desc}`);
}
function allocate(run, stat) {
  const c = run.char;
  if (c.points <= 0 || !STATS.includes(stat)) return false;
  c.points--; c.stats[stat]++;
  c.alloc = c.alloc || {}; c.alloc[stat] = (c.alloc[stat] || 0) + 1;
  refresh(run);
  return true;
}
function equipItem(run, id) {
  const idx = run.inv.findIndex(i => i.id === id);
  if (idx < 0) return false;
  const it = run.inv[idx];
  run.inv.splice(idx, 1);
  const old = run.equip[it.slot];
  run.equip[it.slot] = it;
  if (old) run.inv.push(old);
  if (it.unknown && !it.revealed) {
    it.revealed = true;
    say(run, it.cursed ? `The relic reveals itself: ${it.name}. It is cursed!` : `The relic reveals itself: ${it.name}.`);
  }
  refresh(run);
  return true;
}
function unequipItem(run, slot) {
  const it = run.equip[slot];
  if (!it) return false;
  run.equip[slot] = null;
  run.inv.push(it);
  refresh(run);
  return true;
}

Object.assign(E, {
  RNG, STATS, STAT_NAMES, STAT_ROLE, TIERS, TIER_BY, POTENTIALS, RACES, RACE_BY, RACE_TIER_COLOR, KINDS, PROFESSIONS, PROF_BY, TALENTS, TALENT_BY, HIDDEN_TRAITS,
  EVOLUTIONS, effSkill, canEvolve, evolveSkill, evoChoice,
  RARITIES, RANKS, CAREER_RANKS, MAX_LEVEL, CAREER_MAX_LEVEL, MAX_SLOTS, PAST_LIVES, PAST_BY, AWAKEN_AT, slotCap, SLOTS_BY_TIER, TIER_FLOOR, talentGrade, MASTERY,
  SKILLS: D.SKILLS, MONSTERS: D.MONSTERS, THEMES: D.THEMES, AFFIXES: D.AFFIXES, SLOTS: D.SLOTS, SLOT_NAMES: D.SLOT_NAMES, MATERIALS: D.MATERIALS, CONSUMABLES: D.CONSUMABLES,
  ANOMALIES: D.ANOMALIES, INJURIES: D.INJURIES, COMPANIONS: D.COMPANIONS, RECIPES: D.RECIPES, MISSION_TYPES: D.MISSION_TYPES, OPTIONALS: D.OPTIONALS, KIND_SKILL_LIST: D.KIND_SKILL_LIST,
  makeCharacter, rollThree, hasTalent, sigSkill, loadout, masteryRank, masteryBonus, learnableSkills, canLearn, learnSkill, learnBook, toggleLoadout, autoSkills,
  rollRarity, genItem, genUnknownRelic, normalizeItem, sellValue, itemTitle, itemLine, itemMult, starterGear, derive, refresh, say, xpNeeded, addXp, allocate, equipItem, unequipItem,
});
})(typeof globalThis !== 'undefined' ? globalThis : this);
