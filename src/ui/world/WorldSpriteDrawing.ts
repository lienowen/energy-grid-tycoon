import type { ScreenPoint } from './HologramGeometry';

export const isDrawableImage = (
  image: HTMLImageElement | undefined
): image is HTMLImageElement => Boolean(
  image
  && image.complete
  && image.naturalWidth > 0
  && image.naturalHeight > 0
);

export const drawGroundedSprite = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  center: ScreenPoint,
  size: number,
  options: {
    groundRatio?: number;
    rise?: number;
    alpha?: number;
    composite?: GlobalCompositeOperation;
  } = {}
): void => {
  const groundRatio = options.groundRatio ?? 0.79;
  const rise = options.rise ?? 0;
  context.save();
  context.globalAlpha = options.alpha ?? 1;
  if (options.composite) context.globalCompositeOperation = options.composite;
  context.drawImage(
    image,
    center.x - size / 2,
    center.y - size * groundRatio - rise,
    size,
    size
  );
  context.restore();
};

export const drawCenteredSprite = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  center: ScreenPoint,
  width: number,
  height = width,
  options: {
    alpha?: number;
    composite?: GlobalCompositeOperation;
  } = {}
): void => {
  context.save();
  context.globalAlpha = options.alpha ?? 1;
  if (options.composite) context.globalCompositeOperation = options.composite;
  context.drawImage(
    image,
    center.x - width / 2,
    center.y - height / 2,
    width,
    height
  );
  context.restore();
};