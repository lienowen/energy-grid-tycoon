import {
  HologramCanvasRenderer as BaseHologramCanvasRenderer,
  type HologramHitRegion,
  type HologramRenderInput
} from './HologramCityRenderer';
import { AssetCityLifeRenderer } from './AssetCityLifeRenderer';
import { AssetFacilityRenderer } from './AssetFacilityRenderer';
import { AssetFeedbackRenderer } from './AssetFeedbackRenderer';
import { CityFeedbackRenderer } from './CityFeedbackRenderer';

export type { HologramHitRegion, HologramRenderInput } from './HologramCityRenderer';

export class HologramCanvasRenderer {
  private readonly base = new BaseHologramCanvasRenderer();
  private readonly cityLifeAssets = new AssetCityLifeRenderer();
  private readonly facilities = new AssetFacilityRenderer();
  private readonly feedback = new CityFeedbackRenderer();
  private readonly feedbackAssets = new AssetFeedbackRenderer();

  render(input: HologramRenderInput): HologramHitRegion[] {
    const hits = this.base.render(input);
    this.cityLifeAssets.render(input);
    this.facilities.render(input);
    this.feedback.render(input);
    this.feedbackAssets.render(input);
    return hits;
  }
}