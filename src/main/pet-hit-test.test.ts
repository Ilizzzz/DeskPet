import { describe, expect, it } from 'vitest';
import { isInsidePet } from './pet-hit-test';
import { PET_ART_LEFT, PET_ART_SIZE, PET_ART_TOP, PET_WINDOW_SIZE } from '../shared/constants/pet';
const bounds = { x: -200, y: 100, width: PET_WINDOW_SIZE, height: PET_WINDOW_SIZE };
describe('pet hit testing', () => {
  it('accepts the pet artwork box including the feet', () => {
    expect(isInsidePet({ x: -200 + PET_ART_LEFT + 5, y: 100 + PET_ART_TOP + 5 }, bounds)).toBe(
      true,
    );
    // 立绘底部贴近窗口下边，脚部区域不应再被点击穿透。
    const feetY = 100 + PET_ART_TOP + PET_ART_SIZE - 2;
    expect(isInsidePet({ x: -200 + PET_ART_LEFT + PET_ART_SIZE / 2, y: feetY }, bounds)).toBe(true);
  });
  it('passes clicks through transparent margins', () => {
    expect(isInsidePet({ x: -190, y: 200 }, bounds)).toBe(false);
    expect(isInsidePet({ x: -100, y: 110 }, bounds)).toBe(false);
    expect(isInsidePet({ x: -100, y: 310 }, bounds)).toBe(false);
  });
});
