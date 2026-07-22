# 全息城市沙盘实现标准

主视图不再由 DOM 卡片拼成城市地图。城市世界由持续存在的 Canvas 场景渲染，DOM 只负责状态栏、目标、提示、建造栏和二级工具。

## 数据流

```text
GameManager / Systems / Rules
            ↓
       GameViewModel
            ↓
      CitySceneMapper
            ↓
       CitySceneState
            ↓
  HologramCanvasRenderer
```

- `GameManager` 不知道镜头、光效、动画和 Canvas。
- `CitySceneMapper` 是纯数据映射，不操作 DOM。
- `HologramSandbox` 管理镜头、鼠标、触控、缩放和素材缓存。
- `HologramCanvasRenderer` 只根据只读场景状态绘制。
- HUD 通过 `MayorDashboard` 更新，但不会销毁沙盘 Canvas。

## 玩家操作闭环

```text
底部选择设施
→ CitySceneMapper 计算合法地块
→ 沙盘高亮可建位置
→ 玩家点击地块
→ GameManager.build(configId, plotId)
→ 存档记录 placementId
→ 沙盘播放设施升起和线路接通动画
```

## 场景分层

渲染顺序固定为：

1. 指挥室背景与透视网格
2. 全息沙盘底座
3. 城市分区地台
4. 输电线路与流动光点
5. 城市核心
6. 建设地块与设施模型
7. 扫描光和状态反馈
8. 角落场景信息

逻辑系统只产生状态。停电、空气恶化、储能工作、建设完成等视觉变化由场景层表达。

## 配置扩展

`LevelWorldPresentationConfig` 提供可选的 `sandbox`：

```ts
sandbox: {
  startZoom: 1,
  minZoom: 0.72,
  maxZoom: 1.75,
  startOffsetX: 0,
  startOffsetY: 18
}
```

地块继续来自关卡配置，可增加：

```ts
{
  id: 'north-community',
  x: 24,
  y: 28,
  elevation: 1.2,
  footprint: { width: 12, height: 9 },
  zone: 'neighborhood',
  accepts: ['generation', 'storage']
}
```

渲染代码不得根据 `level.id` 分支。

## 性能要求

- Canvas 不随模拟 tick 重建。
- 设备像素比最高使用 2，避免超高分屏浪费。
- 图片按素材 ID 缓存。
- 场景状态更新与动画帧分离。
- 命中区域由渲染器统一返回，输入层不复制地图算法。
- 初始设施不播放施工动画，新增设施才播放。

## 后续扩展点

- 独立道路配置和车辆流动
- 分区级停电与居民灯光
- 施工阶段和起重机动画
- 天气粒子和海面动态
- 建筑 spritesheet 动画注册表
- 镜头聚焦剧情事件
- Canvas 音效反馈桥接
