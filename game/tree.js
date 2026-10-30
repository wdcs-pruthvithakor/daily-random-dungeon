'use strict';
/* Daily Random Dungeon - skill trees.
   Every discipline has three branches of four nodes. Nodes are upgrades to skills you already have, passives, or brand-new skills.
   Points are the limit: a full branch costs 11 skill points, so a hero chooses what to specialise in. The two top tiers need a better
   profession tier, unless the hero finds a secret manual out on the road (a "key"), which opens one node of any branch. */
(function (root) {
const E = root.Engine;
const D = root.DATA;
const { TIER_BY, TIERS, HOOKS } = E;

// ---------- the content ----------
// node tiers: 1 (lvl 5, 1 pt), 2 (lvl 12, 2 pts, new skill), 3 (lvl 20, 3 pts, passive), 4 (lvl 30, 5 pts, Epic skill),
// 5 (lvl 40, 6 pts, Legendary passive, Legendary class) and 6 (lvl 50, 8 pts, Mythic skill, Mythic class).
const NODE_TIER = [null,
  { lvl: 5, cost: 1, rarity: 0, minTier: 0, label: 'Common' },
  { lvl: 12, cost: 2, rarity: 1, minTier: 0, label: 'Uncommon' },
  { lvl: 20, cost: 3, rarity: 2, minTier: 1, label: 'Rare' },
  { lvl: 30, cost: 5, rarity: 3, minTier: 2, label: 'Epic' },
  { lvl: 40, cost: 6, rarity: 4, minTier: 4, label: 'Legendary' },
  { lvl: 50, cost: 8, rarity: 5, minTier: 5, label: 'Mythic' }];

// mod fields: multMul enMinus pctMul pctAdd blockAdd reflectAdd turnsAdd statPlus pierce drainAdd spiritMul. f is a filter on the skill.
// passive fields: hp (fraction of max HP) def crit critDmg evade regen lifesteal thorns dmg (damage fraction) en burn poison chill
// s: [id, name, ap, en, type, props, desc]
const B = (id, kind, name, desc, n1, s2, n3, s4) => ({ id, kind, name, desc, nodes: [
  Object.assign({ tier: 1 }, n1),
  { tier: 2, name: s2[1], skill: s2[0] },
  Object.assign({ tier: 3 }, n3),
  { tier: 4, name: s4[1], skill: s4[0] }], skills: [s2, s4] });

const BRANCHES = [
  // melee
  B('berserker', 'melee', 'Berserker', 'Blood and fury: hit harder, heal off your kills.',
    { name: 'Bloodlust', desc: '+12% damage with single-target skills.', mod: { f: 'type:hit', multMul: 1.12 } },
    ['frenzy', 'Frenzy Strike', 2, 3, 'hit', { mult: 1.55, drain: 0.3 }, 'A wild strike that heals you for 30% of the damage.'],
    { name: 'Battle Hardened', desc: '+4% crit and +4% lifesteal.', passive: { crit: 0.04, lifesteal: 0.04 } },
    ['rampage', 'Rampage', 3, 6, 'hit', { mult: 0.9, hits: 4, random: true, cd: 5 }, 'Cooldown 5 turns: four savage strikes at random targets.']),
  B('duelist', 'melee', 'Duelist', 'Precision and tempo: cheaper skills, deadly finishers.',
    { name: 'Finesse', desc: 'Single-target skills cost 1 less energy.', mod: { f: 'type:hit', enMinus: 1 } },
    ['lunge', 'Lunge', 1, 2, 'hit', { mult: 1.35 }, 'A fast, cheap thrust.'],
    { name: 'Keen Eye', desc: '+6% crit and +3% evasion.', passive: { crit: 0.06, evade: 0.03 } },
    ['flawless', 'Flawless Strike', 2, 5, 'hit', { mult: 3.6, pierce: true, cd: 5 }, 'Cooldown 5 turns: a perfect cut that ignores defense.']),
  B('warlord', 'melee', 'Warlord', 'Command the field: area damage and banners.',
    { name: 'Sweeping Command', desc: '+15% damage with area skills.', mod: { f: 'type:aoe', multMul: 1.15 } },
    ['bannerslam', 'Banner Slam', 2, 3, 'aoe', { mult: 1.1, status: { weaken: 2 } }, 'Slam the standard down: hits all enemies and weakens them.'],
    { name: 'Veteran Commander', desc: '+8% max HP and +1 defense.', passive: { hp: 0.08, def: 1 } },
    ['warbanner', 'War Banner', 2, 5, 'buff', { buff: { dmg: 0.4, turns: 4 }, pct: 0.1, cd: 4 }, 'Cooldown 4 turns: +40% damage for 4 turns and heal 10%.']),
  // tank
  B('bulwark', 'tank', 'Bulwark', 'An immovable wall.',
    { name: 'Iron Discipline', desc: 'Guard skills block 8% more.', mod: { f: 'type:guard', blockAdd: 0.08 } },
    ['phalanx', 'Phalanx', 1, 2, 'guard', { block: 0.65, refund: 1 }, 'Block 65% and regain 1 energy.'],
    { name: 'Tower Shield', desc: '+2 defense and +6% max HP.', passive: { def: 2, hp: 0.06 } },
    ['immovable', 'Immovable', 2, 4, 'guard', { block: 0.92, pct: 0.1, reflect: 0.3, cd: 4 }, 'Cooldown 4 turns: block 92%, reflect 30% and heal 10%.']),
  B('avenger', 'tank', 'Avenger', 'Pain returned with interest.',
    { name: 'Spiked Guard', desc: 'Guard skills reflect 30% more damage.', mod: { f: 'type:guard', reflectAdd: 0.3 } },
    ['retaliate', 'Retaliate', 2, 3, 'hit', { mult: 1.5, status: { weaken: 2 } }, 'A heavy counter-blow that weakens the target.'],
    { name: 'Barbed Plate', desc: '+10% thorns and +3% crit.', passive: { thorns: 0.1, crit: 0.03 } },
    ['vengeance', 'Vengeance', 3, 5, 'aoe', { mult: 2.2, status: { stun: 1 }, cd: 5 }, 'Cooldown 5 turns: strike all enemies and stun them.']),
  B('guardian', 'tank', 'Guardian', 'Endure and recover.',
    { name: 'Second Skin', desc: 'Guard skills heal 4% more.', mod: { f: 'type:guard', pctAdd: 0.04 } },
    ['mendwounds', 'Mend Wounds', 2, 3, 'heal', { pct: 0.25 }, 'Restore 25% max HP.'],
    { name: 'Stoneblood', desc: '+1 regen and +6% max HP.', passive: { regen: 1, hp: 0.06 } },
    ['aegislife', 'Aegis of Life', 2, 5, 'guard', { block: 0.8, pct: 0.25, cd: 4 }, 'Cooldown 4 turns: block 80% and heal 25%.']),
  // ranged
  B('marksman', 'ranged', 'Marksman', 'One shot, one kill.',
    { name: 'Steady Aim', desc: '+12% damage with armor-piercing skills.', mod: { f: 'pierce', multMul: 1.12 } },
    ['calledshot', 'Called Shot', 2, 3, 'hit', { mult: 1.9, pierce: true }, 'A precise shot that ignores defense.'],
    { name: 'Hawk Eyes', desc: '+6% crit.', passive: { crit: 0.06 } },
    ['perfectshot', 'Perfect Shot', 3, 6, 'hit', { mult: 5.0, pierce: true, cd: 5 }, 'Cooldown 5 turns: the shot of a lifetime.']),
  B('trapper', 'ranged', 'Trapper', 'Control the field with traps and afflictions.',
    { name: 'Light Hands', desc: 'Skills that inflict a status cost 1 less energy.', mod: { f: 'status:any', enMinus: 1 } },
    ['snaretrap', 'Snare Trap', 1, 2, 'hit', { mult: 0.7, status: { chill: 2, poison: 3 } }, 'A cheap trap that slows and poisons.'],
    { name: 'Woodcraft', desc: '+4% evasion and +1 defense.', passive: { evade: 0.04, def: 1 } },
    ['minefield', 'Minefield', 3, 5, 'aoe', { mult: 1.5, status: { burn: 3, stun: 1 }, cd: 5 }, 'Cooldown 5 turns: blast and stun every enemy.']),
  B('barrage', 'ranged', 'Barrage', 'Bury them in arrows.',
    { name: 'Wide Volley', desc: '+12% damage with area skills.', mod: { f: 'type:aoe', multMul: 1.12 } },
    ['suppress', 'Suppressing Fire', 2, 3, 'aoe', { mult: 0.95, status: { weaken: 2 } }, 'Pin every enemy down and weaken them.'],
    { name: 'Deep Quiver', desc: '+3 energy and +3% crit.', passive: { en: 3, crit: 0.03 } },
    ['hailstorm', 'Hailstorm', 3, 6, 'aoe', { mult: 1.3, hits: 3, cd: 5 }, 'Cooldown 5 turns: three volleys on every enemy.']),
  // rogue
  B('assassin', 'rogue', 'Assassin', 'Exploit weakness.',
    { name: 'Opportunist', desc: '+15% damage with combo skills.', mod: { f: 'combo', multMul: 1.15 } },
    ['garrote', 'Garrote', 2, 3, 'hit', { mult: 1.6, status: { bleed: 4 }, combo: true }, 'Bleed the target. Crits against afflicted foes.'],
    { name: 'Cold Blood', desc: '+7% crit and +15% crit damage.', passive: { crit: 0.07, critDmg: 0.15 } },
    ['deathmark', 'Death Mark', 2, 5, 'hit', { mult: 4.4, pierce: true, combo: true, cd: 5 }, 'Cooldown 5 turns: a lethal strike.']),
  B('venom', 'rogue', 'Venomancer', 'Poisons that never stop working.',
    { name: 'Deadly Dose', desc: 'Poison skills inflict 2 more poison.', mod: { f: 'status:poison', statPlus: { poison: 2 } } },
    ['toxicbarrage', 'Toxic Barrage', 2, 4, 'aoe', { mult: 0.6, status: { poison: 5 } }, 'Poison every enemy heavily.'],
    { name: 'Immune System', desc: '+30% poison potency and +1 defense.', passive: { poison: 0.3, def: 1 } },
    ['blackwidow', 'Black Widow', 3, 5, 'hit', { mult: 2.0, status: { poison: 8, bleed: 5, weaken: 2 }, cd: 5 }, 'Cooldown 5 turns: a ruinous bite.']),
  B('phantom', 'rogue', 'Phantom', 'Be hard to hit.',
    { name: 'Lingering Shadow', desc: 'Buffs last 1 turn longer.', mod: { f: 'type:buff', turnsAdd: 1 } },
    ['shadowveil', 'Shadow Veil', 1, 2, 'buff', { buff: { evade: 0.5, dmg: 0.25, turns: 2 } }, '+50% evasion and +25% damage for 2 turns.'],
    { name: 'Light Step', desc: '+6% evasion and +1 regen.', passive: { evade: 0.06, regen: 1 } },
    ['thousandcut', 'Thousand Cuts', 3, 6, 'hit', { mult: 0.7, hits: 6, random: true, cd: 5 }, 'Cooldown 5 turns: six blinding cuts.']),
  // magic
  B('pyromancer', 'magic', 'Pyromancer', 'Burn everything.',
    { name: 'Kindling', desc: '+15% damage with burning skills.', mod: { f: 'status:burn', multMul: 1.15 } },
    ['immolate', 'Immolate', 2, 3, 'hit', { mult: 1.5, status: { burn: 5 } }, 'Set the target ablaze for a long burn.'],
    { name: 'Inner Fire', desc: '+30% burn potency and +3 energy.', passive: { burn: 0.3, en: 3 } },
    ['sunspear', 'Sun Spear', 3, 6, 'aoe', { mult: 2.6, status: { burn: 4 }, cd: 5 }, 'Cooldown 5 turns: a lance of fire for the whole room.']),
  B('cryomancer', 'magic', 'Cryomancer', 'Freeze and shatter.',
    { name: 'Deep Chill', desc: 'Chilling skills: +10% damage and +1 chill.', mod: { f: 'status:chill', multMul: 1.1, statPlus: { chill: 1 } } },
    ['icelance', 'Ice Lance', 2, 3, 'hit', { mult: 1.6, pierce: true, status: { chill: 2 } }, 'A piercing shard that chills.'],
    { name: 'Frostbound', desc: '+25% chill potency and +1 defense.', passive: { chill: 0.25, def: 1 } },
    ['abszero', 'Absolute Zero', 3, 6, 'aoe', { mult: 1.8, status: { chill: 3, stun: 1 }, cd: 5 }, 'Cooldown 5 turns: freeze the room solid.']),
  B('arcanist', 'magic', 'Arcanist', 'Raw arcane power.',
    { name: 'Focused Will', desc: 'Armor-piercing skills cost 1 less energy.', mod: { f: 'pierce', enMinus: 1 } },
    ['arcbarrage', 'Arcane Barrage', 2, 3, 'hit', { mult: 0.55, hits: 4, random: true }, 'Four bolts at random targets.'],
    { name: 'Deep Reserves', desc: '+4 energy and +1 regen.', passive: { en: 4, regen: 1 } },
    ['singularity', 'Spell Singularity', 3, 7, 'hit', { mult: 5.2, pierce: true, cd: 5 }, 'Cooldown 5 turns: collapse reality onto one foe.']),
  // support
  B('cleric', 'support', 'Cleric', 'Healing that actually heals.',
    { name: 'Mercy', desc: '+20% healing.', mod: { f: 'type:heal', pctMul: 1.2 } },
    ['prayermend', 'Prayer of Mending', 2, 3, 'heal', { pct: 0.36, cleanse: true }, 'Restore 36% max HP and remove afflictions.'],
    { name: 'Devotion', desc: '+8% max HP and +1 regen.', passive: { hp: 0.08, regen: 1 } },
    ['divineintervention', 'Divine Intervention', 2, 5, 'heal', { pct: 0.8, cleanse: true, cd: 4 }, 'Cooldown 4 turns: restore 80% max HP.']),
  B('warden', 'support', 'Warden', 'Protect and endure.',
    { name: 'Shining Aegis', desc: 'Guard skills block 8% more.', mod: { f: 'type:guard', blockAdd: 0.08 } },
    ['holyrefuge', 'Holy Refuge', 1, 3, 'guard', { block: 0.7, pct: 0.08 }, 'Block 70% and heal 8%.'],
    { name: 'Warding Light', desc: '+2 defense and +2% evasion.', passive: { def: 2, evade: 0.02 } },
    ['hallowed', 'Hallowed Ground', 2, 5, 'aoe', { mult: 1.2, status: { weaken: 3 }, pct: 0.2, cd: 5 }, 'Cooldown 5 turns: weaken every enemy and heal 20%.']),
  B('radiant', 'support', 'Radiant', 'Holy wrath.',
    { name: 'Righteous Fury', desc: '+10% damage with attack skills.', mod: { f: 'dmg', multMul: 1.1 } },
    ['radiantlance', 'Radiant Lance', 2, 3, 'hit', { mult: 1.8, pierce: true }, 'A lance of light that ignores defense.'],
    { name: 'Halo', desc: '+4% crit and +5% damage.', passive: { crit: 0.04, dmg: 0.05 } },
    ['dawnbreaker', 'Dawnbreaker', 3, 6, 'aoe', { mult: 2.6, pct: 0.15, cd: 5 }, 'Cooldown 5 turns: sunlight scours the room and heals you 15%.']),
  // hybrid
  B('spellblade', 'hybrid', 'Spellblade', 'Fire on the edge of the sword.',
    { name: 'Searing Edge', desc: '+12% damage with burning skills.', mod: { f: 'status:burn', multMul: 1.12 } },
    ['searingcut', 'Searing Cut', 2, 3, 'hit', { mult: 1.6, status: { burn: 3 } }, 'A burning cut.'],
    { name: 'Arcane Training', desc: '+4% crit and +2 energy.', passive: { crit: 0.04, en: 2 } },
    ['bladeflame', 'Blade of Flame', 3, 5, 'hit', { mult: 4.2, status: { burn: 5 }, cd: 5 }, 'Cooldown 5 turns: a blazing killing stroke.']),
  B('runeknight', 'hybrid', 'Runeknight', 'Runes that shield and empower.',
    { name: 'Rune Discipline', desc: 'Guard skills block 8% more.', mod: { f: 'type:guard', blockAdd: 0.08 } },
    ['runicbulwark', 'Runic Bulwark', 1, 2, 'guard', { block: 0.65, refund: 2, pct: 0.05 }, 'Block 65%, regain 2 energy and heal 5%.'],
    { name: 'Runed Plate', desc: '+2 defense and +5% max HP.', passive: { def: 2, hp: 0.05 } },
    ['runeoverload', 'Runic Overload', 2, 4, 'buff', { buff: { dmg: 0.35, evade: 0.15, turns: 3 }, gainAp: 1, cd: 4 }, 'Cooldown 4 turns: +35% damage, +15% evasion for 3 turns and gain 1 AP.']),
  B('elementalist', 'hybrid', 'Elementalist', 'Command fire and frost together.',
    { name: 'Elemental Wave', desc: '+12% damage with area skills.', mod: { f: 'type:aoe', multMul: 1.12 } },
    ['elemsurge', 'Elemental Surge', 2, 4, 'aoe', { mult: 1.2, status: { burn: 2, chill: 2 } }, 'Burn and chill every enemy.'],
    { name: 'Attunement', desc: '+3 energy and +4% damage.', passive: { en: 3, dmg: 0.04 } },
    ['cataclysmfusion', 'Cataclysmic Fusion', 3, 6, 'aoe', { mult: 2.4, status: { burn: 3, chill: 2, stun: 1 }, cd: 5 }, 'Cooldown 5 turns: fire and ice tear the room apart.']),
  // summon
  B('necromancer', 'summon', 'Necromancer', 'Feed on the dying.',
    { name: 'Dark Hunger', desc: 'Life-draining skills drain 15% more.', mod: { f: 'drain', drainAdd: 0.15 } },
    ['bonespear', 'Bone Spear', 2, 3, 'hit', { mult: 1.5, drain: 0.35 }, 'A spear of bone that drains life.'],
    { name: 'Deathly Vigor', desc: '+5% lifesteal and +5% max HP.', passive: { lifesteal: 0.05, hp: 0.05 } },
    ['armydead', 'Army of the Dead', 3, 6, 'summon', { spirit: { turns: 4, pct: 1.3 }, cd: 5 }, 'Cooldown 5 turns: a horde of the dead fights for 4 turns.']),
  B('plaguebringer', 'summon', 'Plaguebringer', 'Spread rot.',
    { name: 'Virulence', desc: 'Poison skills inflict 2 more poison.', mod: { f: 'status:poison', statPlus: { poison: 2 } } },
    ['pestilence', 'Pestilence', 2, 4, 'aoe', { mult: 0.6, status: { poison: 5, weaken: 2 } }, 'Poison and weaken every enemy.'],
    { name: 'Carrier', desc: '+30% poison potency and +2 energy.', passive: { poison: 0.3, en: 2 } },
    ['blackdeath', 'Black Death', 3, 6, 'aoe', { mult: 1.1, status: { poison: 8, bleed: 5 }, cd: 5 }, 'Cooldown 5 turns: a plague that eats the whole room.']),
  B('spiritcaller', 'summon', 'Spiritcaller', 'Bound spirits that never tire.',
    { name: 'Stronger Bonds', desc: 'Spirits hit 20% harder.', mod: { f: 'type:summon', spiritMul: 1.2 } },
    ['twinspirits', 'Twin Spirits', 2, 4, 'summon', { spirit: { turns: 3, pct: 0.8 } }, 'Two spirits strike for you for 3 turns.'],
    { name: 'Astral Reservoir', desc: '+4 energy and +1 regen.', passive: { en: 4, regen: 1 } },
    ['spiritdragon', 'Spirit Dragon', 3, 6, 'summon', { spirit: { turns: 5, pct: 1.5 }, cd: 5 }, 'Cooldown 5 turns: a great spirit fights for 5 turns.']),
];

// Tiers 5 and 6: what a Legendary or Mythic class earns. [tier-5 passive or mod, tier-6 skill]
const LEGEND = {
  berserker: [{ name: 'Bloodbath', desc: '+8% lifesteal and +8% damage.', passive: { lifesteal: 0.08, dmg: 0.08 } },
    ['worldbreaker', 'Worldbreaker', 3, 8, 'hit', { mult: 6.0, pierce: true, cd: 6 }, 'Cooldown 6 turns: a blow that ignores armor and cracks the ground.']],
  duelist: [{ name: 'Master of Blades', desc: '+20% damage with single-target skills.', mod: { f: 'type:hit', multMul: 1.2 } },
    ['perfectduel', 'Perfect Duel', 2, 6, 'hit', { mult: 5.0, pierce: true, combo: true, cd: 6 }, 'Cooldown 6 turns: a flawless strike that ignores armor and hits afflicted foes harder.']],
  warlord: [{ name: 'Supreme Commander', desc: '+12% max HP, +6% damage and +1 defense.', passive: { hp: 0.12, dmg: 0.06, def: 1 } },
    ['conquest', 'Conquest', 3, 8, 'aoe', { mult: 3.2, status: { weaken: 3, stun: 1 }, cd: 6 }, 'Cooldown 6 turns: break the whole room, weakening and stunning it.']],
  bulwark: [{ name: 'Living Fortress', desc: '+3 defense and +10% max HP.', passive: { def: 3, hp: 0.1 } },
    ['mountain', 'The Mountain Stands', 2, 6, 'guard', { block: 0.95, pct: 0.3, reflect: 0.5, cd: 6 }, 'Cooldown 6 turns: block 95%, reflect 50% and heal 30%.']],
  avenger: [{ name: 'Wrath Eternal', desc: '+20% thorns and +8% damage.', passive: { thorns: 0.2, dmg: 0.08 } },
    ['judgmentday', 'Judgment Day', 3, 7, 'aoe', { mult: 3.0, status: { stun: 1, weaken: 2 }, cd: 6 }, 'Cooldown 6 turns: the reckoning falls on every enemy.']],
  guardian: [{ name: 'Undying', desc: '+2 regen and +10% max HP.', passive: { regen: 2, hp: 0.1 } },
    ['deathless', 'Deathless', 2, 6, 'heal', { pct: 0.7, cleanse: true, cd: 6 }, 'Cooldown 6 turns: restore 70% max HP and cleanse every affliction.']],
  marksman: [{ name: 'Eagle Eye', desc: '+10% crit and +30% crit damage.', passive: { crit: 0.1, critDmg: 0.3 } },
    ['sunderingshot', 'Sundering Shot', 3, 8, 'hit', { mult: 6.4, pierce: true, cd: 6 }, 'Cooldown 6 turns: a shot that shatters armor.']],
  trapper: [{ name: 'Master Trapper', desc: 'Afflictions from your skills last longer and bite harder.', mod: { f: 'status:any', statPlus: { burn: 2, poison: 3, bleed: 2, chill: 1, weaken: 1 } } },
    ['deathtrap', 'Death Trap', 3, 7, 'aoe', { mult: 2.4, status: { stun: 1, bleed: 5, poison: 5 }, cd: 6 }, 'Cooldown 6 turns: the whole room is caught, bleeding and poisoned.']],
  barrage: [{ name: 'Endless Quiver', desc: '+6 energy and +6% damage.', passive: { en: 6, dmg: 0.06 } },
    ['skyfall', 'Skyfall', 3, 9, 'aoe', { mult: 1.4, hits: 4, cd: 6 }, 'Cooldown 6 turns: four volleys fall on every enemy.']],
  assassin: [{ name: 'Killer Instinct', desc: '+10% crit and +25% crit damage.', passive: { crit: 0.1, critDmg: 0.25 } },
    ['bloodblossom', 'Blood Blossom', 3, 8, 'hit', { mult: 0.8, hits: 8, random: true, cd: 6 }, 'Cooldown 6 turns: eight strikes at random targets.']],
  venom: [{ name: 'Toxic Legacy', desc: '+60% poison potency and +5% damage.', passive: { poison: 0.6, dmg: 0.05 } },
    ['plaguefang', 'Plague Fang', 2, 7, 'hit', { mult: 2.2, status: { poison: 10, bleed: 6, weaken: 3 }, cd: 6 }, 'Cooldown 6 turns: a bite that rots the victim from within.']],
  phantom: [{ name: 'Shadow Step', desc: '+10% evasion and +5% crit.', passive: { evade: 0.1, crit: 0.05 } },
    ['eclipse', 'Eclipse', 1, 6, 'buff', { buff: { evade: 0.7, dmg: 0.6, turns: 3 }, gainAp: 1, cd: 6 }, 'Cooldown 6 turns: +70% evasion, +60% damage for 3 turns and gain 1 AP.']],
  pyromancer: [{ name: 'Heart of the Sun', desc: '+60% burn potency and +4 energy.', passive: { burn: 0.6, en: 4 } },
    ['supernova', 'Supernova', 3, 9, 'aoe', { mult: 3.4, status: { burn: 6 }, cd: 6 }, 'Cooldown 6 turns: a star bursts over the room and burns it.']],
  cryomancer: [{ name: 'Heart of Winter', desc: '+50% chill potency and +2 defense.', passive: { chill: 0.5, def: 2 } },
    ['glacialend', 'Glacial End', 3, 9, 'aoe', { mult: 2.6, status: { chill: 4, stun: 2 }, cd: 6 }, 'Cooldown 6 turns: the room freezes where it stands.']],
  arcanist: [{ name: 'Mind Unbound', desc: '+20% damage with damaging skills.', mod: { f: 'dmg', multMul: 1.2 } },
    ['realityrend', 'Reality Rend', 3, 9, 'hit', { mult: 6.5, pierce: true, cd: 6 }, 'Cooldown 6 turns: tear one foe out of the world.']],
  cleric: [{ name: 'Saint\'s Grace', desc: '+35% healing from your heal skills.', mod: { f: 'type:heal', pctMul: 1.35 } },
    ['resurgence', 'Resurgence', 2, 6, 'heal', { pct: 0.9, cleanse: true, cd: 6 }, 'Cooldown 6 turns: restore 90% max HP and cleanse every affliction.']],
  warden: [{ name: 'Aegis Eternal', desc: '+3 defense, +2 regen and +8% max HP.', passive: { def: 3, regen: 2, hp: 0.08 } },
    ['sanctum', 'Sanctum', 1, 6, 'guard', { block: 0.95, pct: 0.3, cd: 6 }, 'Cooldown 6 turns: block 95% and heal 30%.']],
  radiant: [{ name: 'Radiance', desc: '+10% damage and +6% crit.', passive: { dmg: 0.1, crit: 0.06 } },
    ['wrathofdawn', 'Wrath of Dawn', 3, 8, 'aoe', { mult: 3.2, pct: 0.25, status: { weaken: 3 }, cd: 6 }, 'Cooldown 6 turns: sunlight scours the room, weakens it and heals you 25%.']],
  spellblade: [{ name: 'Burning Edge', desc: '+50% burn potency and +8% damage.', passive: { burn: 0.5, dmg: 0.08 } },
    ['starforged', 'Starforged Blade', 3, 8, 'hit', { mult: 6.0, pierce: true, status: { burn: 6 }, cd: 6 }, 'Cooldown 6 turns: a blade of burning starlight.']],
  runeknight: [{ name: 'Runic Mastery', desc: '+2 defense, +10% max HP and +3 energy.', passive: { def: 2, hp: 0.1, en: 3 } },
    ['runeprison', 'Rune Prison', 2, 7, 'aoe', { mult: 2.0, status: { stun: 2, weaken: 3 }, pct: 0.15, cd: 6 }, 'Cooldown 6 turns: runes lock the room in place and heal you 15%.']],
  elementalist: [{ name: 'Primal Harmony', desc: '+40% burn and chill potency and +4 energy.', passive: { burn: 0.4, chill: 0.4, en: 4 } },
    ['primalstorm', 'Primal Storm', 3, 9, 'aoe', { mult: 3.0, status: { burn: 4, chill: 3, stun: 1 }, cd: 6 }, 'Cooldown 6 turns: fire, frost and thunder in one storm.']],
  necromancer: [{ name: 'Lord of Bones', desc: '+8% lifesteal and +10% max HP.', passive: { lifesteal: 0.08, hp: 0.1 } },
    ['legionrise', 'The Legion Rises', 3, 8, 'summon', { spirit: { turns: 6, pct: 1.6 }, cd: 6 }, 'Cooldown 6 turns: a legion of the dead fights for 6 turns.']],
  plaguebringer: [{ name: 'Pestilence', desc: '+60% poison potency and +6% damage.', passive: { poison: 0.6, dmg: 0.06 } },
    ['dreadplague', 'Dread Plague', 3, 8, 'aoe', { mult: 1.6, status: { poison: 10, bleed: 6, weaken: 2 }, cd: 6 }, 'Cooldown 6 turns: a plague that eats the room alive.']],
  spiritcaller: [{ name: 'Spirit Tide', desc: '+6 energy and +2 regen.', passive: { en: 6, regen: 2 } },
    ['ancestors', 'Host of Ancestors', 3, 8, 'summon', { spirit: { turns: 7, pct: 1.45 }, cd: 6 }, 'Cooldown 6 turns: your ancestors fight beside you for 7 turns.']],
};
for (const b of BRANCHES) {
  const [n5, s6] = LEGEND[b.id];
  b.nodes.push(Object.assign({ tier: 5 }, n5), { tier: 6, name: s6[1], skill: s6[0] }); b.skills.push(s6);
}
const BRANCH_BY = Object.fromEntries(BRANCHES.map(b => [b.id, b]));
const NODES = {};   // id -> node with branch info
for (const b of BRANCHES) {
  b.nodes.forEach((n, i) => {
    n.id = `${b.id}.${n.tier}`; n.branch = b.id; n.kind = b.kind; n.prev = i ? `${b.id}.${i}` : null;
    Object.assign(n, { lvl: NODE_TIER[n.tier].lvl, cost: NODE_TIER[n.tier].cost, rarity: NODE_TIER[n.tier].rarity, minTier: NODE_TIER[n.tier].minTier, label: NODE_TIER[n.tier].label });
    NODES[n.id] = n;
  });
  // register the new skills (learned through the tree, never from the plain skill list)
  for (const [id, name, ap, en, type, props, desc] of b.skills) {
    if (D.SKILLS[id]) throw new Error('skill id clash: ' + id);
    D.SKILLS[id] = Object.assign({ id, name, kinds: ['tree'], bk: b.kind, lvl: 0, ap, en, type, desc, treeNode: null }, props);
  }
  b.nodes.forEach(n => { if (n.skill) D.SKILLS[n.skill].treeNode = n.id; });
}
const BRANCHES_BY_KIND = {};
for (const b of BRANCHES) (BRANCHES_BY_KIND[b.kind] = BRANCHES_BY_KIND[b.kind] || []).push(b);

// Some disciplines top out early (ranged has no Rare-or-better profession), so the tier gate never asks for more than the discipline offers.
const KIND_MAX = {};
for (const p of E.PROFESSIONS) KIND_MAX[p.kind] = Math.max(KIND_MAX[p.kind] || 0, TIER_BY[p.tier]);
const needTier = n => Math.min(n.minTier, KIND_MAX[n.kind] || 0);

// ---------- character state ----------
const has = (char, id) => (char.tree || []).includes(id);
const hasKey = (char, id) => (char.keys || []).includes(id);
function nodeWhy(char, id) {
  const n = NODES[id]; if (!n) return 'Unknown node';
  if (has(char, id)) return 'Already learned';
  const own = E.tierFor(char, n.kind) >= 0, key = hasKey(char, id);
  if (!own && !key) return 'Another discipline (needs a secret manual)';
  if (char.level < n.lvl) return `Needs level ${n.lvl}`;
  if (!key) {
    if (n.prev && !has(char, n.prev)) return 'Learn the node before it first';
    if (E.tierFor(char, n.kind) < needTier(n)) return `Needs a ${TIERS[needTier(n)].name} class or higher${E.PROF_BY[char.prof].kind === n.kind ? '' : ' in your second awakening'} (or a secret manual)`;
  }
  if (char.skillPts < n.cost) return `Needs ${n.cost} skill points`;
  return null;
}
function learnNode(char, id) {
  if (nodeWhy(char, id)) return false;
  const n = NODES[id];
  char.skillPts -= n.cost; char.tree = (char.tree || []).concat([id]);
  char.keys = (char.keys || []).filter(k => k !== id);
  if (n.skill && !char.skills.includes(n.skill)) {
    char.skills.push(n.skill);
    if (char.loadout.length < E.slotCap(char)) char.loadout.push(n.skill);
  }
  return true;
}
// The points a hero has sunk into the tree.
const treeSpent = char => (char.tree || []).reduce((a, id) => a + (NODES[id] ? NODES[id].cost : 0), 0);
function resetTree(char) {
  const spent = treeSpent(char);
  for (const id of (char.tree || [])) { const n = NODES[id]; if (n && n.skill && !(char.techs || []).includes(n.skill)) { char.skills = char.skills.filter(s => s !== n.skill); char.loadout = char.loadout.filter(s => s !== n.skill); if (char.evo) delete char.evo[n.skill]; } }
  // secret manuals are not lost: a foreign node goes back to being a manual
  for (const id of (char.tree || [])) if (NODES[id] && E.tierFor(char, NODES[id].kind) < 0) { char.keys = char.keys || []; if (!char.keys.includes(id)) char.keys.push(id); }
  char.skillPts += spent; char.tree = [];
  return spent;
}
const resetCost = (career) => Math.round(70 * career.char.level * (1 + 0.15 * (career.char.treeResets || 0)));

// ---------- effects ----------
const matches = (s, f) => {
  if (s.kinds.includes('sig') || s.id === 'attack' || s.id === 'guard') return false;
  if (!f || f === 'all') return true;
  const [k, v] = f.split(':');
  if (k === 'type') return s.type === v;
  if (k === 'status') return v === 'any' ? !!(s.status && Object.keys(s.status).length) : !!(s.status && s.status[v]);
  if (f === 'pierce') return !!s.pierce;
  if (f === 'combo') return !!s.combo;
  if (f === 'drain') return !!s.drain;
  if (f === 'dmg') return s.type === 'hit' || s.type === 'aoe';
  return false;
};
function applyMods(char, s) {
  const mods = (char.tree || []).map(id => NODES[id]).filter(n => n && n.mod);
  if (!mods.length) return s;
  let c = null;
  for (const n of mods) {
    const m = n.mod;
    if (!matches(s, m.f)) continue;
    if (!c) c = Object.assign({}, s);
    if (m.multMul && c.mult) c.mult = Math.round(c.mult * m.multMul * 1000) / 1000;
    if (m.enMinus && c.en) c.en = Math.max(1, c.en - m.enMinus);
    if (m.pctMul && c.pct) c.pct = Math.min(0.95, c.pct * m.pctMul);
    if (m.pctAdd) c.pct = Math.min(0.95, (c.pct || 0) + m.pctAdd);
    if (m.blockAdd && c.block) c.block = Math.min(0.95, c.block + m.blockAdd);
    if (m.reflectAdd && c.block) c.reflect = (c.reflect || 0) + m.reflectAdd;
    if (m.turnsAdd && c.buff) c.buff = Object.assign({}, c.buff, { turns: c.buff.turns + m.turnsAdd });
    if (m.statPlus && c.status) { c.status = Object.assign({}, c.status); for (const k in m.statPlus) if (c.status[k]) c.status[k] += m.statPlus[k]; }
    if (m.drainAdd && c.drain) c.drain = Math.min(0.95, c.drain + m.drainAdd);
    if (m.spiritMul && c.spirit) c.spirit = Object.assign({}, c.spirit, { pct: c.spirit.pct * m.spiritMul });
    if (m.pierce) c.pierce = true;
    c.treeMods = (c.treeMods || []).concat([n.name]);
  }
  return c || s;
}
function passives(char) {
  const out = {};
  for (const id of (char.tree || [])) { const n = NODES[id]; if (n && n.passive) for (const k in n.passive) out[k] = (out[k] || 0) + n.passive[k]; }
  for (const id of (char.passives || [])) { const p = PASSIVE_BY[id]; if (p) for (const k in p.passive) out[k] = (out[k] || 0) + p.passive[k]; }
  return out;
}
HOOKS.mods = applyMods;
HOOKS.passives = passives;

// ---------- secret manuals: found out on the road ----------
// A key opens one node of any branch, whatever the hero's discipline or tier. Deeper lands hide rarer manuals; Luck helps.
function rollKey(rng, ring, luck) {
  const tierW = [0, 55 - ring * 6, 30, 12 + ring * 3 + luck, 3 + ring * 2 + luck * 0.6, ring * 1.1 + luck * 0.25 - 1, Math.max(0, ring - 2) * 0.9 + luck * 0.12].map(w => Math.max(w, 0));
  const t = rng.weighted([1, 2, 3, 4, 5, 6], i => tierW[i] + 0.0001);
  const pool = BRANCHES.map(b => b.nodes[t - 1]);
  return rng.pick(pool);
}
function grantKey(char, node) {
  char.keys = char.keys || [];
  if (has(char, node.id) || hasKey(char, node.id)) return false;
  char.keys.push(node.id);
  return true;
}


// ---------- techniques: whole skills taught by the road, from any discipline ----------
// Passive skills are always on and need no slot. Active skills go in the loadout like any other.
const PASSIVE_SKILLS = [
  // [id, name, rarity, effect, desc]
  ['toughhide', 'Tough Hide', 0, { def: 1 }, '+1 defense.'],
  ['keensenses', 'Keen Senses', 0, { crit: 0.03, evade: 0.02 }, '+3% crit and +2% evasion.'],
  ['ironwill', 'Iron Will', 1, { hp: 0.06, regen: 1 }, '+6% max HP and +1 regen.'],
  ['swiftfoot', 'Swift Footwork', 1, { evade: 0.05, en: 1 }, '+5% evasion and +1 energy.'],
  ['bloodiededge', 'Bloodied Edge', 1, { lifesteal: 0.03, dmg: 0.02 }, '+3% lifesteal and +2% damage.'],
  ['battlefocus', 'Battle Focus', 2, { crit: 0.05, critDmg: 0.15, en: 2 }, '+5% crit, +15% crit damage and +2 energy.'],
  ['barbedskin', 'Barbed Skin', 2, { thorns: 0.12, def: 1 }, '+12% thorns and +1 defense.'],
  ['emberblood', 'Emberblood', 2, { burn: 0.3, en: 2 }, '+30% burn potency and +2 energy.'],
  ['venomtouch', 'Venom Touch', 2, { poison: 0.3, dmg: 0.03 }, '+30% poison potency and +3% damage.'],
  ['warriorssoul', 'Warrior\'s Soul', 3, { dmg: 0.08, hp: 0.06 }, '+8% damage and +6% max HP.'],
  ['ghostwalk', 'Ghostwalk', 3, { evade: 0.08, regen: 1 }, '+8% evasion and +1 regen.'],
  ['arcanewell', 'Arcane Wellspring', 3, { en: 5, regen: 1 }, '+5 energy and +1 regen.'],
  ['vampiricaura', 'Vampiric Aura', 3, { lifesteal: 0.06, hp: 0.04 }, '+6% lifesteal and +4% max HP.'],
  ['titanheart', 'Titan\'s Heart', 4, { hp: 0.14, def: 2, regen: 1 }, '+14% max HP, +2 defense and +1 regen.'],
  ['dragonblood', 'Dragonblood', 4, { dmg: 0.12, burn: 0.4, crit: 0.04 }, '+12% damage, +40% burn potency and +4% crit.'],
  ['fatesthread', 'Thread of Fate', 4, { crit: 0.08, evade: 0.06, critDmg: 0.2 }, '+8% crit, +6% evasion and +20% crit damage.'],
  ['worldsoul', 'World-Soul', 5, { dmg: 0.14, hp: 0.12, regen: 2, en: 4 }, '+14% damage, +12% max HP, +2 regen and +4 energy.'],
  ['theunbound', 'The Unbound', 5, { lifesteal: 0.08, crit: 0.08, critDmg: 0.3, def: 2 }, '+8% lifesteal, +8% crit, +30% crit damage and +2 defense.'],
].map(([id, name, rarity, passive, desc]) => ({ id, name, rarity, passive, desc, isPassive: true }));
const PASSIVE_BY = Object.fromEntries(PASSIVE_SKILLS.map(p => [p.id, p]));

// 0 Common ... 5 Mythic. Plain skills by unlock level, exclusives and tree skills by what they ask of the hero.
function skillRarity(id) {
  const sk = D.SKILLS[id]; if (!sk) return 0;
  if (sk.treeNode) return NODES[sk.treeNode].rarity;
  if (sk.minTier) return TIER_BY[sk.minTier];
  if (sk.kinds.includes('book')) return 1;
  return sk.lvl <= 7 ? 0 : sk.lvl <= 17 ? 1 : 2;
}
// A hero can only grasp a technique that fits their level: Epic from 15, Legendary from 25, Mythic from 35.
const rarityCap = level => level >= 35 ? 5 : level >= 25 ? 4 : level >= 15 ? 3 : 2;
function techPool(char, r) {
  const act = Object.values(D.SKILLS).filter(sk => !sk.kinds.includes('sig') && !sk.kinds.includes('all') && !sk.kinds.includes('book') && skillRarity(sk.id) === r && !char.skills.includes(sk.id));
  const pas = PASSIVE_SKILLS.filter(p => p.rarity === r && !(char.passives || []).includes(p.id));
  return { act, pas };
}
function rollTechnique(rng, ring, luck, char, boost) {
  const rb = ring + (boost || 0), cap = rarityCap(char.level);
  const w = [30 - rb * 3, 28, 20 + rb, 9 + rb * 2.5 + luck * 0.5, 3 + rb * 1.6 + luck * 0.35, 0.8 + Math.max(0, rb - 1) * 0.8 + luck * 0.12].map((x, i) => i > cap ? 0 : Math.max(0, x));
  let r = rng.weighted([0, 1, 2, 3, 4, 5], i => w[i] + 0.0001);
  for (; r >= 0; r--) {
    const { act, pas } = techPool(char, r);
    if (!act.length && !pas.length) continue;
    // about one in four lessons is a passive
    const usePas = pas.length && (!act.length || rng.chance(0.28));
    return usePas ? { passive: true, id: rng.pick(pas).id, rarity: r } : { passive: false, id: rng.pick(act).id, rarity: r };
  }
  return null;
}
function grantTechnique(char, t) {
  if (t.passive) {
    char.passives = char.passives || [];
    if (char.passives.includes(t.id)) return false;
    char.passives.push(t.id); return true;
  }
  if (char.skills.includes(t.id)) return false;
  char.skills.push(t.id); char.techs = (char.techs || []).concat([t.id]);
  if (char.loadout.length < E.slotCap(char)) char.loadout.push(t.id);
  return true;
}
const techInfo = t => t.passive ? PASSIVE_BY[t.id] : D.SKILLS[t.id];
const isForeign = (char, id) => { const sk = D.SKILLS[id]; return !!sk && !sk.kinds.includes('book') && !sk.kinds.concat(sk.bk ? [sk.bk] : []).some(k => E.tierFor(char, k) >= 0); };


// ---------- second awakening: a sub profession ----------
const AWAKEN_LEVEL = 20;
const subEligible = char => char.level >= AWAKEN_LEVEL && !char.sub;
// Rolls any profession of any tier: no race, discipline or level limit. Deeper lands and Luck only make better tiers likelier.
function rollSub(rng, ring, luck, char, boost) {
  const rb = ring + (boost || 0);
  const w = [26 - rb * 3, 26, 22 + rb, 12 + rb * 2 + luck * 0.5, 4 + rb * 1.5 + luck * 0.3, 0.8 + Math.max(0, rb - 1) * 0.7 + luck * 0.1].map(x => Math.max(0, x));
  const ti = rng.weighted([0, 1, 2, 3, 4, 5], i => w[i] + 0.0001);
  const p = rng.pick(E.PROFESSIONS.filter(x => x.tier === TIERS[ti].id && x.name !== char.prof));
  return { prof: p.name, tier: p.tier };
}
function grantSub(char, sub) {
  if (!subEligible(char) || !sub) return false;
  char.sub = { prof: sub.prof, tier: sub.tier }; return true;
}

// ---------- bot helper ----------
const nodeScore = n => (n.skill ? 3 : n.passive ? 2 : 1) + n.tier * 0.5;
const skillScore = s => ((s.mult || 0.5) * (s.hits || 1) * (s.type === 'aoe' ? 1.7 : 1) + (s.pct || 0) * 3 + (s.block || 0) + (s.spirit ? s.spirit.pct * s.spirit.turns : 0) + (s.drain || 0)) / Math.max(1, s.ap) / (1 + (s.en || 0) * 0.1) * (s.once ? 0.35 : s.cd ? 0.6 : 1);
function autoTree(char) {
  const kind = E.PROF_BY[char.prof].kind, br = BRANCHES_BY_KIND[kind];
  // go deep in one branch at a time (the bot picks the branch whose first node it can afford, in order)
  for (let guard = 0; guard < 40; guard++) {
    let best = null;
    for (const b of br) for (const n of b.nodes) {
      if (nodeWhy(char, n.id)) continue;
      const depth = (char.tree || []).filter(x => NODES[x].branch === b.id).length;
      const sc = nodeScore(n) + depth * 2;
      if (!best || sc > best.sc) best = { n, sc };
    }
    if (!best) break;
    learnNode(char, best.n.id);
  }
  // keep the loadout as it was, but swap each new tree skill in for the weakest equipped skill when it is clearly better
  const cap = E.slotCap(char);
  for (const id of char.skills) {
    const sk = D.SKILLS[id];
    if (!sk || !sk.kinds.includes('tree') || char.loadout.includes(id)) continue;
    if (char.loadout.length < cap) { char.loadout.push(id); continue; }
    let wi = -1, ws = 1e9;
    char.loadout.forEach((lid, i) => { const l = D.SKILLS[lid]; if (l.kinds.includes('sig')) return; const sc = skillScore(E.effSkill(char, lid)); if (sc < ws) { ws = sc; wi = i; } });
    if (wi >= 0 && skillScore(E.effSkill(char, id)) > ws * 1.1) char.loadout[wi] = id;
  }
}

// Equip the best-scoring skills (a stand-in for a thoughtful player). Used by the bot with and without the tree.
function optimizeLoadout(char) {
  const cap = E.slotCap(char), own = char.skills.filter(id => D.SKILLS[id] && !D.SKILLS[id].kinds.includes('sig'));
  const sc = id => skillScore(E.effSkill(char, id)), typ = id => E.effSkill(char, id).type;
  const byScore = own.slice().sort((a, b) => sc(b) - sc(a));
  // a sensible player always keeps one way to heal or defend
  const safe = byScore.find(id => typ(id) === 'heal') || byScore.find(id => typ(id) === 'guard');
  const pick = byScore.filter(id => id !== safe).slice(0, cap - (safe ? 1 : 0));
  char.loadout = (safe ? [safe] : []).concat(pick);
}
function treeResetCareer(career) {
  const spent = treeSpent(career.char);
  if (!spent) return { ok: false, msg: 'You have not spent any points in the skill tree.' };
  const cost = resetCost(career);
  if (career.gold < cost) return { ok: false, msg: `The Academy charges ${cost} gold to unlearn the tree.` };
  career.gold -= cost; career.char.treeResets = (career.char.treeResets || 0) + 1;
  resetTree(career.char);
  return { ok: true, msg: `Your tree is cleared. ${spent} skill points are refunded.` };
}
Object.assign(E, { treeResetCareer, optimizeLoadout, TREE_BRANCHES: BRANCHES, TREE_BRANCH_BY: BRANCH_BY, TREE_NODES: NODES, TREE_BY_KIND: BRANCHES_BY_KIND, NODE_TIER, nodeWhy, learnNode, treeSpent, resetTree, treeResetCost: resetCost,
  needTier, treeMods: applyMods, treePassives: passives, rollTreeKey: rollKey, grantTreeKey: grantKey, autoTree, PASSIVE_SKILLS, PASSIVE_BY, skillRarity, rollTechnique, grantTechnique, techInfo, isForeign, rarityCap, AWAKEN_LEVEL, subEligible, rollSub, grantSub, hasNode: has });
})(typeof globalThis !== 'undefined' ? globalThis : this);
