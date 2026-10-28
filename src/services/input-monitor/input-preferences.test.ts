import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readInputPreferences, writeInputPreferences } from './input-preferences';

describe('input preferences', () => {
  it('defaults to paused and persists explicit consent in the user data location', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'deskpet-input-test-'));
    const file = path.join(directory, 'input-preferences.json');
    try {
      expect(readInputPreferences(file)).toEqual({ consentGiven: false, enabled: false });
      writeInputPreferences(file, { consentGiven: true, enabled: true });
      expect(readInputPreferences(file)).toEqual({ consentGiven: true, enabled: true });
      fs.writeFileSync(file, '{"consentGiven":false,"enabled":true}');
      expect(readInputPreferences(file)).toEqual({ consentGiven: false, enabled: false });
    } finally {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      fs.rmdirSync(directory);
    }
  });
});
