from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WIDTH = 1024
HEIGHT = 768
FOCUS = (54.0, 50.0, 0.0)


def project(x: float, z: float, elevation: float = 0.0) -> tuple[float, float]:
    def raw(px: float, pz: float, pe: float) -> tuple[float, float]:
        return ((px / 10 - pz / 10) * 64, (px / 10 + pz / 10) * 32 - pe * 11.5)

    focus_x, focus_y = raw(*FOCUS)
    point_x, point_y = raw(x, z, elevation)
    return 512 + point_x - focus_x, 384 + point_y - focus_y


def points(values: list[tuple[float, float]]) -> str:
    return ' '.join(f'{x:.1f},{y:.1f}' for x, y in values)


def diamond(x: float, z: float, radius_x: float, radius_z: float, elevation: float = 0.0):
    return [
        project(x - radius_x, z, elevation),
        project(x, z - radius_z, elevation),
        project(x + radius_x, z, elevation),
        project(x, z + radius_z, elevation),
    ]


def smooth_path(world_points: list[tuple[float, float]]) -> str:
    projected = [project(x, z) for x, z in world_points]
    path = f'M {projected[0][0]:.1f} {projected[0][1]:.1f}'
    for index in range(1, len(projected) - 1):
        current = projected[index]
        following = projected[index + 1]
        path += (
            f' Q {current[0]:.1f} {current[1]:.1f}'
            f' {(current[0] + following[0]) * 0.5:.1f}'
            f' {(current[1] + following[1]) * 0.5:.1f}'
        )
    last = projected[-1]
    return path + f' L {last[0]:.1f} {last[1]:.1f}'


def building(x: float, z: float, width: float, depth: float, height: float, palette: tuple[str, str, str, str], seed: int):
    base = diamond(x, z, width * 0.5, depth * 0.5, 0.18)
    top = diamond(x, z, width * 0.5, depth * 0.5, 0.18 + height)
    left = [top[0], top[3], base[3], base[0]]
    right = [top[3], top[2], base[2], base[3]]
    window_color = '#FFD77A' if seed % 3 == 0 else '#8FEAFF'
    window_count = 2 + seed % 2
    windows = []
    for index in range(window_count):
        offset = (-1 if window_count == 2 else -1.6) + index * (2 if window_count == 2 else 1.6)
        window_x, window_y = project(x + offset * 0.4, z + depth * 0.22, 0.18 + height * 0.45)
        windows.append(
            f'<rect x="{window_x - 2.2:.1f}" y="{window_y - 1.5:.1f}" width="4.4" height="3" rx="0.8" fill="{window_color}" opacity="0.76"/>'
        )
    center_x, center_y = project(x, z, 0.18 + height)
    return ''.join([
        f'<ellipse cx="{center_x:.1f}" cy="{project(x, z)[1] + 6:.1f}" rx="{width * 5:.1f}" ry="{depth * 1.9:.1f}" fill="#02080B" opacity="0.26" filter="url(#soft)"/>',
        f'<polygon points="{points(left)}" fill="{palette[1]}"/>',
        f'<polygon points="{points(right)}" fill="{palette[2]}"/>',
        f'<polygon points="{points(top)}" fill="{palette[0]}" stroke="{palette[3]}" stroke-opacity="0.25"/>',
        *windows,
    ])


def tree(x: float, z: float, scale: float = 1.0) -> str:
    px, py = project(x, z, 0.08)
    return ''.join([
        f'<rect x="{px - 0.8 * scale:.1f}" y="{py - 1:.1f}" width="{1.6 * scale:.1f}" height="{6 * scale:.1f}" fill="#4A382A" opacity="0.84"/>',
        f'<circle cx="{px:.1f}" cy="{py - 4 * scale:.1f}" r="{4.6 * scale:.1f}" fill="#3D7B58" opacity="0.96"/>',
        f'<circle cx="{px - 2.2 * scale:.1f}" cy="{py - 6.1 * scale:.1f}" r="{2.8 * scale:.1f}" fill="#5C9A71" opacity="0.58"/>',
    ])


