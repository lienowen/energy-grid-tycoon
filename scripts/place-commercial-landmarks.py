from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


renderer = 'src/presentation/pixi/ImmersivePixiWorld.ts'
replace_once(
    renderer,
    "} from '../CommercialPresentationPolicy';\nimport { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';\n",
    "} from '../CommercialPresentationPolicy';\nimport { planCommercialFacilities } from '../CommercialLandmarkPlanner';\nimport { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';\n"
)
replace_once(
    renderer,
    "  private drawFacilities(state: CitySceneState, generation: number): void {\n"
    "    const authored = state.sceneMode === 'authored';\n"
    "    for (const facility of state.facilities) {\n",
    "  private drawFacilities(state: CitySceneState, generation: number): void {\n"
    "    const authored = state.sceneMode === 'authored';\n"
    "    const facilities = authored && state.levelId === 'city-01'\n"
    "      ? planCommercialFacilities(state.facilities)\n"
    "      : state.facilities;\n"
    "    for (const facility of facilities) {\n"
)

layout = 'src/presentation/layout/LevelSceneLayoutRegistry.ts'
replace_once(
    layout,
    "        x: 31,\n        y: 49,\n        elevation: 0.15,\n        alwaysOperational: true,\n        capacity: 1.35\n",
    "        x: 43,\n        y: 48,\n        elevation: 0.15,\n        alwaysOperational: true,\n        capacity: 1.35\n"
)
replace_once(
    layout,
    "        x: 49,\n        y: 49,\n        elevation: 0.12,\n        alwaysOperational: true,\n        capacity: 1.15\n",
    "        x: 57,\n        y: 48,\n        elevation: 0.12,\n        alwaysOperational: true,\n        capacity: 1.15\n"
)
replace_once(
    layout,
    "        x: 70,\n        y: 50,\n        elevation: 0.12,\n        alwaysOperational: true,\n        capacity: 1.05\n",
    "        x: 71,\n        y: 50,\n        elevation: 0.12,\n        alwaysOperational: true,\n        capacity: 1.05\n"
)
replace_once(
    layout,
    "        points: [{ x: 21, y: 27 }, { x: 24, y: 34 }, { x: 27, y: 40 }, { x: 30, y: 45 }]\n",
    "        points: [{ x: 17, y: 29 }, { x: 26, y: 35 }, { x: 35, y: 42 }, { x: 43, y: 48 }]\n"
)
replace_once(
    layout,
    "        points: [{ x: 18, y: 70 }, { x: 21, y: 60 }, { x: 25, y: 52 }, { x: 30, y: 45 }]\n",
    "        points: [{ x: 17, y: 72 }, { x: 25, y: 63 }, { x: 34, y: 55 }, { x: 43, y: 48 }]\n"
)
replace_once(
    layout,
    "        points: [{ x: 30, y: 45 }, { x: 39, y: 44 }, { x: 48, y: 45 }]\n",
    "        points: [{ x: 43, y: 48 }, { x: 50, y: 47 }, { x: 57, y: 48 }]\n"
)
replace_once(
    layout,
    "        points: [{ x: 48, y: 45 }, { x: 58, y: 43 }, { x: 70, y: 45 }]\n",
    "        points: [{ x: 57, y: 48 }, { x: 64, y: 47 }, { x: 71, y: 50 }]\n"
)

print('Placed aggregated solar and central grid landmarks.')
