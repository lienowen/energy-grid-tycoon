# Energy Grid Tycoon - City-01 完整基础素材包 v0.2

这是 City-01 的**完整基础底稿素材包**，包含 11 张基础 PNG：

## 城区（5）
- district-residential-base.png
- district-commercial-base.png
- district-industrial-base.png
- district-public-base.png
- district-old-town-base.png

## 能源与电网设施（6）
- facility-solar-farm-base.png
- facility-wind-farm-base.png
- facility-gas-peaker-base.png
- facility-battery-storage-base.png
- facility-main-substation-base.png
- facility-distribution-node-base.png

## 已统一的规范
- 画布：1024×768
- 透明背景：是
- 透视：2:1 等距
- 光源：左上
- 默认锚点：x=0.5, y=0.9115（像素 512,700）
- 命名：英文，适合直接入库
- 状态策略：建议只保留 base 图，由 PixiJS tint / alpha / glow 表现停电、过载、选中等状态

## 文件夹说明
- `raw/`：原始生成图，保留作再次加工底稿
- `sprites/`：已经统一规格的正式上传版本
- `preview/`：整套素材总览
- `integration/`：素材目录片段和映射样例

## 推荐上传
将 `sprites/` 中的 11 张 PNG 上传到：
`public/assets/city01/base/`

然后将：
- `integration/asset-catalog-snippet.json`
- `integration/layout-mapping-example.json`

合并进项目资源注册与第一关场景映射配置。

## 说明
这套包已经覆盖 City-01 当前必须的基础底稿素材。
如果后续要做更细致的局部停电窗灯、道路灯、施工动画，可额外添加 mask / overlay 文件，但**不是当前接入运行的前置条件**。
