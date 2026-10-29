# 第三方声明

## Microsoft Fluent Emoji

DeskPet 的界面图标来自
[Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)。

- 作者：Microsoft Corporation
- 许可证：MIT
- 许可证原文：`public/assets/licenses/fluent-emoji-LICENSE.txt`
- 逐文件来源、处理方式和 SHA-256：`public/assets/licenses/sources.json`

Version 2 的桌宠角色与装扮不是 Fluent Emoji：它们由项目使用 OpenAI ImageGen 生成，处理
步骤与提示词见 [`../design/ART_GENERATION.md`](../design/ART_GENERATION.md)。

## npm 依赖

应用使用 Electron、React、TypeScript、Vite、Vitest、Electron Forge、`uiohook-napi` 等
开源依赖。各包许可证以安装版本随附的 `package.json` 和许可证文件为准；发布前应通过包
管理器或许可证审计工具复核依赖树。

## 新增资源要求

新增第三方资源必须具备明确的再分发许可，并同步：

1. 登记 `public/assets/licenses/sources.json`；
2. 更新 [`../design/ASSET_GUIDE.md`](../design/ASSET_GUIDE.md)；
3. 保存所需许可证原文和署名；
4. 运行 `npm run validate:assets`。

不得使用无法确认来源或许可的影视、游戏、动漫角色素材。
