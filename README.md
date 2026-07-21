# Energy Grid Tycoon

城市能源模拟经营游戏。

## 架构原则

- Core：底层游戏状态和生命周期
- Systems：公共算法
- Gameplay：特殊玩法
- Data：关卡参数配置
- Resources：公共资源管理

原则：

- 关卡 = 参数
- 素材 = 全局资源
- 算法 = 公共模块
- 新玩法尽量通过配置扩展
