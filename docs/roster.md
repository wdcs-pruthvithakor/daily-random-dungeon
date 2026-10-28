# Daily Random Dungeon: Race and Profession Roster

Target: itch.io (HTML5 build, zipped, `index.html` at the root).
Weights are starting values for balancing. Check them with a 1M-roll simulation.

Rarity tiers: Common (C), Uncommon (U), Rare (R), Epic (E), Legendary (L), Mythic (M), Hidden (H, not rollable), Unique (Q, one per world seed).

## Races

| Race | Tier | Weight | Trait | Affinity professions |
|---|---|---|---|---|
| Human | C | 30 | +1 talent slot, adapts to anything | all common |
| Elf | C | 18 | +INT/DEX, long-lived (slow XP, high mana) | Archer, Mage, Scout, Druid |
| Dwarf | C | 16 | +VIT/STR, resists poison and curses | Guardian, Blacksmith, Runesmith |
| Beastkin | C | 16 | +AGI, keen senses, finds hidden rooms more often | Rogue, Hunter, Brawler, Tamer |
| Halfling | U | 5 | +LUK floor of 3, small target | Rogue, Alchemist, Cook, Bard |
| Orc | U | 5 | +STR, Rage when below 30% HP | Warrior, Berserker, Shaman |
| Gnome | U | 4 | +INT, tinkering bonus | Artificer, Alchemist, Engineer |
| Lizardfolk | U | 3 | Cold-blooded, poison/water affinity | Spearman, Venom Dancer |
| Dragonkin | R | 1.5 | Fire breath, scale armor, slow start | Dragon Knight line, Warrior, Mage |
| Fae | R | 1.2 | Flight in some rooms, weak to iron | Illusionist, Spirit Weaver, Bard |
| Undead-born | R | 1.0 | No natural healing, drain heals | Necromancer, Death Knight line |
| Demonkin | R | 0.8 | Dark affinity, curses cost less | Warlock, Blood Mage |
| Vampire-blooded | E | 0.4 | Blood drain, weak in "light" rooms | Blood Mage, Shadow Swordsman |
| Celestial | H | 0.25 | Holy affinity, resurrection once per run | Paladin line, Saint |
| Construct | H | 0.25 | No mana regen, upgradeable parts | Artificer, Runesmith, Juggernaut |
| Void-touched | H | 0.15 | Unknown-rarity item bonus, unstable | Void Walker, Chronomancer |
| Slime (isekai reincarnate) | L | 0.1 | Starts F-rank weak, absorbs skills from kills | Devourer, Sage |
| Reincarnated Soul | M | 0.05 | Keeps a "past life" talent, one cheat skill | any, plus Hero line |
| Primordial | Q | rare | One per world seed, rewrites a rule | Worldbreaker line |

## Professions by tier

Format: **Name** (races). Role, drawback.

### Common (60% of profession rolls)
- **Swordsman** (all). Balanced melee. No drawback, no spike.
- **Warrior** (Human, Orc, Dwarf). Big hits, high stamina use.
- **Archer** (Elf, Beastkin, Human). Range, weak in melee.
- **Apprentice Mage** (Elf, Human, Gnome). Elemental spells, fragile.
- **Acolyte** (Human, Dwarf, Halfling). Heals and buffs, low damage.
- **Rogue** (Beastkin, Halfling, Human). Crits and stealth, low defense.
- **Guardian** (Dwarf, Human, Orc). Taunt and block, low damage.
- **Scout** (Beastkin, Elf, Halfling). Traps, detection, mapping.
- **Brawler** (Beastkin, Orc, Human). Combos, no gear dependence.

### Uncommon (25%)
- **Spearman** (Lizardfolk, Human, Beastkin). Reach and spacing.
- **Tamer** (Beastkin, Fae, Human). Monster bonds, fights with allies.
- **Alchemist** (Gnome, Halfling, Elf). Potions and bombs, consumable-hungry.
- **Hunter** (Beastkin, Elf, Orc). Tracking, bonus vs beasts.
- **Bard** (Halfling, Fae, Human). Party buffs, rhythm-based skills.
- **Blacksmith** (Dwarf, Orc, Human). Repairs and upgrades gear.
- **Cook** (Halfling, Human). Food buffs, the "isekai chef" build, weak early combat.
- **Shaman** (Orc, Lizardfolk, Beastkin). Totems and spirits.
- **Druid** (Elf, Fae, Beastkin). Shapeshift, nature magic.
- **Monk** (Human, Dwarf, Beastkin). Ki and counters, no weapon.
- **Engineer** (Gnome, Construct, Dwarf). Turrets and gadgets.
- **Berserker** (Orc, Human). Damage up as HP drops, no defense.

