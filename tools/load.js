'use strict';
// Loads the game engine files in the same order as index.html.
const path = require('path');
const g = path.join(__dirname, '..', 'game');
globalThis.DATA = require(path.join(g, 'data.js'));
for (const f of ['core.js', 'tree.js', 'combat.js', 'terrain.js', 'world.js', 'explore.js', 'guild.js']) require(path.join(g, f));
module.exports = globalThis.Engine;
