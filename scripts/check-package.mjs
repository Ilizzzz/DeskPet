// 校验打包产物包含原生键鼠模块，避免出现“开发机可运行、用户机器提示键鼠监听不可用”。
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const asar = require('@electron/asar');

const root = path.resolve(import.meta.dirname, '..');
const resources = path.join(root, 'out', 'DeskPet-win32-x64', 'resources');
const archive = path.join(resources, 'app.asar');

function fail(message) {
  console.error(`[check-package] ERROR: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(archive)) {
  fail(`找不到打包产物 ${archive}，请先运行 npm run package。`);
} else {
  const entries = new Set(
    asar.listPackage(archive).map((entry) => entry.replaceAll('\\', '/').replace(/^\//, '')),
  );
  const requiredInAsar = [
    'node_modules/uiohook-napi/dist/index.js',
    'node_modules/uiohook-napi/package.json',
    'node_modules/node-gyp-build/index.js',
    'node_modules/node-gyp-build/node-gyp-build.js',
  ];
  for (const entry of requiredInAsar) if (!entries.has(entry)) fail(`app.asar 缺少 ${entry}`);

  const requiredUnpacked = ['node_modules/uiohook-napi/prebuilds/win32-x64/uiohook-napi.node'];
  for (const entry of requiredUnpacked) {
    const file = path.join(resources, 'app.asar.unpacked', entry);
    if (!existsSync(file)) fail(`app.asar.unpacked 缺少 ${entry}（原生模块必须解包）`);
  }

  if (!process.exitCode)
    console.log('[check-package] OK: 原生键鼠模块已包含并解包，可在干净机器加载。');
}
