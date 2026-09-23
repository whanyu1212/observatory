import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ProjectId } from './curiosity';
import { makeGem, makeWisp, makeKrill } from './projectLandmarks';
import { makeOpenCouch, makeQuant, makeMentalGym, makeClaudeAnatomy, roundedPanel } from './refinedLandmarks';
import { createAsteroidGeometry, createIslandRockGeometry } from './rockGeometry';
import { createRockMaterial } from './rockSurface';

export const WORLD_POINTS: Record<ProjectId, THREE.Vector3> = {
  // Island origins: Y is the elevation of the whole island, including its sculpture.
  // Leave an open launch area: projects sit about 12% farther from the home rock.
  'gem-dota': new THREE.Vector3(-2.13, 2.4, -8.56),
  wisp: new THREE.Vector3(-3.58, 2.6, 5.78),
  krill: new THREE.Vector3(-9.52, -0.9, 12.94),
  opencouch: new THREE.Vector3(6.27, -1.9, -6.43),
  nimble: new THREE.Vector3(9.86, 2.9, -10.69),
  quantrl: new THREE.Vector3(-1.46, -0.6, 15.63),
  'fractional-bonds': new THREE.Vector3(12.1, 0.2, 6.22),
  'shipping-ml': new THREE.Vector3(16.91, -1.2, -3.63),
  'mental-gym': new THREE.Vector3(5.38, 1.2, 9.7),
  'claude-code-anatomy': new THREE.Vector3(-7.73, 1.4, -3.97),
};

const islandOrigins = Object.values(WORLD_POINTS);
export const WORLD_BOUNDS = {
  minX: Math.min(...islandOrigins.map(point => point.x)) - 3,
  maxX: Math.max(...islandOrigins.map(point => point.x)) + 3,
  minZ: Math.min(...islandOrigins.map(point => point.z)) - 3,
  maxZ: Math.max(...islandOrigins.map(point => point.z)) + 3,
};

export type WorldBuild = {
  group: THREE.Group;
  /** Height above each island's origin where its label should float. */
  labelOffsets: Record<ProjectId, number>;
  ground: THREE.Object3D[];
  pickers: Map<THREE.Object3D, ProjectId>;
  hoverPickers: Map<THREE.Object3D, ProjectId>;
  animated: THREE.Object3D[];
  explorer: THREE.Group;
  hoverLight: THREE.PointLight;
};

const C = {
  ink: 0xedf2e8,
  cream: 0xd9e1d6,
  lime: 0xd9f991,
  limeDeep: 0x8faf54,
  aqua: 0x77d7c8,
  amber: 0xf4b866,
  violet: 0x9e8de3,
  coral: 0xe47f72,
  rock: 0x172527,
  rockSide: 0x101b1d,
  void: 0x071012,
};

function standard(color: number, roughness = 0.72, metalness = 0.08, emissive = 0, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position?: THREE.Vector3) {
  const value = new THREE.Mesh(geometry, material);
  if (position) value.position.copy(position);
  value.castShadow = !material.transparent;
  value.receiveShadow = !material.transparent;
  return value;
}

function addBox(group: THREE.Group, size: [number, number, number], pos: [number, number, number], material: THREE.Material, rotation?: [number, number, number]) {
  const value = mesh(new THREE.BoxGeometry(...size), material);
  value.position.set(...pos);
  if (rotation) value.rotation.set(...rotation);
  group.add(value);
  return value;
}

function addCylinder(group: THREE.Group, radiusTop: number, radiusBottom: number, height: number, pos: [number, number, number], material: THREE.Material, segments = 12) {
  const value = mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  value.position.set(...pos);
  group.add(value);
  return value;
}

function rodBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const delta = b.clone().sub(a);
  const value = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), material);
  value.position.copy(a).add(b).multiplyScalar(0.5);
  value.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return value;
}

function islandNoise(seed: number, index: number) {
  const value = Math.sin(seed * 91.73 + index * 47.19) * 43758.5453;
  return value - Math.floor(value);
}

