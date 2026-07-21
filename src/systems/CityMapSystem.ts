import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { CityPlotConfig, InitialCityPlacementConfig } from '../core/CityMapConfig';

export interface CityPlacementCheck {
  ok: boolean;
  reason?: string;
}

const occupiedPlotIds = (buildings: readonly BuildingBase[]): Set<string> => new Set(
  buildings
    .map((building) => building.placementId)
    .filter((placementId): placementId is string => Boolean(placementId))
);

export class CityMapSystem {
  static canPlace(
    config: BuildingConfig,
    plot: CityPlotConfig | undefined,
    buildings: readonly BuildingBase[]
  ): CityPlacementCheck {
    if (!plot) return { ok: false, reason: '没有找到这块城市用地' };
    if (plot.locked) return { ok: false, reason: '这块用地还没有开放' };
    if (occupiedPlotIds(buildings).has(plot.id)) return { ok: false, reason: '这块用地已经有设施了' };
    if (!plot.accepts.includes(config.category)) {
      return { ok: false, reason: '这类设施不适合建在这里' };
    }
    if (config.placementZones?.length && !config.placementZones.includes(plot.zone)) {
      return { ok: false, reason: `请把${config.name}建在更合适的区域` };
    }
    return { ok: true };
  }

  static assignStartingBuildings(
    buildings: readonly BuildingBase[],
    plots: readonly CityPlotConfig[],
    placements: readonly InitialCityPlacementConfig[] = []
  ): void {
    const byId = new Map(plots.map((plot) => [plot.id, plot]));
    const reserved = new Set<string>();

    for (const placement of placements) {
      const building = buildings.find((item) =>
        !item.placementId
        && item.config.id === placement.buildingId
      );
      const plot = byId.get(placement.plotId);
      if (!building || !plot || reserved.has(plot.id)) continue;
      const check = this.canPlace(building.config, plot, buildings);
      if (!check.ok) continue;
      building.place(plot.id);
      reserved.add(plot.id);
    }

    for (const building of buildings) {
      if (building.placementId) continue;
      const plot = plots.find((candidate) =>
        !reserved.has(candidate.id)
        && this.canPlace(building.config, candidate, buildings).ok
      );
      if (!plot) continue;
      building.place(plot.id);
      reserved.add(plot.id);
    }
  }

  static getPlot(
    plots: readonly CityPlotConfig[],
    plotId: string
  ): CityPlotConfig | undefined {
    return plots.find((plot) => plot.id === plotId);
  }
}
