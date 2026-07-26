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
    { id: 'solar-to-main', from: 'solar-hub', to: 'main-substation', capacity: 0.78, role: 'feeder' },
    { id: 'reserve-to-main', from: 'reserve-plant', to: 'main-substation', capacity: 1.2, role: 'feeder' },
    { id: 'main-to-west', from: 'main-substation', to: 'west-distribution', capacity: 1.25, controllable: true, role: 'backbone' },
    { id: 'west-to-east', from: 'west-distribution', to: 'east-distribution', capacity: 1.05, controllable: true, role: 'backbone' },
    { id: 'wind-to-east', from: 'wind-hub', to: 'east-distribution', capacity: 0.95, role: 'feeder' },
    { id: 'storage-to-east', from: 'storage-hub', to: 'east-distribution', capacity: 1, role: 'feeder' },
    { id: 'west-to-residential', from: 'west-distribution', to: 'residential-load', capacity: 0.92, role: 'feeder' },
    { id: 'west-to-commercial', from: 'west-distribution', to: 'commercial-load', capacity: 1, role: 'feeder' },
    { id: 'west-to-public', from: 'west-distribution', to: 'public-load', capacity: 0.86, role: 'feeder' },
    {
      id: 'east-to-industrial',
      from: 'east-distribution',
      to: 'industrial-load',
      capacity: 1.1,
      controllable: true,
      initialEnabled: false,
      initialFaulted: true,
      repairCost: 320,
      role: 'feeder'
    },
    {
      id: 'west-to-industrial-tie',
      from: 'west-distribution',
      to: 'industrial-load',
      capacity: 0.12,
      controllable: true,
      initialEnabled: false,
      role: 'tie'
    },
    { id: 'east-to-public', from: 'east-distribution', to: 'public-load', capacity: 0.82, role: 'feeder' },
    { id: 'east-to-old-town', from: 'east-distribution', to: 'old-town-load', capacity: 0.76, role: 'feeder' }
  ]
};

const networks = new Map<string, GridNetworkConfig>([['city-01', dawnCityGrid]]);

const initialBooleanState = (
  network: GridNetworkConfig | undefined,
  selector: (edge: GridNetworkConfig['edges'][number]) => boolean | undefined
): Record<string, boolean> => Object.fromEntries(
  (network?.edges ?? [])
    .map((edge) => [edge.id, selector(edge)] as const)
    .filter((entry): entry is readonly [string, boolean] => entry[1] !== undefined)
);

export class GridNetworkRegistry {
  static resolve(levelId: string): GridNetworkConfig | undefined {
    return networks.get(levelId);
  }

  static getInitialEdgeStates(levelId: string): Record<string, boolean> {
    return initialBooleanState(networks.get(levelId), (edge) => edge.initialEnabled);
  }

  static getInitialFaultStates(levelId: string): Record<string, boolean> {
    return initialBooleanState(networks.get(levelId), (edge) => edge.initialFaulted);
  }

  static withEdgeStates(
    network: GridNetworkConfig,
    edgeStates: Readonly<Record<string, boolean>> | undefined,
    faultStates: Readonly<Record<string, boolean>> | undefined
  ): GridNetworkConfig {
    return {
      nodes: network.nodes,
      edges: network.edges.map((edge) => {
        const switchedOn = edgeStates?.[edge.id] ?? edge.initialEnabled ?? edge.enabled ?? true;
        const faulted = faultStates?.[edge.id] ?? edge.initialFaulted ?? false;
        return { ...edge, enabled: switchedOn && !faulted };
      })
    };
  }
}
