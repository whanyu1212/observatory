import { useEffect, useRef } from 'react';
import type { Camera, PlaneGeometry, Scene, ShaderMaterial, Texture, Vector2, WebGLRenderer } from 'three';
import '../../styles/project-ripple-image.css';

interface ProjectRippleImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  motionEnabled: boolean;
  loading?: 'eager' | 'lazy';
}

interface RippleResources {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  geometry: PlaneGeometry;
  material: ShaderMaterial;
  texture: Texture;
  mouse: Vector2;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uImage;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 fromMouse = vec2((vUv.x - uMouse.x) * uAspect, vUv.y - uMouse.y);
    float distanceFromMouse = length(fromMouse);
    float envelope = exp(-distanceFromMouse * distanceFromMouse * 75.0);
    float wave = sin(distanceFromMouse * 32.0 - uTime * 5.0);
    vec2 direction = fromMouse / max(distanceFromMouse, 0.001);
    vec2 offset = direction * wave * envelope * 0.007;
    offset.x /= uAspect;

    vec2 edge = smoothstep(vec2(0.0), vec2(0.1), vUv) *
      smoothstep(vec2(0.0), vec2(0.1), 1.0 - vUv);
    vec2 sampleUv = clamp(vUv + offset * edge.x * edge.y, 0.0, 1.0);
    gl_FragColor = texture2D(uImage, sampleUv);
    #include <colorspace_fragment>
  }
`;

export function ProjectRippleImage({ src, alt, width, height, motionEnabled, loading = 'lazy' }: ProjectRippleImageProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !image || !canvas) return;

    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let inView = false;
    let hovering = false;
    let imageReady = image.complete && image.naturalWidth > 0;
    let disposed = false;
    let failed = false;
    let resources: RippleResources | null = null;
    let loading: Promise<void> | null = null;
    let frame = 0;
    let fadeTimer = 0;
    let targetX = 0.5;
    let targetY = 0.5;
    let currentX = 0.5;
    let currentY = 0.5;
    let startTime = 0;
    let renderedFrames = 0;
    if (import.meta.env.DEV) wrapper.dataset.rippleFrames = '0';

    const allowed = () => motionEnabled && imageReady && !failed && !disposed &&
      fineHover.matches && !document.hidden && inView;

    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const disposeResources = () => {
      stopFrame();
      resources?.geometry.dispose();
      resources?.material.dispose();
      resources?.texture.dispose();
      resources?.renderer.dispose();
      resources = null;
    };

    const sizeRenderer = () => {
      if (!resources || !hovering || !allowed()) return;
      const rect = wrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      resources.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      resources.renderer.setSize(rect.width, rect.height, false);
      resources.material.uniforms.uAspect.value = rect.width / rect.height;
    };

    const render = (now: number) => {
      frame = 0;
      if (!hovering || !allowed() || !resources) return;
      currentX += (targetX - currentX) * 0.24;
      currentY += (targetY - currentY) * 0.24;
      resources.mouse.set(currentX, currentY);
      resources.material.uniforms.uTime.value = (now - startTime) / 1000;
      resources.renderer.render(resources.scene, resources.camera);
      if (import.meta.env.DEV) wrapper.dataset.rippleFrames = String(++renderedFrames);
      wrapper.dataset.rippleState = 'active';
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (!hovering || !allowed() || !resources || frame) return;
      window.clearTimeout(fadeTimer);
      sizeRenderer();
      startTime = performance.now();
      render(startTime);
    };

    const ensureRenderer = () => {
      if (!hovering || !allowed()) return;
      if (resources) {
        start();
        return;
      }
      if (loading) return;
      wrapper.dataset.rippleState = 'loading';
      loading = import('three').then((THREE) => {
        if (disposed || !hovering || !allowed()) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mouse = new THREE.Vector2(targetX, targetY);
        const material = new THREE.ShaderMaterial({
          uniforms: {
            uImage: { value: texture },
            uMouse: { value: mouse },
            uAspect: { value: 1 },
            uTime: { value: 0 },
          },
          vertexShader,
          fragmentShader,
        });
        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        scene.add(new THREE.Mesh(geometry, material));
        resources = { renderer, scene, camera, geometry, material, texture, mouse };
        currentX = targetX;
        currentY = targetY;
        start();
      }).catch(() => {
        failed = true;
        disposeResources();
        wrapper.dataset.rippleState = 'unavailable';
      }).finally(() => { loading = null; });
    };

    const stop = (fade: boolean) => {
      stopFrame();
      window.clearTimeout(fadeTimer);
      if (fade && resources && wrapper.dataset.rippleState === 'active') {
        wrapper.dataset.rippleState = 'fading';
        fadeTimer = window.setTimeout(() => { wrapper.dataset.rippleState = 'idle'; }, 220);
      } else {
        wrapper.dataset.rippleState = 'idle';
      }
    };

    const sync = () => {
      if (hovering && allowed()) ensureRenderer();
      else stop(false);
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      targetY = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      hovering = true;
      updatePointer(event);
      ensureRenderer();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') updatePointer(event);
    };
    const onLeave = () => {
      hovering = false;
      stop(true);
    };
    const onImageLoad = () => {
      imageReady = image.naturalWidth > 0;
      sync();
    };
    const onImageError = () => {
      imageReady = false;
      failed = true;
      stop(false);
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      failed = true;
      disposeResources();
      wrapper.dataset.rippleState = 'unavailable';
    };

    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    const resize = new ResizeObserver(sizeRenderer);
    intersection.observe(wrapper);
    resize.observe(wrapper);
    wrapper.addEventListener('pointerenter', onEnter);
    wrapper.addEventListener('pointermove', onMove);
    wrapper.addEventListener('pointerleave', onLeave);
    image.addEventListener('load', onImageLoad);
    image.addEventListener('error', onImageError);
    canvas.addEventListener('webglcontextlost', onContextLost);
    fineHover.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);

    return () => {
      disposed = true;
      stopFrame();
      window.clearTimeout(fadeTimer);
      wrapper.dataset.rippleState = 'idle';
      intersection.disconnect();
      resize.disconnect();
      wrapper.removeEventListener('pointerenter', onEnter);
      wrapper.removeEventListener('pointermove', onMove);
      wrapper.removeEventListener('pointerleave', onLeave);
      image.removeEventListener('load', onImageLoad);
      image.removeEventListener('error', onImageError);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      fineHover.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      disposeResources();
    };
  }, [src, motionEnabled]);

  return (
    <span className="project-ripple-image" data-ripple-state="idle" ref={wrapperRef} style={{ aspectRatio: `${width} / ${height}` }}>
      <img ref={imageRef} src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" draggable={false} />
      <canvas ref={canvasRef} className="project-ripple-image__canvas" aria-hidden="true" />
    </span>
  );
}
