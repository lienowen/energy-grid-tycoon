from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


renderer = 'src/presentation/pixi/ImmersivePixiWorld.ts'

replace_once(
    renderer,
    "import { planCommercialFacilities } from '../CommercialLandmarkPlanner';\n",
    "import { planCommercialFacilities } from '../CommercialLandmarkPlanner';\n"
    "import {\n"
    "  planCommercialCityLife,\n"
    "  type CityFabricPatch,\n"
    "  type CommercialCityLifePlan\n"
    "} from '../CommercialCityLifePlanner';\n"
)

replace_once(
    renderer,
    "interface DistrictSlot {\n  x: number;\n  z: number;\n  scale: number;\n}\n",
    "interface DistrictSlot {\n  x: number;\n  z: number;\n  scale: number;\n}\n\n"
    "interface AnimatedVehicle {\n"
    "  display: Container;\n"
    "  path: readonly { x: number; y: number }[];\n"
    "  segmentLengths: readonly number[];\n"
    "  totalLength: number;\n"
    "  progress: number;\n"
    "  speed: number;\n"
    "}\n\n"
    "interface AnimatedRecoveryPulse {\n"
    "  display: Container;\n"
    "  phase: number;\n"
    "  intensity: number;\n"
    "}\n"
)

replace_once(
    renderer,
    "const commercialFacilityWidth = (facility: FacilitySceneState): number => {\n",
    "const commercialFabricColor: Record<CityFabricPatch['tone'], number> = {\n"
    "  core: 0x1a3432,\n"
    "  waterfront: 0x19383a,\n"
    "  service: 0x283735,\n"
    "  greenway: 0x23483a\n"
    "};\n\n"
    "const commercialFacilityWidth = (facility: FacilitySceneState): number => {\n"
)

replace_once(
    renderer,
    "  private renderGeneration = 0;\n",
    "  private renderGeneration = 0;\n"
    "  private animationTime = 0;\n"
    "  private readonly movingVehicles: AnimatedVehicle[] = [];\n"
    "  private readonly recoveryPulses: AnimatedRecoveryPulse[] = [];\n"
)

replace_once(
    renderer,
    "    this.app.stage.addChild(this.layerManager.root);\n\n    this.camera = new WorldCamera(this.layerManager.root);\n",
    "    this.app.stage.addChild(this.layerManager.root);\n"
    "    this.app.ticker.add((ticker) => this.animateCommercialLife(ticker.deltaTime));\n\n"
    "    this.camera = new WorldCamera(this.layerManager.root);\n"
)

