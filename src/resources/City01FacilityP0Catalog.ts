import type { AssetCatalog, AssetEntry } from './AssetManager';

import windBodyUrl from '../../source/city01/facility-layers-p0/City01_Facility_Layers_P0/wind_turbine_body.png?url';
import gasBodyUrl from '../../source/city01/facility-layers-p0/City01_Facility_Layers_P0/gas_plant_body.png?url';
import gasSmokeUrl from '../../source/city01/facility-layers-p0/City01_Facility_Layers_P0/gas_plant_effect_smoke.png?url';
import storageBodyUrl from '../../source/city01/facility-layers-p0/City01_Facility_Layers_P0/storage_station_body.png?url';
import storageLightUrl from '../../source/city01/facility-layers-p0/City01_Facility_Layers_P0/storage_station_light.png?url';

const entry = (
  id: string,
  src: string,
  tags: readonly string[]
): AssetEntry => ({
  id,
  kind: 'image',
  src,
  version: 1,
  preload: 'level',
  width: 1024,
  height: 1024,
  anchor: { x: 0.5, y: 0.9115 },
  tags: ['city-01', 'facility', 'layered-p0', ...tags]
});

const entries: AssetEntry[] = [
  entry('commercial_facility_wind_p0_body', windBodyUrl, ['wind', 'body', 'active']),
  // The aligned rotor is derived from the exact body source at runtime.
  entry('commercial_facility_wind_p0_motion', windBodyUrl, ['wind', 'motion', 'derived-cut']),
  entry('commercial_facility_gas_p0_body', gasBodyUrl, ['gas', 'body', 'active']),
  entry('commercial_facility_gas_p0_effect', gasSmokeUrl, ['gas', 'effect', 'smoke']),
  entry('commercial_facility_battery_p0_body', storageBodyUrl, ['battery', 'body', 'active']),
  entry('commercial_facility_battery_p0_light', storageLightUrl, ['battery', 'light', 'active']),
  entry('commercial_facility_battery_utility_p0_body', storageBodyUrl, ['battery', 'utility', 'body', 'active']),
  entry('commercial_facility_battery_utility_p0_light', storageLightUrl, ['battery', 'utility', 'light', 'active'])
];

export const city01FacilityP0Catalog: AssetCatalog = {
  schemaVersion: 4,
  budgetBytes: 14_000_000,
  entries
};
