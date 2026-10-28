# 架构概览

详细规划见 [DeskPet.md](../DeskPet.md)，本文只记录已经建立的边界及当前实现状态。

- `src/main` 管理透明桌宠窗口、托盘、位置文件及应用生命周期。窗口位置保存在 Electron 用户数据目录。
- `src/services/input-monitor` 管理原生全局键鼠监听、长按去重和 5 秒计数聚合。原生模块只在主进程按需加载；首次启用需用户确认，设置保存在用户数据目录。
- `src/preload` 使用 `contextBridge` 暴露平台信息和固定统计操作；主进程校验统计窗口、主框架和请求参数。
- `src/renderer` 负责桌宠占位界面和统计窗口，不直接接触原生事件或用户数据。
- `src/shared` 存放共享的纯类型、协议和无副作用工具。
- `src/features`、`src/tools` 分别预留游戏业务和独立工具。
- `public/assets` 存放经过授权审核的可分发资源；当前只有目录说明，没有正式素材。

`src/services/statistics` 使用 Node 内置 SQLite 保存每日计数，架构版本由 `user_version` 管理；按输入发生时的本地日期分组，批量写入。游戏业务尚未接入。项目采用 Electron Forge 的 Vite 模板，保持渲染进程沙箱、上下文隔离和关闭 Node 集成。原生模块保持为独立依赖，由 Forge 打包时解包加载。
