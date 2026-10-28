# 架构概览

详细规划见 [DeskPet.md](../DeskPet.md)，本文只记录已经建立的边界及当前实现状态。

- `src/main` 管理 Electron 窗口和应用生命周期；后续系统能力和 IPC 处理由主进程负责。
- `src/preload` 使用 `contextBridge` 暴露最小接口；现阶段仅提供平台信息，不暴露任意 IPC 或 Node 能力。
- `src/renderer` 负责 React 界面；页面不直接访问 Electron 系统 API 或数据库。
- `src/shared` 存放双方共享的纯类型、协议和无副作用工具。后续跨进程请求必须验证来源和参数。
- `src/features`、`src/tools`、`src/services` 分别预留游戏业务、独立工具和共享底层服务。当前尚未实现这些功能。
- `src/data/catalogs` 预留静态内容定义；用户数据将来应保存在 Electron 用户数据目录，而不是程序安装或源代码目录。
- `public/assets` 存放经过授权审核的可分发资源；当前只有目录说明，没有正式素材。

当前窗口是用于验证基础工程的普通窗口，不是产品规划中的透明 PetWindow。数据库、原生输入监听、托盘及业务服务均尚未接入。

项目采用 Electron Forge 的 Vite 模板，保持渲染进程沙箱、上下文隔离和关闭 Node 集成；安全配置和进程职责不得为了便捷而削弱。
