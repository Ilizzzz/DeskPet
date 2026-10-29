# 素材来源清单

机器可读的逐文件来源、作者、处理方式、SHA-256 与字节数见同目录
[`sources.json`](sources.json)，该 JSON 是发布校验的唯一数据源。

## Version 2 角色与装扮

- 8 个 `public/assets/characters/*.png` 与 30 个 `public/assets/items/*.png` 由
  DeskPet 项目使用 OpenAI ImageGen 专门生成。
- 角色按单张透明立绘生成；装扮按五张透明网格图生成后拆分、等比缩放并输出为
  256×256 RGBA PNG。
- 生成日期：2026-10-29。
- 完整提示词、网格顺序、处理和复核步骤见
  [`docs/design/ART_GENERATION.md`](../../../docs/design/ART_GENERATION.md)。

## Microsoft Fluent Emoji

- `public/assets/icons/` 与保留的 `public/assets/decor/` 来自
  [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)。
- 作者：Microsoft Corporation。
- 许可证：MIT；完整文本见 `fluent-emoji-LICENSE.txt`。
- 下载日期：2026-10-28；资源转存为 256×256 RGBA PNG。
