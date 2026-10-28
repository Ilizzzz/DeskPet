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
  Tray,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { readPosition, restorePosition, shiftForWindowResize } from './window-position';
import { TRAY_ICON } from './tray-icon';
import { isInsidePet } from './pet-hit-test';
import { InputMonitor } from '../services/input-monitor/input-monitor';
import { StatisticsStore } from '../services/statistics/statistics-store';
import type { DailyStatistics } from '../shared/types/statistics';
import {
  readInputPreferences,
  writeInputPreferences,
} from '../services/input-monitor/input-preferences';
import { PET_WINDOW_SIZE } from '../shared/constants/pet';
import { registerFeatureIpc } from './ipc/features';

const SIZE = { width: PET_WINDOW_SIZE, height: PET_WINDOW_SIZE };
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
let systemSuspended = false;
let petDragging = false;
let petDragTimer: NodeJS.Timeout | undefined;
const inputMonitor = new InputMonitor((counts, days) => {
  pending.push(...days);
  try {
    persistPending();
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
  updateTray();
});
function persistPending(): void {
  if (!statisticsStore) throw new Error('统计数据库不可用');
  while (pending.length) {
    statisticsStore.add(pending[0]);
    pending.shift();
  }
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
    },
  };
}

function applyLaunchAtLogin(enabled: boolean): void {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
}

async function setInputEnabled(enabled: boolean): Promise<void> {
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
  } catch (error) {
    inputMonitor.stop();
    inputPreferences = { ...inputPreferences, enabled: false };
    try {
      writeInputPreferences(inputPreferencesPath(), inputPreferences);
    } catch (saveError) {
      console.error('无法保存监听暂停状态。', saveError);
    }
    console.error('键鼠监听不可用。', error);
    dialog.showErrorBox('键鼠监听不可用', '监听未启动。请检查安装包中的原生模块或系统权限。');
  }
  updateTray();
}

function positionPath(): string {
  return path.join(app.getPath('userData'), 'window-position.json');
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
        PET_WINDOW_SIZE,
      );
    }
    return restorePosition(
      point,
      screen.getAllDisplays().map((d) => d.workArea),
      SIZE,
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
    fs.writeFileSync(positionPath(), JSON.stringify({ x, y, size: PET_WINDOW_SIZE }), 'utf8');
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
  if (petWindow && !petWindow.isDestroyed()) savePosition(petWindow);
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
  const status = inputMonitor.isRunning ? '统计中' : '已暂停';
  tray?.setToolTip(`DeskPet · ${status}`);
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: `键鼠统计：${status}`, enabled: false },
      {
        label: `本次：键盘 ${inputMonitor.totals.keyboardCount} / 鼠标 ${inputMonitor.totals.mouseCount}`,
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
  ipcMain.handle('crafting:craft', (event, ...args: unknown[]) => {
    if (
      !statisticsWindow ||
      event.sender !== statisticsWindow.webContents ||
      event.senderFrame !== statisticsWindow.webContents.mainFrame ||
      args.length !== 1
    )
      throw new Error('无效的合成请求');
    statisticsStore!.crafting.craft(args[0]);
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
      !['animationsEnabled', 'onboardingCompleted', 'launchAtLogin'].includes(keys[0]) ||
      typeof (value as Record<string, unknown>)[keys[0]] !== 'boolean'
    )
      throw new Error('无效应用设置');
    if (keys[0] === 'launchAtLogin') {
      const launchAtLogin = (value as { launchAtLogin: boolean }).launchAtLogin;
      if (launchAtLogin && !app.isPackaged) throw new Error('开发模式不能设置开机启动');
      applyLaunchAtLogin(launchAtLogin);
    }
    statisticsStore!.preferences.update(value);
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
      detail: '此操作无法撤销。',
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
    ...SIZE,
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
    try {
      applyLaunchAtLogin(statisticsStore.preferences.get().launchAtLogin);
    } catch (error) {
      console.warn('无法应用开机启动设置。', error);
      statisticsStore.preferences.update({ launchAtLogin: false });
    }
    createWindow();
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
      if (inputPreferences.enabled) void setInputEnabled(true);
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
    if (inputPreferences.enabled) void setInputEnabled(true);
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
