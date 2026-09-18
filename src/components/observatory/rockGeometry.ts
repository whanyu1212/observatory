import * as THREE from 'three';

function noise(seed: number, x: number, y: number, z: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 59.31) * 43758.5453;
  return value - Math.floor(value);
}

/** A closed, broad rock with a level inner seat for the project sculpture. */
export function createIslandRockGeometry(rx: number, rz: number, seed: number): THREE.BufferGeometry {
  const segments = 24;
  // The upper two rings support the landmark. Lower rings shift laterally so
  // the sides and underside read as broken stone rather than a straight drum.
  const rings = [
    { radius: 0.38, y: 0.7, shiftX: 0, shiftZ: 0, v: 0.035 },
    { radius: 0.72, y: 0.695, shiftX: 0, shiftZ: 0, v: 0.068 },
    { radius: 0.99, y: 0.52, shiftX: 0.03, shiftZ: -0.02, v: 0.098 },
    { radius: 1.02, y: 0.01, shiftX: 0.10, shiftZ: -0.04, v: 0.146 },
    { radius: 0.93, y: -0.62, shiftX: 0.16, shiftZ: 0.08, v: 0.205 },
    { radius: 0.72, y: -1.17, shiftX: 0.07, shiftZ: 0.15, v: 0.259 },
    { radius: 0.39, y: -1.5, shiftX: -0.03, shiftZ: 0.12, v: 0.296 },
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    positions.push(0, 0.7, 0);
    colors.push(0.94, 0.94, 0.94);
    uvs.push((index + 0.5) / segments, 0);
  }

  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex];
    for (let index = 0; index <= segments; index += 1) {
      const sector = index % segments;
      const angle = index / segments * Math.PI * 2;
      const broad = Math.sin(angle * 3 + seed * 1.73) * 0.13
        + Math.sin(angle * 5 - seed * 0.91) * 0.065
        + Math.sin(angle * 2 + seed * 0.47) * 0.075;
      const wandering = Math.sin(angle * 2 + seed * 1.11 + ringIndex * 0.64) * (ringIndex < 2 ? 0.01 : 0.075);
      const chip = (noise(seed, sector, ringIndex, 1) - 0.5) * (ringIndex < 2 ? 0.025 : 0.14);
      const radius = ring.radius * (1 + broad * (ringIndex < 2 ? 0.25 : 1) + wandering + chip);
      const angleJitter = (noise(seed, sector, ringIndex, 2) - 0.5) * (ringIndex < 2 ? 0.012 : 0.055);
      const theta = angle + angleJitter;
      const x = rx * (Math.cos(theta) * radius + ring.shiftX);
      const z = rz * (Math.sin(theta) * radius + ring.shiftZ);
      const heightJitter = ringIndex < 2 ? 0 : (noise(seed, sector, ringIndex, 3) - 0.5) * 0.25;
      const y = Math.min(0.7, ring.y + heightJitter);
      positions.push(x, y, z);
      // Side texel scale stays roughly isotropic; the duplicate at u=1 closes
      // the texture without stretching it along any flank.
      uvs.push(index / segments, ring.v + heightJitter / (Math.PI * (rx + rz)));
      const crevice = Math.max(0, -chip) * 1.5;
      const mottling = noise(seed + 13, sector, ringIndex, 4) * 0.15;
      const shade = THREE.MathUtils.clamp(0.69 + mottling + (ringIndex < 2 ? 0.10 : 0.03) - crevice, 0.65, 0.98);
      colors.push(shade, shade * (0.98 + noise(seed + 5, sector, ringIndex, 5) * 0.02), shade * 0.99);
    }
  }

  const bottomStart = positions.length / 3;
  for (let index = 0; index < segments; index += 1) {
    positions.push(rx * -0.07, -1.53, rz * 0.13);
    colors.push(0.7, 0.69, 0.69);
    uvs.push((index + 0.5) / segments, 0.33);
  }
  for (let index = 0; index < segments; index += 1) {
    indices.push(index, segments + index, segments + index + 1);
    for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
      const upper = segments + ringIndex * (segments + 1);
      const lower = upper + segments + 1;
      indices.push(upper + index, lower + index, upper + index + 1);
      indices.push(upper + index + 1, lower + index, lower + index + 1);
    }
    const last = segments + (rings.length - 1) * (segments + 1);
    indices.push(last + index, bottomStart + index, last + index + 1);
  }
  for (let index = 0; index < indices.length; index += 3) {
    [indices[index + 1], indices[index + 2]] = [indices[index + 2], indices[index + 1]];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  setCoherentNormals(geometry);
  geometry.computeBoundingSphere();
  return geometry;
}

