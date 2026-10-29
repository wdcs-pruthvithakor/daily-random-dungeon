# Daily Random Dungeon

A browser roguelike RPG for itch.io with two modes:

- **Daily dungeon:** roll three characters, pick one, delve into today's seeded dungeon, extract your loot or die trying.
- **Career:** keep one level-1 character and climb from F to S rank. Leveling gets very slow as levels rise.

## Run locally

Open `game/index.html` in a browser. No build step, no dependencies.

## Package for itch.io

```
./build-itch.sh
```

Upload `dist/daily-random-dungeon.zip` as an HTML project and tick "This file will be played in the browser".

## Layout

- `game/data.js`: content (skills, monsters, themes, events, items, consumables, recipes).
- `game/core.js`: RNG, characters, items, derived stats, skills. `game/combat.js`: enemies, combat, consumables. `game/world.js`: dungeons, events, missions, runs, career hub services. These run in browser and node.
- `game/art.js`: generated SVG art. `game/ui_*.js` and `game/style.css`: the interface (tabs, views, hub, actions).
- `tools/sim.js`: balance simulations (`node tools/sim.js rolls|bot|career`, `RP=1` picks career missions at random).
- `docs/design.md`: what is decided and built. `docs/roster.md`: races, professions, talents.

Saves use `localStorage` key `drd_save_v2` (a v1 save is partly imported).

## Latest additions
- Seeded, endless, Minecraft-style tile world (Career): biomes, rivers, fog of war, scouting, structures, waystones, lairs, and discovery XP. Type a world seed or play a random one.
- Illustrated town with eight buildings and a day/night cycle.
- Reactive skills (interrupt, parry, sunder), skill evolutions and boss wardens.
- Every stat now has an effect for every class.
- In-game Guide with ten sections.

- First-person 3D dungeons, a pixel-art home city (Hearthhold) with Bank, Academy and Arena, random capital cities with palaces, guild rank tests, party tournaments, racial homelands, CC0 Kenney art (see `game/assets/CREDITS.txt`).
