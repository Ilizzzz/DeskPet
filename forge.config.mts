import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Vite 会把业务 JS 打包进 .vite，但原生模块无法被打包，必须随安装包复制。
 *
 * 注意：Vite 插件的 ignore 会排除 node_modules，所以这里在 packageAfterCopy 中
 * 手动把运行时依赖放进待打包目录；漏掉它们会让用户在启动统计时提示
 * “键鼠监听不可用”（开发机因为能找到仓库 node_modules 而无法暴露问题）。
 */
const RUNTIME_DEPENDENCIES = ['uiohook-napi', 'node-gyp-build'] as const;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'build/icon',
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      for (const dependency of RUNTIME_DEPENDENCIES) {
        const source = path.join(process.cwd(), 'node_modules', dependency);
        if (!existsSync(source)) throw new Error(`打包缺少运行时依赖：node_modules/${dependency}`);
        const target = path.join(buildPath, 'node_modules', dependency);
        mkdirSync(path.dirname(target), { recursive: true });
        cpSync(source, target, { recursive: true });
      }
    },
  },
  // uiohook-napi 自带 Windows N-API 预编译文件；Forge 的源码重建会在本机失败。
  rebuildConfig: { ignoreModules: ['uiohook-napi'] },
  makers: [
    new MakerSquirrel({
      setupIcon: 'build/icon.ico',
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
