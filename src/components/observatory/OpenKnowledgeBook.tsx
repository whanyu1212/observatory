import { useEffect, useRef, useState, type RefObject } from 'react';
import { BookOpen } from 'lucide-react';
import * as THREE from 'three';
import type { OverviewJourney } from './overviewJourney';

function pageTexture(side: 'learn' | 'build') {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f3f1dc';
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = '#386c62';
  ctx.font = '500 21px monospace';
  ctx.fillText(side.toUpperCase(), 42, 66);
  ctx.fillStyle = '#203d3a';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(side === 'learn' ? 'AI' : 'AGENTS', 42, 132);
  ctx.fillStyle = '#8aa29a';
  for (let row = 0; row < 4; row++) ctx.fillRect(42, 173 + row * 23, row === 3 ? 164 : 292, 5);
  // A small agent graph printed on the page, keeping the identity about learning.
  const nodes = side === 'learn' ? [[80, 347], [196, 318], [303, 376]] : [[80, 318], [190, 376], [303, 318]];
  ctx.strokeStyle = '#638980';
  ctx.lineWidth = 4;
  ctx.beginPath();
  nodes.forEach(([x, y], index) => { if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke();
  nodes.forEach(([x, y]) => { ctx.fillStyle = '#b1d9c0'; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function OpenKnowledgeBook({ motionEnabled, active, journey }: { motionEnabled: boolean; active: boolean; journey: RefObject<OverviewJourney> }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ motionEnabled, active });
  const refreshRef = useRef(() => {});
  const [failed, setFailed] = useState(false);
  useEffect(() => { state.current = { motionEnabled, active }; refreshRef.current(); }, [motionEnabled, active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
    camera.position.set(.3, 3.8, 4.3);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xf4fff7, 0x557978, 3));
    const key = new THREE.DirectionalLight(0xfff1ca, 3);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa5e5e1, 2);
    rim.position.set(3, 2, -3);
    scene.add(rim);

    const book = new THREE.Group();
    book.rotation.set(0, -.24, -.06);
    scene.add(book);
    const covers = new THREE.MeshStandardMaterial({ color: 0x397c70, roughness: .6, metalness: .15 });
    const paper = new THREE.MeshStandardMaterial({ color: 0xe6e6ce, roughness: .95 });
    const pageEdge = new THREE.MeshStandardMaterial({ color: 0xc4d4ba, roughness: .95 });
    const ribbon = new THREE.MeshStandardMaterial({ color: 0xd9f991, roughness: .6, emissive: 0xb7d974, emissiveIntensity: .12 });
    const textures = [pageTexture('learn'), pageTexture('build')];
    const halves: THREE.Group[] = [];
    [-1, 1].forEach((side, index) => {
      const half = new THREE.Group();
      half.rotation.z = side * .13;
      book.add(half);
      halves.push(half);
      const addBox = (width: number, height: number, depth: number, y: number, material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
        mesh.position.set(side * .62, y, 0);
        half.add(mesh);
      };
      addBox(1.26, .09, 1.87, -.16, covers);
      addBox(1.17, .16, 1.76, -.035, paper);
      [-.085, -.025, .03].forEach(y => addBox(1.18, .009, 1.77, y, pageEdge));
      const page = new THREE.Mesh(new THREE.PlaneGeometry(1.17, 1.76), new THREE.MeshStandardMaterial({ map: textures[index], roughness: .92, side: THREE.DoubleSide }));
      page.rotation.x = -Math.PI / 2;
      page.position.set(side * .62, .052, 0);
      half.add(page);
    });
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 1.86, 12), covers);
    spine.rotation.x = Math.PI / 2;
    spine.position.y = -.12;
    book.add(spine);
    const bookmark = new THREE.Mesh(new THREE.BoxGeometry(.13, .012, .58), ribbon);
    bookmark.position.set(.22, .046, .87);
    bookmark.rotation.x = -.13;
    book.add(bookmark);

    let frame = 0;
    let time = 0;
    let last = performance.now();
    let hovering = false;
    let openness = 0;
    let arrival = journey.current.book;
    let disposed = false;
    const render = (now: number) => {
      frame = 0;
      if (disposed) return;
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const animate = state.current.motionEnabled && state.current.active && !document.hidden;
      if (animate) time += dt;
      const arrivalTarget = state.current.motionEnabled ? Math.max(journey.current.book, hovering ? 1 : 0) : 1;
      arrival = animate ? THREE.MathUtils.damp(arrival, arrivalTarget, 10, dt) : arrivalTarget;
      openness = animate ? THREE.MathUtils.damp(openness, hovering ? 1 : 0, 5, dt) : 0;
      book.position.y = (animate ? Math.sin(time * 1.15) * .065 : 0) - (1 - arrival) * 0.3;
      book.scale.setScalar(0.76 + arrival * 0.24);
      book.rotation.y = -.24 + (1 - arrival) * .45 + (animate ? Math.sin(time * .65) * .12 : 0);
      halves.forEach((half, index) => { half.rotation.z = (index ? 1 : -1) * (THREE.MathUtils.lerp(1.34, .13, arrival) - openness * .08); });
      bookmark.visible = arrival > 0.65;
      host.dataset.bookOpening = arrival.toFixed(3);
      renderer.render(scene, camera);
      if (animate) frame = requestAnimationFrame(render);
    };
    const refresh = () => {
      if (frame) cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(render);
    };
    refreshRef.current = refresh;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      refresh();
    };
    const enter = () => { hovering = true; refresh(); };
    const leave = () => { hovering = false; refresh(); };
    const link = host.parentElement;
    link?.addEventListener('pointerenter', enter);
    link?.addEventListener('pointerleave', leave);
    link?.addEventListener('focus', enter);
    link?.addEventListener('blur', leave);
    document.addEventListener('visibilitychange', refresh);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      refreshRef.current = () => {};
      observer.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      link?.removeEventListener('pointerenter', enter);
      link?.removeEventListener('pointerleave', leave);
      link?.removeEventListener('focus', enter);
      link?.removeEventListener('blur', leave);
      const materials = new Set<THREE.Material>();
      book.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <span ref={hostRef} className="obs-knowledge-book" aria-hidden="true">{failed && <BookOpen size={74} />}</span>;
}
