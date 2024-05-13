import * as zrender from "zrender";
import { Group } from "zrender";
import { Chart } from "./chart";

export interface DataPoint {
  x: number;
  y: number;
  data?: unknown;
}

export interface SeriesOptions {
  type: string;
  data?: DataPoint[];
  name?: string;
  visible?: boolean;
}

// const mergeDefaultOptions = (options: SeriesOptions): SeriesOptions => {
//   return zrender.util.merge(
//     {
//       visible: true,
//     },
//     options,
//     true
//   );
// };

export class Series<T extends SeriesOptions = SeriesOptions> {
  private _options: SeriesOptions;
  protected _chart: Chart;
  protected _data: DataPoint[] = [];
  readonly group: Group = new zrender.Group();

  constructor(chart: Chart, options: T) {
    this._chart = chart;
    this._options = options;
    this._data = options.data || [];
  }

  get options(): Readonly<T> {
    return this._options as T;
  }

  get data(): Readonly<DataPoint[]> {
    return this._data;
  }

  getXRange(): [number, number] {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < this._data.length; i++) {
      min = Math.min(min, this._data[i].x);
      max = Math.max(max, this._data[i].x);
    }

    return [min, max];
  }

  getYRange(): [number, number] {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < this._data.length; i++) {
      min = Math.min(min, this._data[i].y);
      max = Math.max(max, this._data[i].y);
    }

    return [min, max];
  }

  draw(): void {}
}
