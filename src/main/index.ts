import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Menu,
  nativeImage,
  powerMonitor,
  screen,
  Tray,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { readPosition, restorePosition } from './window-position';
import { TRAY_ICON } from './tray-icon';
import { isInsidePet } from './pet-hit-test';
import { InputMonitor } from '../services/input-monitor/input-monitor';
import {
  readInputPreferences,
  writeInputPreferences,
} from '../services/input-monitor/input-preferences';

const SIZE = { width: 180, height: 180 };
let petWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let quitting = false;
let clickThrough = false;
let alwaysOnTop = true;
let ignoringMouse = true;
let inputPreferences = { consentGiven: false, enabled: false };
let systemSuspended = false;
const inputMonitor = new InputMonitor(() => updateTray());

function inputPreferencesPath(): string {
  return path.join(app.getPath('userData'), 'input-preferences.json');
}

async function setInputEnabled(enabled: boolean): Promise<void> {
  if (enabled && !inputPreferences.consentGiven) {
    const response = dialog.showMessageBoxSync({
      type: 'info',
      title: '启用键鼠次数统计',
      message: 'DeskPet 将监听全局键盘按下和鼠标点击。',
      detail:
        '只汇总次数；不保存按键内容、输入顺序、鼠标位置或轨迹。可随时从托盘或 Ctrl+Alt+Shift+P 暂停。当前阶段的计数仅保留在本次运行中。',
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
    return restorePosition(
      readPosition(JSON.parse(fs.readFileSync(positionPath(), 'utf8'))),
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
    fs.writeFileSync(positionPath(), JSON.stringify({ x, y }), 'utf8');
  } catch (error) {
    console.error('无法保存桌宠位置。', error);
  }
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
    if (window.isDestroyed()) return;
    const shouldIgnore =
      clickThrough ||
      !window.isVisible() ||
      !isInsidePet(screen.getCursorScreenPoint(), window.getBounds());
    if (shouldIgnore !== ignoringMouse) {
      window.setIgnoreMouseEvents(shouldIgnore, { forward: true });
      ignoringMouse = shouldIgnore;
    }
  }, 60).unref();
  window.on('moved', () => savePosition(window));
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
    inputPreferences = readInputPreferences(inputPreferencesPath());
    createWindow();
    tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON));
    updateTray();
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
  inputMonitor.stop();
  globalShortcut.unregisterAll();
});
