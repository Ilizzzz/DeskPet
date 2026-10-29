# DeskPet 开发规范

- 开始任务前阅读 `DeskPet.md`、`docs/development/DEVELOPMENT_MANUAL.md`、`docs/development/ARCHITECTURE.md`、`TASKS.md` 和相关代码及测试；以项目文档和当前任务为依据。
- 每次只修改当前任务所需范围，保留用户已有文件和未提交的更改；不要提前实现后续模块。
- 使用 TypeScript 严格模式，代码、文件和标识符使用英文；重要业务规则和不直观的决策使用简洁中文注释，避免重复代码含义。
- 主进程负责窗口和系统能力，渲染进程负责界面；共享目录只放双方都能使用的类型或纯逻辑，不依赖 Electron 或 UI。
- 所有跨进程能力必须经过 Preload 的 `contextBridge`，只暴露明确、最小化的 API，校验 IPC 请求来源和参数；禁止直接暴露 `ipcRenderer`，禁止关闭上下文隔离、沙箱或启用渲染进程 Node 集成来绕过问题。
- 按功能和职责拆分文件，避免将无关功能堆放在 `App.tsx`；功能模块之间通过明确接口协作，不相互依赖内部实现。
- 游戏业务、生产力工具、共享服务分别放在 `src/features`、`src/tools`、`src/services`；已审核的美术资源放在 `public/assets`；共享纯类型和工具放在 `src/shared`；文档放在 `docs`。用户数据必须存放在 Electron 用户数据目录。
- 变更后运行相关的类型检查、ESLint、格式检查和 Vitest；涉及窗口或构建时还须验证实际启动和打包。无法执行的检查须明确说明原因，不得宣称已验证。
- 不引入不必要的服务或依赖；原生依赖、打包和安全问题应先定位原因，不通过降低安全配置掩盖。
- 更新 `TASKS.md` 和必要的 `README.md`，完成当前任务后停止，除非用户明确要求继续。
