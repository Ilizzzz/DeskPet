import type { ItemRarity, ItemSlot } from '../../shared/types/appearance';
import { SCENES } from './scenes';

export { ANCHORS as ITEM_ANCHORS } from './anchors';
export { resolvedAnchor } from './anchors';
export type { ItemAnchor, CharacterAnchors } from './anchors';
export { SCENES } from './scenes';
export type { SceneDefinition, SceneDecoration, SceneTheme } from './scenes';

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  asset: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  asset: string;
  unlockLevel: number;
}

/**
 * 全部角色使用同一套 256×256 透明画布。动物伙伴采用 V2 原创二次元 2D 立绘，
 * 用户提供的真人伙伴保留原图，只做等比适配。
 *
 * 解锁等级刻意拉长到 28 级，保证成长过程中持续出现新伙伴或新装扮。
 */
export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: 'cat',
    name: '小猫',
    description: '默认伙伴，好奇又粘人。',
    unlockLevel: 1,
    asset: 'assets/characters/cat.png',
  },
  {
    id: 'math_master',
    name: '数学硕士',
    description: '带着冷静与耐心，陪你攻克每一道难题。',
    unlockLevel: 1,
    asset: 'assets/characters/math_master.png',
  },
  {
    id: 'dog',
    name: '小狗',
    description: '摇尾巴的忠实伙伴。',
    unlockLevel: 4,
    asset: 'assets/characters/dog.png',
  },
  {
    id: 'rabbit',
    name: '小兔',
    description: '安静地陪在桌角。',
    unlockLevel: 8,
    asset: 'assets/characters/rabbit.png',
  },
  {
    id: 'penguin',
    name: '小企鹅',
    description: '走路一摇一摆的专注监督员。',
    unlockLevel: 12,
    asset: 'assets/characters/penguin.png',
  },
  {
    id: 'tiger',
    name: '小老虎',
    description: '继承了小狐狸橙色皮毛的新伙伴。',
    unlockLevel: 16,
    asset: 'assets/characters/tiger.png',
  },
  {
    id: 'turtle',
    name: '小乌龟',
    description: '慢慢来，但从不缺席。',
    unlockLevel: 20,
    asset: 'assets/characters/turtle.png',
  },
  {
    id: 'hedgehog',
    name: '小刺猬',
    description: '看起来扎手，其实很温柔。',
    unlockLevel: 24,
    asset: 'assets/characters/hedgehog.png',
  },
  {
    id: 'chipmunk',
    name: '小松鼠',
    description: '把每一份收藏都塞进腮帮子里。',
    unlockLevel: 28,
    asset: 'assets/characters/chipmunk.png',
  },
] as const;

