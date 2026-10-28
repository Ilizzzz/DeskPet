import { describe, expect, it } from 'vitest';
import { resolvePetState } from './pet-state-machine';

const empty = {
  dragging: false,
  levelUp: false,
  interacting: false,
  focus: false,
  resting: false,
  sleeping: false,
};

describe('pet state machine', () => {
  it('uses one state with the documented priority', () => {
    expect(resolvePetState(empty)).toBe('idle');
    expect(resolvePetState({ ...empty, sleeping: true, focus: true })).toBe('focus');
    expect(resolvePetState({ ...empty, focus: true, interacting: true })).toBe('interact');
    expect(resolvePetState({ ...empty, levelUp: true, dragging: true })).toBe('dragging');
  });
});