function setCoherentNormals(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const indices = geometry.index!.array;
  const normals = new Float32Array(positions.count * 3);
  const byPosition = new Map<string, THREE.Vector3>();
  const keys: string[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    const key = `${Math.round(positions.getX(index) * 100000)},${Math.round(positions.getY(index) * 100000)},${Math.round(positions.getZ(index) * 100000)}`;
    keys.push(key);
    if (!byPosition.has(key)) byPosition.set(key, new THREE.Vector3());
  }
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let index = 0; index < indices.length; index += 3) {
    const corners = [indices[index], indices[index + 1], indices[index + 2]];
    a.fromBufferAttribute(positions, corners[0]);
    b.fromBufferAttribute(positions, corners[1]);
    c.fromBufferAttribute(positions, corners[2]);
    const face = ab.subVectors(b, a).cross(ac.subVectors(c, a));
    for (const corner of corners) byPosition.get(keys[corner])!.add(face);
  }
  for (let index = 0; index < positions.count; index += 1) {
    const normal = byPosition.get(keys[index])!.normalize();
    normals[index * 3] = normal.x;
    normals[index * 3 + 1] = normal.y;
    normals[index * 3 + 2] = normal.z;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
}

/** Shared low-cost asteroid shape for the belt and island fragments. */
export function createAsteroidGeometry(seed: number, detail = 1): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const normals = new Float32Array(positions.count * 3);
  const keys: string[] = [];
  const normalByKey = new Map<string, THREE.Vector3>();
  const phase = seed * 1.37;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const key = `${Math.round(x * 100000)},${Math.round(y * 100000)},${Math.round(z * 100000)}`;
    keys.push(key);
    const ridges = Math.sin(x * 4.7 + phase) * Math.sin(z * 3.6 - phase * 0.6)
      + Math.sin(y * 5.3 - phase * 0.75) * 0.55;
    const chip = noise(seed, Math.round(x * 1000), Math.round(y * 1000), Math.round(z * 1000)) - 0.5;
    const radius = 0.93 + ridges * 0.11 + chip * 0.23;
    positions.setXYZ(index, x * radius, y * radius * 0.84, z * radius * 1.08);
    const shade = THREE.MathUtils.clamp(0.82 + ridges * 0.075 + chip * 0.13, 0.65, 0.98);
    colors[index * 3] = shade;
    colors[index * 3 + 1] = shade * 0.99;
    colors[index * 3 + 2] = shade * 0.98;
  }

  // IcosahedronGeometry repeats vertices per face and around its UV seam.
  // Accumulate face normals by original position so every copy shades alike.
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 3) {
    a.fromBufferAttribute(positions, index);
    b.fromBufferAttribute(positions, index + 1);
    c.fromBufferAttribute(positions, index + 2);
    const faceNormal = ab.subVectors(b, a).cross(ac.subVectors(c, a));
    for (let corner = 0; corner < 3; corner += 1) {
      const key = keys[index + corner];
      const normal = normalByKey.get(key) ?? new THREE.Vector3();
      normal.add(faceNormal);
      normalByKey.set(key, normal);
    }
  }
  for (let index = 0; index < positions.count; index += 1) {
    const normal = normalByKey.get(keys[index])!.normalize();
    normals[index * 3] = normal.x;
    normals[index * 3 + 1] = normal.y;
    normals[index * 3 + 2] = normal.z;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
