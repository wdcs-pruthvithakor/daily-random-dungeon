#!/usr/bin/env bash
# Builds dist/daily-random-dungeon.zip for itch.io (HTML5, index.html at the zip root).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/daily-random-dungeon.zip
(cd game && zip -qr ../dist/daily-random-dungeon.zip index.html style.css data.js core.js tree.js combat.js terrain.js world.js explore.js guild.js art.js ui_base.js ui_tree.js ui_views.js ui_hub.js ui_map.js ui_capital.js ui_town.js ui_dungeon.js assets ui_main.js)
unzip -l dist/daily-random-dungeon.zip
