import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Lock } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { projects, type ProjectId } from './curiosity';
import { buildWorld, WORLD_POINTS, WORLD_BOUNDS, SECRET_CORRIDOR, SIGNAL_BUOY } from './worldGeometry';
import { createCameraJourney } from './cameraJourney';
import { createTravelTrail } from './travelTrail';
import { createLandmarkReactions } from './landmarkReactions';
import { createUniverseAtmosphere } from './universeAtmosphere';
import { SUN_POSITION, PLANET_POSITION, PLANET_CLEARANCE } from './celestialScenery';
import { createSceneTheme } from './sceneTheme';
import { createGlowSprites, type GlowSource } from './glowSprites';
import { createFlightFeel } from './flightFeel';
import { $theme, type SpectrumTheme } from '@/stores/osStore';

export type ExplorationSceneProps = {
  destination: ProjectId | null;
  selectedProject: ProjectId | null;
  detailProject: ProjectId | null;
  /** Secret projects the visitor has not found yet: no label, no legend entry. */
  hiddenProjects: ProjectId[];
  navigationRequest: number;
  motionEnabled: boolean;
  onArrive: (id: ProjectId) => void;
  onDepart: () => void;
  onReady?: () => void;
};

const ids = Object.keys(projects) as ProjectId[];
// The explorer parks about two units beside a landmark, so arrival is judged a little wider.
const ARRIVAL_RADIUS = 2.3;
const DEPARTURE_RADIUS = 2.7;

const rootStyle = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden',
  background: 'transparent',
} as const;

const labelStyle = {
  position: 'absolute', left: 0, top: 0, zIndex: 3, display: 'flex', alignItems: 'center', gap: '7px',
  minHeight: '30px', padding: '6px 9px 6px 7px', border: 0, borderRadius: '999px',
  // No backdrop-filter: blurring 10 pills over the live WebGL canvas costs the
  // compositor a re-blur every frame. A more opaque background reads the same.
  color: '#edf2e8', background: 'rgba(7,14,16,.94)',
  boxShadow: '0 8px 26px rgba(0,0,0,.28)',
  font: '600 10px/1 "IBM Plex Mono", monospace', letterSpacing: '.035em', whiteSpace: 'nowrap', cursor: 'pointer',
  willChange: 'transform, opacity', transition: 'opacity 180ms ease, background 180ms ease',
} as const;

const markerStyle = {
  width: '16px', height: '16px', display: 'grid', placeItems: 'center', borderRadius: '50%',
  color: '#091214', background: 'var(--obs-accent)', fontSize: '8px', boxShadow: '0 0 14px color-mix(in srgb, var(--obs-accent), transparent 45%)',
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
  'alpha-workbench': 'Alpha Workbench',
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
      onFocus={() => onLook(id)}
      onBlur={() => onLook(null)}
    >
      <span aria-hidden="true" style={markerStyle}>{String(index + 1).padStart(2, '0')}</span>
      <span className="world-project-name">{project.mapName ?? project.name}</span>
      {project.secret && <Lock className="world-project-lock" size={11} aria-hidden="true" />}
      <span className="world-project-tagline" aria-hidden="true">{project.tagline}</span>
    </button>
  );
}

