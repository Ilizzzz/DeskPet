import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../shared/types/desktop-api';
const desktopApi: DesktopApi = {
  platform: process.platform,
  getStatistics: () => ipcRenderer.invoke('statistics:get'),
  clearStatistics: () => ipcRenderer.invoke('statistics:clear'),
  exportStatistics: () => ipcRenderer.invoke('statistics:export'),
};
contextBridge.exposeInMainWorld('desktopApi', desktopApi);
