#!/usr/bin/env node
/**
 * Draws the illustrated exercise images.
 *
 * The original 38 images are raster cartoons. These are the same idea — thick
 * outlines, flat colour, a gym behind a cheerful figure in black kit and neon
 * trainers — but drawn as vectors from one posable character, so that:
 *
 *   - each file is a few kilobytes instead of ~40, and sharp at any size;
 *   - adding an exercise is a pose (a dozen angles) rather than a new drawing;
 *   - every image shows the *movement*, with an arrow, not just a still.
 *
 * Run `node scripts/build-exercise-art.mjs` to regenerate. It writes one SVG
 * per entry in ART to client/public/exercise-images/ and prints the slugs, so
 * the list in client/src/lib/exercise-images.ts can be checked against it (a
 * test does that too).
 *
 * Angles are in degrees, absolute, measured the way you would on paper:
 * 0 points right, 90 points up. A limb is either a pair of directions —
 * [thigh, shin] or [upper arm, forearm] — or a target for the hand or ankle
 * ({ to: [x, y] }, { head: [dx, dy] }, { shoulder: [dx, dy] }), in which case
 * the elbow or knee is worked out, bending to the side `bend` says.
 *
 * Poses are drawn at any convenient size; each is scaled to fill the frame.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../client/public/exercise-images');

const W = 400;
const H = 600;
/** Where the floor is in a pose's own coordinates. */
const F = 468;
/** Where the floor is in the finished picture. */
const FLOOR = 504;
const INK = '#1b1410';

const r = n => Math.round(n * 10) / 10;
const rad = d => (d * Math.PI) / 180;
const deg = x => (x * 180) / Math.PI;
const step = ([x, y], angle, len) => [x + Math.cos(rad(angle)) * len, y - Math.sin(rad(angle)) * len];
const pts = list => list.map(([x, y]) => `${r(x)},${r(y)}`).join(' ');
const line = list => `M${pts(list).replace(/ /g, 'L')}`;

/** A limb: a fat rounded line with an ink outline underneath it. */
function limb(points, width, fill, { outline = 5 } = {}) {
  const d = line(points);
  return (
    `<path d="${d}" stroke="${INK}" stroke-width="${width + outline}"/>` +
    `<path d="${d}" stroke="${fill}" stroke-width="${width}"/>`
  );
}

/** Two bones from `from` reaching for `to`; returns the joint between them. */
function reach(from, to, l1, l2, bend) {
  const dx = to[0] - from[0];
  const dy = from[1] - to[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1), l1 + l2 - 0.5);
  const base = deg(Math.atan2(dy, dx));
  const inner = deg(Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const joint = step(from, base + bend * inner, l1);
  const end = step(from, base, d);
  return [joint, end];
}

const PEOPLE = {
  // Skin, shaded skin (far-side limbs), hair.
  sam: { skin: '#f2a67c', shade: '#d98a62', hair: '#5a3418', style: 'short' },
  jo: { skin: '#b9703f', shade: '#9a5a30', hair: '#1f1612', style: 'fade' },
  mia: { skin: '#f6c39a', shade: '#dea47b', hair: '#c9772b', style: 'pony' },
  kai: { skin: '#8a5a3c', shade: '#70462c', hair: '#15100d', style: 'pony' },
};

const KIT = '#22252b';
const KIT_SHADE = '#16181c';
const NEON = '#d7f23c';
const UPPER_ARM = 46;
const FOREARM = 44;
const THIGH = 62;
const SHIN = 58;

