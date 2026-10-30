# Daily Random Dungeon: Design

Pillars: randomized characters, flexible RPG progression, procedural dungeons, emergent item synergies, a hidden world. Randomness creates possibilities; player decisions decide outcomes.
Full roster of races and professions: `roster.md`. Original long-form concept (all 29 sections) is the long-term vision. This file records what is decided and what is built.

## Character roll (built)

Three rolls, pick one. The same pipeline runs for each roll:

1. **Race** by weight (Common races ~80% combined).
2. **Profession tier** by weight: Common 60%, Uncommon 25%, Rare 10%, Epic 4%, Legendary 0.9%, Mythic 0.1%.
3. **Profession** from that tier's pool for the race. If the race has none at that tier, fall back one tier down. 6% chance of a **Misfit** (any profession), which grants +2 stat and +2 LUK.
4. **Stats from profession rarity.** Budget by tier (40, 46, 54, 62, 72, 85, each with variance), spread across 7 stats by the profession's focus, then race modifiers.
5. **Potential** (Ordinary to Mythic), only lightly correlated with tier. It sets stat points per level (3 to 6).
6. **Luck** rolled on its own and not part of the budget: 87% roll 1-5, 11% roll 6-9, 2% roll 10-14.
7. **Talent(s)** and a **hidden trait** revealed at level 5.

Rare means a bigger budget plus a drawback (shown on the card), a signature skill, and a higher ceiling. Common means reliable.

## Luck

A hidden modifier on rare outcomes: secret-room odds, loot-rarity weight (up to 1.7x for Rare+), shrine curse/relic odds, camp hidden-passage odds, the Gamble skill. It never raises damage or defense directly and cannot be bought with level-up points. It only comes from creation, rare talents, charms and Misfit.

## Gameplay loop (built)

- Pick a dungeon rank (F, E, D). E unlocks after clearing F; D after clearing E.
- Each row is a choice of 2-3 rooms: monsters, elite, treasure, shrine, rest, merchant, abandoned camp. Luck can add a "suspicious wall" that leads to a hidden chamber with an elite and an Unknown relic.
- Combat is turn-based: 3 action points per turn, an energy resource, enemies telegraph their next move.
- **Heat** rises with each room: enemies scale up, loot rarity improves.
- **Push or extract.** Loot is at risk until you extract or beat the boss. Death loses carried gold and items, never the vault.
- **Vault.** Banked gear is permanent and can be equipped on any later character.
- Daily seed: the date seeds the dungeon layout and the first three rolls, so players can compare runs. Separate seeded streams for layout, combat and loot.

## Interface (built)

Tabs: Home, Daily, Career, Codex, Vault, Guide. A run in progress keeps its tab and blocks switching to the other mode; the view-only tabs stay open. Art is generated in code (`game/art.js`): race and profession portraits, class emblems, monster glyphs, a home-page hero scene, themed dungeon scenes, hit shake and floating damage in combat. The Codex shows races, professions, monsters, skills and talents, with undiscovered entries locked.

## Career mode (built)

A persistent character: roll three level-1 adventurers (free rerolls while starting), pick one, then climb Guild ranks F, E, D, C, B, A, S. Optional hardcore: death is permanent and the character goes to the Hall of the Fallen.

- **XP:** `30 * level^2.2` per level (level 30: ~53k, level 49: ~157k, cap 50). Dungeons more than 5 levels under you pay up to 80% less XP.
- **Promotion** to rank R needs two finished quests (no minimum level), and passing the rank test (a four-room dungeon of rank R). Quests on a board are limited to one rank above yours; dungeons are open to all and only show a recommended level and danger.
- **Mission board:** six seeded contracts per visit (refresh 40g): Dungeon Clear, Monster Hunt, Resource Gathering, Exploration, Rescue, Relic Recovery, plus rare Emergency missions. Each has an objective, an optional bonus objective, and pays gold, Guild Credits, reputation and a gear reward. Free expeditions are also available.
- **Guild reputation** gives titles (Unknown to Legendary) and up to 15% off all prices. Failing or abandoning missions costs reputation.
- **Services:** General Store, rotating Armory, Guild credit shop (tomes), Blacksmith (upgrade to +5 with failure chance, repair, enchant, salvage), Alchemy bench (11 recipes), Healer (injuries, blessing), Tavern (hire companions, rumors that reveal anomalies), stash of 40.
- **Death penalties:** lose carried loot, 15% gold, ~30% of consumables, 30% gear durability, 25% of the current XP bar, and gain a random injury for three expeditions. Companions are lost. Levels are kept (except in hardcore).

