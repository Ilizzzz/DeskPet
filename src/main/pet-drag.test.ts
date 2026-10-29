import { describe, expect, it } from 'vitest';
import { createPetDragSession, selectPetSnapEdge, stepPetDrag } from './pet-drag';

describe('pet drag resistance', () => {
  it('follows the cursor immediately when the pet is free', () => {
    const session = createPetDragSession({ x: 100, y: 100 }, { x: 20, y: 30 }, 'free', 10);
    expect(stepPetDrag(session, { x: 116, y: 92 })).toMatchObject({
      position: { x: 36, y: 22 },
      edge: 'free',
    });
  });

  it('holds the snapped axis within the resistance distance while allowing edge sliding', () => {
    const session = createPetDragSession({ x: 100, y: 100 }, { x: 0, y: 40 }, 'left', 10);
    expect(stepPetDrag(session, { x: 108, y: 125 })).toMatchObject({
      position: { x: 0, y: 65 },
      edge: 'left',
      session: { released: false },
    });
  });

  it('releases a side edge after a short inward pull and uses the full cursor movement', () => {
    const session = createPetDragSession({ x: 500, y: 200 }, { x: 1700, y: 80 }, 'right', 10);
    expect(stepPetDrag(session, { x: 488, y: 205 })).toMatchObject({
      position: { x: 1688, y: 85 },
      edge: 'free',
      session: { released: true },
    });
  });

  it('releases the bottom edge only when pulled upward beyond the threshold', () => {
    const session = createPetDragSession({ x: 300, y: 900 }, { x: 220, y: 820 }, 'bottom', 10);
    expect(stepPetDrag(session, { x: 320, y: 893 })).toMatchObject({
      position: { x: 240, y: 820 },
      edge: 'bottom',
    });
    const released = stepPetDrag(session, { x: 320, y: 888 });
    expect(released).toMatchObject({ position: { x: 240, y: 808 }, edge: 'free' });
    expect(stepPetDrag(released.session, { x: 325, y: 910 })).toMatchObject({
      position: { x: 245, y: 830 },
      edge: 'free',
    });
  });
});

describe('pet edge selection', () => {
  const distances = { left: 900, right: 8, bottom: 300 };

  it('snaps to the nearest edge inside the threshold', () => {
    expect(selectPetSnapEdge(distances, 24)).toBe('right');
  });

  it('does not immediately re-snap to the edge released by this drag', () => {
    expect(selectPetSnapEdge(distances, 24, 'right')).toBe('free');
  });

  it('can still snap to a different edge after leaving the original one', () => {
    expect(selectPetSnapEdge({ left: 5, right: 8, bottom: 300 }, 24, 'right')).toBe('left');
  });
});
