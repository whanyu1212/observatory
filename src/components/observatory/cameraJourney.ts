import { MathUtils, Spherical, Vector3 } from 'three';

type Pose = { position: Vector3; target: Vector3 };

/** Owns temporary framing; the original pose survives a change of destination. */
export function createCameraJourney(position: Vector3, target: Vector3) {
  let saved: Pose | null = null;
  let transition: { from: Pose; to: Pose; elapsed: number; restoring: boolean } | null = null;
  const pose = (): Pose => ({ position: position.clone(), target: target.clone() });
  const fromOrbit = new Spherical();
  const toOrbit = new Spherical();
  const orbit = new Spherical();
  const offset = new Vector3();

  return {
    focus(point: Vector3, distance: number) {
      saved ??= pose();
      const direction = position.clone().sub(target).normalize();
      transition = {
        from: pose(),
        to: { position: point.clone().addScaledVector(direction, distance), target: point.clone() },
        elapsed: 0, restoring: false,
      };
    },
    restore() {
      if (saved) transition = { from: pose(), to: saved, elapsed: 0, restoring: true };
    },
    interrupt() {
      // A deliberate gesture supersedes an in-progress return journey.
      if (transition?.restoring) saved = null;
      transition = null;
    },
    discard() { transition = null; saved = null; },
    /** True while a focus or restore transition owns the camera. */
    get active() { return transition !== null; },
    update(dt: number, motion: boolean) {
      if (!transition) return;
      transition.elapsed += dt;
      const progress = motion ? Math.min(1, transition.elapsed / 0.9) : 1;
      const eased = progress * progress * (3 - 2 * progress);
      if (progress === 1) {
        position.copy(transition.to.position);
        target.copy(transition.to.target);
        if (transition.restoring) saved = null;
        transition = null;
        return;
      }
      fromOrbit.setFromVector3(offset.copy(transition.from.position).sub(transition.from.target));
      toOrbit.setFromVector3(offset.copy(transition.to.position).sub(transition.to.target));
      const turn = Math.atan2(Math.sin(toOrbit.theta - fromOrbit.theta), Math.cos(toOrbit.theta - fromOrbit.theta));
      orbit.set(MathUtils.lerp(fromOrbit.radius, toOrbit.radius, eased), MathUtils.lerp(fromOrbit.phi, toOrbit.phi, eased), fromOrbit.theta + turn * eased);
      target.lerpVectors(transition.from.target, transition.to.target, eased);
      position.copy(target).add(offset.setFromSpherical(orbit));
    },
  };
}
