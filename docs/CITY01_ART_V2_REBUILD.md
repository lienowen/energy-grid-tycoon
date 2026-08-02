# City-01 Art V2 Rebuild

## Product goal

City-01 must read as one modern city-management game at first glance. The old asset library may remain temporarily for content coverage, but it is no longer allowed to define color, lighting, grounding, scale, UI hierarchy, or material language.

## Locked visual direction

- Camera: 2:1 isometric, fixed projection and anchor contract.
- World: contemporary coastal clean-energy city.
- Materials: clean painted 3D illustration, restrained detail, no photoreal collage.
- Lighting: one upper-left key light at approximately 45 degrees.
- Shadows: soft contact shadows toward the lower right; no baked rectangular ground shadows.
- Palette: deep teal ocean, muted green land, cool neutral infrastructure, warm gold only for rewards and construction.
- UI: modern command interface, layered glass surfaces, clear information hierarchy, no tiny arcade pills.

## Legacy policy

Legacy assets may render only as temporary placeholders. They may not introduce new hard-coded colors, independent lighting directions, ground pads, road fragments, or UI treatments. Every new presentation value must be routed through `City01ArtV2Theme.ts`.

## Rebuild order

### Phase 1 — Foundation

- [x] Versioned Art V2 theme tokens.
- [x] Terrain and road renderer routed through Art V2.
- [x] Building grounding and tint routed through Art V2.
- [x] Modern world atmosphere and game shell.
- [x] Runtime marker and regression tests.

### Phase 2 — World kit

- [ ] Replace terrain atlas with Art V2 grass, water, coast, beach, rock and vegetation.
- [ ] Replace procedural roads with a complete road and bridge tileset.
- [ ] Add coherent world props: trees, lamps, barriers, signs and service objects.
- [ ] Add chunk-level material variation without checkerboarding.

### Phase 3 — Building kit

- [ ] Produce one modular residential family.
- [ ] Produce one modular commercial/public family.
- [ ] Produce one industrial and logistics family.
- [ ] Rebuild all power facilities with shared scale, perspective and lighting.
- [ ] Supply active, offline, construction and fault states.

### Phase 4 — Motion and effects

- [ ] Water and coast motion.
- [ ] Traffic and service vehicles.
- [ ] Wind, smoke, electrical and storage effects.
- [ ] Construction, upgrade and failure feedback.

### Phase 5 — Release quality

- [ ] Dedicated visual QA scene showing all assets and states.
- [ ] Desktop, ultrawide, mobile portrait and mobile landscape snapshots.
- [ ] Visual regression thresholds and performance budgets.
- [ ] Remove all remaining legacy runtime assets.

## Acceptance rule

A phase is not complete because its tests pass. It is complete only when the generated screenshots show a visible improvement at normal gameplay zoom and no element looks pasted in from another game.