/** Version 2 装扮目录，覆盖五个槽位，并包含五件成长里程碑装扮。 */
export const ITEMS: readonly ItemDefinition[] = [
  {
    id: 'cap_blue',
    name: '蓝色棒球帽',
    description: '随手一戴就能出门。',
    slot: 'head',
    rarity: 'common',
    asset: 'assets/items/cap_blue.png',
    unlockLevel: 2,
  },
  {
    id: 'flower_crown',
    name: '花朵发饰',
    description: '春天落在头顶。',
    slot: 'head',
    rarity: 'common',
    asset: 'assets/items/flower_crown.png',
    unlockLevel: 3,
  },
  {
    id: 'hat_woman',
    name: '淑女礼帽',
    description: '下午茶专用。',
    slot: 'head',
    rarity: 'rare',
    asset: 'assets/items/hat_woman.png',
    unlockLevel: 7,
  },
  {
    id: 'headphone_music',
    name: '音乐耳机',
    description: '沉浸式专注，从一首歌开始。',
    slot: 'head',
    rarity: 'rare',
    asset: 'assets/items/headphone_music.png',
    unlockLevel: 9,
  },
  {
    id: 'hat_top',
    name: '魔术礼帽',
    description: '据说能从里面掏出好心情。',
    slot: 'head',
    rarity: 'rare',
    asset: 'assets/items/hat_top.png',
    unlockLevel: 11,
  },
  {
    id: 'cap_graduate',
    name: '学士帽',
    description: '为每一次坚持加冕。',
    slot: 'head',
    rarity: 'epic',
    asset: 'assets/items/cap_graduate.png',
    unlockLevel: 15,
  },
  {
    id: 'crown_gold',
    name: '星星皇冠',
    description: '陪伴者的最高荣誉。',
    slot: 'head',
    rarity: 'legendary',
    asset: 'assets/items/crown_gold.png',
    unlockLevel: 20,
  },
  {
    id: 'scarf_red',
    name: '红围巾',
    description: '冬天也要暖暖的。',
    slot: 'neck',
    rarity: 'common',
    asset: 'assets/items/scarf_red.png',
    unlockLevel: 3,
  },
  {
    id: 'bell_collar',
    name: '铃铛项圈',
    description: '走两步就会叮当响。',
    slot: 'neck',
    rarity: 'common',
    asset: 'assets/items/bell_collar.png',
    unlockLevel: 5,
  },
  {
    id: 'ribbon_pink',
    name: '粉色蝴蝶结',
    description: '今天也要元气满满。',
    slot: 'neck',
    rarity: 'rare',
    asset: 'assets/items/ribbon_pink.png',
    unlockLevel: 8,
  },
  {
    id: 'tie_necktie',
    name: '绅士领带',
    description: '正式场合也不怯场。',
    slot: 'neck',
    rarity: 'rare',
    asset: 'assets/items/tie_necktie.png',
    unlockLevel: 12,
  },
  {
    id: 'ribbon_reminder',
    name: '心愿丝带',
    description: '系住一个小小的愿望。',
    slot: 'neck',
    rarity: 'epic',
    asset: 'assets/items/ribbon_reminder.png',
    unlockLevel: 17,
  },
  {
    id: 'glasses_round',
    name: '圆框眼镜',
    description: '看起来很会读书。',
    slot: 'face',
    rarity: 'common',
    asset: 'assets/items/glasses_round.png',
    unlockLevel: 6,
  },
  {
    id: 'sunglasses_cool',
    name: '酷墨镜',
    description: '今天的桌面由我守护。',
    slot: 'face',
    rarity: 'rare',
    asset: 'assets/items/sunglasses_cool.png',
    unlockLevel: 10,
  },
  {
    id: 'goggles_sky',
    name: '飞行护目镜',
    description: '准备起飞。',
    slot: 'face',
    rarity: 'epic',
    asset: 'assets/items/goggles_sky.png',
    unlockLevel: 16,
  },
  {
    id: 'balloon_red',
    name: '红气球',
    description: '一颗会飘的小心情。',
    slot: 'hand',
    rarity: 'common',
    asset: 'assets/items/balloon_red.png',
    unlockLevel: 8,
  },
  {
    id: 'bouquet_flower',
    name: '感谢花束',
    description: '送给你，也送给努力的自己。',
    slot: 'hand',
    rarity: 'rare',
    asset: 'assets/items/bouquet_flower.png',
    unlockLevel: 13,
  },
  {
    id: 'wand_magic',
    name: '星星魔杖',
    description: '把普通的一天变亮一点。',
    slot: 'hand',
    rarity: 'epic',
    asset: 'assets/items/wand_magic.png',
    unlockLevel: 18,
  },
  {
    id: 'party_popper',
    name: '庆祝礼花',
    description: '每个小目标都值得庆祝。',
    slot: 'hand',
    rarity: 'epic',
    asset: 'assets/items/party_popper.png',
    unlockLevel: 22,
  },
  {
    id: 'crystal_ball',
    name: '星光水晶球',
    description: '映出你一路走来的光。',
    slot: 'hand',
    rarity: 'legendary',
    asset: 'assets/items/crystal_ball.png',
    unlockLevel: 28,
  },
  {
    id: 'backpack_school',
    name: '小书包',
    description: '装下今天的小收获。',
    slot: 'back',
    rarity: 'common',
    asset: 'assets/items/backpack_school.png',
    unlockLevel: 10,
  },
  {
    id: 'handbag_fashion',
    name: '糖果挎包',
    description: '出门散步也要好看。',
    slot: 'back',
    rarity: 'rare',
    asset: 'assets/items/handbag_fashion.png',
    unlockLevel: 14,
  },
  {
    id: 'umbrella_closed',
    name: '随身小伞',
    description: '为坏天气提前准备。',
    slot: 'back',
    rarity: 'rare',
    asset: 'assets/items/umbrella_closed.png',
    unlockLevel: 19,
  },
  {
    id: 'rocket_jet',
    name: '迷你推进器',
    description: '灵感来了就一飞冲天。',
    slot: 'back',
    rarity: 'epic',
    asset: 'assets/items/rocket_jet.png',
    unlockLevel: 23,
  },
  {
    id: 'wing_angel',
    name: '天使之翼',
    description: '传说级收藏，属于坚持到 30 级的你。',
    slot: 'back',
    rarity: 'legendary',
    asset: 'assets/items/wing_angel.png',
    unlockLevel: 30,
  },
  {
    id: 'beret_artist',
    name: '画家贝雷帽',
    description: 'Lv.5 的成长纪念，灵感刚刚好。',
    slot: 'head',
    rarity: 'rare',
    asset: 'assets/items/beret_artist.png',
    unlockLevel: 5,
  },
  {
    id: 'collar_starlight',
    name: '星光领结',
    description: 'Lv.10 的陪伴纪念。',
    slot: 'neck',
    rarity: 'rare',
    asset: 'assets/items/collar_starlight.png',
    unlockLevel: 10,
  },
  {
    id: 'monocle_moon',
    name: '月夜单片镜',
    description: 'Lv.15 的成长纪念，映着一弯月光。',
    slot: 'face',
    rarity: 'epic',
    asset: 'assets/items/monocle_moon.png',
    unlockLevel: 15,
  },
  {
    id: 'lantern_star',
    name: '手提星灯',
    description: 'Lv.20 的成长纪念，照亮桌面一角。',
    slot: 'hand',
    rarity: 'epic',
    asset: 'assets/items/lantern_star.png',
    unlockLevel: 20,
  },
  {
    id: 'cape_night',
    name: '夜空披风',
    description: 'Lv.30 的传奇陪伴纪念。',
    slot: 'back',
    rarity: 'legendary',
    asset: 'assets/items/cape_night.png',
    unlockLevel: 30,
  },
] as const;

