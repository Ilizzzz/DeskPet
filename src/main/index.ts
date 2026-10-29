import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  powerMonitor,
  screen,
  shell,
  Tray,
} from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { readPosition, restorePosition, shiftForWindowResize } from './window-position';
import { TRAY_ICON } from './tray-icon';
import { isInsidePet } from './pet-hit-test';
import { resolveInstallInfo } from './install-info';
import { InputMonitor } from '../services/input-monitor/input-monitor';
import { StatisticsStore } from '../services/statistics/statistics-store';
import type { DailyStatistics } from '../shared/types/statistics';
import {
  readInputPreferences,
  writeInputPreferences,
} from '../services/input-monitor/input-preferences';
import { PET_WINDOW_SIZE } from '../shared/constants/pet';
import { registerFeatureIpc } from './ipc/features';

let petScale: 25 | 50 | 75 | 100 | 125 = 100;
let petEdge: 'free' | 'bottom' | 'left' | 'right' = 'free';
function petWindowSize(): { width: number; height: number } {
  const size = Math.round((PET_WINDOW_SIZE * petScale) / 100);
  return { width: size, height: size };
}
/** 旧版本窗口尺寸，用于把保存的位置换算成新窗口的中心点。 */
const LEGACY_PET_WINDOW_SIZE = 180;
let petWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let statisticsWindow: BrowserWindow | undefined;
const noteWindows = new Map<number, BrowserWindow>();
let statisticsStore: StatisticsStore | undefined;
const pending: DailyStatistics[] = [];
let quitting = false;
let clickThrough = false;
let alwaysOnTop = true;
let ignoringMouse = true;
let inputPreferences = { consentGiven: false, enabled: false };
/** 最近一次启动键鼠监听失败的原因；用于设置页提示和托盘状态。 */
let inputError: string | null = null;
let systemSuspended = false;
let petDragging = false;
let petDragTimer: NodeJS.Timeout | undefined;
const inputMonitor = new InputMonitor(
  (counts, days) => {
    pending.push(...days);
    let drops: import('../shared/types/economy').DropEvent[] = [];
    try {
      drops = persistPending();
    } catch (error) {
      console.error('无法保存统计数据。', error);
      dialog.showErrorBox('统计保存失败', '统计数据暂存在内存中，请检查磁盘空间和用户数据目录。');
      setImmediate(() => {
        void setInputEnabled(false);
      });
    }
    try {
      if (
        counts.keyboardCount + counts.mouseCount > 0 &&
        statisticsStore?.tools.isEnabled('sedentary')
      )
        statisticsStore.sedentary.recordActivity();
    } catch (error) {
      console.error('无法更新久坐活动状态。', error);
    }
    // 即时动作由单次活动脉冲驱动；批次这里只发送掉落，避免每五秒重复播放一次。
    if (drops.length > 0 && petWindow && !petWindow.isDestroyed())
      petWindow.webContents.send('pet:activity', { keyboard: 0, mouse: 0, drops });
    updateTray();
  },
  (activity) => {
    if (!petWindow || petWindow.isDestroyed()) return;
    petWindow.webContents.send('pet:activity', {
      keyboard: activity === 'keyboard' ? 1 : 0,
      mouse: activity === 'mouse' ? 1 : 0,
      drops: [],
    });
  },
);
function persistPending(): import('../shared/types/economy').DropEvent[] {
  if (!statisticsStore) throw new Error('统计数据库不可用');
  const drops: import('../shared/types/economy').DropEvent[] = [];
  while (pending.length) {
    drops.push(...statisticsStore.add(pending[0]));
    pending.shift();
  }
  return drops;
}
function flushStatistics(): void {
  inputMonitor.flush();
  persistPending();
}

function inputPreferencesPath(): string {
  return path.join(app.getPath('userData'), 'input-preferences.json');
}

function appSettingsSnapshot() {
  return {
    ...statisticsStore!.preferences.get(),
    appVersion: app.getVersion(),
    canLaunchAtLogin: app.isPackaged,
    inputTracking: {
      consentGiven: inputPreferences.consentGiven,
      enabled: inputPreferences.enabled,
      running: inputMonitor.isRunning,
      error: inputError,
    },
  };
}

function applyLaunchAtLogin(enabled: boolean): void {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
}

/**
 * 记录监听失败时的诊断信息，方便远程支持。
 *
 * 只写平台、架构、资源路径和错误栈，不记录任何按键内容。
 */
function logInputFailure(error: unknown): string {
  const file = path.join(app.getPath('userData'), 'input-diagnostics.log');
  try {
    const header = [
      `time=${new Date().toISOString()}`,
      `version=${app.getVersion()}`,
      `platform=${process.platform}`,
      `arch=${process.arch}`,
      `packaged=${app.isPackaged}`,
      `resources=${process.resourcesPath}`,
      `userData=${app.getPath('userData')}`,
    ].join('\n');
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
    fs.appendFileSync(file, `${header}\nerror=${detail}\n\n`, 'utf8');
  } catch (logError) {
    console.error('无法写入监听诊断日志。', logError);
  }
  return file;
}

