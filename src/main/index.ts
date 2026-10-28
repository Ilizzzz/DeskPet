import { app, BrowserWindow, Menu, nativeImage, screen, Tray } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { readPosition, restorePosition } from './window-position';
import { TRAY_ICON } from './tray-icon';
import { isInsidePet } from './pet-hit-test';

const SIZE = { width: 180, height: 180 };
let petWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let quitting = false;
let clickThrough = false;
let alwaysOnTop = true;
let ignoringMouse = true;

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
  tray?.setContextMenu(
    Menu.buildFromTemplate([
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
    createWindow();
    tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON));
    tray.setToolTip('DeskPet');
    updateTray();
    tray.on('double-click', () => {
      petWindow?.show();
    });
  });
}
