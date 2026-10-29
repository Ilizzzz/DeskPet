import type { PetState, PetStateSignals } from '../../shared/types/pet';

// 点击不再触发跳跃/摸头动画，避免拖动时被交互态打断；只保留被动状态。
export function resolvePetState(signals: PetStateSignals): PetState {
  if (signals.dragging) return 'dragging';
  if (signals.levelUp) return 'levelup';
  if (signals.celebratingDrop) return 'drop';
  if (signals.inputReaction) return signals.inputReaction;
  if (signals.focus) return 'focus';
  if (signals.resting) return 'rest';
  if (signals.sleeping) return 'sleep';
  if (signals.edge === 'bottom') return 'edge-bottom';
  if (signals.edge === 'left') return 'edge-left';
  if (signals.edge === 'right') return 'edge-right';
  return 'idle';
}
