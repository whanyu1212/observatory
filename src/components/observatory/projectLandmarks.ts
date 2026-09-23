import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedPanel } from './refinedLandmarks';

const PALETTE = {
  cream: 0xedf2e8,
  lime: 0xd9f991,
  teal: 0x32d5c1,
  cyan: 0xa9fff5,
  coral: 0xf07870,
  coralLight: 0xffa390,
  coralDark: 0xa94048,
  ink: 0x071012,
};

function standard(
  color: number,
  roughness = 0.5,
  metalness = 0.08,
  emissive = 0,
  emissiveIntensity = 0,
) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function solid(geometry: THREE.BufferGeometry, material: THREE.Material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = !material.transparent;
  object.receiveShadow = !material.transparent;
  return object;
}

function decoration<T extends THREE.Object3D>(object: T) {
  object.userData.decorative = true;
  object.castShadow = false;
  object.receiveShadow = false;
  return object;
}

function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, tubularSegments = 18) {
  const curve = new THREE.CatmullRomCurve3(points);
  return solid(new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false), material);
}

function softGlow(color: number, opacity: number, falloff = 1.8) {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      glowOpacity: { value: opacity },
      glowFalloff: { value: falloff },
    },
    vertexShader: `
      varying vec3 vGlowNormal;
      varying vec3 vGlowViewDirection;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vGlowNormal = normalize(normalMatrix * normal);
        vGlowViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float glowOpacity;
      uniform float glowFalloff;
      varying vec3 vGlowNormal;
      varying vec3 vGlowViewDirection;

      void main() {
        float facing = max(dot(normalize(vGlowNormal), normalize(vGlowViewDirection)), 0.0);
        float alpha = glowOpacity * pow(smoothstep(0.0, 1.0, facing), glowFalloff);
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/** A single, jewellery-cut gem: flat table, crown, girdle, and pointed pavilion. */
function facetedGemGeometry() {
  const sides = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const facetColors = [0x7ff4dc, 0x25c6b1, 0x149784, 0x5ce3cc, 0x107a70, 0x35bda8, 0x82e8d4, 0x188f83];

  const topY = 2.72;
  const crownY = 2.48;
  const girdleTopY = 1.68;
  const girdleBottomY = 1.52;
  const pointY = 0.18;
  const topRadius = 0.48;
  const crownRadius = 0.58;
  const girdleRadius = 1.02;

  const point = (radius: number, y: number, index: number) => {
    const angle = Math.PI / 8 + (index / sides) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  };

  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: number) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const shade = new THREE.Color(color);
    for (let index = 0; index < 3; index += 1) colors.push(shade.r, shade.g, shade.b);
  };

  const topCenter = new THREE.Vector3(0, topY, 0);
  const pavilionPoint = new THREE.Vector3(0, pointY, 0);
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    const topA = point(topRadius, topY, index);
    const topB = point(topRadius, topY, next);
    const crownA = point(crownRadius, crownY, index);
    const crownB = point(crownRadius, crownY, next);
    const girdleTopA = point(girdleRadius, girdleTopY, index);
    const girdleTopB = point(girdleRadius, girdleTopY, next);
    const girdleBottomA = point(girdleRadius * 0.97, girdleBottomY, index);
    const girdleBottomB = point(girdleRadius * 0.97, girdleBottomY, next);

    triangle(topCenter, topB, topA, 0xb4fff0);
    triangle(topA, topB, crownA, facetColors[(index + 2) % facetColors.length]);
    triangle(topB, crownB, crownA, facetColors[index]);
    triangle(crownA, crownB, girdleTopA, facetColors[(index + 4) % facetColors.length]);
    triangle(crownB, girdleTopB, girdleTopA, facetColors[(index + 1) % facetColors.length]);
    triangle(girdleTopA, girdleTopB, girdleBottomA, facetColors[(index + 5) % facetColors.length]);
    triangle(girdleTopB, girdleBottomB, girdleBottomA, facetColors[(index + 3) % facetColors.length]);
    triangle(girdleBottomA, girdleBottomB, pavilionPoint, facetColors[(index + 6) % facetColors.length]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A Dota minimap: Radiant bottom-left, Dire top-right, the river on the
 * anti-diagonal and three lanes. Map units run from -1 to 1 on each axis.
 */
function makeMinimap() {
  const map = new THREE.Group();
  map.name = 'gem-dota-minimap';
  const half = 1.02;
  const top = 0.25;
  const at = (u: number, v: number, y = top) => new THREE.Vector3(u * half, y, -v * half);

  const slab = solid(roundedPanel(2.24, 2.24, 0.1, 0.14), standard(0x1a211f, 0.85, 0.05));
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = 0.13;
  map.add(slab);

  const territory = (points: Array<[number, number]>, color: number) => {
    const shape = new THREE.Shape(points.map(([u, v]) => new THREE.Vector2(u * half, v * half)));
    const mesh = decoration(new THREE.Mesh(new THREE.ShapeGeometry(shape), standard(color, 0.9, 0.02)));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = top;
    mesh.receiveShadow = true;
    map.add(mesh);
  };
  territory([[-1, -1], [1, -1], [-1, 1]], 0x2f5236);
  territory([[1, 1], [-1, 1], [1, -1]], 0x55303a);

  // The river meanders from top-left to bottom-right between the two sides.
  const riverPoints = Array.from({ length: 7 }, (_, index) => {
    const t = index / 6;
    const wobble = Math.sin(t * Math.PI * 2) * 0.09;
    return at(-0.96 + t * 1.92 + wobble, 0.96 - t * 1.92 + wobble, top + 0.012);
  });
  const river = decoration(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPoints), 40, 0.075, 6, false),
    standard(0x4b9ee6, 0.25, 0.1, 0x2a6fb5, 0.55),
  ));
  river.scale.y = 0.25;
  river.position.y = top * 0.75;
  map.add(river);

  // Three lanes, merged into one mesh: top, middle and bottom.
  const laneWidth = 0.07;
  const lane = (from: THREE.Vector3, to: THREE.Vector3) => {
    const length = from.distanceTo(to);
    const piece = new THREE.BoxGeometry(length, 0.02, laneWidth);
    piece.rotateY(-Math.atan2(to.z - from.z, to.x - from.x));
    piece.translate((from.x + to.x) / 2, top + 0.015, (from.z + to.z) / 2);
    return piece;
  };
  const lanes = decoration(new THREE.Mesh(mergeGeometries([
    lane(at(-0.82, -0.72), at(-0.82, 0.82)), lane(at(-0.86, 0.82), at(0.72, 0.82)),
    lane(at(-0.72, -0.72), at(0.72, 0.72)),
    lane(at(-0.72, -0.82), at(0.86, -0.82)), lane(at(0.82, -0.86), at(0.82, 0.72)),
  ]), standard(0xcdbb8c, 0.8, 0.02, 0x6b5a33, 0.25)));
  map.add(lanes);

  // The two ancients sit in opposite corners.
  const ancient = (name: string, u: number, v: number, color: number) => {
    const base = solid(new THREE.CylinderGeometry(0.1, 0.15, 0.18, 8), standard(color, 0.35, 0.2, color, 0.7));
    base.name = name;
    base.position.copy(at(u, v, top + 0.09));
    map.add(base);
  };
  ancient('gem-dota-radiant', -0.82, -0.82, 0x7be07b);
  ancient('gem-dota-dire', 0.82, 0.82, 0xff6a5c);

  // A hero's path is traced across the map, as a parsed replay reveals it.
  const path = new THREE.CatmullRomCurve3([
    at(-0.74, -0.7), at(-0.46, -0.44), at(-0.2, -0.08), at(0.12, -0.12),
    at(0.3, 0.14), at(0.12, 0.42), at(0.44, 0.52), at(0.62, 0.66),
  ].map(point => point.setY(top + 0.05)));
  const radial = 5;
  const trail = decoration(new THREE.Mesh(
    new THREE.TubeGeometry(path, 72, 0.026, radial, false),
    new THREE.MeshBasicMaterial({ color: 0xb5ffe4, toneMapped: false }),
  ));
  trail.name = 'gem-dota-path';
  trail.userData.curve = path;
  trail.userData.stride = radial * 6;
  map.add(trail);
  const hero = decoration(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })));
  hero.name = 'gem-dota-hero';
  hero.position.copy(path.getPointAt(1));
  map.add(hero);
  return map;
}

export function makeGem() {
  const group = new THREE.Group();
  group.name = 'gem-dota-sculpture';
  const map = makeMinimap();
  // Face Radiant's corner toward the home view.
  map.rotation.y = 0.56;
  group.add(map);

  // The gem hovers over the map it reads; only the gem bobs and turns.
  const rig = new THREE.Group();
  rig.name = 'gem-dota-rig';
  rig.position.y = 0.72;
  rig.scale.setScalar(0.64);
  rig.userData.bobAmplitude = 0.075;
  rig.userData.bobSpeed = 1.25;
  group.add(rig);

  const gemMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x66d8af,
    vertexColors: true,
    roughness: 0.16,
    metalness: 0.12,
    transmission: 0.24,
    thickness: 0.9,
    ior: 1.7,
    clearcoat: 0.75,
    clearcoatRoughness: 0.08,
    attenuationColor: new THREE.Color(0x076337),
    attenuationDistance: 2.8,
    envMapIntensity: 0.95,
    emissive: new THREE.Color(0x084f39),
    emissiveIntensity: 0.08,
    flatShading: true,
  });
  const gem = solid(facetedGemGeometry(), gemMaterial);
  gem.name = 'gem-dota-gem';
  rig.add(gem);
  const core = decoration(new THREE.Mesh(new THREE.OctahedronGeometry(.23), new THREE.MeshBasicMaterial({ color: 0xc9ffe7, toneMapped: false })));
  core.name = 'gem-inner-light';
  core.position.y = 1.6;
  rig.add(core);
  const edges = decoration(new THREE.LineSegments(new THREE.EdgesGeometry(gem.geometry, 24), new THREE.LineBasicMaterial({ color: 0xc1ffe9, transparent: true, opacity: .22, depthWrite: false })));
  rig.add(edges);

  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xcafff3, toneMapped: false });
  const sparkleOrbit = new THREE.Group();
  sparkleOrbit.name = 'gem-sparkles';
  sparkleOrbit.userData.spinY = -0.38;
  decoration(sparkleOrbit);
  [
    [-1.08, 2.47, 0.1, 0.075],
    [0.88, 2.95, -0.24, 0.055],
    [1.13, 1.42, 0.17, 0.045],
  ].forEach(([x, y, z, size], index) => {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), sparkMaterial);
    spark.position.set(x, y, z);
    spark.rotation.z = index * 0.7;
    decoration(spark);
    sparkleOrbit.add(spark);
  });
  rig.add(sparkleOrbit);

  return group;
}

export function makeWisp() {
  const group = new THREE.Group();
  group.name = 'wisp-sculpture';
  group.userData.bobAmplitude = 0.14;
  group.userData.bobSpeed = 1.65;

  const spirit = new THREE.Group();
  spirit.name = 'wisp-spirit';
  group.add(spirit);
  const tailMaterial = standard(0x66e7dc, 0.24, 0.04, PALETTE.teal, 0.7);
  const tail = tube([
    new THREE.Vector3(0, 1.58, 0),
    new THREE.Vector3(-0.2, 1.18, 0.03),
    new THREE.Vector3(0.17, 0.8, -0.03),
    new THREE.Vector3(-0.06, 0.34, 0),
  ], 0.055, tailMaterial, 22);
  tail.scale.set(1, 1, 0.78);
  tail.name = 'wisp-tail';
  spirit.add(tail);

  const coreMaterial = standard(PALETTE.cream, 0.16, 0.02, PALETTE.cyan, 3.6);
  const core = solid(new THREE.SphereGeometry(0.49, 28, 20), coreMaterial);
  core.position.y = 2.02;
  core.scale.set(1, 1.05, 0.96);
  core.name = 'wisp-core';
  spirit.add(core);

  const innerGlow = decoration(new THREE.Mesh(
    new THREE.SphereGeometry(0.81, 24, 18),
    softGlow(0x72f7e8, 0.31, 1.55),
  ));
  innerGlow.position.copy(core.position);
  spirit.add(innerGlow);

  const outerGlow = decoration(new THREE.Mesh(
    new THREE.SphereGeometry(1.22, 22, 16),
    softGlow(0x7beadd, 0.18, 2.15),
  ));
  outerGlow.position.copy(core.position);
  spirit.add(outerGlow);

  const wispLight = new THREE.PointLight(0x6ff7e7, 3.2, 5, 2);
  wispLight.name = 'wisp-light';
  wispLight.position.copy(core.position);
  decoration(wispLight);
  spirit.add(wispLight);

  const moteMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.lime, toneMapped: false });
  const motes = new THREE.Group();
  motes.position.y = 2.02;
  motes.userData.spinY = 0.72;
  decoration(motes);
  [
    [0.98, 0.36, 0.08, 0.07],
    [-0.84, -0.5, 0.34, 0.045],
    [0.42, 0.82, -0.74, 0.055],
  ].forEach(([x, y, z, radius]) => {
    const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), moteMaterial);
    mote.position.set(x, y, z);
    decoration(mote);
    motes.add(mote);
  });
  spirit.add(motes);

  const vapor = new THREE.Group();
  vapor.name = 'wisp-vapor';
  const vaporGeometry = new THREE.SphereGeometry(1, 10, 8);
  const vaporMaterial = softGlow(0x88f6e9, .32, 1.6);
  for (let index = 0; index < 12; index++) {
    const mote = decoration(new THREE.Mesh(vaporGeometry, vaporMaterial));
    mote.userData.phase = index / 12;
    vapor.add(mote);
  }
  spirit.add(vapor);

  // The orb keeps a live transcript beside it: the "inspectable" in Wisp.
  const transcript = new THREE.Group();
  transcript.name = 'wisp-transcript';
  // To the home camera's right of the orb, facing it.
  transcript.position.set(0.72, 1.62, -0.92);
  transcript.rotation.set(-0.16, 0.91, 0);
  const screen = decoration(new THREE.Mesh(roundedPanel(0.92, 1.08, 0.04, 0.09), standard(0x0c2226, 0.4, 0.1, 0x0b3a3a, 0.35)));
  screen.position.z = -0.03;
  transcript.add(screen);
  const header = decoration(new THREE.Mesh(roundedPanel(0.92, 0.12, 0.045, 0.05), standard(PALETTE.teal, 0.35, 0.1, PALETTE.teal, 0.5)));
  header.position.set(0, 0.48, -0.025);
  transcript.add(header);
  const lineWidths = [0.62, 0.44, 0.7, 0.36, 0.56, 0.48];
  const lines = decoration(new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.045, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xbff7ee, toneMapped: false }),
    lineWidths.length,
  ));
  lines.name = 'wisp-transcript-lines';
  lines.userData.widths = lineWidths;
  lines.frustumCulled = false;
  transcript.add(lines);
  const approval = decoration(new THREE.Mesh(mergeGeometries([
    new THREE.BoxGeometry(0.1, 0.035, 0.03).rotateZ(-0.8).translate(-0.035, -0.02, 0),
    new THREE.BoxGeometry(0.2, 0.035, 0.03).rotateZ(0.9).translate(0.05, 0.03, 0),
  ]), new THREE.MeshBasicMaterial({ color: PALETTE.lime, toneMapped: false })));
  approval.name = 'wisp-approval';
  approval.position.set(0.3, -0.4, 0.02);
  transcript.add(approval);
  spirit.add(transcript);

  const anchor = new THREE.Vector3(-0.46, 0.1, 0).applyEuler(transcript.rotation).add(transcript.position);
  const tether = decoration(tube([
    new THREE.Vector3(0.36, 2.02, -0.16),
    new THREE.Vector3(0.52, 1.95, -0.5),
    anchor,
  ], 0.018, standard(0x72f7e8, 0.3, 0.05, PALETTE.teal, 1.2), 14));
  spirit.add(tether);

  return group;
}

function ellipsoid(
  radius: number,
  scale: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const object = solid(new THREE.SphereGeometry(radius, 18, 12), material);
  object.scale.set(...scale);
  object.position.set(...position);
  return object;
}

/** A tapered, continuous abdomen with a pronounced shrimp curl. */
function krillShell(curve: THREE.CatmullRomCurve3, radii: number[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  const rings = 56;
  const sides = 16;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const section = t * (radii.length - 1);
    const index = Math.min(radii.length - 2, Math.floor(section));
    const radius = THREE.MathUtils.lerp(radii[index], radii[index + 1], section - index);
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI * 2;
      const point = center.clone().addScaledVector(normal, Math.cos(angle) * radius);
      point.z += Math.sin(angle) * radius * 0.72;
      positions.push(point.x, point.y, point.z);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function makeKrill() {
  const group = new THREE.Group();
  group.name = 'krill-sculpture';
  // Side-on to the home view, turned a little toward it: the curl is the silhouette.
  group.rotation.y = 0.95;
  group.userData.bobAmplitude = 0.075;
  group.userData.bobSpeed = 1.4;

  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xf06a40, roughness: 0.32, metalness: 0.02,
    clearcoat: 0.85, clearcoatRoughness: 0.2,
  });
  const tailMaterial = standard(0xe5563b, 0.36, 0.02);
  const bandMaterial = standard(0xc84a36, 0.45, 0.02);
  const legMaterial = standard(0xffb58a, 0.5, 0.02);
  const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0b1018, roughness: 0.08, clearcoat: 1 });
  const antennaMaterial = standard(0xffa77a, 0.45, 0.02, 0xa84126, 0.06);

  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.62, 2.1, 0),
    new THREE.Vector3(0.02, 2.2, 0),
    new THREE.Vector3(-0.64, 2.0, 0),
    new THREE.Vector3(-1.12, 1.5, 0),
    new THREE.Vector3(-1.1, 0.98, 0),
    new THREE.Vector3(-0.72, 0.66, 0),
    new THREE.Vector3(-0.26, 0.64, 0),
  ]);
  const radii = [0.42, 0.47, 0.4, 0.31, 0.22, 0.14, 0.08];
  const abdomen = solid(krillShell(spine, radii), shell);
  abdomen.name = 'krill-abdomen';
  group.add(abdomen);

  // Four slim bands mark the shell segments.
  for (let index = 1; index < 5; index++) {
    const t = index / 5.4;
    const center = spine.getPoint(t);
    const tangent = spine.getTangent(t);
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const radius = THREE.MathUtils.lerp(radii[Math.floor(t * 6)], radii[Math.ceil(t * 6)], t * 6 % 1) + 0.012;
    const points = Array.from({ length: 25 }, (_, side) => {
      const angle = side / 24 * Math.PI * 2;
      const point = center.clone().addScaledVector(normal, Math.cos(angle) * radius);
      point.z += Math.sin(angle) * radius * 0.72;
      return point;
    });
    group.add(decoration(tube(points, 0.022, bandMaterial, 24)));
  }

  // A rounded carapace and a short rostrum make the head.
  const head = ellipsoid(0.5, [1.22, 0.86, 0.78], [0.66, 2.1, 0], shell);
  head.name = 'krill-head';
  group.add(head);
  const rostrum = solid(new THREE.ConeGeometry(0.1, 0.55, 8), shell);
  rostrum.rotation.z = -Math.PI / 2 + 0.25;
  rostrum.position.set(1.36, 2.24, 0);
  group.add(rostrum);

  // Big glossy eyes on short stalks, each with a catchlight.
  [-1, 1].forEach(side => {
    const base = new THREE.Vector3(1.0, 2.3, side * 0.2);
    const tip = new THREE.Vector3(1.12, 2.52, side * 0.34);
    group.add(tube([base, tip], 0.05, shell, 5));
    const eye = solid(new THREE.SphereGeometry(0.15, 18, 12), eyeMaterial);
    eye.position.copy(tip);
    group.add(eye);
    const glint = decoration(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    glint.position.copy(tip).add(new THREE.Vector3(0.07, 0.07, side * 0.09));
    group.add(glint);
  });

  // Two long antennae sweep back over the body, tapering to fine tips.
  const antennae = new THREE.Group();
  antennae.name = 'krill-antennae';
  antennae.position.set(1.18, 2.3, 0);
  [-1, 1].forEach(side => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, side * 0.16),
      new THREE.Vector3(0.42, 0.5, side * 0.3),
      new THREE.Vector3(0.18, 1.08, side * 0.42),
      new THREE.Vector3(-0.62, 1.34, side * 0.52),
      new THREE.Vector3(-1.5, 1.12, side * 0.58),
    ]);
    const geometry = new THREE.TubeGeometry(curve, 36, 0.032, 6, false);
    // Taper each ring toward the tip.
    const position = geometry.getAttribute('position');
    const ring = new THREE.Vector3();
    for (let index = 0; index < position.count; index++) {
      const t = Math.floor(index / 7) / 36;
      const center = curve.getPoint(t);
      ring.fromBufferAttribute(position, index).sub(center).multiplyScalar(1 - t * 0.75).add(center);
      position.setXYZ(index, ring.x, ring.y, ring.z);
    }
    geometry.computeVertexNormals();
    antennae.add(decoration(new THREE.Mesh(geometry, antennaMaterial)));
  });
  group.add(antennae);

  // Short walking legs under the head and small swimmerets under the tail.
  [-1, 1].forEach(side => {
    for (let index = 0; index < 4; index++) {
      const x = 0.86 - index * 0.2;
      group.add(decoration(tube([
        new THREE.Vector3(x, 1.8, side * 0.2),
        new THREE.Vector3(x + 0.05, 1.55, side * 0.32),
        new THREE.Vector3(x - 0.08, 1.38, side * 0.36),
      ], 0.03, legMaterial, 6)));
    }
    [0.36, 0.5, 0.64].forEach(t => {
      const base = spine.getPoint(t);
      const paddle = decoration(ellipsoid(0.1, [0.5, 1.4, 0.35], [base.x + 0.24, base.y - 0.16, side * 0.22], legMaterial));
      paddle.rotation.z = -0.5;
      group.add(paddle);
    });
  });

  const tailFan = new THREE.Group();
  tailFan.name = 'krill-tail-fan';
  tailFan.position.copy(spine.getPoint(1));
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.quadraticCurveTo(0.35, 0.24, 0.84, 0.13);
  finShape.quadraticCurveTo(0.76, -0.2, 0.14, -0.12);
  finShape.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 1, steps: 1, curveSegments: 8 });
  finGeometry.rotateX(Math.PI / 2);
  [-0.6, 0, 0.6].forEach((angle, index) => {
    const fin = solid(finGeometry, index === 1 ? shell : tailMaterial);
    fin.rotation.y = angle;
    fin.rotation.z = -0.18;
    tailFan.add(fin);
  });
  group.add(tailFan);

  // Real krill glow; these photophores glow in Julia's purple, green and red.
  [[0x9558b2, 0.14], [0x389826, 0.3], [0xcb3c33, 0.46]].forEach(([color, t], index) => {
    const center = spine.getPoint(t);
    const spot = decoration(new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 10),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, roughness: 0.3 }),
    ));
    spot.name = `krill-light-${index}`;
    const radius = THREE.MathUtils.lerp(radii[Math.floor(t * 6)], radii[Math.ceil(t * 6)], t * 6 % 1);
    spot.position.set(center.x, center.y - radius * 0.35, radius * 0.7);
    group.add(spot);
  });

  // A small chat bubble, typing: this krill lives in Telegram and Discord.
  const bubble = new THREE.Group();
  bubble.name = 'krill-chat';
  bubble.position.set(2.0, 3.28, 0.3);
  const paper = standard(0xf7f4ee, 0.55, 0.02, 0xf7f4ee, 0.22);
  bubble.add(decoration(new THREE.Mesh(roundedPanel(0.66, 0.38, 0.09, 0.18), paper)));
  const pointer = decoration(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 3), paper));
  pointer.position.set(-0.18, -0.22, 0.045);
  pointer.rotation.z = Math.PI - 0.5;
  bubble.add(pointer);
  const dotGeometry = new THREE.SphereGeometry(0.05, 12, 8);
  const dotMaterial = standard(0x2b3440, 0.4, 0.05);
  [0, 1, 2].forEach(index => {
    const dot = decoration(new THREE.Mesh(dotGeometry, dotMaterial));
    dot.name = `krill-typing-${index}`;
    dot.position.set((index - 1) * 0.16, 0, 0.1);
    bubble.add(dot);
  });
  group.add(bubble);

  return group;
}
