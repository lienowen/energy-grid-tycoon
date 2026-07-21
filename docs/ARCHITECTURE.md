# Energy Grid Tycoon Architecture

## Dependency direction

```text
Data / Resources
       ↓
AppController → GameManager → Systems
       ↓             ↓          ↓
      UI         Core State   Gameplay hooks
```

The UI consumes a `GameViewModel` and dispatches typed actions. It must not calculate economy, power, storage, research, policy, upgrade, goal, event, or telemetry effects.

## Modules

- `src/core`
  - Application and session lifecycle.
  - Canonical game state.
  - Versioned persistence, migration and player progression.
  - Persistence snapshot schemas live here so lower-level runtime modules do not own save formats.
- `src/systems`
  - Reusable algorithms: power, storage, economy, goals, events, simulation, research, policies, upgrades and telemetry.
  - No DOM and no asset paths.
  - Technology and policy effects are composed through `SimulationModifiers`.
- `src/gameplay`
  - Exceptional mechanics that modify common algorithms through explicit typed inputs.
  - Building-specific production curves are selected by `specialLogic`.
- `src/buildings`
  - Building runtime model, factory, collection, levels and snapshots.
  - Config owns upgrade parameters; runtime instances own only mutable state.
- `src/data`
  - Levels, buildings, events, technologies and policies.
  - Content expansion belongs here unless a genuinely new algorithm is required.
- `src/resources`
  - Global asset identifiers and lookup.
- `src/ui`
  - Rendering and user input only.
  - Tabs may present building, technology, policy, fleet and analytics views, but calculations remain in systems.

## Frozen rules

1. A level is data, never an `if (levelId)` branch in systems.
2. Asset paths and presentation symbols are resolved by the resource layer.
3. Common calculations are implemented once in `systems`.
4. Special building behavior is selected by `specialLogic`, not embedded in level code.
5. Save files contain state and runtime snapshots, not duplicated configuration.
6. Technology and policy effects must enter simulation through typed modifiers.
7. Per-building upgrades must use config parameters and runtime level; UI never calculates upgrade cost.
8. Telemetry is observational and must not mutate simulation results.
9. New features must preserve this dependency direction.

## Runtime flow

```text
AppController
  → LevelLoader / SaveManager
  → GameManager
      → ResearchSystem + PolicySystem
      → SimulationModifiers
      → SimulationSystem
          → SpecialLogicSystem
          → StorageSystem
          → PowerSystem
          → EconomySystem
      → GoalSystem
      → TelemetrySystem
  → Dashboard
```

## Persistence flow

```text
GameState + BuildingSnapshot + ActiveEventSnapshot + TelemetrySnapshot
                              ↓
                         SaveManager v2
                              ↓
                    localStorage / migration
```

Older version-one saves are normalized into the current state shape. New mutable runtime fields require a migration default in `SaveManager` in the same change.

## Content extension examples

- New city: add one object to `src/data/levels.json`.
- New standard generator or storage unit: add building data and a resource identifier.
- New technology: add data with prerequisites and modifier effects.
- New policy: add data with activation cost and modifier effects.
- New event: add event data and reuse `EventSystem` effects.
- New exceptional mechanic: add a gameplay module and expose it through a typed system input.

Architecture changes require updating this document in the same milestone as the code change.
