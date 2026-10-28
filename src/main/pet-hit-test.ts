import type { Point, Rectangle } from './window-position';

export function isInsidePet(cursor: Point, bounds: Rectangle): boolean {
  const x = cursor.x - bounds.x;
  const y = cursor.y - bounds.y;
  // 占位宠物主体位于窗口中央，周围透明边缘允许点击穿透。
  return x >= 25 && x < 155 && y >= 25 && y < 155;
}
