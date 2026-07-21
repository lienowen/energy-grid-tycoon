# Energy Grid Tycoon Quality Gate

Every content or engine milestone must pass the same local and CI gate:

```bash
npm run quality
```

The command runs these stages in order:

1. **Content and asset validation**
   - Verifies the asset catalog schema and unique IDs.
   - Verifies every registered file exists and is non-empty.
   - Checks PNG dimensions against catalog metadata.
   - Detects duplicate binary assets.
   - Enforces the global asset byte budget.
   - Verifies level, building, technology, policy and event asset references.
   - Rejects direct `/assets/` paths outside `src/resources`.
2. **Deterministic unit tests**
   - Random seed continuation and replay.
   - Scenario condition evaluation and progress.
   - Rule composition and bounded state updates.
   - Event deck replay.
   - Domain event ordering.
   - Production catalog validation.
   - Level asset bundle planning.
3. **Typecheck and production build**
   - Strict TypeScript validation.
   - Vite production bundle generation.

## Merge standard

A milestone is not considered complete until all three stages pass. New levels should normally add configuration and assets only. New rule types and behaviors require deterministic tests in the same change.

## Asset standard

- Business and UI code use asset IDs, never file paths.
- Boot assets are loaded once at startup.
- Level assets are derived from the selected level catalog and loaded on demand.
- Missing image files degrade to a visible fallback rather than breaking the interface.
- Asset catalog metadata is the source of truth for dimensions, preload groups and byte budget.