/**
 * 卸载后清理残留：Squirrel 的 Update.exe 会删除程序主体，但可能留下 Update.exe 和
 * `.dead` 目录；这里在应用退出后用独立进程重试删除，避免“卸载完还留一个文件夹”。
 * 只在用户确认卸载后调用，路径均来自主进程自身解析结果。
 */
function scheduleRemoval(paths: string[]): void {
  if (paths.length === 0) return;
  const list = paths.map((target) => `'${target.replaceAll("'", "''")}'`).join(', ');
  const script = [
    'Start-Sleep -Seconds 5',
    `$paths = @(${list})`,
    'for ($attempt = 0; $attempt -lt 30; $attempt++) {',
    '  $remaining = @($paths | Where-Object { Test-Path -LiteralPath $_ })',
    '  if ($remaining.Count -eq 0) { break }',
    '  foreach ($path in $remaining) {',
    '    try { Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop } catch {}',
    '  }',
    '  Start-Sleep -Seconds 1',
    '}',
  ].join('; ');
  try {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      { detached: true, stdio: 'ignore', windowsHide: true },
    );
    child.unref();
  } catch (error) {
    console.error('无法启动卸载清理进程。', error);
  }
}

async function setInputEnabled(enabled: boolean, interactive = true): Promise<void> {
  if (enabled && !inputPreferences.consentGiven) {
    const response = dialog.showMessageBoxSync({
      type: 'info',
      title: '启用键鼠次数统计',
      message: 'DeskPet 将监听全局键盘按下和鼠标点击。',
      detail:
        '只汇总次数；不保存按键内容、输入顺序、鼠标位置或轨迹。可随时从托盘或 Ctrl+Alt+Shift+P 暂停。每日汇总保存在本机，可在统计窗口中导出或清除。',
      buttons: ['启用统计', '保持暂停'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (response !== 0) return;
  }
  const next = { consentGiven: inputPreferences.consentGiven || enabled, enabled };
  try {
    // 先保存用户选择；写入失败时不启用全局监听。
    writeInputPreferences(inputPreferencesPath(), next);
    inputPreferences = next;
    if (enabled && !systemSuspended) await inputMonitor.start();
    else inputMonitor.stop();
    inputError = null;
  } catch (error) {
    inputMonitor.stop();
    inputPreferences = { ...inputPreferences, enabled: false };
    inputError = error instanceof Error ? error.message : String(error);
    try {
      writeInputPreferences(inputPreferencesPath(), inputPreferences);
    } catch (saveError) {
      console.error('无法保存监听暂停状态。', saveError);
    }
    const logFile = logInputFailure(error);
    console.error('键鼠监听不可用。', error);
    // 不阻塞桌宠和工具的启动流程；只有用户主动启用时才弹出温和提示。
    if (interactive) {
      void dialog.showMessageBox({
        type: 'warning',
        title: '键鼠统计暂不可用',
        message: '统计没有启动，桌宠和工具箱仍可正常使用。',
        detail:
          `原因：${inputError}\n\n` +
          '可以稍后在“设置 → 隐私与键鼠统计”重新启用。如果持续失败，请检查杀毒软件是否拦截了原生模块，或将以下诊断日志发给开发者：\n' +
          logFile,
        buttons: ['知道了'],
        noLink: true,
      });
    }
  }
  updateTray();
}

function positionPath(): string {
  return path.join(app.getPath('userData'), 'window-position.json');
}

/** 读取当前安装形态；Squirrel 安装版才有 Update.exe。 */
function currentInstallInfo() {
  return resolveInstallInfo({
    isPackaged: app.isPackaged,
    executablePath: process.execPath,
    version: app.getVersion(),
    userDataPath: app.getPath('userData'),
  });
}

/** 卸载前按用户选择清除本地数据；只清理业务数据，不删除正在使用的数据库文件。 */
function clearLocalDataForUninstall(): void {
  try {
    inputMonitor.stop();
    persistPending();
    statisticsStore?.resetUserData();
  } catch (error) {
    console.error('卸载前清除用户数据失败。', error);
  }
  inputError = null;
  inputPreferences = { consentGiven: false, enabled: false };
  try {
    writeInputPreferences(inputPreferencesPath(), inputPreferences);
  } catch (error) {
    console.error('卸载前保存监听设置失败。', error);
  }
  for (const file of [
    positionPath(),
    path.join(app.getPath('userData'), 'input-diagnostics.log'),
  ]) {
    try {
      fs.rmSync(file, { force: true });
    } catch (error) {
      console.error('卸载前删除本地文件失败。', error);
    }
  }
}
function loadPosition() {
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(positionPath(), 'utf8'));
    let point = readPosition(raw);
    // 旧版本窗口更小，按中心点对齐，避免升级后桌宠跳到别处。
    if (point && typeof raw === 'object' && raw !== null) {
      const savedSize = (raw as { size?: unknown }).size;
      point = shiftForWindowResize(
        point,
        typeof savedSize === 'number' ? savedSize : LEGACY_PET_WINDOW_SIZE,
        petWindowSize().width,
      );
    }
    return restorePosition(
      point,
      screen.getAllDisplays().map((d) => d.workArea),
      petWindowSize(),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.warn('无法读取桌宠位置，使用默认位置。', error);
    return undefined;
  }
}
function savePosition(window: BrowserWindow): void {
  try {
    const [x, y] = window.getPosition();
    fs.writeFileSync(
      positionPath(),
      JSON.stringify({ x, y, size: window.getBounds().width }),
      'utf8',
    );
  } catch (error) {
    console.error('无法保存桌宠位置。', error);
  }
}

/**
 * 桌宠拖动不再使用窗口原生的 -webkit-app-region，改为主进程跟随光标移动窗口。
 *
 * 原因是原生拖动区域会吞掉鼠标事件，导致拖动与点击/双击互相抢状态；
 * 由主进程统一跟踪也能保证拖动过程中不会触发点击穿透。
 */
function beginPetDrag(): void {
  if (!petWindow || petWindow.isDestroyed() || petDragging) return;
  petDragging = true;
  petWindow.setIgnoreMouseEvents(false);
  ignoringMouse = false;
  const cursor = screen.getCursorScreenPoint();
  const [windowX, windowY] = petWindow.getPosition();
  const offsetX = cursor.x - windowX;
  const offsetY = cursor.y - windowY;
  if (petDragTimer) clearInterval(petDragTimer);
  petDragTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) return;
    const point = screen.getCursorScreenPoint();
    petWindow.setPosition(Math.round(point.x - offsetX), Math.round(point.y - offsetY));
  }, 8);
}
function endPetDrag(): void {
  if (!petDragging) return;
  petDragging = false;
  if (petDragTimer) {
    clearInterval(petDragTimer);
    petDragTimer = undefined;
  }
  if (petWindow && !petWindow.isDestroyed()) {
    snapPetToEdge(petWindow);
    savePosition(petWindow);
  }
}

