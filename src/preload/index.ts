import { contextBridge } from 'electron';
import type { DesktopApi } from '../shared/types/desktop-api';
const desktopApi: DesktopApi = { platform: process.platform };
contextBridge.exposeInMainWorld('desktopApi', desktopApi);
