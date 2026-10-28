# 美术资源目录

此目录存放桌宠、场景、装扮和界面图标等可分发资源。

| 目录          | 内容                                              | 数量 |
| ------------- | ------------------------------------------------- | ---- |
| `characters/` | 角色立绘（256×256 透明 PNG）                      | 8    |
| `items/`      | 五槽位装扮（头/颈/面/手持/背）                    | 25   |
| `decor/`      | 场景装饰，部分整幅插画素材同时作为场景背景图      | 24   |
| `icons/`      | 界面、工具与首页指标图标                          | 22   |
| `licenses/`   | Fluent Emoji MIT 许可证原文、逐文件来源与校验清单 | -    |

所有素材来自 **Microsoft Fluent Emoji**（MIT License，作者 Microsoft Corporation），
仓库：<https://github.com/microsoft/fluentui-emoji>。

- 许可证原文：`licenses/fluent-emoji-LICENSE.txt`
- 逐文件原始 URL 与 SHA-256：`licenses/sources.json`、`licenses/sources.md`
- 素材清单、修改说明与使用约定：`docs/ASSET_GUIDE.md`
- 第三方声明：`docs/THIRD_PARTY_NOTICES.md`

约定：

- 统一 256×256 RGBA PNG、透明背景、snake_case 文件名。
- 路径必须与 `src/data/catalogs/*.ts` 中的 `assets/...png` 引用完全一致，新增素材后运行
  `npm run validate:assets`。
- 旧手绘 SVG（`characters/cat.svg`、`characters/fox.svg`、`items/*.svg`、`scenes/*.svg`）
  已在 TASK-011 中删除，`scenes/` 目录不再使用。