function sendPetPlacement(): void {
  if (petWindow && !petWindow.isDestroyed())
    petWindow.webContents.send('pet:activity', { keyboard: 0, mouse: 0, drops: [], edge: petEdge });
}

function sendPetPreferences(): void {
  if (!petWindow || petWindow.isDestroyed() || !statisticsStore) return;
  const preferences = statisticsStore.preferences.get();
  petWindow.webContents.send('pet:activity', {
    keyboard: 0,
    mouse: 0,
    drops: [],
    animationsEnabled: preferences.animationsEnabled,
    inputReactionsEnabled: preferences.inputReactionsEnabled,
  });
}

function snapPetToEdge(window: BrowserWindow): void {
  const preferences = statisticsStore?.preferences.get();
  if (!preferences?.edgeSnapEnabled) {
    petEdge = 'free';
    sendPetPlacement();
    return;
  }
  const bounds = window.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const threshold = Math.max(10, Math.round((24 * petScale) / 100));
  const distances = {
    left: Math.abs(bounds.x - area.x),
    right: Math.abs(area.x + area.width - (bounds.x + bounds.width)),
    bottom: Math.abs(area.y + area.height - (bounds.y + bounds.height)),
  };
  const nearest = (Object.entries(distances) as ['left' | 'right' | 'bottom', number][]).sort(
    (left, right) => left[1] - right[1],
  )[0];
  if (nearest[1] > threshold) petEdge = 'free';
  else {
    petEdge = nearest[0];
    if (petEdge === 'left') window.setPosition(area.x, bounds.y);
    else if (petEdge === 'right') window.setPosition(area.x + area.width - bounds.width, bounds.y);
    else window.setPosition(bounds.x, area.y + area.height - bounds.height);
  }
  sendPetPlacement();
}

function applyPetScale(nextScale: 25 | 50 | 75 | 100 | 125): void {
  petScale = nextScale;
  if (!petWindow || petWindow.isDestroyed()) return;
  const oldBounds = petWindow.getBounds();
  const size = petWindowSize();
  const area = screen.getDisplayMatching(oldBounds).workArea;
  const x = Math.max(
    area.x,
    Math.min(
      Math.round(oldBounds.x + (oldBounds.width - size.width) / 2),
      area.x + area.width - size.width,
    ),
  );
  const y = Math.max(
    area.y,
    Math.min(
      Math.round(oldBounds.y + (oldBounds.height - size.height) / 2),
      area.y + area.height - size.height,
    ),
  );
  petWindow.setBounds({ x, y, ...size });
  petWindow.webContents.setZoomFactor(nextScale / 100);
  snapPetToEdge(petWindow);
  savePosition(petWindow);
}

