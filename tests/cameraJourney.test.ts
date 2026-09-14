import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { createCameraJourney } from '../src/components/observatory/cameraJourney.ts';

const setup = () => {
  const position = new Vector3(17, 23, 21);
  const target = new Vector3(0, 0.8, 0);
  return { position, target, initial: position.clone(), initialTarget: target.clone(), journey: createCameraJourney(position, target) };
};
const finish = (journey: ReturnType<typeof createCameraJourney>) => { for (let i = 0; i < 60; i++) journey.update(1 / 60, true); };

test('closing a project restores the exact original orbit after visiting multiple projects', () => {
  const { position, target, initial, initialTarget, journey } = setup();
  journey.focus(new Vector3(-8, 2.1, 4), 20);
  finish(journey);
  assert.ok(Math.abs(position.distanceTo(target) - 20) < 1e-9);
  journey.focus(new Vector3(7, 2.1, -5), 15);
  finish(journey);
  journey.restore();
  finish(journey);
  assert.deepEqual(position, initial);
  assert.deepEqual(target, initialTarget);
});

test('disabling motion completes focus and restoration immediately', () => {
  const { position, target, initial, initialTarget, journey } = setup();
  const destination = new Vector3(8, 2, -4);
  journey.focus(destination, 15);
  journey.update(0, false);
  assert.deepEqual(target, destination);
  assert.ok(Math.abs(position.distanceTo(target) - 15) < 1e-9);
  journey.restore();
  journey.update(0, false);
  assert.deepEqual(position, initial);
  assert.deepEqual(target, initialTarget);
});

test('manual input interrupts focus without losing the return viewpoint', () => {
  const { position, target, initial, initialTarget, journey } = setup();
  journey.focus(new Vector3(8, 2, -4), 15);
  journey.update(.2, true);
  journey.interrupt();
  position.set(-20, 15, 10);
  finish(journey);
  assert.deepEqual(position, new Vector3(-20, 15, 10));
  journey.restore();
  finish(journey);
  assert.deepEqual(position, initial);
  assert.deepEqual(target, initialTarget);
});

test('a new visit during restoration still returns to the original view', () => {
  const { position, initial, journey } = setup();
  journey.focus(new Vector3(8, 2, -4), 15);
  finish(journey);
  journey.restore();
  journey.update(.3, true);
  journey.focus(new Vector3(-7, 2, 5), 18);
  finish(journey);
  journey.restore();
  finish(journey);
  assert.deepEqual(position, initial);
});

test('camera interpolation maintains safe orbit radius across manual rotation', () => {
  const { position, target, journey } = setup();
  journey.focus(new Vector3(8, 2, -4), 15);
  finish(journey);
  position.copy(target).add(new Vector3(-1, 1, -1).normalize().multiplyScalar(15));
  journey.restore();
  for (let i = 0; i < 60; i++) {
    journey.update(1 / 60, true);
    assert.ok(position.distanceTo(target) >= 15 - 1e-9);
  }
});

test('reset discards the old saved viewpoint', () => {
  const { position, journey } = setup();
  journey.focus(new Vector3(8, 2, -4), 15);
  finish(journey);
  journey.discard();
  position.set(10, 20, 30);
  journey.restore();
  finish(journey);
  assert.deepEqual(position, new Vector3(10, 20, 30));
});