old_render = """  private renderScene(state: CitySceneState): void {
    const generation = ++this.renderGeneration;
    this.layerManager.clear();
    const accent = toColor(state.accent);
    const authored = state.sceneMode === 'authored' && Boolean(state.districtPrefabs?.length);
    const showDiagnostics = state.presentationMode === 'grid';
    this.host.dataset.presentationMode = showDiagnostics ? 'grid' : 'city';

    this.drawTerrain(state, accent);
    if (authored) {
      this.drawEnvironment(state.environment ?? []);
      this.drawAuthoredRoads(state.roads);
      this.drawEnergyNetwork(state, generation, showDiagnostics);
      this.drawDistrictPrefabs(state, generation, showDiagnostics);
    } else {
      const roads = ImmersiveRoadGrid.fromRoads(state.roads, ROAD_STEP);
      this.drawDistrictGround(state, accent);
      this.drawRoadTiles(roads, generation);
      this.drawFacilityAccessRoads(state, roads);
      this.drawAmbientBlocks(state, roads, generation);
    }
    this.drawFacilities(state, generation);
    if (!authored) this.drawEnergyLinks(state, accent);
    this.drawPlots(state, accent);
    this.layerManager.sortDynamicLayers();
  }
"""
new_render = """  private renderScene(state: CitySceneState): void {
    const generation = ++this.renderGeneration;
    this.movingVehicles.length = 0;
    this.recoveryPulses.length = 0;
    this.layerManager.clear();
    const accent = toColor(state.accent);
    const authored = state.sceneMode === 'authored' && Boolean(state.districtPrefabs?.length);
    const showDiagnostics = state.presentationMode === 'grid';
    const commercialLife = authored && state.levelId === 'city-01'
      ? planCommercialCityLife(state)
      : undefined;
    this.host.dataset.presentationMode = showDiagnostics ? 'grid' : 'city';

    this.drawTerrain(state, accent);
    if (authored) {
      if (commercialLife) this.drawCommercialCityFabric(commercialLife);
      this.drawEnvironment(state.environment ?? []);
      this.drawAuthoredRoads(state.roads);
      if (commercialLife) this.drawCommercialStreetLife(commercialLife);
      this.drawEnergyNetwork(state, generation, showDiagnostics);
      this.drawDistrictPrefabs(state, generation, showDiagnostics);
      if (commercialLife && !showDiagnostics) this.drawDistrictRecovery(commercialLife);
    } else {
      const roads = ImmersiveRoadGrid.fromRoads(state.roads, ROAD_STEP);
      this.drawDistrictGround(state, accent);
      this.drawRoadTiles(roads, generation);
      this.drawFacilityAccessRoads(state, roads);
      this.drawAmbientBlocks(state, roads, generation);
    }
    this.drawFacilities(state, generation);
    if (!authored) this.drawEnergyLinks(state, accent);
    this.drawPlots(state, accent);
    this.layerManager.sortDynamicLayers();
  }
"""
replace_once(renderer, old_render, new_render)

