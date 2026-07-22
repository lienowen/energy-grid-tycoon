# Energy Grid Tycoon — Global Art Pipeline v3

本包包含 **383 个全局素材注册项**，用于完整全息城市正式原型。

## 已补齐

- 24 种城市建筑，每种：日间 / 夜间 / 停电 / 阴影
- 8 类能源设施，每类：8 种运行状态 / 阴影 / 3 个可动画部件
- 32 个道路拼接切片
- 24 个地形和功能地块
- 8 类车辆 × 4 个方向
- 36 个城市装饰
- 28 个世界状态反馈
- 14 个全息沙盘组件
- 20 个 HUD 图标
- 3 套背景和 2 套网格纹理

## 接入

复制 `public/assets/`，并加载 `src/resources/asset-catalog-v3.json`。

业务代码只使用素材 ID，不写路径：

```ts
AssetManager.get('world_city_residential_01_night');
AssetManager.get('world_facility_wind_active');
AssetManager.get('world_road_t_4_n');
AssetManager.get('world_overlay_power_shortage');
```

## 定位

这是正式原型级代码美术。可支撑完整玩法、状态表达、道路拼接、昼夜、停电、建设和城市生活。
专业美术后续可保持 ID 与尺寸不变，逐张替换。