function head([cx, cy], facing, person, mirror) {
  const hair =
    person.style === 'fade'
      ? `<path d="M-26,-8C-27,-34 16,-39 25,-14C12,-24 -6,-23 -14,-12C-18,-6 -22,-4 -26,-8Z" fill="${person.hair}" stroke="${INK}" stroke-width="3"/>`
      : `<path d="M-28,-2C-34,-40 20,-46 28,-12C22,-20 14,-24 4,-22C-6,-20 -12,-12 -14,-2C-18,-8 -24,-8 -28,-2Z" fill="${person.hair}" stroke="${INK}" stroke-width="3"/>`;
  const pony =
    person.style === 'pony'
      ? `<path d="M-24,-16C-44,-22 -52,-2 -44,16C-40,4 -36,-4 -24,-6Z" fill="${person.hair}" stroke="${INK}" stroke-width="3"/>`
      : '';
  const beard =
    person.style === 'fade'
      ? `<path d="M-6,12C2,26 18,28 26,16C20,20 8,20 -6,12Z" fill="${person.hair}"/>`
      : '';
  return (
    `<g transform="translate(${r(cx)},${r(cy)}) rotate(${r(-facing)})${mirror ? ' scale(1,-1)' : ''}">` +
    pony +
    `<circle r="27" fill="${person.skin}" stroke="${INK}" stroke-width="3"/>` +
    hair +
    beard +
    // Ear, nose, then the face.
    `<ellipse cx="-9" cy="3" rx="6" ry="8" fill="${person.skin}" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="27" cy="3" rx="6.5" ry="5.5" fill="${person.skin}" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="11" cy="-6" rx="6.5" ry="8" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="22" cy="-7" rx="4.5" ry="7" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="13.5" cy="-5" r="3" fill="${INK}"/><circle cx="23.5" cy="-6" r="2.5" fill="${INK}"/>` +
    `<path d="M5,-17Q11,-21 17,-17" stroke="${INK}" stroke-width="2.5" fill="none"/>` +
    `<path d="M6,12Q15,21 24,11Z" stroke="${INK}" stroke-width="2.5" fill="#fff"/>` +
    `</g>`
  );
}

/**
 * Work out where every joint is. `pose`:
 *   hip       [x, y]
 *   torso     direction from hip to shoulder
 *   curl      how far the spine bows sideways, in px — a crunch is a curl
 *   neck      direction from shoulder to head (defaults to the torso's)
 *   face      direction the face points
 *   armN/F    near and far arm
 *   legN/F    near and far leg; a third number, or `foot`, aims the foot
 */
function solve(pose) {
  const T = pose.torsoLen ?? 92;
  const hip = pose.hip;
  const shoulder = step(hip, pose.torso, T);
  const mid = step(step(hip, pose.torso, T / 2), pose.torso + 90, pose.curl ?? 0);
  const neckDir = pose.neck ?? pose.torso;
  const neck = step(shoulder, neckDir, 16);
  const headAt = step(shoulder, neckDir, 40);
  const armFrom = step(shoulder, pose.torso, -6);

  const target = spec =>
    spec.to ??
    (spec.head ? [headAt[0] + spec.head[0], headAt[1] + spec.head[1]] : null) ??
    [shoulder[0] + spec.shoulder[0], shoulder[1] + spec.shoulder[1]];

  const arm = spec => {
    if (Array.isArray(spec)) {
      const elbow = step(armFrom, spec[0], UPPER_ARM);
      return { from: armFrom, elbow, wrist: step(elbow, spec[1], FOREARM) };
    }
    const [elbow, wrist] = reach(armFrom, target(spec), UPPER_ARM, FOREARM, spec.bend ?? 1);
    return { from: armFrom, elbow, wrist };
  };

  const leg = spec => {
    if (Array.isArray(spec)) {
      const knee = step(hip, spec[0], THIGH);
      const ankle = step(knee, spec[1], SHIN);
      const foot = spec[2] ?? spec[1] - 90;
      return { knee, ankle, foot, shin: spec[1], toe: step(ankle, foot, 26) };
    }
    const [knee, ankle] = reach(hip, spec.to, THIGH, SHIN, spec.bend ?? 1);
    const foot = spec.foot ?? 0;
    const shin = deg(Math.atan2(knee[1] - ankle[1], ankle[0] - knee[0]));
    return { knee, ankle, foot, shin, toe: step(ankle, foot, 26) };
  };

  return {
    hip, shoulder, mid, neck, headAt,
    armN: arm(pose.armN), armF: arm(pose.armF),
    legN: leg(pose.legN), legF: leg(pose.legF),
  };
}

