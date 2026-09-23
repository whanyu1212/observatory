import * as THREE from 'three';
import type { ProjectId } from './curiosity';
import type { GlowSource } from './glowSprites';

/**
 * The explorer's logbook in the world: a small pennant planted on the near
 * edge of every island the visitor has charted. Two instanced draw calls; a
 * flag that has not been earned is scaled to nothing.
 */
export function createLogbookFlags(ground: THREE.Object3D[], accent: THREE.Color, isCharted: (id: ProjectId) => boolean) {
  const group = new THREE.Group();
  group.name = 'logbook-flags';
  const glowSources: GlowSource[] = [];
  // The near-left edge of each island as the home view sees it.
  const nearSide = new THREE.Vector3(0.2, 0, 1).normalize();
  const flags: Array<{ id: ProjectId; base: THREE.Vector3; phase: number; raised: number }> = [];
  ground.forEach((cap, index) => {
    const id = cap.userData.projectId as ProjectId | undefined;
    if (!id) return;
    cap.updateWorldMatrix(true, false);
    const mesh = cap as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const reach = Math.min(box.max.x - box.min.x, box.max.z - box.min.z) / 2 * 0.7;
    const base = cap.localToWorld(new THREE.Vector3(0, 0.7, 0)).addScaledVector(nearSide, reach);
    flags.push({ id, base, phase: index * 1.3, raised: 0 });
    const tip = new THREE.Object3D();
    tip.position.copy(base).add(new THREE.Vector3(0, 0.95, 0));
    group.add(tip);
    glowSources.push({ object: tip, color: accent, size: 0.8, intensity: () => flags.find(flag => flag.id === id)!.raised * 0.4 });
  });

  const poleGeometry = new THREE.CylinderGeometry(0.014, 0.018, 1, 6).translate(0, 0.5, 0);
  const pennant = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.34, -0.09), new THREE.Vector2(0, -0.19)]);
  const pennantGeometry = new THREE.ShapeGeometry(pennant).translate(0, 1, 0);
  const poles = new THREE.InstancedMesh(poleGeometry, new THREE.MeshStandardMaterial({ color: 0xe9eee6, roughness: 0.4, metalness: 0.3 }), flags.length);
  const pennants = new THREE.InstancedMesh(pennantGeometry, new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }), flags.length);
  poles.name = 'logbook-poles';
  pennants.name = 'logbook-pennants';
  [poles, pennants].forEach(instanced => { instanced.frustumCulled = false; group.add(instanced); });
  // The pennant material reads the shared accent colour, so it follows the theme.
  (pennants.material as THREE.MeshStandardMaterial).color = accent;
  (pennants.material as THREE.MeshStandardMaterial).emissive = accent;

  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const size = new THREE.Vector3();
  let time = 0;

  return {
    object: group,
    glowSources,
    /** Returns true while any flag is still being raised, so the scene keeps drawing. */
    update(dt: number, animate: boolean) {
      if (animate) time += dt;
      let settling = false;
      flags.forEach((flag, index) => {
        const goal = isCharted(flag.id) ? 1 : 0;
        flag.raised = animate ? THREE.MathUtils.damp(flag.raised, goal, 3, dt) : goal;
        if (Math.abs(flag.raised - goal) > 0.002) settling = true;
        const raised = flag.raised < 0.002 ? 0 : flag.raised;
        size.setScalar(raised * 1.35);
        rotation.identity();
        poles.setMatrixAt(index, matrix.compose(flag.base, rotation, size));
        // The pennant ripples gently around its pole.
        rotation.setFromAxisAngle(up, animate ? Math.sin(time * 2.2 + flag.phase) * 0.35 : 0);
        pennants.setMatrixAt(index, matrix.compose(flag.base, rotation, size));
      });
      poles.instanceMatrix.needsUpdate = true;
      pennants.instanceMatrix.needsUpdate = true;
      return settling;
    },
  };
}
