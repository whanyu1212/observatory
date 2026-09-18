import * as THREE from 'three';
import { createCelestialScenery } from './celestialScenery';

// Three depth ranges share the world camera, so orbiting creates real parallax.
export function createUniverseAtmosphere(renderer: THREE.WebGLRenderer) {
  const group = new THREE.Group();
  group.name = 'universe-atmosphere';
  const celestial = createCelestialScenery();
  group.add(celestial.object);
  let seed = 4729;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const time = { value: 0 };
  const resolution = { value: renderer.getPixelRatio() };

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
      uniforms: { uTime: time, uPixelRatio: resolution, uDust: { value: dust ? 1 : 0 } },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: dust ? THREE.AdditiveBlending : THREE.NormalBlending,
      toneMapped: false,
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uDust;
        attribute float aPhase;
        attribute float aSize;
        varying vec3 vColor;
        varying float vLight;
        varying float vShape;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * .055 + aPhase) * .45 * uDust;
          p.y += cos(uTime * .04 + aPhase) * .3 * uDust;
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float shapeScale = mix(1.6, 1.0, uDust);
          gl_PointSize = clamp(aSize * shapeScale * 650.0 / max(4.0, -viewPosition.z), 1.1, 6.0) * uPixelRatio;
          float blink = pow(.5 + .5 * sin(uTime * (.65 + aPhase * .16) + aPhase), 3.0);
          vLight = mix(.24 + .76 * blink, .12 + .2 * blink, uDust);
          vColor = color;
          vShape = fract(aPhase * 1.618);
        }
      `,
      fragmentShader: `
        uniform float uDust;
        varying vec3 vColor;
        varying float vLight;
        varying float vShape;
        void main() {
          vec2 p = abs(gl_PointCoord - .5) * 2.0;
          if (uDust > .5) {
            float radius = length(p);
            if (radius > 1.0) discard;
            float softness = exp(-radius * radius * 5.0) * (1.0 - smoothstep(.65, 1.0, radius));
            gl_FragColor = vec4(vColor, softness * vLight);
          } else {
            // Solid silhouettes with only a pixel of edge antialiasing, no halo.
            float shape = vShape < .3 ? p.x + p.y
              : vShape < .85 ? max(p.x, p.y) + 3.0 * min(p.x, p.y)
              : min(max(p.x / .2, p.y), max(p.x, p.y / .2));
            float edge = max(fwidth(shape), .001);
            float alpha = 1.0 - smoothstep(1.0 - edge, 1.0, shape);
            if (alpha <= 0.0) discard;
            gl_FragColor = vec4(vColor, alpha * vLight);
          }
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

  return {
    object: group,
    setPixelRatio(value: number) { resolution.value = value; },
    dispose() { celestial.dispose(); },
    update(dt: number, motionEnabled: boolean, camera: THREE.Camera) {
      celestial.update(dt, motionEnabled);
      if (motionEnabled) time.value += dt;
      // Camera translation never moves distant stars, but does move nearby dust in view.
      farStars.position.copy(camera.position);
      if (motionEnabled) dust.rotation.y += dt * .002;
    },
  };
}