function figure(pose, j, person) {
  const arm = (a, skin) =>
    limb([a.from, a.elbow, a.wrist], 19, skin) +
    `<circle cx="${r(a.wrist[0])}" cy="${r(a.wrist[1])}" r="10.5" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>`;

  const leg = (l, skin, kit) => {
    const sole = [step(l.ankle, l.foot - 90, 9), step(l.toe, l.foot - 90, 9)];
    const lace = [step(l.ankle, l.foot, 7), step(l.ankle, l.foot, 16)].map(p => step(p, l.foot + 90, 5));
    const thighDir = deg(Math.atan2(j.hip[1] - l.knee[1], l.knee[0] - j.hip[0]));
    return (
      limb([j.hip, l.knee, l.ankle], 25, skin) +
      // Shorts: the top of the thigh, redrawn in kit.
      limb([j.hip, step(j.hip, thighDir, 34)], 28, kit) +
      // Sock, shoe, neon sole and lace.
      limb([step(l.ankle, l.shin, -8), l.ankle], 22, '#f1f1ee', { outline: 4 }) +
      limb([l.ankle, l.toe], 19, KIT) +
      `<path d="${line(sole)}" stroke="${NEON}" stroke-width="5"/>` +
      `<path d="${line(lace)}" stroke="${NEON}" stroke-width="3"/>`
    );
  };

  const spine = `M${pts([j.hip])}Q${pts([j.mid])} ${pts([j.shoulder])}`;
  const torso =
    `<path d="${spine}" stroke="${INK}" stroke-width="55"/>` +
    `<path d="${spine}" stroke="${KIT}" stroke-width="50"/>`;

  const nearArm = arm(j.armN, person.skin);
  return (
    arm(j.armF, person.shade) +
    leg(j.legF, person.shade, KIT_SHADE) +
    limb([j.shoulder, j.neck], 17, person.skin) +
    torso +
    leg(j.legN, person.skin, KIT) +
    (pose.armBehindHead ? nearArm : '') +
    head(j.headAt, pose.face, person, pose.flip) +
    (pose.armBehindHead ? '' : nearArm)
  );
}

// ---------------------------------------------------------------- scenery

const ROOMS = {
  taupe: { wall: '#b3a59a', band: '#a39489', beam: '#8f8177', floor: '#3c4046', floorLine: '#2b2e33', poster: '#2b3440' },
  blue: { wall: '#3f9fc4', band: '#2f86aa', beam: '#256f8f', floor: '#8b8f96', floorLine: '#6f737a', poster: '#17384a' },
  sage: { wall: '#a9b8a6', band: '#97a894', beam: '#84957f', floor: '#454a4d', floorLine: '#303437', poster: '#2f3d33' },
};

const SLOGANS = [
  ['YOU GOT', 'THIS'], ['ONE MORE', 'REP'], ['STRONG', 'CORE'], ['SHOW UP', 'TODAY'],
  ['YOU CAN', 'YOU WILL'], ['EARN', 'IT'], ['KEEP', 'GOING'],
];

function room(name, index, posterX) {
  const c = ROOMS[name];
  const [top, bottom] = SLOGANS[index % SLOGANS.length];
  const px = posterX;
  return (
    `<rect width="${W}" height="${H}" fill="${c.wall}"/>` +
    `<rect y="250" width="${W}" height="${FLOOR - 250}" fill="${c.band}"/>` +
    // Ceiling beams and strip lights, as in the originals.
    `<path d="M0,56H${W}M0,120H${W}M120,0V120M300,0V120" stroke="${c.beam}" stroke-width="10" stroke-linecap="butt"/>` +
    `<path d="M40,88H170M250,30H370" stroke="#fff6dc" stroke-width="7"/>` +
    (px !== null
      ? `<rect x="${px}" y="146" width="130" height="78" rx="4" fill="${c.poster}" stroke="${INK}" stroke-width="3"/>` +
        `<text x="${px + 65}" y="180" fill="#fff" stroke="none" text-anchor="middle" font-family="Arial Black,Impact,Helvetica,Arial,sans-serif" font-weight="900" font-size="21">${top}</text>` +
        `<text x="${px + 65}" y="207" fill="${NEON}" stroke="none" text-anchor="middle" font-family="Arial Black,Impact,Helvetica,Arial,sans-serif" font-weight="900" font-size="21">${bottom}</text>`
      : '') +
    `<rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="${c.floor}"/>` +
    `<path d="M0,${FLOOR}H${W}" stroke="${c.floorLine}" stroke-width="4" stroke-linecap="butt"/>`
  );
}

const mat = (x1, x2) =>
  `<rect x="${r(x1)}" y="${F + 5}" width="${r(x2 - x1)}" height="12" rx="6" fill="#17b8a8" stroke="${INK}" stroke-width="3"/>`;

/** A curved arrow showing which way things move. */
function arrow(from, via, to) {
  const d = `M${pts([from])}Q${pts([via])} ${pts([to])}`;
  return (
    `<path d="${d}" stroke="#fff" stroke-width="11" fill="none"/>` +
    `<path d="${d}" stroke="#0ea5a0" stroke-width="6" fill="none" marker-end="url(#a)"/>`
  );
}

