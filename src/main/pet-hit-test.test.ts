import { describe, expect, it } from 'vitest';
import { isInsidePet } from './pet-hit-test';
const bounds = { x: -200, y: 100, width: 180, height: 180 };
describe('pet hit testing', () => {
  it('accepts the pet body and passes transparent margins', () => {
    expect(isInsidePet({ x: -110, y: 190 }, bounds)).toBe(true);
    expect(isInsidePet({ x: -190, y: 190 }, bounds)).toBe(false);
    expect(isInsidePet({ x: -110, y: 270 }, bounds)).toBe(false);
  });
});
