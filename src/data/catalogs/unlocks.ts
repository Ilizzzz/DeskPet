import type { UnlockEntry } from '../../shared/types/unlock';
import { CHARACTERS, ITEMS, SCENES, UI_ICONS } from './appearance';
import { TOOL_DEFINITIONS } from './tools';

/** 同级条目的展示顺序：伙伴 → 场景 → 装扮 → 工具。 */
const CATEGORY_ORDER: Readonly<Record<UnlockEntry['category'], number>> = {
  character: 0,
  scene: 1,
  item: 2,
  tool: 3,
};

/**
 * 场景没有独立图标，用第一件装饰物代表；透明桌面退回到首页图标。
 */
function sceneIcon(decorations: readonly { asset: string }[]): string {
  return decorations[0]?.asset ?? UI_ICONS.home;
}

const ENTRIES: readonly UnlockEntry[] = [
  ...CHARACTERS.map((character): UnlockEntry => ({
    id: character.id,
    category: 'character',
    name: character.name,
    description: character.description,
    level: character.unlockLevel,
    icon: character.asset,
  })),
  ...SCENES.map((scene): UnlockEntry => ({
    id: scene.id,
    category: 'scene',
    name: scene.name,
    description: scene.description,
    level: scene.unlockLevel,
    icon: sceneIcon(scene.decorations),
  })),
  ...ITEMS.map((item): UnlockEntry => ({
    id: item.id,
    category: 'item',
    name: item.name,
    description: item.description,
    level: item.unlockLevel,
    icon: item.asset,
    slot: item.slot,
    rarity: item.rarity,
  })),
  ...TOOL_DEFINITIONS.map((tool): UnlockEntry => ({
    id: tool.id,
    category: 'tool',
    name: tool.name,
    description: tool.description,
    level: tool.minimumLevel,
    icon: tool.icon,
  })),
];

/**
 * 完整解锁表，按等级升序排列；同级按伙伴/场景/装扮/工具排列。
 *
 * 只描述“多少级有什么”，是否已发放由数据库（granted_unlocks / inventory）决定；
 * 工具不发放实物，由 ToolRegistryService 按等级实时判断。
 */
export const UNLOCKS: readonly UnlockEntry[] = [...ENTRIES].sort(
  (a, b) =>
    a.level - b.level ||
    CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
    a.id.localeCompare(b.id),
);

/** 到指定等级为止已经满足等级条件的全部条目，供成长页路线图使用。 */
export function unlocksAtLevel(level: number): UnlockEntry[] {
  return UNLOCKS.filter((entry) => entry.level <= level);
}

/** 指定等级之后最近的 count 个解锁条目，供“下一个解锁”和倒计时使用。 */
export function nextUnlocks(level: number, count = 3): UnlockEntry[] {
  const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return UNLOCKS.filter((entry) => entry.level > level).slice(0, limit);
}
