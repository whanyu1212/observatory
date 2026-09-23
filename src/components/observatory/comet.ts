import * as THREE from 'three';

const SPEED = 7.5;           // units per second: faster than cruising (5.4), slower than a boost
const CATCH_RADIUS = 1.5;
const TAIL_POINTS = 36;
const SPARKS = 48;

// Additive colour with alpha from brightness, like the scene's other glows.
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
const alphaFromBrightness = `
  #include <colorspace_fragment>
  gl_FragColor.a = min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
`;

export type CometEvent = 'caught' | 'missed' | null;

/**
 * An occasional comet that crosses the archipelago on a gentle curve. It is
 * faster than cruising flight, so catching it takes a boost (or a tap, which
 * sends the explorer in pursuit). Nothing is drawn while no comet is out.
 */
export function createComet(center: THREE.Vector3, radius: number) {
  const group = new THREE.Group();
  group.name = 'comet';

  const head = new THREE.Group();
  head.name = 'comet-head';
  head.visible = false;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf4fbff, toneMapped: false }));
  core.userData.decorative = true;
  head.add(core);
  // An invisible, generous target so the comet is easy to tap.
  const target = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  target.name = 'comet-target';
  head.add(target);
  group.add(head);

  // Tail: a camera-facing ribbon through the head's recent positions.
  const positions = new Float32Array(TAIL_POINTS * 2 * 3);
  const tangents = new Float32Array(TAIL_POINTS * 2 * 3);
  const sides = new Float32Array(TAIL_POINTS * 2);
  const ages = new Float32Array(TAIL_POINTS * 2);
  for (let index = 0; index < TAIL_POINTS; index++) { sides[index * 2] = -1; sides[index * 2 + 1] = 1; }
  const indices: number[] = [];
  for (let index = 0; index < TAIL_POINTS - 1; index++) {
    const v = index * 2;
    indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  }
  const tailGeometry = new THREE.BufferGeometry();
  const tailPosition = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const tailTangent = new THREE.BufferAttribute(tangents, 3).setUsage(THREE.DynamicDrawUsage);
  const tailAge = new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage);
  tailGeometry.setAttribute('position', tailPosition);
  tailGeometry.setAttribute('aTangent', tailTangent);
  tailGeometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
  tailGeometry.setAttribute('aAge', tailAge);
  tailGeometry.setIndex(indices);
  tailGeometry.setDrawRange(0, 0);
  const tailUniforms = { uBrightness: { value: 1 } };
  const tail = new THREE.Mesh(tailGeometry, new THREE.ShaderMaterial({
    ...glowBlending,
    side: THREE.DoubleSide,
    uniforms: tailUniforms,
    vertexShader: `
      attribute vec3 aTangent;
      attribute float aSide;
      attribute float aAge;
      varying float vSide;
      varying float vAge;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vec3 tangent = normalize((modelViewMatrix * vec4(aTangent, 0.0)).xyz + vec3(1e-5));
        vec3 side = normalize(cross(tangent, normalize(-view.xyz)));
        view.xyz += side * aSide * 0.32 * (1.0 - aAge * 0.85);
        gl_Position = projectionMatrix * view;
        vSide = aSide;
        vAge = aAge;
      }
    `,
    fragmentShader: `
      uniform float uBrightness;
      varying float vSide;
      varying float vAge;
      void main() {
        float across = 1.0 - abs(vSide);
        float strength = (across * across * 0.6 + pow(across, 8.0) * 0.8) * pow(1.0 - vAge, 1.5) * uBrightness;
        if (strength < 0.003) discard;
        gl_FragColor = vec4(mix(vec3(1.0, 0.98, 0.94), vec3(0.42, 0.72, 1.0), smoothstep(0.0, 0.6, vAge)) * strength, 1.0);
        ${alphaFromBrightness}
      }
    `,
  }));
  tail.name = 'comet-tail';
  tail.frustumCulled = false;
  tail.userData.decorative = true;
  group.add(tail);

  // Sparks: a short burst where the comet is caught.
  const sparkPositions = new Float32Array(SPARKS * 3);
  const sparkVelocities = new Float32Array(SPARKS * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPosition = new THREE.BufferAttribute(sparkPositions, 3).setUsage(THREE.DynamicDrawUsage);
  sparkGeometry.setAttribute('position', sparkPosition);
  const sparkUniforms = { uLife: { value: 0 }, uPixelRatio: { value: 1 } };
  const sparks = new THREE.Points(sparkGeometry, new THREE.ShaderMaterial({
    ...glowBlending,
    uniforms: sparkUniforms,
    vertexShader: `
      uniform float uLife;
      uniform float uPixelRatio;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(120.0 / max(1.0, -view.z), 2.0, 12.0) * uPixelRatio * (0.4 + 0.6 * uLife);
      }
    `,
    fragmentShader: `
      uniform float uLife;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float strength = (1.0 - smoothstep(0.1, 1.0, r)) * uLife * uLife;
        if (strength < 0.003) discard;
        gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * strength, 1.0);
        ${alphaFromBrightness}
      }
    `,
  }));
  sparks.name = 'comet-sparks';
  sparks.frustumCulled = false;
  sparks.visible = false;
  group.add(sparks);

  let path: THREE.CubicBezierCurve3 | null = null;
  let duration = 1;
  let elapsed = 0;
  let sparkLife = 0;
  let countdown = 25 + Math.random() * 15;  // The first comet comes a little sooner.
  let brightness = 0;
  const history: THREE.Vector3[] = [];
  const tangent = new THREE.Vector3();

  const launch = () => {
    const angle = Math.random() * Math.PI * 2;
    const across = angle + Math.PI + (Math.random() - 0.5) * 1.2;
    const start = new THREE.Vector3(Math.cos(angle) * radius, 2.4, Math.sin(angle) * radius).add(center);
    const end = new THREE.Vector3(Math.cos(across) * radius, 2.2, Math.sin(across) * radius).add(center);
    // An S-curve through the archipelago: it passes near several islands and
    // stays in view long enough (about ten seconds) to give chase.
    const side = new THREE.Vector3(-(end.z - start.z), 0, end.x - start.x).normalize();
    const swing = 8 + Math.random() * 4;
    const first = start.clone().lerp(center, 0.7).addScaledVector(side, swing).setY(1.4);
    const second = end.clone().lerp(center, 0.7).addScaledVector(side, -swing).setY(1.6);
    path = new THREE.CubicBezierCurve3(start, first, second, end);
    duration = path.getLength() / SPEED;
    elapsed = 0;
    history.length = 0;
    head.visible = true;
    head.position.copy(start);
  };
  const retire = () => {
    path = null;
    head.visible = false;
    history.length = 0;
    tailGeometry.setDrawRange(0, 0);
    countdown = 45 + Math.random() * 45;
  };
  const burst = (at: THREE.Vector3) => {
    for (let index = 0; index < SPARKS; index++) {
      at.toArray(sparkPositions, index * 3);
      const direction = new THREE.Vector3().randomDirection().multiplyScalar(1.5 + Math.random() * 2.5);
      direction.toArray(sparkVelocities, index * 3);
    }
    sparkLife = 1;
    sparks.visible = true;
  };

  return {
    object: group,
    head,
    target,
    get active() { return path !== null; },
    /** 0 while no comet is out; rises as the explorer closes in. */
    get brightness() { return brightness; },
    setPixelRatio(value: number) { sparkUniforms.uPixelRatio.value = value; },
    /** Sends a comet now; used by tests and never by the page itself. */
    launch,
    /** `chasing` is true while the explorer is boosting: drifting into the comet does not count. */
    update(dt: number, animate: boolean, canSpawn: boolean, explorer: THREE.Vector3, chasing: boolean): CometEvent {
      if (sparkLife > 0) {
        sparkLife = Math.max(0, sparkLife - dt / 1.2);
        sparkUniforms.uLife.value = sparkLife;
        for (let index = 0; index < SPARKS * 3; index++) {
          sparkPositions[index] += sparkVelocities[index] * dt;
          sparkVelocities[index] *= 1 - dt * 1.6;
        }
        sparkPosition.needsUpdate = true;
        sparks.visible = sparkLife > 0;
      }
      if (!animate) { if (path) retire(); brightness = 0; return null; }
      if (!path) {
        brightness = 0;
        if (canSpawn) { countdown -= dt; if (countdown <= 0) launch(); }
        return null;
      }
      elapsed += dt;
      const progress = elapsed / duration;
      if (progress >= 1) { retire(); return 'missed'; }
      path.getPointAt(progress, head.position);  // Even speed along the curve.
      head.position.y += Math.sin(elapsed * 2.2) * 0.25;
      const distance = head.position.distanceTo(explorer);
      // Fade in and out at the edges of its run; flare as the explorer closes in.
      const presence = Math.min(1, elapsed / 0.8, (duration - elapsed) / 0.8);
      brightness = presence * (1 + THREE.MathUtils.smoothstep(6 - distance, 0, 4.5) * 0.7);
      tailUniforms.uBrightness.value = brightness;
      if (chasing && distance < CATCH_RADIUS) {
        burst(head.position);
        retire();
        return 'caught';
      }
      history.unshift(head.position.clone());
      if (history.length > TAIL_POINTS) history.pop();
      history.forEach((point, index) => {
        const newer = history[Math.max(0, index - 1)], older = history[Math.min(history.length - 1, index + 1)];
        tangent.copy(newer).sub(older);
        for (let side = 0; side < 2; side++) {
          const vertex = index * 2 + side;
          point.toArray(positions, vertex * 3);
          tangent.toArray(tangents, vertex * 3);
          ages[vertex] = index / (TAIL_POINTS - 1);
        }
      });
      tailPosition.needsUpdate = true;
      tailTangent.needsUpdate = true;
      tailAge.needsUpdate = true;
      tailGeometry.setDrawRange(0, Math.max(0, history.length - 1) * 6);
      return null;
    },
  };
}
