# City-01 设施拆层与切图规范

## 目标

设施主体只包含设备本身。地基、道路、接触阴影和状态底环均由 Tile World 运行时生成，不得烘焙进主体 PNG。

## 统一画布

- 画布：512 × 512 RGBA PNG
- 锚点：`0.5, 0.9115`
- 基线：Y = 467
- 光源：左上方约 45°
- 阴影：右下方，由运行时生成
- 主体、motion、light、effect 必须使用完全相同的画布和锚点

## 文件命名

```text
commercial_facility_<family>_active.png
commercial_facility_<family>_component_motion.png
commercial_facility_<family>_component_light.png
commercial_facility_<family>_component_effect.png
```

`battery_utility` 保留完整 family 名，不与小型 battery 混用。

## 第一批切图

### 风机

- body：塔筒、机舱、静态结构
- motion：叶片和轮毂
- 删除：草地底盘、水泥底盘、烘焙投影
- 动画：围绕轮毂中心旋转

### 燃气设施

- body：厂房、管线、烟囱
- effect：烟雾或热气，不包含烟囱本身
- 删除：方形水泥地、道路、外围草地、整块暗影
- 动画：低速上升并逐渐淡出

### 储能设施

- body：柜体、变压设备和固定结构
- light：充放电灯带或状态灯
- 删除：硬切平台、外围地面和烘焙光晕
- 动画：低频脉冲，不能快速闪烁

### 光伏设施

- body：支架和组件
- light：非常轻的反光扫过层
- 删除：大面积草地底图和矩形地块
- 动画：低频扫光，不改变面板主体颜色

## 禁止项

- 主体图内保留方形草地、水泥板或道路
- 主体图内保留方向错误的 Drop Shadow
- motion 层重复包含主体结构
- effect 层拥有不透明矩形背景
- 用不同画布尺寸或不同锚点拼接
- 为不同运行状态重新改变建筑透视或光源方向

## QA 清单

- [ ] PNG 为 RGBA，透明背景
- [ ] 画布严格 512 × 512
- [ ] 锚点与基线一致
- [ ] 主体没有硬地基
- [ ] 主体没有大块烘焙阴影
- [ ] motion/light/effect 单独关闭后主体仍完整
- [ ] 所有部件叠加后没有双边、重影或位置漂移
- [ ] 0.72–1.75 Zoom 下没有浮空
- [ ] 桌面和移动端截图均通过

## 运行时回退

- body 缺失：显示占位符并记录加载错误
- optional component 缺失：继续使用程序化动画
- optional component 验收通过后：同名 Asset ID 可直接替换程序化表现，无需改地图数据
