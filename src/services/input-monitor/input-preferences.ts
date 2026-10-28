import fs from 'node:fs';
import path from 'node:path';

export interface InputPreferences {
  consentGiven: boolean;
  enabled: boolean;
}
export const DEFAULT_INPUT_PREFERENCES: InputPreferences = { consentGiven: false, enabled: false };

export function readInputPreferences(filePath: string): InputPreferences {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (
      typeof value !== 'object' ||
      value === null ||
      !('consentGiven' in value) ||
      !('enabled' in value) ||
      typeof value.consentGiven !== 'boolean' ||
      typeof value.enabled !== 'boolean'
    )
      return DEFAULT_INPUT_PREFERENCES;
    return { consentGiven: value.consentGiven, enabled: value.consentGiven && value.enabled };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.warn('监听设置不可用，默认保持暂停。', error);
    return DEFAULT_INPUT_PREFERENCES;
  }
}

export function writeInputPreferences(filePath: string, preferences: InputPreferences): void {
  const temporaryPath = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(preferences), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}
