import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedPanel } from './refinedLandmarks';

function material(color: number, roughness = 0.6, metalness = 0.1, emissive = 0, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function solid(geometry: THREE.BufferGeometry, surface: THREE.Material, decorative = false) {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.castShadow = !decorative;
  mesh.receiveShadow = !decorative;
  if (decorative) mesh.userData.decorative = true;
  return mesh;
}

function tube(points: THREE.Vector3[], radius: number, surface: THREE.Material, segments = 48) {
  return solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 6, false), surface, true);
}

/** A flat label painted onto a canvas, for stencils and tape. */
function paintedTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const BENCH_RADIUS = 1.3;
const BENCH_TOP = 0.8;

/**
 * A robotic desk arm: base, shoulder, elbow, tool. The shoulder and elbow are
 * named groups so the reactions can make each agent take its turn.
 */
function roboticArm(role: string, tool: THREE.Object3D, steel: THREE.Material, joint: THREE.Material) {
  const root = new THREE.Group();
  root.name = `alpha-arm-${role}`;
  root.add(solid(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16), joint));
  const shoulder = new THREE.Group();
  shoulder.name = `alpha-shoulder-${role}`;
  shoulder.position.y = 0.06;
  root.add(shoulder);
  const lower = solid(new THREE.CapsuleGeometry(0.045, 0.42, 4, 10), steel);
  lower.position.y = 0.25;
  shoulder.add(lower);
  const elbow = new THREE.Group();
  elbow.name = `alpha-elbow-${role}`;
  elbow.position.y = 0.5;
  shoulder.add(elbow);
  elbow.add(solid(new THREE.SphereGeometry(0.07, 14, 10), joint));
  const upper = solid(new THREE.CapsuleGeometry(0.036, 0.34, 4, 10), steel);
  upper.position.y = 0.2;
  elbow.add(upper);
  tool.position.y = 0.42;
  elbow.add(tool);
  // Rest pose: lean forward over the station.
  shoulder.rotation.x = 0.3;
  elbow.rotation.x = 1.35;
  return root;
}

