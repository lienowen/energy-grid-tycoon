# Energy Grid Tycoon Architecture

## Dependency direction

```text
Data / Resources
      ↓
Core → Systems → Gameplay
      ↓
      UI
```

The UI may call the application controller. It must not calculate economy, power, storage, goals, or event effects.

## Modules

- `src/core`
  - Application and session lifecycle.
  - Versioned persistence and player progression.
  - Canonical game state.
- `src/systems`
  - Reusable deterministic algorithms: power, storage, economy, goals, events, simulation.
  - No DOM and no asset paths.
- `src/gameplay`
  - Special mechanics that modify common algorithms through explicit inputs.
- `src/buildings`
  - Building runtime model, factory, collection, and snapshots.
- `src/data`
  - Levels, buildings, and event parameters. Content expansion belongs here.
- `src/resources`
  - Global asset identifiers and lookup.
- `src/ui`
  - Rendering and user input only.

## Frozen rules

1. A level is data, never an `if (levelId)` branch in systems.
2. Asset paths and presentation symbols are resolved by the resource layer.
3. Common calculations are implemented once in `systems`.
4. Special building behavior is selected by `specialLogic`, not embedded in level code.
5. Save files contain state and runtime snapshots, not duplicated configuration.
6. New features must preserve the dependency direction above.

## Runtime flow

```text
AppController
  → LevelLoader / SaveManager
  → GameManager
  → SimulationSystem
      → SpecialLogicSystem
      → StorageSystem
      → PowerSystem
      → EconomySystem
      → GoalSystem
  → Dashboard
```

## Content extension examples

- New city: add one object to `src/data/levels.json`.
- New standard generator: add a building config and resource identifier.
- New event: add event data; reuse `EventSystem` effects.
- New exceptional mechanic: add a gameplay module and expose it through a typed system input.

Architecture changes require updating this document in the same milestone as the code change.