const plate = ([x, y], size = 36) =>
  `<circle cx="${r(x)}" cy="${r(y)}" r="${size}" fill="#2a2d33" stroke="${INK}" stroke-width="3.5"/>` +
  `<circle cx="${r(x)}" cy="${r(y)}" r="${r(size * 0.62)}" fill="none" stroke="#4a4f57" stroke-width="3"/>` +
  `<circle cx="${r(x)}" cy="${r(y)}" r="6" fill="#b9bec6" stroke="${INK}" stroke-width="2.5"/>`;

const kettlebell = ([x, y]) =>
  `<path d="M${r(x - 11)},${r(y + 2)}q11,-26 22,0" fill="none" stroke="${INK}" stroke-width="10"/>` +
  `<path d="M${r(x - 11)},${r(y + 2)}q11,-26 22,0" fill="none" stroke="#7b8794" stroke-width="5"/>` +
  `<circle cx="${r(x)}" cy="${r(y + 20)}" r="19" fill="#7b8794" stroke="${INK}" stroke-width="3.5"/>` +
  `<path d="M${r(x - 9)},${r(y + 12)}q4,-6 10,-6" stroke="#c9d1da" stroke-width="3.5"/>`;

const dumbbell = ([x, y]) =>
  `<rect x="${r(x - 15)}" y="${r(y - 15)}" width="30" height="30" rx="8" fill="#7b8794" stroke="${INK}" stroke-width="3.5"/>` +
  `<path d="M${r(x - 7)},${r(y - 7)}h9" stroke="#c9d1da" stroke-width="3.5"/>`;

/** An overhead bar on two uprights that run off the top of the picture. */
const bar = (y, x1, x2) =>
  `<path d="M${x1 + 12},${y}V-900M${x2 - 12},${y}V-900" stroke="${INK}" stroke-width="14" stroke-linecap="butt"/>` +
  `<path d="M${x1 + 12},${y}V-900M${x2 - 12},${y}V-900" stroke="#5c6068" stroke-width="9" stroke-linecap="butt"/>` +
  `<path d="M${x1},${y}H${x2}" stroke="${INK}" stroke-width="13"/><path d="M${x1},${y}H${x2}" stroke="#c3c8cf" stroke-width="8"/>`;

const bench = (x1, x2, y) =>
  `<path d="M${x1 + 26},${y + 8}V${F}M${x2 - 26},${y + 8}V${F}" stroke="${INK}" stroke-width="13" stroke-linecap="butt"/>` +
  `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="17" rx="8" fill="#31353c" stroke="${INK}" stroke-width="3.5"/>`;

// ------------------------------------------------------------------ poses

/** Ankle height when a foot is flat on the floor, and hip height lying down. */
const ON = F - 11;
const LYING = F - 24;
/** Hands gripping an overhead bar. */
const BAR = 150;

