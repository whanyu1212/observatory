import * as THREE from 'three';

const WAKE_POINTS = 44;
const WAKE_LIFETIME = 1.5;
const STREAKS = 64;
const STREAK_BOX = new THREE.Vector3(10, 5, 10);

// Additive colour whose alpha follows brightness, so the transparent canvas
// never stamps opaque shapes over the CSS nebula behind it.
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

/**
 * Makes flight read as motion: the explorer banks and pitches, leaves a
 * fading wake, and, at speed, streaks of passing dust. Two draw calls.
 */
export function createFlightFeel(explorer: THREE.Object3D, accent: THREE.Color) {
  const group = new THREE.Group();
  group.name = 'flight-feel';

  // ---- Wake: a camera-facing ribbon through the explorer's recent positions.
  const wakePositions = new Float32Array(WAKE_POINTS * 2 * 3);
  const wakeTangents = new Float32Array(WAKE_POINTS * 2 * 3);
  const wakeSides = new Float32Array(WAKE_POINTS * 2);
  const wakeAges = new Float32Array(WAKE_POINTS * 2);
  for (let index = 0; index < WAKE_POINTS; index++) {
    wakeSides[index * 2] = -1;
    wakeSides[index * 2 + 1] = 1;
  }
  const wakeIndices: number[] = [];
  for (let index = 0; index < WAKE_POINTS - 1; index++) {
    const v = index * 2;
    wakeIndices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  }
  const wakeGeometry = new THREE.BufferGeometry();
  const wakePosition = new THREE.BufferAttribute(wakePositions, 3).setUsage(THREE.DynamicDrawUsage);
  const wakeTangent = new THREE.BufferAttribute(wakeTangents, 3).setUsage(THREE.DynamicDrawUsage);
  const wakeAge = new THREE.BufferAttribute(wakeAges, 1).setUsage(THREE.DynamicDrawUsage);
  wakeGeometry.setAttribute('position', wakePosition);
  wakeGeometry.setAttribute('aTangent', wakeTangent);
  wakeGeometry.setAttribute('aSide', new THREE.BufferAttribute(wakeSides, 1));
  wakeGeometry.setAttribute('aAge', wakeAge);
  wakeGeometry.setIndex(wakeIndices);
  wakeGeometry.setDrawRange(0, 0);
  const wakeUniforms = { uColor: { value: accent }, uWidth: { value: 0.16 }, uComet: { value: 0 } };
  const wake = new THREE.Mesh(wakeGeometry, new THREE.ShaderMaterial({
    ...glowBlending,
    side: THREE.DoubleSide,
    uniforms: wakeUniforms,
    vertexShader: `
      uniform float uWidth;
      attribute vec3 aTangent;
      attribute float aSide;
      attribute float aAge;
      varying float vSide;
      varying float vAge;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vec3 tangent = normalize((modelViewMatrix * vec4(aTangent, 0.0)).xyz + vec3(1e-5));
        vec3 side = normalize(cross(tangent, normalize(-view.xyz)));
        // The ribbon tapers from the engines to nothing as it ages.
        view.xyz += side * aSide * uWidth * (1.0 - aAge);
        gl_Position = projectionMatrix * view;
        vSide = aSide;
        vAge = aAge;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uComet;
      varying float vSide;
      varying float vAge;
      void main() {
        float across = 1.0 - abs(vSide);
        float fade = (1.0 - vAge) * (1.0 - vAge);
        float strength = (across * across * .5 + pow(across, 6.0) * .7) * fade;
        if (strength < .003) discard;
        // The comet wake (a reward) runs white-hot at the engines into comet blue.
        vec3 comet = mix(vec3(1.0, .98, .94), vec3(.42, .72, 1.0), smoothstep(0.0, .6, vAge));
        gl_FragColor = vec4(mix(uColor, comet, uComet) * strength, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.a = min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
      }
    `,
  }));
  wake.name = 'explorer-wake';
  wake.frustumCulled = false;
  wake.renderOrder = 2;
  group.add(wake);
  const trail: Array<{ point: THREE.Vector3; age: number }> = [];
  let sampleClock = 0;

  // ---- Streaks: dust in a box that travels with the explorer, drawn as short
  // lines along the direction of flight. They only appear at speed.
  const streakSeeds = new Float32Array(STREAKS * 3);
  let seed = 9001;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let index = 0; index < STREAKS; index++) {
    streakSeeds[index * 3] = (random() - .5) * STREAK_BOX.x * 2;
    streakSeeds[index * 3 + 1] = (random() - .5) * STREAK_BOX.y * 2;
    streakSeeds[index * 3 + 2] = (random() - .5) * STREAK_BOX.z * 2;
  }
  const streakPositions = new Float32Array(STREAKS * 2 * 3);
  const streakHeads = new Float32Array(STREAKS * 2);
  for (let index = 0; index < STREAKS; index++) streakHeads[index * 2] = 1;
  const streakGeometry = new THREE.BufferGeometry();
  const streakPosition = new THREE.BufferAttribute(streakPositions, 3).setUsage(THREE.DynamicDrawUsage);
  streakGeometry.setAttribute('position', streakPosition);
  streakGeometry.setAttribute('aHead', new THREE.BufferAttribute(streakHeads, 1));
  const streakUniforms = { uStrength: { value: 0 } };
  const streaks = new THREE.LineSegments(streakGeometry, new THREE.ShaderMaterial({
    ...glowBlending,
    uniforms: streakUniforms,
    vertexShader: `
      attribute float aHead;
      varying float vHead;
      void main() {
        vHead = aHead;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uStrength;
      varying float vHead;
      void main() {
        float strength = uStrength * vHead * vHead * .55;
        if (strength < .003) discard;
        gl_FragColor = vec4(vec3(.82, .9, 1.0) * strength, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.a = min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
      }
    `,
  }));
  streaks.name = 'flight-streaks';
  streaks.frustumCulled = false;
  streaks.visible = false;
  group.add(streaks);

  // ---- Attitude: bank into turns, pitch against acceleration.
  const velocity = new THREE.Vector3();
  const lastPosition = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const flat = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const bankQuat = new THREE.Quaternion();
  const pitchQuat = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);
  let hasLast = false;
  let lastYaw = 0;
  let speed = 0;
  let bank = 0;
  let pitch = 0;

  const clear = () => {
    trail.length = 0;
    wakeGeometry.setDrawRange(0, 0);
    streaks.visible = false;
    bank = 0;
    pitch = 0;
    speed = 0;
    hasLast = false;
  };

  return {
    object: group,
    get speed() { return speed; },
    setCometWake(enabled: boolean) { wakeUniforms.uComet.value = enabled ? 1 : 0; },
    /**
     * `heading` is the explorer's unbanked orientation; the result is written
     * to the explorer so the scene's own heading logic never sees the bank.
     */
    update(dt: number, animate: boolean, boost: number, heading: THREE.Quaternion, position: THREE.Vector3) {
      if (!animate) {
        clear();
        explorer.quaternion.copy(heading);
        return;
      }
      if (!hasLast) { lastPosition.copy(position); hasLast = true; }
      // Teleports (resets, paused-motion travel) must not read as a burst of speed.
      if (lastPosition.distanceToSquared(position) > 4) { clear(); lastPosition.copy(position); hasLast = true; }
      velocity.copy(position).sub(lastPosition).divideScalar(Math.max(dt, 1e-3));
      lastPosition.copy(position);
      const previousSpeed = speed;
      speed = THREE.MathUtils.damp(speed, velocity.length(), 8, dt);
      const acceleration = (speed - previousSpeed) / Math.max(dt, 1e-3);

      forward.set(1, 0, 0).applyQuaternion(heading);
      const yaw = Math.atan2(-forward.z, forward.x);
      const yawRate = Math.atan2(Math.sin(yaw - lastYaw), Math.cos(yaw - lastYaw)) / Math.max(dt, 1e-3);
      lastYaw = yaw;
      const moving = THREE.MathUtils.smoothstep(speed, .3, 2);
      bank = THREE.MathUtils.damp(bank, THREE.MathUtils.clamp(-yawRate * .22, -.62, .62) * moving, 6, dt);
      pitch = THREE.MathUtils.damp(pitch, THREE.MathUtils.clamp(-acceleration * .028, -.22, .22), 5, dt);
      bankQuat.setFromAxisAngle(xAxis, bank);
      pitchQuat.setFromAxisAngle(zAxis, pitch);
      explorer.quaternion.copy(heading).multiply(pitchQuat).multiply(bankQuat);

      // Wake: sample the engines about 30 times a second while moving.
      trail.forEach(sample => { sample.age += dt / WAKE_LIFETIME; });
      while (trail.length && trail[trail.length - 1].age >= 1) trail.pop();
      sampleClock += dt;
      if (speed > .4 && sampleClock >= 1 / 30) {
        sampleClock = 0;
        explorer.updateWorldMatrix(true, false);
        tail.set(-1.25, -0.08, 0).applyMatrix4(explorer.matrixWorld);
        trail.unshift({ point: tail.clone(), age: 0 });
        if (trail.length > WAKE_POINTS) trail.pop();
      }
      wakeUniforms.uWidth.value = .13 + boost * .09;
      for (let index = 0; index < trail.length; index++) {
        const { point, age } = trail[index];
        const previous = trail[Math.max(0, index - 1)].point;
        const next = trail[Math.min(trail.length - 1, index + 1)].point;
        tangent.copy(previous).sub(next);
        if (tangent.lengthSq() < 1e-8) tangent.copy(forward);
        for (let side = 0; side < 2; side++) {
          const vertex = index * 2 + side;
          point.toArray(wakePositions, vertex * 3);
          tangent.toArray(wakeTangents, vertex * 3);
          wakeAges[vertex] = age;
        }
      }
      wakePosition.needsUpdate = true;
      wakeTangent.needsUpdate = true;
      wakeAge.needsUpdate = true;
      wakeGeometry.setDrawRange(0, Math.max(0, trail.length - 1) * 6);

      // Streaks: wrap each seed into a box around the explorer, then draw it
      // back along the flight direction in proportion to speed.
      const strength = THREE.MathUtils.smoothstep(speed, 6, 12);
      streakUniforms.uStrength.value = strength;
      streaks.visible = strength > .01;
      if (streaks.visible) {
        const length = .35 + speed * .09;
        flat.copy(velocity).normalize().multiplyScalar(length);
        for (let index = 0; index < STREAKS; index++) {
          for (let axis = 0; axis < 3; axis++) {
            const size = STREAK_BOX.getComponent(axis) * 2;
            const relative = streakSeeds[index * 3 + axis] - position.getComponent(axis);
            offset.setComponent(axis, ((relative % size) + size * 1.5) % size - size / 2);
          }
          offset.add(position);
          offset.toArray(streakPositions, index * 6);
          offset.sub(flat).toArray(streakPositions, index * 6 + 3);
        }
        streakPosition.needsUpdate = true;
      }
    },
  };
}
