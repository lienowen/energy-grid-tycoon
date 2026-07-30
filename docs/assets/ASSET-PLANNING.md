# Asset Planning Standard

This document defines the only supported path from source artwork to live game assets. The goal is to keep runtime composition small, traceable and replaceable.

## 1. Directory responsibilities

```text
public/assets/runtime/
  Only assets loaded directly by the game at runtime.
  Every file must have a registered assetId and a current owner.

source/
  Original artwork, generated image packs, cutting sources and working files.
  Files here must never be referenced by runtime catalogs.

docs/assets/
  Pack manifests, review notes, version history, replacement plans and retirement reasons.
  Documentation may describe source and runtime files but is never loaded by the game.
```

Existing level-specific folders may be migrated gradually, but new runtime work must follow this responsibility split.

## 2. Single runtime source rule

One `assetId` may resolve to exactly one runtime source.

```text
assetId -> one catalog entry -> one file under public/assets/runtime/
```

The following are forbidden:

- Registering two files under the same `assetId` in different catalogs.
- Leaving an old version active while a replacement is also active.
- Loading files directly from `source/` or `docs/assets/`.
- Using a complete source pack as a runtime catalog.
- Keeping retired assets in `GlobalAssetCatalog` without an explicit compatibility owner.

When an asset is replaced, the old runtime entry must be removed or moved to documented source/archive storage in the same change set.

## 3. Asset lifecycle

```text
source intake
  -> visual and projection review
  -> cutting and normalization
  -> manifest and anchor review
  -> runtime promotion
  -> live composition review
  -> replacement or retirement
```

A source pack is not a runtime asset pack. Promotion requires all of the following:

- Stable `assetId`.
- Transparent runtime image where required.
- Declared canvas size.
- Declared anchor.
- Declared footprint or intended visual role.
- One registered runtime source.
- A real live placement or a documented reason for lazy inventory.
- A retirement path for the asset it replaces.

## 4. Runtime manifest minimum fields

Each runtime image entry must define at least:

```json
{
  "id": "industrial_yard_01",
  "kind": "image",
  "src": "/assets/runtime/city01/industrial/industrial_yard_01.png",
  "version": 1,
  "preload": "level",
  "width": 1024,
  "height": 1024,
  "anchor": { "x": 0.5, "y": 0.91 },
  "tags": ["city-01", "industrial", "urban-fill"]
}
```

Pack documentation must additionally record:

- Source file or generation batch.
- Intended layer.
- Intended district or map zone.
- Recommended rendered width range.
- Rotation and mirroring constraints.
- Replacement target, if any.
- Review status: `source`, `prototype`, `runtime`, `retired`.

## 5. City-01 live composition baseline

City-01 is the reference implementation for later levels.

The normal city view must contain:

- One `city01_map_base` terrain surface.
- One `city01_road_network_base` road surface.
- One `city01_ground_details_base` decoration surface.
- Five to eight low-alpha urban fill placements.
- Four to six small vehicles outside the primary focal point.
- Interactive districts and facilities as the only dominant building layer.

Urban fill rules:

- Alpha must remain between `0.28` and `0.42` in city mode.
- Fill assets close visual gaps; they do not become landmark buildings.
- A fill module must not cover a plot, facility or district anchor.
- Decorative road modules must not be layered over the authored road surface.
- Repetition is allowed only when it is not visually detectable at the home camera.

Energy presentation rules:

- City mode prioritizes the city and keeps plot grounds and grid lines quiet.
- Grid diagnostics mode may increase line opacity, width and diagnostic labels.
- Generation and storage facilities belong on the perimeter unless the level design explicitly requires a central facility.

## 6. Catalog ownership

`GlobalAssetCatalog` is an aggregator, not a storage area for every historical pack.

A catalog may be merged into `GlobalAssetCatalog` only when:

- Its entries are intended for current runtime use.
- Its IDs do not conflict with another catalog.
- Its runtime files exist in the approved runtime tree.
- Its preload group and budget are justified.

Source inventories and retired packs stay documented outside the global runtime catalog.

## 7. Change-set requirements

A runtime asset change is complete only when the same change set includes:

1. Runtime file or replacement.
2. Catalog update.
3. Live placement update, when applicable.
4. Test update for count, alpha, uniqueness and required live IDs.
5. Manifest or planning note.
6. Removal or retirement note for the replaced runtime source.

Passing image loading alone is not acceptance. Acceptance requires a clean home-camera composition without overlapping bases, duplicate roads or competing focal layers.