def build_svg() -> str:
    core = [(27, 19), (49, 14), (72, 22), (91, 39), (95, 61), (82, 78), (57, 85), (34, 78), (20, 61), (19, 39)]
    water = [(-8, 18), (17, 4), (36, 10), (32, 28), (22, 45), (5, 58), (-10, 52)]
    coast = [(6, 77), (24, 84), (42, 90), (66, 91), (91, 80), (106, 95), (99, 107), (56, 110), (19, 98)]
    ridge = [(21, 8), (41, -3), (65, 0), (95, 18), (90, 31), (67, 22), (43, 19)]
    roads = [
        (2, [(26, 43), (35, 45), (47, 45), (59, 44), (72, 45), (88, 51)]),
        (2, [(20, 68), (33, 65), (46, 63), (59, 64), (73, 66), (88, 65)]),
        (1, [(29, 43), (34, 35), (42, 28), (55, 25), (67, 28), (78, 33)]),
        (1, [(42, 52), (46, 59), (52, 66), (58, 72)]),
        (1, [(70, 31), (69, 40), (69, 49), (77, 57), (85, 65)]),
    ]
    svg = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" fill="none">
<defs>
  <linearGradient id="cityGround" x1="300" y1="220" x2="760" y2="650" gradientUnits="userSpaceOnUse"><stop stop-color="#24433D"/><stop offset="1" stop-color="#122A27"/></linearGradient>
  <linearGradient id="water" x1="100" y1="120" x2="420" y2="600" gradientUnits="userSpaceOnUse"><stop stop-color="#092A3A"/><stop offset="1" stop-color="#061923"/></linearGradient>
  <linearGradient id="coast" x1="220" y1="560" x2="780" y2="760" gradientUnits="userSpaceOnUse"><stop stop-color="#1C3332"/><stop offset="1" stop-color="#132523"/></linearGradient>
  <linearGradient id="road" x1="280" y1="280" x2="730" y2="650" gradientUnits="userSpaceOnUse"><stop stop-color="#3B4D52"/><stop offset="1" stop-color="#202D31"/></linearGradient>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>
