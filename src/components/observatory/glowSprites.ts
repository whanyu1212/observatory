import * as THREE from 'three';

export type GlowSource = {
  object: THREE.Object3D;
  /** Local-space offset from the tracked object. */
  offset?: THREE.Vector3;
  /** Shared so a themed colour can retint the glow in place. */
  color: THREE.Color;
  /** World-space diameter of the halo. */
  size: number;
  intensity: number | (() => number);
};

/**
 * Bloom without a bloom pass: soft additive billboards follow the emissive
 * parts of the scene. All halos share one Points draw call and an analytic
 * falloff, so the cost is a few hundred small quads instead of full-screen blurs.
 */
export function createGlowSprites(renderer: THREE.WebGLRenderer, sources: GlowSource[]) {
  const count = sources.length;
  const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const intensities = new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  sources.forEach((source, index) => {
    sizes[index] = source.size;
    phases[index] = index * 2.399;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);
  geometry.setAttribute('aIntensity', intensities);
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const gl = renderer.getContext();
  const pointRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
  const uniforms = {
    uTime: { value: 0 },
    uScale: { value: 1 },
    uMaxSize: { value: pointRange?.[1] ?? 256 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    // Additive colour, but alpha follows brightness: the canvas is transparent,
    // and plain additive blending would stamp opaque discs over the CSS nebula.
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    toneMapped: false,
    vertexShader: `
      uniform float uTime;
      uniform float uScale;
      uniform float uMaxSize;
      attribute float aSize;
      attribute float aIntensity;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vIntensity;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        // Pull the billboard toward the camera so the halo sits over its source
        // instead of slicing through the geometry around it.
        view.xyz += normalize(-view.xyz) * aSize * .4;
        gl_Position = projectionMatrix * view;
        gl_PointSize = min(uMaxSize, aSize * uScale / max(.5, -view.z));
        vIntensity = aIntensity * (.9 + .1 * sin(uTime * 2.1 + aPhase));
        vColor = color;
        if (aIntensity < .005) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vIntensity;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(p, p);
        if (r2 > 1.0) discard;
        float halo = (exp(-r2 * 5.0) - exp(-5.0)) / (1.0 - exp(-5.0));
        float core = exp(-r2 * 42.0);
        gl_FragColor = vec4(vColor * (halo * .75 + core * .7) * vIntensity, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.a = min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'emissive-glow';
  points.frustumCulled = false;
  points.renderOrder = 3;
  const world = new THREE.Vector3();
  const origin = new THREE.Vector3();

  return {
    object: points,
    /** Converts world size to pixels: drawing-buffer height over the view height at depth 1. */
    setViewport(bufferHeight: number, fov: number) {
      uniforms.uScale.value = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    },
    update(dt: number, animate: boolean) {
      if (animate) uniforms.uTime.value += dt;
      sources.forEach((source, index) => {
        source.object.updateWorldMatrix(true, false);
        world.copy(source.offset ?? origin).applyMatrix4(source.object.matrixWorld);
        world.toArray(positions.array, index * 3);
        source.color.toArray(colors.array, index * 3);
        const value = typeof source.intensity === 'function' ? source.intensity() : source.intensity;
        intensities.array[index] = source.object.visible ? value : 0;
      });
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      intensities.needsUpdate = true;
    },
  };
}
