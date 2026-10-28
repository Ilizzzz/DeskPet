# TASK-011 设计与任务边界

本文件是 TASK-011「美术升级、拖动修复、工具解锁与内容扩展」的内部设计契约。
所有子任务以本文件为准；实现与设计不一致时，先在同一条消息里说明原因，再改代码。

## 1. 目标

1. 用可商用的免费素材替换原手绘 SVG，形成统一的 3D 卡通贴纸风。
2. 修复拖动：点击桌宠任意位置都能拖动，去掉点击触发的跳跃/触摸动画。
3. 工具、外观全部改为等级解锁；移除键鼠/专注的每日经验上限。
4. 丰富内容：新伙伴、新场景、五槽位装扮、装扮合成、签到、成就、四个新工具，
   并把成长解锁路线做成可直观看到的界面。

## 2. 成长规则（已定）

- 键盘 25 次 = 1 EXP；鼠标 8 次 = 1 EXP；两者余数独立保留。
- 完成一次专注 = 10 EXP + 2 星星币；每累计完成 3 次专注额外 +1 星光碎片。
- **删除**每日输入与专注经验上限；仍保留每条经验流水记录。
- 升级经验：`100 + 30 × (L - 1) + 5 × (L - 1)²`，最大等级 1000（沿用现有实现）。
- 星星币来源：等级奖励、签到、成就、专注、分解装扮。
- 星光碎片来源：签到、成就、专注、分解装扮。
- 装扮/角色/场景到达等级自动进入账户；工具到等级自动可用（保留启停开关）。

等级奖励只发货币/碎片，不再发物品（物品由解锁表自动发放）：

| 等级 | 奖励                    |
| ---- | ----------------------- |
| 2    | 30 星星币               |
| 3    | 1 星光碎片              |
| 4    | 40 星星币               |
| 5    | 50 星星币 + 1 星光碎片  |
| 6    | 1 星光碎片              |
| 8    | 2 星光碎片              |
| 10   | 80 星星币 + 2 星光碎片  |
| 12   | 1 星光碎片              |
| 15   | 2 星光碎片              |
| 18   | 100 星星币 + 2 星光碎片 |
| 20   | 3 星光碎片              |
| 24   | 120 星星币 + 2 星光碎片 |
| 28   | 3 星光碎片              |
| 30   | 150 星星币 + 5 星光碎片 |

## 3. 解锁表

### 角色（8）

| ID       | 名称   | 等级                        |
| -------- | ------ | --------------------------- |
| cat      | 小猫   | 1                           |
| dog      | 小狗   | 4                           |
| rabbit   | 小兔   | 8                           |
| penguin  | 小企鹅 | 12                          |
| tiger    | 小老虎 | 16（旧版 fox 数据迁移到此） |
| turtle   | 小乌龟 | 20                          |
| hedgehog | 小刺猬 | 24                          |
| chipmunk | 小松鼠 | 28                          |

### 场景（8）

透明桌面 1、森林小屋 3、咖啡角 6、星空露台 9、海边黄昏 13、雪夜小屋 17、
温馨书房 21、城市黄昏 25。定义见 `src/data/catalogs/scenes.ts`。

### 装扮（25，五槽位）

完整列表与等级见 `src/data/catalogs/appearance.ts`。
旧 ID 迁移：`hat_blue → cap_blue`、`hat_star → hat_top`、`scarf → scarf_red`。

### 工具（8）

今日总结 1、番茄钟 2、桌面便签 4、久坐提醒 6、待办清单 9、喝水提醒 12、
倒计时 15、纪念日 18。定义见 `src/data/catalogs/tools.ts`。

## 4. 合成与分解

合成配方（`src/data/catalogs/crafting.ts`，`CraftingRecipe` 已扩展
`fragmentCost`、`category: 'material' | 'outfit'`）：

材料兑换（1 碎片 + 15 星星币 → 1 件普通装扮，用于补充合成材料）：
cap_blue、flower_crown、scarf_red、bell_collar、glasses_round、balloon_red、backpack_school。

高级装扮配方：

| 产物            | 材料                                  | 星星币 | 碎片 |
| --------------- | ------------------------------------- | ------ | ---- |
| hat_top         | cap_blue ×2                           | 25     | 0    |
| hat_woman       | flower_crown ×2                       | 25     | 0    |
| sunglasses_cool | glasses_round ×2                      | 20     | 0    |
| ribbon_pink     | scarf_red ×2                          | 15     | 0    |
| bell_collar     | scarf_red ×2                          | 10     | 0    |
| tie_necktie     | scarf_red ×1 + ribbon_pink ×1         | 25     | 0    |
| bouquet_flower  | balloon_red ×1 + flower_crown ×1      | 20     | 0    |
| crown_gold      | hat_top ×2 + hat_woman ×2             | 60     | 2    |
| goggles_sky     | sunglasses_cool ×1 + glasses_round ×1 | 35     | 1    |
| handbag_fashion | backpack_school ×1                    | 25     | 0    |
| party_popper    | balloon_red ×2                        | 30     | 1    |
| rocket_jet      | backpack_school ×2                    | 50     | 2    |
| crystal_ball    | wand_magic ×2                         | 40     | 3    |
| wing_angel      | backpack_school ×2 + rocket_jet ×1    | 80     | 4    |

