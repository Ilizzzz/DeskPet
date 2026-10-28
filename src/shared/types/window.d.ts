import type { DesktopApi } from './desktop-api';

declare global {
  interface Window {
    desktopApi: DesktopApi;
  }
}

export {};
