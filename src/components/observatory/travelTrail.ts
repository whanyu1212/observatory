import * as THREE from 'three';

/** A short-lived wake records actual movement; it never connects stationary islands. */
export function createTravelTrail() {
  const capacity = 64;
  const lifetime = 1.35;
  const samples: Array<{ point: THREE.Vector3; age: number }> = [];
  const positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .82, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const line = new THREE.Line(geometry, material);
  line.name = 'explorer-travel-trail';
  line.frustumCulled = false;
  line.visible = false;
  let sinceSample = 0;

  return {
    object: line,
    update(position: THREE.Vector3, moving: boolean, dt: number, motionEnabled: boolean) {
      if (!motionEnabled) { samples.length = 0; sinceSample = 0; line.visible = false; geometry.setDrawRange(0, 0); return; }
      samples.forEach(sample => { sample.age += dt; });
      while (samples[0]?.age >= lifetime) samples.shift();
      sinceSample += dt;
      if (moving && sinceSample >= .025) {
        const previous = samples[samples.length - 1];
        // An instant jump or resumed view must not leave a line across the universe.
        if (previous && previous.point.distanceToSquared(position) > 9) samples.length = 0;
        if (!previous || previous.point.distanceToSquared(position) > .006) {
          if (samples.length === capacity) samples.shift();
          samples.push({ point: position.clone(), age: 0 });
          sinceSample = 0;
        }
      }
      samples.forEach(({ point, age }, index) => {
        const fade = Math.pow(1 - age / lifetime, 1.7);
        positions.setXYZ(index, point.x, point.y - .1, point.z);
        colors.setXYZ(index, .35 * fade, .95 * fade, .82 * fade);
      });
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      geometry.setDrawRange(0, samples.length);
      line.visible = samples.length > 1;
    },
  };
}
