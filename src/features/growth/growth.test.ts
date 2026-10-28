import { describe, expect, it } from 'vitest';
import { requiredExperience, settleInput, type GrowthState } from './growth';
const initial: GrowthState = {
  level: 1,
  experience: 0,
  totalExperience: 0,
  keyboardRemainder: 0,
  mouseRemainder: 0,
};
describe('input growth settlement', () => {
  it('preserves independent remainders across batches', () => {
    const first = settleInput(initial, 24, 7, 0);
    expect(first.awarded).toBe(0);
    const next = settleInput(first.state, 1, 1, 0);
    expect(next.awarded).toBe(2);
    expect(next.state).toMatchObject({ keyboardRemainder: 0, mouseRemainder: 0, experience: 2 });
  });
  it('enforces the daily cap and discards whole units beyond it', () => {
    const capped = settleInput(initial, 5024, 7, 0);
    expect(capped.awarded).toBe(200);
    const next = settleInput(capped.state, 1, 1, 200);
    expect(next.awarded).toBe(0);
    expect(settleInput(next.state, 0, 0, 0).awarded).toBe(0);
  });
  it('handles multiple levels and overflow', () => {
    const result = settleInput({ ...initial, experience: 99 }, 5000, 0, 0);
    expect(result.levels).toEqual([2, 3]);
    expect(result.state.experience).toBe(64);
    expect(requiredExperience(3)).toBe(180);
  });
});
