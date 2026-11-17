// The Sakura garden: one SVG, drawn from a breeze. No script runs in it and it
// loads nothing; every movement is CSS inside its own <style>.
//
// Petal layout is seeded, so each draw lays the same petals in the same places.
// What changes between draws is timing alone: each animation is started part
// way through (a negative delay worked out from the breeze's phase), so a
// redraw picks every petal up where it was, even after the speed changed.

const PETAL = 'M0 10C-7 5-9-3-6-8-5-10-2-10.5 0-7 2-10.5 5-10 6-8 9-3 7 5 0 10Z'

/** How long a turn-end gust can still be on screen, in seconds of calm motion. */
const GUST_SPAN = 12
/** The same for a merge burst, whose petals set off over a longer stretch. */
const BURST_SPAN = 15

function seeded(seed) {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = value => String(Math.round(value * 100) / 100)

const rand = seeded(20260417)
const between = (low, high) => low + (high - low) * rand()

// Each entry is one looping animation: its element, keyframes, calm-speed
// length in seconds, how far into the loop it starts, and the rest of the
// shorthand.
const loops = []
let vars = ''
let nextId = 0

function tumbling(shape, glow) {
  const id = nextId++
  const isReversed = rand() < 0.5

  loops.push({ id: `b${id}`, name: 'sway', base: between(6, 11), off: between(0, 11), rest: 'ease-in-out' })
  loops.push({
    id: `c${id}`,
    name: 'spin',
    base: between(8, 17),
    off: between(0, 17),
    rest: isReversed ? 'linear reverse' : 'linear',
  })

  return { id, body: `<g id="b${id}"><g id="c${id}">${glow}${shape}</g></g>` }
}

// Petals that fall the height of the scene, drifting left as they go.
function falling(count, layer) {
  let out = ''

  for (let i = 0; i < count; i++) {
    const x = -20 + (i + rand()) * (1820 / count)
    const scale = between(layer.scale[0], layer.scale[1])
    const opacity = between(layer.opacity[0], layer.opacity[1])
    const shape = layer.isSoft
      ? `<ellipse rx="11" ry="8" transform="scale(${n(scale)})" opacity="${n(opacity)}" fill="url(#sg)"/>`
      : `<path d="${PETAL}" transform="scale(${n(scale)})" opacity="${n(opacity)}"/>`
    const glow = layer.glowEvery && i % layer.glowEvery === 1 ? '<circle r="22" class="gw" fill="url(#gl)"/>' : ''
    const { id, body } = tumbling(shape, glow)
    const fall = between(layer.fall[0], layer.fall[1])

    loops.push({ id: `a${id}`, name: 'fall', base: fall, off: between(0, fall), rest: 'linear' })
    vars += `#a${id}{--dx:${n(-between(layer.drift[0], layer.drift[1]))}px}#b${id}{--sw:${n(between(layer.sway[0], layer.sway[1]))}px}`
    out += `<g transform="translate(${n(x)} 0)"><g id="a${id}">${body}</g></g>`
  }

  return out
}

const FAR = falling(34, { scale: [0.34, 0.58], opacity: [0.5, 0.8], fall: [48, 72], drift: [60, 150], sway: [12, 26] })
const MID = falling(14, {
  scale: [0.75, 1.1],
  opacity: [0.85, 1],
  fall: [31, 43],
  drift: [110, 220],
  sway: [22, 42],
  glowEvery: 3,
})
const NEAR = falling(5, {
  scale: [3, 4.4],
  opacity: [0.5, 0.65],
  fall: [20, 27],
  drift: [180, 300],
  sway: [40, 70],
  isSoft: true,
})

// A cluster that crosses from the right edge to the left. `cross` names the
// keyframes; a looping cluster passes it, a one-shot leaves it out and is timed
// by the breeze instead.
function cluster(count, top, height, cross) {
  let out = ''
  const members = []

  for (let i = 0; i < count; i++) {
    const scale = between(0.6, 1.35)
    const { id, body } = tumbling(`<path d="${PETAL}" transform="scale(${n(scale)})" opacity="${n(between(0.75, 1))}"/>`, '')
    const stagger = between(0, cross ? 2.4 : 1.8)

    // Caught in a gust, a petal tumbles faster than one left to fall.
    loops[loops.length - 2].base = between(3, 4.6)
    loops[loops.length - 1].base = between(2.6, 4.2)

    if (cross) {
      loops.push({ id: `a${id}`, name: cross.name, base: cross.every, off: cross.off - stagger, rest: 'linear' })
    } else {
      members.push({ id: `a${id}`, length: between(6.5, 9), stagger })
    }
    vars += `#a${id}{--gy:${n(between(120, 300))}px}#b${id}{--sw:${n(between(10, 24))}px}`
    out += `<g transform="translate(${n(1670 + between(0, 300))} ${n(top + between(0, height))})"><g id="a${id}">${body}</g></g>`
  }

  return { out, members }
}

// Two ambient gusts on unrelated cycles, so they never feel like clockwork.
const AMBIENT =
  cluster(8, 170, 200, { name: 'gust1', every: 52, off: 14 }).out +
  cluster(7, 430, 180, { name: 'gust2', every: 83, off: 51 }).out

// The gust that answers the end of a turn.
const TURN_GUST = cluster(18, 200, 300)

// ---- The branch, pinned to the top right corner --------------------------

function flower(x, y, scale) {
  let petals = ''

  for (let i = 0; i < 5; i++) {
    petals += `<path d="${PETAL}" transform="rotate(${i * 72}) translate(0 -11)"/>`
  }

  return `<g transform="translate(${x} ${y}) rotate(${n(between(0, 72))}) scale(${scale})">${petals}<circle r="3.4" class="fc"/></g>`
}

const BOUGHS = [
  [21, 'M1660 78C1585 70 1520 92 1458 120'],
  [15, 'M1458 120C1400 146 1340 150 1282 168'],
  [10, 'M1282 168C1222 187 1168 214 1122 252'],
  [5.5, 'M1122 252C1090 280 1062 310 1040 346'],
  [3, 'M1040 346C1030 364 1022 380 1012 398'],
  [11, 'M1575 -20C1560 30 1515 80 1458 120'],
  [7.5, 'M1405 142C1378 108 1335 84 1288 74'],
  [4, 'M1288 74C1250 66 1215 70 1182 84'],
  [3, 'M1335 88C1322 62 1300 42 1276 30'],
  [7, 'M1340 152C1346 200 1326 246 1304 288'],
  [3.6, 'M1304 288C1290 318 1284 350 1290 384'],
  [3, 'M1322 250C1350 272 1368 300 1374 332'],
  [4.5, 'M1180 208C1140 196 1096 196 1056 208'],
  [2.6, 'M1056 208C1030 216 1006 228 986 246'],
  [6.5, 'M1540 88C1548 136 1570 176 1578 222'],
  [3.2, 'M1578 222C1582 252 1572 280 1556 304'],
  [2.8, 'M1562 168C1540 190 1524 216 1518 246'],
  [2.6, 'M1085 285C1110 310 1122 338 1124 368'],
]
  .map(([width, d]) => `<path d="${d}" stroke-width="${width}"/>`)
  .join('')

const FLOWERS = [
  [1012, 398, 0.95], [1124, 368, 0.8], [986, 246, 0.9], [1182, 84, 1], [1276, 30, 0.85], [1290, 384, 1],
  [1374, 332, 0.85], [1556, 304, 0.95], [1518, 246, 0.8], [1040, 346, 0.8], [1066, 306, 0.7], [1122, 252, 1.05],
  [1056, 208, 0.85], [1100, 196, 0.7], [1168, 214, 0.9], [1225, 186, 0.75], [1282, 168, 1.1], [1232, 72, 0.8],
  [1288, 74, 0.95], [1335, 88, 0.75], [1300, 45, 0.7], [1378, 110, 0.85], [1304, 288, 0.9], [1326, 240, 0.75],
  [1345, 190, 0.7], [1352, 290, 0.7], [1405, 142, 1], [1458, 120, 0.9], [1500, 66, 0.85], [1540, 36, 0.8],
  [1578, 222, 0.85], [1568, 176, 0.7], [1535, 208, 0.7], [1600, 60, 0.9],
]
  .map(([x, y, scale]) => flower(x, y, scale))
  .join('')

const BUDS = [
  [1026, 372], [1096, 272], [1140, 236], [1012, 232], [1205, 76], [1258, 50],
  [1296, 336], [1362, 312], [1566, 264], [1522, 226], [1425, 132], [1478, 96],
]
  .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="6.2" class="fc" transform="rotate(${n(between(-50, 50))} ${x} ${y})"/>`)
  .join('')

// A little out-of-focus blossom light around the branch.
const BOKEH = [
  [1150, 120, 34], [1420, 250, 46], [1236, 300, 28], [1490, 180, 30], [1090, 150, 22],
]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#sg)" opacity=".55"/>`)
  .join('')

