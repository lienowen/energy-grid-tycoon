# City01 Isometric Terrain Tileset V1

这是一套可直接接入 City-01 Tile World 的正式 2:1 等距地形包。

## 规格

- 逻辑尺寸：128 × 64
- 导出尺寸：256 × 128（@2x）
- 格式：RGBA PNG
- Atlas：TexturePacker/PixiJS 兼容 JSON
- 海岸形态：47 个合法八邻域 Bitmask
- 基础变化：4 草地 + 4 水面
- 浪花 Overlay：12
- 装饰 Overlay：12
- 单独黑白 Mask：47

## Bitmask 合同

| 方向 | 数值 |
|---|---:|
| N | 1 |
| NE | 2 |
| E | 4 |
| SE | 8 |
| S | 16 |
| SW | 32 |
| W | 64 |
| NW | 128 |

与项目 `TerrainAutoTiler.ts` 的位顺序一致。

## 目录

- `atlas/terrain_coast_v1.png`：统一 Atlas
- `atlas/terrain_coast_v1.json`：PixiJS Spritesheet JSON
- `atlas/terrain_coast_mask_map.json`：Mask → Frame 对照
- `tiles/`：独立可编辑 PNG
- `masks/`：47 张黑白地形 Mask
- `overlays/`：浪花覆盖层
- `decor/`：礁石、芦苇、睡莲和沙滩细节
- `integration/City01TerrainTileRegistry.ts`：可直接移入项目
- `docs/MASK_MAP.csv`：完整 Mask 表
- `previews/`：实际图集与拼接验收图

## PixiJS 使用

1. 加载 `atlas/terrain_coast_v1.json`。
2. 水面格使用 `resolveCity01WaterFrame(cell.variation)`。
3. 草地格使用 `resolveCity01TerrainFrame(cell.shoreMask, cell.variation)`。
4. Sprite 以中心锚点放到瓦片投影中心。
5. 当前导出为 @2x，运行时缩放 `0.5`，得到 128×64。
6. 不再用 `Graphics` 绘制沙滩和海岸描边。

## 质量约束

- 母材质使用周期噪声，网格相对边缘可无缝衔接。
- 变化纹理在方格边缘衰减为零，避免随机 variation 产生接缝。
- 沙滩和浪花仅沿真实水草边界生成。
- 对角 Mask 只在相邻两个 Cardinal 均为陆地时保留，因此正好归一化为 47 种。
- 所有 PNG 均为 256×128 RGBA。
