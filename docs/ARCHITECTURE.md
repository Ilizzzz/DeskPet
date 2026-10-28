# 架构概览

详细规划见 [DeskPet.md](../DeskPet.md)，本文只记录已经建立的边界及当前实现状态。

- `src/main` 管理透明桌宠窗口、托盘、位置文件及应用生命周期。窗口位置保存在 Electron 用户数据目录。
- `src/preload` 使用 `contextBridge` 暴露平台信息；桌宠交互区和点击穿透由主进程控制。
- `src/renderer` 负责桌宠占位界面；页面不直接访问 Electron 系统 API 或数据库。
- `src/shared` 存放共享的纯类型、协议和无副作用工具。
- `src/features`、`src/tools`、`src/services` 分别预留游戏业务、独立工具和共享底层服务。
- `public/assets` 存放经过授权审核的可分发资源；当前只有目录说明，没有正式素材。

数据库、原生输入监听和游戏业务尚未接入。项目采用 Electron Forge 的 Vite 模板，保持渲染进程沙箱、上下文隔离和关闭 Node 集成。
