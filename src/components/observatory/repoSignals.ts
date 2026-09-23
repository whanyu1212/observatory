import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ProjectId } from './curiosity';
import type { RepoStatsMap } from '@/lib/repoStats';
import type { GlowSource } from './glowSprites';

const ACTIVE_DAYS = 7;
const MAX_STARS = 8;
const MAX_ROCKS = 6;

// Additive colour with alpha from brightness, like the other glows, so the
// transparent canvas never stamps opaque shapes over the page behind it.
const glowBlending = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;

function starGeometry() {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 ? 0.055 : 0.13;
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
  return geometry.center();
}

/**
 * GitHub activity, made visible: islands pushed to this week send up a beam of
 * light, each project's stars stand on its island as small gold stars
 * (log-scaled), and open issues circle it as little rocks. Three draw calls.
 */
export function createRepoSignals(ground: THREE.Object3D[], stats: RepoStatsMap, accent: THREE.Color, now = Date.now()) {
  const group = new THREE.Group();
  group.name = 'repo-signals';
  const glowSources: GlowSource[] = [];
  const caps = new Map<ProjectId, THREE.Object3D>();
  ground.forEach(cap => { if (cap.userData.projectId) caps.set(cap.userData.projectId as ProjectId, cap); });

  const starMatrices: Array<{ position: THREE.Vector3; phase: number }> = [];
  const rocks: Array<{ center: THREE.Vector3; radius: number; phase: number; height: number }> = [];
  const beams: THREE.BufferGeometry[] = [];
  // Beams stand on each island's far side from the home view, clear of its sculpture.
  const farSide = new THREE.Vector3(-0.58, 0, -0.81);

  Object.entries(stats).forEach(([id, repo], projectIndex) => {
    const cap = caps.get(id as ProjectId);
    if (!cap || !repo) return;
    cap.updateWorldMatrix(true, false);
    const mesh = cap as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const halfX = (box.max.x - box.min.x) / 2, halfZ = (box.max.z - box.min.z) / 2;
    const rim = (angle: number, reach: number) => cap.localToWorld(new THREE.Vector3(Math.cos(angle) * halfX * reach, 0.7, Math.sin(angle) * halfZ * reach));
    const center = cap.localToWorld(new THREE.Vector3(0, 0.7, 0));

    const stars = Math.min(MAX_STARS, Math.round(Math.log2(repo.stars + 1)));
    for (let index = 0; index < stars; index++) {
      const angle = projectIndex * 1.7 + index * (Math.PI * 2 / Math.max(stars, 1));
      starMatrices.push({ position: rim(angle, 0.66).add(new THREE.Vector3(0, 0.16, 0)), phase: index * 0.9 + projectIndex });
    }

    const issues = Math.min(MAX_ROCKS, repo.openIssues);
    for (let index = 0; index < issues; index++) {
      rocks.push({ center: center.clone().add(new THREE.Vector3(0, -0.25, 0)), radius: Math.max(halfX, halfZ) * 1.05 + 0.35, phase: index * Math.PI * 2 / issues + projectIndex, height: (index % 3 - 1) * 0.18 });
    }

    const days = (now - Date.parse(repo.pushedAt)) / 86_400_000;
    if (days < ACTIVE_DAYS) {
      const base = center.clone().addScaledVector(farSide, Math.min(halfX, halfZ) * 0.7);
      const beam = new THREE.CylinderGeometry(0.025, 0.09, 5, 12, 1, true).translate(base.x, base.y + 2.5, base.z);
      const count = beam.getAttribute('position').count;
      beam.setAttribute('aRecency', new THREE.Float32BufferAttribute(new Array(count).fill(1 - days / ACTIVE_DAYS), 1));
      beam.setAttribute('aPhase', new THREE.Float32BufferAttribute(new Array(count).fill(projectIndex * 1.3), 1));
      beams.push(beam);
      const anchor = new THREE.Object3D();
      anchor.position.copy(base).add(new THREE.Vector3(0, 0.1, 0));
      group.add(anchor);
      glowSources.push({ object: anchor, color: accent, size: 0.9, intensity: 0.35 + 0.45 * (1 - days / ACTIVE_DAYS) });
    }
  });

  const starMesh = new THREE.InstancedMesh(starGeometry(), new THREE.MeshStandardMaterial({
    color: 0xf3d27f, roughness: 0.3, metalness: 0.5, emissive: 0xc9962e, emissiveIntensity: 0.45,
  }), Math.max(1, starMatrices.length));
  starMesh.name = 'repo-stars';
  starMesh.count = starMatrices.length;
  starMesh.frustumCulled = false;
  group.add(starMesh);

  const rockMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({
    color: 0xa87466, roughness: 0.9, flatShading: true,
  }), Math.max(1, rocks.length));
  rockMesh.name = 'repo-issue-rocks';
  rockMesh.count = rocks.length;
  rockMesh.frustumCulled = false;
  group.add(rockMesh);

  const beamUniforms = { uTime: { value: 0 }, uColor: { value: accent } };
  if (beams.length) {
    const beamMesh = new THREE.Mesh(mergeGeometries(beams), new THREE.ShaderMaterial({
      ...glowBlending,
      side: THREE.DoubleSide,
      uniforms: beamUniforms,
      vertexShader: `
        attribute float aRecency;
        attribute float aPhase;
        varying float vHeight;
        varying float vStrength;
        uniform float uTime;
        void main() {
          vHeight = uv.y;
          vStrength = (0.3 + 0.7 * aRecency) * (0.8 + 0.2 * sin(uTime * 1.4 + aPhase));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vHeight;
        varying float vStrength;
        void main() {
          float fade = pow(1.0 - vHeight, 1.6) * vStrength * 0.55;
          if (fade < 0.004) discard;
          gl_FragColor = vec4(uColor * fade, 1.0);
          #include <colorspace_fragment>
          gl_FragColor.a = min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
        }
      `,
    }));
    beamMesh.name = 'repo-activity-beams';
    beamMesh.frustumCulled = false;
    beamMesh.renderOrder = 2;
    group.add(beamMesh);
  }

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tumble = new THREE.Euler();
  let time = 0;
  const place = () => {
    starMatrices.forEach(({ position: at, phase }, index) => {
      quaternion.setFromAxisAngle(up, time * 0.8 + phase);
      position.copy(at).setY(at.y + Math.sin(time * 1.6 + phase) * 0.025);
      starMesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    });
    starMesh.instanceMatrix.needsUpdate = true;
    rocks.forEach(({ center, radius, phase, height }, index) => {
      const angle = phase + time * 0.22;
      position.set(center.x + Math.cos(angle) * radius, center.y + height + Math.sin(angle * 2) * 0.06, center.z + Math.sin(angle) * radius);
      quaternion.setFromEuler(tumble.set(time * 0.7 + phase, time * 0.5, 0));
      rockMesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    });
    rockMesh.instanceMatrix.needsUpdate = true;
  };
  place();

  return {
    object: group,
    glowSources,
    update(dt: number, animate: boolean) {
      if (!animate) return;
      time += dt;
      beamUniforms.uTime.value = time;
      place();
    },
  };
}