methods = r'''  private drawCommercialCityFabric(plan: CommercialCityLifePlan): void {
    for (const patch of plan.fabric) {
      const points = patch.points
        .map((candidate) => this.project(candidate))
        .flatMap(({ x, y }) => [x, y]);
      const shape = new Graphics()
        .poly(points)
        .fill({
          color: commercialFabricColor[patch.tone],
          alpha: patch.tone === 'greenway' ? 0.62 : 0.92
        })
        .stroke({
          color: patch.tone === 'waterfront' ? 0x4f8d91 : 0x68817b,
          alpha: patch.tone === 'greenway' ? 0.08 : 0.12,
          width: patch.tone === 'core' ? 2 : 1
        });
      shape.zIndex = -650 + plan.fabric.indexOf(patch);
      this.layerManager.layers.terrain.addChild(shape);
    }
  }

  private drawCommercialStreetLife(plan: CommercialCityLifePlan): void {
    for (const light of plan.streetLights) {
      const position = this.project(light.point);
      const container = new Container();
      container.position.set(position.x, position.y);
      container.zIndex = this.depth(light.point, 5);
      const post = new Graphics()
        .rect(-1, -10, 2, 12)
        .fill({ color: 0x6f858a, alpha: 0.82 })
        .rect(-3.2, 1, 6.4, 1.6)
        .fill({ color: 0x1a2529, alpha: 0.82 });
      const bulbColor = light.lit ? 0xffd878 : 0x65757a;
      const bulb = new Graphics()
        .circle(0, -11, 2.6)
        .fill({ color: bulbColor, alpha: light.lit ? 0.98 : 0.72 });
      if (light.lit) {
        bulb.circle(0, -11, 7).fill({ color: 0xffd878, alpha: 0.08 });
      }
      container.addChild(post, bulb);
      this.layerManager.layers.groundDecorations.addChild(container);
    }

    const vehicleColors = {
      commuter: 0x5db6d2,
      service: 0xf0c75d,
      freight: 0xc57a4d
    } as const;
    for (const vehicle of plan.vehicles) {
      const projectedPath = vehicle.path.map((candidate) => this.project(candidate));
      if (projectedPath.length < 2) continue;
      const segmentLengths = projectedPath.slice(0, -1).map((from, index) => {
        const to = projectedPath[index + 1]!;
        return Math.hypot(to.x - from.x, to.y - from.y);
      });
      const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
      if (totalLength <= 0) continue;

      const display = new Container();
      const body = new Graphics()
        .roundRect(-5.5, -2.8, 11, 5.6, 1.8)
        .fill({ color: vehicleColors[vehicle.tone], alpha: 0.96 })
        .roundRect(-2.8, -2.2, 5.6, 2.1, 1)
        .fill({ color: 0x16313a, alpha: 0.9 })
        .circle(-3.6, 2.7, 1.15)
        .fill({ color: 0x101619, alpha: 1 })
        .circle(3.6, 2.7, 1.15)
        .fill({ color: 0x101619, alpha: 1 });
      if (vehicle.headlights) {
        body.circle(5.2, -1.35, 1).fill({ color: 0xffe6a8, alpha: 0.95 });
        body.circle(5.2, 1.35, 1).fill({ color: 0xffe6a8, alpha: 0.95 });
      }
      display.addChild(body);
      display.zIndex = this.depth(vehicle.path[0]!, 12);
      this.layerManager.layers.groundDecorations.addChild(display);
      const actor: AnimatedVehicle = {
        display,
        path: projectedPath,
        segmentLengths,
        totalLength,
        progress: vehicle.phase,
        speed: vehicle.speed
      };
      this.positionVehicle(actor);
      this.movingVehicles.push(actor);
    }
  }

  private drawDistrictRecovery(plan: CommercialCityLifePlan): void {
    for (const cue of plan.recovery) {
      const position = this.project(cue.point);
      const color = cue.status === 'warning'
        ? 0xffd45f
        : cue.status === 'blackout'
          ? 0xff9b54
          : 0xff667f;
      const container = new Container();
      container.position.set(position.x, position.y + 6);
      container.zIndex = this.depth(cue.point, 48);
      const pulse = new Graphics()
        .ellipse(0, 0, cue.width * 3.7, cue.depth * 1.75)
        .stroke({ color, alpha: 0.8, width: 2 });
      container.addChild(pulse);
      container.alpha = 0.08;
      this.layerManager.layers.effects.addChild(container);
      this.recoveryPulses.push({
        display: container,
        phase: cue.phase,
        intensity: cue.intensity
      });
    }
  }

  private animateCommercialLife(deltaTime: number): void {
    if (!this.mounted) return;
    const elapsedSeconds = deltaTime / 60;
    this.animationTime += elapsedSeconds;
    for (const actor of this.movingVehicles) {
      if (actor.display.destroyed) continue;
      actor.progress = (actor.progress + actor.speed * elapsedSeconds) % 1;
      this.positionVehicle(actor);
    }
    for (const pulse of this.recoveryPulses) {
      if (pulse.display.destroyed) continue;
      const wave = (Math.sin((this.animationTime * 0.72 + pulse.phase) * Math.PI * 2) + 1) * 0.5;
      pulse.display.alpha = 0.045 + wave * 0.16 * pulse.intensity;
      pulse.display.scale.set(0.985 + wave * 0.035);
    }
  }

  private positionVehicle(actor: AnimatedVehicle): void {
    let remaining = actor.progress * actor.totalLength;
    for (let index = 0; index < actor.segmentLengths.length; index += 1) {
      const segmentLength = actor.segmentLengths[index]!;
      const from = actor.path[index]!;
      const to = actor.path[index + 1]!;
      if (remaining > segmentLength) {
        remaining -= segmentLength;
        continue;
      }
      const progress = segmentLength > 0 ? remaining / segmentLength : 0;
      actor.display.position.set(
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress
      );
      actor.display.rotation = Math.atan2(to.y - from.y, to.x - from.x);
      return;
    }
    const last = actor.path[actor.path.length - 1];
    if (last) actor.display.position.set(last.x, last.y);
  }

'''
replace_once(
    renderer,
    "  private drawEnvironment(environment: readonly EnvironmentPrefabSceneState[]): void {\n",
    methods + "  private drawEnvironment(environment: readonly EnvironmentPrefabSceneState[]): void {\n"
)
