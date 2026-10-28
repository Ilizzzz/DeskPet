import { useSyncExternalStore } from 'react';
import type { Appearance } from '../../shared/types/appearance';

/**
 * 外观页共享缓存：外观与背包两栏共用同一份 Appearance，换装、合成或分解后同步刷新。
 *
 * 数据源仍然是 Preload 暴露的 getAppearance / setAppearance / craftItem / dismantleItem，
 * 这里只负责缓存与订阅，不保存任何业务状态。
 */
let cached: Appearance | undefined;
let pending: Promise<Appearance> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Appearance | undefined {
  return cached;
}

/** 写入服务返回的最新外观，并通知所有挂载中的面板。 */
export function publishAppearance(value: Appearance): void {
  cached = value;
  emit();
}

/** 读取外观；并发调用共享同一个请求，避免外观页两栏重复拉取。 */
export function loadAppearance(): Promise<Appearance> {
  if (!pending) {
    pending = window.desktopApi
      .getAppearance()
      .then((value) => {
        cached = value;
        emit();
        return value;
      })
      .finally(() => {
        pending = undefined;
      });
  }
  return pending;
}

export function useAppearance(): Appearance | undefined {
  return useSyncExternalStore(subscribe, getSnapshot);
}
