# City-01 Building Presentation Contract

## Purpose

City-01 buildings and facilities must read as one coherent 2.5D strategy-game world rather than unrelated images placed over the terrain.

## Runtime contract

- Standard projection: 2:1 isometric.
- Global light source: upper-left.
- Contact shadows: displaced to the lower-right.
- Building sprites do not own map topology, roads or buildable footprints.
- Grounding is rendered in the world layer as soft AO plus a low-opacity isometric footprint.
- Status colors may outline the footprint, but must not create a large glowing platform.
- Facility motion must be restrained and technology-specific.

## Facility motion

- Wind: slow rotor indicator.
- Gas: low-opacity exhaust puffs.
- Storage: charge pulse and level bars.
- Solar: slow reflected-light sweep.
- Grid/substation: low-frequency electrical pulse.
- Construction and disabled facilities do not run ambient motion.

## Asset acceptance

Every future building asset must define:

1. asset ID and version;
2. source and runtime dimensions;
3. logical tile footprint;
4. anchor point;
5. light and shadow direction;
6. whether the source includes baked terrain or a hard rectangular pad;
7. animation capability;
8. runtime display width and LOD behavior.

Assets with conflicting perspective, light direction, hard rectangular terrain, or visibly different pixel density must be corrected before entering the runtime catalog.
