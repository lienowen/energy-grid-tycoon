import { describe, expect, it } from 'vitest';
import {
  GridGraphSystem,
  type GridNetworkConfig
} from './GridGraphSystem';

const singleDistrictNetwork = (lineCapacity = 1): GridNetworkConfig => ({
  nodes: [
    { id: 'plant', label: '电站', kind: 'generation', capacity: 2 },
    { id: 'substation', label: '变电站', kind: 'substation', capacity: 2 },
    {
      id: 'district',
      label: '城区',
      kind: 'district',
      districtId: 'district-a',
      capacity: 1,
      demandWeight: 1,
      priority: 0
    }
  ],
  edges: [
    { id: 'plant-to-substation', from: 'plant', to: 'substation', capacity: lineCapacity },
    { id: 'substation-to-district', from: 'substation', to: 'district', capacity: 1 }
  ]
});

describe('GridGraphSystem', () => {
  it('delivers power only through connected nodes and lines', () => {
    const result = GridGraphSystem.dispatch({
      network: singleDistrictNetwork(),
      demand: 100,
      capacityBase: 100,
      sources: [{ nodeId: 'plant', available: 100 }]
    });

    expect(result.servedDemand).toBeCloseTo(100);
    expect(result.shortage).toBeCloseTo(0);
    expect(result.districts[0]?.supplyRatio).toBeCloseTo(1);
    expect(result.edges.find((edge) => edge.edgeId === 'plant-to-substation')?.flow)
      .toBeCloseTo(100);
  });

  it('turns a saturated line into a real supply bottleneck', () => {
    const result = GridGraphSystem.dispatch({
      network: singleDistrictNetwork(0.4),
      demand: 100,
      capacityBase: 100,
      sources: [{ nodeId: 'plant', available: 100 }]
    });

    expect(result.servedDemand).toBeCloseTo(40);
    expect(result.shortage).toBeCloseTo(60);
    expect(result.districts[0]?.supplyRatio).toBeCloseTo(0.4);
    expect(result.edges.find((edge) => edge.edgeId === 'plant-to-substation')).toMatchObject({
      flow: 40,
      capacity: 40,
      status: 'overload'
    });
  });

  it('cannot use generation that has no path to a district', () => {
    const network = singleDistrictNetwork();
    network.edges = [];
    const result = GridGraphSystem.dispatch({
      network,
      demand: 100,
      capacityBase: 100,
      sources: [{ nodeId: 'plant', available: 100 }]
    });

    expect(result.servedDemand).toBe(0);
    expect(result.shortage).toBe(100);
    expect(result.curtailedSupply).toBe(100);
    expect(result.districts[0]?.supplyRatio).toBe(0);
  });

  it('protects higher-priority districts before allocating remaining capacity', () => {
    const network: GridNetworkConfig = {
      nodes: [
        { id: 'plant', label: '电站', kind: 'generation', capacity: 2 },
        { id: 'bus', label: '母线', kind: 'distribution', capacity: 2 },
        {
          id: 'public',
          label: '公共服务区',
          kind: 'district',
          districtId: 'public-district',
          capacity: 1,
          demandWeight: 1,
          priority: 0
        },
        {
          id: 'industry',
          label: '工业区',
          kind: 'district',
          districtId: 'industry-district',
          capacity: 1,
          demandWeight: 1,
          priority: 2
        }
      ],
      edges: [
        { id: 'plant-to-bus', from: 'plant', to: 'bus', capacity: 0.7 },
        { id: 'bus-to-public', from: 'bus', to: 'public', capacity: 1 },
        { id: 'bus-to-industry', from: 'bus', to: 'industry', capacity: 1 }
      ]
    };

    const result = GridGraphSystem.dispatch({
      network,
      demand: 100,
      capacityBase: 100,
      sources: [{ nodeId: 'plant', available: 100 }]
    });
    const publicDistrict = result.districts.find((district) =>
      district.districtId === 'public-district'
    );
    const industryDistrict = result.districts.find((district) =>
      district.districtId === 'industry-district'
    );

    expect(publicDistrict?.served).toBeCloseTo(50);
    expect(publicDistrict?.supplyRatio).toBeCloseTo(1);
    expect(industryDistrict?.served).toBeCloseTo(20);
    expect(industryDistrict?.supplyRatio).toBeCloseTo(0.4);
  });
});
