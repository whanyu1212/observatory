import * as THREE from 'three';

const CAPACITY = 64;
const NOZZLE_Z = [-0.52, 0.52];

/** Twin engine flames stay on the ship; embers remain in world space as it moves. */
export function createTravelTrail(explorer: THREE.Group) {
  const flames = new THREE.Group();
  flames.name = 'explorer-exhaust-flames';
  const outerGeometry = new THREE.ConeGeometry(0.16, 0.68, 10);
  const coreGeometry = new THREE.ConeGeometry(0.085, 0.42, 10);
  const hotGeometry = new THREE.ConeGeometry(0.045, 0.24, 8);
  const outerMaterial = new THREE.MeshBasicMaterial({ color: 0xff9638, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, forceSinglePass: true });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x70f0ff, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, forceSinglePass: true });
  const hotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.93, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, forceSinglePass: true });
  const jets: THREE.Group[] = [];
  for (const z of NOZZLE_Z) {
    const jet = new THREE.Group();
    jet.position.set(-1.03, -0.08, z);
    const parts: [THREE.BufferGeometry, THREE.Material, number][] = [
      [outerGeometry, outerMaterial, -0.34],
      [coreGeometry, coreMaterial, -0.21],
      [hotGeometry, hotMaterial, -0.12],
    ];
    for (const [geometry, material, x] of parts) {
      const flame = new THREE.Mesh(geometry, material);
      flame.rotation.z = Math.PI / 2;
      flame.position.x = x;
      flame.castShadow = false;
      flame.receiveShadow = false;
      jet.add(flame);
    }
    jet.scale.x = 0.48;
    flames.add(jet);
    jets.push(jet);
  }
  explorer.add(flames);

  const positionData = new Float32Array(CAPACITY * 3);
  const colorData = new Float32Array(CAPACITY * 3);
  const sizeData = new Float32Array(CAPACITY);
  const alphaData = new Float32Array(CAPACITY);
  const age = new Float32Array(CAPACITY);
  const lifetime = new Float32Array(CAPACITY);
  const velocity = new Float32Array(CAPACITY * 3);
  const position = new THREE.BufferAttribute(positionData, 3).setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.BufferAttribute(colorData, 3).setUsage(THREE.DynamicDrawUsage);
  const size = new THREE.BufferAttribute(sizeData, 1).setUsage(THREE.DynamicDrawUsage);
  const alpha = new THREE.BufferAttribute(alphaData, 1).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', position);
  geometry.setAttribute('color', color);
  geometry.setAttribute('aSize', size);
  geometry.setAttribute('aAlpha', alpha);
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float glow = 1.0 - smoothstep(0.12, 1.0, r);
        gl_FragColor = vec4(vColor, vAlpha * glow);
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'explorer-exhaust-embers';
  points.frustumCulled = false;
  points.visible = false;

  const emitter = new THREE.Vector3();
  const backward = new THREE.Vector3();
  const lastPosition = new THREE.Vector3();
  let hasLastPosition = false;
  let count = 0;
  let emitTime = 0;
  let phase = 0;

  function reset() {
    count = 0;
    emitTime = 0;
    geometry.setDrawRange(0, 0);
    points.visible = false;
  }

  function emit(z: number) {
    if (count >= CAPACITY) return;
    const index = count++;
    const offset = index * 3;
    emitter.set(-1.1, -0.08, z);
    emitter.applyMatrix4(explorer.matrixWorld);
    const scatter = (Math.random() - 0.5) * 0.16;
    positionData[offset] = emitter.x;
    positionData[offset + 1] = emitter.y;
    positionData[offset + 2] = emitter.z;
    velocity[offset] = backward.x * (0.4 + Math.random() * 0.35) + scatter;
    velocity[offset + 1] = backward.y * 0.5 + 0.05 + Math.random() * 0.09;
    velocity[offset + 2] = backward.z * 0.5 + scatter;
    age[index] = 0;
    lifetime[index] = 0.65 + Math.random() * 0.35;
    sizeData[index] = 5 + Math.random() * 5;
    colorData[offset] = 1;
    colorData[offset + 1] = 0.67;
    colorData[offset + 2] = 0.41;
    alphaData[index] = 0.8;
  }

  return {
    object: points,
    setPixelRatio(pixelRatio: number) {
      material.uniforms.uPixelRatio.value = THREE.MathUtils.clamp(pixelRatio, 1, 2.5);
    },
    update(moving: boolean, dt: number, motionEnabled: boolean, boost = 0) {
      if (!motionEnabled) {
        reset();
        for (const jet of jets) jet.scale.x = 0.48;
        hasLastPosition = false;
        return;
      }
      const jumped = hasLastPosition && lastPosition.distanceToSquared(explorer.position) > 9;
      lastPosition.copy(explorer.position);
      hasLastPosition = true;
      if (jumped) reset();
      phase += dt;
      const length = moving ? (1.02 + Math.sin(phase * 18) * 0.13) * (1 + boost * 0.6) : 0.5 + Math.sin(phase * 3) * 0.025;
      for (const jet of jets) jet.scale.x = length;

      for (let index = 0; index < count;) {
        age[index] += dt;
        if (age[index] >= lifetime[index]) {
          const last = --count;
          if (index !== last) {
            const to = index * 3;
            const from = last * 3;
            for (let axis = 0; axis < 3; axis++) {
              positionData[to + axis] = positionData[from + axis];
              velocity[to + axis] = velocity[from + axis];
            }
            sizeData[index] = sizeData[last];
            age[index] = age[last];
            lifetime[index] = lifetime[last];
          }
          continue;
        }
        const offset = index * 3;
        positionData[offset] += velocity[offset] * dt;
        positionData[offset + 1] += velocity[offset + 1] * dt;
        positionData[offset + 2] += velocity[offset + 2] * dt;
        const fade = 1 - age[index] / lifetime[index];
        colorData[offset] = 1;
        colorData[offset + 1] = 0.25 + fade * 0.42;
        colorData[offset + 2] = 0.06 + fade * 0.35;
        alphaData[index] = fade * fade * 0.8;
        index++;
      }
      if (moving && !jumped) {
        emitTime += dt;
        explorer.updateWorldMatrix(true, false);
        backward.set(-1, 0, 0).transformDirection(explorer.matrixWorld);
        const interval = 0.055 / (1 + boost);
        while (emitTime >= interval) {
          emitTime -= interval;
          for (const z of NOZZLE_Z) emit(z);
        }
      } else {
        emitTime = 0;
      }
      position.needsUpdate = true;
      color.needsUpdate = true;
      size.needsUpdate = true;
      alpha.needsUpdate = true;
      geometry.setDrawRange(0, count);
      points.visible = count > 0;
    },
  };
}
