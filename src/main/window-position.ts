export interface Point {
  x: number;
  y: number;
}
export interface Rectangle extends Point {
  width: number;
  height: number;
}

export function readPosition(value: unknown): Point | undefined {
  if (typeof value !== 'object' || value === null || !('x' in value) || !('y' in value)) return;
  const { x, y } = value;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(y)
  )
    return;
  return { x, y };
}

export function restorePosition(
  point: Point | undefined,
  areas: Rectangle[],
  size: { width: number; height: number },
): Point | undefined {
  if (!point || areas.length === 0) return;
  // 仅在窗口与当前工作区有交集时恢复；拔掉显示器后使用系统默认位置。
  const area = areas.find(
    (a) =>
      point.x < a.x + a.width &&
      point.x + size.width > a.x &&
      point.y < a.y + a.height &&
      point.y + size.height > a.y,
  );
  if (!area) return;
  return {
    x: Math.max(area.x, Math.min(point.x, area.x + Math.max(0, area.width - size.width))),
    y: Math.max(area.y, Math.min(point.y, area.y + Math.max(0, area.height - size.height))),
  };
}
