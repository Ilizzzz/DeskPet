export type AppInstallKind = 'installed' | 'portable' | 'development';

export interface AppInstallInfo {
  kind: AppInstallKind;
  version: string;
  /** 程序目录：安装版为 `%LOCALAPPDATA%\DeskPet`，免安装版为解压目录。 */
  installPath: string;
  userDataPath: string;
}

export type UninstallStatus = 'started' | 'cancelled' | 'portable' | 'development' | 'failed';