/** 显示器、DPI 或任务栏工作区变化后，把桌宠重新限制到仍然存在的工作区。 */
function reflowPetForDisplays(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  const areas = screen.getAllDisplays().map((display) => display.workArea);
  let position = restorePosition(bounds, areas, {
    width: bounds.width,
    height: bounds.height,
  });
  if (!position) {
    const display = screen.getDisplayNearestPoint({
      x: bounds.x + Math.round(bounds.width / 2),
      y: bounds.y + Math.round(bounds.height / 2),
    });
    position = {
      x: Math.max(
        display.workArea.x,
        Math.min(bounds.x, display.workArea.x + display.workArea.width - bounds.width),
      ),
      y: Math.max(
        display.workArea.y,
        Math.min(bounds.y, display.workArea.y + display.workArea.height - bounds.height),
      ),
    };
  }
  petWindow.setPosition(position.x, position.y);
  snapPetToEdge(petWindow);
  savePosition(petWindow);
}

const PET_SCALES = [25, 50, 75, 100, 125] as const;

function selectPetScale(nextScale: (typeof PET_SCALES)[number]): void {
  if (!statisticsStore) return;
  statisticsStore.preferences.update({ petScale: nextScale });
  applyPetScale(nextScale);
  updateTray();
}

function petScaleMenu(): Electron.MenuItemConstructorOptions {
  return {
    label: `宠物大小 · ${petScale}%`,
    submenu: PET_SCALES.map((scale) => ({
      label: `${scale}%`,
      type: 'radio' as const,
      checked: scale === petScale,
      click: () => selectPetScale(scale),
    })),
  };
}

