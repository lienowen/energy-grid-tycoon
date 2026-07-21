# Energy Grid Tycoon 素材接入指南

## 可直接合并的目录

```text
public/assets/
├─ brand/
├─ buildings/
├─ technologies/
├─ policies/
├─ events/
├─ status/
├─ backgrounds/
└─ ui/

src/resources/
├─ assets.generated.json
└─ generatedAssets.ts
```

## 规格

- 24 个透明 PNG 图标
- 图标尺寸：512 × 512
- 城市背景：1920 × 1080
- UI 网格纹理：1024 × 1024
- 风格：暗色未来能源策略游戏

## 接入

把 `src/resources/assets.generated.json` 替换为项目当前的
`src/resources/assets.json`，或在入口处加载 `generatedAssets`。

项目现有 UI 会把 AssetManager 的结果当成文本显示。接入 PNG 后，
需要将类似：

```ts
<span>${AssetManager.get(config.assetId)}</span>
```

改为：

```ts
<img class="asset-icon" src="${AssetManager.get(config.assetId)}" alt="" />
```

推荐样式：

```css
.asset-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, .28));
}

.campaign-shell {
  background:
    linear-gradient(rgba(3, 12, 21, .72), rgba(3, 12, 21, .92)),
    url('/assets/backgrounds/campaign-city.png') center / cover fixed;
}
```
