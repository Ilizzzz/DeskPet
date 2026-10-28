# 第三方依赖与许可证

DeskPet 自有源代码和原创 SVG 资源按项目仓库的许可条款分发。主要第三方依赖如下：

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
