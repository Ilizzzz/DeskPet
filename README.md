# DeskPet

Windows 桌面宠物项目，当前处于基础工程阶段。产品需求与开发规划见 `DeskPet.md`，任务范围和进度见 `TASKS.md`。

## 开发环境

- Windows 10/11 x64；本轮在 Windows x64 上验证。
- Node.js 24 LTS 和 npm（本轮使用 Node.js 24.15.0、npm 11.12.1）。依赖最低要求为 Node.js 22.13.0；建议使用 Node.js 24。
- 首次运行和打包需要网络下载 Electron Windows 二进制文件。网络使用系统代理而 Node 未自动识别时，请在当前 PowerShell 会话中配置相应的 `HTTPS_PROXY`、`HTTP_PROXY` 和 `NODE_USE_ENV_PROXY=1`，再重试；不要将代理凭据提交到项目中。

## 安装与运行

```powershell
npm ci
npm start
```

## 检查和测试

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
```

`npm run format` 可自动格式化项目文件。

## 打包

```powershell
npm run package
```

生成的 Windows 应用目录位于 `out/`。`npm run make` 可进一步生成 Squirrel 安装包；此命令是否验证，以 `TASKS.md` 的记录为准。

## 架构

- `src/main`：窗口生命周期及系统能力。
- `src/preload`：经 `contextBridge` 暴露最小化桌面接口。
- `src/renderer`：React 界面。
- `src/shared`：跨进程共享类型。
- `src/features`、`src/tools`、`src/services`：预留的游戏功能、生产力工具和共享服务目录。
- `public/assets`、`docs`：正式美术资源与项目文档。

本轮未实现全局输入监听、SQLite 或游戏业务功能。渲染进程启用了沙箱和上下文隔离，并关闭 Node 集成。
