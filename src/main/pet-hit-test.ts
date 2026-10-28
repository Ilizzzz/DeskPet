import type { Point, Rectangle } from './window-position';
import { PET_ART_LEFT, PET_ART_SIZE, PET_ART_TOP, PET_WINDOW_SIZE } from '../shared/constants/pet';

/**
 * 只有桌宠立绘盒子接收鼠标事件，窗口四周透明留白允许点击穿透。
 *
 * 尺寸来自共享常量，避免主进程与渲染进程各自维护一套数字；
 * 底部按立绘真实底边计算，脚部也能拖动。
 */
export function isInsidePet(cursor: Point, bounds: Rectangle): boolean {
  const x = cursor.x - bounds.x;
  const y = cursor.y - bounds.y;
  const right =
    Math.min(bounds.width, PET_WINDOW_SIZE) - (PET_WINDOW_SIZE - PET_ART_LEFT - PET_ART_SIZE);
  const bottom =
    Math.min(bounds.height, PET_WINDOW_SIZE) - (PET_WINDOW_SIZE - PET_ART_TOP - PET_ART_SIZE);
  return x >= PET_ART_LEFT && x < right && y >= PET_ART_TOP && y < bottom;
}
