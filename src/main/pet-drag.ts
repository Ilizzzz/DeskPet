import type { Point } from './window-position';

export type PetEdge = 'free' | 'bottom' | 'left' | 'right';

export interface PetDragSession {
  cursorStart: Point;
  windowStart: Point;
  edge: PetEdge;
  releaseDistance: number;
  released: boolean;
}

export interface PetDragStep {
  position: Point;
  edge: PetEdge;
  session: PetDragSession;
}

export type PetEdgeDistances = Readonly<Record<Exclude<PetEdge, 'free'>, number>>;

export function createPetDragSession(
  cursorStart: Point,
  windowStart: Point,
  edge: PetEdge,
  releaseDistance: number,
): PetDragSession {
  return {
    cursorStart,
    windowStart,
    edge,
    releaseDistance: Math.max(0, releaseDistance),
    released: edge === 'free',
  };
}

function inwardDistance(edge: Exclude<PetEdge, 'free'>, dx: number, dy: number): number {
  if (edge === 'left') return dx;
  if (edge === 'right') return -dx;
  return -dy;
}

/**
 * 贴边时先吸收少量向内位移形成磁吸阻力；越过阈值后使用完整位移，避免窗口仍像被卡住。
 * 阻力期间允许沿边滑动，便于在不脱离的情况下调整贴边位置。
 */
export function stepPetDrag(session: PetDragSession, cursor: Point): PetDragStep {
  const dx = cursor.x - session.cursorStart.x;
  const dy = cursor.y - session.cursorStart.y;

  if (session.edge === 'free' || session.released) {
    return {
      position: { x: session.windowStart.x + dx, y: session.windowStart.y + dy },
      edge: 'free',
      session,
    };
  }

  if (inwardDistance(session.edge, dx, dy) <= session.releaseDistance) {
    return {
      position:
        session.edge === 'bottom'
          ? { x: session.windowStart.x + dx, y: session.windowStart.y }
          : { x: session.windowStart.x, y: session.windowStart.y + dy },
      edge: session.edge,
      session,
    };
  }

  const released = { ...session, released: true };
  return {
    position: { x: session.windowStart.x + dx, y: session.windowStart.y + dy },
    edge: 'free',
    session: released,
  };
}

export function selectPetSnapEdge(
  distances: PetEdgeDistances,
  threshold: number,
  excludedEdge?: Exclude<PetEdge, 'free'>,
): PetEdge {
  const nearest = (Object.entries(distances) as [Exclude<PetEdge, 'free'>, number][])
    .filter(([edge]) => edge !== excludedEdge)
    .sort((left, right) => left[1] - right[1])[0];
  return nearest && nearest[1] <= threshold ? nearest[0] : 'free';
}
