import { describe, expect, it } from 'vitest';
import { readPosition, restorePosition, shiftForWindowResize } from './window-position';

const areas = [
  { x: -1920, y: 0, width: 1920, height: 1040 },
  { x: 0, y: 0, width: 1920, height: 1040 },
];
const size = { width: 180, height: 180 };
describe('window position', () => {
  it('rejects invalid saved data', () => {
    expect(readPosition(null)).toBeUndefined();
    expect(readPosition({ x: 1.5, y: 0 })).toBeUndefined();
    expect(readPosition({ x: 0, y: '1' })).toBeUndefined();
  });
  it('restores a position on a secondary display and clamps to the work area', () => {
    expect(restorePosition(readPosition({ x: -100, y: 1000 }), areas, size)).toEqual({
      x: -180,
      y: 860,
    });
  });
  it('uses the default position when the saved display is gone', () => {
    expect(restorePosition({ x: 3000, y: 0 }, areas, size)).toBeUndefined();
  });
  it('keeps the pet centered when the window size changes', () => {
    expect(shiftForWindowResize({ x: 100, y: 100 }, 180, 220)).toEqual({ x: 80, y: 80 });
    expect(shiftForWindowResize({ x: 100, y: 100 }, 220, 110)).toEqual({ x: 155, y: 155 });
    expect(shiftForWindowResize({ x: 100, y: 100 }, 220, 220)).toEqual({ x: 100, y: 100 });
  });
});
