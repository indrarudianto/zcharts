export interface Tick {
  value: number;
}

export interface TickOptions {
  precision?: number;
  step?: number;
  count?: number;
  maxTicksLimit?: number;
  minRotation?: number;
  includeBounds?: boolean;
  format?: Intl.NumberFormatOptions;
}
