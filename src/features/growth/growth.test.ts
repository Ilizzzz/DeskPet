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
    const first = settleInput(initial, 24, 7);
    expect(first.awarded).toBe(0);
    const next = settleInput(first.state, 1, 1);
    expect(next.awarded).toBe(2);
    expect(next.state).toMatchObject({ keyboardRemainder: 0, mouseRemainder: 0, experience: 2 });
  });
  it('no longer caps daily input experience', () => {
    const result = settleInput(initial, 25_000, 800);
    expect(result.awarded).toBe(1100);
    expect(result.state.totalExperience).toBe(1100);
    expect(result.levels.length).toBeGreaterThan(1);
  });
  it('keeps remainders transparent when input exceeds a whole unit', () => {
    const result = settleInput(initial, 31, 10);
    expect(result.awarded).toBe(2);
    expect(result.state).toMatchObject({ keyboardRemainder: 6, mouseRemainder: 2 });
    expect(settleInput(result.state, 0, 0).awarded).toBe(0);
  });
  it('handles multiple levels and overflow', () => {
    const result = settleInput({ ...initial, experience: 99 }, 5000, 0);
    expect(result.levels).toEqual([2, 3]);
    expect(result.state.experience).toBe(64);
    expect(requiredExperience(3)).toBe(180);
  });
  it('stops at the maximum level without overflowing', () => {
    const maxed: GrowthState = {
      level: 1000,
      experience: 0,
      totalExperience: 0,
      keyboardRemainder: 0,
      mouseRemainder: 0,
    };
    const result = settleInput(maxed, 25_000, 0);
    expect(result.state.level).toBe(1000);
    expect(result.levels).toEqual([]);
  });
});