const STARS = Array.from({ length: 18 }, () =>
  `<circle cx="${n(between(40, 1560))}" cy="${n(between(30, 520))}" r="${n(between(0.8, 1.7))}" opacity="${n(between(0.25, 0.6))}"/>`,
).join('')

// What reduced motion shows in place of the falling petals: a few lying still
// near the foot of the scene and a few caught mid-air.
const RESTING = Array.from({ length: 9 }, (_, i) =>
  `<path d="${PETAL}" transform="translate(${n(70 + (i + rand()) * 165)} ${n(between(850, 950))}) rotate(${n(between(0, 360))}) scale(${n(between(0.7, 1.15))} ${n(between(0.4, 0.6))})" opacity="${n(between(0.75, 0.95))}"/>`,
).join('')

const HANGING = [
  [210, 330, 0.9], [640, 610, 0.6], [930, 470, 0.5], [1240, 640, 1], [420, 760, 0.55], [1480, 520, 0.7],
]
  .map(([x, y, scale]) => `<path d="${PETAL}" transform="translate(${x} ${y}) rotate(${n(between(0, 360))}) scale(${scale} ${n(scale * between(0.6, 1))})" opacity=".85"/>`)
  .join('')

// The burst that answers a merge: twice the petals of a gust, over the whole
// height of the scene, setting off in a longer wave. Laid out after everything
// else that is seeded, so adding it moved nothing that was already drawn.
const MERGE_BURST = cluster(36, 40, 860)

