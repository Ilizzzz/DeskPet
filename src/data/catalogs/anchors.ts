// 饰品锚点以角色 256×256 原始画布为坐标，渲染时按显示尺寸等比缩放。
// 数值通过 Pillow 把角色立绘与代表饰品（帽/围巾/眼镜/手持/背包）合成预览后逐个校准：
// head 以帽檐底边对准头顶，其余槽位以饰品可见内容的中心对准目标部位。
// 负的 left/top 表示饰品允许超出立绘画布，渲染容器不得裁剪溢出。
export interface ItemAnchor {
  left: number;
  top: number;
  /** 饰品显示宽度（256 画布单位）。 */
  width: number;
  rotate?: number;
  flip?: boolean;
}

export type CharacterAnchors = {
  head: ItemAnchor;
  neck: ItemAnchor;
  face: ItemAnchor;
  hand: ItemAnchor;
  back: ItemAnchor;
};

export const ANCHORS: Readonly<Record<string, CharacterAnchors>> = {
  // 侧视，头在左上；帽子压在耳根，围巾/眼镜落在胸颈与眼部，背饰从背部上方露出。
  cat: {
    head: { left: 20, top: -18, width: 93 },
    neck: { left: 47, top: 87, width: 69 },
    face: { left: 33, top: 46, width: 66 },
    hand: { left: 63, top: 150, width: 71 },
    back: { left: 127, top: 45, width: 110 },
  },
  // 侧视，耳朵下垂、吻部朝左；颈部目标略靠前胸。
  dog: {
    head: { left: 24, top: -8, width: 93 },
    neck: { left: 62, top: 112, width: 71 },
    face: { left: 47, top: 60, width: 66 },
    hand: { left: 75, top: 161, width: 71 },
    back: { left: 131, top: 60, width: 113 },
  },
  // 侧视短身，长耳占画面右上；帽子放在耳根之间，避免遮住耳朵。
  rabbit: {
    head: { left: 33, top: 2, width: 84 },
    neck: { left: 63, top: 110, width: 69 },
    face: { left: 25, top: 75, width: 59 },
    hand: { left: 42, top: 144, width: 68 },
    back: { left: 132, top: 69, width: 119 },
  },
  // 正视，头身同宽；背饰只能从双肩与头顶两侧露出，因此整体上移。
  penguin: {
    head: { left: 72, top: -21, width: 113 },
    neck: { left: 80, top: 96, width: 96 },
    face: { left: 75, top: 54, width: 105 },
    hand: { left: 158, top: 145, width: 71 },
    back: { left: 47, top: 34, width: 162 },
  },
  // 侧视，头大且低伏；尾部在上方，背饰放在背部中段。
  tiger: {
    head: { left: 30, top: 5, width: 93 },
    neck: { left: 71, top: 129, width: 66 },
    face: { left: 40, top: 87, width: 64 },
    hand: { left: 65, top: 165, width: 71 },
    back: { left: 135, top: 89, width: 113 },
  },
  // 侧视低矮，头盔与身体高度重合；帽子和眼镜缩到头部比例，背饰放在龟壳上。
  turtle: {
    head: { left: 17, top: 112, width: 59 },
    neck: { left: 41, top: 163, width: 46 },
    face: { left: 18, top: 143, width: 53 },
    hand: { left: 162, top: 168, width: 68 },
    back: { left: 59, top: 33, width: 145 },
  },
  // 侧视，尖刺占据背部上半；头饰戴在左前方小脑袋上，背饰架在刺间。
  hedgehog: {
    head: { left: 41, top: 80, width: 63 },
    neck: { left: 78, top: 170, width: 53 },
    face: { left: 73, top: 125, width: 55 },
    hand: { left: 114, top: 173, width: 65 },
    back: { left: 103, top: 20, width: 145 },
  },
  // 坐姿侧视，大尾巴在右；背饰贴着尾巴根部，避免被尾巴完全遮住。
  chipmunk: {
    head: { left: 39, top: -2, width: 79 },
    neck: { left: 67, top: 109, width: 62 },
    face: { left: 46, top: 67, width: 59 },
    hand: { left: 58, top: 131, width: 68 },
    back: { left: 154, top: 49, width: 101 },
  },
};

export function anchorsFor(characterId: string): CharacterAnchors {
  return ANCHORS[characterId] ?? ANCHORS.cat;
}
