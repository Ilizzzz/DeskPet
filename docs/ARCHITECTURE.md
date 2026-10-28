# 架构概览

详细规划见 [DeskPet.md](../DeskPet.md)，本文只记录已经建立的边界及当前实现状态。

- `src/main` 管理透明桌宠窗口、托盘、自定义拖动、位置文件、系统通知和应用生命周期。
  窗口位置保存在 Electron 用户数据目录；旧版本窗口尺寸会在读取位置时按中心点换算。
- `src/main/ipc/features.ts` 注册成长、签到、成就、待办、倒计时、纪念日、喝水和新工具相关
  IPC，并按窗口主框架、参数长度校验来源；倒计时和喝水提醒由主进程定时检查后推送系统通知。
- `src/services/input-monitor` 管理原生全局键鼠监听、长按去重和 5 秒计数聚合。原生模块只在
  主进程按需加载；首次启用需用户确认，设置保存在用户数据目录。
- `src/preload` 使用 `contextBridge` 暴露平台信息、统计、外观、成长、工具和桌宠操作的固定接口。
- `src/renderer` 负责桌宠渲染（`App.tsx` + `pet.css`，`companion-*` 前缀）、控制中心
  （首页/成长/外观/工具/设置）、首次启动引导和便签窗口，不直接接触原生事件或用户数据。
- `src/shared` 存放共享的纯类型、奖励结构、协议、窗口尺寸常量和无副作用工具。
- `src/features`、`src/tools` 分别提供成长、解锁、签到、成就、合成、外观与独立工具业务。
- `src/data/catalogs` 保存角色、装扮、场景、锚点、解锁、成长、成就、合成和工具元数据；
  渲染进程与主进程只读取这些预定义内容，不在此写用户数据。
- `public/assets` 存放经授权登记的 Fluent Emoji 3D 素材；`docs/ASSET_GUIDE.md` 与
  `public/assets/licenses/` 记录来源与许可证，`npm run validate:assets` 校验引用完整性。

`src/services/statistics` 使用 Node 内置 SQLite 保存每日次数和活跃秒数，架构版本由
`user_version` 管理，当前为 15；按输入发生时的本地日期分组，批量写入。成长计算位于
`src/features/growth`，键鼠或专注经验、等级、等级奖励与自动解锁都在相关 SQLite 事务中保存。
15 版新增 `wallet.fragments`、`granted_unlocks`、`checkins`、`achievements`、`todos`、
`countdowns`、`anniversaries`、`water_state` 与 `appearance.face/hand/back`，并把旧角色与
旧装扮 ID 迁移到新目录。外观、库存、合成、场景、工具开关、番茄钟、便签、久坐状态、
每日总结和应用偏好使用同一用户数据库，但通过独立服务协作。

`TOOL_DEFINITIONS` 共 8 个工具，`ToolRegistryService` 按成长等级实时判断是否解锁，
数据库只保存用户启停偏好；`UNLOCKS` 汇总伙伴、场景、装扮和工具的等级关系。
`AchievementService` / `CheckinService` / `CraftingService` 均复用
`src/services/rewards` 的奖励发放逻辑，发奖与状态写入处于同一事务。

项目采用 Electron Forge 的 Vite 模板，保持渲染进程沙箱、上下文隔离和关闭 Node 集成。
原生模块保持为独立依赖，由 Forge 打包时解包加载。渲染进程通过 Preload 的固定 API
请求能力，主进程按窗口、主框架和参数校验来源。
