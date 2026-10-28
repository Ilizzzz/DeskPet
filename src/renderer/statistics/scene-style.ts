import type { CSSProperties } from 'react';
import type { SceneDefinition } from '../../data/catalogs/appearance';

/** 透明桌面没有渐变或背景图，界面用棋盘格提示“透明”，避免显示成空白色块。 */
export function isTransparentScene(scene: SceneDefinition): boolean {
  return scene.background === undefined && scene.theme.background === 'transparent';
}

/** 场景底色：背景图优先，其次主题渐变；透明场景留空交给 CSS 棋盘格。 */
export function sceneBackgroundStyle(scene: SceneDefinition): CSSProperties {
  if (scene.background) return { backgroundImage: `url(${scene.background})` };
  if (isTransparentScene(scene)) return {};
  return { background: scene.theme.background };
}
