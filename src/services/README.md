# 共享服务

- `input-monitor`：原生键鼠监听、去重和聚合。
- `statistics`：SQLite 建库、迁移、统计与业务服务入口。
- `rewards`：等级和通用奖励的幂等发放。
- `settings`：桌宠和应用偏好。

用户数据库由主进程创建在 Electron 用户数据目录。跨功能写入通过明确服务接口和事务完成。