分解：任意未穿戴装扮 1 件 → 10 星星币 +（稀有及以上额外 1 星光碎片）。
所有扣除与发放必须在同一 SQLite 事务中；材料不足不得扣除任何资源。

## 5. 签到与成就

签到：每天 1 次；`星星币 = 10 + 5 × min(连续天数, 7)`，每天 +1 星光碎片，
每连续 7 天额外 +2 碎片。断签后连续天数从 1 重新开始。

成就（`src/data/catalogs/achievements.ts`）：

| ID          | 名称     | 条件            | 奖励                |
| ----------- | -------- | --------------- | ------------------- |
| first_steps | 初次相遇 | 累计操作 500 次 | 20 星星币           |
| typist      | 键盘达人 | 键盘累计 100000 | 60 星星币 + 1 碎片  |
| clicker     | 点击能手 | 鼠标累计 50000  | 60 星星币           |
| focus_5     | 专注新星 | 专注 5 次       | 30 星星币 + 1 碎片  |
| focus_30    | 专注大师 | 专注 30 次      | 100 星星币 + 3 碎片 |
| level_10    | 十级伙伴 | 等级 10         | 2 碎片              |
| level_25    | 资深陪伴 | 等级 25         | 100 星星币 + 5 碎片 |
| collect_10  | 收藏家   | 拥有 10 种装扮  | 3 碎片              |
| craft_3     | 合成学徒 | 合成 3 次       | 40 星星币           |
| checkin_7   | 签到之星 | 连续签到 7 天   | 3 碎片              |
| scene_3     | 旅行家   | 拥有 3 个场景   | 40 星星币           |
| character_3 | 伙伴成群 | 拥有 3 个角色   | 3 碎片              |

成就领取幂等，写入 `achievements(id, claimed_at)`。

## 6. 数据库（已由 Lead 写入 v15 迁移）

新增表：`granted_unlocks`、`checkins`、`achievements`、`todos`、`countdowns`、
`anniversaries`、`water_state`；`wallet.fragments`；`appearance.face/hand/back`。
迁移同时把旧角色/装扮 ID 映射到新目录。不要修改迁移版本号或重建数据库。

## 7. 服务契约（名称、签名必须一致）

```ts
// CheckinService
status(now = new Date()): CheckinStatus;
checkIn(now = new Date()): CheckinStatus;

// AchievementService
list(): AchievementState[];
claim(id: unknown): AchievementState[];

// TodoService
all(): Todo[];
create(content: unknown): Todo[];
update(id: unknown, change: unknown): Todo[];
remove(id: unknown): Todo[];

// CountdownService
all(now = Date.now()): Countdown[];
create(label: unknown, minutes: unknown, now = Date.now()): Countdown[];
remove(id: unknown): Countdown[];
checkDue(now = Date.now()): Countdown[]; // 到点并标记 notified

// AnniversaryService
all(now = new Date()): AnniversaryView[];
create(title: unknown, date: unknown, repeatYearly: unknown): AnniversaryView[];
remove(id: unknown): AnniversaryView[];

// WaterService
get(now = Date.now()): WaterSnapshot;
configure(value: unknown): WaterSnapshot;
drink(now = Date.now()): WaterSnapshot;
checkDue(now = Date.now()): boolean; // 到点返回 true 并记录 last_reminded_at

// ToolRegistryService（由 tools 任务负责）
list(): ToolState[];                    // unlocked = level >= minimumLevel
isEnabled(id): boolean;                 // enabled && unlocked
setEnabled(id, enabled): ToolState[];   // 未解锁时拒绝

// AppearanceService
get(): Appearance;
update(change: unknown): Appearance;    // 支持 character/scene/equipped
```

`StatisticsStore` 已提供 getter：
`appearance / crafting / tools / checkin / achievements / todos / countdowns /
anniversaries / water`。

## 8. 目录与文件归属

- 美术任务：`public/assets/**`（角色/装扮/装饰/图标/授权文件）、`docs/ASSET_GUIDE.md`、
  `docs/THIRD_PARTY_NOTICES.md`、`src/data/catalogs/anchors.ts`、图片校验脚本
  （`scripts/validate-assets.mjs` 可新增）。**不要修改 appearance.ts / scenes.ts**，
  需要调整时把建议发给 Lead；需要微调场景布局可改 `scenes.ts`（已移交）。
  实际上 scenes.ts 与 anchors.ts 都属于美术任务，appearance.ts 属于 Lead。
- 成长任务：`src/features/growth/**`、`src/features/unlocks/**`、
  `src/features/achievements/**`、`src/features/checkin/**`、
  `src/features/inventory/crafting-service.ts`、`src/features/appearance/appearance-service.ts`、
  `src/data/catalogs/growth.ts|unlocks.ts|achievements.ts|crafting.ts` 及对应测试。