for (const member of MERGE_BURST.members) {
  member.stagger *= 2.4
}

// ---- Any screen ------------------------------------------------------------
// The scene is cropped to fill its box, so on a narrow box the corner with the
// branch would fall outside it. These rules read the scene's own box and slide
// the branch back in (and shrink it), and keep the mist at the foot of a wide one.

let pin = ''

for (let ratio = 150; ratio >= 40; ratio -= 10) {
  const shown = 10 * (ratio - 5)
  const scale = Math.min(1, (0.66 * shown) / 680)

  pin += `@media (max-aspect-ratio:${ratio}/100){.tr{transform:translate(${n(-(1600 - shown) / 2)}px,0) scale(${n(scale)})}}`
}

for (let ratio = 170; ratio <= 330; ratio += 10) {
  const cut = (1000 - 160000 / (ratio + 5)) / 2

  pin += `@media (min-aspect-ratio:${ratio}/100){.tr{transform:translate(0,${n(cut)}px)}.lo{transform:translate(0,${n(-cut)}px)}}`
}

const STYLE = `
:root{--sky0:#f8dfe4;--sky1:#fbe9e6;--sky2:#fdf6ee;--mist:#fffaf6;--mist-o:.85;
--pc:#ea8aa6;--pp:#f6b8ca;--pe:#fad3de;--bark:#ab8e80;--branch-o:.85;
--bc:#e283a3;--bp:#f3a7bf;--be:#fbd9e3;--night:0;--glow:0}
@media (prefers-color-scheme:dark){:root{--sky0:#11112c;--sky1:#221a3c;--sky2:#3a2546;--mist:#9d8cc0;--mist-o:.22;
--pc:#855272;--pp:#977085;--pe:#a07a8f;--bark:#0b0a15;--branch-o:.94;
--bc:#7a4a66;--bp:#875f76;--be:#98738a;--night:1;--glow:.45}}
.s0{stop-color:var(--sky0)}.s1{stop-color:var(--sky1)}.s2{stop-color:var(--sky2)}
.m0{stop-color:var(--mist);stop-opacity:0}.m1{stop-color:var(--mist);stop-opacity:var(--mist-o)}
.p0{stop-color:var(--pc)}.p1{stop-color:var(--pp)}.p2{stop-color:var(--pe)}
.b0{stop-color:var(--bc)}.b1{stop-color:var(--bp)}.b2{stop-color:var(--be)}
.q0{stop-color:var(--pp);stop-opacity:.8}.q1{stop-color:var(--pp);stop-opacity:0}
.bk{stroke:var(--bark);fill:none;stroke-linecap:round}.bo{opacity:var(--branch-o)}.fc{fill:var(--bc)}
.ni{opacity:var(--night)}.gw{opacity:var(--glow)}.sr{fill:#fff4e6}
.tr{transform-origin:1600px 0}.st{display:none}
@keyframes fall{from{transform:translate(0,-70px)}to{transform:translate(var(--dx),1070px)}}
@keyframes sway{0%,100%{transform:translateX(calc(var(--sw)*-1))}50%{transform:translateX(var(--sw))}}
@keyframes spin{0%{transform:rotate(0deg) scaleY(1)}25%{transform:rotate(90deg) scaleY(.5)}50%{transform:rotate(180deg) scaleY(1)}75%{transform:rotate(270deg) scaleY(.55)}100%{transform:rotate(360deg) scaleY(1)}}
@keyframes gust1{0%{transform:translate(0,0);animation-timing-function:cubic-bezier(.37,0,.63,1)}18%,100%{transform:translate(-2050px,var(--gy))}}
@keyframes gust2{0%{transform:translate(0,0);animation-timing-function:cubic-bezier(.37,0,.63,1)}12%,100%{transform:translate(-2050px,var(--gy))}}
@keyframes once{from{transform:translate(0,0)}to{transform:translate(-2050px,var(--gy))}}
@media (prefers-reduced-motion:reduce){.mv{display:none}.st{display:inline}}
${pin}${vars}`