export const ART = {
  // ---- the ten core-block exercises -------------------------------------
  crunch: {
    who: 'sam', room: 'taupe', mat: true,
    pose: { hip: [210, LYING], torso: 154, curl: -12, neck: 132, face: 58, armBehindHead: true,
      armN: { head: [-22, 2], bend: -1 }, armF: { head: [-16, -8], bend: -1 },
      legN: { to: [298, ON] }, legF: { to: [282, ON] } },
    arrows: [[[70, 400], [52, 352], [80, 314]]],
  },
  'reverse-crunch': {
    who: 'jo', room: 'blue', mat: true,
    pose: { hip: [200, LYING - 18], torso: 188, curl: 8, neck: 180, face: 86,
      armN: { to: [258, F - 12], bend: -1 }, armF: { to: [244, F - 12], bend: -1 },
      legN: [112, 14, -62], legF: [102, 6, -66] },
    arrows: [[[300, 392], [296, 330], [246, 306]]],
  },
  'cross-leg-crunch': {
    who: 'mia', room: 'sage', mat: true,
    pose: { hip: [206, LYING], torso: 154, curl: -12, neck: 132, face: 58, armBehindHead: true,
      armN: { head: [-22, 2], bend: -1 }, armF: { head: [-16, -8], bend: -1 },
      legN: [66, 172, 116], legF: { to: [286, ON] } },
    arrows: [[[66, 400], [48, 352], [76, 314]]],
  },
  'side-oblique-crunch': {
    // The elbow travels across to the opposite knee.
    who: 'kai', room: 'taupe', mat: true,
    pose: { hip: [208, LYING], torso: 150, curl: -14, neck: 126, face: 44, armBehindHead: true,
      armN: { head: [-20, 4], bend: -1 }, armF: [70, 150],
      legN: { to: [296, ON] }, legF: { to: [280, ON] } },
    arrows: [[[120, 292], [176, 262], [222, 300]]],
  },
  'straight-leg-thrust': {
    who: 'sam', room: 'blue', mat: true,
    pose: { hip: [226, LYING - 30], torso: 198, curl: 12, neck: 180, face: 88,
      armN: { to: [296, F - 12], bend: -1 }, armF: { to: [282, F - 12], bend: -1 },
      legN: [92, 92, 180], legF: [84, 84, 172] },
    arrows: [[[292, 330], [302, 290], [292, 250]]],
  },
  'legs-up-vertical-crunch': {
    who: 'jo', room: 'sage', mat: true,
    pose: { hip: [226, LYING], torso: 150, curl: -14, neck: 128, face: 52,
      armN: [74, 72], armF: [66, 66], legN: [90, 90, 180], legF: [82, 82, 172] },
    arrows: [[[92, 388], [76, 338], [108, 300]]],
  },
  'jack-knife': {
    who: 'mia', room: 'taupe', mat: true,
    pose: { hip: [200, LYING], torso: 130, curl: -8, neck: 116, face: 28,
      armN: [30, 24], armF: [22, 18], legN: [38, 38, 128], legF: [32, 32, 122] },
    arrows: [[[80, 430], [58, 372], [92, 330]], [[340, 430], [356, 384], [330, 348]]],
  },
  'knee-raise': {
    who: 'kai', room: 'blue', hang: true,
    props: () => bar(BAR, 96, 304),
    extent: [[96, BAR - 14], [304, BAR]],
    pose: { hip: [200, 334], torso: 90, face: 0, armBehindHead: true,
      armN: { to: [166, BAR + 2], bend: 1 }, armF: { to: [236, BAR + 2], bend: -1 },
      legN: [14, -78, 10], legF: [4, -86, 0] },
    arrows: [[[268, 440], [300, 404], [284, 362]]],
  },
  'side-oblique-knee-raise': {
    // Knees come up and across, to one side.
    who: 'sam', room: 'sage', hang: true,
    props: () => bar(BAR, 96, 304),
    extent: [[96, BAR - 14], [304, BAR]],
    pose: { hip: [196, 334], torso: 94, curl: 10, face: 0, armBehindHead: true,
      armN: { to: [160, BAR + 2], bend: 1 }, armF: { to: [232, BAR + 2], bend: -1 },
      legN: [38, -52, 36], legF: [24, -64, 24] },
    arrows: [[[250, 444], [306, 420], [304, 350]]],
  },
  'side-oblique-leg-raise': {
    // Lying on one side, propped on an elbow, lifting the top leg.
    who: 'jo', room: 'taupe', mat: true,
    pose: { hip: [214, LYING - 2], torso: 160, curl: -6, neck: 112, face: 6,
      armN: [-50, -8], armF: { to: [112, F - 12], bend: 1 },
      legN: [30, 30, 120], legF: [-3, -3, 87] },
    arrows: [[[344, 430], [366, 380], [336, 338]]],
  },

  // ---- extras, for custom exercises -------------------------------------
  plank: {
    who: 'mia', room: 'blue', mat: true,
    pose: { hip: [170, F - 46], torso: 8, neck: 2, face: -38,
      armN: [-90, 0], armF: [-98, 4],
      legN: { to: [56, F - 16], bend: -1, foot: -100 }, legF: { to: [68, F - 16], bend: -1, foot: -100 } },
    arrows: [],
  },
  'bear-crawl': {
    who: 'kai', room: 'taupe',
    pose: { hip: [150, F - 92], torso: 4, neck: 0, face: -28,
      armN: { to: [262, F - 12], bend: 1 }, armF: { to: [226, F - 12], bend: 1 },
      legN: { to: [92, F - 16], bend: 1, foot: -100 }, legF: { to: [166, F - 16], bend: 1, foot: -100 } },
    arrows: [[[296, 330], [334, 322], [366, 342]]],
  },
  'mountain-climber': {
    who: 'sam', room: 'sage', mat: true,
    pose: { hip: [166, F - 82], torso: 12, neck: 6, face: -36,
      armN: { to: [256, F - 12], bend: 1 }, armF: { to: [244, F - 12], bend: 1 },
      legN: [-34, 196, -100], legF: { to: [52, F - 16], bend: -1, foot: -100 } },
    arrows: [[[120, 440], [166, 452], [206, 430]]],
  },
  'glute-bridge': {
    who: 'mia', room: 'taupe', mat: true,
    pose: { hip: [214, F - 76], torso: 215, neck: 164, face: 78,
      armN: { to: [206, F - 12], bend: 1 }, armF: { to: [190, F - 12], bend: 1 },
      legN: { to: [294, ON] }, legF: { to: [278, ON] } },
    arrows: [[[224, 356], [236, 322], [224, 290]]],
  },
  deadlift: {
    who: 'jo', room: 'blue',
    pose: { hip: [160, F - 124], torso: 40, neck: 28, face: -14,
      armN: [-88, -90], armF: [-92, -90],
      legN: { to: [190, ON], bend: 1 }, legF: { to: [176, ON], bend: 1 } },
    after: j => plate([j.armN.wrist[0] + 2, j.armN.wrist[1] + 4], 38),
    extent: j => [[j.armN.wrist[0] + 42, j.armN.wrist[1] + 42]],
    arrows: [[[318, 440], [336, 392], [318, 342]]],
  },
  'barbell-squat': {
    who: 'kai', room: 'taupe',
    pose: { hip: [168, F - 92], torso: 64, neck: 72, face: 0,
      armN: { shoulder: [-16, -4], bend: -1 }, armF: { shoulder: [-12, -8], bend: -1 },
      legN: { to: [196, ON], bend: 1 }, legF: { to: [180, ON], bend: 1 } },
    before: j => plate([j.shoulder[0] - 14, j.shoulder[1] - 4], 36),
    extent: j => [[j.shoulder[0] - 52, j.shoulder[1] - 42]],
    arrows: [[[316, 300], [334, 350], [316, 398]]],
  },
  'bench-press': {
    who: 'sam', room: 'sage',
    props: () => bench(84, 268, F - 66),
    pose: { hip: [232, F - 90], torso: 180, neck: 180, face: 88,
      armN: [92, 90], armF: [86, 88],
      legN: { to: [306, ON] }, legF: { to: [290, ON] } },
    after: j => plate([j.armN.wrist[0], j.armN.wrist[1] - 4], 36),
    extent: j => [[j.armN.wrist[0] - 40, j.armN.wrist[1] - 44]],
    arrows: [[[70, 350], [54, 304], [70, 258]]],
  },
  'pull-up': {
    who: 'mia', room: 'blue', hang: true,
    props: () => bar(BAR + 50, 96, 304),
    extent: [[96, BAR + 30], [304, BAR + 50]],
    pose: { hip: [200, 342], torso: 90, face: 0,
      armN: { to: [150, BAR + 52], bend: 1 }, armF: { to: [250, BAR + 52], bend: -1 },
      legN: [-84, -112, -30], legF: [-78, -122, -40] },
    arrows: [[[316, 350], [332, 298], [316, 246]]],
  },
  lunge: {
    who: 'jo', room: 'taupe',
    pose: { hip: [184, F - 86], torso: 88, face: 0,
      armN: [-94, -86], armF: [-84, -78],
      legN: [-8, -92, 0], legF: [-106, 192, -100] },
    after: j => dumbbell(j.armN.wrist),
    arrows: [[[310, 300], [326, 344], [310, 390]]],
  },
  'kettlebell-swing': {
    who: 'kai', room: 'sage',
    pose: { hip: [170, F - 122], torso: 80, face: 0,
      armN: [8, 4], armF: [2, 0],
      legN: { to: [186, ON], bend: 1 }, legF: { to: [170, ON], bend: 1 } },
    after: j => kettlebell([j.armN.wrist[0] + 16, j.armN.wrist[1] - 16]),
    extent: j => [[j.armN.wrist[0] + 44, j.armN.wrist[1] + 28]],
    arrows: [[[236, 390], [330, 380], [322, 290]]],
  },
  'farmers-carry': {
    who: 'sam', room: 'blue',
    pose: { hip: [190, F - 126], torso: 90, face: 0,
      armN: [-92, -88], armF: [-84, -90],
      legN: { to: [226, ON], bend: 1 }, legF: { to: [150, F - 18], bend: 1, foot: -30 } },
    after: j => kettlebell([j.armN.wrist[0], j.armN.wrist[1] + 2]),
    arrows: [[[272, 240], [312, 232], [348, 240]]],
  },
  'dumbbell-curl': {
    who: 'mia', room: 'taupe',
    pose: { hip: [190, F - 128], torso: 90, face: 0,
      armN: [-86, 66], armF: [-92, -86],
      legN: { to: [198, ON], bend: 1 }, legF: { to: [182, ON], bend: 1 } },
    after: j => dumbbell(j.armN.wrist),
    arrows: [[[276, 330], [300, 270], [262, 232]]],
  },
};