function irregularIsland(
  x: number,
  z: number,
  rx: number,
  rz: number,
  rotation: number,
  seed: number,
  rockMaterial: THREE.Material,
  fragmentGeometries: THREE.BufferGeometry[],
  animated: THREE.Object3D[],
) {
  const island = new THREE.Group();
  island.position.set(x, 0, z);
  island.rotation.y = rotation;

  const cap = mesh(createIslandRockGeometry(rx, rz, seed), rockMaterial);
  island.add(cap);

  // The fragments orbit as one restrained cluster, reinforcing that each island is free-floating.
  const fragments = new THREE.Group();
  fragments.position.y = -0.28;
  const fragmentCount = rx < 1.5 ? 2 : 3;
  for (let index = 0; index < fragmentCount; index += 1) {
    const angle = islandNoise(seed + 20, index) * Math.PI * 2;
    const distance = Math.max(rx, rz) * (1.04 + islandNoise(seed + 22, index) * 0.18);
    const fragment = mesh(fragmentGeometries[(seed + index) % fragmentGeometries.length], rockMaterial);
    fragment.position.set(
      Math.cos(angle) * distance,
      -0.15 - islandNoise(seed + 26, index) * 0.85,
      Math.sin(angle) * distance,
    );
    const size = 0.14 + islandNoise(seed + 24, index) * 0.12;
    fragment.scale.set(size * 1.25, size * (0.7 + islandNoise(seed + 28, index) * 0.65), size * 0.85);
    fragment.rotation.set(angle * 0.3, angle, angle * 0.18);
    fragments.add(fragment);
  }
  fragments.userData.spinY = (seed % 2 ? -1 : 1) * (0.025 + islandNoise(seed, 45) * 0.018);
  fragments.userData.bobAmplitude = 0.035;
  fragments.userData.bobSpeed = 0.45 + islandNoise(seed, 46) * 0.25;
  fragments.userData.phase = seed * 0.7;
  fragments.userData.baseY = fragments.position.y;
  fragments.userData.baseScale = fragments.scale.clone();
  animated.push(fragments);
  island.add(fragments);

  return { island, cap };
}

function glowingRing(radius: number, tube: number, color = C.lime) {
  return mesh(
    new THREE.TorusGeometry(radius, tube, 8, 36),
    standard(color, 0.28, 0.25, color, 1.35),
  );
}


function makeNimble() {
  const group = new THREE.Group();
  const shell = standard(C.cream, 0.38, 0.2);
  const visor = standard(0x14232b, 0.22, 0.3);
  // Three independent agents, in Julia's purple, green, and red.
  const agents = [[-0.84, 0.22, 0.35, 0xa78bea], [0, 0.66, -0.38, 0x8ac86d], [0.88, 0.2, 0.38, 0xe78187]];
  agents.forEach(([x, y, z, color], index) => {
    const bot = new THREE.Group();
    bot.name = `nimble-agent-${index}`;
    bot.position.set(x, y, z);
    const head = mesh(new THREE.SphereGeometry(0.5, 20, 14), standard(color, 0.36, 0.15));
    head.scale.set(1, 0.9, 0.9); head.position.y = 1.06; bot.add(head);
    const face = mesh(new THREE.SphereGeometry(0.4, 16, 10), visor);
    face.scale.set(1, 0.6, 0.22); face.position.set(0.13, 1.06, 0.37); face.rotation.y = 0.25; bot.add(face);
    [-0.13, 0.13].forEach(dx => {
      const eye = mesh(new THREE.SphereGeometry(0.065, 8, 6), standard(C.ink, 0.2, 0, C.aqua, 1.4));
      eye.position.set(dx + 0.14, 1.1, 0.462); bot.add(eye);
    });
    const body = mesh(new THREE.CapsuleGeometry(0.25, 0.25, 4, 12), shell);
    body.position.y = 0.4; bot.add(body);
    bot.add(rodBetween(new THREE.Vector3(0, 1.45, 0), new THREE.Vector3(0, 1.73, 0), 0.028, shell));
    const tip = mesh(new THREE.SphereGeometry(0.075, 10, 8), standard(color, 0.3, 0, color, 1));
    tip.name = `nimble-antenna-${index}`;
    tip.position.y = 1.75; bot.add(tip);
    bot.userData.bobAmplitude = 0.06; bot.userData.bobSpeed = 1.7; bot.userData.phase = index * 2;
    group.add(bot);
  });
  const link = glowingRing(1.22, 0.035, C.violet);
  link.rotation.x = Math.PI / 2; link.position.y = 0.15; group.add(link);
  const signal = new THREE.Group();
  signal.name = 'nimble-handoff';
  signal.visible = false;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), new THREE.MeshBasicMaterial({ color: C.lime, toneMapped: false }));
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), new THREE.MeshBasicMaterial({ color: C.lime, transparent: true, opacity: 0.23, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  core.userData.decorative = true;
  glow.userData.decorative = true;
  signal.add(core, glow);
  group.add(signal);
  return group;
}


function makeBonds() {
  const group = new THREE.Group();
  const gold = standard(C.amber, 0.28, 0.5);
  const bright = standard(0xffd998, 0.28, 0.35, C.amber, 0.15);
  const coin = new THREE.Group();
  coin.name = 'bonds-coin';
  coin.position.y = 1.7; coin.rotation.y = 0.42; coin.rotation.z = -0.12;
  // Four separated quarters make fractional ownership visible in the object itself.
  for (let index = 0; index < 4; index++) {
    const start = index * Math.PI / 2 + 0.035;
    const finish = (index + 1) * Math.PI / 2 - 0.035;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.absarc(0, 0, 1.03, start, finish, false); shape.lineTo(0, 0);
    const slice = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, curveSegments: 12 }), index === 1 ? bright : gold);
    slice.name = `bonds-quarter-${index}`;
    const middle = (start + finish) / 2;
    const separation = index === 1 ? 0.25 : 0.07;
    slice.position.set(Math.cos(middle) * separation, Math.sin(middle) * separation, 0);
    coin.add(slice);
  }
  // Ethereum's mark: a tall upper pyramid over a shorter lower one, split by a seam.
  const ether = new THREE.MeshStandardMaterial({ color: 0x8c9cf0, roughness: 0.28, metalness: 0.45, emissive: 0x3d4fb8, emissiveIntensity: 0.25, flatShading: true });
  const seal = new THREE.Group();
  seal.name = 'bonds-eth';
  seal.position.set(0, 0.02, 0.42);
  const crown = mesh(new THREE.ConeGeometry(0.27, 0.52, 4), ether);
  crown.position.y = 0.24;
  const base = mesh(new THREE.ConeGeometry(0.27, 0.32, 4), ether);
  base.rotation.x = Math.PI;
  base.position.y = -0.18;
  seal.add(crown, base);
  seal.rotation.y = Math.PI / 4;
  coin.add(seal);
  group.add(coin);
  [-0.76, 0.65].forEach((x, index) => {
    for (let layer = 0; layer < index + 2; layer++) addCylinder(group, 0.42, 0.42, 0.12, [x, 0.17 + layer * 0.14, 0.3], gold, 24);
  });
  return group;
}

