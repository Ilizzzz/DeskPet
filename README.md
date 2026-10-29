# DeskPet

DeskPet 是面向 Windows 10/11 x64 的桌面宠物应用，包含成长收藏、装扮、键鼠活动统计和
轻量生产力工具。当前版本为 `2.0.0`。

## 当前功能

- 8 个二次元 2D 伙伴、30 件五槽位装扮、7 款脚下地毯与透明模式。
- 每 1,500 次有效键盘输入获得 1 件公开概率装扮；掉落进度跨批次、跨日和重启保存。
- 星星币兑换、重复装扮分解、最后一件保护、心愿装扮、曾获得图鉴和历史碎片转换。
- 外观页可按“伙伴 + 饰品”手动微调位置和大小，不同伙伴分别保存。
- 25% / 50% / 75% / 100% / 125% 桌宠缩放、边缘吸附与键鼠动作反馈。
- 今日总结、番茄钟、便签、久坐提醒、待办、喝水、倒计时和纪念日。

完整产品规则见 [DeskPet.md](DeskPet.md)，任务状态见 [TASKS.md](TASKS.md)，文档索引见
[docs/README.md](docs/README.md)。

## 开发环境

- Windows 10/11 x64。
- Node.js 24 LTS，最低支持 Node.js 22.13.0。
- npm 11 或兼容版本。

```powershell
npm ci
npm start
```

## 质量检查

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run validate:assets
```

## 打包

```powershell
npm run package
npm run check:package
npm run make
```

产物位于 `out/`。发布前还需把 `out/DeskPet-win32-x64` 复制到项目目录外，运行
`DeskPet.exe --input-hook-smoke-test`，避免开发目录中的依赖掩盖打包缺失。

如果 Electron 下载失败，可只在当前 PowerShell 会话设置镜像后重试：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
```

## 目录

- `src/main`：窗口、托盘、系统能力和 IPC 校验。
- `src/preload`：通过 `contextBridge` 暴露最小化 API。
- `src/renderer`：桌宠和控制中心界面。
- `src/features`：成长、外观、成就和背包经济。
- `src/tools`：生产力工具。
- `src/services`：统计、设置、奖励和输入监听等共享服务。
- `src/data/catalogs`：角色、装扮、锚点、地毯、成长与经济配置。
- `public/assets`：经登记的发布资源。
- `docs`：按开发、产品、设计、发布、法律和历史分类的文档。

渲染进程保持沙箱和上下文隔离，不启用 Node 集成。跨进程写操作均由主进程校验并写入
Electron 用户数据目录中的 SQLite 数据库。
