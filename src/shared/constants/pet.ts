// 桌宠窗口与画布的共享尺寸。主进程命中测试和渲染进程布局必须使用同一组数值。
export const PET_WINDOW_SIZE = 220;
/** 角色立绘在 256 原始画布下渲染的显示边长。 */
export const PET_ART_SIZE = 160;
/** 角色立绘相对舞台左上角的偏移；命中测试与渲染必须共用。 */
export const PET_ART_LEFT = (PET_WINDOW_SIZE - PET_ART_SIZE) / 2;
export const PET_ART_TOP = PET_WINDOW_SIZE - PET_ART_SIZE - 16;
