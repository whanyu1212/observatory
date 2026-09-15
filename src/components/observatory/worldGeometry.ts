import * as THREE from 'three';
import type { ProjectId } from './curiosity';
import { makeGem, makeWisp, makeKrill } from './projectLandmarks';

export const WORLD_POINTS: Record<ProjectId, THREE.Vector3> = {
  // Island origins: Y is the elevation of the whole island, including its sculpture.
  // Uneven gaps and depth leave pockets of open sky in the initial composition.
  'gem-dota': new THREE.Vector3(-1.7, 1.8, -6.6),
  wisp: new THREE.Vector3(-2.1, 2.3, 5.3),
  krill: new THREE.Vector3(-7.1, -0.7, 10.5),
  opencouch: new THREE.Vector3(4.9, -1.4, -5.1),
  nimble: new THREE.Vector3(7.6, 2.5, -8.1),
  quantrl: new THREE.Vector3(-1.3, -0.2, 11.9),
  'fractional-bonds': new THREE.Vector3(9.5, 0.3, 4.7),
  'shipping-ml': new THREE.Vector3(13.5, -0.9, -2.7),
  'mental-gym': new THREE.Vector3(4.5, 1.0, 7.3),
  'claude-code-anatomy': new THREE.Vector3(-5.6, 0.7, -2.6),
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
  ground: THREE.Object3D[];
  pickers: Map<THREE.Object3D, ProjectId>;
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
  value.castShadow = true;
  value.receiveShadow = true;
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

function triangleGeometry(triangles: THREE.Vector3[][]) {
  const values: number[] = [];
  triangles.forEach((triangle) => triangle.forEach((point) => values.push(point.x, point.y, point.z)));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function irregularIsland(
  x: number,
  z: number,
  rx: number,
  rz: number,
  rotation: number,
  seed: number,
  top: THREE.Material,
  side: THREE.Material,
  underside: THREE.Material,
  mineral: THREE.Material,
  animated: THREE.Object3D[],
) {
  const island = new THREE.Group();
  island.position.set(x, 0, z);
  island.rotation.y = rotation;

  const segments = 10;
  const rim: THREE.Vector3[] = [];
  const shoulder: THREE.Vector3[] = [];
  const inner: THREE.Vector3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const uneven = 0.9 + islandNoise(seed, index) * 0.16;
    rim.push(new THREE.Vector3(Math.cos(angle) * rx * uneven, 0.7, Math.sin(angle) * rz * uneven));
    shoulder.push(new THREE.Vector3(
      Math.cos(angle) * rx * (0.68 + islandNoise(seed + 2, index) * 0.13),
      -0.2 - islandNoise(seed + 4, index) * 0.28,
      Math.sin(angle) * rz * (0.68 + islandNoise(seed + 6, index) * 0.13),
    ));
    inner.push(new THREE.Vector3(
      Math.cos(angle + 0.13) * rx * (0.25 + islandNoise(seed + 8, index) * 0.16),
      -0.88 - islandNoise(seed + 10, index) * 0.42,
      Math.sin(angle + 0.13) * rz * (0.25 + islandNoise(seed + 12, index) * 0.16),
    ));
  }

  const capTriangles: THREE.Vector3[][] = [];
  const sideTriangles: THREE.Vector3[][] = [];
  const undersideTriangles: THREE.Vector3[][] = [];
  const center = new THREE.Vector3(0, 0.7, 0);
  const deepPoint = new THREE.Vector3(
    rx * (islandNoise(seed, 30) - 0.5) * 0.28,
    -1.48 - islandNoise(seed, 31) * 0.5,
    rz * (islandNoise(seed, 32) - 0.5) * 0.28,
  );
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    capTriangles.push([center, rim[next], rim[index]]);
    if (index % 2 === 0) {
      sideTriangles.push([rim[index], rim[next], shoulder[index]], [rim[next], shoulder[next], shoulder[index]]);
    } else {
      sideTriangles.push([rim[index], rim[next], shoulder[next]], [rim[index], shoulder[next], shoulder[index]]);
    }
    undersideTriangles.push(
      [shoulder[index], shoulder[next], inner[index]],
      [shoulder[next], inner[next], inner[index]],
      [inner[index], inner[next], deepPoint],
    );
  }

  const cap = mesh(triangleGeometry(capTriangles), top);
  island.add(cap);
  island.add(mesh(triangleGeometry(sideTriangles), side));
  island.add(mesh(triangleGeometry(undersideTriangles), underside));

  // A broken mineral seam catches the eye without turning the island into a neon platform.
  const veinAngle = islandNoise(seed, 40) * Math.PI * 2;
  const vein = new THREE.CatmullRomCurve3([
    new THREE.Vector3(Math.cos(veinAngle - 0.18) * rx * 0.7, 0.712, Math.sin(veinAngle - 0.18) * rz * 0.7),
    new THREE.Vector3(Math.cos(veinAngle) * rx * 0.82, 0.714, Math.sin(veinAngle) * rz * 0.82),
    new THREE.Vector3(Math.cos(veinAngle + 0.18) * rx * 0.96, 0.712, Math.sin(veinAngle + 0.18) * rz * 0.96),
  ]);
  const veinMesh = mesh(new THREE.TubeGeometry(vein, 10, 0.018, 5, false), mineral);
  veinMesh.castShadow = false;
  island.add(veinMesh);

  // The fragments orbit as one restrained cluster, reinforcing that each island is free-floating.
  const fragments = new THREE.Group();
  fragments.position.y = -0.28;
  const fragmentCount = rx < 1.5 ? 2 : 3;
  for (let index = 0; index < fragmentCount; index += 1) {
    const angle = islandNoise(seed + 20, index) * Math.PI * 2;
    const distance = Math.max(rx, rz) * (1.04 + islandNoise(seed + 22, index) * 0.18);
    const fragment = mesh(new THREE.IcosahedronGeometry(0.14 + islandNoise(seed + 24, index) * 0.12, 0), underside);
    fragment.position.set(
      Math.cos(angle) * distance,
      -0.15 - islandNoise(seed + 26, index) * 0.85,
      Math.sin(angle) * distance,
    );
    fragment.scale.set(1.25, 0.7 + islandNoise(seed + 28, index) * 0.65, 0.85);
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

function makeOpenCouch() {
  const group = new THREE.Group();
  const fabric = standard(C.violet, 0.85, 0.02);
  const frame = standard(C.cream, 0.58, 0.12);
  const plant = standard(C.limeDeep, 0.8, 0.02);
  addBox(group, [2.15, 0.28, 1.18], [0, 0.28, 0], frame);
  addBox(group, [1.8, 0.42, 0.78], [0, 0.62, 0.05], fabric);
  addBox(group, [1.8, 0.82, 0.24], [0, 1.0, -0.38], fabric, [-0.12, 0, 0]);
  addBox(group, [0.26, 0.65, 0.92], [-1.0, 0.72, 0], fabric);
  addBox(group, [0.26, 0.65, 0.92], [1.0, 0.72, 0], fabric);
  [[-1.25, -0.68], [1.26, -0.6]].forEach(([x, z]) => {
    addCylinder(group, 0.23, 0.29, 0.36, [x, 0.28, z], frame, 10);
    const leaf = mesh(new THREE.ConeGeometry(0.35, 0.8, 6), plant);
    leaf.position.set(x, 0.84, z);
    group.add(leaf);
  });
  [-0.48, 0.48].forEach(x => {
    addBox(group, [0.83, 0.18, 0.72], [x, 0.88, 0.08], standard(0xb6a4ee, 0.95, 0));
    addBox(group, [0.4, 0.4, 0.18], [x * 1.4, 1.12, -0.1], standard(x < 0 ? C.aqua : C.amber, 0.95, 0), [0, 0, x * 0.3]);
    [-0.32, 0.36].forEach(z => addCylinder(group, 0.065, 0.075, 0.25, [x * 1.65, 0.08, z], standard(0x987655, 0.8, 0), 8));
  });
  const canopy = mesh(new THREE.TorusGeometry(1.55, 0.055, 8, 30, Math.PI), standard(C.aqua, 0.4, 0.16, C.aqua, 0.5));
  canopy.rotation.set(0, 0, Math.PI);
  canopy.position.y = 2.1;
  group.add(canopy);
  return group;
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

function makeQuant() {
  const group = new THREE.Group();
  group.rotation.y = 0.7;
  const chrome = standard(C.cream, 0.3, 0.5);
  const board = standard(0x102b2d, 0.52, 0.15);
  addBox(group, [2.5, 1.85, 0.16], [0, 1.36, -0.2], board);
  addCylinder(group, 0.45, 0.68, 0.22, [0, 0.18, 0], chrome);
  addCylinder(group, 0.09, 0.12, 0.65, [0, 0.5, -0.15], chrome);
  [-0.83, -0.28, 0.28, 0.84].forEach((x, index) => {
    const heights = [0.48, 0.64, 0.34, 0.85];
    const y = [0.93, 1.29, 1.39, 1.65][index];
    const color = index === 2 ? C.coral : C.aqua;
    const candle = standard(color, 0.32, 0.15, color, 0.75);
    addBox(group, [0.25, heights[index], 0.1], [x, y, -0.05], candle);
    group.add(rodBetween(new THREE.Vector3(x, y - heights[index] / 2 - 0.15, -0.02), new THREE.Vector3(x, y + heights[index] / 2 + 0.15, -0.02), 0.025, candle));
  });
  // A returning arc represents learning from feedback rather than guaranteed growth.
  const arc = mesh(new THREE.TorusGeometry(1.48, 0.06, 8, 40, Math.PI * 1.65), standard(C.amber, 0.3, 0.15, C.amber, 0.7));
  arc.rotation.z = -0.8; arc.position.set(0, 1.35, 0.06); group.add(arc);
  const arrow = mesh(new THREE.ConeGeometry(0.15, 0.33, 8), standard(C.amber, 0.3, 0.1, C.amber, 0.7));
  const end = Math.PI * 1.65 - 0.8;
  arrow.position.set(Math.cos(end) * 1.48, 1.35 + Math.sin(end) * 1.48, 0.06);
  arrow.rotation.z = end; group.add(arrow);
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
  const seal = mesh(new THREE.OctahedronGeometry(0.31, 0), standard(C.ink, 0.28, 0.4));
  seal.scale.y = 1.5; seal.position.set(0, 0, 0.4); coin.add(seal);
  group.add(coin);
  [-0.76, 0.65].forEach((x, index) => {
    for (let layer = 0; layer < index + 2; layer++) addCylinder(group, 0.42, 0.42, 0.12, [x, 0.17 + layer * 0.14, 0.3], gold, 24);
  });
  return group;
}

function makeShipping() {
  const group = new THREE.Group();
  const rocket = new THREE.Group();
  rocket.name = 'shipping-rocket';
  rocket.position.y = 0.5; rocket.rotation.z = -0.18;
  const ivory = standard(C.ink, 0.33, 0.22);
  const teal = standard(C.aqua, 0.35, 0.25);
  const body = mesh(new THREE.CapsuleGeometry(0.48, 1.13, 6, 20), ivory);
  body.position.y = 1.25; rocket.add(body);
  const nose = mesh(new THREE.ConeGeometry(0.47, 0.72, 20), teal);
  nose.position.y = 2.32; rocket.add(nose);
  const windowFrame = glowingRing(0.27, 0.055, C.aqua);
  windowFrame.position.set(0.1, 1.5, 0.44); rocket.add(windowFrame);
  const glass = mesh(new THREE.CircleGeometry(0.25, 20), standard(0x143342, 0.15, 0.5, C.aqua, 0.15));
  glass.position.set(0.1, 1.5, 0.45); rocket.add(glass);
  // A tiny model chip in the porthole makes this a software launch metaphor.
  addBox(rocket, [0.19, 0.19, 0.035], [0.1, 1.5, 0.48], standard(C.lime, 0.3, 0.1, C.lime, 0.6));
  for (let index = 0; index < 3; index++) {
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(0.65, -0.25); fin.lineTo(0.18, 0.76); fin.closePath();
    const blade = mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.09, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), teal);
    blade.position.set(0, 0.42, 0); blade.rotation.y = index * Math.PI * 2 / 3; rocket.add(blade);
  }
  const exhaust = mesh(new THREE.ConeGeometry(0.27, 0.8, 12), standard(C.amber, 0.3, 0, C.amber, 1.2));
  exhaust.name = 'shipping-exhaust';
  exhaust.rotation.z = Math.PI; exhaust.position.y = -0.05;
  exhaust.visible = false;
  exhaust.userData.decorative = true;
  rocket.add(exhaust);
  group.add(rocket);
  return group;
}

function makeMentalGym() {
  const group = new THREE.Group();
  const brain = new THREE.Group();
  brain.position.y = 1.73;
  const pink = standard(0xeaa3b3, 0.66, 0.04);
  const fold = standard(0xc36b96, 0.72, 0.02);
  [-1, 1].forEach(side => {
    const hemisphere = mesh(new THREE.SphereGeometry(0.68, 20, 14), pink);
    hemisphere.scale.set(0.78, 1, 1.06); hemisphere.position.x = side * 0.39; brain.add(hemisphere);
    for (let index = 0; index < 5; index++) {
      const angle = -1.1 + index * 0.54;
      const lobe = mesh(new THREE.SphereGeometry(0.27, 12, 8), pink);
      lobe.position.set(side * (0.41 + Math.sin(angle) * 0.29), Math.cos(angle) * 0.5, Math.sin(angle) * 0.44);
      lobe.scale.set(1, 0.9, 1.3); brain.add(lobe);
    }
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.25, 0.36, 0.55), new THREE.Vector3(side * 0.56, 0.25, 0.57),
      new THREE.Vector3(side * 0.38, 0.03, 0.67), new THREE.Vector3(side * 0.66, -0.15, 0.45),
    ]);
    brain.add(mesh(new THREE.TubeGeometry(curve, 18, 0.035, 6, false), fold));
  });
  group.add(brain);
  const grip = standard(C.cream, 0.32, 0.6);
  const weights = standard(C.violet, 0.45, 0.25);
  group.add(rodBetween(new THREE.Vector3(-1.25, 0.63, 0.55), new THREE.Vector3(1.25, 0.63, 0.55), 0.09, grip));
  [-1, 1].forEach(side => {
    [0.83, 1.1].forEach(x => {
      const plate = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16), weights);
      plate.rotation.z = Math.PI / 2; plate.position.set(side * x, 0.63, 0.55); group.add(plate);
    });
    group.add(rodBetween(new THREE.Vector3(side * 0.48, 1.27, 0.15), new THREE.Vector3(side * 0.64, 0.63, 0.55), 0.075, pink));
  });
  return group;
}