/** 界面通用图标，供侧边栏、成长路线和奖励卡片复用。 */
export const UI_ICONS = {
  app: 'assets/icons/app.png',
  home: 'assets/icons/home.png',
  growth: 'assets/icons/growth.png',
  appearance: 'assets/icons/appearance.png',
  tools: 'assets/icons/tools.png',
  settings: 'assets/icons/settings.png',
  checkin: 'assets/icons/checkin.png',
  achievement: 'assets/icons/achievement.png',
  coins: 'assets/icons/coins.png',
  fragments: 'assets/icons/fragments.png',
  levelup: 'assets/icons/levelup.png',
  keyboard: 'assets/icons/keyboard.png',
  mouse: 'assets/icons/mouse.png',
  clock: 'assets/icons/clock.png',
} as const;

export function characterById(id: string): CharacterDefinition | undefined {
  return CHARACTERS.find((entry) => entry.id === id);
}

export function itemById(id: string): ItemDefinition | undefined {
  return ITEMS.find((entry) => entry.id === id);
}

export function appearanceAssets(): string[] {
  return [
    ...CHARACTERS.map((entry) => entry.asset),
    ...ITEMS.map((entry) => entry.asset),
    ...SCENES.flatMap((scene) => [
      ...(scene.background === undefined ? [] : [scene.background]),
      ...scene.decorations.map((decor) => decor.asset),
    ]),
    ...Object.values(UI_ICONS),
  ];
}
