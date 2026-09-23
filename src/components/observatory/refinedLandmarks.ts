import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBrain } from './brainSculpture';

// The four sculptures share a quiet material language with the rest of the world.
// Geometries used repeatedly within a sculpture are kept local to its builder.
function material(color: number, roughness = 0.7, metalness = 0.04, emissive = 0, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function solid(geometry: THREE.BufferGeometry, surface: THREE.Material, decorative = false) {
  const object = new THREE.Mesh(geometry, surface);
  object.castShadow = !decorative;
  object.receiveShadow = !decorative;
  if (decorative) object.userData.decorative = true;
  return object;
}

export function roundedPanel(width: number, height: number, depth: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(radius * 0.18, 0.035),
    bevelThickness: Math.min(depth * 0.16, 0.025),
    curveSegments: 2,
    steps: 1,
  });
}

export function roundedFrame(width: number, height: number, depth: number, radius: number, border: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const opening = new THREE.Path();
  opening.moveTo(x + border, y + border);
  opening.lineTo(x + border, y + height - border);
  opening.lineTo(x + width - border, y + height - border);
  opening.lineTo(x + width - border, y + border);
  opening.closePath();
  shape.holes.push(opening);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2, steps: 1 });
}

function panel(group: THREE.Group, geometry: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number, decorative = false) {
  const object = solid(geometry, surface, decorative);
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function tube(points: THREE.Vector3[], radius: number, surface: THREE.Material, decorative = false) {
  return solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, radius, 5, false), surface, decorative);
}

export function makeOpenCouch(): THREE.Group {
  const group = new THREE.Group();
  const plum = material(0x806fb1, 0.94);
  const seat = material(0xb6a5de, 0.96);
  const piping = material(0xdad0ee, 0.83);
  const wood = material(0x65516b, 0.72, 0.05);
  const pillowA = material(0x87c6bf, 0.94);
  const pillowB = material(0xe4b67c, 0.94);

  // The broad seat, inset cushions and soft arms read as a single upholstered sofa.
  const base = solid(roundedPanel(2.22, 1.16, 0.25, 0.14), wood);
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, 0.3, 0);
  group.add(base);
  const cushionGeometry = new THREE.SphereGeometry(1, 12, 8);
  for (const side of [-1, 1]) {
    const cushion = solid(cushionGeometry, seat);
    cushion.name = `opencouch-cushion-${side < 0 ? 0 : 1}`;
    cushion.scale.set(0.53, 0.2, 0.48);
    cushion.position.set(side * 0.48, 0.64, 0.04);
    group.add(cushion);

    const back = solid(cushionGeometry, plum);
    back.scale.set(0.55, 0.49, 0.19);
    back.position.set(side * 0.48, 1.02, -0.43);
    back.rotation.x = -0.13;
    group.add(back);

    const arm = solid(cushionGeometry, plum);
    arm.scale.set(0.18, 0.37, 0.59);
    arm.position.set(side * 1.04, 0.78, -0.02);
    group.add(arm);
  }
  const pillowGeometry = new THREE.SphereGeometry(1, 12, 8);
  for (const [side, surface] of [[-1, pillowA], [1, pillowB]] as const) {
    const pillow = solid(pillowGeometry, surface);
    pillow.scale.set(0.26, 0.27, 0.1);
    pillow.position.set(side * 0.58, 1.03, -0.19);
    pillow.rotation.z = side * -0.22;
    group.add(pillow);
  }
  const edge = solid(new THREE.CylinderGeometry(0.018, 0.018, 1.9, 6), piping, true);
  edge.rotation.z = Math.PI / 2;
  edge.position.set(0, 0.49, 0.47);
  group.add(edge);
  const legGeometry = new THREE.CylinderGeometry(0.075, 0.11, 0.25, 7);
  for (const x of [-0.82, 0.82]) {
    const leg = solid(legGeometry, wood);
    leg.position.set(x, 0.14, 0.34);
    group.add(leg);
  }

  // A warm reading lamp and an open journal turn the sofa into a place to reflect.
  const brass = material(0xc9a36b, 0.4, 0.55);
  const lampBase = solid(new THREE.CylinderGeometry(0.17, 0.2, 0.05, 12), brass);
  lampBase.position.set(1.42, 0.2, -0.3);
  group.add(lampBase);
  const pole = solid(new THREE.CylinderGeometry(0.022, 0.022, 1.42, 6), brass);
  pole.position.set(1.42, 0.92, -0.3);
  group.add(pole);
  const shade = solid(new THREE.CylinderGeometry(0.17, 0.32, 0.32, 14, 1, true), new THREE.MeshStandardMaterial({
    color: 0xf6dfb8, roughness: 0.8, emissive: 0xffc47d, emissiveIntensity: 0.55, side: THREE.DoubleSide,
  }), true);
  shade.name = 'opencouch-shade';
  shade.position.set(1.42, 1.72, -0.3);
  group.add(shade);
  const bulb = solid(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2b3, toneMapped: false }), true);
  bulb.name = 'opencouch-lamp';
  bulb.position.set(1.42, 1.64, -0.3);
  group.add(bulb);

  const journal = new THREE.Group();
  journal.position.set(0.5, 0.79, 0.08);
  journal.rotation.set(-0.12, -0.35, 0);
  const cover = solid(new THREE.BoxGeometry(0.62, 0.03, 0.42), material(0xb85c52, 0.7), true);
  journal.add(cover);
  const paper = material(0xf5efe2, 0.9);
  const lines = material(0x9fb3c8, 0.8);
  for (const side of [-1, 1]) {
    const page = solid(new THREE.BoxGeometry(0.28, 0.018, 0.38), paper, true);
    page.position.set(side * 0.145, 0.035, 0);
    page.rotation.z = side * -0.12;
    journal.add(page);
    for (let row = 0; row < 3; row++) {
      const line = solid(new THREE.BoxGeometry(0.18, 0.006, 0.014), lines, true);
      line.position.set(side * 0.15, 0.047 + (side > 0 ? -0.018 : 0), -0.1 + row * 0.08);
      line.rotation.z = side * -0.12;
      journal.add(line);
    }
  }
  group.add(journal);
  return group;
}

