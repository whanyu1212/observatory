import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { projects, type ProjectId } from './curiosity';
import { buildWorld, WORLD_POINTS, WORLD_BOUNDS } from './worldGeometry';
import { createCameraJourney } from './cameraJourney';
import { createTravelTrail } from './travelTrail';
import { createLandmarkReactions } from './landmarkReactions';
import { createUniverseAtmosphere } from './universeAtmosphere';

export type ExplorationSceneProps = {
  destination: ProjectId | null;
  selectedProject: ProjectId | null;
  detailProject: ProjectId | null;
  navigationRequest: number;
  motionEnabled: boolean;
  onArrive: (id: ProjectId) => void;
  onReady?: () => void;
};

const ids = Object.keys(projects) as ProjectId[];
const labelHeights: Record<ProjectId, number> = { 'gem-dota': 3.95, wisp: 3.35, krill: 3.75, opencouch: 2.45, nimble: 2.9, quantrl: 3.55, 'fractional-bonds': 3.55, 'shipping-ml': 4.2, 'mental-gym': 3.2, 'claude-code-anatomy': 3.45 };

const rootStyle = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden',
  background: 'transparent',
} as const;

const labelStyle = {
  position: 'absolute', left: 0, top: 0, zIndex: 3, display: 'flex', alignItems: 'center', gap: '7px',
  minHeight: '30px', padding: '6px 9px 6px 7px', border: '1px solid rgba(217,249,145,.34)', borderRadius: '999px',
  // No backdrop-filter: blurring 10 pills over the live WebGL canvas costs the
  // compositor a re-blur every frame. A more opaque background reads the same.
  color: '#edf2e8', background: 'rgba(7,14,16,.94)',
  boxShadow: '0 8px 26px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.025)',
  font: '600 10px/1 "IBM Plex Mono", monospace', letterSpacing: '.035em', whiteSpace: 'nowrap', cursor: 'pointer',
  willChange: 'transform, opacity', transition: 'opacity 180ms ease, border-color 180ms ease, background 180ms ease',
} as const;

const markerStyle = {
  width: '16px', height: '16px', display: 'grid', placeItems: 'center', borderRadius: '50%',
  color: '#091214', background: '#d9f991', fontSize: '8px', boxShadow: '0 0 14px rgba(217,249,145,.55)',
} as const;

const shortNames: Record<ProjectId, string> = {
  'gem-dota': 'Gem Dota',
  wisp: 'Wisp',
  krill: 'Krill.jl',
  opencouch: 'OpenCouch',
  nimble: 'NimbleAgents',
  quantrl: 'QuantRL',
  'fractional-bonds': 'Bonds',
  'shipping-ml': 'Shipping ML',
  'mental-gym': 'Mental Gym',
  'claude-code-anatomy': 'Claude Anatomy',
};

type CameraActions = {
  rotate: (direction: -1 | 1) => void;
  zoom: (direction: -1 | 1) => void;
  reset: () => void;
};

const emptyCameraActions: CameraActions = {
  rotate: () => undefined,
  zoom: () => undefined,
  reset: () => undefined,
};

