import { MinMax } from "../types/geometric";
import { Tick, TickOptions } from "../types/tick";
import { Axis } from "./axis";
import { Chart } from "./chart";

export interface ScaleOptions {
  orientation: "horizontal" | "vertical";
  dataMin: number;
  dataMax: number;
  userMin?: number;
  userMax?: number;
  bounds?: "ticks" | "data";
  ticks?: TickOptions;
  beginAtZero?: boolean;
}

export class Scale {
  chart: Chart;
  axis: Axis;
  options: ScaleOptions;
  min: number;
  max: number;

  constructor(chart: Chart, axis: Axis, options: ScaleOptions) {
    this.axis = axis;
    this.chart = chart;
    this.options = options;

    const { min, max } = this.determineDataLimits(options);
    this.min = min;
    this.max = max;
  }

  determineDataLimits(options: ScaleOptions): MinMax {
    const { dataMin, dataMax, userMin, userMax } = options;
    const min = userMin ?? dataMin;
    const max = userMax ?? dataMax;
    return { min, max };
  }

  getRange(): number {
    return this.max - this.min;
  }

  getExtent(): [number, number] {
    return [this.min, this.max];
  }

  setExtent(min: number, max: number): void {
    this.min = min;
    this.max = max;
  }

  reset(): void {
    const { min, max } = this.determineDataLimits(this.options);
    this.min = min;
    this.max = max;
  }

  isHorizontal(): boolean {
    return this.options.orientation === "horizontal";
  }

  getLabelForValue(value: number): string {
    return value.toString();
  }

  buildTicks(): Tick[] {
    return [];
  }

  protected maxDigits(): number {
    const height = this.axis.group.getBoundingRect().height;
    const width = this.axis.group.getBoundingRect().width;

    return (this.isHorizontal() ? width : height) / this.axis.getWidth();
  }

  /**
   * Utility for getting the pixel location of a percentage of scale
   * The coordinate (0, 0) is at the upper-left corner of the canvas
   */
  getPixelForDecimal(decimal: number): number {
    const width = this.axis.getWidth();
    const height = this.axis.getHeight();
    const box = this.axis.layout.getAvailableSpace();
    return this.isHorizontal()
      ? box.x1 + width * decimal
      : box.y2 - height * decimal;
  }

  getDecimalForPixel(pixel: number): number {
    const width = this.axis.getWidth();
    const height = this.axis.getHeight();
    const box = this.axis.layout.getAvailableSpace();
    return this.isHorizontal()
      ? (pixel - box.x1) / width
      : (box.y2 - pixel) / height;
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  getValueForPixel(pixel: number): number {
    return 0;
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  getPixelForValue(pixel: number): number {
    return 0;
  }
}
