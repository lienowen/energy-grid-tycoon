# City Map Presentation Standard

City maps are gameplay surfaces first and illustration surfaces second.

## 1. Single layout authority

`LevelSceneLayoutRegistry.ts` is the only source of logical position data:

- district anchors
- plot anchors
- facility anchors
- energy nodes and edges
- camera and focus
- diagnostic road topology references

`City01MapComposition.ts` may place only static authored background surfaces and a small amount of ambient traffic. It must not define districts, facilities, plots or energy topology.

`City01IntegratedPixiWorld.ts` renders scene state according to presentation mode. It must not invent new map structure.

`City01RoadTopology.ts` is diagnostic/editor-only for City-01.

## 2. Presentation modes

### game

Default player-facing map.

Render:

- land/background surface
- low-weight authored roads
- district objects
- facility objects
- readable energy status
- small available-plot hints
- placement grounds only while choosing a building

Do not render:

- procedural island geometry
- diagnostic road topology
- permanent large plot bases
- editor labels

### grid

Diagnostic, editor and QA view.

Render:

- procedural island boundary when needed for validation
- road topology and generated access lines
- plot grounds
- energy topology at diagnostic opacity
- diagnostic labels and node markers

### showcase

Illustration-focused presentation.

Render:

- authored map art
- district and facility art
- ambient traffic

Hide:

- energy topology
- available-plot hints
- placement grounds unless a future showcase-specific interaction explicitly requires them

The deprecated `city` mode is temporarily resolved as `game` until all callers migrate.

## 3. Interaction rules

Idle game mode shows only small plot hints for empty, unlocked plots.

A plot hint must:

- remain visually smaller than a facility
- use a low-alpha border or point marker
- have a reasonable click target without drawing a large base
- disappear when placement mode starts

Placement mode may show full plot grounds and valid/warning/invalid overlays. Occupied and locked plots are not placement targets.

## 4. Runtime asset target

The current authored assets are transitional:

- `city01_map_base`
- `city01_road_network_base`
- `city01_ground_details_base`
- `city01_ocean_water_base`

The next asset revision should split them into:

```text
city01_land_base
city01_zone_mask
city01_road_thin
city01_decor_details
district sprites
facility sprites
```

Requirements:

- `city01_land_base` contains only water, coast and land.
- `city01_zone_mask` contains low-alpha gameplay zone communication, not buildings.
- `city01_road_thin` contains narrow, low-contrast roads aligned to layout anchors.
- `city01_decor_details` contains trees, plazas, fountains and small environmental details.
- District and facility buildings remain separate runtime objects.

Nonexistent split assets must not be registered in the runtime catalog before their files and visual review are complete.

## 5. Acceptance criteria

A player should identify within three seconds:

1. where districts are;
2. which facilities exist;
3. where construction is possible;
4. whether the grid is healthy;
5. what changed after an action.

A map that is attractive but fails these checks is a showcase image, not the default game map.