- 工具任务：`src/tools/todo/**`、`src/tools/countdown/**`、`src/tools/anniversary/**`、
  `src/tools/water/**`、`src/tools/tool-registry.ts`、
  `src/renderer/statistics/ToolboxPanel.tsx`、`FocusPanel.tsx`、`NotesPanel.tsx`、
  `SedentaryPanel.tsx`、`SummaryPanel.tsx`、新增工具面板、`src/renderer/tools.css`。
- 界面任务：`src/renderer/statistics/StatisticsPage.tsx`、`OverviewPanel.tsx`、
  `GrowthPanel.tsx`、`AppearancePanel.tsx`、`InventoryPanel.tsx`、`SettingsPanel.tsx`、
  `Onboarding.tsx`、新增成长/外观/收藏组件、`src/renderer/styles.css`。
- 桌宠任务：`src/renderer/App.tsx`、`src/renderer/pet.css`、`src/renderer/App.test.tsx`。
- Lead：`src/shared/**`、`src/preload/**`、`src/main/**`、`src/services/statistics/**`、
  `src/services/rewards/**`、外观与工具目录数据、文档汇总、最终验收。

## 9. 美术素材

统一来源：Microsoft Fluent Emoji（MIT）。下载地址形如：

`https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<Emoji Name>/3D/<emoji_snake>_3d.png`

- 角色 8 个：Cat、Dog、Rabbit、Penguin、Tiger、Turtle、Hedgehog、Chipmunk。
- 装扮 25 件：见 appearance.ts 中的 asset 路径；对应 Emoji 名称在任务说明中逐项列出。
- 装饰：Evergreen tree、Deciduous tree、Mushroom、Cherry blossom、Potted plant、Books、
  Teacup without handle、Cupcake、Crescent moon、Star、Sparkles、Shooting star、Sunset、
  Palm tree、Beach with umbrella、Water wave、Snowflake、House、Snowman、Light bulb、
  Open book、Night with stars、Cityscape at dusk、Bridge at night。
- 图标：Stopwatch、Memo、Alarm clock、Bar chart、Check box with check、Droplet、
  Hourglass not done、Tear-off calendar、Trophy、Calendar、Star、Sparkles、
  Cat、Gear、House、House with garden、Artist palette、Gift。

必须：保留透明 PNG（256×256），文件名 snake_case，登记 `docs/ASSET_GUIDE.md` 与
`docs/THIRD_PARTY_NOTICES.md`，在 `public/assets/licenses/` 保存 MIT 许可证文本与来源清单。
不得使用无许可证素材；不得下载影视/游戏角色。

## 10. 界面结构（界面任务）

导航保留 5 页：首页 / 成长 / 外观 / 工具 / 设置。

- 首页：今日数据、当前等级、下一个解锁、签到卡片、快捷入口、最近 7 天趋势。
- 成长：等级大卡 + 经验环、下一个解锁倒计时（还差多少 EXP / 等级）、分类解锁路线
  （伙伴/场景/装扮/工具，显示已解锁、当前、锁定与等级）、成就卡片（可领取）、签到。
- 外观：当前外观预览、角色/场景/饰品（五槽位）选择、合成工坊（材料兑换 + 高级合成，
  显示拥有数量和缺料状态）、收藏图鉴（25 件装扮 + 8 角色 + 8 场景，未解锁显示剪影）。
- 工具：8 个工具卡片，未解锁显示 Lock 与所需等级/进度；已解锁保留启停开关与面板。
- 设置：沿用现有功能，补充版本 1.1.0 与素材许可说明入口（文字即可）。

视觉：沿用暖色珊瑚 + 奶油底色，可新增卡片质感与徽章样式；图标使用下载的 PNG，
不要再用 `⌂ ✦ ◇ ◷ ⚙` 这类字符图标。保持响应式与 prefers-reduced-motion。

## 11. 桌宠（桌宠任务）

- 删除 `.pet-interaction` 覆盖按钮和 `interact` 状态/动画；不再有摸头跳跃动画。
- 整体使用 `pointerdown` 调用 `window.desktopApi.beginPetDrag()`，`pointerup/cancel`
  调用 `endPetDrag()`；点击（未拖动）播放一句随机台词气泡，双击打开控制中心，
  右键调用 `openPetMenu()`。
- 渲染场景（`SCENES` 的 theme/decorations）、角色（256 画布按 PET_ART_SIZE 缩放）、
  五槽位饰品（按 `ITEM_ANCHORS` 缩放定位）。
- 保留待机呼吸、专注、休息、睡眠、升级表现；动画关闭时全部静止。
- 语音气泡根据等级/专注/升级显示，5 秒自动消失，不阻挡鼠标。
- 新增 `src/renderer/pet.css`，不要修改 `styles.css`。

## 12. 验收

每个任务结束必须运行：

```text
npm run typecheck
npm run lint
npm run format:check
npm test
```

并手工检查自己的界面/服务。Lead 最后运行 `npm run package` 验证打包。
