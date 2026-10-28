# DeskPet 安装与卸载

## 安装

运行 Squirrel 生成的 `DeskPetSetup.exe`，按 Windows 提示完成安装。安装包未签名时可能出现 SmartScreen 提示，应只使用项目可信构建产物。

## 卸载

在 Windows“设置 → 应用 → 已安装的应用”中找到 DeskPet 并选择卸载。

卸载默认保留本地用户数据。如果希望彻底清除：

1. 卸载前在 DeskPet 控制中心打开“设置与隐私”；
2. 选择“重置全部本地数据”；
3. 退出并卸载 DeskPet。

应用无法启动时，可在卸载后手动删除 `%APPDATA%\DeskPet`。删除前请先备份需要保留的便签或统计 CSV；该操作不可撤销。