### Rare (10%)
- **Spellblade** (Human, Elf, Dragonkin). Mixes melee with spells, juggles mana and stamina.
- **Shadow Dancer** (Beastkin, Elf, Fae). Evasion-crit hybrid, dies to any hit.
- **Paladin** (Human, Dwarf). Holy melee, oath breaks cost power.
- **Necromancer** (Undead-born, Human, Demonkin). Raises dead, needs corpses.
- **Warlock** (Demonkin, Human). Pact powers, HP and soul costs.
- **Illusionist** (Fae, Elf). Confusion and decoys, weak to bosses with true sight.
- **Runesmith** (Dwarf, Gnome, Construct). Rune combinations on gear.
- **Venom Dancer** (Lizardfolk, Beastkin). Poison DoT combos.
- **Beast Lord** (Beastkin, Orc). Large pack of allies, fragile solo.
- **Gambler** (Halfling, Human). Luck-based skills, high variance. Needs LUK to shine.
- **Sage** (Elf, Gnome, Human). Knowledge: reveals hidden and unknown properties.

### Epic (4%)
- **Rune Knight** (Dwarf, Human, Construct). Rune-engraved armor and weapon.
- **Blood Mage** (Vampire-blooded, Demonkin, Human). Spends HP for power.
- **Spirit Weaver** (Fae, Elf). Bound spirits fight alongside you.
- **Death Knight** (Undead-born, Human). Dark melee with life drain.
- **Grand Alchemist** (Gnome, Elf). Transmutes items and materials.
- **Dragoon** (Lizardfolk, Dragonkin). Jump attacks, spear specialist.
- **Treasure Hunter** (Halfling, Beastkin). Strong secret and loot detection, luck-linked.
- **Beastmaster** (Beastkin, Fae). Tames rare and boss-tier monsters.
- **Battle Mage** (Human, Orc, Dwarf). Heavy armor spellcaster, slow.

### Legendary (0.9%)
- **Dragon Knight** (Dragonkin, Human). Dragon bond, slow awakening.
- **Chronomancer** (Void-touched, Fae, Elf). Rewinds turns, weak early.
- **Soul Reaper** (Undead-born, Demonkin, Celestial). Collects kill fragments, spends them on abilities.
- **Archmage** (Elf, Human, Gnome). Many schools of magic, high mana cost.
- **Saint** (Celestial, Human). Group heal and resurrection, little offense.
- **Sword Saint** (Human, Beastkin, Orc). Single strike mastery, perfect-timing gameplay.
- **Devourer** (Slime, Demonkin). Absorbs skills from kills, unstable.
- **Demon Lord Candidate** (Demonkin). Gains power from the dungeon, corruption risk.
- **Shadow Monarch** (Beastkin, Undead-born, Human). Raises defeated enemies as shadow soldiers.

### Mythic (0.1%)
- **Worldbreaker.** Alters the dungeon itself, collapsing walls and flooding rooms.
- **Void Walker.** Phases between rooms, skips encounters, breaks map rules.
- **Hero of the Prophecy** (Reincarnated Soul, Human). Growth boosts from fate events.
- **Demon King.** Commands monsters, but the Guild hunts you.
- **Sage of All Things.** Unlocks every skill category slowly, ultimate generalist.
- **Fate Weaver.** Rerolls events and loot once per dungeon, tied to LUK.

### Hidden (unlocked, not rolled)
- **Duelist.** From Swordsman after flawless fights.
- **Beast Sovereign.** From Tamer after taming an Ancient.
- **Rune Architect.** From Runesmith after discovering a forgotten rune.
- **Abyssal Hunter.** From Scout or Hunter after clearing an Abyssal dungeon.
- **Heretic Saint.** From Acolyte or Saint after a forbidden shrine.
- **Lich.** From Necromancer after a soul-binding quest.
- **Grand Cultivator.** From Monk after a mountain mystery.
- **Cheat-Skill Hero.** Reincarnated Soul only, after discovering the past-life ability.

## Talents (Luck-linked ones are rarest)

| Talent | Rarity | Effect |
|---|---|---|
| Iron Will | C | Resists fear and domination |
| Quick Learner | C | Skill mastery grows faster |
| Predator's Instinct | U | Bonus vs fleeing or weakened enemies |
| Mana Affinity | U | Cheaper spells |
| Lucky Break | R | Once per dungeon, a failed roll is rerolled |
| Second Wind | R | Survive a lethal hit once |
| Hidden Bloodline | E | Unlocks a race-linked secret evolution |
| Fortune's Child | L | +LUK, rare events trigger more often |
| Fated | M | One guaranteed "destiny" event per run |
| Cursed Genius | M | Huge potential, permanent drawback |

## Isekai flavors worth adding (all optional)

- **Reincarnation:** one "past life" talent (programmer, chef, soldier) that grants a unique skill.
- **Status window:** show a stats window with a hidden line ("???") until revealed.
- **Slow-life branch:** Cook, Farmer, and Merchant lines that progress through crafting and trading, not combat.
- **Demon-lord, hero, villain-edge paths** with reputation changes.
- **Monster-raising:** Slime and Tamer lines where monsters evolve by food and dungeon type.
- **Guild exam** scenes at rank-up with unusual solutions allowed.

## itch.io notes

- Ship as HTML5: plain JS, or Rust compiled to WASM. Zip with `index.html` at the root, mark "played in browser".
- Save data in `localStorage` so runs persist.
- Daily seed: use the date as the seed for the daily dungeon, so players can compare runs.
- Add a short "How to play" and a changelog on the itch page.
