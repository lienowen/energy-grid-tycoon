import {
  HologramCanvasRenderer as BaseHologramCanvasRenderer,
  type HologramHitRegion,
  type HologramRenderInput
} from './HologramCityRenderer';
import { CityFeedbackRenderer } from './CityFeedbackRenderer';

export type { HologramHitRegion, HologramRenderInput } from './HologramCityRenderer';

export class HologramCanvasRenderer {
  private readonly base = new BaseHologramCanvasRenderer();
  private readonly feedback = new CityFeedbackRenderer();

  render(input: HologramRenderInput): HologramHitRegion[] {
    const hits = this.base.render(input);
    this.feedback.render(input);
    return hits;
  }
}