export function ExplorationScene({ destination, selectedProject, detailProject, hiddenProjects, navigationRequest, motionEnabled, onArrive, onDepart, onReady }: ExplorationSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<ProjectId, HTMLButtonElement>());
  const navigateRef = useRef<(id: ProjectId) => void>(() => undefined);
  const cameraActionsRef = useRef<CameraActions>(emptyCameraActions);
  const focusRef = useRef<(id: ProjectId | null) => void>(() => undefined);
  const lookingAtRef = useRef<ProjectId | null>(null);
  const onArriveRef = useRef(onArrive);
  const onDepartRef = useRef(onDepart);
  const onReadyRef = useRef(onReady);
  const motionRef = useRef(motionEnabled);
  const wakeRef = useRef<(force?: boolean, labels?: boolean) => void>(() => undefined);
  const detailProjectRef = useRef(detailProject);
  detailProjectRef.current = detailProject;
  const theme = useStore($theme);
  const themeRef = useRef(theme);
  const hiddenRef = useRef(hiddenProjects);
  const signalRef = useRef<HTMLParagraphElement>(null);
  const applyThemeRef = useRef<(theme: SpectrumTheme) => void>(() => undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onArriveRef.current = onArrive; }, [onArrive]);
  useEffect(() => { onDepartRef.current = onDepart; }, [onDepart]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { motionRef.current = motionEnabled; wakeRef.current(true); }, [motionEnabled]);
  useEffect(() => { wakeRef.current(true); }, [detailProject]);
  useEffect(() => { themeRef.current = theme; applyThemeRef.current(theme); }, [theme]);
  useEffect(() => { hiddenRef.current = hiddenProjects; wakeRef.current(true, true); }, [hiddenProjects]);

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

    // Pixel ratio is sized once with the viewport below, then stays fixed
    // through gestures so the drawing buffer is not repeatedly reallocated.
    renderer.setClearColor(0x061012, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'application');
    renderer.domElement.setAttribute('aria-label', 'Playable project universe. Scroll to read more of the page. Drag with a mouse to orbit, hold Ctrl while scrolling or pinch to zoom, and use WASD or arrow keys to pilot the explorer, holding Shift to boost. On touchscreens, swipe to scroll and use the camera buttons to rotate. Select a project marker or tap an island to travel.');
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;cursor:grab;';
    host.prepend(renderer.domElement);

    const homeTarget = new THREE.Vector3(0.5, 0.8, 0.5);
    const homeDirection = new THREE.Vector3(15, 14, 21).normalize();
    let homeDistance = 33;
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
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -21;
    sun.shadow.camera.right = 21;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 55;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    // Reuse the existing rim light for warm highlights from the visible sun.
    const rim = new THREE.DirectionalLight(0xffcf94, 2.2);
    rim.position.copy(SUN_POSITION);
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
    const travelTrail = createTravelTrail(world.explorer);
    scene.add(travelTrail.object);
    const pickableProjects = [...world.pickers.keys()];
    const hoverPickableProjects = [...world.hoverPickers.keys()];
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
        // A reveal view has its own right-hand side; otherwise use the current camera's.
        const reveal = revealViews[id];
        const right = reveal ? new THREE.Vector3().crossVectors(reveal.clone().negate(), camera.up).normalize() : new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        if (!compact) point.addScaledVector(right, THREE.MathUtils.clamp((1100 - width) / 140, 0, 3));
        journey.focus(point, THREE.MathUtils.clamp(controls.getDistance() * 0.76, controls.minDistance, compact ? 26 : 23), revealViews[id]);
      } else journey.restore();
      interactiveUntil = motionRef.current ? performance.now() + 1400 : 0;
      labelsDirty = true;
      wake();
    };
    // The hidden island sits behind the planet from home; on arrival the camera
    // swings round to its far side and looks back past the planet toward the map.
    const revealViews: Partial<Record<ProjectId, THREE.Vector3>> = {
      'alpha-workbench': WORLD_POINTS['alpha-workbench'].clone().sub(PLANET_POSITION).setY(0).normalize().multiplyScalar(Math.cos(.5)).setY(Math.sin(.5)),
    };
    const interruptJourney = () => {
      interactiveUntil = performance.now() + 900;
      journey.interrupt();
      wake();
    };
    const continueInteraction = () => {
      interactiveUntil = performance.now() + 350;
      wake();
    };
    const finishInteraction = () => {
      interactiveUntil = performance.now() + 350;
      wake();
    };
    controls.addEventListener('start', interruptJourney);
    controls.addEventListener('change', continueInteraction);
    controls.addEventListener('end', finishInteraction);

    const atmosphere = createUniverseAtmosphere(renderer);
    scene.add(atmosphere.object);

    // The accent colour is shared by reference: the theme blend writes into it
    // and the beacon, underglow and halos read it in place.
    const accent = new THREE.Color(0xd9f991);
    const beacon = world.explorer.getObjectByName('explorer-beacon') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
    const glowSources: GlowSource[] = [];
    const addGlow = (name: string, color: number | THREE.Color, size: number, intensity: GlowSource['intensity'], offset?: THREE.Vector3) => {
      const object = world.group.getObjectByName(name);
      if (object) glowSources.push({ object, color: color instanceof THREE.Color ? color : new THREE.Color(color), size, intensity, offset });
    };
    addGlow('gem-inner-light', 0x8effd0, 1.7, .55);
    addGlow('gem-dota-hero', 0xb5ffe4, 0.9, .9);
    addGlow('gem-dota-radiant', 0x7be07b, 0.9, .45);
    addGlow('gem-dota-dire', 0xff6a5c, 0.9, .45);
    addGlow('opencouch-lamp', 0xffc98a, 1.9, .7);
    addGlow('alpha-glyph', 0xffcf6b, 1.1, .38);
    addGlow('alpha-signal', 0xbff7ee, .8, .9);
    // The buoy blinks once every couple of seconds, like a distant beacon.
    addGlow('signal-buoy-light', 0xff8a5c, 1.6, () => (performance.now() / 1000) % 2.4 < .22 ? 1.5 : .1);
    [0x9558b2, 0x389826, 0xcb3c33].forEach((color, index) => addGlow(`krill-light-${index}`, color, .8, .8));
    [0, 1, 2].forEach(index => {
      const rep = world.group.getObjectByName(`mental-gym-rep-${index}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
      if (rep) glowSources.push({ object: rep, color: new THREE.Color(0x8ff3e2), size: .6, intensity: () => rep.material.emissiveIntensity * .45 });
    });
    addGlow('wisp-core', 0x7ff7ea, 3.4, .4);
    [0xa78bea, 0x8ac86d, 0xe78187].forEach((color, index) => addGlow(`nimble-antenna-${index}`, color, 1, .9));
    addGlow('nimble-handoff', 0xd9f991, 1.7, 1);
    addGlow('anatomy-core', 0x6fe0cf, 1.6, .6);
    [0, 1, 2].forEach(index => {
      // Gate lights flare as the model passes, so their halos follow the material.
      const light = world.group.getObjectByName(`shipping-status-${index}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
      if (light) glowSources.push({ object: light, color: new THREE.Color(0x8ff0c4), size: 1, intensity: () => light.material.emissiveIntensity * .32 });
    });
    addGlow('explorer-beacon', accent, 1.2, .9);
    glowSources.push({ object: world.explorer, color: accent, size: 2, intensity: () => world.hoverLight.intensity * .16, offset: new THREE.Vector3(0, -0.7, 0) });
    world.explorer.getObjectByName('explorer-exhaust-flames')?.children.forEach(jet => {
      // Engine halos swell with the flame length, so idle ships only simmer.
      glowSources.push({ object: jet, color: new THREE.Color(0xff9a45), size: 1.7, intensity: () => THREE.MathUtils.clamp((jet.scale.x - .4) * 1.3, .12, 1), offset: new THREE.Vector3(-0.35, 0, 0) });
    });
    const glows = createGlowSprites(renderer, glowSources);
    scene.add(glows.object);
    const flight = createFlightFeel(world.explorer, accent);
    scene.add(flight.object);

    const sceneTheme = createSceneTheme({
      fog: [(scene.fog as THREE.FogExp2).color],
      sky: [hemisphere.color],
      ground: [hemisphere.groundColor],
      key: [sun.color],
      rim: [rim.color],
      rock: [...new Set(world.ground.flatMap(object => object instanceof THREE.Mesh ? [(object.material as THREE.MeshStandardMaterial).color] : []))],
      sun: [atmosphere.sunTint],
      stars: [atmosphere.starTint],
      accent: [accent, world.hoverLight.color, ...(beacon ? [beacon.material.color, beacon.material.emissive] : [])],
    });
    sceneTheme.set(themeRef.current, false);
    applyThemeRef.current = next => {
      sceneTheme.set(next, motionRef.current);
      forceDraw = true;
      wake();
    };

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
    const forwardAxis = new THREE.Vector3(1, 0, 0);
    const explorerTargetQuat = new THREE.Quaternion();
    // The explorer's unbanked orientation; flight feel adds bank and pitch on top.
    const headingQuat = world.explorer.quaternion.clone();
    let boost = 0;
    let baseFov = 41;
    const chaseGoal = new THREE.Vector3();
    const chaseStep = new THREE.Vector3();
    let animationTime = 0;
    let frame = 0;
    let visible = true;
    let documentVisible = !document.hidden;
    let disposed = false;
    let width = 1;
    let height = 1;
    let compact = false;
    let lastTime = performance.now();
    let lastShadowTime = -Infinity;
    let measuredFrames = 0;
    let measurementStartedAt = performance.now();
    let nextRenderAt = 0;
    let rendering = false;
    let interactiveUntil = 0;
    let labelsDirty = true;
    let forceDraw = true;
    let lastCameraStamp = '';
    const labelSizes = new Map<ProjectId, { width: number; height: number }>();
    let lastPositionStamp = '';
    let lastHeading = '';
    let lastLookTarget = '';
    let lastIdleStamp = '';
    let signalShown = false;
    let idleSince = 0;
    const activePointers = new Set<number>();
    let tapGesture: { pointerId: number; x: number; y: number; moved: number; multi: boolean; button: number } | null = null;
    let overlayBounds: Array<{ left: number; top: number; right: number; bottom: number }> = [];

    const setWaypoint = (id: ProjectId) => {
      targetProject = id;
      target.copy(WORLD_POINTS[id]);
      // Park beside the landmark, never between it and the camera: step to the
      // camera's left (the discovery card covers the right) and slightly past it.
      cameraForward.copy(controls.target).sub(camera.position).setY(0);
      if (cameraForward.lengthSq() < 0.001) cameraForward.set(0, 0, -1);
      cameraForward.normalize();
      cameraRight.crossVectors(cameraForward, camera.up).normalize();
      target.addScaledVector(cameraRight, -2.05).addScaledVector(cameraForward, 0.3);
      renderer.domElement.focus({ preventScroll: true });
      if (!motionRef.current) {
        current.copy(target);
        world.explorer.position.set(current.x, current.y + 1.58, current.z);
      }
      const destinationPoint = WORLD_POINTS[id];
      if (current.distanceTo(destinationPoint) < ARRIVAL_RADIUS) {
        arrivedAt = id;
        onArriveRef.current(id);
      }
      labelsDirty = true;
      wake();
    };
    navigateRef.current = setWaypoint;

    const secretPoint = WORLD_POINTS['alpha-workbench'];
    const avoidPlanet = (step?: THREE.Vector3) => {
      // Never fly through the ringed planet: motion that would enter it turns
      // into sliding around its edge, so flying straight at it still gets past.
      const dx = current.x - PLANET_POSITION.x, dz = current.z - PLANET_POSITION.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= PLANET_CLEARANCE) return;
      const nx = distance < 1e-3 ? 1 : dx / distance, nz = distance < 1e-3 ? 0 : dz / distance;
      const tx = -nz, tz = nx;
      const lean = step ? step.x * tx + step.z * tz : 0;
      const towardSecret = (secretPoint.x - PLANET_POSITION.x) * tx + (secretPoint.z - PLANET_POSITION.z) * tz;
      // Follow a deliberate sideways lean; otherwise go round toward the hidden island.
      const side = step && Math.abs(lean) > step.length() * .3 ? Math.sign(lean) : Math.sign(towardSecret) || 1;
      const blocked = PLANET_CLEARANCE - distance;
      current.x = PLANET_POSITION.x + nx * PLANET_CLEARANCE + tx * side * blocked;
      current.z = PLANET_POSITION.z + nz * PLANET_CLEARANCE + tz * side * blocked;
    };
    const clampFlight = (step?: THREE.Vector3) => {
      current.x = THREE.MathUtils.clamp(current.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
      // Past the far edge of the map, only the corridor toward the planet stays open.
      const inCorridor = current.x >= SECRET_CORRIDOR.minX && current.x <= SECRET_CORRIDOR.maxX;
      current.z = THREE.MathUtils.clamp(current.z, inCorridor ? SECRET_CORRIDOR.minZ : WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
      if (current.z < WORLD_BOUNDS.minZ) current.x = THREE.MathUtils.clamp(current.x, SECRET_CORRIDOR.minX, SECRET_CORRIDOR.maxX);
      avoidPlanet(step);
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
      const rect = { width, height };
      const scale = compact ? 0.88 : 1;
      const margin = compact ? 9 : 14;
      const bottomReserve = compact ? 26 + Math.ceil(ids.length / 3) * 30 : 12;
      const selectedDistance = targetProject ? current.distanceTo(WORLD_POINTS[targetProject]) : Infinity;
      const priorityProject = focusedProject ?? targetProject;
      const candidates = ids.map((id, index) => {
        const button = labelRefs.current.get(id);
        if (!button) return null;
        if (hiddenRef.current.includes(id)) {
          button.style.opacity = '0';
          button.style.pointerEvents = 'none';
          button.tabIndex = -1;
          button.setAttribute('aria-hidden', 'true');
          return null;
        }
        projected.copy(WORLD_POINTS[id]);
        projected.y += 2.1 + landmarks[index].lift;
        projected.project(camera);
        button.dataset.anchorX = (projected.x * .5 + .5).toFixed(4);
        button.dataset.anchorY = (-projected.y * .5 + .5).toFixed(4);
        button.dataset.anchorVisible = String(projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1);
        projected.copy(WORLD_POINTS[id]);
        projected.y += world.labelOffsets[id] + landmarks[index].lift;
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
          width: Math.max(26, labelSizes.get(id)?.width ?? 30) * scale,
          height: Math.max(26, labelSizes.get(id)?.height ?? 30) * scale,
        };
      }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

      candidates.sort((a, b) => {
        if (a.id === priorityProject) return -1;
        if (b.id === priorityProject) return 1;
        return a.depth - b.depth;
      });

      const occupied: Array<{ left: number; top: number; right: number; bottom: number }> = compact
        ? [{ left: Math.max(0, rect.width - 205), top: 74, right: rect.width, bottom: 126 }]
        : [
            { left: Math.max(0, rect.width - 260), top: Math.max(0, rect.height - 62), right: rect.width, bottom: rect.height },
          ];
      occupied.push(...overlayBounds);
      // Numbered mobile markers stay above their own island when they crowd.
      const verticalOffsets = compact ? [0, -28, 28, -56, 56, -84, 84] : [0, -36, 36, -72, 72, -108, 108];
      const horizontalOffsets = compact ? [0] : [0, 54, -54, 92, -92, 130, -130];
      candidates.forEach(({ id, button, onScreen, sourceX, sourceY, width: labelWidth, height: labelHeight }) => {
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
      });
    };

    const refreshLabelSizes = () => {
      // Read all label sizes together, outside the frame's style-write phase.
      ids.forEach(id => {
        const button = labelRefs.current.get(id);
        if (button) labelSizes.set(id, { width: button.offsetWidth, height: button.offsetHeight });
      });
      labelsDirty = true;
      wake();
    };

    let resizePending = false;
    const resize = () => {
      // Changing a WebGL drawing buffer clears it. Keep the frozen frame intact
      // during scroll locking or viewport changes, and resize when it resumes.
      if (detailProjectRef.current) { resizePending = true; return; }
      const rect = { width: host.clientWidth, height: host.clientHeight };
      if (rect.width < 2 || rect.height < 2) return;
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      compact = width < 700;
      host.dataset.compact = compact ? 'true' : 'false';
      // Preserve Retina edges on the sculptures. Soft atmosphere and shadow
      // updates have their own budgets instead of lowering the whole canvas.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (pixelRatio !== renderer.getPixelRatio()) {
        renderer.setPixelRatio(pixelRatio);
        atmosphere.setPixelRatio(pixelRatio);
      }
      travelTrail.setPixelRatio(pixelRatio);
      const hostRect = host.getBoundingClientRect();
      // Labels avoid both the introduction and the prominent navigation guide.
      const overlays = host.closest('.playground')?.querySelectorAll<HTMLElement>('.playground-intro, .playground-controls');
      overlayBounds = Array.from(overlays ?? []).flatMap(element => {
        const bounds = element.getBoundingClientRect();
        const bottom = bounds.bottom - hostRect.top;
        return bottom > 0 ? [{
          left: Math.max(0, bounds.left - hostRect.left - 12),
          top: Math.max(0, bounds.top - hostRect.top - 12),
          right: Math.min(width, bounds.right - hostRect.left + 12),
          bottom: bottom + 12,
        }] : [];
      });
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      baseFov = compact ? 54 : width / height < 1.15 ? 47 : 41;
      camera.fov = baseFov + boost * 6;
      camera.updateProjectionMatrix();
      glows.setViewport(height * pixelRatio, camera.fov);
      const previousHomeDistance = homeDistance;
      const distanceRatio = previousHomeDistance > 0 ? controls.getDistance() / previousHomeDistance : 1;
      const nextHomeTarget = compact ? new THREE.Vector3(3.0, 0.4, 2.6) : new THREE.Vector3(0.5, 0.8, 0.5);
      if (!focusedProject) {
        const shift = nextHomeTarget.clone().sub(homeTarget);
        controls.target.add(shift);
        camera.position.add(shift);
      }
      homeTarget.copy(nextHomeTarget);
      // Keep the outer islands in frame on narrow screens while preserving the
      // closer desktop view and its open space around the explorer.
      homeDistance = compact ? Math.max(33, 39 / camera.aspect) : Math.max(33, 58 / camera.aspect);
      const viewDirection = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(viewDirection, THREE.MathUtils.clamp(homeDistance * distanceRatio, controls.minDistance, controls.maxDistance));
      controls.update();
      refreshLabelSizes();
      forceDraw = true;
      wake();
    };

    const render = (now: number) => {
      frame = 0;
      if (disposed || !visible || !documentVisible || detailProjectRef.current) return;
      rendering = true;
      const interactive = keys.size > 0 || activePointers.size > 0 || target.distanceToSquared(current) > .01 || now < interactiveUntil;
      const frameInterval = interactive || hoverPending ? 1000 / 60 : 1000 / 30;
      if (!forceDraw && now + 2 < nextRenderAt) {
        rendering = false;
        scheduleFrame();
        return;
      }
      // Keep the cadence anchored when a browser frame arrives slightly late;
      // starting a fresh interval each time compounds jitter into skipped frames.
      nextRenderAt = forceDraw || nextRenderAt === 0
        ? now + frameInterval
        : nextRenderAt + Math.max(1, Math.floor((now - nextRenderAt) / frameInterval) + 1) * frameInterval;
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const forwardInput = (keys.has('arrowup') || keys.has('w') ? 1 : 0) - (keys.has('arrowdown') || keys.has('s') ? 1 : 0);
      const rightInput = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      cameraForward.copy(controls.target).sub(camera.position).setY(0);
      if (cameraForward.lengthSq() < 0.001) cameraForward.set(0, 0, -1);
      cameraForward.normalize();
      cameraRight.crossVectors(cameraForward, camera.up).normalize();
      const move = new THREE.Vector3().addScaledVector(cameraForward, forwardInput).addScaledVector(cameraRight, rightInput);
      // Shift boosts manual flight; long trips to a destination boost on their own.
      const wantsBoost = motionRef.current && (
        (keys.has('shift') && move.lengthSq() > 0)
        || (move.lengthSq() === 0 && target.distanceToSquared(current) > 25)
      );
      boost = THREE.MathUtils.damp(boost, wantsBoost ? 1 : 0, wantsBoost ? 3 : 5, dt);
      if (move.lengthSq() > 0) {
        targetProject = null;
        move.normalize().multiplyScalar(5.4 * (1 + boost * 1.4) * dt);
        current.add(move);
        clampFlight(move);
        current.y = THREE.MathUtils.damp(current.y, cruiseElevation(), 5, dt);
        target.copy(current);
        explorerTargetQuat.setFromUnitVectors(forwardAxis, move.clone().normalize());
      } else {
        const delta = target.clone().sub(current);
        if (delta.lengthSq() > 0.01) {
          const travel = motionRef.current ? Math.min(delta.length(), dt * 4.7 * (1 + boost * 1.5)) : delta.length();
          current.add(delta.normalize().multiplyScalar(travel));
          // `delta` now holds this frame's step.
          avoidPlanet(delta);
          explorerTargetQuat.setFromUnitVectors(forwardAxis, delta.clone().normalize());
        }
      }

      const animate = motionRef.current;
      arrivalReaction = animate ? Math.min(1, arrivalReaction + dt / 0.8) : 1;
      const greeting = Math.sin(arrivalReaction * Math.PI);
      journey.update(dt, animate);
      // While the explorer moves, the view leans a third of the way toward it.
      if (animate && !journey.active && (move.lengthSq() > 0 || target.distanceToSquared(current) > .01)) {
        // Beyond the map's edge the view follows much more closely, or the explorer leaves the frame.
        const beyond = THREE.MathUtils.smoothstep(WORLD_BOUNDS.minZ - current.z, 0, 10);
        chaseGoal.copy(homeTarget).lerp(current, .35 + beyond * .55);
        chaseStep.copy(chaseGoal).sub(controls.target).multiplyScalar(1 - Math.exp(-1.6 * dt));
        controls.target.add(chaseStep);
        camera.position.add(chaseStep);
      }
      const fov = baseFov + boost * 6;
      if (Math.abs(camera.fov - fov) > .01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
        glows.setViewport(height * renderer.getPixelRatio(), fov);
        labelsDirty = true;
      }
      controls.update(dt);
      camera.updateMatrixWorld();
      if (hoverPending && now - lastHoverCheck > 16) {
        hoverPending = false;
        lastHoverCheck = now;
        hoverPickableProjects.forEach(object => object.updateWorldMatrix(true, false));
        raycaster.setFromCamera(hoverPointer, camera);
        const hit = raycaster.intersectObjects(hoverPickableProjects, false)[0];
        hoveredProject = hit ? world.hoverPickers.get(hit.object) ?? null : null;
        renderer.domElement.style.cursor = hoveredProject ? 'pointer' : 'grab';
      }
      const lookAt = lookingAtRef.current ?? hoveredProject ?? focusedProject;
      if (lookAt && target.distanceToSquared(current) < 0.04 && !move.lengthSq()) {
        const targetPos = WORLD_POINTS[lookAt].clone();
        targetPos.y += 0.9;
        const dir = targetPos.sub(world.explorer.position).normalize();
        explorerTargetQuat.setFromUnitVectors(forwardAxis, dir);
      }
      world.explorer.position.set(current.x, current.y + 1.58 + (animate ? Math.sin(now * 0.003) * 0.1 + greeting * 0.24 : 0), current.z);
      // A softer turn while animating lets the bank read as a real arc.
      headingQuat.slerp(explorerTargetQuat, animate ? 1 - Math.exp(-11 * dt) : 1);
      flight.update(dt, animate, boost, headingQuat, current);
      const heading = world.explorer.rotation.y.toFixed(3);
      if (heading !== lastHeading) { host.dataset.explorerHeading = heading; lastHeading = heading; }
      const lookTarget = lookAt ?? '';
      if (lookTarget !== lastLookTarget) { host.dataset.lookTarget = lookTarget; lastLookTarget = lookTarget; }
      world.hoverLight.intensity = animate ? 2.15 + Math.sin(now * 0.007) * 0.45 + greeting * 1.3 : 2.25;
      const positionStamp = `${current.x.toFixed(2)},${current.y.toFixed(2)},${current.z.toFixed(2)}`;
      // Near the buoy, or already out in the corridor, a hidden signal is announced.
      const nearSignal = hiddenRef.current.length > 0 && (
        Math.hypot(current.x - SIGNAL_BUOY.x, current.z - SIGNAL_BUOY.z) < 8 || current.z < WORLD_BOUNDS.minZ - 1
      );
      if (nearSignal !== signalShown && signalRef.current) {
        signalShown = nearSignal;
        signalRef.current.textContent = nearSignal ? 'Faint signal detected beyond the ringed planet…' : '';
        signalRef.current.dataset.visible = String(nearSignal);
      }
      if (positionStamp !== lastPositionStamp) {
        host.dataset.explorerX = current.x.toFixed(2);
        host.dataset.explorerY = current.y.toFixed(2);
        host.dataset.explorerZ = current.z.toFixed(2);
        lastPositionStamp = positionStamp;
        labelsDirty = true;
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
        const lift = focusedProject === item.id ? .5 : 0;
        const previousLift = item.lift;
        item.lift = animate ? THREE.MathUtils.damp(item.lift, lift, 6, dt) : lift;
        item.root.position.y += item.lift;
        if (Math.abs(item.lift - previousLift) > .001) labelsDirty = true;
      });
      reactions.update(dt, animate, lookingAtRef.current ?? hoveredProject ?? focusedProject, world.explorer.position, camera.position);
      travelTrail.update(move.lengthSq() > 0 || target.distanceToSquared(current) > .01, dt, animate, boost);

      let nearest: ProjectId | null = null;
      let nearestDistance = Infinity;
      ids.forEach((id) => {
        const distance = current.distanceTo(WORLD_POINTS[id]);
        if (distance < nearestDistance) { nearest = id; nearestDistance = distance; }
      });
      // Passing an island during manual flight must not start another close-up.
      // Holding only Shift still counts as hovering; steering keys mean passing by.
      const arrivalAllowed = forwardInput === 0 && rightInput === 0 && (!targetProject || nearest === targetProject);
      if (nearest && arrivalAllowed && nearestDistance < ARRIVAL_RADIUS && arrivedAt !== nearest) {
        arrivedAt = nearest;
        onArriveRef.current(nearest);
      } else if (nearestDistance > DEPARTURE_RADIUS) {
        arrivedAt = null;
      }

      atmosphere.update(dt, animate, camera);
      const themeBlending = sceneTheme.update(dt);
      glows.update(dt, animate);
      const cameraStamp = [camera.position.x, camera.position.y, camera.position.z, controls.target.x, controls.target.y, controls.target.z].join(',');
      if (cameraStamp !== lastCameraStamp) {
        lastCameraStamp = cameraStamp;
        host.dataset.cameraAzimuth = controls.getAzimuthalAngle().toFixed(3);
        host.dataset.cameraPolar = controls.getPolarAngle().toFixed(3);
        host.dataset.cameraDistance = controls.getDistance().toFixed(2);
        labelsDirty = true;
      }
      if (labelsDirty) {
        positionLabels();
        labelsDirty = false;
      }
      // Paused motion draws through a short settling window, then releases rAF.
      let shouldDraw = true;
      if (!animate && !forceDraw) {
        const idleStamp = [
          positionStamp,
          camera.position.x.toFixed(3), camera.position.y.toFixed(3), camera.position.z.toFixed(3),
          controls.target.x.toFixed(3), controls.target.y.toFixed(3), controls.target.z.toFixed(3),
          world.explorer.quaternion.x.toFixed(3), world.explorer.quaternion.y.toFixed(3), world.explorer.quaternion.z.toFixed(3),
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
        // The light is fixed. Reuse its shadow map between 30 Hz updates while
        // the camera and explorer can render at 60 Hz; refresh immediate changes
        // in paused motion so no stale shadow survives an on-demand redraw.
        if (forceDraw || !animate || now - lastShadowTime >= 1000 / 30 - 2) {
          renderer.shadowMap.needsUpdate = true;
          lastShadowTime = now;
        }
        renderer.render(scene, camera);
        if (import.meta.env.DEV) {
          measuredFrames++;
          if (now - measurementStartedAt >= 1000) {
            host.dataset.renderFps = (measuredFrames * 1000 / (now - measurementStartedAt)).toFixed(1);
            host.dataset.renderCalls = String(renderer.info.render.calls);
            host.dataset.renderTriangles = String(renderer.info.render.triangles);
            host.dataset.renderPixelRatio = String(renderer.getPixelRatio());
            measurementStartedAt = now;
            measuredFrames = 0;
          }
        }
      }
      forceDraw = false;
      rendering = false;
      if (animate || interactive || hoverPending || themeBlending || now - idleSince < 500) scheduleFrame();
    };

    const redraw = () => {
      controls.update();
      wake();
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

    const scheduleFrame = () => {
      if (disposed || frame || !visible || !documentVisible || detailProjectRef.current) return;
      frame = requestAnimationFrame(render);
    };
    const wake = () => {
      // Keep the last sharp frame while the modal owns interaction. Reuse this
      // renderer and resume from the same camera position when it closes.
      if (detailProjectRef.current) {
        stop();
        if (import.meta.env.DEV) host.dataset.renderState = 'suspended';
        return;
      }
      if (resizePending) { resizePending = false; resize(); return; }
      if (import.meta.env.DEV) host.dataset.renderState = 'running';
      if (!frame && !rendering) {
        lastTime = performance.now();
        measurementStartedAt = lastTime;
        measuredFrames = 0;
        nextRenderAt = 0;
        forceDraw = true;
      } else {
        nextRenderAt = Math.min(nextRenderAt, lastTime + 1000 / 60);
      }
      scheduleFrame();
    };
    wakeRef.current = (force = false, labels = false) => {
      if (force) forceDraw = true;
      if (labels) labelsDirty = true;
      wake();
    };
    const start = () => { wake(); };
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
      wake();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && activePointers.size === 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        hoverPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        hoverPending = true;
        wake();
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
      wake();
      if (tapGesture?.pointerId === event.pointerId) tapGesture = null;
      if (!isTap) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const projectHits = raycaster.intersectObjects(pickableProjects, false);
      if (projectHits.length) {
        const id = world.pickers.get(projectHits[0].object);
        if (id) { setWaypoint(id); return; }
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
      wake();
    };
    const onPointerLeave = () => {
      hoveredProject = null;
      hoverPending = false;
      interactiveUntil = performance.now() + 250;
      renderer.domElement.style.cursor = 'grab';
      wake();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'shift') { keys.add(key); wake(); return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        if (key.startsWith('arrow')) event.preventDefault();
        if (focusedProject || targetProject) {
          targetProject = null;
          focusRef.current(null);
          onDepartRef.current();
          // Keep arrivedAt until we leave the island's radius, so releasing a
          // movement key beside it cannot immediately reopen the same project.
        }
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
          clampFlight(nudge);
          target.copy(current);
          target.y = cruiseElevation();
          targetProject = null;
        }
        keys.add(key);
        wake();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); wake(); };
    const onBlur = () => { keys.clear(); wake(); };
    const onWindowBlur = () => { keys.clear(); activePointers.clear(); tapGesture = null; wake(); };
    const onWheelCapture = (event: WheelEvent) => {
      // Capture runs before OrbitControls can cancel the browser's normal scroll.
      // Trackpad pinch also arrives as a Ctrl-modified wheel event.
      if (!event.ctrlKey) event.stopImmediatePropagation();
    };
    const onVisibility = () => {
      documentVisible = !document.hidden;
      if (!documentVisible) { keys.clear(); activePointers.clear(); tapGesture = null; }
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
    const labelResizeObserver = new ResizeObserver(refreshLabelSizes);
    labelRefs.current.forEach(button => labelResizeObserver.observe(button));
    document.fonts?.ready.then(() => { if (!disposed) refreshLabelSizes(); });
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
      wakeRef.current = () => undefined;
      applyThemeRef.current = () => undefined;
      controls.removeEventListener('start', interruptJourney);
      controls.removeEventListener('change', continueInteraction);
      controls.removeEventListener('end', finishInteraction);
      controls.dispose();
      resizeObserver.disconnect();
      labelResizeObserver.disconnect();
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
      atmosphere.dispose();
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
          outline: none !important;
        }
        .world-camera-toolbar {
          position: absolute;
          z-index: 7;
          right: 18px;
          bottom: 16px;
          display: flex;
          gap: 5px;
          padding: 5px;
          border-radius: 999px;
          background: rgba(7,14,16,.94);
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
        }
        .world-camera-toolbar button {
          min-width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border: 0;
          border-radius: 999px;
          color: #edf2e8;
          background: rgba(255,255,255,.035);
          font: 600 10px/1 "IBM Plex Mono", monospace;
          cursor: pointer;
        }
        .world-camera-toolbar button:hover { background: rgba(217,249,145,.1); }
        .world-camera-toolbar button:focus-visible { outline: 1px solid var(--obs-accent); outline-offset: 2px; }
        .world-project-label:hover,
        .world-project-label:focus-visible {
          background: rgba(20,31,32,.96) !important;
        }
        /* Absolutely placed so the pill keeps its measured size for label layout. */
        .world-project-tagline {
          position: absolute;
          top: calc(100% + 5px);
          left: 50%;
          padding: 4px 8px;
          border-radius: 6px;
          color: rgba(237,242,232,.82);
          background: rgba(7,14,16,.9);
          font: 500 11px/1.2 "Space Grotesk", sans-serif;
          letter-spacing: 0;
          opacity: 0;
          transform: translate(-50%, -3px);
          transition: opacity 160ms ease, transform 160ms ease;
          pointer-events: none;
        }
        .world-project-label:hover .world-project-tagline,
        .world-project-label:focus-visible .world-project-tagline {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        .world-destination-legend { display: none; }
        .world-project-lock { flex: 0 0 auto; color: #e9c77a; }
        .world-signal {
          position: absolute;
          z-index: 6;
          left: 50%;
          bottom: 92px;
          margin: 0;
          padding: 7px 12px;
          border-radius: 999px;
          color: #ffb38f;
          background: rgba(7,14,16,.9);
          font: 600 10px/1 "IBM Plex Mono", monospace;
          letter-spacing: .08em;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: 0;
          transform: translate(-50%, 6px);
          transition: opacity 400ms ease, transform 400ms ease;
          pointer-events: none;
        }
        .world-signal[data-visible="true"] { opacity: 1; transform: translate(-50%, 0); }
        @media (max-width: 700px) {
          .world-camera-toolbar {
            top: 80px;
            right: 10px;
            bottom: auto;
            gap: 3px;
            padding: 4px;
          }
          .world-camera-toolbar button { min-width: 28px; height: 28px; padding: 0 6px; font-size: 9px; }
          .world-camera-toolbar .world-reset-label { display: none; }
          .world-project-label {
            min-width: 26px !important;
            min-height: 26px !important;
            padding: 4px !important;
            background: rgba(7,14,16,.72) !important;
          }
          .world-project-label .world-project-name,
          .world-project-label .world-project-tagline { display: none; }
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
            border: 0;
            border-radius: 4px;
            color: rgba(237,242,232,.88);
            background: rgba(7,14,16,.94);
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
      {ids.map((id, index) => (
        <ProjectButton
          key={id}
          id={id}
          index={index}
          buttonRef={(element) => { if (element) labelRefs.current.set(id, element); else labelRefs.current.delete(id); }}
          onLook={id => { lookingAtRef.current = id; wakeRef.current(false, true); }}
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
      <p ref={signalRef} className="world-signal" role="status" aria-live="polite" data-visible="false" />
      <nav className="world-destination-legend" aria-label="World destinations">
        {ids.filter(id => !hiddenProjects.includes(id)).map(id => (
          <button key={id} type="button" onClick={() => navigateRef.current(id)} aria-label={`Navigate to ${projects[id].name}`}>
            <b aria-hidden="true">{String(ids.indexOf(id) + 1).padStart(2, '0')}</b>
            <span>{shortNames[id]}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