function svg(name, art, index) {
  const person = PEOPLE[art.who];
  const j = solve(art.pose);

  // Everything the picture has to contain, to work out how big to draw it.
  const extra = typeof art.extent === 'function' ? art.extent(j) : art.extent ?? [];
  const fat = (p, m) => [[p[0] - m, p[1] - m], [p[0] + m, p[1] + m]];
  const box = [
    ...fat(j.headAt, 34), ...fat(j.hip, 30), ...fat(j.shoulder, 30),
    ...[j.armN, j.armF].flatMap(a => [...fat(a.elbow, 14), ...fat(a.wrist, 14)]),
    ...[j.legN, j.legF].flatMap(l => [...fat(l.knee, 16), ...fat(l.ankle, 16), ...fat(l.toe, 14)]),
    ...art.arrows.flat(), ...extra,
  ];
  const xs = box.map(p => p[0]);
  const ys = box.map(p => p[1]);
  const [x1, x2] = [Math.min(...xs), Math.max(...xs)];
  const y1 = Math.min(...ys);
  // On the floor, the floor is the bottom edge whatever the pose reaches.
  const y2 = art.hang ? Math.max(...ys) : F;

  const top = art.hang ? 44 : 150;
  const bottom = art.hang ? FLOOR - 26 : FLOOR;
  const scale = Math.min((W - 28) / (x2 - x1), (bottom - top) / (y2 - y1), 1.9);
  const tx = W / 2 - ((x1 + x2) / 2) * scale;
  const ty = bottom - y2 * scale;

  // The poster goes on whichever side the figure is not, preferring to
  // alternate so a sheet of these does not look stamped out — and is left
  // off altogether when the figure needs the whole wall.
  // `box` is a run of corner pairs for the body parts, then loose points.
  // Body parts are tested as rectangles: a head can sit squarely over a
  // poster without any one of its corners landing inside it.
  const bodyParts = box.length - art.arrows.flat().length - extra.length;
  const clear = px => {
    const hit = (ax, ay, bx, by) =>
      bx * scale + tx > px - 8 && ax * scale + tx < px + 138 &&
      by * scale + ty > 138 && ay * scale + ty < 232;
    for (let i = 0; i < bodyParts; i += 2) {
      if (hit(box[i][0], box[i][1], box[i + 1][0], box[i + 1][1])) return false;
    }
    return !box.slice(bodyParts).some(([x, y]) => hit(x, y, x, y));
  };
  const sides = index % 2 ? [236, 34] : [34, 236];
  const posterX = art.hang ? null : sides.find(clear) ?? null;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
    `<title>${name.replace(/-/g, ' ')}</title>` +
    `<defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto"><path d="M0,0L10,5L0,10Z" fill="#0ea5a0" stroke="#fff" stroke-width="1"/></marker></defs>` +
    `<g stroke-linecap="round" stroke-linejoin="round" fill="none">` +
    room(art.room, index, posterX) +
    `<g transform="translate(${r(tx)},${r(ty)}) scale(${Math.round(scale * 1000) / 1000})">` +
    (art.mat ? mat(x1 + 6, x2 - 6) : '') +
    (art.props ? art.props(j) : '') +
    (art.before ? art.before(j) : '') +
    figure(art.pose, j, person) +
    (art.after ? art.after(j) : '') +
    art.arrows.map(a => arrow(...a)).join('') +
    `</g></g></svg>\n`
  );
}

mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
Object.entries(ART).forEach(([name, art], index) => {
  const out = svg(name, art, index);
  total += out.length;
  writeFileSync(join(OUT_DIR, `${name}.svg`), out);
});
console.log(`${Object.keys(ART).length} images, ${(total / 1024).toFixed(1)} KB total`);
console.log(Object.keys(ART).join('\n'));