export function makeQuant(): THREE.Group {
  const group = new THREE.Group();
  group.rotation.y = 0.48;
  const casing = material(0xdce4df, 0.34, 0.38);
  const screen = material(0x102e35, 0.49, 0.12);
  const cyan = material(0x78d8c8, 0.43, 0.09, 0x50a99f, 0.22);
  const coral = material(0xea8e7d, 0.5, 0.04);
  const amber = material(0xf1bb75, 0.45, 0.08);

  panel(group, roundedPanel(2.5, 1.78, 0.14, 0.11), casing, 0, 1.28, -0.26);
  panel(group, roundedPanel(2.31, 1.59, 0.035, 0.06), screen, 0, 1.36, -0.08);

  const bar = new THREE.BoxGeometry(0.25, 1, 0.055);
  const wick = new THREE.BoxGeometry(0.022, 1, 0.025);
  const candles: Array<[number, number, number, THREE.Material]> = [
    [-0.82, 1.08, 0.49, cyan],
    [-0.28, 1.29, 0.7, cyan],
    [0.29, 1.19, 0.38, coral],
    [0.84, 1.52, 0.64, cyan],
  ];
  candles.forEach(([x, y, height, surface], index) => {
    const stem = solid(wick, casing, true);
    stem.name = `quant-wick-${index}`;
    stem.userData.height = height + 0.2;
    stem.scale.y = height + 0.2;
    stem.position.set(x, y, -0.008);
    group.add(stem);
    const body = solid(bar, surface, true);
    body.name = `quant-candle-${index}`;
    body.userData.height = height;
    body.scale.y = height;
    body.position.set(x, y, 0.019);
    group.add(body);
  });
  // A single measured path adds direction without crowding the candlestick display.
  const trend = tube([
    new THREE.Vector3(-1.01, 0.72, 0.06),
    new THREE.Vector3(-0.7, 0.77, 0.06),
    new THREE.Vector3(-0.23, 0.89, 0.06),
    new THREE.Vector3(0.28, 0.8, 0.06),
    new THREE.Vector3(0.92, 1.01, 0.06),
  ], 0.017, amber, true);
  group.add(trend);
  const neck = solid(new THREE.CylinderGeometry(0.09, 0.12, 0.51, 8), casing);
  neck.position.y = 0.55;
  group.add(neck);
  const foot = solid(new THREE.CylinderGeometry(0.48, 0.6, 0.16, 12), casing);
  foot.position.y = 0.22;
  group.add(foot);
  return group;
}

