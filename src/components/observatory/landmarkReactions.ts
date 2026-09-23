import * as THREE from 'three';
import type { ProjectId } from './curiosity';
import { SHIPPING_BELT, SHIPPING_GATES } from './worldGeometry';

/** Local expressions compose with the scene's existing bob and focus lift. */
export function createLandmarkReactions(world: THREE.Group) {
  const gemRoot = world.getObjectByName('landmark-gem-dota')!;
  const gem = world.getObjectByName('gem-dota-rig')!;
  const gemPath = world.getObjectByName('gem-dota-path') as THREE.Mesh;
  const gemHero = world.getObjectByName('gem-dota-hero')!;
  const pathCurve = gemPath.userData.curve as THREE.Curve<THREE.Vector3>;
  const pathStride = gemPath.userData.stride as number;
  const pathSteps = gemPath.geometry.index!.count / pathStride;
  const gemMesh = world.getObjectByName('gem-dota-gem') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  const gemCore = world.getObjectByName('gem-inner-light')!;
  const sparkles = world.getObjectByName('gem-sparkles')!;
  const wisp = world.getObjectByName('landmark-wisp')!;
  const spirit = world.getObjectByName('wisp-spirit')!;
  const vapor = world.getObjectByName('wisp-vapor')!;
  const wispTail = world.getObjectByName('wisp-tail')!;
  const wispLight = world.getObjectByName('wisp-light') as THREE.PointLight;
  const transcript = world.getObjectByName('wisp-transcript-lines') as THREE.InstancedMesh;
  const lineWidths = transcript.userData.widths as number[];
  const approval = world.getObjectByName('wisp-approval')!;
  const typing = [0, 1, 2].map(index => world.getObjectByName(`krill-typing-${index}`)!);
  const roles = ['research', 'risk', 'execution'] as const;
  const alphaArms = roles.map(role => {
    const shoulder = world.getObjectByName(`alpha-shoulder-${role}`)!;
    const elbow = world.getObjectByName(`alpha-elbow-${role}`)!;
    return { role, shoulder, elbow, shoulderRest: shoulder.rotation.x, elbowRest: elbow.rotation.x };
  });
  const alphaSignal = world.getObjectByName('alpha-signal')!;
  const alphaStops = alphaSignal.userData.stations as THREE.Vector3[];
  const alphaCurve = world.getObjectByName('alpha-curve') as THREE.Mesh;
  const alphaCurveStride = alphaCurve.userData.stride as number;
  const alphaCurveSteps = alphaCurve.geometry.index!.count / alphaCurveStride;
  const alphaGlyph = world.getObjectByName('alpha-glyph')!;
  const alphaGlyphScale = alphaGlyph.scale.x;
  const alphaTop = alphaGlyph.position.clone().add(new THREE.Vector3(-0.1, -0.2, 0));
  const riskNeedle = world.getObjectByName('alpha-risk-needle')!;
  const shippingIntake = world.getObjectByName('shipping-intake') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const candles = [0, 1, 2, 3].map(index => ({
    body: world.getObjectByName(`quant-candle-${index}`)!,
    wick: world.getObjectByName(`quant-wick-${index}`)!,
  }));
  const cushions = [0, 1].map(index => {
    const cushion = world.getObjectByName(`opencouch-cushion-${index}`)!;
    return { cushion, restY: cushion.scale.y };
  });
  const lampShade = world.getObjectByName('opencouch-shade') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const lampBulb = world.getObjectByName('opencouch-lamp')!;
  const krillBubble = world.getObjectByName('krill-chat')!;
  const kettlebell = world.getObjectByName('mental-gym-kettlebell')!;
  const kettlebellRestY = kettlebell.position.y;
  const reps = [0, 1, 2].map(index =>
    world.getObjectByName(`mental-gym-rep-${index}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  );
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
  const anatomyLeaders = [0, 1].map(index => world.getObjectByName(`anatomy-leader-${index}`)!);
  const anatomyCore = world.getObjectByName('anatomy-core') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const shippingModel = world.getObjectByName('shipping-model')!;
  const shippingLights = [0, 1, 2].map(index =>
    world.getObjectByName(`shipping-status-${index}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  );
  const quarters = [0, 1, 2, 3].map(index => {
    const root = world.getObjectByName(`bonds-quarter-${index}`)!;
    return { root, rest: root.position.clone(), angle: Math.PI / 4 + index * Math.PI / 2 };
  });
  const attention = { 'gem-dota': 0, wisp: 0, krill: 0, 'claude-code-anatomy': 0 };
  const reactionAge = { 'gem-dota': 2, wisp: 2, krill: 2, 'claude-code-anatomy': 2 };
  const sceneAge = { 'fractional-bonds': 3, 'claude-code-anatomy': 3, 'mental-gym': 3 };
  // Seconds since the explorer last arrived at each island: its signature moment.
  const arrival: Partial<Record<ProjectId, number>> = {};
  const since = (id: ProjectId) => arrival[id] ?? Infinity;
  let previous: ProjectId | null = null;
  let time = 0;
  const toward = new THREE.Vector3();
  const signalStart = new THREE.Vector3();
  const signalEnd = new THREE.Vector3();
  const lineMatrix = new THREE.Matrix4();
  const linePosition = new THREE.Vector3();
  const lineScale = new THREE.Vector3();
  const identity = new THREE.Quaternion();
  const pulse = (age: number) => age < 1.1 ? Math.sin(Math.PI * age / 1.1) : 0;
  const trigger = (id: ProjectId) => {
    if (id in reactionAge) reactionAge[id as keyof typeof reactionAge] = 0;
    if (id in sceneAge) sceneAge[id as keyof typeof sceneAge] = 0;
  };

  return {
    arrive(id: ProjectId) {
      trigger(id);
      arrival[id] = 0;
    },
    update(dt: number, motion: boolean, active: ProjectId | null, explorer: THREE.Vector3, camera: THREE.Vector3) {
      (Object.keys(arrival) as ProjectId[]).forEach(id => { arrival[id] = motion ? arrival[id]! + dt : Infinity; });
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
        const aim = Math.atan2(camera.x - gemRoot.position.x, camera.z - gemRoot.position.z);
        const turn = Math.atan2(Math.sin(aim - gem.rotation.y), Math.cos(aim - gem.rotation.y));
        gem.rotation.y += turn * attention['gem-dota'] * (1 - Math.exp(-dt * 2.5));
      }
      gemMesh.material.emissiveIntensity = .08 + attention['gem-dota'] * .06 + glint * .12;
      gemCore.scale.setScalar(1 + glint * .32);
      sparkles.scale.setScalar(1 + glint * .14);
      // The replay traces a hero's path across the minimap, holds, then redraws.
      // On arrival the replay runs the hero's whole path at speed, then resumes its pace.
      const replay = since('gem-dota') < 1.3;
      const trace = !motion ? 1 : replay ? since('gem-dota') / 1.3 : Math.min(1, (time * .17) % 1.3);
      gemPath.geometry.setDrawRange(0, Math.max(1, Math.round(pathSteps * trace)) * pathStride);
      pathCurve.getPointAt(trace, gemHero.position);
      gemHero.position.y += .02;

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
      // Transcript lines scroll up like a terminal and fade at the pane's edges.
      const scroll = motion ? time * .16 : 0;
      lineWidths.forEach((width, index) => {
        const slot = ((index + .5) / lineWidths.length + scroll) % 1;
        const fade = THREE.MathUtils.clamp(Math.min(slot, 1 - slot) / .1, 0, 1);
        linePosition.set(-.36 + width / 2, -.4 + slot * .76, .01);
        lineScale.set(width, fade, 1);
        transcript.setMatrixAt(index, lineMatrix.compose(linePosition, identity, lineScale));
      });
      transcript.instanceMatrix.needsUpdate = true;
      approval.scale.setScalar(1 + pulse(reactionAge.wisp) * .7);

      const flick = pulse(reactionAge.krill);
      tail.rotation.z = motion ? Math.sin(reactionAge.krill * 8) * flick * .5 : 0;
      tail.rotation.y = motion ? Math.sin(reactionAge.krill * 5) * flick * .22 : 0;
      antennae.rotation.z = motion ? Math.sin(time * 2.1) * .025 + Math.sin(reactionAge.krill * 15) * flick * .095 : 0;
      antennae.rotation.y = motion ? Math.sin(time * 1.3) * .04 + attention.krill * .08 : 0;
      krill.rotation.z = motion ? flick * .055 : 0;
      typing.forEach((dot, index) => {
        dot.position.y = motion ? Math.max(0, Math.sin(time * 5 - index * .9)) * .07 : 0;
      });

      (Object.keys(sceneAge) as Array<keyof typeof sceneAge>).forEach(id => {
        sceneAge[id] = motion ? Math.min(3, sceneAge[id] + dt) : 3;
      });

      // The diagram opens further while it is inspected, then closes again.
      const anatomyAge = sceneAge['claude-code-anatomy'];
      const inspection = THREE.MathUtils.smoothstep(anatomyAge, 0, .65) * (1 - THREE.MathUtils.smoothstep(anatomyAge, 1.7, 2.8));
      const open = Math.max(inspection, attention['claude-code-anatomy']);
      anatomyLayers.forEach(({ root, rest }, index) => {
        root.position.copy(rest);
        root.position.y += (index - 1) * open * .3;
        root.position.x += (index - 1) * open * .1;
      });
      anatomyLeaders.forEach((leader, index) => {
        const lower = anatomyLayers[index].root.position;
        const upper = anatomyLayers[index + 1].root.position;
        leader.position.set((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, 0);
        leader.scale.y = Math.max(.01, upper.y - lower.y - .5);
      });
      if (motion) anatomyCore.rotation.z += dt * (.6 + open * 1.6);
      anatomyCore.material.emissiveIntensity = 1.2 + open * .8;

      // A task is relayed around the team continuously: the multi-agent handoff.
      const relay = motion ? time % 3.6 : 0;
      handoff.visible = motion;
      const leg = Math.min(2, Math.floor(relay / 1.2));
      const phase = Math.min(1, (relay - leg * 1.2) / 1.2);
      const nextBot = (leg + 1) % bots.length;
      signalStart.copy(bots[leg].root.position);
      signalEnd.copy(bots[nextBot].root.position);
      signalStart.y += 1.93;
      signalEnd.y += 1.93;
      handoff.position.lerpVectors(signalStart, signalEnd, THREE.MathUtils.smoothstep(phase, 0, 1));
      handoff.position.y += Math.sin(phase * Math.PI) * 0.43;
      bots.forEach((bot, index) => {
        // Arrival: the three agents hop in turn, a quick roll call.
        const hop = since('nimble') - index * .16;
        if (hop > 0 && hop < .45) bot.root.position.y += Math.sin(Math.PI * hop / .45) * .32;
        const receiving = handoff.visible && index === nextBot ? Math.sin(phase * Math.PI) : 0;
        bot.root.rotation.z = receiving * (index === 2 ? -0.12 : 0.12);
        bot.light.material.emissiveIntensity = 1 + receiving * 3.5;
      });

      // One delivery: the crate leaves the notebook, clears validate, track and
      // serve, then slides into the rack. Paused motion shows it mid-pipeline.
      // On arrival one box ships at speed and the rack flashes as it goes live.
      const deploying = since('shipping-ml') < 2.2;
      const delivery = !motion ? .6 : deploying ? since('shipping-ml') / 2.2 : (time * .2) % 1;
      const live = deploying ? Math.exp(-(((since('shipping-ml') - 2.0) / .18) ** 2)) : 0;
      shippingIntake.material.emissiveIntensity = .25 + live * 3.5;
      const travel = THREE.MathUtils.smoothstep(delivery, .06, .74);
      const enter = THREE.MathUtils.smoothstep(delivery, .74, .9);
      const flow = Math.sign(SHIPPING_BELT.end - SHIPPING_BELT.start);
      shippingModel.position.x = THREE.MathUtils.lerp(SHIPPING_BELT.start, SHIPPING_BELT.end, travel) + enter * .4 * flow;
      shippingModel.scale.setScalar(Math.max(.001, Math.min(THREE.MathUtils.smoothstep(delivery, 0, .06), 1 - enter)));
      shippingLights.forEach((light, index) => {
        const offset = (shippingModel.position.x - SHIPPING_GATES[index]) * flow / .12;
        light.material.emissiveIntensity = .3 + Math.exp(-offset * offset) * 2.4 + (offset > 0 ? .8 : 0) + live * 2;
      });

      // Two quick reps on arrival; otherwise the kettlebell rests on the mat.
      const liftAge = sceneAge['mental-gym'];
      const rep = liftAge < 1.6 ? Math.sin(Math.PI * (liftAge % .8) / .8) : 0;
      kettlebell.position.y = kettlebellRestY + rep * .38;
      kettlebell.rotation.x = rep * .12;
      // Rep lights come on at widening intervals (0s, 1s, 3s), then reset.
      const practice = motion ? time % 5 : 4;
      reps.forEach((light, index) => {
        light.material.emissiveIntensity = practice >= [0, 1, 3][index] ? 1.4 : .15;
      });

      // Alpha Workbench runs a six-second desk cycle: research, risk, execution,
      // then the signal reaches the curve's end and the alpha glyph pulses.
      const desk = motion ? time % 6 : 5.9;
      alphaArms.forEach(({ role, shoulder, elbow, shoulderRest, elbowRest }, index) => {
        const local = desk - index * 1.5;
        const effort = local > 0 && local < 1.5 ? Math.sin(Math.PI * local / 1.5) : 0;
        shoulder.rotation.x = shoulderRest + effort * (role === 'execution' ? .35 : .15);
        elbow.rotation.x = elbowRest + effort * (role === 'execution' ? .3 : -.1);
        shoulder.rotation.z = role === 'research' ? Math.sin(time * 4) * .18 * effort : 0;
      });
      const hop = Math.min(3, Math.floor(desk / 1.5));
      const hopPhase = THREE.MathUtils.smoothstep(desk - hop * 1.5, 0, 1.5);
      const from = alphaStops[Math.min(hop, 2)];
      const to = hop < 2 ? alphaStops[hop + 1] : alphaTop;
      alphaSignal.position.lerpVectors(from, to, hop < 3 ? hopPhase : 1);
      alphaSignal.position.y += Math.sin(Math.PI * hopPhase) * (hop < 3 ? .3 : 0);
      alphaSignal.visible = motion && hop < 3;
      const rising = motion ? Math.min(1, desk / 4.5) : 1;
      alphaCurve.geometry.setDrawRange(0, Math.max(1, Math.round(alphaCurveSteps * rising)) * alphaCurveStride);
      const payoff = Math.max(desk > 4.5 ? Math.sin(Math.PI * (desk - 4.5) / 1.5) : 0, pulse(since('alpha-workbench')) * 1.3);
      alphaGlyph.scale.setScalar(alphaGlyphScale * (1 + payoff * .28));
      alphaGlyph.rotation.y = motion ? Math.sin(time * .6) * .45 : 0;
      riskNeedle.rotation.z = motion ? Math.sin(time * 1.3) * .5 + Math.sin(time * 7) * .15 * (hop === 1 ? 1 : 0) : .4;

      // QuantRL: the candles regrow one by one, as if the market just opened.
      candles.forEach(({ body, wick }, index) => {
        const grow = THREE.MathUtils.smoothstep(since('quantrl') - index * .14, 0, .5);
        const scale = since('quantrl') < 1.5 ? .08 + grow * .92 : 1;
        body.scale.y = body.userData.height * scale;
        wick.scale.y = wick.userData.height * scale;
      });
      // OpenCouch: the lamp warms up and the cushions settle, inviting you to sit.
      const warmth = pulse(since('opencouch') * .6);
      lampShade.material.emissiveIntensity = .55 + warmth * 1.4;
      lampBulb.scale.setScalar(1 + warmth * .5);
      cushions.forEach(({ cushion, restY }, index) => {
        cushion.scale.y = restY * (1 + pulse(Math.max(0, since('opencouch') - index * .18)) * .28);
      });
      // Krill: the chat bubble pops in with a little overshoot, like a new message.
      const message = since('krill');
      krillBubble.scale.setScalar(message < .6 ? .3 + .7 * (1 + 2.2 * (message / .6 - 1) ** 3 + 1.2 * (message / .6 - 1) ** 2) : 1);

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
