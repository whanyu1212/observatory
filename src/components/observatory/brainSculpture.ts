import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

type Lobe = { center: THREE.Vector3; axes: THREE.Vector3 };

// The cerebrum is a union of lobes; the crease where two lobes meet is a
// fissure. Front is +z, top is +y.
const LOBES: Lobe[] = [-1, 1].flatMap(side => [
  { center: new THREE.Vector3(side * 0.3, 0.04, 0), axes: new THREE.Vector3(0.55, 0.68, 1.1) },
  { center: new THREE.Vector3(side * 0.4, -0.25, 0.26), axes: new THREE.Vector3(0.4, 0.34, 0.66) },
]);

/** Distance from the origin to an ellipsoid's surface along `direction`, or 0 when missed. */
function rayToEllipsoid(direction: THREE.Vector3, { center, axes }: Lobe) {
  const dx = direction.x / axes.x, dy = direction.y / axes.y, dz = direction.z / axes.z;
  const cx = center.x / axes.x, cy = center.y / axes.y, cz = center.z / axes.z;
  const a = dx * dx + dy * dy + dz * dz;
  const b = -2 * (dx * cx + dy * cy + dz * cz);
  const c = cx * cx + cy * cy + cz * cz - 1;
  const discriminant = b * b - 4 * a * c;
  return discriminant < 0 ? 0 : (-b + Math.sqrt(discriminant)) / (2 * a);
}

/** A rounded max, so creases between lobes are soft valleys rather than seams. */
function smoothMax(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

function cerebrumGeometry() {
  const geometry = mergeVertices(new THREE.IcosahedronGeometry(1, 40).deleteAttribute('normal').deleteAttribute('uv'));
  const position = geometry.getAttribute('position');
  const crease = new Float32Array(position.count);
  const direction = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    direction.fromBufferAttribute(position, index).normalize();
    const reach = LOBES.map(lobe => rayToEllipsoid(direction, lobe));
    let radius = reach[0];
    for (let lobe = 1; lobe < reach.length; lobe++) radius = smoothMax(radius, reach[lobe], 0.06);
    // A flatter underside, as the brain sits on its base.
    if (direction.y < 0) radius *= 1 - direction.y * direction.y * 0.18;
    position.setXYZ(index, direction.x * radius, direction.y * radius, direction.z * radius);
    // Creases are where the two nearest lobes reach almost equally far.
    const sorted = [...reach].sort((a, b) => b - a);
    crease[index] = Math.exp(-(sorted[0] - sorted[1]) * 18) * (sorted[1] > 0 ? 1 : 0);
  }
  geometry.setAttribute('aCrease', new THREE.BufferAttribute(crease, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** A ridged, two-lobed cerebellum tucked under the back of the cerebrum. */
function cerebellumGeometry() {
  const halves = [-1, 1].map(side => {
    const half = new THREE.SphereGeometry(1, 48, 32);
    const position = half.getAttribute('position');
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index);
      // Fine horizontal folia run around each lobe.
      point.multiplyScalar(1 + Math.sin(point.y * 26) * 0.035);
      position.setXYZ(index, point.x * 0.34 + side * 0.21, point.y * 0.22, point.z * 0.32);
    }
    half.computeVertexNormals();
    return half;
  });
  return mergeGeometries(halves);
}

// Twelve plane waves in seeded random directions sum to a smooth random field.
// Its zero crossings wind across the surface like sulci; everything between
// them swells into a rounded gyrus. Shared verbatim by both shaders.
function planeWaves(count: number, frequency: number, seed: number) {
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: count }, () => {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    const scale = frequency * (0.85 + random() * 0.3);
    return [Math.cos(angle) * ring * scale, z * scale, Math.sin(angle) * ring * scale, random() * Math.PI * 2];
  });
}
const glslSum = (waves: number[][]) => waves
  .map(([x, y, z, phase]) => `sin(dot(vec3(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}), p) + ${phase.toFixed(3)})`)
  .join(' + ');
const gyriGlsl = /* glsl */ `
  float brainField(vec3 p) {
    return (${glslSum(planeWaves(12, 9.5, 20417))}) * 0.41;
  }
  float brainDetail(vec3 p) {
    return (${glslSum(planeWaves(6, 19.0, 7331))}) * 0.58;
  }
  // 1 on the rounded crown of a gyrus, 0 in the narrow sulcus between two.
  float gyri(vec3 p) {
    float field = abs(brainField(p) + brainDetail(p) * 0.12);
    // Keep rising toward the middle of each fold, so crowns stay rounded.
    return sin(min(field / 1.5, 1.0) * 1.5708);
  }
`;

function cerebrumMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0,
    sheen: 0.25,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffb3c4),
    clearcoat: 0.12,
    clearcoatRoughness: 0.4,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.uGyrusColor = { value: new THREE.Color(0xdc7390) };
    shader.uniforms.uSulcusColor = { value: new THREE.Color(0x7a2345) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aCrease;
        varying vec3 vBrainPosition;
        varying float vCrease;
        ${gyriGlsl}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBrainPosition = position;
        vCrease = aCrease;
        // Gyri swell outward, fading into the fissures between lobes.
        transformed += normalize(objectNormal) * (gyri(position) - 0.65) * 0.08 * (1.0 - aCrease * 0.7);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uGyrusColor;
        uniform vec3 uSulcusColor;
        varying vec3 vBrainPosition;
        varying float vCrease;
        ${gyriGlsl}
        vec3 bumpNormal(vec3 position, vec3 normal, float height, float faceDirection) {
          vec3 sigmaX = normalize(dFdx(position));
          vec3 sigmaY = normalize(dFdy(position));
          vec3 r1 = cross(sigmaY, normal);
          vec3 r2 = cross(normal, sigmaX);
          float determinant = dot(sigmaX, r1) * faceDirection;
          vec3 gradient = sign(determinant) * (dFdx(height) * r1 + dFdy(height) * r2);
          return normalize(abs(determinant) * normal - gradient);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float brainHeight = gyri(vBrainPosition);
        // Deep sulci and lobe creases darken; gyrus crowns stay light.
        float shade = brainHeight * (1.0 - vCrease * 0.75);
        diffuseColor.rgb *= mix(uSulcusColor, uGyrusColor, smoothstep(0.0, 0.95, shade));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = bumpNormal(-vViewPosition, normal, brainHeight * 0.06, faceDirection);`);
  };
  return material;
}

/** A stylized brain about 2 units long, resting with its base at y = 0. */
export function createBrain() {
  const brain = new THREE.Group();
  brain.name = 'mental-gym-brain';
  const cerebrum = new THREE.Mesh(cerebrumGeometry(), cerebrumMaterial());
  cerebrum.name = 'mental-gym-cerebrum';
  cerebrum.position.y = 0.66;
  cerebrum.castShadow = true;
  cerebrum.receiveShadow = true;
  brain.add(cerebrum);
  const cerebellum = new THREE.Mesh(cerebellumGeometry(), new THREE.MeshPhysicalMaterial({
    color: 0xd97b93, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xffc8d4),
  }));
  cerebellum.position.set(0, 0.3, -0.84);
  cerebellum.rotation.x = 0.35;
  cerebellum.castShadow = true;
  cerebellum.receiveShadow = true;
  brain.add(cerebellum);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.42, 14), new THREE.MeshStandardMaterial({ color: 0xc86b85, roughness: 0.6 }));
  stem.position.set(0, 0.2, -0.3);
  stem.rotation.x = 0.35;
  stem.castShadow = true;
  brain.add(stem);
  return brain;
}