export function makeMentalGym(): THREE.Group {
  const group = new THREE.Group();
  // Turn the brain side-on to the home view so its profile and handle both read.
  group.rotation.y = -0.79;
  // Low metalness: without an environment map, a true metal would render black.
  const iron = material(0x5d6a78, 0.38, 0.3);
  const rubber = material(0x264b4a, 0.92, 0.02);
  const plates = material(0x8c79bd, 0.48, 0.2);

  // A training mat and a small stack of plates set the scene as a gym.
  const mat = solid(roundedPanel(2.5, 1.7, 0.07, 0.22), rubber);
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.12;
  group.add(mat);
  const plateGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 20);
  [0, 1].forEach(layer => {
    const plate = solid(plateGeometry, plates);
    plate.position.set(0.4 + layer * 0.03, 0.27 + layer * 0.11, 1.18);
    group.add(plate);
  });
  // Rep lights come on at widening intervals: spaced repetition.
  const repGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12);
  [0, 1, 2].forEach(index => {
    const rep = solid(repGeometry, material(0xb9f7e6, 0.4, 0, 0x6fe0cf, 0.2), true);
    rep.name = `mental-gym-rep-${index}`;
    rep.position.set(0.95, 0.21, -0.35 + index * 0.24);
    group.add(rep);
  });

  // The kettlebell: a brain for a bell, an iron handle over the top, a flat foot.
  const kettlebell = new THREE.Group();
  kettlebell.name = 'mental-gym-kettlebell';
  kettlebell.position.y = 0.2;
  kettlebell.scale.setScalar(0.92);
  const brain = createBrain();
  brain.position.y = 0.1;
  kettlebell.add(brain);
  const foot = solid(new THREE.CylinderGeometry(0.44, 0.52, 0.14, 28), iron);
  foot.position.y = 0.1;
  kettlebell.add(foot);
  // The handle arcs front to back, over the fissure, and runs into the brain.
  const arc = Math.PI * 1.3;
  const handle = solid(new THREE.TorusGeometry(0.56, 0.1, 12, 32, arc), iron);
  handle.rotation.set(0, Math.PI / 2, -(arc - Math.PI) / 2);
  handle.position.y = 1.25;
  kettlebell.add(handle);
  group.add(kettlebell);
  return group;
}

