import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveInstallInfo } from './install-info';

const executablePath = 'C:\\Users\\tester\\AppData\\Local\\DeskPet\\app-1.1.2\\DeskPet.exe';
const base = {
  executablePath,
  version: '1.1.2',
  userDataPath: 'C:\\Users\\tester\\AppData\\Roaming\\DeskPet',
};

describe('install info', () => {
  it('detects a Squirrel install when Update.exe exists', () => {
    const info = resolveInstallInfo({
      ...base,
      isPackaged: true,
      exists: (target) =>
        target === path.join('C:\\Users\\tester\\AppData\\Local\\DeskPet', 'Update.exe'),
    });
    expect(info.kind).toBe('installed');
    expect(info.updateExePath).toContain('Update.exe');
  });

  it('treats a packaged folder without Update.exe as portable', () => {
    const info = resolveInstallInfo({ ...base, isPackaged: true, exists: () => false });
    expect(info.kind).toBe('portable');
    expect(info.installPath).toBe(path.dirname(executablePath));
    expect(info.updateExePath).toBeUndefined();
  });

  it('marks unpackaged runs as development', () => {
    const info = resolveInstallInfo({ ...base, isPackaged: false, exists: () => false });
    expect(info.kind).toBe('development');
  });
});