function petMenuItems(): Electron.MenuItemConstructorOptions[] {
  return [
    { label: '打开控制中心', click: () => createStatisticsWindow() },
    { label: '显示桌宠', click: () => petWindow?.show() },
    { label: '隐藏桌宠', click: () => petWindow?.hide() },
    { type: 'separator' },
    {
      label: inputPreferences.enabled ? '暂停键鼠统计' : '启用键鼠统计',
      click: () => {
        void setInputEnabled(!inputPreferences.enabled);
      },
    },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: alwaysOnTop,
      click: (item) => {
        alwaysOnTop = item.checked;
        petWindow?.setAlwaysOnTop(alwaysOnTop);
      },
    },
    {
      label: '完全点击穿透',
      type: 'checkbox',
      checked: clickThrough,
      click: (item) => {
        clickThrough = item.checked;
        petWindow?.setIgnoreMouseEvents(true, { forward: true });
        ignoringMouse = true;
      },
    },
    petScaleMenu(),
    { type: 'separator' },
    {
      label: '退出 DeskPet',
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ];
}
function updateTray(): void {
  const status = inputError ? '统计不可用' : inputMonitor.isRunning ? '统计中' : '已暂停';
  tray?.setToolTip(`DeskPet · ${status}`);
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: `键鼠统计：${status}`, enabled: false },
      {
        label: inputError
          ? '统计启动失败，可在控制中心“设置”中重试'
          : `本次：键盘 ${inputMonitor.totals.keyboardCount} / 鼠标 ${inputMonitor.totals.mouseCount}`,
        enabled: false,
      },
      {
        label: inputPreferences.enabled ? '暂停统计' : '启用统计',
        click: () => {
          void setInputEnabled(!inputPreferences.enabled);
        },
      },
      { label: '打开控制中心', click: () => createStatisticsWindow() },
      { type: 'separator' },
      {
        label: '显示桌宠',
        click: () => {
          petWindow?.show();
        },
      },
      {
        label: '隐藏桌宠',
        click: () => {
          petWindow?.hide();
        },
      },
      {
        label: '窗口置顶',
        type: 'checkbox',
        checked: alwaysOnTop,
        click: (item) => {
          alwaysOnTop = item.checked;
          petWindow?.setAlwaysOnTop(alwaysOnTop);
        },
      },
      {
        label: '完全点击穿透',
        type: 'checkbox',
        checked: clickThrough,
        click: (item) => {
          clickThrough = item.checked;
          petWindow?.setIgnoreMouseEvents(true, { forward: true });
          ignoringMouse = true;
        },
      },
      petScaleMenu(),
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}
function createStatisticsWindow(): void {
  if (statisticsWindow && !statisticsWindow.isDestroyed()) {
    statisticsWindow.show();
    statisticsWindow.focus();
    return;
  }
  const window = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 840,
    minHeight: 620,
    useContentSize: true,
    autoHideMenuBar: true,
    backgroundColor: '#f7f1eb',
    title: 'DeskPet 控制中心',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  statisticsWindow = window;
  window.on('closed', () => {
    statisticsWindow = undefined;
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL)
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '?view=statistics');
  else
    void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
      query: { view: 'statistics' },
    });
}
function createNoteWindow(id: number): void {
  const existing = noteWindows.get(id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return;
  }
  const note = statisticsStore!.notes.get(id);
  const window = new BrowserWindow({
    width: 340,
    height: 300,
    minWidth: 260,
    minHeight: 220,
    title: 'DeskPet 便签',
    alwaysOnTop: note.pinned,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  noteWindows.set(id, window);
  window.on('closed', () => noteWindows.delete(id));
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  const query = `?view=note&noteId=${id}`;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + query);
  else
    void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
      query: { view: 'note', noteId: String(id) },
    });
}
function registerStatisticsIpc(): void {
  const verify = (event: Electron.IpcMainInvokeEvent, args: unknown[]) => {
    if (
      !statisticsWindow ||
      event.sender !== statisticsWindow.webContents ||
      event.senderFrame !== statisticsWindow.webContents.mainFrame ||
      args.length !== 0
    )
      throw new Error('无效的统计请求');
  };
  const verifyPetRead = (event: Electron.IpcMainInvokeEvent, args: unknown[]) => {
    if (
      args.length !== 0 ||
      ![petWindow?.webContents, statisticsWindow?.webContents].includes(event.sender) ||
      event.senderFrame !== event.sender.mainFrame
    )
      throw new Error('无效的读取请求');
  };
  const verifyNote = (event: Electron.IpcMainInvokeEvent, id: unknown) => {
    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id < 1 ||
      noteWindows.get(id)?.webContents !== event.sender ||
      event.senderFrame !== event.sender.mainFrame
    )
      throw new Error('无效的便签请求');
  };
  ipcMain.handle('dashboard:open', (event, ...args: unknown[]) => {
    if (
      args.length !== 0 ||
      !petWindow ||
      event.sender !== petWindow.webContents ||
      event.senderFrame !== petWindow.webContents.mainFrame
    )
      throw new Error('无效的窗口请求');
    createStatisticsWindow();
  });
  const verifyPet = (event: Electron.IpcMainInvokeEvent, args: unknown[]) => {
    if (
      args.length !== 0 ||
      !petWindow ||
      event.sender !== petWindow.webContents ||
      event.senderFrame !== petWindow.webContents.mainFrame
    )
      throw new Error('无效的桌宠请求');
  };
  ipcMain.handle('pet:drag-start', (event, ...args: unknown[]) => {
    verifyPet(event, args);
    beginPetDrag();
  });
  ipcMain.handle('pet:drag-end', (event, ...args: unknown[]) => {
    verifyPet(event, args);
    endPetDrag();
  });
  ipcMain.handle('pet:menu', (event, ...args: unknown[]) => {
    verifyPet(event, args);
    if (petWindow) Menu.buildFromTemplate(petMenuItems()).popup({ window: petWindow });
  });
  ipcMain.handle('app:install-info', (event, ...args: unknown[]) => {
    verify(event, args);
    return currentInstallInfo();
  });
  ipcMain.handle('app:open-folder', async (event, ...args: unknown[]) => {
    if (args.length !== 1 || (args[0] !== 'install' && args[0] !== 'userData'))
      throw new Error('无效的目录请求');
    verify(event, []);
    const info = currentInstallInfo();
    const target = args[0] === 'install' ? info.installPath : info.userDataPath;
    const error = await shell.openPath(target);
    if (error) throw new Error(`无法打开目录：${error}`);
  });
  ipcMain.handle('app:uninstall', (event, ...args: unknown[]) => {
    if (args.length !== 1 || typeof args[0] !== 'boolean') throw new Error('无效的卸载请求');
    verify(event, []);
    const clearData = args[0];
    const info = currentInstallInfo();
    if (info.kind === 'development') return 'development';
    if (info.kind === 'portable' || !info.updateExePath) return 'portable';
    const choice = dialog.showMessageBoxSync(statisticsWindow!, {
      type: 'warning',
      title: '卸载 DeskPet',
      message: '确定卸载 DeskPet？',
      detail: clearData
        ? '程序会被卸载，键鼠统计、成长、装扮、便签和设置都会被清除，且无法恢复。'
        : '程序会被卸载，但本地数据（等级、装扮、便签、设置等）会保留，重新安装后可继续使用。',
      buttons: ['取消', clearData ? '卸载并清除数据' : '卸载'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (choice !== 1) return 'cancelled';
    if (clearData) clearLocalDataForUninstall();
    try {
      // Squirrel 安装版在其安装根目录提供 Update.exe，卸载由它负责删除程序和快捷方式。
      const child = spawn(info.updateExePath, ['--uninstall'], {
        detached: true,
        stdio: 'ignore',
        cwd: info.installPath,
      });
      child.unref();
    } catch (error) {
      console.error('无法启动卸载程序。', error);
      dialog.showErrorBox(
        '卸载失败',
        '无法启动 Squirrel 卸载程序，请在 Windows“设置 → 应用 → 已安装的应用”中卸载 DeskPet。',
      );
      return 'failed';
    }
    // Update.exe 一般只删除 app-* 与快捷方式，这里彻底清掉安装目录；
    // 选择“卸载并清除数据”时同时删除用户数据目录。
    scheduleRemoval(clearData ? [info.installPath, info.userDataPath] : [info.installPath]);
    quitting = true;
    // 给 Update.exe 一点时间启动；应用退出后它才能删除程序目录。
    setTimeout(() => app.quit(), 400);
    return 'started';
  });
  ipcMain.handle('notes:list', (event, ...args: unknown[]) => {
    verify(event, args);
    return statisticsStore!.notes.all();
  });
  ipcMain.handle('notes:get', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效便签请求');
    verifyNote(event, args[0]);
    return statisticsStore!.notes.get(args[0]);
  });
  ipcMain.handle('notes:create', (event, ...args: unknown[]) => {
    verify(event, args);
    if (!statisticsStore!.tools.isEnabled('notes')) throw new Error('便签已关闭');
    return statisticsStore!.notes.create();
  });
  ipcMain.handle('notes:save', (event, ...args: unknown[]) => {
    if (args.length !== 2) throw new Error('无效便签请求');
    if (event.sender === statisticsWindow?.webContents) verify(event, []);
    else verifyNote(event, args[0]);
    if (!statisticsStore!.tools.isEnabled('notes')) throw new Error('便签已关闭');
    const notes = statisticsStore!.notes.save(args[0], args[1]);
    const note = notes.find((entry) => entry.id === args[0]);
    if (note) noteWindows.get(note.id)?.setAlwaysOnTop(note.pinned);
    return notes;
  });
  ipcMain.handle('notes:delete', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效便签请求');
    verify(event, []);
    if (!statisticsStore!.tools.isEnabled('notes')) throw new Error('便签已关闭');
    const notes = statisticsStore!.notes.delete(args[0]);
    const id = args[0] as number;
    noteWindows.get(id)?.close();
    return notes;
  });
  ipcMain.handle('notes:open', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效便签请求');
    verify(event, []);
    if (!statisticsStore!.tools.isEnabled('notes')) throw new Error('便签已关闭');
    statisticsStore!.notes.get(args[0]);
    createNoteWindow(args[0] as number);
  });
  const focusTick = () => {
    if (statisticsStore?.completeFocusIfDue() && Notification.isSupported()) {
      const focus = statisticsStore.focus.get();
      new Notification({
        title: 'DeskPet',
        body: focus.kind === 'focus' ? '专注时间结束，休息一下吧。' : '休息时间结束。',
        silent: !focus.soundEnabled,
      }).show();
    }
  };
  const sedentaryTick = () => {
    if (
      statisticsStore?.tools.isEnabled('sedentary') &&
      statisticsStore.sedentary.checkDue() &&
      Notification.isSupported()
    )
      new Notification({
        title: 'DeskPet 久坐提醒',
        body: '你已经工作一段时间啦，起来活动一下吧！',
      }).show();
  };
  const focusService = () => {
    focusTick();
    return statisticsStore!.focus;
  };
  ipcMain.handle('focus:get', (event, ...args: unknown[]) => {
    verifyPetRead(event, args);
    return focusService().get();
  });
  ipcMain.handle('focus:start', (event, ...args: unknown[]) => {
    if (args.length !== 2) throw new Error('无效计时请求');
    verify(event, []);
    if (!statisticsStore!.tools.isEnabled('focus')) throw new Error('番茄钟已关闭');
    return focusService().start(args[0], args[1]);
  });
  ipcMain.handle('focus:pause', (event, ...args: unknown[]) => {
    verify(event, args);
    return focusService().pause();
  });
  ipcMain.handle('focus:resume', (event, ...args: unknown[]) => {
    verify(event, args);
    return focusService().resume();
  });
  ipcMain.handle('focus:stop', (event, ...args: unknown[]) => {
    verify(event, args);
    return focusService().stop();
  });
  ipcMain.handle('focus:sound', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效声音设置');
    verify(event, []);
    return focusService().setSoundEnabled(args[0]);
  });
  setInterval(focusTick, 1000).unref();
  setInterval(sedentaryTick, 30_000).unref();
  focusTick();
  sedentaryTick();
  ipcMain.handle('appearance:get', (event, ...args: unknown[]) => {
    verifyPetRead(event, args);
    return statisticsStore!.appearance.get();
  });
  ipcMain.handle('appearance:set', (event, ...args: unknown[]) => {
    if (
      !statisticsWindow ||
      event.sender !== statisticsWindow.webContents ||
      event.senderFrame !== statisticsWindow.webContents.mainFrame ||
      args.length !== 1
    )
      throw new Error('无效的外观请求');
    return statisticsStore!.appearance.update(args[0]);
  });
  ipcMain.handle('economy:purchase', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效的兑换请求');
    verify(event, []);
    statisticsStore!.economy.purchase(args[0]);
    return statisticsStore!.appearance.get();
  });
  ipcMain.handle('economy:dismantle', (event, ...args: unknown[]) => {
    if (args.length !== 2) throw new Error('无效的分解请求');
    verify(event, []);
    statisticsStore!.economy.dismantle(args[0], args[1]);
    return statisticsStore!.appearance.get();
  });
  ipcMain.handle('economy:convert-fragments', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效的兑换请求');
    verify(event, []);
    statisticsStore!.economy.convertFragments(args[0]);
    return statisticsStore!.appearance.get();
  });
  ipcMain.handle('economy:set-wishlist', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效的心愿请求');
    verify(event, []);
    statisticsStore!.economy.setWishlist(args[0]);
    return statisticsStore!.appearance.get();
  });
  ipcMain.handle('tools:list', (event, ...args: unknown[]) => {
    verify(event, args);
    return statisticsStore!.tools.list();
  });
  ipcMain.handle('tools:set-enabled', (event, ...args: unknown[]) => {
    if (args.length !== 2) throw new Error('无效工具设置');
    verify(event, []);
    const tools = statisticsStore!.tools.setEnabled(args[0], args[1]);
    if (args[0] === 'focus' && args[1] === false) {
      focusTick();
      statisticsStore!.focus.stop();
    }
    if (args[0] === 'sedentary' && args[1] === false) statisticsStore!.sedentary.reset();
    if (args[0] === 'notes' && args[1] === false)
      for (const window of noteWindows.values()) window.close();
    return tools;
  });
  ipcMain.handle('sedentary:get', (event, ...args: unknown[]) => {
    verify(event, args);
    return statisticsStore!.sedentary.get();
  });
  ipcMain.handle('sedentary:configure', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效久坐设置');
    verify(event, []);
    return statisticsStore!.sedentary.configure(args[0]);
  });
  ipcMain.handle('sedentary:snooze', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效延迟时间');
    verify(event, []);
    return statisticsStore!.sedentary.snooze(args[0]);
  });
  ipcMain.handle('sedentary:reset', (event, ...args: unknown[]) => {
    verify(event, args);
    return statisticsStore!.sedentary.reset();
  });
  ipcMain.handle('summary:get', (event, ...args: unknown[]) => {
    verify(event, args);
    flushStatistics();
    return statisticsStore!.summary.get();
  });
  ipcMain.handle('settings:get', (event, ...args: unknown[]) => {
    verifyPetRead(event, args);
    return appSettingsSnapshot();
  });
  ipcMain.handle('settings:update', (event, ...args: unknown[]) => {
    if (args.length !== 1) throw new Error('无效应用设置');
    verify(event, []);
    const value = args[0];
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('无效应用设置');
    const keys = Object.keys(value);
    if (
      keys.length !== 1 ||
      ![
        'animationsEnabled',
        'onboardingCompleted',
        'launchAtLogin',
        'petScale',
        'edgeSnapEnabled',
        'inputReactionsEnabled',
      ].includes(keys[0])
    )
      throw new Error('无效应用设置');
    const settingValue = (value as Record<string, unknown>)[keys[0]];
    if (keys[0] === 'petScale') {
      if (![25, 50, 75, 100, 125].includes(settingValue as number)) throw new Error('无效宠物缩放');
    } else if (typeof settingValue !== 'boolean') throw new Error('无效应用设置');
    if (keys[0] === 'launchAtLogin') {
      const launchAtLogin = (value as { launchAtLogin: boolean }).launchAtLogin;
      if (launchAtLogin && !app.isPackaged) throw new Error('开发模式不能设置开机启动');
      applyLaunchAtLogin(launchAtLogin);
    }
    statisticsStore!.preferences.update(value);
    if (keys[0] === 'petScale') {
      applyPetScale(settingValue as 25 | 50 | 75 | 100 | 125);
      updateTray();
    }
    if (keys[0] === 'edgeSnapEnabled' && petWindow && !petWindow.isDestroyed())
      snapPetToEdge(petWindow);
    if (keys[0] === 'animationsEnabled' || keys[0] === 'inputReactionsEnabled')
      sendPetPreferences();
    return appSettingsSnapshot();
  });
  ipcMain.handle('settings:set-input', async (event, ...args: unknown[]) => {
    if (args.length !== 1 || typeof args[0] !== 'boolean') throw new Error('无效监听设置');
    verify(event, []);
    await setInputEnabled(args[0]);
    return appSettingsSnapshot();
  });
  ipcMain.handle('settings:reset-all', (event, ...args: unknown[]) => {
    verify(event, args);
    const choice = dialog.showMessageBoxSync(statisticsWindow!, {
      type: 'warning',
      title: '重置 DeskPet',
      message: '清除全部本地数据并恢复默认设置？',
      detail: '键鼠统计、成长、奖励、背包、便签、专注记录和应用偏好都会被清除。此操作无法撤销。',
      buttons: ['取消', '清除并重置'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (choice !== 1) return false;
    inputMonitor.stop();
    inputError = null;
    persistPending();
    inputPreferences = { consentGiven: false, enabled: false };
    writeInputPreferences(inputPreferencesPath(), inputPreferences);
    statisticsStore!.resetUserData();
    applyLaunchAtLogin(false);
    fs.rmSync(positionPath(), { force: true });
    for (const window of noteWindows.values()) window.close();
    updateTray();
    return true;
  });
  ipcMain.handle('statistics:get', (event, ...args: unknown[]) => {
    verify(event, args);
    flushStatistics();
    return statisticsStore!.snapshot();
  });
  ipcMain.handle('statistics:clear', (event, ...args: unknown[]) => {
    verify(event, args);
    const choice = dialog.showMessageBoxSync(statisticsWindow!, {
      type: 'warning',
      message: '清除全部键鼠统计？',
      detail: '此操作无法撤销；成长、装扮掉落进度和背包不会被清除。',
      buttons: ['取消', '清除'],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice !== 1) return false;
    flushStatistics();
    statisticsStore!.clear();
    return true;
  });
  ipcMain.handle('statistics:export', (event, ...args: unknown[]) => {
    verify(event, args);
    flushStatistics();
    const file = dialog.showSaveDialogSync(statisticsWindow!, {
      title: '导出统计数据',
      defaultPath: 'deskpet-statistics.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (!file) return false;
    const rows = statisticsStore!
      .all()
      .map(
        (row) =>
          `${row.date},${row.keyboardCount},${row.mouseCount},${row.activeSeconds.toFixed(1)}`,
      );
    fs.writeFileSync(
      file,
      '\ufeffdate,keyboard_count,mouse_count,active_seconds\r\n' + rows.join('\r\n') + '\r\n',
      'utf8',
    );
    return true;
  });
}

function createWindow(): void {
  const position = loadPosition();
  const window = new BrowserWindow({
    ...petWindowSize(),
    ...position,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  petWindow = window;
  window.webContents.on('did-finish-load', () => {
    window.webContents.setZoomFactor(petScale / 100);
    sendPetPlacement();
    sendPetPreferences();
  });
  window.setIgnoreMouseEvents(true, { forward: true });
  setInterval(() => {
    if (window.isDestroyed() || petDragging) return;
    const shouldIgnore =
      clickThrough ||
      !window.isVisible() ||
      !isInsidePet(screen.getCursorScreenPoint(), window.getBounds());
    if (shouldIgnore !== ignoringMouse) {
      window.setIgnoreMouseEvents(shouldIgnore, { forward: true });
      ignoringMouse = shouldIgnore;
    }
  }, 60).unref();
  // 拖动过程中窗口每 8ms 移动一次，只在拖动结束后写位置文件，避免频繁磁盘写入。
  window.on('moved', () => {
    if (!petDragging) savePosition(window);
  });
  window.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else
    void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

if (started) app.quit();
else if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    petWindow?.show();
    petWindow?.focus();
  });
  app.on('before-quit', () => {
    quitting = true;
  });
  void app.whenReady().then(() => {
    if (process.argv.includes('--input-hook-smoke-test')) {
      void import('uiohook-napi')
        .then(() => {
          app.quit();
        })
        .catch((error: unknown) => {
          console.error('原生监听模块验证失败。', error);
          app.exit(1);
        });
      return;
    }
    try {
      statisticsStore = new StatisticsStore(
        path.join(app.getPath('userData'), 'statistics.sqlite'),
      );
    } catch (error) {
      console.error('统计数据库初始化失败。', error);
      dialog.showErrorBox('统计数据库不可用', '无法打开统计数据库，应用将退出以保护数据。');
      app.quit();
      return;
    }
    registerStatisticsIpc();
    registerFeatureIpc({
      store: () => {
        if (!statisticsStore) throw new Error('统计数据库不可用');
        return statisticsStore;
      },
      dashboard: () => statisticsWindow,
      pet: () => petWindow,
      notify: (title, body) => {
        if (Notification.isSupported()) new Notification({ title, body }).show();
      },
    });
    inputPreferences = readInputPreferences(inputPreferencesPath());
    petScale = statisticsStore.preferences.get().petScale;
    try {
      applyLaunchAtLogin(statisticsStore.preferences.get().launchAtLogin);
    } catch (error) {
      console.warn('无法应用开机启动设置。', error);
      statisticsStore.preferences.update({ launchAtLogin: false });
    }
    createWindow();
    screen.on('display-added', reflowPetForDisplays);
    screen.on('display-removed', reflowPetForDisplays);
    screen.on('display-metrics-changed', reflowPetForDisplays);
    tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON));
    updateTray();
    if (!statisticsStore.preferences.get().onboardingCompleted)
      setImmediate(() => createStatisticsWindow());
    tray.on('double-click', () => {
      petWindow?.show();
    });
    powerMonitor.on('lock-screen', () => {
      systemSuspended = true;
      inputMonitor.stop();
      updateTray();
    });
    powerMonitor.on('suspend', () => {
      systemSuspended = true;
      inputMonitor.stop();
      updateTray();
    });
    const resume = () => {
      systemSuspended = false;
      if (inputPreferences.enabled) void setInputEnabled(true, false);
    };
    powerMonitor.on('unlock-screen', resume);
    powerMonitor.on('resume', resume);
    const shortcut = 'Control+Alt+Shift+P';
    if (
      !globalShortcut.register(shortcut, () => {
        void setInputEnabled(!inputPreferences.enabled);
      })
    )
      console.warn('监听快捷键注册失败。');
    if (inputPreferences.enabled) void setInputEnabled(true, false);
  });
}
app.on('before-quit', () => {
  if (petDragTimer) clearInterval(petDragTimer);
  inputMonitor.stop();
  try {
    if (statisticsStore) {
      persistPending();
      statisticsStore.close();
      statisticsStore = undefined;
    }
  } catch (error) {
    console.error('退出时统计数据保存失败。', error);
    dialog.showErrorBox('统计保存失败', '部分统计数据未能保存，请检查用户数据目录。');
  }
  globalShortcut.unregisterAll();
});
