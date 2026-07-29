# Energy Grid Tycoon Quality Gate

Every milestone must pass the same local and CI gate:

```bash
npm run quality
```

The command runs these stages in order.

## 1. Product scope validation

`npm run check:product` verifies that `main` remains focused on the City-01 commercial vertical slice.

It enforces:

- `product-scope.json` is valid and uses the supported schema;
- City-01 is the only release target;
- expansion remains frozen until the slice is approved;
- new cities, unrelated meta systems and new resource families remain blocked;
- README clearly states that the build is not market-ready;
- `storeReady` cannot become `true` while any acceptance item is still `false`;
- the commercial acceptance document remains present.

This gate prevents technical completion from being presented as product completion.

## 2. Content and asset validation

- Verifies asset catalog schemas and unique IDs;
- verifies every registered file exists and is non-empty;
- checks PNG dimensions against catalog metadata;
- detects duplicate binary assets;
- enforces the global asset byte budget;
- verifies level, building, technology, policy and event asset references;
- rejects direct `/assets/` paths outside `src/resources`;
- validates the City-01 unified runtime asset policy.

## 3. Deterministic unit tests

- Random seed continuation and replay;
- scenario condition evaluation and progress;
- rule composition and bounded state updates;
- event deck replay;
- domain event ordering;
- production catalog validation;
- level asset bundle planning;
- map placement, construction, save migration and runtime visual mapping.

## 4. Typecheck and production build

- Strict TypeScript validation;
- Vite production bundle generation.

## Engineering merge standard

A change is not technically complete until all automated stages pass. New rule types and behaviors require deterministic tests in the same change.

Passing this standard only proves that the repository is internally consistent and buildable. It does not prove that the game is commercially ready.

## Commercial release standard

City-01 is not considered ready until every acceptance item in `product-scope.json` is supported by real browser interaction or running screenshots and changed to `true`.

The release standard additionally requires:

- a complete first-five-minute player loop;
- a city that is readable without permanent labels;
- construction, blackout and recovery changes visible in the world;
- production-approved runtime art;
- desktop and mobile screenshots suitable for a store page.

Only after all acceptance items are true may `storeReady` become true and work on a second city begin. See `docs/COMMERCIAL_VERTICAL_SLICE.md`.

## Asset standard

- Business and UI code use asset IDs, never file paths;
- boot assets are loaded once at startup;
- level assets are derived from the selected level catalog and loaded on demand;
- missing image files degrade to a visible fallback rather than breaking the interface;
- asset catalog metadata is the source of truth for dimensions, preload groups and byte budget;
- candidate or sprite-sheet presentation assets must not enter the runtime catalog until their transparency, anchor, footprint and real-scene scale are approved.
