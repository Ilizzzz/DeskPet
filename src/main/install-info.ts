import fs from 'node:fs';
import path from 'node:path';

export interface InstallEnvironment {
  isPackaged: boolean;
  executablePath: string;
  version: string;
  userDataPath: string;
  exists?: (target: string) => boolean;
}

export interface ResolvedInstallInfo {
  kind: 'installed' | 'portable' | 'development';
  version: string;
  installPath: string;
  userDataPath: string;
  updateExePath?: string;
}

/**
 * 区分安装版、免安装版和开发模式。
 *
 * Squirrel 安装版会在 `%LOCALAPPDATA%\DeskPet` 下放置 `Update.exe`，
 * 应用位于 `app-<version>` 子目录；免安装版只有解压出来的程序目录。
 */
export function resolveInstallInfo(environment: InstallEnvironment): ResolvedInstallInfo {
  const exists = environment.exists ?? ((target: string) => fs.existsSync(target));
  const executableDirectory = path.dirname(environment.executablePath);
  const installRoot = path.resolve(executableDirectory, '..');
  if (!environment.isPackaged)
    return {
      kind: 'development',
      version: environment.version,
      installPath: executableDirectory,
      userDataPath: environment.userDataPath,
    };
  const updateExePath = path.join(installRoot, 'Update.exe');
  if (exists(updateExePath))
    return {
      kind: 'installed',
      version: environment.version,
      installPath: installRoot,
      userDataPath: environment.userDataPath,
      updateExePath,
    };
  return {
    kind: 'portable',
    version: environment.version,
    installPath: executableDirectory,
    userDataPath: environment.userDataPath,
  };
}
