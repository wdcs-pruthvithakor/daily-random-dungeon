'use strict';
/* Procedural SVG art: no image files needed. */
const Art = (() => {
  let uid = 0;
  const KIND_COLOR = { melee: '#7b8499', tank: '#b08f4a', ranged: '#5a9a56', rogue: '#4a4a62', magic: '#7a5ad0', support: '#e6dcb8', hybrid: '#3f8fb0', summon: '#a8557f' };
  const KIND_LABEL = { melee: 'Melee', tank: 'Defender', ranged: 'Ranged', rogue: 'Skirmisher', magic: 'Caster', support: 'Support', hybrid: 'Hybrid', summon: 'Summoner' };
  const SKIN = {
    Human: '#e0b896', Elf: '#efd6b4', Dwarf: '#d9a27c', Beastkin: '#c99158', Halfling: '#e8bf9c', Orc: '#7fa35c', Gnome: '#e3b494',
    Lizardfolk: '#5f9a6a', Dragonkin: '#b4503f', Fae: '#d8c6f2', 'Undead-born': '#a9b7a2', Demonkin: '#b24a52', 'Vampire-blooded': '#ece2ea',
    Celestial: '#f4e6b8', Construct: '#8c93a1', 'Void-touched': '#3b3566', Slime: '#6fd08c', 'Reincarnated Soul': '#e6c3a6',
  };
  const HAIR = ['#2b1d14', '#5a3a1e', '#8a5a2b', '#c9a24a', '#d8d8e0', '#7a2b2b', '#2b3a5a', '#3b2b5a'];
  const HAS_HAIR = ['Human', 'Elf', 'Halfling', 'Fae', 'Reincarnated Soul', 'Vampire-blooded', 'Celestial', 'Dwarf'];

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function emblemInner(kind) {
    switch (kind) {
      case 'melee': return '<path d="M12 2 L14.5 14 H9.5 Z" fill="currentColor" fill-opacity=".25"/><path d="M7 14 H17 M12 14 V21"/>';
      case 'tank': return '<path d="M12 2.5 L19.5 5.5 V12 C19.5 16.5 16 19.5 12 21.5 C8 19.5 4.5 16.5 4.5 12 V5.5 Z" fill="currentColor" fill-opacity=".2"/><path d="M12 6 V17 M8 10 H16"/>';
      case 'ranged': return '<path d="M7 3 Q21 12 7 21"/><path d="M7 3 V21"/><path d="M3 12 H19 M16 9 L19.5 12 L16 15"/>';
      case 'rogue': return '<path d="M5 19 L16 4 L18 6 L8 20 Z" fill="currentColor" fill-opacity=".25"/><path d="M19 19 L8 4 L6 6 L16 20 Z" fill="currentColor" fill-opacity=".25"/>';
      case 'magic': return '<path d="M5 20 L16 9"/><circle cx="17.5" cy="7" r="3.2" fill="currentColor" fill-opacity=".25"/><path d="M17.5 1.5 V3 M22 7 H20.5 M13 7 H14.5"/>';
      case 'support': return '<path d="M12 4 V20 M4 12 H20"/><circle cx="12" cy="12" r="9" stroke-opacity=".45"/>';
      case 'hybrid': return '<path d="M12 2 L14 13 H10 Z" fill="currentColor" fill-opacity=".25"/><path d="M8 13 H16 M12 13 V19"/><path d="M19 4 L20 6 L22 7 L20 8 L19 10 L18 8 L16 7 L18 6 Z" fill="currentColor"/>';
      case 'summon': return '<ellipse cx="12" cy="16" rx="4.5" ry="3.8" fill="currentColor" fill-opacity=".25"/><circle cx="6" cy="10.5" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14" cy="6.5" r="2"/><circle cx="18" cy="10.5" r="2"/>';
      default: return '<circle cx="12" cy="12" r="8"/>';
    }
  }
  function emblem(kind, color, size) {
    return `<svg class="emblem" viewBox="0 0 24 24" width="${size || 28}" height="${size || 28}" fill="none" stroke="${color || 'currentColor'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="color:${color || 'currentColor'}">${emblemInner(kind)}</svg>`;
  }
  function lockedEmblem(size) {
    return `<svg class="emblem" viewBox="0 0 24 24" width="${size || 28}" height="${size || 28}" fill="none" stroke="#5b6078" stroke-width="1.6" stroke-linecap="round"><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8.5 11 V8 a3.5 3.5 0 0 1 7 0 V11"/></svg>`;
  }

  function back(r, skin) {
    switch (r) {
      case 'Fae': return '<g opacity=".6"><path d="M60 100 C6 80 4 14 38 34 C50 44 56 70 60 100Z" fill="#bfe8ff"/><path d="M60 100 C114 80 116 14 82 34 C70 44 64 70 60 100Z" fill="#bfe8ff"/></g>';
      case 'Dragonkin': return '<path d="M40 44 Q26 20 18 8 Q38 18 48 38Z" fill="#e8d9b0"/><path d="M80 44 Q94 20 102 8 Q82 18 72 38Z" fill="#e8d9b0"/>';
      case 'Demonkin': return '<path d="M42 40 Q22 28 28 4 Q46 16 52 38Z" fill="#33141c"/><path d="M78 40 Q98 28 92 4 Q74 16 68 38Z" fill="#33141c"/>';
      case 'Celestial': return '<ellipse cx="60" cy="20" rx="26" ry="7" fill="none" stroke="#ffe27a" stroke-width="3.5"/><ellipse cx="60" cy="20" rx="26" ry="7" fill="none" stroke="#fff6c8" stroke-width="1" opacity=".8"/>';
      case 'Beastkin': return `<path d="M34 46 L32 14 L54 34Z" fill="${skin}"/><path d="M86 46 L88 14 L66 34Z" fill="${skin}"/><path d="M37 38 L36 22 L47 33Z" fill="#e7a0a0"/><path d="M83 38 L84 22 L73 33Z" fill="#e7a0a0"/>`;
      case 'Elf': return `<path d="M36 58 L6 44 L38 74Z" fill="${skin}"/><path d="M84 58 L114 44 L82 74Z" fill="${skin}"/>`;
      case 'Reincarnated Soul': return '<ellipse cx="60" cy="62" rx="36" ry="40" fill="none" stroke="#bff3ff" stroke-width="2" opacity=".55"/><ellipse cx="60" cy="62" rx="44" ry="48" fill="none" stroke="#bff3ff" stroke-width="1" opacity=".3"/>';
      default: return '';
    }
  }
  function front(r, hair) {
    switch (r) {
      case 'Dwarf': return `<path d="M35 68 Q38 116 60 122 Q82 116 85 68 Q72 86 60 86 Q48 86 35 68Z" fill="${hair}"/><path d="M36 50 Q60 36 84 50 L84 56 Q60 46 36 56Z" fill="#b0a58a"/>`;
      case 'Orc': return '<path d="M47 80 L44 94 L53 86Z" fill="#f7f3e6"/><path d="M73 80 L76 94 L67 86Z" fill="#f7f3e6"/><path d="M40 52 L52 56 M80 52 L68 56" stroke="#3d5a2a" stroke-width="3" stroke-linecap="round"/>';
      case 'Lizardfolk': return '<path d="M60 30 L52 46 L68 46Z" fill="#2f6d49"/><path d="M60 24 L56 34 L64 34Z" fill="#2f6d49"/><circle cx="55" cy="76" r="1.5" fill="#2f5a40"/><circle cx="65" cy="76" r="1.5" fill="#2f5a40"/>';
      case 'Gnome': return '<circle cx="60" cy="74" r="7" fill="#c98f70"/><path d="M34 44 Q62 -14 88 44Z" fill="#a8433a"/><path d="M34 44 H88" stroke="#6f2a24" stroke-width="3"/>';
      case 'Undead-born': return '<path d="M52 38 L58 50 L51 60 L57 68" stroke="#2f3a31" stroke-width="2" fill="none"/><path d="M70 80 L72 92 M64 80 L65 90 M76 80 L78 90" stroke="#2f3a31" stroke-width="1.5"/>';
      case 'Vampire-blooded': return '<path d="M53 82 L55 92 L58 82Z" fill="#fff"/><path d="M62 82 L65 92 L67 82Z" fill="#fff"/>';
      case 'Construct': return '<rect x="38" y="56" width="44" height="12" rx="4" fill="#0e1119"/><rect x="42" y="60" width="36" height="3" rx="1.5" fill="#6fe0ff"/><circle cx="40" cy="42" r="2" fill="#5d6472"/><circle cx="80" cy="42" r="2" fill="#5d6472"/><circle cx="40" cy="88" r="2" fill="#5d6472"/><circle cx="80" cy="88" r="2" fill="#5d6472"/><path d="M48 84 H72" stroke="#5d6472" stroke-width="2"/>';
      case 'Void-touched': return '<circle cx="48" cy="46" r="1.2" fill="#fff"/><circle cx="74" cy="50" r="1" fill="#fff"/><circle cx="62" cy="40" r="1.4" fill="#cfd4ff"/><circle cx="52" cy="82" r="1" fill="#fff"/><circle cx="70" cy="84" r="1.2" fill="#cfd4ff"/><path d="M40 62 Q60 40 82 64" stroke="#7b6bff" stroke-width="1.4" fill="none" opacity=".7"/>';
      default: return '';
    }
  }

  function portrait(c, size) {
    const id = 'p' + (uid++), s = size || 120;
    const skin = SKIN[c.race] || '#e0b896';
    const tierColor = (typeof Engine !== 'undefined' && Engine.TIERS[Engine.TIER_BY[c.tier]].color) || '#c9ccd1';
    const kind = (typeof Engine !== 'undefined' && Engine.PROF_BY[c.prof].kind) || 'melee';
    const armor = KIND_COLOR[kind];
    const h = hash(c.name + c.race);
    const hair = HAIR[h % HAIR.length];
    const glow = c.tier === 'L' || c.tier === 'M' || c.tier === 'E';
    if (c.race === 'Slime') {
      return `<svg class="portrait" viewBox="0 0 120 140" width="${s}" height="${s * 140 / 120}"><defs><radialGradient id="${id}b" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${tierColor}" stop-opacity=".35"/><stop offset="1" stop-color="#12131a" stop-opacity="0"/></radialGradient><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9af0b4"/><stop offset="1" stop-color="#3da866"/></linearGradient></defs>
        <rect width="120" height="140" fill="url(#${id}b)"/><path d="M14 126 Q10 70 40 52 Q60 36 80 52 Q110 70 106 126 Q60 138 14 126Z" fill="url(#${id}s)" opacity=".92"/><ellipse cx="46" cy="70" rx="7" ry="9" fill="#fff"/><ellipse cx="74" cy="70" rx="7" ry="9" fill="#fff"/><circle cx="47" cy="72" r="4" fill="#1a2b20"/><circle cx="75" cy="72" r="4" fill="#1a2b20"/><path d="M50 92 Q60 100 70 92" stroke="#1f5a37" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="36" cy="60" rx="6" ry="3" fill="#fff" opacity=".5" transform="rotate(-30 36 60)"/></svg>`;
    }
    const hairArt = HAS_HAIR.includes(c.race) && c.race !== 'Celestial'
      ? `<path d="M33 62 Q30 26 60 26 Q90 26 87 62 Q82 44 60 42 Q40 44 33 62Z" fill="${hair}"/>` : c.race === 'Celestial' ? `<path d="M33 62 Q30 26 60 26 Q90 26 87 62 Q82 44 60 42 Q40 44 33 62Z" fill="#fff4c9"/>` : '';
    const eyes = c.race === 'Construct' ? '' : `<ellipse cx="50" cy="66" rx="5" ry="${c.race === 'Dragonkin' || c.race === 'Lizardfolk' ? 3 : 4.5}" fill="${c.race === 'Undead-born' ? '#10140f' : '#fff'}"/><ellipse cx="70" cy="66" rx="5" ry="${c.race === 'Dragonkin' || c.race === 'Lizardfolk' ? 3 : 4.5}" fill="${c.race === 'Undead-born' ? '#10140f' : '#fff'}"/><circle cx="50" cy="66" r="2.6" fill="${tierColor}"/><circle cx="70" cy="66" r="2.6" fill="${tierColor}"/>${glow ? `<circle cx="50" cy="66" r="5.5" fill="${tierColor}" opacity=".25"/><circle cx="70" cy="66" r="5.5" fill="${tierColor}" opacity=".25"/>` : ''}`;
    return `<svg class="portrait" viewBox="0 0 120 140" width="${s}" height="${s * 140 / 120}">
      <defs><radialGradient id="${id}b" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="${tierColor}" stop-opacity="${glow ? .5 : .28}"/><stop offset="1" stop-color="#12131a" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${armor}"/><stop offset="1" stop-color="#14151d"/></linearGradient></defs>
      <rect width="120" height="140" fill="url(#${id}b)"/>
      ${back(c.race, skin)}
      <path d="M8 140 Q8 100 60 96 Q112 100 112 140Z" fill="url(#${id}a)"/>
      <path d="M30 140 Q34 108 60 104 Q86 108 90 140" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
      <path d="M44 100 L60 116 L76 100" fill="none" stroke="${tierColor}" stroke-opacity=".7" stroke-width="2"/>
      <rect x="51" y="86" width="18" height="16" rx="6" fill="${skin}"/><rect x="51" y="86" width="18" height="16" rx="6" fill="#000" opacity=".16"/>
      <ellipse cx="60" cy="62" rx="27" ry="31" fill="${skin}"/>
      <ellipse cx="60" cy="62" rx="27" ry="31" fill="url(#${id}b)" opacity=".15"/>
      ${hairArt}${eyes}
      <path d="M52 84 Q60 89 68 84" stroke="#000" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M42 57 Q50 53 56 57 M64 57 Q70 53 78 57" stroke="#000" stroke-opacity=".3" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${front(c.race, hair)}
    </svg>`;
  }

  function monsterGlyph(name) {
    const E = (typeof Engine !== 'undefined') ? Engine : null;
    if (!E) return '👾';
    if (!monsterGlyph.list) {
      const l = [];
      for (const m of Object.values(E.MONSTERS)) l.push([m.name, m.glyph]);
      for (const t of E.THEMES) l.push([t.boss.name, t.boss.glyph]);
      l.sort((a, b) => b[0].length - a[0].length);
      monsterGlyph.list = l;
    }
    for (const [n, g] of monsterGlyph.list) if (name.includes(n)) return g;
    return '👾';
  }

  function hero() {
    return `<svg class="hero" viewBox="0 0 800 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0c18"/><stop offset=".65" stop-color="#2a1d3d"/><stop offset="1" stop-color="#4a2a3a"/></linearGradient>
        <radialGradient id="hGlow" cx="50%" cy="60%" r="50%"><stop offset="0" stop-color="#ffb347" stop-opacity=".9"/><stop offset=".5" stop-color="#ff7a3c" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a3c" stop-opacity="0"/></radialGradient>
        <linearGradient id="hDoor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#c8501e"/></linearGradient>
      </defs>
      <rect width="800" height="260" fill="url(#hSky)"/>
      <g fill="#fff"><circle class="twinkle" cx="80" cy="30" r="1.4"/><circle class="twinkle d2" cx="170" cy="60" r="1"/><circle class="twinkle d3" cx="310" cy="24" r="1.3"/><circle class="twinkle" cx="540" cy="40" r="1.2"/><circle class="twinkle d2" cx="680" cy="28" r="1.5"/><circle class="twinkle d3" cx="740" cy="70" r="1"/></g>
      <circle cx="610" cy="62" r="26" fill="#f4ecd0" opacity=".9"/><circle cx="620" cy="56" r="26" fill="#2a1d3d"/>
      <path d="M0 200 L90 120 L170 180 L260 100 L350 190 L450 130 L560 195 L660 115 L760 180 L800 150 V260 H0Z" fill="#171325"/>
      <path d="M0 230 L120 170 L230 220 L340 160 L460 225 L580 170 L700 225 L800 190 V260 H0Z" fill="#0f0c1a"/>
      <ellipse cx="400" cy="170" rx="210" ry="110" fill="url(#hGlow)"/>
      <path d="M300 260 V140 Q300 70 400 70 Q500 70 500 140 V260Z" fill="#241c2d" stroke="#3a2f48" stroke-width="4"/>
      <path d="M322 260 V146 Q322 92 400 92 Q478 92 478 146 V260Z" fill="url(#hDoor)"/>
      <path d="M322 260 V146 Q322 92 400 92 Q478 92 478 146 V260Z" fill="#000" opacity=".25"/>
      <path d="M360 260 L372 240 L428 240 L440 260Z M350 240 L364 220 L436 220 L450 240Z" fill="#241c2d" opacity=".85"/>
      <g stroke="#3a2f48" stroke-width="3"><path d="M300 140 H322 M478 140 H500 M300 190 H322 M478 190 H500"/></g>
      <g><rect x="250" y="150" width="8" height="70" fill="#3a2a20"/><path class="flame" d="M254 150 Q242 132 254 112 Q266 132 254 150Z" fill="#ffb347"/><path class="flame d2" d="M254 148 Q248 138 254 126 Q260 138 254 148Z" fill="#fff0b0"/></g>
      <g><rect x="542" y="150" width="8" height="70" fill="#3a2a20"/><path class="flame d2" d="M546 150 Q534 132 546 112 Q558 132 546 150Z" fill="#ffb347"/><path class="flame" d="M546 148 Q540 138 546 126 Q552 138 546 148Z" fill="#fff0b0"/></g>
      <g class="dice d1" transform="translate(110 54) rotate(-14)"><rect width="42" height="42" rx="8" fill="#f2efe6" stroke="#bbb" /><circle cx="12" cy="12" r="4" fill="#222"/><circle cx="30" cy="30" r="4" fill="#222"/><circle cx="21" cy="21" r="4" fill="#c0392b"/></g>
      <g class="dice d2" transform="translate(640 130) rotate(18)"><rect width="38" height="38" rx="7" fill="#f2efe6" stroke="#bbb"/><circle cx="10" cy="10" r="3.5" fill="#222"/><circle cx="28" cy="10" r="3.5" fill="#222"/><circle cx="10" cy="28" r="3.5" fill="#222"/><circle cx="28" cy="28" r="3.5" fill="#222"/></g>
    </svg>`;
  }

  return { emblem, lockedEmblem, portrait, monsterGlyph, hero, KIND_COLOR, KIND_LABEL, SKIN };
})();
