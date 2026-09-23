import * as THREE from 'three';
import { createAsteroidGeometry } from './rockGeometry';
import { createRockMaterial } from './rockSurface';

export const SUN_POSITION = new THREE.Vector3(0, 1, -48);

// Distant landmarks add scale and parallax without extra lights or particle loops.
export function createCelestialScenery() {
  const object = new THREE.Group();
  object.name = 'celestial-scenery';

  // Bake the small solar disc and soft corona once; no bloom or animated shader.
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = sunCanvas.height = 128;
  const context = sunCanvas.getContext('2d')!;
  const corona = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  corona.addColorStop(0, '#fff8e3');
  corona.addColorStop(0.16, '#fff2c8');
  corona.addColorStop(0.25, '#ffdf91');
  corona.addColorStop(0.28, '#ffc76b');
  corona.addColorStop(0.32, 'rgba(242,170,80,0.18)');
  corona.addColorStop(0.55, 'rgba(235,157,67,0.055)');
  corona.addColorStop(1, 'rgba(235,157,67,0)');
  context.fillStyle = corona;
  context.fillRect(0, 0, 128, 128);
  const sunTexture = new THREE.CanvasTexture(sunCanvas);
  sunTexture.colorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTexture, transparent: true, depthWrite: false, fog: false, toneMapped: false,
  }));
  sun.name = 'distant-sun';
  sun.position.copy(SUN_POSITION);
  sun.scale.set(9, 9, 1);
  const sunMaterial = sun.material;
  object.add(sun);

  const planetSystem = new THREE.Group();
  planetSystem.position.set(-4, 0, -33);
  planetSystem.rotation.z = 0.3;
  const planetGeometry = new THREE.SphereGeometry(3.2, 32, 20);
  const planetPositions = planetGeometry.getAttribute('position');
  const planetColors = new Float32Array(planetPositions.count * 3);
  const blue = new THREE.Color(0x263e54);
  const sand = new THREE.Color(0x52616a);
  const color = new THREE.Color();
  for (let i = 0; i < planetPositions.count; i++) {
    const latitude = planetPositions.getY(i) / 3.2;
    const band = 0.5 + Math.sin(latitude * 23 + Math.sin(latitude * 8)) * 0.5;
    color.copy(blue).lerp(sand, band * 0.7);
    color.toArray(planetColors, i * 3);
  }
  planetGeometry.setAttribute('color', new THREE.BufferAttribute(planetColors, 3));
  const planet = new THREE.Mesh(planetGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  planet.name = 'ringed-planet';
  planetSystem.add(planet);

  const ringGeometry = new THREE.RingGeometry(3.9, 5.7, 80, 4);
  const ringPositions = ringGeometry.getAttribute('position');
  const ringColors = new Float32Array(ringPositions.count * 3);
  const ringInner = new THREE.Color(0x66727b);
  const ringOuter = new THREE.Color(0x3b4759);
  for (let i = 0; i < ringPositions.count; i++) {
    const radius = Math.hypot(ringPositions.getX(i), ringPositions.getY(i));
    color.copy(ringInner).lerp(ringOuter, (radius - 3.9) / 1.8);
    color.multiplyScalar(0.8 + Math.cos((radius - 3.9) * 14) * 0.2);
    color.toArray(ringColors, i * 3);
  }
  ringGeometry.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));
  const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false,
  }));
  ring.rotation.x = Math.PI / 2;
  planetSystem.add(ring);
  object.add(planetSystem);

  const moonGeometry = new THREE.IcosahedronGeometry(1.45, 2);
  const moonPositions = moonGeometry.getAttribute('position');
  const moonColors = new Float32Array(moonPositions.count * 3);
  const moonColor = new THREE.Color(0x5a6371);
  for (let i = 0; i < moonPositions.count; i++) {
    const x = moonPositions.getX(i), y = moonPositions.getY(i), z = moonPositions.getZ(i);
    const mottling = Math.sin(x * 4 + z * 2) * Math.sin(y * 5 - z * 3);
    color.copy(moonColor).multiplyScalar(0.8 + mottling * 0.2);
    color.toArray(moonColors, i * 3);
  }
  moonGeometry.setAttribute('color', new THREE.BufferAttribute(moonColors, 3));
  const moon = new THREE.Mesh(moonGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  moon.name = 'distant-moon';
  moon.position.set(-24, -6, -3);
  object.add(moon);

  // All rocks share one draw call; their transforms are uploaded only at creation.
  const belt = new THREE.InstancedMesh(
    createAsteroidGeometry(9173),
    createRockMaterial(),
    44,
  );
  belt.name = 'asteroid-belt';
  const transform = new THREE.Object3D();
  let seed = 9173;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < belt.count; i++) {
    const angle = (i + random() * 0.8) / belt.count * Math.PI * 2;
    const radius = 23 + random() * 5;
    const size = (0.14 + random() * 0.32) * (i % 11 === 0 ? 1.4 : 1);
    transform.position.set(Math.cos(angle) * radius, -5 - random() * 3, Math.sin(angle) * radius * 0.88);
    transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    transform.scale.set(size * (1.15 + random() * 0.55), size * (0.7 + random() * 0.4), size);
    transform.updateMatrix();
    belt.setMatrixAt(i, transform.matrix);
    color.setHex(i % 3 === 0 ? 0xe4d4bc : 0xd5d8df).multiplyScalar(0.72 + random() * 0.28);
    belt.setColorAt(i, color);
  }
  belt.instanceMatrix.needsUpdate = true;
  if (belt.instanceColor) belt.instanceColor.needsUpdate = true;
  belt.computeBoundingSphere();
  object.add(belt);

  return {
    object,
    sunTint: sunMaterial.color,
    update(dt: number, motionEnabled: boolean) {
      if (motionEnabled) belt.rotation.y += dt * 0.003;
    },
    // Scene teardown owns shared geometries/materials; InstancedMesh owns its buffers.
    dispose() { belt.dispose(); },
  };
}
