import { BrowserWindow, ipcMain, Notification } from 'electron';
import type { StatisticsStore } from '../../services/statistics/statistics-store';

export interface FeatureIpcContext {
  store(): StatisticsStore;
  dashboard(): BrowserWindow | undefined;
  pet(): BrowserWindow | undefined;
  notify(title: string, body: string): void;
}

/**
 * 成长、签到、成就和新工具的 IPC。
 *
 * 所有请求都要求来自控制中心主框架，参数长度也必须完全匹配；
 * 桌宠窗口只允许读取成长/外观状态，不在此处开放写操作。
 */
export function registerFeatureIpc(context: FeatureIpcContext): void {
  const verifyDashboard =
    (length: number) =>
    (event: Electron.IpcMainInvokeEvent, args: unknown[]): void => {
      const dashboard = context.dashboard();
      if (
        args.length !== length ||
        !dashboard ||
        event.sender !== dashboard.webContents ||
        event.senderFrame !== dashboard.webContents.mainFrame
      )
        throw new Error('无效的请求');
    };

  ipcMain.handle('checkin:get', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().checkin.status();
  });
  ipcMain.handle('checkin:check-in', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().checkin.checkIn();
  });
  ipcMain.handle('achievements:list', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().achievements.list();
  });
  ipcMain.handle('achievements:claim', (event, ...args: unknown[]) => {
    verifyDashboard(1)(event, args);
    return context.store().achievements.claim(args[0]);
  });
  ipcMain.handle('todos:list', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().todos.all();
  });
  ipcMain.handle('todos:create', (event, ...args: unknown[]) => {
    verifyDashboard(1)(event, args);
    return context.store().todos.create(args[0]);
  });
  ipcMain.handle('todos:update', (event, ...args: unknown[]) => {
    verifyDashboard(2)(event, args);
    return context.store().todos.update(args[0], args[1]);
  });
  ipcMain.handle('todos:delete', (event, ...args: unknown[]) => {
    verifyDashboard(1)(event, args);
    return context.store().todos.remove(args[0]);
  });
  ipcMain.handle('countdowns:list', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().countdowns.all();
  });
  ipcMain.handle('countdowns:create', (event, ...args: unknown[]) => {
    verifyDashboard(2)(event, args);
    return context.store().countdowns.create(args[0], args[1]);
  });
  ipcMain.handle('countdowns:delete', (event, ...args: unknown[]) => {
    verifyDashboard(1)(event, args);
    return context.store().countdowns.remove(args[0]);
  });
  ipcMain.handle('anniversaries:list', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().anniversaries.all();
  });
  ipcMain.handle('anniversaries:create', (event, ...args: unknown[]) => {
    verifyDashboard(3)(event, args);
    return context.store().anniversaries.create(args[0], args[1], args[2]);
  });
  ipcMain.handle('anniversaries:delete', (event, ...args: unknown[]) => {
    verifyDashboard(1)(event, args);
    return context.store().anniversaries.remove(args[0]);
  });
  ipcMain.handle('water:get', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().water.get();
  });
  ipcMain.handle('water:configure', (event, ...args: unknown[]) => {
    verifyDashboard(1)(event, args);
    return context.store().water.configure(args[0]);
  });
  ipcMain.handle('water:drink', (event, ...args: unknown[]) => {
    verifyDashboard(0)(event, args);
    return context.store().water.drink();
  });
  const store = () => {
    try {
      return context.store();
    } catch (error) {
      console.error('无法读取本地数据。', error);
      return undefined;
    }
  };
  setInterval(() => {
    const current = store();
    if (!current) return;
    try {
      for (const countdown of current.countdowns.checkDue()) {
        if (Notification.isSupported())
          new Notification({ title: 'DeskPet 倒计时', body: `${countdown.label} 时间到！` }).show();
      }
    } catch (error) {
      console.error('倒计时检查失败。', error);
    }
  }, 1000).unref();
  setInterval(() => {
    const current = store();
    if (!current) return;
    try {
      if (current.tools.isEnabled('water') && current.water.checkDue())
        context.notify('DeskPet 喝水提醒', '起来喝一杯水，顺便活动一下肩膀吧。');
    } catch (error) {
      console.error('喝水提醒检查失败。', error);
    }
  }, 30_000).unref();
}
