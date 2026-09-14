import * as THREE from 'three';
import type { ProjectId } from './curiosity';

/** Local expressions compose with the scene's existing bob and focus lift. */
export function createLandmarkReactions(world: THREE.Group) {
  const gem = world.getObjectByName('landmark-gem-dota')!;
  const gemMesh = world.getObjectByName('gem-dota-gem') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  const gemCore = world.getObjectByName('gem-inner-light')!;
  const sparkles = world.getObjectByName('gem-sparkles')!;
  const wisp = world.getObjectByName('landmark-wisp')!;
  const spirit = world.getObjectByName('wisp-spirit')!;
  const vapor = world.getObjectByName('wisp-vapor')!;
  const wispTail = world.getObjectByName('wisp-tail')!;
  const wispLight = world.getObjectByName('wisp-light') as THREE.PointLight;
  const krill = world.getObjectByName('landmark-krill')!;
  const antennae = world.getObjectByName('krill-antennae')!;
  const tail = world.getObjectByName('krill-tail-fan')!;
  const bots = [0, 1, 2].map(index => ({
    root: world.getObjectByName(`nimble-agent-${index}`)!,
    light: world.getObjectByName(`nimble-antenna-${index}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  }));
  const handoff = world.getObjectByName('nimble-handoff')!;
  const anatomyLayers = [0, 1, 2].map(index => {
    const root = world.getObjectByName(`anatomy-layer-${index}`)!;
    return { root, rest: root.position.clone() };
  });
  const anatomyCore = world.getObjectByName('anatomy-core') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const rocket = world.getObjectByName('shipping-rocket')!;
  const rocketRest = rocket.position.clone();
  const rocketTilt = rocket.rotation.z;
  const exhaust = world.getObjectByName('shipping-exhaust') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const quarters = [0, 1, 2, 3].map(index => {
    const root = world.getObjectByName(`bonds-quarter-${index}`)!;
    return { root, rest: root.position.clone(), angle: Math.PI / 4 + index * Math.PI / 2 };
  });
  const attention = { 'gem-dota': 0, wisp: 0, krill: 0 };
  const reactionAge = { 'gem-dota': 2, wisp: 2, krill: 2 };
  const sceneAge = { nimble: 3, 'shipping-ml': 3, 'fractional-bonds': 3, 'claude-code-anatomy': 3 };
  let previous: ProjectId | null = null;
  let time = 0;
  const toward = new THREE.Vector3();
  const signalStart = new THREE.Vector3();
  const signalEnd = new THREE.Vector3();
  const pulse = (age: number) => age < 1.1 ? Math.sin(Math.PI * age / 1.1) : 0;
  const trigger = (id: ProjectId) => {
    if (id in reactionAge) reactionAge[id as keyof typeof reactionAge] = 0;
    if (id in sceneAge) sceneAge[id as keyof typeof sceneAge] = 0;
  };

  return {
    arrive: trigger,
    update(dt: number, motion: boolean, active: ProjectId | null, explorer: THREE.Vector3, camera: THREE.Vector3) {
      if (active !== previous && active) trigger(active);
      previous = active;
      if (motion) time += dt;
      (Object.keys(attention) as Array<keyof typeof attention>).forEach(id => {
        attention[id] = motion ? THREE.MathUtils.damp(attention[id], active === id ? 1 : 0, 5, dt) : 0;
        reactionAge[id] = motion ? Math.min(2, reactionAge[id] + dt) : 2;
      });

      const glint = pulse(reactionAge['gem-dota']);
      if (motion) {
        gem.rotation.y += dt * .13 * (1 - attention['gem-dota']);
        const aim = Math.atan2(camera.x - gem.position.x, camera.z - gem.position.z);
        const turn = Math.atan2(Math.sin(aim - gem.rotation.y), Math.cos(aim - gem.rotation.y));
        gem.rotation.y += turn * attention['gem-dota'] * (1 - Math.exp(-dt * 2.5));
      }
      gemMesh.material.emissiveIntensity = .08 + attention['gem-dota'] * .06 + glint * .12;
      gemCore.scale.setScalar(1 + glint * .32);
      sparkles.scale.setScalar(1 + glint * .14);

      toward.copy(explorer).sub(wisp.position).setY(0).normalize();
      spirit.position.copy(toward).multiplyScalar(.38 * attention.wisp);
      spirit.rotation.z = motion ? -.07 * attention.wisp + Math.sin(time * 1.4) * .025 : 0;
      wispTail.rotation.z = motion ? Math.sin(time * 1.8) * .07 : 0;
      wispLight.intensity = 3.2 + attention.wisp * .8 + pulse(reactionAge.wisp) * .6;
      vapor.children.forEach(mote => {
        const age = (mote.userData.phase + time * .22) % 1;
        const curl = age * 6 - time * 1.3;
        mote.position.set(Math.sin(curl) * age * .3, 1.92 - age * 1.75, Math.cos(curl) * age * .15);
        mote.scale.setScalar(.035 + Math.sin(Math.PI * age) * .12);
      });

      const flick = pulse(reactionAge.krill);
      tail.rotation.z = motion ? Math.sin(reactionAge.krill * 8) * flick * .5 : 0;
      tail.rotation.y = motion ? Math.sin(reactionAge.krill * 5) * flick * .22 : 0;
      antennae.rotation.z = motion ? Math.sin(time * 2.1) * .025 + Math.sin(reactionAge.krill * 15) * flick * .095 : 0;
      antennae.rotation.y = motion ? Math.sin(time * 1.3) * .04 + attention.krill * .08 : 0;
      krill.rotation.z = motion ? flick * .055 : 0;

      (Object.keys(sceneAge) as Array<keyof typeof sceneAge>).forEach(id => {
        sceneAge[id] = motion ? Math.min(3, sceneAge[id] + dt) : 3;
      });

      // Open the terminal to reveal its layers, then settle after one inspection.
      const anatomyAge = sceneAge['claude-code-anatomy'];
      const inspection = THREE.MathUtils.smoothstep(anatomyAge, 0, .65) * (1 - THREE.MathUtils.smoothstep(anatomyAge, 1.7, 2.8));
      anatomyLayers.forEach(({ root, rest }, index) => {
        root.position.copy(rest);
        root.position.z += (index - 1) * inspection * .55;
        root.position.x += (index - 1) * inspection * .24;
        root.position.y += index * inspection * .16;
      });
      anatomyCore.material.emissiveIntensity = 1.1 + inspection * .7;

      // One short handoff around the team; it settles even if the pointer stays put.
      const handoffAge = sceneAge.nimble;
      handoff.visible = motion && handoffAge < 2.7;
      const leg = Math.min(2, Math.floor(handoffAge / 0.9));
      const phase = Math.min(1, (handoffAge - leg * 0.9) / 0.9);
      const nextBot = (leg + 1) % bots.length;
      signalStart.copy(bots[leg].root.position);
      signalEnd.copy(bots[nextBot].root.position);
      signalStart.y += 1.93;
      signalEnd.y += 1.93;
      handoff.position.lerpVectors(signalStart, signalEnd, THREE.MathUtils.smoothstep(phase, 0, 1));
      handoff.position.y += Math.sin(phase * Math.PI) * 0.43;
      handoff.scale.setScalar(THREE.MathUtils.clamp(Math.min(handoffAge / 0.12, (2.7 - handoffAge) / 0.12), 0, 1));
      bots.forEach((bot, index) => {
        const receiving = handoff.visible && index === nextBot ? Math.sin(phase * Math.PI) : 0;
        bot.root.rotation.z = receiving * (index === 2 ? -0.12 : 0.12);
        bot.light.material.emissiveIntensity = 1 + receiving * 3.5;
      });

      // Ignite, lift, hover briefly, and settle back onto the same island.
      const launchAge = sceneAge['shipping-ml'];
      const lift = THREE.MathUtils.smoothstep(launchAge, 0.25, 0.95) * (1 - THREE.MathUtils.smoothstep(launchAge, 1.45, 2.6));
      const burn = THREE.MathUtils.smoothstep(launchAge, 0, 0.2) * (1 - THREE.MathUtils.smoothstep(launchAge, 2.35, 2.75));
      rocket.position.copy(rocketRest);
      rocket.position.y += lift * 0.95;
      rocket.rotation.z = rocketTilt * (1 - lift * 0.65);
      exhaust.visible = motion && burn > 0.01;
      exhaust.scale.set(0.7 + burn * 0.3, burn * (0.85 + Math.sin(time * 28) * 0.12), 0.7 + burn * 0.3);
      exhaust.material.emissiveIntensity = 1.2 + burn * 2.2;

      // A complete coin becomes four pieces, then assembles itself again.
      const bondAge = sceneAge['fractional-bonds'];
      const split = THREE.MathUtils.smoothstep(bondAge, 0, 0.7) * (1 - THREE.MathUtils.smoothstep(bondAge, 1.3, 2.6));
      quarters.forEach(({ root, rest, angle }, index) => {
        root.position.copy(rest).addScaledVector(toward.set(Math.cos(angle), Math.sin(angle), 0), split * 0.48);
        root.position.z += split * (index % 2 ? 0.16 : -0.08);
        root.rotation.z = split * (index % 2 ? 0.09 : -0.09);
      });
    },
  };
}
