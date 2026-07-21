export type CityFacilityCategory = 'generation' | 'storage' | 'grid';

export type CityPlotZone =
  | 'neighborhood'
  | 'industrial'
  | 'coastal'
  | 'outskirts'
  | 'utility';

export interface CityPlotConfig {
  id: string;
  x: number;
  y: number;
  zone: CityPlotZone;
  accepts: CityFacilityCategory[];
  scale?: number;
  depth?: 'far' | 'mid' | 'near';
  label?: string;
  locked?: boolean;
}

export interface InitialCityPlacementConfig {
  buildingId: string;
  plotId: string;
}
