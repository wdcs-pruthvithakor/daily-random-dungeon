'use strict';
/* Daily Random Dungeon - content data (no logic). */
(function (root) {

// ---------- Skills ----------
// fields: ap en type(hit|aoe|heal|guard|rewind|phase|buff|cleanse|summon|focus) mult hits pierce status combo execute drain hpCost pct block reflect refund
//         buff{dmg,evade,def,turns} healPct gainAp spirit{turns,pct} random once lvl kinds
const SKILLS = {};
function sk(id, name, kinds, lvl, ap, en, type, props, desc) {
  SKILLS[id] = Object.assign({ id, name, kinds, lvl, ap, en, type, desc }, props || {});
}
sk('attack', 'Attack', ['all'], 0, 1, 0, 'hit', { mult: 1 }, 'A basic strike. Free.');
sk('guard', 'Guard', ['all'], 0, 1, 0, 'guard', { block: 0.5 }, 'Take 50% less damage until your next turn.');

// melee
sk('powerstrike', 'Power Strike', ['melee'], 1, 2, 3, 'hit', { mult: 1.9 }, 'A heavy blow.');
sk('cleave', 'Cleave', ['melee'], 1, 2, 3, 'aoe', { mult: 0.9 }, 'Hit every enemy.');
sk('warcry', 'War Cry', ['melee'], 3, 1, 2, 'buff', { buff: { dmg: 0.25, turns: 3 } }, '+25% damage for 3 turns.');
sk('rend', 'Rend', ['melee'], 6, 2, 3, 'hit', { mult: 1.2, status: { bleed: 4 } }, 'Opens a bleeding wound.');
sk('whirlwind', 'Whirlwind', ['melee'], 10, 3, 5, 'aoe', { mult: 1.3 }, 'A spinning strike that hits all enemies.');
sk('executioner', 'Executioner', ['melee'], 15, 2, 4, 'hit', { mult: 1.5, execute: { below: 0.35, bonus: 1.0 } }, 'Double damage to enemies below 35% HP.');
sk('earthshatter', 'Earthshatter', ['melee'], 20, 3, 6, 'aoe', { mult: 1.4, status: { stun: 1 } }, 'Smash the ground: hits and stuns all enemies.');
sk('bladestorm', 'Bladestorm', ['melee'], 28, 3, 6, 'hit', { mult: 0.95, hits: 3 }, 'Three rapid strikes.');
sk('titansfall', 'Titan\'s Fall', ['melee'], 35, 3, 7, 'hit', { mult: 4.2, cd: 5 }, 'Cooldown 5 turns: a crushing blow.');
// tank
sk('shieldbash', 'Shield Bash', ['tank'], 1, 2, 2, 'hit', { mult: 1.2, status: { stun: 1 } }, 'Stuns the target for a turn.');
sk('fortify', 'Fortify', ['tank'], 1, 1, 2, 'guard', { block: 0.7 }, 'Take 70% less damage until your next turn.');
sk('ironskin', 'Ironskin', ['tank'], 3, 1, 2, 'guard', { block: 0.6, pct: 0.05 }, 'Block 60% and recover 5% HP.');
sk('counter', 'Counterstance', ['tank'], 6, 1, 2, 'guard', { block: 0.5, reflect: 0.9 }, 'Block 50%; attackers take damage back.');
sk('shieldslam', 'Shield Slam', ['tank'], 10, 2, 3, 'hit', { mult: 1.7, status: { weaken: 2 } }, 'Heavy blow that weakens the target.');
sk('bulwark', 'Bulwark', ['tank'], 15, 2, 3, 'guard', { block: 0.8, refund: 3 }, 'Block 80% and regain 3 energy.');
sk('judgement', 'Judgement', ['tank'], 20, 2, 4, 'hit', { mult: 2.1, status: { weaken: 2 } }, 'A righteous strike.');
sk('unbreakable', 'Unbreakable', ['tank'], 28, 2, 4, 'guard', { block: 0.9, pct: 0.15, cd: 4 }, 'Cooldown 4 turns: block 90% and heal 15%.');
sk('colossus', 'Colossus', ['tank'], 35, 3, 6, 'hit', { mult: 2.6, status: { stun: 1 }, cd: 5 }, 'Cooldown 5 turns: slam and stun.');
// ranged
sk('aimedshot', 'Aimed Shot', ['ranged'], 1, 2, 3, 'hit', { mult: 2.0, pierce: true }, 'Ignores enemy defense.');
sk('volley', 'Volley', ['ranged'], 1, 2, 4, 'aoe', { mult: 0.85 }, 'Arrows rain on every enemy.');
sk('poisonarrow', 'Poison Arrow', ['ranged'], 3, 1, 2, 'hit', { mult: 0.9, status: { poison: 4 } }, 'Poisons the target.');
sk('pinningshot', 'Pinning Shot', ['ranged'], 6, 2, 3, 'hit', { mult: 1.3, status: { chill: 2 } }, 'Slows and weakens the target\'s attacks.');
sk('multishot', 'Multishot', ['ranged'], 10, 2, 4, 'hit', { mult: 0.7, hits: 3, random: true }, 'Three arrows at random targets.');
sk('explosivearrow', 'Explosive Arrow', ['ranged'], 15, 2, 5, 'aoe', { mult: 1.1, status: { burn: 3 } }, 'Burns every enemy.');
sk('headshot', 'Headshot', ['ranged'], 20, 2, 5, 'hit', { mult: 2.7, pierce: true, combo: true }, 'Auto-crit against afflicted targets.');
sk('rainofarrows', 'Rain of Arrows', ['ranged'], 28, 3, 6, 'aoe', { mult: 0.9, hits: 2 }, 'Two volleys on every enemy.');
sk('deadeye', 'Deadeye', ['ranged'], 35, 3, 7, 'hit', { mult: 5.2, pierce: true, cd: 5 }, 'Cooldown 5 turns: a perfect shot.');
// rogue
sk('backstab', 'Backstab', ['rogue'], 1, 2, 3, 'hit', { mult: 1.5, combo: true }, 'Auto-crit and +50% vs afflicted enemies.');
sk('poisonblade', 'Poison Blade', ['rogue'], 1, 1, 2, 'hit', { mult: 0.8, status: { poison: 4 } }, 'Poisons the target.');
sk('shadowstep', 'Shadow Step', ['rogue'], 3, 1, 2, 'buff', { buff: { evade: 0.3, dmg: 0.2, turns: 2 } }, '+30% evasion and +20% damage for 2 turns.');
sk('fanofknives', 'Fan of Knives', ['rogue'], 6, 2, 4, 'aoe', { mult: 0.8, status: { bleed: 3 } }, 'Hit and bleed every enemy.');
sk('eviscerate', 'Eviscerate', ['rogue'], 10, 2, 4, 'hit', { mult: 2.2, execute: { below: 0.4, bonus: 0.8 } }, 'Brutal against wounded foes.');
sk('smokebomb', 'Smoke Bomb', ['rogue'], 15, 2, 3, 'guard', { block: 0.6, allStatus: { chill: 1 } }, 'Block 60% and blind the enemies.');
sk('assassinate', 'Assassinate', ['rogue'], 20, 2, 5, 'hit', { mult: 3.3, combo: true }, 'Devastating against afflicted targets.');
sk('deathblossom', 'Death Blossom', ['rogue'], 28, 3, 6, 'aoe', { mult: 1.8 }, 'A storm of blades.');
sk('shadowdance', 'Shadow Dance', ['rogue'], 35, 3, 7, 'hit', { mult: 0.85, hits: 5, random: true, cd: 5 }, 'Cooldown 5 turns: five rapid strikes.');
// magic
sk('fireball', 'Fireball', ['magic'], 1, 2, 4, 'hit', { mult: 1.8, status: { burn: 3 } }, 'Burns the target.');
sk('frostbolt', 'Frost Bolt', ['magic'], 1, 2, 3, 'hit', { mult: 1.3, status: { chill: 2 } }, 'Chills: target deals 40% less damage.');
sk('arcanemissiles', 'Arcane Missiles', ['magic'], 3, 2, 3, 'hit', { mult: 0.65, hits: 3, random: true }, 'Three bolts at random targets.');
sk('lightning', 'Chain Lightning', ['magic'], 6, 2, 4, 'aoe', { mult: 1.05, pierce: true }, 'Lightning ignores defense on every enemy.');
sk('manashield', 'Mana Shield', ['magic'], 10, 1, 3, 'guard', { block: 0.6, refund: 2 }, 'Block 60% and regain 2 energy.');
sk('meteor', 'Meteor', ['magic'], 15, 3, 6, 'aoe', { mult: 1.9, status: { burn: 3 } }, 'Fire from the sky.');
sk('blizzard', 'Blizzard', ['magic'], 20, 2, 5, 'aoe', { mult: 1.2, status: { chill: 2 } }, 'Freezing storm.');
sk('arcaneblast', 'Arcane Blast', ['magic'], 28, 3, 7, 'hit', { mult: 3.8, pierce: true }, 'Raw magical force.');
sk('cataclysm', 'Cataclysm', ['magic'], 35, 3, 8, 'aoe', { mult: 3.0, cd: 5 }, 'Cooldown 5 turns: devastate the room.');
// support
sk('smite', 'Smite', ['support'], 1, 2, 3, 'hit', { mult: 1.5 }, 'Holy damage.');
sk('heal', 'Healing Light', ['support'], 1, 2, 4, 'heal', { pct: 0.3 }, 'Restore 30% max HP.');
sk('blessing', 'Blessing', ['support'], 3, 1, 3, 'buff', { buff: { dmg: 0.2, turns: 3 }, pct: 0.1 }, '+20% damage for 3 turns and heal 10%.');
sk('holynova', 'Holy Nova', ['support'], 6, 2, 4, 'aoe', { mult: 0.8, pct: 0.1 }, 'Damage all enemies and heal 10%.');
sk('purify', 'Purify', ['support'], 10, 1, 3, 'cleanse', { pct: 0.15 }, 'Remove all afflictions and heal 15%.');
sk('divineshield', 'Divine Shield', ['support'], 15, 2, 4, 'guard', { block: 0.9, cd: 4 }, 'Cooldown 4 turns: take 90% less damage.');
sk('radiance', 'Radiance', ['support'], 20, 2, 5, 'aoe', { mult: 1.4, status: { weaken: 2 } }, 'Burning light weakens all enemies.');
sk('revive', 'Rebirth', ['support'], 28, 2, 6, 'heal', { pct: 0.6, cd: 4 }, 'Cooldown 4 turns: restore 60% max HP.');
sk('divinelight', 'Judgement of Light', ['support'], 35, 3, 7, 'hit', { mult: 3.6, pct: 0.2, cd: 5 }, 'Cooldown 5 turns: smite and heal 20%.');
// hybrid
sk('manablade', 'Mana Blade', ['hybrid'], 1, 2, 3, 'hit', { mult: 1.7, status: { burn: 2 } }, 'Magic-charged strike that burns.');
sk('arcaneguard', 'Arcane Guard', ['hybrid'], 1, 1, 2, 'guard', { block: 0.5, refund: 2 }, 'Block 50% and recover 2 energy.');
sk('flameslash', 'Flame Slash', ['hybrid'], 3, 2, 3, 'hit', { mult: 1.7, status: { burn: 3 } }, 'A burning cut.');
sk('runeward', 'Rune Ward', ['hybrid'], 6, 1, 2, 'guard', { block: 0.5, buff: { dmg: 0.15, turns: 2 } }, 'Block 50% and +15% damage for 2 turns.');
sk('spellstrike', 'Spellstrike', ['hybrid'], 10, 2, 4, 'hit', { mult: 2.3, pierce: true }, 'Armor-piercing spell blade.');
sk('bladenova', 'Blade Nova', ['hybrid'], 15, 3, 5, 'aoe', { mult: 1.4 }, 'A ring of blades.');
sk('arcanesurge', 'Arcane Surge', ['hybrid'], 20, 0, 0, 'focus', { gainAp: 2, refund: 4, cd: 4 }, 'Cooldown 4 turns: gain 2 AP and 4 energy.');
sk('fusion', 'Fusion Strike', ['hybrid'], 28, 3, 6, 'hit', { mult: 3.2, status: { burn: 3, chill: 2 } }, 'Fire and frost together.');
sk('worldedge', 'World\'s Edge', ['hybrid'], 35, 3, 7, 'aoe', { mult: 2.6, cd: 5 }, 'Cooldown 5 turns: cut through everything.');
// summon
sk('spiritbolt', 'Spirit Bolt', ['summon'], 1, 2, 3, 'hit', { mult: 1.6 }, 'A bolt from your bound spirit.');
sk('poisoncloud', 'Poison Cloud', ['summon'], 1, 2, 4, 'aoe', { mult: 0.5, status: { poison: 4 } }, 'Poison every enemy.');
sk('summonspirit', 'Summon Spirit', ['summon'], 3, 2, 4, 'summon', { spirit: { turns: 3, pct: 0.5 } }, 'A spirit strikes for you for 3 turns.');
sk('wither', 'Wither', ['summon'], 6, 2, 3, 'hit', { mult: 1.0, status: { weaken: 3, poison: 3 } }, 'Weakens and poisons.');
sk('soulleech', 'Soul Leech', ['summon'], 10, 2, 4, 'hit', { mult: 1.5, drain: 0.6 }, 'Strike and heal for 60% of the damage.');
sk('horde', 'Spirit Horde', ['summon'], 15, 2, 5, 'summon', { spirit: { turns: 4, pct: 0.75 } }, 'A stronger spirit for 4 turns.');
sk('deathcoil', 'Death Coil', ['summon'], 20, 2, 5, 'hit', { mult: 2.3, drain: 0.5 }, 'Lifedraining blast.');
sk('plague', 'Plague', ['summon'], 28, 3, 6, 'aoe', { mult: 0.8, status: { poison: 6, bleed: 4 } }, 'Spread poison and bleeding.');
sk('legion', 'Legion', ['summon'], 35, 3, 7, 'summon', { spirit: { turns: 5, pct: 1.1 }, cd: 5 }, 'Cooldown 5 turns: an army of spirits.');
// universal (learned from books)
sk('secondwind', 'Second Wind', ['book'], 1, 2, 0, 'heal', { pct: 0.25, cd: 4 }, 'Cooldown 4 turns: heal 25% max HP.');
sk('focus', 'Focus', ['book'], 1, 1, 0, 'focus', { refund: 5 }, 'Regain 5 energy.');
sk('throwingknife', 'Throwing Knife', ['book'], 1, 1, 1, 'hit', { mult: 0.95, pierce: true }, 'A cheap piercing throw.');
sk('meditate', 'Meditate', ['book'], 1, 2, 0, 'focus', { refund: 8, pct: 0.1 }, 'Regain 8 energy and heal 10%.');
sk('rally', 'Rally', ['book'], 1, 1, 2, 'buff', { buff: { dmg: 0.15, evade: 0.1, turns: 3 } }, '+15% damage and +10% evasion for 3 turns.');
// signature skills
sk('ultimate', 'Awakened Power', ['sig'], 0, 2, 4, 'hit', { mult: 4.8, pierce: true, once: true }, 'Once per fight: a devastating strike that ignores defense.');
sk('bloodpact', 'Blood Pact', ['sig'], 0, 2, 0, 'hit', { mult: 5.4, pierce: true, hpCost: 0.2, once: true }, 'Once per fight: pay 20% HP for massive damage that ignores defense.');
sk('rewind', 'Rewind', ['sig'], 0, 0, 3, 'rewind', { once: true }, 'Once per fight, free: heal 40% and regain 2 AP.');
sk('devour', 'Devour', ['sig'], 0, 2, 3, 'hit', { mult: 3.4, drain: 0.7, once: true }, 'Once per fight: a heavy strike that heals you for 70% of the damage.');
sk('phase', 'Phase Shift', ['sig'], 0, 1, 3, 'phase', { once: true }, 'Once per fight: stun all enemies for a turn.');
sk('gamble', 'Gamble', ['sig'], 0, 1, 2, 'hit', { gamble: true }, 'Damage x0.8 to x6.0, usable every turn. Luck loads the dice.');
sk('quake', 'World Quake', ['sig'], 0, 2, 5, 'aoe', { mult: 3.8, status: { stun: 1 }, once: true }, 'Once per fight: shatter the whole room and stun every enemy.');

// reactive skills: read the enemy's telegraphed move
// interrupt: [intents] cancels that action; parry: [intents] negates the first such attack and counters; punish/sunder: break shields and bracing foes
const PHYS = ['attack', 'heavy', 'flurry', 'slam', 'stagger', 'bleed', 'venom'];
sk('parry', 'Parry', ['melee'], 2, 1, 2, 'guard', { block: 0.25, parry: PHYS, counter: 1.3 }, 'Block 25%. The first physical attack this turn is negated and answered.');
sk('sunder', 'Sunder', ['melee'], 8, 2, 3, 'hit', { mult: 1.3, sunder: true, punish: { intents: ['guard', 'shield'], mult: 1.6 } }, 'Shatters shields. +60% damage to bracing or shielded foes.');
sk('stonewall', 'Stonewall', ['tank'], 2, 1, 2, 'guard', { block: 0.5, parry: ['heavy', 'slam', 'stagger'], counter: 1.6 }, 'Block 50%. Negates one heavy blow and answers it.');
sk('breaker', 'Breaker', ['tank'], 8, 2, 4, 'hit', { mult: 1.2, sunder: true, interrupt: ['heavy', 'slam', 'summon', 'shield', 'stagger'] }, 'Interrupts a heavy, summoning or shielding foe and shatters shields.');
sk('disrupt', 'Disrupting Shot', ['ranged'], 2, 2, 3, 'hit', { mult: 0.9, interrupt: ['summon', 'curse', 'shield', 'burn', 'drain'] }, 'Shoot the caster: interrupts summons, curses, shields and spells.');
sk('weakpoint', 'Weak Point', ['ranged'], 8, 2, 3, 'hit', { mult: 1.3, pierce: true, punish: { intents: ['guard', 'shield'], mult: 1.7 } }, 'Piercing shot that punishes bracing and shielded foes.');
sk('riposte', 'Riposte', ['rogue'], 2, 1, 2, 'guard', { block: 0.2, parry: PHYS, counter: 1.9 }, 'Block 20%. The first physical attack is negated and punished.');
sk('hamstring', 'Hamstring', ['rogue'], 8, 2, 4, 'hit', { mult: 1.1, status: { weaken: 2 }, interrupt: ['flurry', 'slam', 'heavy'] }, 'Cripples the legs: interrupts a charging attack and weakens.');
sk('counterspell', 'Counterspell', ['magic'], 2, 2, 3, 'hit', { mult: 0.8, interrupt: ['summon', 'curse', 'burn', 'drain', 'shield'] }, 'Interrupts a spell or summon.');
sk('mirrorward', 'Mirror Ward', ['magic'], 8, 1, 3, 'guard', { block: 0.3, parry: ['burn', 'curse', 'drain', 'venom'], counter: 1.5 }, 'Block 30%. The first spell or venom attack is reflected.');
sk('dispel', 'Dispel', ['support'], 2, 2, 3, 'hit', { mult: 0.8, sunder: true, interrupt: ['curse', 'drain', 'shield', 'burn'] }, 'Strips shields and interrupts curses and drains.');
sk('sanctuary', 'Sanctuary', ['support'], 8, 1, 3, 'guard', { block: 0.4, pct: 0.1, parry: ['curse', 'drain', 'burn', 'venom', 'bleed'], counter: 1.0 }, 'Block 40%, heal 10%, and negate the first affliction attack.');
sk('spellparry', 'Spell Parry', ['hybrid'], 2, 1, 2, 'guard', { block: 0.3, parry: ['attack', 'heavy', 'flurry', 'slam', 'burn', 'curse'], counter: 1.4 }, 'Block 30%. Negate and answer the first attack.');
sk('disruptblade', 'Disruption Blade', ['hybrid'], 8, 2, 4, 'hit', { mult: 1.2, sunder: true, interrupt: ['summon', 'curse', 'shield', 'heavy', 'slam'] }, 'Interrupts big actions and shatters shields.');
sk('bindspirit', 'Bind', ['summon'], 2, 2, 3, 'hit', { mult: 0.8, interrupt: ['summon', 'curse', 'shield', 'drain', 'heavy'] }, 'Binds the target: interrupts its next big action.');
sk('spiritward', 'Spirit Ward', ['summon'], 8, 1, 3, 'guard', { block: 0.3, parry: PHYS, counter: 1.2 }, 'Block 30%. Your spirit takes the first attack and strikes back.');

// exclusive skills: only Epic (E), Legendary (L) and Mythic (M) classes can learn these. minTier gates them.
const X = (id, name, kind, minTier, lvl, ap, en, type, props, desc) => sk(id, name, [kind], lvl, ap, en, type, Object.assign({ minTier, exclusive: true }, props), desc);
X('warcleave', 'Warcry Cleave', 'melee', 'E', 10, 2, 3, 'aoe', { mult: 1.5, status: { weaken: 2 } }, 'Sweeps every enemy and weakens them.');
X('bladestorm', 'Bladestorm', 'melee', 'L', 18, 3, 5, 'aoe', { mult: 1.4, hits: 2 }, 'Two sweeps across the whole room.');
X('titanwrath', 'Titan\'s Wrath', 'melee', 'M', 26, 3, 6, 'hit', { mult: 6.0, pierce: true, cd: 5 }, 'Cooldown 5 turns: a blow that ignores armor.');
X('shieldbash', 'Shield Bash', 'tank', 'E', 10, 2, 3, 'hit', { mult: 1.6, status: { weaken: 3 } }, 'A heavy bash that weakens.');
X('aegisslam', 'Aegis Slam', 'tank', 'L', 18, 2, 4, 'hit', { mult: 2.6, status: { weaken: 3 }, block: 0.3 }, 'Crushing slam while you stay braced.');
X('bastion', 'Immortal Bastion', 'tank', 'M', 26, 2, 5, 'guard', { block: 0.95, pct: 0.25, cd: 4 }, 'Cooldown 4 turns: take 95% less damage and heal 25%.');
X('piercevolley', 'Piercing Volley', 'ranged', 'E', 10, 2, 4, 'hit', { mult: 0.8, hits: 3, random: true, pierce: true }, 'Three armor-piercing shots.');
X('huntersmark', 'Hunter\'s Mark', 'ranged', 'L', 18, 2, 4, 'hit', { mult: 2.0, status: { bleed: 4 }, combo: true }, 'Marks the prey: bleeds, crits afflicted foes.');
X('starfall', 'Starfall Barrage', 'ranged', 'M', 26, 3, 7, 'aoe', { mult: 2.2, hits: 2, cd: 5 }, 'Cooldown 5 turns: a rain of falling stars.');
X('venomflurry', 'Venom Flurry', 'rogue', 'E', 10, 2, 3, 'hit', { mult: 0.6, hits: 4, random: true, status: { poison: 2 } }, 'Four poisoned cuts.');
X('vanish', 'Vanish', 'rogue', 'L', 18, 1, 3, 'buff', { buff: { evade: 0.6, dmg: 0.4, turns: 2 } }, '+60% evasion and +40% damage for 2 turns.');
X('thousandcuts', 'Thousand Cuts', 'rogue', 'M', 26, 3, 7, 'hit', { mult: 0.7, hits: 8, random: true, cd: 5 }, 'Cooldown 5 turns: eight blinding strikes.');
X('manasurge', 'Mana Surge', 'magic', 'E', 10, 0, 0, 'focus', { gainAp: 1, refund: 5, cd: 4 }, 'Cooldown 4 turns: gain 1 AP and 5 energy.');
X('prismray', 'Prismatic Ray', 'magic', 'L', 18, 2, 6, 'hit', { mult: 3.0, pierce: true, status: { burn: 2, chill: 2 } }, 'A piercing ray of fire and frost.');
X('annihilate', 'Arcane Annihilation', 'magic', 'M', 26, 3, 8, 'aoe', { mult: 4.0, pierce: true, cd: 5 }, 'Cooldown 5 turns: unmake the room.');
X('mendwave', 'Mending Wave', 'support', 'E', 10, 2, 4, 'heal', { pct: 0.45 }, 'Restore 45% max HP.');
X('sanctward', 'Sanctified Ward', 'support', 'L', 18, 1, 4, 'guard', { block: 0.7, pct: 0.2 }, 'Block 70% and heal 20%.');
X('miracle', 'Miracle', 'support', 'M', 26, 2, 6, 'heal', { pct: 0.9, cd: 4 }, 'Cooldown 4 turns: restore 90% max HP.');
X('runebarrage', 'Runic Barrage', 'hybrid', 'E', 10, 2, 4, 'hit', { mult: 1.0, hits: 3, random: true, status: { burn: 1 } }, 'Three runed strikes.');
X('elementrift', 'Elemental Rift', 'hybrid', 'L', 18, 3, 6, 'aoe', { mult: 2.0, status: { burn: 3, chill: 2 } }, 'Tear open fire and frost on every enemy.');
X('ascendantedge', 'Ascendant Edge', 'hybrid', 'M', 26, 3, 7, 'hit', { mult: 5.5, pierce: true, cd: 5 }, 'Cooldown 5 turns: a blade of pure force.');
X('familiarpack', 'Familiar Pack', 'summon', 'E', 10, 2, 5, 'summon', { spirit: { turns: 4, pct: 0.6 } }, 'A pack of familiars fights for 4 turns.');
X('soulharvest', 'Soul Harvest', 'summon', 'L', 18, 2, 5, 'hit', { mult: 2.6, drain: 0.7 }, 'Reap a soul and heal for 70% of the damage.');
X('deadarmy', 'Army of the Dead', 'summon', 'M', 26, 3, 8, 'summon', { spirit: { turns: 6, pct: 1.5 }, cd: 5 }, 'Cooldown 5 turns: the dead rise to serve you.');

const KIND_SKILL_LIST = {};
for (const k of ['melee', 'tank', 'ranged', 'rogue', 'magic', 'support', 'hybrid', 'summon']) {
  KIND_SKILL_LIST[k] = Object.values(SKILLS).filter(s => s.kinds.includes(k)).sort((a, b) => a.lvl - b.lvl).map(s => s.id);
}
const BOOK_SKILLS = Object.values(SKILLS).filter(s => s.kinds.includes('book')).map(s => s.id);

// ---------- Materials ----------
const MATERIALS = {
  bone: { name: 'Bone Shard', glyph: '🦴', tier: 0 }, ear: { name: 'Goblin Ear', glyph: '👂', tier: 0 }, gel: { name: 'Slime Gel', glyph: '🟢', tier: 0 },
  crystal: { name: 'Crystal Shard', glyph: '💎', tier: 1 }, venom: { name: 'Venom Sac', glyph: '🧪', tier: 1 }, spore: { name: 'Spore Cap', glyph: '🍄', tier: 1 },
  ember: { name: 'Ember Core', glyph: '🔥', tier: 2 }, frost: { name: 'Frost Fang', glyph: '❄️', tier: 2 }, dust: { name: 'Spirit Dust', glyph: '✨', tier: 1 },
  scrap: { name: 'Scrap Metal', glyph: '⚙️', tier: 2 }, cog: { name: 'Gear Cog', glyph: '🔩', tier: 3 }, scale: { name: 'Dragon Scale', glyph: '🐉', tier: 4 },
  cloth: { name: 'Cursed Cloth', glyph: '🧵', tier: 2 }, ore: { name: 'Iron Ore', glyph: '⛏️', tier: 0 }, herb: { name: 'Healing Herb', glyph: '🌿', tier: 0 },
  gem: { name: 'Raw Gem', glyph: '💠', tier: 3 }, ichor: { name: 'Ancient Ichor', glyph: '🩸', tier: 4 },
};

// ---------- Consumables ----------
const CONSUMABLES = {
  antidote: { name: 'Antidote', glyph: '💧', price: 14, use: 'both', desc: 'Cures poison, bleeding and burning.' },
  bandage: { name: 'Bandage', glyph: '🩹', price: 12, use: 'both', desc: 'Heal 20% HP and stop bleeding.' },
  mana_potion: { name: 'Energy Draught', glyph: '🔷', price: 18, use: 'both', desc: 'Restore 60% of your energy.' },
  fire_bomb: { name: 'Fire Bomb', glyph: '💣', price: 22, use: 'combat', desc: 'Burn and damage every enemy.' },
  poison_flask: { name: 'Poison Flask', glyph: '☠️', price: 20, use: 'combat', desc: 'Poison every enemy.' },
  smoke_bomb: { name: 'Smoke Bomb', glyph: '🌫️', price: 26, use: 'combat', desc: 'Stun every enemy for a turn.' },
  haste_draught: { name: 'Haste Draught', glyph: '⚡', price: 28, use: 'combat', desc: 'Gain 1 AP now.' },
  escape_scroll: { name: 'Escape Scroll', glyph: '📜', price: 45, use: 'both', desc: 'Flee the dungeon at once, keeping your loot.' },
  identify_scroll: { name: 'Identify Scroll', glyph: '🔍', price: 30, use: 'map', desc: 'Reveal an Unknown relic and its curse.' },
  strength_elixir: { name: 'Strength Elixir', glyph: '💪', price: 40, use: 'both', desc: '+25% damage for the rest of the dungeon.' },
  ward_scroll: { name: 'Ward Scroll', glyph: '🛡️', price: 40, use: 'both', desc: 'Take 15% less damage for the rest of the dungeon.' },
};
for (const id of BOOK_SKILLS) CONSUMABLES['book_' + id] = { name: 'Tome: ' + SKILLS[id].name, glyph: '📘', price: 120, use: 'map', book: id, desc: 'Teach yourself ' + SKILLS[id].name + '.' };

// ---------- Equipment bases ----------
const SLOTS = ['weapon', 'offhand', 'head', 'chest', 'hands', 'feet', 'ring', 'amulet'];
const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Off-hand', head: 'Head', chest: 'Chest', hands: 'Hands', feet: 'Feet', ring: 'Ring', amulet: 'Amulet' };
const SLOT_WEIGHT = { weapon: 18, offhand: 12, head: 12, chest: 14, hands: 12, feet: 12, ring: 10, amulet: 10 };
const BASES = {
  weapon: [
    { n: 'Iron Sword', atk: 3 }, { n: 'War Hammer', atk: 4, crit: -0.02 }, { n: 'Short Bow', atk: 3, crit: 0.03 }, { n: 'Dagger', atk: 2, crit: 0.06 },
    { n: 'Oak Staff', atk: 2, en: 3 }, { n: 'Mace', atk: 2, en: 2 }, { n: 'Rune Blade', atk: 3 }, { n: 'Bone Wand', atk: 2, en: 3 },
    { n: 'Spear', atk: 4 }, { n: 'Hand Axe', atk: 4, crit: -0.02 }, { n: 'Greatsword', atk: 5, crit: -0.03 }, { n: 'Whip', atk: 3, crit: 0.04 },
    { n: 'Grimoire', atk: 1, en: 5 }, { n: 'Claws', atk: 3, crit: 0.05 }, { n: 'Crossbow', atk: 4, crit: 0.02 },
  ],
  offhand: [
    { n: 'Wooden Shield', def: 2 }, { n: 'Buckler', def: 1, evade: 0.03 }, { n: 'Tower Shield', def: 4, evade: -0.04 }, { n: 'Spell Focus', atk: 1, en: 3 },
    { n: 'Parrying Dagger', atk: 1, crit: 0.04 }, { n: 'Orb', en: 4 }, { n: 'Quiver', atk: 1, crit: 0.03 },
  ],
  head: [{ n: 'Leather Cap', def: 1 }, { n: 'Iron Helm', def: 2, evade: -0.01 }, { n: 'Hood', def: 1, evade: 0.02 }, { n: 'Circlet', def: 0, en: 3 }, { n: 'Horned Helm', def: 2, crit: 0.01 }],
  chest: [{ n: 'Padded Vest', def: 2 }, { n: 'Leather Armor', def: 3 }, { n: 'Chain Shirt', def: 4, evade: -0.02 }, { n: 'Cloth Robe', def: 1, en: 3 }, { n: 'Plate Cuirass', def: 6, evade: -0.06 }, { n: 'Scale Mail', def: 5, evade: -0.04 }],
  hands: [{ n: 'Cloth Gloves', def: 0, crit: 0.02 }, { n: 'Leather Gloves', def: 1, crit: 0.01 }, { n: 'Gauntlets', def: 2 }, { n: 'Archer\'s Bracers', def: 1, crit: 0.03 }, { n: 'Spiked Knuckles', def: 1, atk: 1 }],
  feet: [{ n: 'Sandals', def: 0, evade: 0.03 }, { n: 'Leather Boots', def: 1, evade: 0.02 }, { n: 'Greaves', def: 2, evade: -0.01 }, { n: 'Swift Boots', def: 1, evade: 0.04 }],
  ring: [{ n: 'Ring' }, { n: 'Band' }, { n: 'Signet' }],
  amulet: [{ n: 'Amulet', en: 2 }, { n: 'Pendant', en: 1 }, { n: 'Talisman', en: 3 }],
};
const START_WEAPON = { melee: 0, tank: 1, ranged: 2, rogue: 3, magic: 4, support: 5, hybrid: 6, summon: 7 };
const AFFIXES = {
  flames: { name: 'of Flames', desc: '30% to burn on hit' },
  venom: { name: 'of Venom', desc: '30% to poison on hit' },
  frost: { name: 'of Frost', desc: '25% to chill on hit' },
  leech: { name: 'of the Leech', desc: 'heal 8% of damage' },
  swiftness: { name: 'of Swiftness', desc: '+1 energy regen' },
  precision: { name: 'of Precision', desc: '+10% crit' },
  brutal: { name: 'of Brutality', desc: '+20% crit damage' },
  guardian: { name: 'of the Guardian', desc: '+2 defense' },
  thorns: { name: 'of Thorns', desc: 'reflect 15% of damage taken' },
  vitality: { name: 'of Vitality', desc: '+10% max HP' },
  focus: { name: 'of Focus', desc: '+3 max energy' },
  fortune: { name: 'of Fortune', desc: '+1 Luck' },
  echoes: { name: 'of Echoes', desc: '15% to repeat a hit at half power' },
  bloodthirst: { name: 'of Bloodthirst', desc: 'heal 3% HP on each kill' },
};

// ---------- Monsters ----------
const MONSTERS = {};
function mon(key, name, glyph, hp, atk, def, xp, gold, intents, drops, extra) {
  MONSTERS[key] = Object.assign({ key, name, glyph, hp, atk, def, xp, gold, intents, drops }, extra || {});
}
// catacombs
mon('skeleton', 'Skeleton', '💀', 22, 6, 3, 11, [3, 7], { attack: 60, heavy: 25, guard: 15 }, ['bone']);
mon('bat', 'Cave Bat', '🦇', 9, 4, 0, 6, [1, 3], { flurry: 70, attack: 30 }, ['bone']);
mon('wraith', 'Wraith', '👻', 18, 7, 0, 12, [3, 8], { attack: 50, venom: 50 }, ['dust']);
mon('zombie', 'Rotting Zombie', '🧟', 30, 5, 2, 12, [2, 6], { attack: 50, heavy: 30, bleed: 20 }, ['bone', 'cloth']);
mon('ghoul', 'Ghoul', '🧛', 20, 6, 1, 12, [3, 7], { attack: 40, drain: 40, bleed: 20 }, ['bone', 'dust']);
mon('acolyte', 'Bone Acolyte', '🧙', 16, 5, 1, 13, [4, 9], { attack: 30, curse: 30, summon: 40 }, ['cloth', 'dust'], { summons: 'skeleton' });
// warrens
mon('goblin', 'Goblin', '👺', 18, 5, 1, 9, [3, 7], { attack: 70, heavy: 15, guard: 15 }, ['ear']);
mon('archer', 'Goblin Archer', '🏹', 14, 7, 0, 10, [3, 8], { attack: 50, venom: 30, guard: 20 }, ['ear']);
mon('rat', 'Giant Rat', '🐀', 11, 4, 0, 6, [1, 4], { flurry: 60, attack: 40 }, ['ear']);
mon('gshaman', 'Goblin Shaman', '🔮', 15, 5, 0, 12, [4, 9], { curse: 30, burn: 30, summon: 40 }, ['ear', 'cloth'], { summons: 'goblin' });
mon('hobgoblin', 'Hobgoblin', '👹', 28, 7, 3, 13, [4, 9], { attack: 40, heavy: 30, shield: 30 }, ['ear', 'ore']);
mon('warg', 'Warg', '🐺', 20, 6, 1, 11, [2, 6], { flurry: 40, bleed: 30, attack: 30 }, ['ear']);
// crystal
mon('crawler', 'Crystal Crawler', '🕷️', 20, 5, 4, 10, [3, 7], { attack: 50, guard: 50 }, ['crystal']);
mon('cbat', 'Crystal Bat', '🦇', 12, 5, 1, 8, [2, 5], { flurry: 60, attack: 40 }, ['crystal']);
mon('gemslime', 'Gem Slime', '🟣', 26, 4, 1, 10, [3, 7], { attack: 60, shield: 40 }, ['gel', 'crystal']);
mon('shardgolem', 'Shard Golem', '🗿', 34, 7, 6, 14, [4, 9], { heavy: 40, guard: 40, attack: 20 }, ['crystal', 'ore']);
mon('sprite', 'Crystal Sprite', '🧚', 13, 6, 0, 11, [3, 7], { burn: 40, attack: 40, curse: 20 }, ['crystal', 'dust']);
// sunken
mon('drowned', 'Drowned One', '🧟', 22, 6, 1, 11, [3, 7], { attack: 60, venom: 40 }, ['gel', 'cloth']);
mon('ooze', 'Slime', '🦠', 24, 3, 0, 8, [2, 5], { attack: 70, guard: 30 }, ['gel']);
mon('eel', 'Electric Eel', '🐍', 15, 6, 0, 10, [2, 6], { flurry: 50, burn: 30, attack: 20 }, ['gel']);
mon('siren', 'Siren', '🧜', 17, 5, 0, 13, [4, 9], { curse: 40, drain: 30, attack: 30 }, ['dust', 'cloth']);
mon('crab', 'Temple Crab', '🦀', 26, 6, 6, 11, [3, 7], { attack: 40, heavy: 30, guard: 30 }, ['gel', 'ore']);
// fungal
mon('sporewalker', 'Spore Walker', '🍄', 22, 5, 1, 12, [3, 8], { attack: 40, venom: 40, curse: 20 }, ['spore']);
mon('shroomer', 'Mushroom Brute', '🍄', 32, 7, 2, 14, [4, 9], { heavy: 50, attack: 40, guard: 10 }, ['spore', 'herb']);
mon('cavespider', 'Cave Spider', '🕷️', 16, 6, 0, 11, [3, 7], { venom: 40, bleed: 30, flurry: 30 }, ['venom']);
mon('moldslime', 'Mold Slime', '🟤', 28, 4, 1, 11, [3, 7], { drain: 50, attack: 30, guard: 20 }, ['spore', 'gel']);
mon('sporeling', 'Sporeling Swarm', '🌱', 12, 4, 0, 8, [1, 4], { flurry: 80, attack: 20 }, ['spore', 'herb']);
// ember
mon('imp', 'Fire Imp', '😈', 14, 6, 0, 11, [3, 7], { burn: 50, flurry: 30, attack: 20 }, ['ember']);
mon('magmaslime', 'Magma Slime', '🔴', 28, 5, 2, 12, [3, 8], { attack: 50, burn: 30, shield: 20 }, ['ember', 'gel']);
mon('cinderknight', 'Cinder Knight', '⚔️', 30, 8, 5, 15, [5, 10], { heavy: 40, shield: 30, attack: 30 }, ['ember', 'scrap']);
mon('salamander', 'Salamander', '🦎', 20, 7, 1, 13, [3, 8], { burn: 40, flurry: 30, attack: 30 }, ['ember', 'scale']);
mon('forgegolem', 'Forge Golem', '🤖', 38, 8, 7, 16, [5, 10], { heavy: 50, guard: 30, stagger: 20 }, ['scrap', 'ember', 'ore']);
// frozen
mon('frostwolf', 'Frost Wolf', '🐺', 20, 6, 1, 12, [3, 7], { flurry: 50, bleed: 30, attack: 20 }, ['frost']);
mon('icewraith', 'Ice Wraith', '👻', 18, 7, 0, 13, [4, 8], { curse: 40, attack: 40, venom: 20 }, ['frost', 'dust']);
mon('yeti', 'Yeti', '🦍', 36, 8, 2, 15, [4, 10], { heavy: 50, attack: 30, stagger: 20 }, ['frost', 'cloth']);
mon('snowarcher', 'Snow Archer', '🏹', 15, 8, 0, 12, [4, 8], { attack: 50, bleed: 30, guard: 20 }, ['frost', 'ear']);
mon('frozenknight', 'Frozen Knight', '🥶', 32, 7, 6, 15, [5, 10], { heavy: 40, shield: 30, attack: 30 }, ['frost', 'scrap']);
// fortress
mon('cursedknight', 'Cursed Knight', '🛡️', 30, 8, 5, 15, [5, 10], { heavy: 40, curse: 30, attack: 30 }, ['cloth', 'scrap']);
mon('banshee', 'Banshee', '😱', 16, 7, 0, 14, [4, 9], { curse: 50, drain: 30, attack: 20 }, ['dust', 'cloth']);
mon('gargoyle', 'Gargoyle', '🦇', 30, 8, 7, 14, [4, 9], { guard: 40, heavy: 40, attack: 20 }, ['ore', 'scrap']);
mon('dreadhound', 'Dread Hound', '🐕', 22, 8, 1, 14, [4, 9], { flurry: 40, bleed: 40, attack: 20 }, ['cloth', 'bone']);
mon('warlock', 'Dark Warlock', '🧙‍♂️', 18, 7, 0, 16, [5, 11], { burn: 30, curse: 30, summon: 40 }, ['cloth', 'ember'], { summons: 'imp' });
// machine
mon('scrapbot', 'Scrap Bot', '🤖', 22, 6, 4, 12, [3, 8], { attack: 50, guard: 30, stagger: 20 }, ['scrap']);
mon('turret', 'Sentry Turret', '🔫', 18, 9, 3, 13, [4, 9], { heavy: 40, burn: 30, attack: 30 }, ['scrap', 'cog']);
mon('nanoswarm', 'Nano Swarm', '🪲', 14, 5, 1, 11, [3, 7], { flurry: 70, drain: 30 }, ['cog']);
mon('arcdrone', 'Arc Drone', '🛸', 16, 7, 1, 13, [4, 9], { burn: 50, flurry: 30, attack: 20 }, ['cog', 'scrap']);
mon('automaton', 'War Automaton', '🦾', 40, 9, 7, 17, [5, 11], { heavy: 50, shield: 30, stagger: 20 }, ['cog', 'scrap', 'ore']);
// graveyard
mon('drakewhelp', 'Bone Drake Whelp', '🐲', 26, 7, 3, 14, [4, 10], { burn: 40, attack: 40, heavy: 20 }, ['bone', 'scale']);
mon('wyvernbones', 'Wyvern Skeleton', '🦖', 32, 8, 4, 15, [5, 10], { flurry: 30, heavy: 40, venom: 30 }, ['bone', 'scale']);
mon('cultist', 'Dragon Cultist', '🧑‍🎤', 18, 7, 1, 14, [5, 10], { curse: 30, burn: 40, summon: 30 }, ['cloth', 'ichor'], { summons: 'drakewhelp' });
mon('wyrmling', 'Ancient Wyrmling', '🐉', 40, 9, 5, 18, [6, 12], { heavy: 40, burn: 30, attack: 30 }, ['scale', 'ichor']);
mon('dragonknight', 'Skeletal Dragon Knight', '☠️', 36, 9, 7, 18, [6, 12], { heavy: 40, shield: 30, bleed: 30 }, ['bone', 'scale', 'gem']);

// ---------- Themes and bosses ----------
const THEMES = [
  { id: 'catacombs', name: 'Forgotten Catacombs', rankMin: 0, pool: ['skeleton', 'bat', 'wraith', 'zombie', 'ghoul', 'acolyte'], mat: ['bone', 'dust', 'cloth'],
    boss: { key: 'bonewarden', name: 'Bone Warden', glyph: '☠️', hp: 85, atk: 9, def: 4, intents: { attack: 40, heavy: 30, guard: 15, summon: 15 }, summons: 'skeleton',
      phases: [{ at: 0.66, say: 'The Warden rattles, bones knit across the floor.', summon: 'skeleton', count: 1 }, { at: 0.33, say: 'The Warden roars and its eyes blaze.', atkMul: 1.3, addIntents: { slam: 30 } }] } },
  { id: 'warrens', name: 'Goblin Warrens', rankMin: 0, pool: ['goblin', 'archer', 'rat', 'gshaman', 'hobgoblin', 'warg'], mat: ['ear', 'ore'],
    boss: { key: 'chieftain', name: 'Goblin Chieftain', glyph: '👹', hp: 80, atk: 10, def: 3, intents: { attack: 45, heavy: 30, guard: 10, summon: 15 }, summons: 'goblin',
      phases: [{ at: 0.66, say: 'The Chieftain bellows for reinforcements!', summon: 'goblin', count: 2 }, { at: 0.33, say: 'The Chieftain goes berserk.', atkMul: 1.35, addIntents: { slam: 30 } }] } },
  { id: 'crystal', name: 'Crystal Caverns', rankMin: 0, pool: ['crawler', 'cbat', 'gemslime', 'shardgolem', 'sprite'], mat: ['crystal', 'gel'],
    boss: { key: 'crystalgolem', name: 'Crystal Golem', glyph: '🗿', hp: 100, atk: 8, def: 7, intents: { attack: 35, heavy: 35, guard: 15, shield: 15 }, phases: [{ at: 0.66, say: 'Crystals grow across the Golem.', shield: 0.2 }, { at: 0.33, say: 'The Golem cracks and rages.', atkMul: 1.3, addIntents: { slam: 30 } }] } },
  { id: 'sunken', name: 'Sunken Temple', rankMin: 0, pool: ['drowned', 'ooze', 'eel', 'siren', 'crab'], mat: ['gel', 'cloth', 'dust'],
    boss: { key: 'priest', name: 'Drowned Priest', glyph: '🐙', hp: 85, atk: 9, def: 3, intents: { attack: 30, venom: 30, heavy: 20, curse: 20 }, phases: [{ at: 0.66, say: 'The Priest chants. Water rises.', summon: 'drowned', count: 1 }, { at: 0.33, say: 'The Priest howls a drowning curse.', atkMul: 1.3, addIntents: { slam: 25, drain: 20 } }] } },
  { id: 'fungal', name: 'Fungal Depths', rankMin: 1, pool: ['sporewalker', 'shroomer', 'cavespider', 'moldslime', 'sporeling'], mat: ['spore', 'herb', 'venom'],
    boss: { key: 'mycelium', name: 'Mycelium Mother', glyph: '🍄', hp: 95, atk: 9, def: 3, intents: { attack: 30, venom: 30, drain: 20, summon: 20 }, summons: 'sporeling', phases: [{ at: 0.66, say: 'Spores burst across the cavern.', summon: 'sporeling', count: 2 }, { at: 0.33, say: 'The Mother thrashes in agony.', atkMul: 1.3, addIntents: { slam: 30 } }] } },
  { id: 'forge', name: 'Ember Forge', rankMin: 2, pool: ['imp', 'magmaslime', 'cinderknight', 'salamander', 'forgegolem'], mat: ['ember', 'scrap', 'ore'],
    boss: { key: 'forgemaster', name: 'Forge Overlord', glyph: '🌋', hp: 110, atk: 11, def: 6, intents: { attack: 30, heavy: 30, burn: 25, shield: 15 }, phases: [{ at: 0.66, say: 'The forge flares white-hot.', shield: 0.15, atkMul: 1.15 }, { at: 0.33, say: 'The Overlord overheats and burns everything.', atkMul: 1.3, addIntents: { slam: 30, burn: 20 } }] } },
  { id: 'frozen', name: 'Frozen Citadel', rankMin: 2, pool: ['frostwolf', 'icewraith', 'yeti', 'snowarcher', 'frozenknight'], mat: ['frost', 'cloth', 'scrap'],
    boss: { key: 'frostqueen', name: 'Frost Queen', glyph: '👸', hp: 105, atk: 10, def: 5, intents: { attack: 30, curse: 25, heavy: 25, shield: 20 }, phases: [{ at: 0.66, say: 'The Queen summons a blizzard.', summon: 'frostwolf', count: 2 }, { at: 0.33, say: 'The Queen shatters her own armor.', atkMul: 1.35, addIntents: { slam: 30 } }] } },
  { id: 'fortress', name: 'Haunted Fortress', rankMin: 2, pool: ['cursedknight', 'banshee', 'gargoyle', 'dreadhound', 'warlock'], mat: ['cloth', 'scrap', 'dust'],
    boss: { key: 'deathlord', name: 'Revenant Lord', glyph: '🧟‍♂️', hp: 115, atk: 11, def: 6, intents: { attack: 30, heavy: 30, curse: 20, drain: 20 }, summons: 'cursedknight', phases: [{ at: 0.66, say: 'The Lord raises a fallen knight.', summon: 'cursedknight', count: 1 }, { at: 0.33, say: 'The Lord\'s curse deepens.', atkMul: 1.3, addIntents: { slam: 30, curse: 20 } }] } },
  { id: 'machine', name: 'Ancient Machine Complex', rankMin: 3, pool: ['scrapbot', 'turret', 'nanoswarm', 'arcdrone', 'automaton'], mat: ['scrap', 'cog', 'ore'],
    boss: { key: 'overseer', name: 'The Overseer', glyph: '👁️', hp: 125, atk: 12, def: 8, intents: { attack: 25, heavy: 30, burn: 20, stagger: 15, shield: 10 }, summons: 'scrapbot', phases: [{ at: 0.66, say: 'The Overseer deploys defense drones.', summon: 'arcdrone', count: 2 }, { at: 0.33, say: 'The Overseer overclocks.', atkMul: 1.35, addIntents: { slam: 30 } }] } },
  { id: 'graveyard', name: 'Dragon\'s Graveyard', rankMin: 4, pool: ['drakewhelp', 'wyvernbones', 'cultist', 'wyrmling', 'dragonknight'], mat: ['scale', 'bone', 'ichor', 'gem'],
    boss: { key: 'dracolich', name: 'Dracolich', glyph: '🐉', hp: 140, atk: 13, def: 8, intents: { attack: 25, heavy: 30, burn: 25, curse: 20 }, summons: 'drakewhelp', phases: [{ at: 0.66, say: 'The Dracolich raises its dead brood.', summon: 'drakewhelp', count: 2 }, { at: 0.33, say: 'The Dracolich ignites its bones.', atkMul: 1.4, addIntents: { slam: 35, burn: 20 } }] } },
];

// ---------- Anomalies ----------
const ANOMALIES = {
  mana_drought: { name: 'Mana Drought', icon: '🌑', desc: 'Energy regenerates 2 slower each turn.' },
  weak_healing: { name: 'Withering Air', icon: '🥀', desc: 'All healing is halved.' },
  bloodmoon: { name: 'Blood Moon', icon: '🌕', desc: 'Enemies hit 15% harder but give 30% more XP and gold.' },
  fortune_surge: { name: 'Fortune Surge', icon: '🍀', desc: 'Loot rarity is much better, enemies have 10% more HP.' },
  rising_dread: { name: 'Rising Dread', icon: '😰', desc: 'Enemies grow stronger faster with every room.' },
  toxic_air: { name: 'Toxic Air', icon: '☣️', desc: 'You lose 4% max HP after every room.' },
  treasure_rift: { name: 'Treasure Rift', icon: '💰', desc: 'Chests hold more gold and never roll Common gear.' },
  silence: { name: 'Silence', icon: '🤫', desc: 'Every skill costs 1 more energy.' },
  fog: { name: 'Thick Fog', icon: '🌫️', desc: 'Room types are hidden until you enter, unless you are a scout or very lucky.' },
};

// ---------- Injuries ----------
const INJURIES = {
  broken_arm: { name: 'Broken Arm', icon: '🦴', desc: '-15% damage.', cost: 60 },
  concussion: { name: 'Concussion', icon: '💫', desc: '-20% max energy.', cost: 50 },
  deep_wound: { name: 'Deep Wound', icon: '🩸', desc: '-15% max HP.', cost: 70 },
  shaken: { name: 'Shaken Nerves', icon: '😨', desc: 'You start every fight with 1 less AP.', cost: 80 },
  cursed_mark: { name: 'Cursed Mark', icon: '☠️', desc: '-2 Luck.', cost: 90 },
};

// ---------- Companions ----------
const COMPANIONS = {
  squire: { name: 'Squire', glyph: '🛡️', cost: 120, desc: 'Strikes the weakest enemy for 50% of your power each turn.' },
  cleric: { name: 'Cleric', glyph: '⛪', cost: 150, desc: 'Heals you for 8% max HP every turn.' },
  hound: { name: 'War Hound', glyph: '🐕', cost: 110, desc: 'Bites for 35% power and makes enemies bleed.' },
  mage: { name: 'Hedge Mage', glyph: '🧙', cost: 180, desc: 'Hits every enemy for 25% of your power.' },
  scout: { name: 'Scout', glyph: '🏹', cost: 130, desc: 'Shoots for 45% power with a chance to crit, and spots secrets.' },
};

// ---------- Alchemy recipes ----------
const RECIPES = [
  { id: 'r_bandage', name: 'Bandage', out: { bandage: 2 }, inputs: { herb: 2, cloth: 1 }, gold: 8 },
  { id: 'r_antidote', name: 'Antidote', out: { antidote: 2 }, inputs: { herb: 1, venom: 1 }, gold: 10 },
  { id: 'r_mana', name: 'Energy Draught', out: { mana_potion: 1 }, inputs: { dust: 2, herb: 1 }, gold: 14 },
  { id: 'r_fire', name: 'Fire Bomb', out: { fire_bomb: 2 }, inputs: { ember: 1, scrap: 1 }, gold: 16 },
  { id: 'r_poison', name: 'Poison Flask', out: { poison_flask: 2 }, inputs: { venom: 2, gel: 1 }, gold: 14 },
  { id: 'r_smoke', name: 'Smoke Bomb', out: { smoke_bomb: 2 }, inputs: { spore: 2, cloth: 1 }, gold: 16 },
  { id: 'r_haste', name: 'Haste Draught', out: { haste_draught: 1 }, inputs: { crystal: 2, herb: 1 }, gold: 20 },
  { id: 'r_strength', name: 'Strength Elixir', out: { strength_elixir: 1 }, inputs: { scale: 1, herb: 2 }, gold: 30 },
  { id: 'r_ward', name: 'Ward Scroll', out: { ward_scroll: 1 }, inputs: { dust: 2, cloth: 2 }, gold: 30 },
  { id: 'r_escape', name: 'Escape Scroll', out: { escape_scroll: 1 }, inputs: { dust: 3, frost: 1 }, gold: 30 },
  { id: 'r_identify', name: 'Identify Scroll', out: { identify_scroll: 2 }, inputs: { dust: 1, crystal: 1 }, gold: 20 },
];

// ---------- Mission types ----------
const MISSION_TYPES = {
  clear: { name: 'Dungeon Clear', icon: '⚔️', weight: 30, mult: 1.0 },
  hunt: { name: 'Monster Hunt', icon: '🎯', weight: 20, mult: 0.9 },
  gather: { name: 'Resource Gathering', icon: '⛏️', weight: 15, mult: 0.8 },
  explore: { name: 'Exploration', icon: '🧭', weight: 15, mult: 0.85 },
  rescue: { name: 'Rescue', icon: '🆘', weight: 10, mult: 1.2 },
  relic: { name: 'Relic Recovery', icon: '🏺', weight: 10, mult: 1.25 },
  bounty: { name: 'Bounty', icon: '🗡️', weight: 12, mult: 1.35 },
  cull: { name: 'Extermination', icon: '🪓', weight: 10, mult: 0.95 },
};
// Fighters in a rival party (arena tournaments). Names and counts come from the bracket.
const DUEL_ROLES = {
  duelist: { key: 'duelist', name: 'Duelist', glyph: '🤺', hp: 24, atk: 6.5, def: 3, xp: 12, gold: [6, 12], intents: { attack: 50, heavy: 25, guard: 25 }, drops: [] },
  archer: { key: 'archer', name: 'Archer', glyph: '🏹', hp: 16, atk: 7, def: 1, xp: 12, gold: [6, 12], intents: { flurry: 50, attack: 50 }, drops: [] },
  mage: { key: 'mage', name: 'Battle Mage', glyph: '🧙', hp: 15, atk: 7, def: 1, xp: 13, gold: [6, 12], intents: { burn: 40, curse: 25, attack: 35 }, drops: [] },
  knight: { key: 'knight', name: 'Shieldbearer', glyph: '🛡️', hp: 30, atk: 5.5, def: 5, xp: 12, gold: [6, 12], intents: { attack: 40, guard: 30, stagger: 30 }, drops: [] },
  cleric: { key: 'cleric', name: 'Cleric', glyph: '✝️', hp: 18, atk: 5, def: 2, xp: 11, gold: [6, 12], intents: { attack: 40, shield: 40, curse: 20 }, drops: [] },
  berserker: { key: 'berserker', name: 'Berserker', glyph: '🪓', hp: 28, atk: 8, def: 2, xp: 13, gold: [6, 12], intents: { heavy: 40, slam: 30, attack: 30 }, drops: [] },
};
const OPTIONALS = {
  nopotion: { label: 'Use no healing potions', bonus: 0.4 },
  elite: { label: 'Defeat an elite enemy', bonus: 0.35 },
  secret: { label: 'Discover a secret chamber', bonus: 0.5 },
};
const RELIC_NAMES = ['Sunken Crown', 'Weeping Idol', 'Obsidian Compass', 'Warden\'s Seal', 'Ashen Chalice', 'Lost Grimoire', 'Star-Iron Key'];
const REP_TITLES = [[0, 'Unknown'], [10, 'Trusted'], [30, 'Respected'], [70, 'Renowned'], [140, 'Famed'], [260, 'Legendary']];
const CAMP_LORE = [
  'A torn journal: "We heard something moving behind the wall..."',
  'A cold campfire and a half-eaten ration. The expedition left in a hurry.',
  'Scratched into a crate: "DO NOT GO DEEPER. It is not a dungeon."',
  'A map with the dungeon circled twice. Someone wrote "older than the Guild".',
  'A Guild badge, rank D, left on a bedroll. No body.',
  'A child\'s drawing of a door with no handle. It is pinned to a sword.',
  'Names carved in stone, each crossed out but the last.',
];
const RUMORS = [
  'The tavern keeper whispers: "Anomalies are not random. Something feeds on the dungeons."',
  'A drunk adventurer swears the bosses get angrier when you take the secret rooms.',
  'A scout says: "Fog hides the rooms, but a lucky eye sees through it."',
  'A mercenary mutters: "Never ignore a camp. The lore is half the loot."',
];

// ---------- Random events ----------
// outcome keys: text gold hpPct xp item minRarity relic mats(obj) matsRandom cons(obj) consRandom potions status bless curse fight skillbook skillpt
//               upgrade stat rep companion clue heat goldPct credits chest
// choice: { label, hint, check:{stat,dc}, win, lose, out, cost:{gold,potion,hpPct,goldPct} }
const EVENTS = [
  { id: 'mimic', cat: 'event', title: 'A Suspicious Chest', icon: '🎁', rankMin: 0, weight: 10, text: 'A chest sits in the middle of the room. Too perfectly placed.',
    choices: [
      { label: 'Open it', hint: '50% it is a mimic', out: { rand: [[0.5, { text: 'It was a mimic!', fight: 'elite' }], [0.5, { text: 'It was real. Treasure!', item: true, gold: [10, 25] }]] } },
      { label: 'Inspect first (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'You spot the teeth. You pry loose the real loot beside it.', item: true, minRarity: 1 }, lose: { text: 'You get too close. It bites!', hpPct: -0.1, fight: 'combat' } },
      { label: 'Leave it', out: { text: 'You walk away.' } }] },
  { id: 'injured', cat: 'event', title: 'Injured Adventurer', icon: '🩹', rankMin: 0, weight: 9, text: 'A wounded adventurer slumps against the wall, clutching a bleeding leg.',
    choices: [
      { label: 'Use a bandage or potion', cost: { potion: 1 }, out: { text: 'They thank you and share what they found.', gold: [20, 40], rep: 1, rand: [[0.4, { companion: 'rescued', text: 'They offer to fight alongside you for this dungeon.' }], [0.6, {}]] } },
      { label: 'Give them advice (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'Your advice saves them. They give you a map fragment.', clue: true, rep: 1, gold: [10, 25] }, lose: { text: 'They do not listen.', rep: 0 } },
      { label: 'Rob them', out: { text: 'You take their pack. It feels wrong.', gold: [30, 60], rep: -2 } },
      { label: 'Walk on', out: { text: 'You leave them.' } }] },
  { id: 'fountain', cat: 'event', title: 'Fountain of Whispers', icon: '⛲', rankMin: 0, weight: 8, text: 'A fountain gurgles with glowing water and quiet voices.',
    choices: [
      { label: 'Drink', out: { rand: [[0.3, { text: 'Refreshing! You feel stronger.', hpPct: 0.35 }], [0.2, { text: 'The water burns. Your mind opens.', stat: 1 }], [0.2, { text: 'A sweet blessing settles on you.', bless: true }], [0.3, { text: 'The water was foul.', status: 'poison', hpPct: -0.08 }]] } },
      { label: 'Bottle some', out: { text: 'You fill a vial.', consRandom: true } },
      { label: 'Leave', out: { text: 'You leave the water alone.' } }] },
  { id: 'altar', cat: 'event', title: 'Cursed Altar', icon: '⚰️', rankMin: 1, weight: 7, text: 'A black altar thirsts. Runes ask for an offering.',
    choices: [
      { label: 'Offer blood (-20% HP)', cost: { hpPct: 0.2 }, out: { text: 'The altar drinks. A relic appears.', relic: true } },
      { label: 'Offer gold (30%)', cost: { goldPct: 0.3 }, out: { text: 'The altar accepts. A blessing follows.', bless: true, xp: 20 } },
      { label: 'Desecrate it', out: { text: 'The altar screams. Guardians wake!', curse: true, fight: 'elite', gold: [30, 60] } },
      { label: 'Leave', out: { text: 'You back away.' } }] },
  { id: 'corpse', cat: 'event', title: 'Fallen Expedition', icon: '💀', rankMin: 0, weight: 9, text: 'The remains of an adventuring party lie scattered across the floor.',
    choices: [
      { label: 'Loot the bodies', out: { rand: [[0.75, { text: 'You find usable gear.', item: true, gold: [10, 30] }], [0.25, { text: 'The bodies were trapped with poison!', status: 'poison', hpPct: -0.1, gold: [10, 20] }]] } },
      { label: 'Read their journal (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'The journal hints at a secret nearby.', clue: true, revealSecret: true, rep: 1 }, lose: { text: 'The ink has run. You learn nothing.' } },
      { label: 'Bury them', out: { text: 'A quiet blessing settles on you.', bless: true, rep: 1 } }] },
  { id: 'library', cat: 'puzzle', title: 'Ancient Library', icon: '📚', rankMin: 1, weight: 7, text: 'Dust-choked shelves hold books in forgotten tongues.',
    choices: [
      { label: 'Study (INT)', check: { stat: 'INT', dc: 1 }, win: { text: 'Insight dawns. You gain a skill point.', skillpt: 1, xp: 30 }, lose: { text: 'A ward zaps you.', hpPct: -0.08 } },
      { label: 'Search the shelves', out: { rand: [[0.4, { text: 'A loose tome falls out.', skillbook: true }], [0.6, { text: 'You find scrolls.', consRandom: true }]] } },
      { label: 'Leave', out: { text: 'You leave the books.' } }] },
  { id: 'forge', cat: 'event', title: 'Abandoned Forge', icon: '⚒️', rankMin: 1, weight: 6, text: 'The anvil is still warm. Tools hang from the walls.',
    choices: [
      { label: 'Reforge your weapon (STR)', check: { stat: 'STR', dc: 0 }, win: { text: 'The metal sings. Your weapon is stronger.', upgrade: true }, lose: { text: 'You botch it and burn your hand.', hpPct: -0.06 } },
      { label: 'Scavenge', out: { text: 'You gather useful scraps.', matsRandom: 3 } },
      { label: 'Leave', out: { text: 'You leave the forge.' } }] },
  { id: 'gambler', cat: 'event', title: 'Gambling Spirit', icon: '🎲', rankMin: 0, weight: 6, text: 'A translucent figure rattles bone dice. "Care to wager?"',
    choices: [
      { label: 'Wager 20% of your gold', cost: { goldPct: 0.2 }, out: { rand: [[0.45, { text: 'You win! The spirit pays double.', payout: 2 }], [0.55, { text: 'You lose it all.' }]] }, luckWeighted: true },
      { label: 'Wager 50% of your gold', cost: { goldPct: 0.5 }, out: { rand: [[0.4, { text: 'Jackpot! Triple payout.', payout: 3 }], [0.6, { text: 'The spirit cackles.' }]] }, luckWeighted: true },
      { label: 'Refuse', out: { text: 'The spirit shrugs and fades.' } }] },
  { id: 'ambush', cat: 'event', title: 'Shadows Move', icon: '🌑', rankMin: 0, weight: 7, text: 'The torchlight bends. Something is stalking you.',
    choices: [
      { label: 'Fight', out: { text: 'They spring!', fight: 'ambush' } },
      { label: 'Slip away (AGI)', check: { stat: 'AGI', dc: 0 }, win: { text: 'You vanish into the dark and find their stash.', gold: [20, 40] }, lose: { text: 'They catch you.', fight: 'ambush' } }] },
  { id: 'tunnel', cat: 'trap', title: 'Collapsing Tunnel', icon: '🪨', rankMin: 0, weight: 8, text: 'The ceiling groans. Dust rains down.',
    choices: [
      { label: 'Sprint (AGI)', check: { stat: 'AGI', dc: 0 }, win: { text: 'You dive clear.' }, lose: { text: 'Rocks batter you.', hpPct: -0.14, status: 'bleed' } },
      { label: 'Brace (VIT)', check: { stat: 'VIT', dc: 0 }, win: { text: 'You shrug off the rubble.', hpPct: -0.03 }, lose: { text: 'You are buried.', hpPct: -0.16 } },
      { label: 'Dig through (STR)', check: { stat: 'STR', dc: 1 }, win: { text: 'You clear a path and find ore.', mats: { ore: 2 } }, lose: { text: 'The tunnel caves in.', hpPct: -0.15 } }] },
  { id: 'gas', cat: 'trap', title: 'Poison Gas Vents', icon: '☁️', rankMin: 0, weight: 8, text: 'Green mist hisses from cracks in the floor.',
    choices: [
      { label: 'Disarm (DEX)', check: { stat: 'DEX', dc: 0 }, win: { text: 'The vents seal. You find a hidden compartment.', consRandom: true }, lose: { text: 'You inhale the gas.', status: 'poison', hpPct: -0.08 } },
      { label: 'Hold your breath and run (VIT)', check: { stat: 'VIT', dc: -1 }, win: { text: 'You make it through.' }, lose: { text: 'You choke.', status: 'poison', hpPct: -0.1 } },
      { label: 'Use an antidote first', cost: { cons: 'antidote' }, out: { text: 'Protected, you pass easily.', xp: 10 } }] },
  { id: 'pit', cat: 'trap', title: 'Spiked Pit Corridor', icon: '🕳️', rankMin: 0, weight: 7, text: 'The floor ahead is a lattice of hidden pits.',
    choices: [
      { label: 'Probe with a stick (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'You find a safe path and a lost purse.', gold: [15, 30] }, lose: { text: 'The floor gives way.', hpPct: -0.12, status: 'bleed' } },
      { label: 'Leap across (AGI)', check: { stat: 'AGI', dc: 1 }, win: { text: 'You clear it in a bound.' }, lose: { text: 'You fall onto spikes.', hpPct: -0.18, status: 'bleed' } }] },
  { id: 'runedoor', cat: 'puzzle', title: 'Rune Door', icon: '🚪', rankMin: 0, weight: 8, text: 'A sealed door glows with shifting runes.',
    choices: [
      { label: 'Decipher the runes (INT)', check: { stat: 'INT', dc: 0 }, win: { text: 'The door opens on a vault.', item: true, minRarity: 1 }, lose: { text: 'The runes shock you.', hpPct: -0.09 } },
      { label: 'Feel the flow of magic (WIS)', check: { stat: 'WIS', dc: 0 }, win: { text: 'You find the key rune. Treasure!', item: true, gold: [15, 30] }, lose: { text: 'The runes flare. A guardian wakes.', fight: 'combat' } },
      { label: 'Smash it (STR)', check: { stat: 'STR', dc: 2 }, win: { text: 'The door shatters. Loot inside.', gold: [20, 40], matsRandom: 1 }, lose: { text: 'The noise draws guards.', fight: 'combat' } }] },
  { id: 'statues', cat: 'puzzle', title: 'Whispering Statues', icon: '🗿', rankMin: 1, weight: 6, text: 'Three statues point in different directions. Each murmurs a riddle.',
    choices: [
      { label: 'Answer the riddle (INT)', check: { stat: 'INT', dc: 1 }, win: { text: 'The statues part to reveal a chest.', item: true, minRarity: 1 }, lose: { text: 'The statues wail.', hpPct: -0.08 } },
      { label: 'Follow your gut (LUK)', check: { stat: 'LUK', dc: 0 }, win: { text: 'Fortune smiles. A hidden cache!', gold: [25, 50], consRandom: true }, lose: { text: 'Wrong guess.', hpPct: -0.06 } },
      { label: 'Walk around', out: { text: 'You leave the statues in peace.' } }] },
  { id: 'peddler', cat: 'event', title: 'Shady Peddler', icon: '🧳', rankMin: 0, weight: 6, text: 'A cloaked figure grins. "Relics, friend. Cheap. Maybe cursed."',
    choices: [
      { label: 'Buy an Unknown relic (60g)', cost: { gold: 60 }, out: { text: 'You hand over the coins. The relic hums.', relic: true } },
      { label: 'Haggle (LUK)', check: { stat: 'LUK', dc: 1 }, win: { text: 'He relents and gives you a scroll for free.', consRandom: true }, lose: { text: 'He scowls and vanishes.' } },
      { label: 'Walk on', out: { text: 'You decline.' } }] },
  { id: 'well', cat: 'event', title: 'Wishing Well', icon: '🪙', rankMin: 0, weight: 6, text: 'Coins glint at the bottom of a mossy well.',
    choices: [
      { label: 'Toss a coin (10g)', cost: { gold: 10 }, out: { rand: [[0.25, { text: 'Your wish is heard: your next chest will be better.', chest: true }], [0.25, { text: 'A gust of warmth heals you.', hpPct: 0.25 }], [0.5, { text: 'Nothing happens.' }]] }, luckWeighted: true },
      { label: 'Fish for coins (DEX)', check: { stat: 'DEX', dc: 0 }, win: { text: 'You grab a handful.', gold: [15, 35] }, lose: { text: 'You slip and swallow water.', hpPct: -0.04 } },
      { label: 'Leave', out: { text: 'You leave the well.' } }] },
  { id: 'sleeper', cat: 'event', title: 'Sleeping Beast', icon: '😴', rankMin: 0, weight: 7, text: 'A huge creature sleeps atop a hoard.',
    choices: [
      { label: 'Sneak past it (AGI)', check: { stat: 'AGI', dc: 0 }, win: { text: 'You snatch loot and slip away.', gold: [30, 55], item: true }, lose: { text: 'It wakes up!', fight: 'elite' } },
      { label: 'Strike first', out: { text: 'You strike while it sleeps.', fight: 'elite_sneak' } },
      { label: 'Leave it', out: { text: 'You tiptoe away.' } }] },
  { id: 'nest', cat: 'event', title: 'Monster Nest', icon: '🥚', rankMin: 1, weight: 6, text: 'A pile of leathery eggs, unguarded, for now.',
    choices: [
      { label: 'Steal eggs (DEX)', check: { stat: 'DEX', dc: 0 }, win: { text: 'You take what you can carry.', matsRandom: 3, gold: [10, 25] }, lose: { text: 'The parent returns!', fight: 'elite' } },
      { label: 'Destroy the nest', out: { text: 'The nest burns. Something screams.', fight: 'combat', matsRandom: 2 } },
      { label: 'Leave', out: { text: 'You leave the eggs alone.' } }] },
  { id: 'stranger', cat: 'event', title: 'Mysterious Stranger', icon: '🧙‍♂️', rankMin: 1, weight: 5, text: 'A hooded figure hands you a sealed envelope. "For the Guild."',
    choices: [
      { label: 'Accept it', out: { text: 'He nods and fades. The envelope carries a Guild seal.', credits: 3, rep: 1 } },
      { label: 'Open it (WIS)', check: { stat: 'WIS', dc: 1 }, win: { text: 'Inside is a coded map and a coin purse.', gold: [30, 60], clue: true }, lose: { text: 'The seal burns your fingers.', hpPct: -0.05 } },
      { label: 'Refuse', out: { text: 'He shrugs and disappears.' } }] },
  { id: 'skillshrine', cat: 'event', title: 'Shrine of Skills', icon: '🕯️', rankMin: 1, weight: 5, text: 'Candles burn around an empty stone tome. It wants a gift.',
    choices: [
      { label: 'Offer a potion', cost: { potion: 1 }, out: { text: 'The tome fills with glowing text.', skillbook: true } },
      { label: 'Offer 40 gold', cost: { gold: 40 }, out: { text: 'The tome shivers and glows.', skillpt: 1 } },
      { label: 'Leave', out: { text: 'The candles gutter as you leave.' } }] },
  { id: 'goblinthief', cat: 'event', title: 'Treasure Goblin', icon: '🤑', rankMin: 0, weight: 5, text: 'A little goblin darts past with a sack of gold!',
    choices: [
      { label: 'Chase it (AGI)', check: { stat: 'AGI', dc: 1 }, win: { text: 'You tackle it. The sack bursts open!', gold: [50, 90] }, lose: { text: 'It escapes, laughing.' } },
      { label: 'Throw something (DEX)', check: { stat: 'DEX', dc: 0 }, win: { text: 'A lucky throw. It drops the sack.', gold: [40, 70] }, lose: { text: 'You miss.' } },
      { label: 'Ignore it', out: { text: 'Not worth the effort.' } }] },
  { id: 'shrinecurse', cat: 'event', title: 'Whispering Mirror', icon: '🪞', rankMin: 2, weight: 4, text: 'Your reflection grins and moves on its own.',
    choices: [
      { label: 'Touch the glass', out: { rand: [[0.4, { text: 'The mirror gifts you power.', stat: 1 }], [0.3, { text: 'The mirror curses you.', curse: true }], [0.3, { text: 'Your double steps out!', fight: 'elite' }]] }, luckWeighted: true },
      { label: 'Smash it (STR)', check: { stat: 'STR', dc: 1 }, win: { text: 'Shards fall like silver.', gold: [30, 60], matsRandom: 1 }, lose: { text: 'Glass cuts you.', hpPct: -0.1, status: 'bleed' } },
      { label: 'Look away', out: { text: 'You turn your back.' } }] },
];

const api = { SKILLS, KIND_SKILL_LIST, BOOK_SKILLS, MATERIALS, CONSUMABLES, SLOTS, SLOT_NAMES, SLOT_WEIGHT, BASES, START_WEAPON, AFFIXES, MONSTERS, THEMES, ANOMALIES, INJURIES, COMPANIONS, RECIPES, MISSION_TYPES, DUEL_ROLES, OPTIONALS, RELIC_NAMES, REP_TITLES, CAMP_LORE, RUMORS, EVENTS };
root.DATA = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
