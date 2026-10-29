# 开发手册

## 开始任务

依次阅读：

1. [`AGENTS.md`](../../AGENTS.md)
2. [`DeskPet.md`](../../DeskPet.md)
3. [`TASKS.md`](../../TASKS.md)
4. [架构概览](ARCHITECTURE.md)
5. 当前功能的代码与测试

设计和代码冲突时，以当前任务、当前代码和测试为准，并同步修正文档。

## 常用命令

```powershell
npm ci
npm start
npm run typecheck
npm run lint
npm run format:check
npm test
npm run validate:assets
npm run package
npm run check:package
npm run make
```

## 实现原则

- TypeScript 使用严格模式；代码、文件和标识符使用英文。
- 主进程管理系统能力，渲染进程管理界面，共享层只放纯类型和纯逻辑。
- 所有 Electron 能力经过 Preload 的 `contextBridge`，主进程校验来源和参数。
- 游戏、工具、共享服务、只读目录和资源分别放在既定目录，不把业务集中到单个组件。
- 数据库迁移只追加版本；用户数据写入 Electron 用户数据目录。
- 余额、库存、掉落和奖励等关联变化使用同一 SQLite 事务。
- 不以关闭沙箱、上下文隔离或启用渲染进程 Node 集成解决问题。
- 保留用户已有改动；只修改当前任务所需范围。

## 验证级别

| 变更             | 最低验证                                            |
| ---------------- | --------------------------------------------------- |
| 文档             | Prettier、链接检查、`git diff --check`              |
| 纯逻辑           | 类型、Lint、格式、相关 Vitest                       |
| 数据迁移         | 纯逻辑检查 + 新库、旧库迁移、重启与重置测试         |
| 渲染界面         | 自动化检查 + 实际启动和视觉检查                     |
| 主进程/窗口/构建 | 全部自动化 + 启动、打包、包内容检查、项目外冒烟测试 |
| 美术资源         | 全部自动化 + `validate:assets` + 透明窗口人工检查   |

无法执行的项目必须记录原因，不能写成已通过。

## 提交

- 按功能、资源、文档等逻辑分批提交。
- 提交前确认工作区只包含本任务文件，并运行 `git diff --check`。
- 不提交 `out/`、临时缓存、代理凭据或真实用户数据。
- 完成后更新 `TASKS.md` 和受影响的说明文档。