const DEFS = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"/><stop offset=".55" class="s1"/><stop offset="1" class="s2"/></linearGradient>
<linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="m0"/><stop offset=".6" class="m1"/><stop offset="1" class="m1"/></linearGradient>
<radialGradient id="mb"><stop offset="0" class="m1"/><stop offset="1" class="m0"/></radialGradient>
<radialGradient id="pg" gradientUnits="userSpaceOnUse" cx="0" cy="10" r="21"><stop offset="0" class="p0"/><stop offset=".5" class="p1"/><stop offset="1" class="p2"/></radialGradient>
<radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="0" cy="10" r="21"><stop offset="0" class="b0"/><stop offset=".45" class="b1"/><stop offset="1" class="b2"/></radialGradient>
<radialGradient id="sg"><stop offset="0" class="q0"/><stop offset="1" class="q1"/></radialGradient>
<radialGradient id="gl"><stop offset="0" stop-color="#ffd9e6" stop-opacity=".6"/><stop offset="1" stop-color="#ffd9e6" stop-opacity="0"/></radialGradient>
<radialGradient id="mh"><stop offset="0" stop-color="#fbeedd" stop-opacity=".3"/><stop offset=".3" stop-color="#e9d3e0" stop-opacity=".16"/><stop offset="1" stop-color="#e9d3e0" stop-opacity="0"/></radialGradient>
<filter id="bf" x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="1.7"/></filter>
<filter id="mf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
</defs>`

const GROUND = `<rect width="1600" height="1000" fill="url(#sky)"/>
<g class="ni sr">${STARS}</g>
<g class="tr">
<g class="ni"><circle cx="1300" cy="226" r="330" fill="url(#mh)"/><circle cx="1300" cy="226" r="76" fill="#f7ecdc" opacity=".2" filter="url(#mf)"/></g>
<g class="bo" filter="url(#bf)">${BOKEH}<g class="bk">${BOUGHS}</g><g fill="url(#bg)">${FLOWERS}</g>${BUDS}</g>
</g>
<g class="lo"><rect y="540" width="1600" height="760" fill="url(#mg)"/><ellipse cx="360" cy="985" rx="640" ry="170" fill="url(#mb)"/><ellipse cx="1260" cy="1010" rx="720" ry="190" fill="url(#mb)"/>
<g class="st" fill="url(#pg)">${RESTING}</g></g>
<g class="st" fill="url(#pg)">${HANGING}</g>`

const PETALS = `<g class="mv" fill="url(#pg)">${FAR}${MID}${AMBIENT}<g class="tg">${TURN_GUST.out}</g><g class="mb">${MERGE_BURST.out}</g>${NEAR}</g>`

/** The breeze's phase at `now`: seconds of calm-speed motion gone by. */
export function phaseAt(breeze, now) {
  return breeze.phase + (breeze.speed * Math.max(0, now - breeze.at)) / 1000
}

// A one-shot cluster's timing: each petal started as far in as the breeze has
// moved on since it set off, or the whole group left undrawn once it is over.
function sweep(members, group, setOff, span, phase, speed) {
  const since = setOff === undefined || setOff < 0 ? span : phase - setOff

  if (since < 0 || since >= span) {
    return `.${group}{display:none}`
  }

  return members
    .map(member => `#${member.id}{animation:once ${n(member.length / speed)}s cubic-bezier(.37,0,.63,1) ${n((member.stagger - since) / speed)}s 1 both}`)
    .join('')
}

/** The whole scene as one SVG document, with every petal where `breeze` puts it at `now`. */
export function scene(breeze, now) {
  const isResting = breeze.speed <= 0
  const speed = isResting ? 1 : breeze.speed
  const phase = phaseAt(breeze, now)
  let timing = ''

  for (const loop of loops) {
    const into = (((phase + loop.off) % loop.base) + loop.base) % loop.base

    timing += `#${loop.id}{animation:${loop.name} ${n(loop.base / speed)}s ${loop.rest} ${n(-into / speed)}s infinite}`
  }

  timing += sweep(TURN_GUST.members, 'tg', breeze.gust, GUST_SPAN, phase, speed)
  timing += sweep(MERGE_BURST.members, 'mb', breeze.burst, BURST_SPAN, phase, speed)

  if (isResting) {
    timing += '.mv *{animation-play-state:paused!important}'
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><style>${STYLE}${timing}</style>${DEFS}${GROUND}${PETALS}</svg>`
}