/** Gate positions along the conveyor, shared with the deployment animation. */
// The belt runs right to left into the rack, keeping it clear of where the explorer parks.
export const SHIPPING_GATES = [0.98, 0.58, 0.18];
export const SHIPPING_BELT = { start: 1.34, end: -0.1, y: 0.62 };

function makeShipping() {
  const group = new THREE.Group();
  group.rotation.y = 0.45;
  const shell = standard(0xb6ced0, 0.48, 0.25);
  const face = standard(0x162d39, 0.7, 0.1);
  const vent = standard(0x667f8b, 0.65, 0.12);

  // Production: the serving rack on the left.
  const rack = new THREE.Group();
  rack.position.x = -0.92;
  rack.scale.setScalar(0.9);
  const base = mesh(new RoundedBoxGeometry(1.94, 0.18, 1.38, 1, 0.06), face);
  base.position.y = 0.13;
  rack.add(base);
  const trayGeometry = new RoundedBoxGeometry(1.72, 0.42, 1.2, 1, 0.075);
  const faceGeometry = new RoundedBoxGeometry(1.48, 0.25, 0.035, 1, 0.015);
  const ventGeometry = new THREE.BoxGeometry(0.65, 0.032, 0.025);
  for (let index = 0; index < 3; index++) {
    const y = 0.48 + index * 0.52;
    const tray = mesh(trayGeometry, shell);
    tray.position.y = y;
    rack.add(tray);
    const front = mesh(faceGeometry, face);
    front.position.set(0, y, 0.607);
    rack.add(front);
    for (const offset of [-0.055, 0.055]) {
      const slit = mesh(ventGeometry, vent);
      slit.position.set(-0.18, y + offset, 0.64);
      slit.castShadow = false;
      slit.userData.decorative = true;
      rack.add(slit);
    }
  }
  // The intake slot the model disappears into.
  const intake = mesh(new RoundedBoxGeometry(0.06, 0.34, 0.5, 1, 0.02), standard(0x0a171d, 0.8, 0.05, C.aqua, 0.25));
  intake.position.set(0.87, 0.48, 0);
  rack.add(intake);
  group.add(rack);

  // The pipeline: a belt from the notebook, through validate, track and serve gates.
  const beltLength = SHIPPING_BELT.end - SHIPPING_BELT.start + 0.2;
  const beltX = (SHIPPING_BELT.start + SHIPPING_BELT.end) / 2;
  const belt = mesh(new THREE.BoxGeometry(beltLength, 0.08, 0.5), standard(0x51666e, 0.62, 0.12));
  belt.position.set(beltX, SHIPPING_BELT.y - 0.09, 0);
  group.add(belt);
  // Chevrons on the belt point the way to production.
  const flow = Math.sign(SHIPPING_BELT.end - SHIPPING_BELT.start);
  const chevron = new THREE.Shape([
    new THREE.Vector2(0.06, 0), new THREE.Vector2(-0.05, 0.13), new THREE.Vector2(-0.11, 0.13),
    new THREE.Vector2(0, 0), new THREE.Vector2(-0.11, -0.13), new THREE.Vector2(-0.05, -0.13),
  ]);
  const chevrons = mesh(mergeGeometries([0.78, 0.38, -0.02].map(x => new THREE.ShapeGeometry(chevron)
    .rotateX(-Math.PI / 2).scale(flow, 1, 1).translate(x, 0, 0))),
  // Mirroring the shape flips its winding, so draw both faces.
  new THREE.MeshStandardMaterial({ color: 0xc9f3e6, roughness: 0.5, emissive: 0x5fe0a4, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
  chevrons.position.y = SHIPPING_BELT.y - 0.045;
  chevrons.castShadow = false;
  chevrons.userData.decorative = true;
  group.add(chevrons);
  const frame = mesh(mergeGeometries([
    new THREE.BoxGeometry(beltLength, 0.05, 0.04).translate(0, 0, 0.27),
    new THREE.BoxGeometry(beltLength, 0.05, 0.04).translate(0, 0, -0.27),
    new THREE.BoxGeometry(0.07, SHIPPING_BELT.y - 0.12, 0.07).translate(-beltLength / 2 + 0.15, -(SHIPPING_BELT.y - 0.12) / 2 - 0.02, 0),
    new THREE.BoxGeometry(0.07, SHIPPING_BELT.y - 0.12, 0.07).translate(beltLength / 2 - 0.15, -(SHIPPING_BELT.y - 0.12) / 2 - 0.02, 0),
  ]), vent);
  frame.position.set(beltX, SHIPPING_BELT.y - 0.07, 0);
  group.add(frame);
  const gates = mesh(mergeGeometries(SHIPPING_GATES.flatMap(x => [
    new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(x, 0.25, 0.29),
    new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(x, 0.25, -0.29),
    new THREE.BoxGeometry(0.06, 0.06, 0.64).translate(x, 0.5, 0),
  ])), shell);
  gates.position.y = SHIPPING_BELT.y - 0.05;
  group.add(gates);
  const statusGeometry = new THREE.SphereGeometry(0.065, 12, 8);
  SHIPPING_GATES.forEach((x, index) => {
    const light = mesh(statusGeometry, standard(0x8ff0c4, 0.4, 0, 0x5fe0a4, 0.35));
    light.name = `shipping-status-${index}`;
    light.position.set(x, SHIPPING_BELT.y + 0.54, 0);
    light.castShadow = false;
    light.userData.decorative = true;
    group.add(light);
  });

  // The model artifact, packed in a shipping box.
  const model = new THREE.Group();
  model.name = 'shipping-model';
  model.position.set(SHIPPING_BELT.start, SHIPPING_BELT.y + 0.18, 0);
  model.add(mesh(new RoundedBoxGeometry(0.38, 0.34, 0.36, 1, 0.025), standard(0xc9955b, 0.85, 0.02)));
  const tape = mesh(new THREE.BoxGeometry(0.39, 0.345, 0.09), standard(0xf1e4c4, 0.55, 0.02));
  tape.castShadow = false;
  model.add(tape);
  group.add(model);

  // Where it starts: a notebook with a few cells.
  const notebook = new THREE.Group();
  notebook.position.set(1.62, 0.62, -0.18);
  notebook.rotation.set(-0.45, -0.3, 0);
  notebook.add(mesh(roundedPanel(0.52, 0.66, 0.03, 0.05), standard(0xf3efe4, 0.85, 0.02)));
  const cell = standard(0xf2a54a, 0.6, 0.05);
  [0.2, 0.02, -0.16].forEach((y, index) => {
    const block = mesh(new THREE.BoxGeometry(index === 1 ? 0.3 : 0.38, 0.1, 0.012), index === 1 ? cell : vent);
    block.position.set(0.02, y, 0.04);
    block.castShadow = false;
    block.userData.decorative = true;
    notebook.add(block);
  });
  const stand = mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 6), vent);
  stand.position.set(1.62, 0.3, -0.26);
  group.add(notebook, stand);
  return group;
}

export // Brings every sculpture to a similar presence at the overview zoom; the small
// ones otherwise vanish beside the tall gem and the bond coin.
const landmarkScale: Partial<Record<ProjectId, number>> = {
  opencouch: 1.25,
  nimble: 1.12,
  quantrl: 1.1,
  'mental-gym': 1.05,
  'claude-code-anatomy': 1.25,
};

const landmarkMakers: Record<ProjectId, () => THREE.Group> = {
  'gem-dota': makeGem,
  wisp: makeWisp,
  krill: makeKrill,
  opencouch: makeOpenCouch,
  nimble: makeNimble,
  quantrl: makeQuant,
  'fractional-bonds': makeBonds,
  'shipping-ml': makeShipping,
  'mental-gym': makeMentalGym,
  'claude-code-anatomy': makeClaudeAnatomy,
};

function makeExplorer() {
  const explorer = new THREE.Group();
  const white = standard(C.ink, 0.3, 0.5);
  const dark = standard(0x1b292b, 0.45, 0.72);
  const glass = standard(C.aqua, 0.16, 0.28, C.aqua, 0.6);
  const glow = standard(C.lime, 0.2, 0.12, C.lime, 1.8);
  const body = mesh(new THREE.CapsuleGeometry(0.48, 1.35, 5, 12), white);
  body.rotation.z = Math.PI / 2;
  body.scale.z = 0.72;
  explorer.add(body);
  const nose = mesh(new THREE.ConeGeometry(0.5, 0.86, 8), white);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.05;
  explorer.add(nose);
  const canopy = mesh(new THREE.SphereGeometry(0.5, 14, 10), glass);
  canopy.scale.set(0.9, 0.58, 0.76);
  canopy.position.set(0.12, 0.36, 0);
  explorer.add(canopy);
  addBox(explorer, [0.95, 0.1, 1.7], [-0.22, -0.04, 0], dark);
  [-0.52, 0.52].forEach((z) => {
    const thruster = mesh(new THREE.CylinderGeometry(0.17, 0.25, 0.42, 10), dark);
    thruster.rotation.z = Math.PI / 2;
    thruster.position.set(-0.82, -0.08, z);
    explorer.add(thruster);
  });
  const pointer = mesh(new THREE.ConeGeometry(0.13, 0.42, 6), glow);
  pointer.name = 'explorer-beacon';
  pointer.position.y = 1.25;
  pointer.rotation.z = Math.PI;
  explorer.add(pointer);
  explorer.scale.setScalar(0.82);
  return explorer;
}

export function buildWorld(): WorldBuild {
  const group = new THREE.Group();
  const ground: THREE.Object3D[] = [];
  const pickers = new Map<THREE.Object3D, ProjectId>();
  const hoverPickers = new Map<THREE.Object3D, ProjectId>();
  const animated: THREE.Object3D[] = [];
  const labelOffsets = {} as Record<ProjectId, number>;
  const rockMaterial = createRockMaterial();
  const fragmentGeometries = [61, 67, 73].map(seed => createAsteroidGeometry(seed, 0));
  // Different silhouettes: a long shelf for Krill, a slender shard for Gem,
  // and broader, shallower rocks for the couch and the learning projects.
  const islands: [ProjectId, number, number, number, number, number][] = [
    ['gem-dota', 1.8, 2.1, -0.52, 3, 1.7],
    ['wisp', 1.76, 1.64, 0.34, 7, 0.82],
    ['krill', 2.65, 1.72, -0.38, 11, 1.08],
    ['opencouch', 2.35, 1.8, 0.48, 17, 0.7],
    ['nimble', 2.1, 1.82, -0.62, 23, 1.3],
    ['quantrl', 1.9, 2.35, 0.32, 29, 1.45],
    ['fractional-bonds', 2.28, 1.9, -0.42, 31, 0.85],
    ['shipping-ml', 1.84, 2.12, 0.65, 37, 1.6],
    ['mental-gym', 2.4, 1.75, -0.28, 41, 0.76],
    ['claude-code-anatomy', 2.12, 1.85, 0.18, 47, 1.2],
  ];
  islands.forEach(([id, rx, rz, rotation, seed, depth]) => {
    const point = WORLD_POINTS[id];
    const made = irregularIsland(point.x, point.z, rx, rz, rotation, seed, rockMaterial, fragmentGeometries, animated);
    made.island.name = `island-${id}`;
    // Stretch below the surface while keeping the top exactly at elevation + 0.7.
    made.island.scale.y = depth;
    made.island.position.y = point.y + 0.7 * (1 - depth);
    made.cap.userData.projectId = id;
    // Both the sculpture and its rock are part of the same pointing/click target.
    made.island.traverse(child => {
      if (child instanceof THREE.Mesh) pickers.set(child, id);
    });
    group.add(made.island);
    ground.push(made.cap);
  });

  // A small home rock gives the explorer a believable launch point between destinations.
  const home = irregularIsland(0, 0.4, 1.16, 1.02, 0.08, 53, rockMaterial, fragmentGeometries, animated);
  group.add(home.island);
  ground.push(home.cap);

  (Object.keys(WORLD_POINTS) as ProjectId[]).forEach((id) => {
    const position = WORLD_POINTS[id];
    // Generous hit proxy sphere around the sculpture so hovering anywhere over or near the island registers smoothly
    const hitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitProxy.position.set(position.x, position.y + 1.2, position.z);
    hitProxy.name = `picker-proxy-${id}`;
    // Raycaster includes invisible meshes; avoid drawing these transparent targets.
    hitProxy.visible = false;
    pickers.set(hitProxy, id);
    hoverPickers.set(hitProxy, id);
    group.add(hitProxy);

    const landmark = landmarkMakers[id]();
    landmark.position.set(position.x, position.y + 0.72, position.z);
    landmark.scale.multiplyScalar(landmarkScale[id] ?? 1);
    landmark.name = `landmark-${id}`;
    landmark.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.decorative) pickers.set(child, id);
      }
      if (child.userData.spin || child.userData.spinY || child.userData.float !== undefined || child.userData.pulse || child.userData.bobAmplitude) {
        child.userData.baseY = child.position.y;
        child.userData.baseScale = child.scale.clone();
        animated.push(child);
      }
    });
    group.add(landmark);

    // Labels float just above the sculpture's solid silhouette, ignoring glows.
    landmark.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    landmark.traverse(child => {
      if (child instanceof THREE.Mesh && !child.userData.decorative) bounds.expandByObject(child, false);
    });
    labelOffsets[id] = (bounds.isEmpty() ? position.y + 3 : bounds.max.y) - position.y + 0.95;
  });

  const explorer = makeExplorer();
  explorer.position.set(0, 1.58, 0.4);
  group.add(explorer);
  const hoverLight = new THREE.PointLight(C.lime, 2.4, 5.5, 2);
  hoverLight.position.set(0, -0.55, 0);
  explorer.add(hoverLight);

  return { group, labelOffsets, ground, pickers, hoverPickers, animated, explorer, hoverLight };
}

export function makeStarField(count: number, radius: number, size: number, color: number) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const distance = radius * (0.45 + Math.random() * 0.65);
    positions[index * 3] = Math.cos(theta) * distance;
    positions[index * 3 + 1] = 3 + Math.random() * radius * 0.72;
    positions[index * 3 + 2] = Math.sin(theta) * distance;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // A radial alpha sprite avoids the square default WebGL point primitive.
  const resolution = 32;
  const pixels = new Uint8Array(resolution * resolution * 4);
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const distance = Math.hypot((x + 0.5) / resolution * 2 - 1, (y + 0.5) / resolution * 2 - 1);
      const offset = (y * resolution + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(Math.max(0, 1 - distance) ** 1.5 * 255);
    }
  }
  const sprite = new THREE.DataTexture(pixels, resolution, resolution);
  sprite.colorSpace = THREE.SRGBColorSpace;
  sprite.minFilter = sprite.magFilter = THREE.LinearFilter;
  sprite.needsUpdate = true;
  const material = new THREE.PointsMaterial({ color, size, map: sprite, sizeAttenuation: false, transparent: true, opacity: 0.75, depthWrite: false });
  return new THREE.Points(geometry, material);
}
