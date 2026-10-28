// 场景坐标一律以桌宠窗口的 220×220 舞台为基准，角色立绘覆盖 30..190 / 44..204。
// 装饰坐标经 Pillow 合成预览逐场景校准：地面物底部对齐 y≈198，天空物贴近页面边缘，
// z<4 在角色之后，z>=4 在角色之前形成前景遮挡。
export interface SceneTheme {
  /** CSS 渐变或颜色，直接作为场景底层背景。 */
  background: string;
  /** 可选的局部地面颜色。 */
  ground?: string;
}

export interface SceneDecoration {
  asset: string;
  x: number;
  y: number;
  /** 装饰物在 220 舞台上的显示宽度。 */
  width: number;
  flip?: boolean;
  opacity?: number;
  /** 1 表示在角色之后，4 表示在角色之前形成前景遮挡。 */
  z?: number;
}

export interface SceneDefinition {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  theme: SceneTheme;
  /** 可选整张背景图；使用 theme.background 渐变时留空。 */
  background?: string;
  decorations: readonly SceneDecoration[];
}

/**
 * 场景由渐变背景 + 免费素材装饰拼合，不替换用户壁纸。
 *
 * 星夜、海边黄昏、城市黄昏使用 Fluent Emoji 里整幅插画式的 3D 素材作为背景图，
 * 其余场景用 CSS 渐变 + 透明装饰搭出层次；所有坐标都可在不影响业务数据的前提下微调。
 */
export const SCENES: readonly SceneDefinition[] = [
  {
    id: 'transparent',
    name: '透明桌面',
    description: '直接悬浮在 Windows 桌面上。',
    unlockLevel: 1,
    theme: { background: 'transparent' },
    decorations: [],
  },
  {
    id: 'forest_home',
    name: '森林小屋',
    description: '苔藓、树木和一朵刚开的小花。',
    unlockLevel: 3,
    theme: {
      background: 'linear-gradient(180deg, #dcefdc 0%, #f4f1df 62%, #cfe3c4 100%)',
      ground: '#cfe3c4',
    },
    decorations: [
      { asset: 'assets/decor/evergreen_tree.png', x: -16, y: 110, width: 96, z: 1 },
      { asset: 'assets/decor/deciduous_tree.png', x: 144, y: 115, width: 88, z: 1 },
      { asset: 'assets/decor/cherry_blossom.png', x: 6, y: 166, width: 34, z: 4 },
      { asset: 'assets/decor/mushroom.png', x: 184, y: 165, width: 38, z: 4 },
    ],
  },
  {
    id: 'coffee_corner',
    name: '咖啡角',
    description: '一杯热咖啡和一小块甜点。',
    unlockLevel: 6,
    theme: { background: 'linear-gradient(180deg, #f7e7d3 0%, #f3d9c0 100%)' },
    decorations: [
      { asset: 'assets/decor/potted_plant.png', x: -8, y: 151, width: 50, z: 1 },
      { asset: 'assets/decor/teacup.png', x: 8, y: 160, width: 40, z: 4 },
      { asset: 'assets/decor/books.png', x: 164, y: 153, width: 48, z: 4 },
      { asset: 'assets/decor/cupcake.png', x: 176, y: 131, width: 30, z: 4 },
    ],
  },
  {
    id: 'starry_night',
    name: '星空露台',
    description: '月光和流星都落在桌角。',
    unlockLevel: 9,
    theme: { background: 'linear-gradient(180deg, #232849 0%, #3b3f6e 55%, #20233c 100%)' },
    background: 'assets/decor/night_stars.png',
    decorations: [
      { asset: 'assets/decor/star.png', x: 14, y: 28, width: 22, z: 1 },
      { asset: 'assets/decor/sparkles.png', x: 178, y: 118, width: 24, z: 1 },
    ],
  },
  {
    id: 'sunset_beach',
    name: '海边黄昏',
    description: '听一会儿海浪，再继续。',
    unlockLevel: 13,
    theme: { background: 'linear-gradient(180deg, #ffd9a8 0%, #ffb98f 45%, #6fb3c9 100%)' },
    background: 'assets/decor/sunset.png',
    decorations: [
      { asset: 'assets/decor/palm_tree.png', x: 170, y: 96, width: 64, z: 1 },
      { asset: 'assets/decor/beach_umbrella.png', x: 4, y: 168, width: 52, z: 4 },
      { asset: 'assets/decor/water_wave.png', x: 0, y: 196, width: 224, z: 4, opacity: 0.9 },
    ],
  },
  {
    id: 'snowy_cabin',
    name: '雪夜小屋',
    description: '窗外下着雪，屋里亮着灯。',
    unlockLevel: 17,
    theme: {
      background: 'linear-gradient(180deg, #e8f2fb 0%, #cfe2f2 55%, #f7fbff 100%)',
      ground: '#f7fbff',
    },
    decorations: [
      { asset: 'assets/decor/snowflake.png', x: 18, y: 12, width: 28, z: 1 },
      { asset: 'assets/decor/house.png', x: 148, y: 132, width: 70, z: 1 },
      { asset: 'assets/decor/snowman.png', x: 6, y: 159, width: 44, z: 4 },
      { asset: 'assets/decor/evergreen_tree.png', x: 170, y: 142, width: 60, z: 4 },
    ],
  },
  {
    id: 'cozy_library',
    name: '温馨书房',
    description: '书页、灯光和安静的陪伴。',
    unlockLevel: 21,
    theme: { background: 'linear-gradient(180deg, #f3e2cd 0%, #e6c9a8 100%)' },
    decorations: [
      { asset: 'assets/decor/light_bulb.png', x: 10, y: 10, width: 34, z: 1 },
      { asset: 'assets/decor/bridge_night.png', x: 78, y: 12, width: 44, z: 1 },
      { asset: 'assets/decor/potted_plant.png', x: -10, y: 151, width: 54, z: 1 },
      { asset: 'assets/decor/books.png', x: 166, y: 149, width: 52, z: 1 },
      { asset: 'assets/decor/open_book.png', x: 48, y: 152, width: 44, z: 4 },
    ],
  },
  {
    id: 'city_dusk',
    name: '城市黄昏',
    description: '远处的楼宇慢慢亮起灯。',
    unlockLevel: 25,
    theme: { background: 'linear-gradient(180deg, #42395f 0%, #b06a7a 55%, #f2b287 100%)' },
    background: 'assets/decor/cityscape_dusk.png',
    decorations: [
      { asset: 'assets/decor/crescent_moon.png', x: 174, y: 8, width: 34, z: 1 },
      { asset: 'assets/decor/star.png', x: 20, y: 26, width: 20, z: 1 },
      { asset: 'assets/decor/sparkles.png', x: 184, y: 118, width: 22, z: 1 },
    ],
  },
] as const;