## Systems added in the second pass

- **Equipment:** eight slots (weapon, off-hand, head, chest, hands, feet, ring, amulet), 14 affixes, upgrade levels, durability (broken gear gives 50% stats), unequip, sell at 50%.
- **Skill trees (branch skilltree):** each discipline has 3 branches x 6 nodes (tier 1-6, 1/2/3/5/6/8 points, unlock at lvl 5/12/20/30/40/50; tier 5 needs a Legendary class and tier 6 a Mythic class). Nodes are skill mods, passives or new skills. Tier 3 needs Uncommon+, tier 4 Rare+ (capped to what the discipline offers). Secret manuals found on the map (ruins, vaults, Wandering Master) unlock one node of any branch. Academy can reset the tree.
- **Skills:** nine skills per discipline unlocking from level 1 to 35, learned with skill points, four equip slots, mastery ranks that add +8% per rank, universal skills from tomes, signature skills for Rare+ professions.
- **Monsters:** ten dungeon themes (Catacombs, Warrens, Crystal Caverns, Sunken Temple, Fungal Depths, Ember Forge, Frozen Citadel, Haunted Fortress, Machine Complex, Dragon's Graveyard), 50 monster types, mutations, and bosses with phases (summons, shields, enrage). New enemy intents: drain, curse, bleed, burn, stagger, shield, summon.
- **Dungeon events:** 21 data-driven random events, traps and puzzles with d20 stat checks, nine dungeon anomalies, abandoned camps with lore, merchants selling gear and consumables.
- **Consumables and materials:** 11 consumables, tomes, 17 materials from monsters, chests and salvage.
- **Companions:** Squire, Cleric, War Hound, Hedge Mage, Scout; rescued survivors join for one dungeon.

## Synergies (built, small)

Burning + poisoned on one enemy triggers **Toxic Blaze** (+50% tick damage). Item affixes (Flames, Venom, Leech, Swiftness, Precision, Guardian, Echoes) feed the same tag system. This is the seed of the full synergy engine.

## Not built yet (roadmap)

- Hidden professions and job evolution (list is in `roster.md`).
- Unique races and world-seed uniqueness.
- SS and SSS content and the central mystery.
- Multiplayer parties.

## Balance checks

`node tools/sim.js rolls` shows tier, race, potential and luck distributions over 300k rolls.
`node tools/sim.js career` plays a whole career with a bot (`RP=1` picks missions at random to measure win rate by level versus recommended). Current bot results: about 92% win at the recommended level, 70% at 3 levels under, and about level 30 after 150 expeditions, reaching rank B or A. The bot spends very little gold, so real gold sinks (upgrades, repairs, hiring) are untested.
`node tools/sim.js bot` plays full runs with a scripted bot. Current bot clear rates: F ~93%, E ~57%, D ~25%. Humans should do worse; retune `RANKS` scale and heat scaling in `game/core.js` and `game/combat.js` after real playtests.

## Third pass: world, town, reactive combat

**Every stat matters.** STR boosts 2+ AP skills, AGI refunds AP, INT boosts status damage, WIS boosts healing/potions and resists DoTs, DEX adds crit damage, WIL resists stagger/curse and can save you from a killing blow. Tome skills scale from their own discipline's stat.

**World (Career, `game/terrain.js`, `game/explore.js`, `game/ui_map.js`).** An endless, seeded, Minecraft-style tile world. Value-noise elevation, temperature and moisture give 15 biomes (oceans, beaches, plains, forest, taiga, tundra, desert, savanna, jungle, swamp, hills, mountains, snowy peaks, rivers); the home continent near Hearthhold is guaranteed. Structures (dungeons, lairs, springs, shrines, ruins, groves, mines, trader camps, wanderers, waystones, secret vaults) are placed per 12x12 cell from the seed. Danger = distance from Hearthhold (zones F..S). The player walks tile by tile (WASD or click-to-walk with A*), fog of war with persistent explored memory, scouting, waystone fast travel, discovery XP, days from terrain travel cost. The career start screen has a world-seed field with a live canvas preview.

**Town.** Illustrated Hearthhold with eight clickable buildings (Guild Hall, Market, Smithy, Alchemist, Temple, Tavern, Barracks, Storehouse) and a day/night cycle.

**Reactive skills.** Two per discipline: interrupts, parries, sunder/punish. They read the enemy's telegraphed intent.

**Evolutions.** At Practiced rank a skill can be evolved once, into one of two branches, for 1 skill point.

**Boss wardens.** Bulwark, Swarm Mother, Frenzied, Mirrored, Hexbound, Tidal.

**Balance notes (bot only).** Daily bot F 96% / E 75% / D 30% after raising E/D scales to 1.65/2.6. Career bot unchanged (about 95% at recommended level). World bot reaches about level 27 in 160 steps with no errors. Hand playtesting is still needed.

**Still not built.** Boats, caves, hidden professions and job evolution, unique races, SS/SSS content, an endless trial mode, multiplayer parties.

**Settlements, markers, dungeon visuals.** Villages (inn + general store) and towns (inn, market, smithy, alchemist, Guild board) are placed by the seed with several guaranteed near the start; visiting one makes it a waypoint for fast travel. Players can pin markers (right-click), see compass arrows for off-screen markers and waypoints, open an overview of explored land and click to travel (routes are planned in legs for long distances). Dungeons are drawn on a canvas as themed pixel-art brick halls with torches and chambers (`game/ui_dungeon.js`); combat uses the same wall as its backdrop.

**Fourth pass: art, 3D dungeon, capital, homelands.** CC0 art from Kenney (Tiny Town, Tiny Dungeon) lives in `game/assets/` (about 10 KB; credits in `game/assets/CREDITS.txt`). Hearthhold is a tile-grid pixel town (`ui_town.js`) with walking villagers and day/night, plus Bank, Academy (respec, lessons) and Arena. Dungeons are drawn in first-person 3D by a small raycaster (`ui_dungeon.js`): textured walls, floor and ceiling casting, doors with icon plaques, torches, theme tints, and a walk-through animation; the same renderer makes the combat backdrop. Racial homelands (`racehold`) are placed by biome and distance, each with an inn, market and elders who grant a one-time permanent stat boon per race. `node tools/test.js` runs 170+ engine checks.

- **Cooldowns:** non-signature skills that used to be once per fight now have `cd` (4 for heal/guard/buff, 5-6 for big hits). `combat.cdl[id]` counts down each turn. Signatures keep `once`.
- **Techniques and passive skills:** `rollTechnique` / `grantTechnique` in tree.js. Any non-signature skill of any discipline or rarity (`skillRarity`), capped by hero level (`rarityCap`), plus 18 always-on passive skills (`char.passives`). Taught skills are tracked in `char.techs` so a tree reset keeps them. Sources: ruins, vault, shrine vision, Wandering Master, Dying Champion (`out.technique`, `out.techBoost`).
- **Second awakening:** `char.sub = {prof, tier}` (`rollSub`, `grantSub`, `subEligible`, level 20+, once, any profession, no race/tier/level limit; tierFor takes the max when the sub shares the main's discipline). `E.tierFor(char, kind)` gates skills and tree nodes per discipline: main kind uses the main tier, the sub kind the sub's own tier (so a sub can be stronger). Main keeps signature, slots and power. Sources: Sage of Echoes (hermit variant 6) and a shrine choice (`out.awaken`).
- **Unranked lands:** the Guild ranks stay F-S (`CAREER_RANKS`). Beyond 120 tiles, `Terrain.wildOf(seed,x,y)` returns null or a rank id `X<n>` / `Z<n>` for 40-tile patches whose probability rises with distance (up to 85%) and whose forbidden share rises too. `n` is the threat step (`wildTier`, 1 per 22 tiles, to 60); `RANKS.X1..X60` / `Z1..Z60` grow without bound in scale, rewards, rec level and cs. No settlements inside patches; ordinary counties (with guilds) stay in between. `rankIdx` maps any rank id to 0-8. Dungeons in a patch carry that rank and `wild`.
- **Investigations:** quest kind `survey` (`surveyOffers`, guild.js): boards offer a clear-the-place job into a patch within 170 tiles, with LORE hooks; clearing it writes `career.lore` (shown in the Guild page's Lore journal), pays and teaches a technique (plus a manual in Z). First clears of rankless dungeons also teach a technique.
- **Levels:** `CAREER_MAX_LEVEL` is Infinity.
- **Party strength:** parties carry `level` and `rank`; members hit with `partyPower(level)` (the hero-power curve by level) instead of the hero's own power. Legendary parties are ranked two ranks above their area (level rec+3, x1.15); legendary arena rivals scale by the rank gap (`legendMul`). Old parties without `level` keep the old formula.
