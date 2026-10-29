# 第三方依赖与许可证

DeskPet 自有源代码和原创资源按项目仓库的许可条款分发。主要第三方依赖如下：

| 组件                      | 当前版本 | 许可证     |
| ------------------------- | -------: | ---------- |
| Electron                  |   45.1.0 | MIT        |
| React / React DOM         |   19.3.1 | MIT        |
| uiohook-napi              |    1.5.5 | MIT        |
| electron-squirrel-startup |    1.0.1 | Apache-2.0 |
| Electron Forge            |    8.0.1 | MIT        |
| Vite                      |    8.3.5 | MIT        |
| TypeScript                |    6.0.3 | Apache-2.0 |
| Vitest                    |    5.0.5 | MIT        |

完整许可证文本以各依赖包随附的 `LICENSE`、`LICENSES` 或 `NOTICE` 文件为准。Electron 发行包还包含 Chromium、Node.js 及其第三方组件的许可证清单。

正式发布构建必须使用锁定的 `package-lock.json`，并在升级依赖后重新核对本文件。

## 美术资源

Version 2 的角色立绘（`characters/`）与装扮（`items/`）由项目使用 OpenAI ImageGen 专门
生成，不再复用 Fluent Emoji 3D 角色与装扮。提示词、透明网格拆分、尺寸处理与复核过程见
`docs/V2_ART_GENERATION_GUIDE.md`，逐文件 SHA-256 见 `public/assets/licenses/sources.json`。

界面图标（`icons/`）和保留但不再由 V2 场景引用的装饰（`decor/`）来自
**Microsoft Fluent Emoji**。

- 来源仓库：<https://github.com/microsoft/fluentui-emoji>
- 作者：Microsoft Corporation
- 许可证：MIT License
- 下载日期：2026-10-28
- 许可证原文：`public/assets/licenses/fluent-emoji-LICENSE.txt`
- 逐文件来源与 SHA-256：`public/assets/licenses/sources.json`（人读版 `sources.md`）
- 素材清单与修改说明：`docs/ASSET_GUIDE.md`
- 修改说明：将使用到的 PNG 转存为 RGBA 并统一校验为 256×256。

```text
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

发布构建必须携带上述许可证文本。新增或替换素材时，除更新本文件外，还须同步
`docs/ASSET_GUIDE.md`、`public/assets/licenses/sources.json`，并运行 `npm run validate:assets`。