/** Alpha Workbench: agents research, weigh risk and execute, and alpha rises from the desk. */
export function makeAlphaWorkbench(): THREE.Group {
  const group = new THREE.Group();
  // Face the arrival view, which looks back at this rock from beyond the planet.
  group.rotation.y = -2.78;
  const walnut = material(0x6b4632, 0.62, 0.05);
  const brass = material(0xd2a864, 0.35, 0.7);
  const steel = material(0xb9c3cc, 0.4, 0.45);
  const joint = material(0x3e4a56, 0.45, 0.4);
  const paper = material(0xf3eee2, 0.85, 0.02);
  const ink = material(0x3a4450, 0.7, 0.05);

  // The workbench: a hexagonal walnut top with a brass rim and three legs.
  const top = solid(new THREE.CylinderGeometry(BENCH_RADIUS, BENCH_RADIUS, 0.12, 6), walnut);
  top.rotation.y = Math.PI / 6;
  top.position.y = BENCH_TOP - 0.06;
  group.add(top);
  const corner = (index: number) => {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    return new THREE.Vector3(Math.sin(angle) * BENCH_RADIUS, 0, Math.cos(angle) * BENCH_RADIUS);
  };
  const rim = solid(mergeGeometries(Array.from({ length: 6 }, (_, index) => {
    const from = corner(index), to = corner(index + 1);
    const edge = new THREE.BoxGeometry(from.distanceTo(to) + 0.04, 0.05, 0.05);
    edge.rotateY(-Math.atan2(to.z - from.z, to.x - from.x));
    return edge.translate((from.x + to.x) / 2, BENCH_TOP, (from.z + to.z) / 2);
  })), brass);
  group.add(rim);
  const legs = solid(mergeGeometries([0, 2, 4].map(index => {
    const at = corner(index).multiplyScalar(0.78);
    return new THREE.CylinderGeometry(0.05, 0.065, BENCH_TOP - 0.12, 8).translate(at.x, (BENCH_TOP - 0.12) / 2, at.z);
  })), joint);
  group.add(legs);

  // A stencil on the front face: this one is not public yet.
  const stencil = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.1), new THREE.MeshBasicMaterial({
    transparent: true,
    map: paintedTexture(512, 56, context => {
      context.fillStyle = '#e9c77a';
      context.font = '700 34px "IBM Plex Mono", ui-monospace, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('PRIVATE · IN PROGRESS', 256, 30);
    }),
  }));
  stencil.userData.decorative = true;
  stencil.position.set(0, BENCH_TOP - 0.06, BENCH_RADIUS * Math.cos(Math.PI / 6) + 0.005);
  group.add(stencil);

  // Three stations around the bench, one per agent.
  const station = (angle: number, radius = 0.9) => new THREE.Vector3(Math.sin(angle) * radius, BENCH_TOP, Math.cos(angle) * radius);
  const stations = { research: station(-1.25), risk: station(1.25), execution: station(Math.PI) };

  // Research: a news sheet under a magnifying lens.
  const sheet = solid(new THREE.BoxGeometry(0.36, 0.012, 0.26), paper, true);
  sheet.position.copy(stations.research).add(new THREE.Vector3(0, 0.01, 0));
  sheet.rotation.y = -1.25;
  group.add(sheet);
  const sheetLines = solid(mergeGeometries([-0.07, -0.02, 0.03, 0.08].map((z, index) =>
    new THREE.BoxGeometry(index === 0 ? 0.26 : 0.2, 0.006, 0.018).translate(index === 0 ? 0 : -0.03, 0.01, z))), ink, true);
  sheetLines.position.copy(sheet.position);
  sheetLines.rotation.y = sheet.rotation.y;
  group.add(sheetLines);
  const lens = new THREE.Group();
  lens.add(solid(new THREE.TorusGeometry(0.09, 0.016, 8, 24), brass, true));
  const glass = solid(new THREE.CircleGeometry(0.085, 24), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide }), true);
  lens.add(glass);
  lens.rotation.x = Math.PI / 2;

  // Risk: a gauge whose needle swings between green and red.
  const gauge = new THREE.Group();
  gauge.position.copy(stations.risk);
  gauge.rotation.y = 1.25 + Math.PI;
  const face = solid(new THREE.CircleGeometry(0.17, 32, 0, Math.PI), paper, true);
  face.position.y = 0.06;
  gauge.add(face);
  [[0x4fc38a, 0], [0xe8c25a, 1], [0xe06a5a, 2]].forEach(([color, index]) => {
    const band = solid(new THREE.RingGeometry(0.12, 0.16, 12, 1, Math.PI - (index + 1) * Math.PI / 3, Math.PI / 3), material(color, 0.6, 0, color, 0.25), true);
    band.position.set(0, 0.06, 0.002);
    gauge.add(band);
  });
  const needle = new THREE.Group();
  needle.name = 'alpha-risk-needle';
  needle.position.set(0, 0.06, 0.006);
  const pointer = solid(new THREE.BoxGeometry(0.012, 0.13, 0.008), ink, true);
  pointer.position.y = 0.065;
  needle.add(pointer);
  gauge.add(needle);
  const stand = solid(new THREE.BoxGeometry(0.36, 0.06, 0.08), joint, true);
  stand.position.y = 0.03;
  gauge.add(stand);
  group.add(gauge);
  const probe = solid(new THREE.ConeGeometry(0.04, 0.14, 10), brass, true);

  // Execution: a stack of order tickets and a stamp.
  const tickets = solid(mergeGeometries([0, 1, 2].map(index =>
    new THREE.BoxGeometry(0.24, 0.014, 0.16).rotateY(index * 0.12).translate(0, 0.01 + index * 0.016, 0))), paper, true);
  tickets.position.copy(stations.execution);
  group.add(tickets);
  const stamp = new THREE.Group();
  const handle = solid(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), walnut, true);
  handle.position.y = -0.02;
  stamp.add(handle);
  const pad = solid(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 16), material(0xc9463d, 0.55, 0.05, 0xc9463d, 0.2), true);
  pad.position.y = 0.06;
  stamp.add(pad);
  stamp.rotation.x = Math.PI;

  // Each arm stands just inside its station and leans over it.
  ([
    ['research', lens, stations.research],
    ['risk', probe, stations.risk],
    ['execution', stamp, stations.execution],
  ] as const).forEach(([role, tool, at]) => {
    const arm = roboticArm(role, tool, steel, joint);
    arm.scale.setScalar(1.25);
    // The rest pose reaches about 0.7 forward, landing the tool over the station.
    const inward = at.clone().setY(0).multiplyScalar(0.32);
    arm.position.set(inward.x, BENCH_TOP, inward.z);
    arm.rotation.y = Math.atan2(at.x, at.z);
    group.add(arm);
  });

  // The agents' shared signal travels station to station, then feeds alpha.
  const signal = solid(new THREE.SphereGeometry(0.055, 14, 10), new THREE.MeshBasicMaterial({ color: 0xbff7ee, toneMapped: false }), true);
  signal.name = 'alpha-signal';
  signal.userData.stations = [stations.research, stations.risk, stations.execution].map(point => point.clone().setY(BENCH_TOP + 0.55));
  group.add(signal);

  // A holographic emitter projects a rising curve that ends in the alpha glyph.
  const emitter = solid(new THREE.CylinderGeometry(0.1, 0.13, 0.05, 24), material(0x1d2b33, 0.5, 0.3, 0x6fe0cf, 0.35));
  emitter.position.y = BENCH_TOP + 0.025;
  group.add(emitter);
  const rise = new THREE.CatmullRomCurve3([
    [-0.42, 0.95], [-0.3, 1.12], [-0.2, 1.04], [-0.08, 1.36], [0.02, 1.28], [0.12, 1.62], [0.2, 1.55], [0.28, 1.92],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const radial = 6;
  const curve = solid(new THREE.TubeGeometry(rise, 80, 0.022, radial, false), new THREE.MeshBasicMaterial({ color: 0x7ff0dc, toneMapped: false, transparent: true, opacity: 0.9 }), true);
  curve.name = 'alpha-curve';
  curve.userData.stride = radial * 6;
  group.add(curve);
  const glyph = new THREE.Group();
  glyph.name = 'alpha-glyph';
  glyph.position.set(0.4, 2.35, 0);
  glyph.scale.setScalar(1.35);
  glyph.add(tube([
    [0.34, 0.3], [0.12, 0.06], [-0.12, -0.22], [-0.34, -0.12], [-0.36, 0.12], [-0.14, 0.26], [0.1, 0.02], [0.32, -0.26],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)), 0.055, new THREE.MeshBasicMaterial({ color: 0xffcf6b, toneMapped: false })));
  group.add(glyph);

  // Work in progress: scaffolding on the back corner, wrapped in caution tape.
  const scaffold = solid(mergeGeometries([
    ...[[-0.9, -0.55], [-0.45, -0.95], [-1.25, -0.95], [-0.8, -1.35]].map(([x, z]) =>
      new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6).translate(x, 0.95, z)),
    new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6).rotateX(Math.PI / 2).rotateY(-0.7).translate(-0.67, 1.55, -0.75),
    new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6).rotateX(Math.PI / 2).rotateY(-0.7).translate(-1.02, 1.55, -1.15),
    new THREE.CylinderGeometry(0.018, 0.018, 1.2, 6).rotateZ(0.6).rotateY(-0.7).translate(-0.85, 1.0, -0.95),
  ]), steel, true);
  group.add(scaffold);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.01), new THREE.MeshStandardMaterial({
    roughness: 0.7,
    map: paintedTexture(256, 32, context => {
      context.fillStyle = '#f2c84b';
      context.fillRect(0, 0, 256, 32);
      context.fillStyle = '#1d2228';
      for (let x = -32; x < 256; x += 32) {
        context.beginPath();
        context.moveTo(x, 32); context.lineTo(x + 16, 32); context.lineTo(x + 32, 0); context.lineTo(x + 16, 0);
        context.fill();
      }
    }),
  }));
  tape.userData.decorative = true;
  tape.position.set(-0.67, 1.2, -0.75);
  tape.rotation.y = -0.7 + Math.PI / 2;
  group.add(tape);
  return group;
}

