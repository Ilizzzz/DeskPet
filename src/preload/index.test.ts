import { beforeEach, describe, expect, it, vi } from 'vitest';
const exposeInMainWorld = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld }, ipcRenderer: { invoke } }));
describe('preload bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
    invoke.mockClear();
  });
  it('exposes only fixed statistics operations', async () => {
    await import('./index');
    const api = exposeInMainWorld.mock.calls[0][1];
    expect(Object.keys(api).sort()).toEqual([
      'clearStatistics',
      'configureSedentary',
      'craftItem',
      'createNote',
      'deleteNote',
      'exportStatistics',
      'getAppSettings',
      'getAppearance',
      'getDailySummary',
      'getFocus',
      'getNote',
      'getSedentary',
      'getStatistics',
      'listNotes',
      'listTools',
      'openDashboard',
      'openNote',
      'pauseFocus',
      'platform',
      'resetAllData',
      'resetSedentary',
      'resumeFocus',
      'saveNote',
      'setAppearance',
      'setFocusSound',
      'setInputTracking',
      'setToolEnabled',
      'snoozeSedentary',
      'startFocus',
      'stopFocus',
      'updateAppPreference',
    ]);
    api.getStatistics();
    api.clearStatistics();
    api.exportStatistics();
    expect(invoke.mock.calls).toEqual([
      ['statistics:get'],
      ['statistics:clear'],
      ['statistics:export'],
    ]);
  });
});
