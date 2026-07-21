export interface RandomSource {
  next(): number;
  nextInt(maxExclusive: number): number;
  getState(): number;
}

const DEFAULT_SEED = 0x6d2b79f5;

const normalizeSeed = (seed: number): number => {
  const value = Math.floor(Number.isFinite(seed) ? seed : DEFAULT_SEED) >>> 0;
  return value === 0 ? DEFAULT_SEED : value;
};

export const hashSeed = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return normalizeSeed(hash);
};

export class DeterministicRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = normalizeSeed(seed);
  }

  static fromText(value: string): DeterministicRandom {
    return new DeterministicRandom(hashSeed(value));
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = normalizeSeed(value);
    return this.state / 0x100000000;
  }

  nextInt(maxExclusive: number): number {
    const limit = Math.max(1, Math.floor(maxExclusive));
    return Math.floor(this.next() * limit);
  }

  getState(): number {
    return this.state;
  }
}
