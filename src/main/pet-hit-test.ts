import type { Point, Rectangle } from './window-position';
import { PET_ART_LEFT, PET_ART_SIZE, PET_ART_TOP, PET_WINDOW_SIZE } from '../shared/constants/pet';
import type { PetEdge } from './pet-drag';

/**
 * 只有桌宠立绘盒子接收鼠标事件，窗口四周透明留白允许点击穿透。
 *
 * 尺寸来自共享常量，避免主进程与渲染进程各自维护一套数字；
 * 底部按立绘真实底边计算，脚部也能拖动。
 */
export function isInsidePet(cursor: Point, bounds: Rectangle, edge: PetEdge = 'free'): boolean {
  const x = cursor.x - bounds.x;
  const y = cursor.y - bounds.y;
  const scale = bounds.width / PET_WINDOW_SIZE;
  // 贴边动画最多平移约 5px并带轻微旋转；扩大 8px 命中范围，确保可见部分始终能被抓住。
  const edgeMargin = edge === 'free' ? 0 : 8 * scale;
  const left = PET_ART_LEFT * scale - edgeMargin;
  const top = PET_ART_TOP * scale - edgeMargin;
  const right = (PET_ART_LEFT + PET_ART_SIZE) * scale + edgeMargin;
  const bottom = (PET_ART_TOP + PET_ART_SIZE) * scale + edgeMargin;
  return x >= left && x < right && y >= top && y < bottom;
}
