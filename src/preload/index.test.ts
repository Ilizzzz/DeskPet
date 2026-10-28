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
  it('exposes only fixed desktop operations', async () => {
    await import('./index');
    const api = exposeInMainWorld.mock.calls[0][1];
    expect(Object.keys(api).sort()).toEqual([
      'beginPetDrag',
      'checkIn',
      'claimAchievement',
      'clearStatistics',
      'configureSedentary',
      'configureWater',
      'craftItem',
      'createAnniversary',
      'createCountdown',
      'createNote',
      'createTodo',
      'deleteAnniversary',
      'deleteCountdown',
      'deleteNote',
      'deleteTodo',
      'dismantleItem',
      'drinkWater',
      'endPetDrag',
      'exportStatistics',
      'getAppSettings',
      'getAppearance',
      'getCheckin',
      'getDailySummary',
      'getFocus',
      'getNote',
      'getSedentary',
      'getStatistics',
      'getWater',
      'listAchievements',
      'listAnniversaries',
      'listCountdowns',
      'listNotes',
      'listTodos',
      'listTools',
      'openDashboard',
      'openNote',
      'openPetMenu',
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
      'updateTodo',
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