</defs>''']
    svg.append(f'<polygon points="{points([project(x, z, -0.45) for x, z in water])}" fill="url(#water)" stroke="#2C6779" stroke-opacity="0.36" stroke-width="2"/>')
    for index in range(5):
        start = project(4 + index * 3, 26 + index * 5, -0.42)
        end = project(20 + index * 2, 27 + index * 5, -0.42)
        svg.append(f'<path d="M{start[0]:.1f} {start[1]:.1f} Q {(start[0] + end[0]) * 0.5:.1f} {(start[1] + end[1]) * 0.5 - 4:.1f} {end[0]:.1f} {end[1]:.1f}" stroke="#4B9CB3" stroke-opacity="0.12" stroke-width="2"/>')
    svg.append(f'<polygon points="{points([project(x, z, -0.48) for x, z in coast])}" fill="url(#coast)" stroke="#395953" stroke-opacity="0.2"/>')
    for layer, (offset, alpha, color) in enumerate([(0, 0.72, '#18312D'), (3, 0.58, '#204038'), (6, 0.42, '#294C40')]):
        svg.append(f'<polygon points="{points([project(x, z + offset, -0.28 + layer * 0.06) for x, z in ridge])}" fill="{color}" opacity="{alpha}" stroke="#5C7C73" stroke-opacity="0.08"/>')
    svg.append(f'<polygon points="{points([project(x, z, -0.34) for x, z in core])}" fill="url(#cityGround)" stroke="#56766F" stroke-opacity="0.22" stroke-width="2"/>')
    parcels = [(34, 35, 14, 10, '#25433F'), (55, 28, 18, 9, '#24423F'), (37, 53, 16, 12, '#243C42'), (58, 51, 15, 12, '#263A3D'), (72, 50, 16, 12, '#3A3832'), (52, 68, 17, 11, '#294943'), (82, 67, 15, 11, '#322D30')]
    for x, z, width, depth, color in parcels:
        svg.append(f'<polygon points="{points(diamond(x, z, width * 0.5, depth * 0.5, -0.24))}" fill="{color}" opacity="0.82" stroke="#78928A" stroke-opacity="0.08"/>')
    for lane_count, road_points in roads:
        path = smooth_path(road_points)
        outer_width = 28 if lane_count == 2 else 19
        inner_width = 18 if lane_count == 2 else 11
        svg.extend([
            f'<path d="{path}" stroke="#0A1114" stroke-width="{outer_width}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>',
            f'<path d="{path}" stroke="#5C6768" stroke-width="{outer_width - 6}" stroke-linecap="round" stroke-linejoin="round" opacity="0.22"/>',
            f'<path d="{path}" stroke="url(#road)" stroke-width="{inner_width}" stroke-linecap="round" stroke-linejoin="round"/>',
            f'<path d="{path}" stroke="#E4C968" stroke-width="{1.5 if lane_count == 2 else 0.9}" stroke-linecap="round" opacity="{0.36 if lane_count == 2 else 0.16}"/>',
        ])
    for x, z, radius, color in [(34, 44, 2.4, '#33494B'), (48, 45, 3.0, '#374C51'), (58, 64, 2.6, '#31534D'), (71, 46, 2.6, '#49423C')]:
        svg.append(f'<polygon points="{points(diamond(x, z, radius, radius, -0.14))}" fill="{color}" stroke="#B3C1BB" stroke-opacity="0.14"/>')
    svg.append(f'<polygon points="{points(diamond(57, 39, 8.5, 5, -0.19))}" fill="#2D5C45" opacity="0.95" stroke="#65A17C" stroke-opacity="0.22"/>')
    palettes = {
        'residential': ('#4C8190', '#315A64', '#254952', '#79D1E3'),
        'mixed': ('#596F7A', '#3A5059', '#2D4148', '#F0CE75'),
        'service': ('#4F7F73', '#345C54', '#294B45', '#80DFC0'),
        'warehouse': ('#6D5A4C', '#4A3E36', '#3B312C', '#DEA16F'),
    }
    clusters = [('west', 31, 48, 'mixed'), ('north', 38, 36, 'residential'), ('center', 56, 49, 'mixed'), ('park', 62, 36, 'residential'), ('civic', 50, 60, 'service'), ('industrial', 70, 59, 'warehouse'), ('east', 81, 52, 'warehouse')]
    for cluster_index, (_, x, z, tone) in enumerate(clusters):
        svg.append(f'<polygon points="{points(diamond(x, z, 5.4, 3.9, -0.20))}" fill="#1B2E2D" opacity="0.92" stroke="#70857E" stroke-opacity="0.12"/>')
        offsets = [(-2.0, -0.8, 2.6, 2.2, 1.6), (1.1, -0.4, 2.8, 2.3, 2.0), (-0.2, 1.6, 2.4, 1.9, 1.35)]
        if tone == 'warehouse':
            offsets = [(-1.7, -0.5, 3.2, 2.6, 1.2), (1.4, 0.7, 3.0, 2.3, 1.45)]
        for building_index, (offset_x, offset_z, width, depth, height) in enumerate(offsets):
            svg.append(building(x + offset_x, z + offset_z, width, depth, height, palettes[tone], cluster_index * 5 + building_index))
    for x, z, scale in [(27, 31, 1), (31, 28, 0.9), (43, 18, 1), (48, 16, 0.8), (67, 18, 1), (74, 24, 1), (91, 36, 0.9), (94, 43, 0.8), (94, 57, 1), (87, 77, 1), (73, 81, 0.9), (45, 82, 1), (29, 73, 0.9), (23, 57, 1), (51, 38, 0.8), (63, 40, 0.9), (55, 34, 0.8), (59, 43, 0.8), (47, 58, 0.8), (65, 60, 0.8)]:
        svg.append(tree(x, z, scale))
    svg.append('</svg>')
    return '\n'.join(svg)


def rewrite_planner() -> None:
    planner = ROOT / 'src/presentation/CommercialCityLifePlanner.ts'
    planner.write_text("""import type { CitySceneState, DistrictPrefabStatus, RoadSceneState, ScenePoint } from './CitySceneTypes';

export type CommercialVehicleTone = 'commuter' | 'service' | 'freight';

export interface CommercialStreetLightPlan {
  id: string;
  point: ScenePoint;
  lit: boolean;
  side: -1 | 1;
}

export interface CommercialVehiclePlan {
  id: string;
  path: ScenePoint[];
  phase: number;
  speed: number;
  tone: CommercialVehicleTone;
  headlights: boolean;
}

export interface CommercialDistrictRecoveryPlan {
  id: string;
  point: ScenePoint;
  width: number;
  depth: number;
  status: DistrictPrefabStatus;
  intensity: number;
  phase: number;
}

export interface CommercialCityLifePlan {
  streetLights: CommercialStreetLightPlan[];
  vehicles: CommercialVehiclePlan[];
  recovery: CommercialDistrictRecoveryPlan[];
}

const seededUnit = (seed: number, salt: number): number => {
  let value = (seed ^ Math.imul(salt + 1, 0x45d9f3b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

const interpolate = (from: ScenePoint, to: ScenePoint, progress: number): ScenePoint => ({
  x: from.x + (to.x - from.x) * progress,
  z: from.z + (to.z - from.z) * progress,
  elevation: from.elevation + (to.elevation - from.elevation) * progress
});

const makeStreetLights = (roads: readonly RoadSceneState[], lit: boolean): CommercialStreetLightPlan[] => {
  const lights: CommercialStreetLightPlan[] = [];
  for (let roadIndex = 0; roadIndex < roads.length; roadIndex += 1) {
    const road = roads[roadIndex];
    if (!road) continue;
    for (let segmentIndex = 0; segmentIndex < road.points.length - 1; segmentIndex += 1) {
      const from = road.points[segmentIndex];
      const to = road.points[segmentIndex + 1];
      if (!from || !to) continue;
      for (const progress of [0.28, 0.72]) {
        const base = interpolate(from, to, progress);
        const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
        const side = ((roadIndex + segmentIndex + Math.round(progress * 10)) % 2 === 0 ? -1 : 1) as -1 | 1;
        const offset = road.laneCount === 2 ? 1.55 : 1.15;
        lights.push({
          id: `${road.id}-lamp-${segmentIndex}-${progress}`,
          point: {
            x: base.x - (to.z - from.z) / length * offset * side,
            z: base.z + (to.x - from.x) / length * offset * side,
            elevation: 0.04
          },
          lit: lit && road.powered,
          side
        });
        if (lights.length >= 30) return lights;
      }
    }
  }
  return lights;
};

const makeVehicles = (roads: readonly RoadSceneState[], headlights: boolean, diagnostics: boolean): CommercialVehiclePlan[] => {
  if (diagnostics) return [];
  const vehicles: CommercialVehiclePlan[] = [];
  roads.forEach((road, roadIndex) => {
    if (road.points.length < 2 || road.traffic < 0.08) return;
    const count = road.laneCount === 2 && road.traffic > 0.35 ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      vehicles.push({
        id: `${road.id}-vehicle-${index}`,
        path: road.points.map((candidate) => ({ ...candidate, elevation: 0.05 })),
        phase: seededUnit(roadIndex + 17, index + 31),
        speed: 0.022 + road.traffic * 0.032 + index * 0.004,
        tone: road.id.includes('south') ? 'freight' : index % 4 === 0 ? 'service' : 'commuter',
        headlights
      });
    }
  });
  return vehicles.slice(0, 11);
};

export const planCommercialCityLife = (
  state: Pick<CitySceneState, 'levelId' | 'hour' | 'presentationMode' | 'roads' | 'districtPrefabs'>
): CommercialCityLifePlan => {
  if (state.levelId !== 'city-01') return { streetLights: [], vehicles: [], recovery: [] };
  const night = state.hour < 6 || state.hour >= 18;
  const diagnostics = state.presentationMode === 'grid';
  return {
    streetLights: makeStreetLights(state.roads, night),
    vehicles: makeVehicles(state.roads, night, diagnostics),
    recovery: (state.districtPrefabs ?? [])
      .filter((district) => district.status !== 'normal')
      .map((district, index) => ({
        id: `${district.id}-recovery`,
        point: { x: district.x, z: district.z, elevation: 0.18 },
        width: district.width,
        depth: district.depth,
        status: district.status,
        intensity: Math.max(0.16, 1 - district.powerRatio),
        phase: seededUnit(district.variant, index + 71)
      }))
  };
};
""", encoding='utf-8')


def rewrite_tests() -> None:
    test = ROOT / 'src/presentation/CommercialCityLifePlanner.test.ts'
    text = test.read_text(encoding='utf-8')
    start = text.index("describe('CommercialCityLifePlanner'")
    prefix = text[:start]
    body = """describe('CommercialCityLifePlanner', () => {
  it('adds bounded street life without overwhelming the city view', () => {
    const plan = planCommercialCityLife(makeState());
    expect(plan.streetLights.length).toBeGreaterThan(0);
    expect(plan.streetLights.length).toBeLessThanOrEqual(30);
    expect(plan.vehicles.length).toBeGreaterThan(0);
    expect(plan.vehicles.length).toBeLessThanOrEqual(11);
    expect(plan.streetLights.some((light) => light.lit)).toBe(true);
  });

  it('removes moving traffic from diagnostics', () => {
    const plan = planCommercialCityLife(makeState({ presentationMode: 'grid' }));
    expect(plan.streetLights.length).toBeGreaterThan(0);
    expect(plan.vehicles).toHaveLength(0);
  });

  it('only creates recovery pulses for districts that need attention', () => {
    const plan = planCommercialCityLife(makeState());
    expect(plan.recovery).toHaveLength(1);
    expect(plan.recovery[0]).toMatchObject({ id: 'residential-recovery', status: 'blackout' });
  });

  it('does not apply the commercial city layer to later procedural levels', () => {
    const plan = planCommercialCityLife(makeState({ levelId: 'city-02' }));
    expect(plan).toEqual({ streetLights: [], vehicles: [], recovery: [] });
  });
});
"""
    test.write_text(prefix + body, encoding='utf-8')


def rewrite_renderer() -> None:
    path = ROOT / 'src/presentation/pixi/ImmersivePixiWorld.ts'
    text = path.read_text(encoding='utf-8')
    text = text.replace(
        "import {\n  planCommercialCityLife,\n  type CityFabricPatch,\n  type CommercialCityLifePlan\n} from '../CommercialCityLifePlanner';",
        "import { planCommercialCityLife, type CommercialCityLifePlan } from '../CommercialCityLifePlanner';"
    )
    text = re.sub(
        r"\nconst commercialFabricColor:[\s\S]+?\nconst commercialFacilityWidth =",
        "\nconst commercialFacilityWidth =",
        text,
        count=1
    )
    old = """    if (authored) {
      if (commercialLife) this.drawCommercialCityFabric(commercialLife);
      this.drawEnvironment(state.environment ?? []);
      this.drawAuthoredRoads(state.roads);
      if (commercialLife) {
        this.drawCommercialJunctions(commercialLife);
        this.drawCommercialInfill(commercialLife, showDiagnostics);
        this.drawCommercialStreetLife(commercialLife);
      }
      this.drawEnergyNetwork(state, generation, showDiagnostics);
      this.drawDistrictPrefabs(state, generation, showDiagnostics);
      if (commercialLife && !showDiagnostics) this.drawDistrictRecovery(commercialLife);
"""
    new = """    if (authored) {
      if (commercialLife) {
        this.drawCommercialCityBase(state, generation);
        this.drawCommercialStreetLife(commercialLife);
      } else {
        this.drawEnvironment(state.environment ?? []);
        this.drawAuthoredRoads(state.roads);
      }
      this.drawEnergyNetwork(state, generation, showDiagnostics);
      this.drawDistrictPrefabs(state, generation, showDiagnostics);
      if (commercialLife && !showDiagnostics) this.drawDistrictRecovery(commercialLife);
"""
    if old not in text:
        raise RuntimeError('render scene block changed unexpectedly')
    text = text.replace(old, new, 1)
    start = text.index('  private drawCommercialCityFabric(')
    end = text.index('  private drawCommercialStreetLife(', start)
    base_method = """  private drawCommercialCityBase(state: CitySceneState, generation: number): void {
    const point = { ...(state.focus ?? state.city), elevation: -0.34 };
    const position = this.project(point);
    const slot = new Container();
    slot.position.set(position.x, position.y);
    slot.zIndex = -700;
    this.layerManager.layers.terrain.addChild(slot);
    void this.assets.load('commercial_city_dawn_base').then((texture) => {
      if (!texture || !this.mounted || generation !== this.renderGeneration || slot.destroyed) return;
      slot.addChild(this.makeSprite(texture, 1024, 0.5, 1));
    });
  }

"""
    text = text[:start] + base_method + text[end:]
    path.write_text(text, encoding='utf-8')


def update_catalog() -> None:
    path = ROOT / 'src/resources/asset-catalog-commercial.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    entries = [entry for entry in catalog['entries'] if entry['id'] != 'commercial_city_dawn_base']
    entries.insert(0, {
        'id': 'commercial_city_dawn_base',
        'kind': 'image',
        'src': '/assets/commercial/environment/dawn-city-base.svg',
        'version': 7,
        'preload': 'level',
        'width': 1024,
        'height': 768,
        'anchor': {'x': 0.5, 'y': 0.5},
        'tags': ['global', 'commercial', 'v7', 'environment', 'city-base', 'dawn-city']
    })
    catalog['schemaVersion'] = max(7, int(catalog.get('schemaVersion', 0)))
    catalog['entries'] = entries
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


asset = ROOT / 'public/assets/commercial/environment/dawn-city-base.svg'
asset.parent.mkdir(parents=True, exist_ok=True)
asset.write_text(build_svg(), encoding='utf-8')
rewrite_planner()
rewrite_tests()
rewrite_renderer()
update_catalog()
