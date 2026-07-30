export type City01AssetCategory =
  | "road"
  | "commercial"
  | "residential"
  | "office"
  | "park"
  | "industrial";

export interface City01ModularAsset {
  id: string;
  src: string;
  category: City01AssetCategory;
  footprint: readonly [number, number];
  anchor: readonly [number, number];
  rotatable: boolean;
  connects?: readonly ("N" | "E" | "S" | "W")[];
  roadFacing?: "N" | "E" | "S" | "W";
}

export const CITY01_P0_ASSETS: readonly City01ModularAsset[] = [
  {
    id: "road_straight_01",
    src: "/assets/city01/p0/road_straight_01.png",
    category: "road",
    footprint: [4, 4],
    anchor: [0.5, 0.5],
    rotatable: true,
    connects: ["N", "S"]
  },
  {
    id: "road_corner_01",
    src: "/assets/city01/p0/road_corner_01.png",
    category: "road",
    footprint: [4, 4],
    anchor: [0.5, 0.5],
    rotatable: true,
    connects: ["N", "E"]
  },
  {
    id: "road_t_junction_01",
    src: "/assets/city01/p0/road_t_junction_01.png",
    category: "road",
    footprint: [4, 4],
    anchor: [0.5, 0.5],
    rotatable: true,
    connects: ["N", "E", "W"]
  },
  {
    id: "road_cross_01",
    src: "/assets/city01/p0/road_cross_01.png",
    category: "road",
    footprint: [4, 4],
    anchor: [0.5, 0.5],
    rotatable: false,
    connects: ["N", "E", "S", "W"]
  },
  {
    id: "commercial_corner_01",
    src: "/assets/city01/p0/commercial_corner_01.png",
    category: "commercial",
    footprint: [4, 4],
    anchor: [0.5, 0.91],
    rotatable: true,
    roadFacing: "S"
  },
  {
    id: "apartment_courtyard_01",
    src: "/assets/city01/p0/apartment_courtyard_01.png",
    category: "residential",
    footprint: [6, 4],
    anchor: [0.5, 0.91],
    rotatable: true,
    roadFacing: "S"
  },
  {
    id: "office_campus_01",
    src: "/assets/city01/p0/office_campus_01.png",
    category: "office",
    footprint: [6, 4],
    anchor: [0.5, 0.91],
    rotatable: true,
    roadFacing: "S"
  },
  {
    id: "suburban_neighborhood_01",
    src: "/assets/city01/p0/suburban_neighborhood_01.png",
    category: "residential",
    footprint: [8, 8],
    anchor: [0.5, 0.91],
    rotatable: false,
    roadFacing: "S"
  },
  {
    id: "park_pocket_01",
    src: "/assets/city01/p0/park_pocket_01.png",
    category: "park",
    footprint: [4, 4],
    anchor: [0.5, 0.82],
    rotatable: true
  },
  {
    id: "industrial_yard_01",
    src: "/assets/city01/p0/industrial_yard_01.png",
    category: "industrial",
    footprint: [6, 6],
    anchor: [0.5, 0.91],
    rotatable: true,
    roadFacing: "S"
  },
] as const;