export function makeClaudeAnatomy(): THREE.Group {
  const group = new THREE.Group();
  // The home view is northeast of this island; turn the diagram toward it.
  group.rotation.y = 0.63;
  const copper = material(0xd89b7c, 0.38, 0.36);
  const dark = material(0x193038, 0.56, 0.16);
  const trace = material(0x79d6c7, 0.42, 0.1, 0x4fb5a6, 0.28);
  const signal = material(0xf2be79, 0.32, 0.17, 0xf2be79, 1.1);
  const loop = material(0x8ff3e2, 0.3, 0.1, 0x6fe0cf, 1.2);
  const tool = material(0xe9eee6, 0.4, 0.35);
  const glass = new THREE.MeshStandardMaterial({ color: 0x92d7d0, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });

  // An exploded view, read bottom to top: tools, the agent loop, the prompt.
  const paneGeometry = roundedPanel(1.5, 0.56, 0.03, 0.08);
  const frameGeometry = roundedFrame(1.58, 0.64, 0.045, 0.1, 0.05);
  const layers = [0, 1, 2].map(index => {
    const layer = new THREE.Group();
    layer.name = `anatomy-layer-${index}`;
    layer.position.set((index - 1) * 0.1, 0.78 + index * 0.74, 0);
    // Tilt each layer back so its face meets a camera looking down on the island.
    layer.rotation.x = -0.34;
    panel(layer, paneGeometry, glass, 0, 0, 0, true);
    panel(layer, frameGeometry, copper, 0, 0, -0.005);
    // A short caption bar, as on a labelled diagram.
    panel(layer, roundedPanel(0.34, 0.045, 0.02, 0.018), trace, 0.36, -0.14 + index * 0.02, 0.05, true);
    panel(layer, roundedPanel(0.22, 0.045, 0.02, 0.018), trace, 0.3, 0.02, 0.05, true);
    group.add(layer);
    return layer;
  });

  // Tools: a wrench beside a small grid of tool slots.
  const handle = solid(new THREE.BoxGeometry(0.34, 0.06, 0.04), tool, true);
  handle.position.set(-0.42, 0, 0.06);
  handle.rotation.z = 0.5;
  layers[0].add(handle);
  const jaw = solid(new THREE.TorusGeometry(0.075, 0.03, 5, 12, Math.PI * 1.45), tool, true);
  jaw.position.set(-0.28, 0.08, 0.06);
  jaw.rotation.z = 0.5 - Math.PI * 0.72;
  layers[0].add(jaw);
  for (let slot = 0; slot < 3; slot++) {
    panel(layers[0], roundedPanel(0.12, 0.12, 0.03, 0.025), dark, -0.05 + slot * 0.17 - 0.2, -0.14, 0.04, true);
  }

  // The agent loop: an almost-closed ring with an arrowhead.
  const ring = solid(new THREE.TorusGeometry(0.17, 0.034, 6, 28, Math.PI * 1.62), loop, true);
  ring.name = 'anatomy-core';
  ring.position.set(-0.3, 0, 0.06);
  ring.rotation.z = 0.35;
  layers[1].add(ring);
  // The arrowhead rides the ring, pointing along its counter-clockwise turn.
  const arrow = solid(new THREE.ConeGeometry(0.075, 0.14, 3), loop, true);
  const end = Math.PI * 1.62;
  arrow.position.set(Math.cos(end) * 0.17, Math.sin(end) * 0.17, 0);
  arrow.rotation.z = end;
  ring.add(arrow);

  // The prompt: a terminal chevron and cursor.
  layers[2].add(tube([
    new THREE.Vector3(-0.52, 0.12, 0.06),
    new THREE.Vector3(-0.38, 0, 0.06),
    new THREE.Vector3(-0.52, -0.12, 0.06),
  ], 0.034, signal, true));
  const cursor = panel(layers[2], roundedPanel(0.16, 0.05, 0.025, 0.018), signal, -0.2, -0.11, 0.05, true);
  cursor.name = 'anatomy-cursor';

  // Leader lines join the layers; they stretch as the diagram opens.
  const leaderGeometry = mergeGeometries([-0.8, 0.8].map(x => new THREE.CylinderGeometry(0.012, 0.012, 1, 5).translate(x, 0, 0)));
  const leaderMaterial = new THREE.MeshBasicMaterial({ color: 0x79d6c7, transparent: true, opacity: 0.55, depthWrite: false });
  [0, 1].forEach(index => {
    const leader = solid(leaderGeometry, leaderMaterial, true);
    leader.name = `anatomy-leader-${index}`;
    group.add(leader);
  });

  const foot = solid(new THREE.CylinderGeometry(0.62, 0.78, 0.14, 10), dark);
  foot.position.y = 0.16;
  group.add(foot);
  const stem = solid(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), copper);
  stem.position.set(0, 0.5, -0.08);
  group.add(stem);
  return group;
}