function makeClaudeAnatomy() {
  const group = new THREE.Group();
  group.rotation.y = -0.22;
  const copper = standard(0xd99a78, .36, .5);
  const ink = standard(0x18292d, .48, .25);
  const trace = standard(C.aqua, .3, .25, C.aqua, .65);
  const signal = standard(C.amber, .25, .25, C.amber, 1.1);

  // A terminal taken apart into shell, circuitry, and glass: an agent's anatomy.
  [-.55, 0, .55].forEach((z, index) => {
    const layer = new THREE.Group();
    layer.name = `anatomy-layer-${index}`;
    layer.position.set((index - 1) * .08, 1.6, z);
    if (index === 0) {
      addBox(layer, [2.08, 1.58, .13], [0, 0, 0], copper);
      addBox(layer, [1.8, 1.3, .03], [0, 0, .08], ink);
      for (let slot = 0; slot < 5; slot++) {
        addBox(layer, [.62, .04, .03], [0, -.4 + slot * .2, -.085], ink);
      }
    } else if (index === 1) {
      addBox(layer, [1.94, 1.42, .08], [0, 0, 0], ink);
      const core = addBox(layer, [.57, .48, .16], [0, 0, .1], signal);
      core.name = 'anatomy-core';
      // Branching traces show how the central loop connects tools and context.
      [-1, 1].forEach(side => {
        for (let lane = 0; lane < 3; lane++) {
          const y = (lane - 1) * .4;
          layer.add(rodBetween(new THREE.Vector3(side * .3, (lane - 1) * .13, .09), new THREE.Vector3(side * .53, y, .09), .016, trace));
          layer.add(rodBetween(new THREE.Vector3(side * .53, y, .09), new THREE.Vector3(side * .8, y, .09), .016, trace));
          addBox(layer, [.16, .14, .07], [side * .8, y, .1], copper);
        }
      });
    } else {
      const glass = new THREE.MeshPhysicalMaterial({ color: C.aqua, transparent: true, opacity: .13, roughness: .15, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
      const pane = mesh(new THREE.PlaneGeometry(2.0, 1.5), glass);
      pane.castShadow = false;
      layer.add(pane);
      [[-1.02, 0], [1.02, 0]].forEach(([x, y]) => addBox(layer, [.055, 1.58, .07], [x, y, 0], copper));
      [[0, -.77], [0, .77]].forEach(([x, y]) => addBox(layer, [2.08, .055, .07], [x, y, 0], copper));
      [-.78, -.6, -.42].forEach(x => {
        const dot = mesh(new THREE.SphereGeometry(.045, 8, 6), signal);
        dot.position.set(x, .58, .055);
        layer.add(dot);
      });
      layer.add(rodBetween(new THREE.Vector3(-.59, .17, .07), new THREE.Vector3(-.36, 0, .07), .033, signal));
      layer.add(rodBetween(new THREE.Vector3(-.36, 0, .07), new THREE.Vector3(-.59, -.17, .07), .033, signal));
      addBox(layer, [.32, .04, .05], [.15, -.17, .07], signal);
    }
    group.add(layer);
  });

  // A tilted inspection lens makes the research identity legible at a distance.
  const lens = new THREE.Group();
  lens.position.set(1.02, 2.34, .86);
  lens.rotation.set(.1, -.25, -.36);
  const rim = mesh(new THREE.TorusGeometry(.48, .065, 10, 32), copper);
  lens.add(rim);
  const glass = mesh(new THREE.CircleGeometry(.43, 32), new THREE.MeshBasicMaterial({ color: C.aqua, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false }));
  glass.castShadow = false;
  lens.add(glass);
  lens.add(rodBetween(new THREE.Vector3(0, -.48, 0), new THREE.Vector3(0, -.97, 0), .07, copper));
  group.add(lens);
  addCylinder(group, .82, 1.02, .16, [0, .16, 0], ink, 8);
  addBox(group, [.16, .55, .18], [0, .49, -.4], copper);
  return group;
}

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
    const flame = mesh(new THREE.ConeGeometry(0.16, 0.7, 10), glow);
    flame.rotation.z = -Math.PI / 2;
    flame.position.set(-1.22, -0.08, z);
    explorer.add(flame);
  });
  const pointer = mesh(new THREE.ConeGeometry(0.13, 0.42, 6), glow);
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
  const animated: THREE.Object3D[] = [];
  const top = new THREE.MeshStandardMaterial({ color: 0x1a2a35, roughness: 0.9, metalness: 0.06, flatShading: true });
  const side = new THREE.MeshStandardMaterial({ color: 0x172333, roughness: 0.94, metalness: 0.04, flatShading: true, side: THREE.DoubleSide });
  const underside = new THREE.MeshStandardMaterial({ color: 0x201d35, roughness: 0.96, metalness: 0.03, flatShading: true, side: THREE.DoubleSide });
  const mineral = new THREE.MeshStandardMaterial({ color: C.aqua, roughness: 0.32, metalness: 0.15, emissive: C.aqua, emissiveIntensity: 0.72 });
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
    const made = irregularIsland(point.x, point.z, rx, rz, rotation, seed, top, side, underside, mineral, animated);
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
  const home = irregularIsland(0, 0.4, 1.16, 1.02, 0.08, 53, top, side, underside, mineral, animated);
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
    pickers.set(hitProxy, id);
    group.add(hitProxy);

    const landmark = landmarkMakers[id]();
    landmark.position.set(position.x, position.y + 0.72, position.z);
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

  });

  const explorer = makeExplorer();
  explorer.position.set(0, 1.58, 0.4);
  group.add(explorer);
  const hoverLight = new THREE.PointLight(C.lime, 2.4, 5.5, 2);
  hoverLight.position.set(0, -0.55, 0);
  explorer.add(hoverLight);

  return { group, ground, pickers, animated, explorer, hoverLight };
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
