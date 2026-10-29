# 美术资源指南（Version 2）

Version 2 的角色与装扮使用专门为 DeskPet 生成的二次元 2D 透明 PNG；界面图标继续使用
Microsoft Fluent Emoji（MIT）。逐文件来源、处理方式、字节数与 SHA-256 以
[`public/assets/licenses/sources.json`](../../public/assets/licenses/sources.json) 为准，生成方法与提示词见
[`ART_GENERATION.md`](ART_GENERATION.md)。

## 资源契约

- 正式素材必须是 256×256、8-bit、非交错 RGBA PNG，含透明像素与有效画面。
- 文件名使用 snake_case，目录数据中的 `assets/...png` 必须能在 `public/` 下找到。
- 角色、装扮和地面共用透明画布，不允许用方形底图遮挡桌面。
- `src/data/catalogs/anchors.ts` 保存角色槽位锚点和单件素材校正；用户设置保存在数据库
  `item_adjustments` 表。桌宠与控制中心预览必须调用同一个 `resolvedAnchor`。
- 新增或替换素材后运行 `node scripts/update-v2-art-registry.mjs` 和
  `npm run validate:assets`，再用全角色合成预览检查穿戴位置。

## V2 原创生成角色（8）

| asset_id   | local_path                              |
| ---------- | --------------------------------------- |
| `cat`      | `public/assets/characters/cat.png`      |
| `chipmunk` | `public/assets/characters/chipmunk.png` |
| `dog`      | `public/assets/characters/dog.png`      |
| `hedgehog` | `public/assets/characters/hedgehog.png` |
| `penguin`  | `public/assets/characters/penguin.png`  |
| `rabbit`   | `public/assets/characters/rabbit.png`   |
| `tiger`    | `public/assets/characters/tiger.png`    |
| `turtle`   | `public/assets/characters/turtle.png`   |

## V2 原创生成装扮（30）

| 槽位 | local_path                                                                                                                                                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 头部 | `public/assets/items/cap_blue.png`、`public/assets/items/flower_crown.png`、`public/assets/items/hat_woman.png`、`public/assets/items/headphone_music.png`、`public/assets/items/hat_top.png`、`public/assets/items/cap_graduate.png`、`public/assets/items/crown_gold.png`、`public/assets/items/beret_artist.png` |
| 颈部 | `public/assets/items/scarf_red.png`、`public/assets/items/bell_collar.png`、`public/assets/items/ribbon_pink.png`、`public/assets/items/tie_necktie.png`、`public/assets/items/ribbon_reminder.png`、`public/assets/items/collar_starlight.png`                                                                     |
| 面部 | `public/assets/items/glasses_round.png`、`public/assets/items/sunglasses_cool.png`、`public/assets/items/goggles_sky.png`、`public/assets/items/monocle_moon.png`                                                                                                                                                   |
| 手持 | `public/assets/items/balloon_red.png`、`public/assets/items/bouquet_flower.png`、`public/assets/items/wand_magic.png`、`public/assets/items/party_popper.png`、`public/assets/items/crystal_ball.png`、`public/assets/items/lantern_star.png`                                                                       |
| 背部 | `public/assets/items/backpack_school.png`、`public/assets/items/handbag_fashion.png`、`public/assets/items/umbrella_closed.png`、`public/assets/items/rocket_jet.png`、`public/assets/items/wing_angel.png`、`public/assets/items/cape_night.png`                                                                   |

## Microsoft Fluent Emoji

界面和工具图标仍来自 [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)，
许可证为 MIT，完整文本见
[`public/assets/licenses/fluent-emoji-LICENSE.txt`](../../public/assets/licenses/fluent-emoji-LICENSE.txt)。
当前目录数据引用以下图标：

`public/assets/icons/achievement.png`、`public/assets/icons/anniversary.png`、
`public/assets/icons/app.png`、`public/assets/icons/appearance.png`、
`public/assets/icons/checkin.png`、`public/assets/icons/clock.png`、
`public/assets/icons/coins.png`、`public/assets/icons/countdown.png`、
`public/assets/icons/focus.png`、`public/assets/icons/fragments.png`、
`public/assets/icons/growth.png`、`public/assets/icons/health.png`、
`public/assets/icons/home.png`、`public/assets/icons/keyboard.png`、
`public/assets/icons/levelup.png`、`public/assets/icons/mouse.png`、
`public/assets/icons/notes.png`、`public/assets/icons/settings.png`、
`public/assets/icons/summary.png`、`public/assets/icons/todo.png`、
`public/assets/icons/tools.png`、`public/assets/icons/water.png`。

## 校验

```powershell
node scripts/update-v2-art-registry.mjs
npm run validate:assets
```

校验脚本检查目录引用、PNG 签名、尺寸、位深、透明通道、画面非空、来源登记和本指南中的
路径。视觉验收还需检查 8 个伙伴的五个槽位、用户微调、关键动作、25%–125% 缩放及地毯
透明边缘。
