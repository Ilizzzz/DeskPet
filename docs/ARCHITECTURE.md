# 架构概览

详细规划见 [DeskPet.md](../DeskPet.md)，本文只记录已经建立的边界及当前实现状态。

- `src/main` 管理透明桌宠窗口、托盘、位置文件及应用生命周期。窗口位置保存在 Electron 用户数据目录。
- `src/services/input-monitor` 管理原生全局键鼠监听、长按去重和 5 秒计数聚合。原生模块只在主进程按需加载；首次启用需用户确认，设置保存在用户数据目录。
- `src/preload` 使用 `contextBridge` 暴露平台信息、统计、外观与工具的固定操作；主进程校验窗口、主框架和请求参数。
- `src/renderer` 负责桌宠、控制中心、工具箱、首次启动引导和便签窗口，不直接接触原生事件或用户数据。
- `src/shared` 存放共享的纯类型、协议和无副作用工具。
- `src/features`、`src/tools` 分别提供成长、外观与独立工具业务。
- `public/assets` 存放可分发资源；当前角色、饰品和森林场景 SVG 均为本项目原创文件。

`src/services/statistics` 使用 Node 内置 SQLite 保存每日次数和活跃秒数，架构版本由 `user_version` 管理，当前为版本 14；按输入发生时的本地日期分组，批量写入。成长计算位于 `src/features/growth`，键鼠或专注经验、等级与奖励均在相关 SQLite 事务中保存。外观、库存、合成、场景、工具开关、番茄钟、便签、久坐状态、每日总结和应用偏好使用同一用户数据库，但通过独立服务协作。

角色、物品、场景、成长规则和工具元数据位于 `src/data/catalogs`。角色状态机和穿戴/合成属于 `src/features`；番茄钟、便签、久坐提醒、今日总结和工具注册属于 `src/tools`。渲染进程只通过 Preload 的固定 API 请求这些能力，主进程按窗口、主框架和参数校验来源。

项目采用 Electron Forge 的 Vite 模板，保持渲染进程沙箱、上下文隔离和关闭 Node 集成。原生模块保持为独立依赖，由 Forge 打包时解包加载。
