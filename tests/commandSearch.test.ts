import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreCommand, searchCommands } from '../src/components/observatory/commandSearch.ts';

const entries = [
  { label: 'Fly to Gem Dota', keywords: ['python', 'replays'] },
  { label: 'Fly to QuantRL-Lab', keywords: ['reinforcement learning', 'trading'] },
  { label: 'Fly to Wisp', keywords: ['coding agent'] },
  { label: 'Take the tour' },
  { label: 'Theme: Signal' },
];

test('an empty query keeps every entry in its original order', () => {
  assert.deepEqual(searchCommands('  ', entries), entries);
});

test('a word at the start of the label beats one inside it', () => {
  const results = searchCommands('t', [{ label: 'Pause motion' }, { label: 'Take the tour' }, { label: 'Fly to Wisp' }]);
  assert.equal(results[0].label, 'Take the tour');
});

test('scattered letters find a project by its initials', () => {
  assert.deepEqual(searchCommands('qrl', entries).map(entry => entry.label), ['Fly to QuantRL-Lab']);
});

test('keywords match without appearing in the label', () => {
  assert.deepEqual(searchCommands('trading', entries).map(entry => entry.label), ['Fly to QuantRL-Lab']);
});

test('every word of the query must match', () => {
  assert.deepEqual(searchCommands('fly wisp', entries).map(entry => entry.label), ['Fly to Wisp']);
  assert.equal(scoreCommand('fly zebra', entries[2]), 0);
});

test('matching ignores case and accents', () => {
  assert.ok(scoreCommand('THÈME', entries[4]) > 0);
});
