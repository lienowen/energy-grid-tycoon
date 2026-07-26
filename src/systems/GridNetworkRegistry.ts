import type { GridNetworkConfig } from './GridGraphSystem';

const dawnCityGrid: GridNetworkConfig = {
  nodes: [
    { id: 'solar-hub', label: '太阳能场', kind: 'generation', plotIds: ['sunrise-neighborhood', 'south-outskirts'], facilityConfigIds: ['solar_basic'], capacity: 0.8 },
    { id: 'wind-hub', label: '风力发电场', kind: 'generation', plotIds: ['east-coast'], facilityConfigIds: ['wind_basic', 'wind_offshore'], capacity: 1.05 },
    { id: 'reserve-plant', label: '应急电站', kind: 'generation', plotIds: ['west-industry'], facilityConfigIds: ['gas_basic'], capacity: 1.2 },
    { id: 'storage-hub', label: '城市储能站', kind: 'storage', plotIds: ['central-utility'], facilityConfigIds: ['battery_basic', 'battery_utility'], capacity: 1.1 },
    { id: 'main-substation', label: '主变电站', kind: 'substation', alwaysOperational: true, capacity: 1.35 },
    { id: 'west-distribution', label: '西部配电', kind: 'distribution', alwaysOperational: true, capacity: 1.15 },
    { id: 'east-distribution', label: '东部配电', kind: 'distribution', alwaysOperational: true, capacity: 1.05 },
    { id: 'residential-load', label: '居住区', kind: 'district', districtId: 'dawn-residential', capacity: 0.9, demandWeight: 0.9, priority: 1 },
    { id: 'commercial-load', label: '商业区', kind: 'district', districtId: 'dawn-commercial', capacity: 1.05, demandWeight: 1.05, priority: 2 },
    { id: 'industrial-load', label: '工业区', kind: 'district', districtId: 'dawn-industrial', capacity: 1.2, demandWeight: 1.2, priority: 3 },
    { id: 'public-load', label: '公共服务区', kind: 'district', districtId: 'dawn-public', capacity: 0.85, demandWeight: 0.85, priority: 0 },
    { id: 'old-town-load', label: '东部老城区', kind: 'district', districtId: 'dawn-old-town', capacity: 0.8, demandWeight: 0.8, priority: 5 }
  ],
  edges: [
    { id: 'solar-to-main', from: 'solar-hub', to: 'main-substation', capacity: 0.78 },
    { id: 'reserve-to-main', from: 'reserve-plant', to: 'main-substation', capacity: 1.2 },
    { id: 'main-to-west', from: 'main-substation', to: 'west-distribution', capacity: 1.25 },
    { id: 'west-to-east', from: 'west-distribution', to: 'east-distribution', capacity: 1.05 },
    { id: 'wind-to-east', from: 'wind-hub', to: 'east-distribution', capacity: 0.95 },
    { id: 'storage-to-east', from: 'storage-hub', to: 'east-distribution', capacity: 1 },
    { id: 'west-to-residential', from: 'west-distribution', to: 'residential-load', capacity: 0.92 },
    { id: 'west-to-commercial', from: 'west-distribution', to: 'commercial-load', capacity: 1 },
    { id: 'west-to-public', from: 'west-distribution', to: 'public-load', capacity: 0.86 },
    { id: 'east-to-industrial', from: 'east-distribution', to: 'industrial-load', capacity: 1.1 },
    { id: 'east-to-public', from: 'east-distribution', to: 'public-load', capacity: 0.82 },
    { id: 'east-to-old-town', from: 'east-distribution', to: 'old-town-load', capacity: 0.76 }
  ]
};

const networks = new Map<string, GridNetworkConfig>([['city-01', dawnCityGrid]]);

export class GridNetworkRegistry {
  static resolve(levelId: string): GridNetworkConfig | undefined {
    return networks.get(levelId);
  }
}
