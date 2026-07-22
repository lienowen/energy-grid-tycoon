# Energy Grid Tycoon — Global Asset Pack v1

这是一套全局共用素材包，路径和素材 ID 与当前游戏资源注册方式保持一致。

## 直接使用

将本包中的：

- `public/assets/`
- `src/resources/asset-catalog.json`

复制到项目根目录对应位置即可。

业务代码只引用素材 ID，不直接写路径：

```ts
AssetManager.get('building_solar')
```

## 设计规范

- 建筑、科技、政策、事件、状态：512×512 PNG
- 战役背景：1920×1080 PNG
- 全局网格：1024×1024 PNG
- 图标与建筑均为透明背景
- 统一 3/4 等距、深色科幻、青色全息语言
- 锚点统一为中心 `(0.5, 0.5)`
- 不包含关卡专属文字，可跨关卡复用

## 目录规则

- `brand/`：品牌
- `buildings/`：全局设施
- `technologies/`：科技
- `policies/`：政策
- `events/`：事件
- `status/`：状态
- `backgrounds/`：全局背景
- `ui/`：全局纹理

## 说明

这些素材是程序化原创的第一版全局素材，适合直接进入游戏、验证视觉统一性和资源管线。
后续如采用 Blender/Figma/专业插画重绘，只需保持素材 ID 和输出尺寸不变，即可无缝替换。
