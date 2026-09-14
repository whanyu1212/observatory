import * as THREE from 'three';

// Three depth ranges share the world camera, so orbiting creates real parallax.
// No image textures or postprocessing passes are needed for this atmosphere.
export function createUniverseAtmosphere(pixelRatio: number) {
  const group = new THREE.Group();
  group.name = 'universe-atmosphere';
  let seed = 4729;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const time = { value: 0 };

  function particles(name: string, count: number, innerRadius: number, outerRadius: number, dust = false) {
    const positions: number[] = [], phases: number[] = [], sizes: number[] = [], colors: number[] = [];
    const palette = [new THREE.Color('#d6e8ff'), new THREE.Color('#ece9cf'), new THREE.Color('#afcadf')];
    for (let i = 0; i < count; i++) {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radius = innerRadius + random() * (outerRadius - innerRadius);
      const ring = Math.sqrt(1 - y * y);
      positions.push(Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius);
      phases.push(random() * Math.PI * 2);
      sizes.push(dust ? .025 + random() * .055 : .12 + random() * .22);
      const color = palette[Math.floor(random() * palette.length)];
      colors.push(color.r, color.g, color.b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uPixelRatio: { value: pixelRatio }, uDust: { value: dust ? 1 : 0 } },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uDust;
        attribute float aPhase;
        attribute float aSize;
        varying vec3 vColor;
        varying float vLight;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * .055 + aPhase) * .45 * uDust;
          p.y += cos(uTime * .04 + aPhase) * .3 * uDust;
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(aSize * 650.0 / max(4.0, -viewPosition.z), 1.1, 5.0) * uPixelRatio;
          float blink = pow(.5 + .5 * sin(uTime * (.65 + aPhase * .16) + aPhase), 3.0);
          vLight = mix(.24 + .76 * blink, .12 + .2 * blink, uDust);
          vColor = color;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLight;
        void main() {
          float radius = length(gl_PointCoord - .5) * 2.0;
          if (radius > 1.0) discard;
          float glow = exp(-radius * radius * 5.0) * (1.0 - smoothstep(.65, 1.0, radius));
          gl_FragColor = vec4(vColor, glow * vLight);
        }
      `,
    });
    const points = new THREE.Points(geometry, material);
    points.name = name;
    group.add(points);
    return points;
  }

  // The distant shell follows the camera position; nearer particles stay in space.
  const farStars = particles('distant-stars', 1000, 100, 110);
  particles('middle-stars', 340, 48, 76);
  const dust = particles('nearby-dust', 100, 17, 34, true);

  const nebula = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 20), new THREE.ShaderMaterial({
    uniforms: { uTime: time },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    // Transparent objects render after opaque geometry; test far-plane depth so
    // the nebula never washes over the islands or their sculptures.
    depthTest: true,
    toneMapped: false,
    vertexShader: `
      varying vec3 vDirection;
      varying vec4 vClip;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w * .9999;
        vClip = gl_Position;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vDirection;
      varying vec4 vClip;
      float hash(vec3 p) {
        p = fract(p * .1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float noise(vec3 p) {
        vec3 cell = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(cell), hash(cell + vec3(1,0,0)), f.x), mix(hash(cell + vec3(0,1,0)), hash(cell + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(cell + vec3(0,0,1)), hash(cell + vec3(1,0,1)), f.x), mix(hash(cell + vec3(0,1,1)), hash(cell + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 direction = normalize(vDirection);
        vec3 p = direction * 4.0 + vec3(uTime * .002, 0.0, 0.0);
        float clouds = noise(p) * .57 + noise(p * 2.07 + 13.0) * .28 + noise(p * 4.1 + 27.0) * .15;
        float ribbon = exp(-abs(dot(direction, normalize(vec3(.55, .18, -.8))) + .06) * 5.0);
        float wisps = smoothstep(.32, .72, clouds) * ribbon;
        float lanes = smoothstep(.2, .58, noise(p * 1.6 + 6.0));
        vec3 color = mix(vec3(.19, .35, .39), vec3(.38, .26, .57), smoothstep(.3, .72, clouds));
        vec2 screen = abs(vClip.xy / vClip.w);
        float edge = 1.0 - smoothstep(.76, 1.0, max(screen.x, screen.y));
        gl_FragColor = vec4(color, wisps * lanes * .28 * edge);
      }
    `,
  }));
  nebula.name = 'nebula-clouds';
  nebula.renderOrder = -20;
  nebula.frustumCulled = false;
  group.add(nebula);

  return {
    object: group,
    update(dt: number, motionEnabled: boolean, camera: THREE.Camera) {
      if (motionEnabled) time.value += dt;
      // Camera translation never moves the sky, but does move nearby dust in view.
      nebula.position.copy(camera.position);
      farStars.position.copy(camera.position);
      if (motionEnabled) dust.rotation.y += dt * .002;
    },
  };
}
