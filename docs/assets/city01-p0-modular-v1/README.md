# City-01 P0 Modular Assets V1

本包包含 10 个已经拆分、重命名并保留透明通道的独立游戏资产。

## 目录

- `assets/road`：4 个道路模块
- `assets/building`：4 个建筑/社区模块
- `assets/park`：1 个公园模块
- `assets/industrial`：1 个工业模块
- `metadata/asset_manifest.json`：尺寸、footprint、anchor、道路连接和用途
- `metadata/City01P0AssetRegistry.ts`：TypeScript 注册示例

## 使用约束

1. PNG 统一为 1024×1024 RGBA，不要再次裁掉透明边距。
2. 建筑渲染时使用 manifest 中的 anchor；道路使用中心锚点。
3. `suburban_neighborhood_01` 是低频大 prefab，不要连续重复摆放。
4. 当前资产为 P0 原型可用级；正式发布前仍需统一材质、路宽和光照。