function ProjectButton({ id, index, buttonRef, onChoose, onLook }: {
  id: ProjectId; index: number; buttonRef: (element: HTMLButtonElement | null) => void; onChoose: (id: ProjectId) => void;
  onLook: (id: ProjectId | null) => void;
}) {
  const project = projects[id];
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Navigate to ${project.name}: ${project.question}`}
      title={project.question}
      data-project={id}
      onClick={() => onChoose(id)}
      onPointerEnter={() => onLook(id)}
      onPointerLeave={() => onLook(null)}
      style={labelStyle}
      className="world-project-label"
      onFocus={(event) => { onLook(id); event.currentTarget.style.borderColor = '#d9f991'; event.currentTarget.style.background = 'rgba(20,31,32,.96)'; }}
      onBlur={(event) => { onLook(null); event.currentTarget.style.borderColor = 'rgba(217,249,145,.34)'; event.currentTarget.style.background = 'rgba(7,14,16,.82)'; }}
    >
      <span aria-hidden="true" style={markerStyle}>{String(index + 1).padStart(2, '0')}</span>
      <span className="world-project-name">{project.mapName ?? project.name}</span>
    </button>
  );
}

export function ExplorationScene({ destination, selectedProject, detailProject, navigationRequest, motionEnabled, onArrive, onReady }: ExplorationSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<ProjectId, HTMLButtonElement>());
  const leaderRefs = useRef(new Map<ProjectId, SVGLineElement>());
  const navigateRef = useRef<(id: ProjectId) => void>(() => undefined);
  const cameraActionsRef = useRef<CameraActions>(emptyCameraActions);
  const focusRef = useRef<(id: ProjectId | null) => void>(() => undefined);
  const lookingAtRef = useRef<ProjectId | null>(null);
  const onArriveRef = useRef(onArrive);
  const onReadyRef = useRef(onReady);
  const motionRef = useRef(motionEnabled);
  const detailProjectRef = useRef(detailProject);
  detailProjectRef.current = detailProject;
  const [failed, setFailed] = useState(false);

  useEffect(() => { onArriveRef.current = onArrive; }, [onArrive]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { motionRef.current = motionEnabled; }, [motionEnabled]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('The exploration world could not start WebGL.', error);
      navigateRef.current = (id) => onArriveRef.current(id);
      setFailed(true);
      onReadyRef.current?.();
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080d20, 0.013);
    const camera = new THREE.PerspectiveCamera(41, 1, 0.1, 150);
    camera.position.set(17, 18, 22);
    scene.add(camera);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x061012, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'application');
    renderer.domElement.setAttribute('aria-label', 'Playable project universe. Scroll to read more of the page. Drag with a mouse to orbit, hold Ctrl while scrolling or pinch to zoom, and use WASD or arrow keys to pilot the explorer. On touchscreens, swipe to scroll and use the camera buttons to rotate. Select a project marker or tap an island to travel.');
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:1px solid transparent;outline-offset:-4px;cursor:grab;';
    host.prepend(renderer.domElement);

    const homeTarget = new THREE.Vector3(0, 0.8, 0);
    const homeDirection = new THREE.Vector3(15, 23, 21).normalize();
    let homeDistance = 30.5;
    camera.position.copy(homeTarget).addScaledVector(homeDirection, homeDistance);
    const controls = new OrbitControls(camera, renderer.domElement);
    // OrbitControls defaults to blocking page gestures. Keep one-finger scrolling
    // native while reserving two-finger gestures for the camera.
    renderer.domElement.style.touchAction = 'pan-y';
    controls.touches.ONE = null;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    controls.target.copy(homeTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.55;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.85;
    controls.zoomToCursor = false;
    controls.minDistance = 15;
    controls.maxDistance = 64;
    controls.minPolarAngle = 0.48;
    controls.maxPolarAngle = 1.18;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.update();

    const hemisphere = new THREE.HemisphereLight(0xc5d5f3, 0x11162d, 2.6);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff5db, 4.4);
    sun.position.set(-12, 22, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 55;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8aafff, 3.0);
    rim.position.set(16, 10, -18);
    scene.add(rim);

    const world = buildWorld();
    scene.add(world.group);
    // A reflection environment adds facet highlights without a visible backdrop.
    const environmentRoom = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(environmentRoom, .035);
    environmentRoom.dispose();
    pmrem.dispose();
    world.group.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshPhysicalMaterial) object.material.envMap = environment.texture;
    });
    const reactions = createLandmarkReactions(world.group);
    const travelTrail = createTravelTrail();
    scene.add(travelTrail.object);
    const pickableProjects = [...world.pickers.keys()];
    let hoveredProject: ProjectId | null = null;
    let lastHoverCheck = 0;
    const hoverPointer = new THREE.Vector2();
    let hoverPending = false;
    const landmarks = ids.map(id => ({ id, root: world.group.getObjectByName(`landmark-${id}`)!, lift: 0 }));
    const journey = createCameraJourney(camera.position, controls.target);
    let focusedProject: ProjectId | null = null;
    let arrivalReaction = 1;
    const settleControls = () => {
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = damping;
    };
    focusRef.current = id => {
      if (id === focusedProject) return;
      focusedProject = id;
      settleControls();
      if (id) {
        arrivalReaction = 0;
        reactions.arrive(id);
        const point = WORLD_POINTS[id].clone();
        point.y += 2.1;
        // Keep the selected sculpture beside the discovery card on narrower desktops.
        if (!compact) point.addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), THREE.MathUtils.clamp((1100 - width) / 140, 0, 3));
        journey.focus(point, THREE.MathUtils.clamp(controls.getDistance() * 0.76, controls.minDistance, compact ? 26 : 23));
      } else journey.restore();
    };
    const interruptJourney = () => journey.interrupt();
    controls.addEventListener('start', interruptJourney);

    const atmosphere = createUniverseAtmosphere(renderer.getPixelRatio());
    scene.add(atmosphere.object);

    const current = new THREE.Vector3(0, 0, 0.4);
    const target = current.clone();
    const projected = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();
    const cameraRight = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keys = new Set<string>();
    let targetProject: ProjectId | null = null;
    let arrivedAt: ProjectId | null = null;
    let heading = 0;
    let animationTime = 0;
    let frame = 0;
    let visible = true;
    let documentVisible = !document.hidden;
    let disposed = false;
    let width = 1;
    let height = 1;
    let compact = false;
    let lastTime = performance.now();
    let lastPositionStamp = '';
    // With motion paused the scene is static, so the loop keeps ticking but only
    // pays for a draw when this signature of the visible state actually changes.
    let lastIdleStamp = '';
    let idleSince = 0;
    const activePointers = new Set<number>();
    let tapGesture: { pointerId: number; x: number; y: number; moved: number; multi: boolean; button: number } | null = null;

    const setWaypoint = (id: ProjectId) => {
      targetProject = id;
      target.copy(WORLD_POINTS[id]);
      const approach = new THREE.Vector3(-target.x, 0, -target.z);
      if (approach.lengthSq() < 0.1) approach.set(0, 0, 1);
      target.add(approach.normalize().multiplyScalar(1.42));
      renderer.domElement.focus({ preventScroll: true });
      if (!motionRef.current) {
        current.copy(target);
        world.explorer.position.set(current.x, current.y + 1.58, current.z);
      }
      const destinationPoint = WORLD_POINTS[id];
      if (current.distanceTo(destinationPoint) < 1.72) {
        arrivedAt = id;
        onArriveRef.current(id);
      }
    };
    navigateRef.current = setWaypoint;

    const clampFlight = () => {
      current.x = THREE.MathUtils.clamp(current.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
      current.z = THREE.MathUtils.clamp(current.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
    };
    const cruiseElevation = () => {
      let nearestDistance = Infinity;
      let elevation = 0;
      ids.forEach(id => {
        const point = WORLD_POINTS[id];
        const distance = Math.hypot(current.x - point.x, current.z - point.z);
        if (distance < nearestDistance) { nearestDistance = distance; elevation = point.y; }
      });
      // Manual flight gently approaches an island's altitude; no extra vertical controls.
      return elevation * (1 - THREE.MathUtils.smoothstep(nearestDistance, 2.3, 7));
    };

    const positionLabels = () => {
      // CSS recession scales the canvas and labels together; work in local pixels.
      const rect = { width: host.clientWidth, height: host.clientHeight };
      const scale = compact ? 0.88 : 1;
      const margin = compact ? 9 : 14;
      const bottomReserve = compact ? 26 + Math.ceil(ids.length / 3) * 30 : 12;
      const selectedDistance = targetProject ? current.distanceTo(WORLD_POINTS[targetProject]) : Infinity;
      const priorityProject = focusedProject ?? targetProject;
      const candidates = ids.map((id, index) => {
        const button = labelRefs.current.get(id);
        if (!button) return null;
        projected.copy(WORLD_POINTS[id]);
        projected.y += 2.1 + (landmarks.find(item => item.id === id)?.lift ?? 0);
        projected.project(camera);
        button.dataset.anchorX = (projected.x * .5 + .5).toFixed(4);
        button.dataset.anchorY = (-projected.y * .5 + .5).toFixed(4);
        button.dataset.anchorVisible = String(projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1);
        projected.copy(WORLD_POINTS[id]);
        projected.y += 0.9 + labelHeights[id] + (landmarks.find(item => item.id === id)?.lift ?? 0);
        projected.project(camera);
        const onScreen = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.08 && Math.abs(projected.y) < 1.08;
        return {
          id,
          index,
          button,
          onScreen,
          depth: projected.z,
          sourceX: (projected.x * 0.5 + 0.5) * rect.width,
          sourceY: (-projected.y * 0.5 + 0.5) * rect.height + (index % 2 ? 3 : -3),
          width: Math.max(26, button.offsetWidth * scale),
          height: Math.max(26, button.offsetHeight * scale),
        };
      }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

      candidates.sort((a, b) => {
        if (a.id === priorityProject) return -1;
        if (b.id === priorityProject) return 1;
        return a.depth - b.depth;
      });

      const occupied: Array<{ left: number; top: number; right: number; bottom: number }> = compact
        ? [{ left: Math.max(0, rect.width - 205), top: 0, right: rect.width, bottom: 76 }]
        : [
            { left: Math.max(0, rect.width - 260), top: Math.max(0, rect.height - 62), right: rect.width, bottom: rect.height },
          ];
      const verticalOffsets = [0, -36, 36, -72, 72, -108, 108];
      const horizontalOffsets = [0, 54, -54, 92, -92];
      candidates.forEach(({ id, button, onScreen, sourceX, sourceY, width: labelWidth, height: labelHeight }) => {
        const leader = leaderRefs.current.get(id);
        let position: { x: number; y: number; box: { left: number; top: number; right: number; bottom: number } } | null = null;
        if (onScreen) {
          for (const yOffset of verticalOffsets) {
            for (const xOffset of horizontalOffsets) {
              const x = THREE.MathUtils.clamp(sourceX + xOffset, margin + labelWidth / 2, rect.width - margin - labelWidth / 2);
              const y = THREE.MathUtils.clamp(sourceY + yOffset, margin + labelHeight / 2, rect.height - bottomReserve - labelHeight / 2);
              const box = {
                left: x - labelWidth / 2 - 4,
                top: y - labelHeight / 2 - 4,
                right: x + labelWidth / 2 + 4,
                bottom: y + labelHeight / 2 + 4,
              };
              if (!occupied.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) {
                position = { x, y, box };
                break;
              }
            }
            if (position) break;
          }
        }

        const visibleLabel = Boolean(position);
        if (position) occupied.push(position.box);
        const x = position?.x ?? sourceX;
        const y = position?.y ?? sourceY;
        button.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${scale})`;
        const subdued = focusedProject !== null && focusedProject !== id && document.activeElement !== button;
        button.style.opacity = visibleLabel ? (subdued ? '.28' : priorityProject === id && (focusedProject !== null || selectedDistance < 2.2) ? '1' : compact ? '.82' : '.9') : '0';
        button.style.pointerEvents = visibleLabel ? 'auto' : 'none';
        button.style.zIndex = priorityProject === id ? '5' : '3';
        button.tabIndex = visibleLabel ? 0 : -1;
        button.setAttribute('aria-hidden', visibleLabel ? 'false' : 'true');
        const displaced = Boolean(position && (Math.abs(position.x - sourceX) > 2 || Math.abs(position.y - sourceY) > 2));
        button.dataset.displaced = displaced ? 'true' : 'false';
        if (leader) {
          leader.setAttribute('x1', sourceX.toFixed(1));
          leader.setAttribute('y1', sourceY.toFixed(1));
          leader.setAttribute('x2', x.toFixed(1));
          leader.setAttribute('y2', y.toFixed(1));
          leader.style.opacity = displaced && visibleLabel ? (subdued ? '0.12' : '0.48') : '0';
        }
      });
    };

    const resize = () => {
      const rect = { width: host.clientWidth, height: host.clientHeight };
      if (rect.width < 2 || rect.height < 2) return;
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      compact = width < 620;
      host.dataset.compact = compact ? 'true' : 'false';
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = compact ? 54 : width / height < 1.15 ? 47 : 41;
      camera.updateProjectionMatrix();
      const previousHomeDistance = homeDistance;
      const distanceRatio = previousHomeDistance > 0 ? controls.getDistance() / previousHomeDistance : 1;
      const nextHomeTarget = compact ? new THREE.Vector3(2.6, 0.3, 2.3) : new THREE.Vector3(0, 0.8, 0);
      if (!focusedProject) {
        const shift = nextHomeTarget.clone().sub(homeTarget);
        controls.target.add(shift);
        camera.position.add(shift);
      }
      homeTarget.copy(nextHomeTarget);
      homeDistance = compact ? Math.max(30.5, 31.3 / camera.aspect) : camera.aspect < 1.15 ? 35 : 30.5;
      const viewDirection = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(viewDirection, THREE.MathUtils.clamp(homeDistance * distanceRatio, controls.minDistance, controls.maxDistance));
      controls.update();
      render(performance.now(), true);
    };

    const render = (now: number, force = false) => {
      if (disposed || (!force && (!visible || !documentVisible))) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const forwardInput = (keys.has('arrowup') || keys.has('w') ? 1 : 0) - (keys.has('arrowdown') || keys.has('s') ? 1 : 0);
      const rightInput = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      cameraForward.copy(controls.target).sub(camera.position).setY(0);
      if (cameraForward.lengthSq() < 0.001) cameraForward.set(0, 0, -1);
      cameraForward.normalize();
      cameraRight.crossVectors(cameraForward, camera.up).normalize();
      const move = new THREE.Vector3().addScaledVector(cameraForward, forwardInput).addScaledVector(cameraRight, rightInput);
      if (move.lengthSq() > 0) {
        targetProject = null;
        move.normalize().multiplyScalar(5.4 * dt);
        current.add(move);
        clampFlight();
        current.y = THREE.MathUtils.damp(current.y, cruiseElevation(), 5, dt);
        target.copy(current);
        heading = Math.atan2(move.z, move.x);
      } else {
        const delta = target.clone().sub(current);
        if (delta.lengthSq() > 0.01) {
          heading = Math.atan2(delta.z, delta.x);
          const travel = motionRef.current ? Math.min(delta.length(), dt * 4.7) : delta.length();
          current.add(delta.normalize().multiplyScalar(travel));
        }
      }

      const animate = motionRef.current;
      arrivalReaction = animate ? Math.min(1, arrivalReaction + dt / 0.8) : 1;
      const greeting = Math.sin(arrivalReaction * Math.PI);
      const lookAt = lookingAtRef.current ?? hoveredProject ?? focusedProject;
      if (lookAt && target.distanceToSquared(current) < 0.04 && !move.lengthSq()) {
        const point = WORLD_POINTS[lookAt];
        heading = Math.atan2(point.z - current.z, point.x - current.x);
      }
      world.explorer.position.set(current.x, current.y + 1.58 + (animate ? Math.sin(now * 0.003) * 0.1 + greeting * 0.24 : 0), current.z);
      const headingDelta = Math.atan2(Math.sin(-heading - world.explorer.rotation.y), Math.cos(-heading - world.explorer.rotation.y));
      world.explorer.rotation.y += headingDelta * (animate ? 1 - Math.exp(-14 * dt) : 1);
      host.dataset.explorerHeading = world.explorer.rotation.y.toFixed(3);
      host.dataset.lookTarget = lookAt ?? '';
      world.explorer.rotation.z = animate && move.lengthSq() ? Math.sin(now * 0.009) * 0.035 : 0;
      world.hoverLight.intensity = animate ? 2.15 + Math.sin(now * 0.007) * 0.45 + greeting * 1.3 : 2.25;
      const positionStamp = `${current.x.toFixed(2)},${current.y.toFixed(2)},${current.z.toFixed(2)}`;
      if (positionStamp !== lastPositionStamp) {
        host.dataset.explorerX = current.x.toFixed(2);
        host.dataset.explorerY = current.y.toFixed(2);
        host.dataset.explorerZ = current.z.toFixed(2);
        lastPositionStamp = positionStamp;
      }

      // Strip last frame's focus offset before the landmark's own bob is evaluated.
      landmarks.forEach(item => { item.root.position.y -= item.lift; });
      if (animate) {
        animationTime += dt;
        world.animated.forEach((object, index) => {
          if (object.userData.spin) object.rotation.z += dt * object.userData.spin;
          if (object.userData.spinY) object.rotation.y += dt * object.userData.spinY;
          if (object.userData.bobAmplitude || object.userData.float !== undefined) {
            const amplitude = object.userData.bobAmplitude ?? 0.06;
            const speed = object.userData.bobSpeed ?? 2;
            const phase = object.userData.phase ?? object.userData.float ?? 0;
            object.position.y = object.userData.baseY + Math.sin(animationTime * speed + phase) * amplitude;
          }
          if (object.userData.pulse) object.scale.copy(object.userData.baseScale).multiplyScalar(0.96 + Math.sin(animationTime * 4 + object.userData.pulse) * 0.08);
        });
      }
      landmarks.forEach(item => {
        const lift = focusedProject === item.id ? (detailProjectRef.current === item.id ? .9 : .5) : 0;
        item.lift = animate ? THREE.MathUtils.damp(item.lift, lift, 6, dt) : lift;
        item.root.position.y += item.lift;
      });
      reactions.update(dt, animate, lookingAtRef.current ?? hoveredProject ?? focusedProject, world.explorer.position, camera.position);
      travelTrail.update(world.explorer.position, move.lengthSq() > 0 || target.distanceToSquared(current) > .01, dt, animate);

      let nearest: ProjectId | null = null;
      let nearestDistance = Infinity;
      ids.forEach((id) => {
        const distance = current.distanceTo(WORLD_POINTS[id]);
        if (distance < nearestDistance) { nearest = id; nearestDistance = distance; }
      });
      const arrivalAllowed = !targetProject || nearest === targetProject;
      if (nearest && arrivalAllowed && nearestDistance < 1.72 && arrivedAt !== nearest) {
        arrivedAt = nearest;
        onArriveRef.current(nearest);
      } else if (nearestDistance > 2.1) {
        arrivedAt = null;
      }

      journey.update(dt, animate);
      controls.update(dt);
      camera.updateMatrixWorld();
      if (hoverPending && now - lastHoverCheck > 32) {
        hoverPending = false;
        lastHoverCheck = now;
        world.group.updateMatrixWorld(true);
        raycaster.setFromCamera(hoverPointer, camera);
        const hit = raycaster.intersectObjects(pickableProjects, false)[0];
        hoveredProject = hit ? world.pickers.get(hit.object) ?? null : null;
        renderer.domElement.style.cursor = hoveredProject ? 'pointer' : 'grab';
      }
      host.dataset.cameraAzimuth = controls.getAzimuthalAngle().toFixed(3);
      host.dataset.cameraPolar = controls.getPolarAngle().toFixed(3);
      host.dataset.cameraDistance = controls.getDistance().toFixed(2);
      atmosphere.update(dt, animate, camera);
      // When motion is paused nothing animates on its own, so a redraw is only
      // worth its cost once something the viewer can see has moved. Everything
      // that changes the image contributes to the signature below.
      let shouldDraw = true;
      if (!animate && !force) {
        const idleStamp = [
          positionStamp,
          camera.position.x.toFixed(3), camera.position.y.toFixed(3), camera.position.z.toFixed(3),
          controls.target.x.toFixed(3), controls.target.y.toFixed(3), controls.target.z.toFixed(3),
          world.explorer.rotation.y.toFixed(3),
          focusedProject ?? '', hoveredProject ?? '', lookAt ?? '',
          landmarks.map(item => item.lift.toFixed(3)).join(),
        ].join('|');
        if (idleStamp === lastIdleStamp) {
          // Damping, the travel trail and landmark lifts settle over a few frames
          // after the stamp stops changing; keep drawing briefly so they land.
          shouldDraw = now - idleSince < 500;
        } else {
          lastIdleStamp = idleStamp;
          idleSince = now;
        }
      }
      if (shouldDraw) {
        positionLabels();
        renderer.render(scene, camera);
      }
      if (!force) frame = requestAnimationFrame(render);
    };

    const redraw = () => {
      controls.update();
      render(performance.now(), true);
    };
    cameraActionsRef.current = {
      rotate: (direction) => {
        journey.interrupt();
        controls.rotateLeft(direction * Math.PI / 7);
        redraw();
      },
      zoom: (direction) => {
        journey.interrupt();
        if (direction < 0) controls.dollyIn(0.82);
        else controls.dollyOut(0.82);
        redraw();
      },
      reset: () => {
        journey.discard();
        controls.target0.copy(homeTarget);
        controls.position0.copy(homeTarget).addScaledVector(homeDirection, homeDistance);
        controls.zoom0 = 1;
        const dampingWasEnabled = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.reset();
        controls.update();
        controls.enableDamping = dampingWasEnabled;
        redraw();
      },
    };

    const start = () => {
      if (disposed || frame || !visible || !documentVisible) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(render);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      hoveredProject = null;
      hoverPending = false;
      activePointers.add(event.pointerId);
      if (activePointers.size === 1) {
        tapGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: 0, multi: false, button: event.button };
      } else if (tapGesture) {
        tapGesture.multi = true;
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && activePointers.size === 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        hoverPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        hoverPending = true;
      }
      if (!tapGesture || tapGesture.pointerId !== event.pointerId) return;
      tapGesture.moved = Math.max(tapGesture.moved, Math.hypot(event.clientX - tapGesture.x, event.clientY - tapGesture.y));
    };
    const onPointerUp = (event: PointerEvent) => {
      const isTap = Boolean(
        tapGesture
        && tapGesture.pointerId === event.pointerId
        && tapGesture.button === 0
        && !tapGesture.multi
        && tapGesture.moved <= 7
        && Math.hypot(event.clientX - tapGesture.x, event.clientY - tapGesture.y) <= 7
        && activePointers.size === 1,
      );
      activePointers.delete(event.pointerId);
      if (tapGesture?.pointerId === event.pointerId) tapGesture = null;
      if (!isTap) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const projectHits = raycaster.intersectObjects(pickableProjects, false);
      if (projectHits.length) {
        const id = world.pickers.get(projectHits[0].object);
        if (id) setWaypoint(id);
        return;
      }
      const groundHits = raycaster.intersectObjects(world.ground, false);
      if (groundHits.length) {
        const id = groundHits[0].object.userData.projectId as ProjectId | undefined;
        if (id) { setWaypoint(id); return; }
        targetProject = null;
        target.set(
          THREE.MathUtils.clamp(groundHits[0].point.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX), 0,
          THREE.MathUtils.clamp(groundHits[0].point.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ),
        );
        renderer.domElement.focus({ preventScroll: true });
      }
    };
    const onPointerCancel = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      if (tapGesture) tapGesture.multi = true;
      if (tapGesture?.pointerId === event.pointerId) tapGesture = null;
    };
    const onPointerLeave = () => { hoveredProject = null; hoverPending = false; renderer.domElement.style.cursor = 'grab'; };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        if (key.startsWith('arrow')) event.preventDefault();
        if (!event.repeat) {
          cameraForward.copy(controls.target).sub(camera.position).setY(0);
          if (cameraForward.lengthSq() < 0.001) cameraForward.set(0, 0, -1);
          cameraForward.normalize();
          cameraRight.crossVectors(cameraForward, camera.up).normalize();
          const nudge = new THREE.Vector3()
            .addScaledVector(cameraForward, key === 'arrowup' || key === 'w' ? 1 : key === 'arrowdown' || key === 's' ? -1 : 0)
            .addScaledVector(cameraRight, key === 'arrowleft' || key === 'a' ? -1 : key === 'arrowright' || key === 'd' ? 1 : 0)
            .normalize()
            .multiplyScalar(0.34);
          current.add(nudge);
          clampFlight();
          target.copy(current);
          target.y = cruiseElevation();
          targetProject = null;
        }
        keys.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
    const onBlur = () => { keys.clear(); };
    const onWindowBlur = () => { keys.clear(); };
    const onWheelCapture = (event: WheelEvent) => {
      // Capture runs before OrbitControls can cancel the browser's normal scroll.
      // Trackpad pinch also arrives as a Ctrl-modified wheel event.
      if (!event.ctrlKey) event.stopImmediatePropagation();
    };
    const onVisibility = () => {
      documentVisible = !document.hidden;
      if (!documentVisible) keys.clear();
      if (documentVisible) start(); else stop();
    };

    renderer.domElement.addEventListener('wheel', onWheelCapture, { capture: true, passive: true });
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('keydown', onKeyDown);
    renderer.domElement.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('blur', onBlur);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibility);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    }, { rootMargin: '160px' });
    intersectionObserver.observe(host);

    resize();
    start();
    onReadyRef.current?.();

    return () => {
      disposed = true;
      stop();
      navigateRef.current = () => undefined;
      cameraActionsRef.current = emptyCameraActions;
      focusRef.current = () => undefined;
      controls.removeEventListener('start', interruptJourney);
      controls.dispose();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('wheel', onWheelCapture, true);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('blur', onBlur);
      window.removeEventListener('blur', onWindowBlur);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite || object instanceof THREE.Line) {
          if (object.geometry) geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
        material.dispose();
      });
      geometries.forEach(geometry => geometry.dispose());
      environment.dispose();
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    if (destination) navigateRef.current(destination);
  }, [destination, navigationRequest]);

  useEffect(() => { focusRef.current(selectedProject); }, [selectedProject]);

  if (failed) {
    return (
      <div style={{ ...rootStyle, position: 'absolute', display: 'grid', placeItems: 'center', padding: '28px' }} role="region" aria-label="Project world fallback">
        <div style={{ maxWidth: '620px', color: '#edf2e8', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', font: '600 12px/1.4 "IBM Plex Mono", monospace', color: '#d9f991', letterSpacing: '.1em' }}>THE WORLD IS OFFLINE</p>
          <p style={{ margin: '0 0 20px', font: '400 14px/1.65 "Space Grotesk", sans-serif', color: '#a5b4af' }}>3D graphics are unavailable here. Every destination is still within reach.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            {ids.map((id) => <button key={id} type="button" onClick={() => onArriveRef.current(id)} style={{ ...labelStyle, position: 'relative' }}>{projects[id].mapName ?? projects[id].name}</button>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={hostRef} style={rootStyle} data-exploration-world>
      <style>{`
        [data-exploration-world] canvas:focus-visible {
          outline: 1px solid rgba(217,249,145,.64) !important;
          outline-offset: -4px !important;
        }
        .world-camera-toolbar {
          position: absolute;
          z-index: 7;
          right: 18px;
          bottom: 16px;
          display: flex;
          gap: 5px;
          padding: 5px;
          border: 1px solid rgba(217,249,145,.2);
          border-radius: 999px;
          background: rgba(7,14,16,.72);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
        }
        .world-camera-toolbar button {
          min-width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border: 1px solid rgba(217,249,145,.18);
          border-radius: 999px;
          color: #edf2e8;
          background: rgba(255,255,255,.035);
          font: 600 10px/1 "IBM Plex Mono", monospace;
          cursor: pointer;
        }
        .world-camera-toolbar button:hover { border-color: rgba(217,249,145,.6); background: rgba(217,249,145,.1); }
        .world-camera-toolbar button:focus-visible { outline: 1px solid #d9f991; outline-offset: 2px; }
        .world-touch-hint { display: none; }
        .world-destination-legend { display: none; }
        @media (max-width: 619px) {
          .world-camera-toolbar {
            top: 10px;
            right: 10px;
            bottom: auto;
            gap: 3px;
            padding: 4px;
          }
          .world-camera-toolbar button { min-width: 28px; height: 28px; padding: 0 6px; font-size: 9px; }
          .world-camera-toolbar .world-reset-label { display: none; }
          .world-touch-hint {
            position: absolute;
            z-index: 6;
            top: 51px;
            right: 12px;
            display: block;
            color: rgba(237,242,232,.62);
            font: 600 8px/1.2 "IBM Plex Mono", monospace;
            letter-spacing: .06em;
            pointer-events: none;
          }
          .world-project-label {
            min-width: 26px !important;
            min-height: 26px !important;
            padding: 4px !important;
            border-color: rgba(217,249,145,.48) !important;
            background: rgba(7,14,16,.72) !important;
          }
          .world-project-label .world-project-name { display: none; }
          .world-project-label > span:first-child {
            width: 17px !important;
            height: 17px !important;
          }
          .world-destination-legend {
            position: absolute;
            z-index: 5;
            left: 12px;
            right: 12px;
            bottom: 22px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 5px;
          }
          .world-destination-legend button {
            min-width: 0;
            height: 25px;
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 0 6px;
            border: 1px solid rgba(217,249,145,.22);
            border-radius: 4px;
            color: rgba(237,242,232,.88);
            background: rgba(7,14,16,.78);
            backdrop-filter: blur(8px);
            font: 600 9px/1 "IBM Plex Mono", monospace;
            letter-spacing: -.01em;
            overflow: hidden;
            cursor: pointer;
          }
          .world-destination-legend button:focus-visible {
            outline: 1px solid #d9f991;
            outline-offset: 1px;
          }
          .world-destination-legend button:last-child:nth-child(3n + 1) {
            grid-column: 1 / -1;
            justify-content: center;
          }
          .world-destination-legend b {
            flex: 0 0 auto;
            color: #d9f991;
            font-size: 8px;
            font-weight: 600;
          }
          .world-destination-legend span {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 55% 55%, rgba(7,15,17,.1), transparent 72%)' }} />
      <svg aria-hidden="true" width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 2, overflow: 'visible', pointerEvents: 'none' }}>
        {ids.map(id => (
          <line
            key={id}
            ref={(element) => { if (element) leaderRefs.current.set(id, element); else leaderRefs.current.delete(id); }}
            stroke="rgba(217,249,145,.7)"
            strokeWidth="1"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: 0, transition: 'opacity 180ms ease' }}
          />
        ))}
      </svg>
      {ids.map((id, index) => (
        <ProjectButton
          key={id}
          id={id}
          index={index}
          buttonRef={(element) => { if (element) labelRefs.current.set(id, element); else labelRefs.current.delete(id); }}
          onLook={id => { lookingAtRef.current = id; }}
          onChoose={(next) => navigateRef.current(next)}
        />
      ))}
      <div className="world-camera-toolbar" role="group" aria-label="Universe camera controls">
        <button type="button" onClick={() => cameraActionsRef.current.rotate(1)} aria-label="Rotate view left" title="Rotate view left">&#8630;</button>
        <button type="button" onClick={() => cameraActionsRef.current.rotate(-1)} aria-label="Rotate view right" title="Rotate view right">&#8631;</button>
        <button type="button" onClick={() => cameraActionsRef.current.zoom(-1)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" onClick={() => cameraActionsRef.current.zoom(1)} aria-label="Zoom out" title="Zoom out">&minus;</button>
        <button type="button" onClick={() => cameraActionsRef.current.reset()} aria-label="Reset universe view" title="Reset universe view"><span aria-hidden="true">&#8634;</span><span className="world-reset-label">&nbsp;RESET</span></button>
      </div>
      <div className="world-touch-hint" aria-hidden="true">SWIPE TO SCROLL · PINCH TO ZOOM</div>
      <nav className="world-destination-legend" aria-label="World destinations">
        {ids.map((id, index) => (
          <button key={id} type="button" onClick={() => navigateRef.current(id)} aria-label={`Navigate to ${projects[id].name}`}>
            <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
            <span>{shortNames[id]}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
