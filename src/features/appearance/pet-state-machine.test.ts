import { describe, expect, it } from 'vitest';
import { resolvePetState } from './pet-state-machine';

const empty = {
  dragging: false,
  levelUp: false,
  focus: false,
  resting: false,
  sleeping: false,
  inputReaction: null,
  celebratingDrop: false,
  edge: 'free' as const,
};

describe('pet state machine', () => {
  it('uses one state with the documented priority', () => {
    expect(resolvePetState(empty)).toBe('idle');
    expect(resolvePetState({ ...empty, sleeping: true, focus: true })).toBe('focus');
    expect(resolvePetState({ ...empty, sleeping: true, resting: true })).toBe('rest');
    expect(resolvePetState({ ...empty, levelUp: true, dragging: true })).toBe('dragging');
  });

  it('prioritizes input and drops over edge poses', () => {
    expect(resolvePetState({ ...empty, edge: 'bottom' })).toBe('edge-bottom');
    expect(resolvePetState({ ...empty, edge: 'left', inputReaction: 'keyboard' })).toBe('keyboard');
    expect(resolvePetState({ ...empty, edge: 'right', celebratingDrop: true })).toBe('drop');
  });
});
