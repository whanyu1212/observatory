import * as THREE from 'three';

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

export function makeGem() {
  const group = new THREE.Group();
  group.name = 'gem-dota-sculpture';
  group.userData.bobAmplitude = 0.075;
  group.userData.bobSpeed = 1.25;

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
  group.add(gem);
  const core = decoration(new THREE.Mesh(new THREE.OctahedronGeometry(.23), new THREE.MeshBasicMaterial({ color: 0xc9ffe7, toneMapped: false })));
  core.name = 'gem-inner-light';
  core.position.y = 1.6;
  group.add(core);
  const edges = decoration(new THREE.LineSegments(new THREE.EdgesGeometry(gem.geometry, 24), new THREE.LineBasicMaterial({ color: 0xc1ffe9, transparent: true, opacity: .22, depthWrite: false })));
  group.add(edges);

  const reflectedLight = decoration(new THREE.Mesh(
    new THREE.TorusGeometry(1.22, 0.035, 6, 40),
    new THREE.MeshBasicMaterial({
      color: PALETTE.teal,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ));
  reflectedLight.rotation.x = Math.PI / 2;
  reflectedLight.position.y = 0.13;
  group.add(reflectedLight);

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
  group.add(sparkleOrbit);

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
  group.rotation.y = 0.1;
  group.userData.bobAmplitude = 0.075;
  group.userData.bobSpeed = 1.4;

  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xf16b42, roughness: 0.32, metalness: 0.02,
    clearcoat: 0.8, clearcoatRoughness: 0.2,
  });
  const tailMaterial = standard(0xe34c35, 0.38, 0.02);
  const seamMaterial = standard(0xa63730, 0.5, 0.02);
  const legMaterial = standard(0xffb479, 0.44, 0.02);
  const eyeMaterial = standard(0x080d15, 0.13, 0.05);
  const antennaMaterial = standard(0xffa36c, 0.42, 0.02, 0xa84126, 0.08);

  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.67, 2.14, 0),
    new THREE.Vector3(0.07, 2.19, 0),
    new THREE.Vector3(-0.61, 1.99, 0),
    new THREE.Vector3(-1.13, 1.52, 0),
    new THREE.Vector3(-1.13, 1.02, 0),
    new THREE.Vector3(-0.76, 0.67, 0),
    new THREE.Vector3(-0.28, 0.61, 0),
  ]);
  const radii = [0.38, 0.46, 0.39, 0.29, 0.2, 0.12, 0.065];
  const abdomen = solid(krillShell(spine, radii), shell);
  abdomen.name = 'krill-abdomen';
  group.add(abdomen);

  // Fine shell joints read as armour plates, without a row of bead-shaped segments.
  for (let index = 1; index < radii.length - 1; index++) {
    const t = index / (radii.length - 1);
    const center = spine.getPoint(t);
    const tangent = spine.getTangent(t);
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const points = Array.from({ length: 25 }, (_, side) => {
      const angle = side / 24 * Math.PI * 2;
      const point = center.clone().addScaledVector(normal, Math.cos(angle) * (radii[index] + 0.008));
      point.z += Math.sin(angle) * (radii[index] + 0.008) * 0.72;
      return point;
    });
    group.add(tube(points, 0.017, seamMaterial, 24));
  }

  const head = ellipsoid(0.5, [1.27, 0.75, 0.65], [0.68, 2.12, 0], shell);
  head.name = 'krill-head';
  group.add(head);
  const rostrum = solid(new THREE.ConeGeometry(0.13, 0.91, 6), shell);
  rostrum.rotation.z = -Math.PI / 2 + 0.19;
  rostrum.position.set(1.41, 2.24, 0);
  group.add(rostrum);
  [0, 1, 2].forEach(index => {
    const tooth = solid(new THREE.ConeGeometry(0.046, 0.16 - index * 0.02, 4), tailMaterial);
    tooth.position.set(1.23 + index * 0.18, 2.39 + index * 0.025, 0);
    tooth.rotation.z = -0.35;
    group.add(tooth);
  });

  const tailFan = new THREE.Group();
  tailFan.name = 'krill-tail-fan';
  tailFan.position.copy(spine.getPoint(1));
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.quadraticCurveTo(0.35, 0.24, 0.88, 0.13);
  finShape.quadraticCurveTo(0.78, -0.2, 0.14, -0.12);
  finShape.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 1, steps: 1, curveSegments: 8 });
  finGeometry.rotateX(Math.PI / 2);
  [-0.62, 0, 0.62].forEach((angle, index) => {
    const fin = solid(finGeometry, index === 1 ? shell : tailMaterial);
    fin.rotation.y = angle;
    fin.rotation.z = -0.18;
    tailFan.add(fin);
  });
  group.add(tailFan);

  [-1, 1].forEach(side => {
    const base = new THREE.Vector3(1.02, 2.22, side * 0.21);
    const tip = new THREE.Vector3(1.12, 2.53, side * 0.34);
    group.add(tube([base, tip], 0.042, tailMaterial, 5));
    const eye = solid(new THREE.SphereGeometry(0.13, 14, 10), eyeMaterial);
    eye.position.copy(tip);
    group.add(eye);
    const glint = decoration(new THREE.Mesh(new THREE.SphereGeometry(0.033, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff5dc })));
    glint.position.copy(tip).add(new THREE.Vector3(0.04, 0.055, 0.08));
    group.add(glint);
  });

  const antennae = new THREE.Group();
  antennae.name = 'krill-antennae';
  antennae.position.set(1.16, 2.21, 0);
  antennae.add(
    tube([
      new THREE.Vector3(0, 0, 0.18),
      new THREE.Vector3(0.56, 0.6, 0.3),
      new THREE.Vector3(0.37, 1.16, 0.37),
      new THREE.Vector3(-0.65, 1.43, 0.45),
    ], 0.025, antennaMaterial, 26),
    tube([
      new THREE.Vector3(0, 0, -0.18),
      new THREE.Vector3(0.87, 0.29, -0.28),
      new THREE.Vector3(1.07, 0.83, -0.36),
      new THREE.Vector3(0.6, 1.1, -0.45),
    ], 0.022, antennaMaterial, 24),
  );
  group.add(antennae);

  // Paired, angular legs leave an open space inside the curled abdomen.
  [-1, 1].forEach(side => {
    for (let index = 0; index < 5; index++) {
      const x = 0.84 - index * 0.19;
      group.add(tube([
        new THREE.Vector3(x, 1.91, side * 0.2),
        new THREE.Vector3(x + 0.1, 1.49 - index * 0.055, side * 0.44),
        new THREE.Vector3(x + 0.48, 1.17 - index * 0.055, side * 0.64),
      ], 0.027, legMaterial, 8));
    }
    [0.39, 0.53, 0.66].forEach(t => {
      const base = spine.getPoint(t);
      group.add(tube([
        base.clone().add(new THREE.Vector3(0.12, -0.08, side * 0.15)),
        base.clone().add(new THREE.Vector3(0.34, -0.12, side * 0.28)),
        base.clone().add(new THREE.Vector3(0.43, -0.27, side * 0.32)),
      ], 0.022, legMaterial, 6));
    });
  });

  return group;
}