/** A small probe at the edge of the map, blinking toward the hidden island. */
export function makeSignalBuoy(): THREE.Group {
  const buoy = new THREE.Group();
  buoy.name = 'signal-buoy';
  const shell = material(0xc9d3dc, 0.4, 0.5);
  const panel = material(0x28405e, 0.35, 0.6, 0x1a3a66, 0.2);
  buoy.add(solid(new THREE.IcosahedronGeometry(0.24, 1), shell, true));
  const mast = solid(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), shell, true);
  mast.position.y = 0.4;
  buoy.add(mast);
  [-1, 1].forEach(side => {
    const wing = solid(roundedPanel(0.36, 0.2, 0.015, 0.02), panel, true);
    wing.position.set(side * 0.44, 0, -0.008);
    buoy.add(wing);
  });
  const light = solid(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff8a5c, toneMapped: false }), true);
  light.name = 'signal-buoy-light';
  light.position.y = 0.67;
  buoy.add(light);
  // A generous invisible tap target: on touch screens, tapping the buoy is the way to follow its signal.
  const target = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  target.name = 'signal-buoy-target';
  buoy.add(target);
  buoy.userData.bobAmplitude = 0.12;
  buoy.userData.bobSpeed = 0.9;
  buoy.userData.spinY = 0.25;
  return buoy;
}
