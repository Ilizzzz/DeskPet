import type { CSSProperties } from 'react';
import type { SceneDefinition } from '../../data/catalogs/appearance';

/** 透明桌面没有渐变或背景图，界面用棋盘格提示“透明”，避免显示成空白色块。 */
export function isTransparentScene(scene: SceneDefinition): boolean {
  return scene.background === undefined && !scene.theme.ground;
}

/** 地面预览：兼容历史背景字段，V2 默认绘制透明画布上的椭圆地毯。 */
export function sceneBackgroundStyle(scene: SceneDefinition): CSSProperties {
  if (scene.background) return { backgroundImage: `url(${scene.background})` };
  if (isTransparentScene(scene)) return {};
  return {
    background: `radial-gradient(ellipse at 50% 76%, ${scene.theme.groundAccent ?? '#fff'} 0 14%, ${scene.theme.ground} 15% 44%, transparent 45%)`,
  };
}
