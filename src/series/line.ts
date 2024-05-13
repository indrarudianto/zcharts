import * as zrender from "zrender";
import { Series, SeriesOptions } from "../model/series";
import { LineStyleOptions } from "../types/linestyle";
import { LabelOptions } from "../types/label";
import { Chart } from "../model/chart";

export interface LineSeriesOptions extends SeriesOptions {
  lineStyle?: LineStyleOptions;
  label?: LabelOptions;
}

function mergeDefaultOptions(options: LineSeriesOptions): LineSeriesOptions {
  return zrender.util.defaults(
    {
      visible: true,
      lineStyle: {
        color: "black",
        width: 1,
      },
      label: {
        show: false,
        position: "top",
        distance: 5,
        color: "black",
        fontSize: 12,
        fontFamily: "sans-serif",
        fontWeight: "normal",
        fontStyle: "normal",
      },
    },
    options,
    true
  );
}

export class LineSeries<
  T extends LineSeriesOptions = LineSeriesOptions
> extends Series<T> {
  constructor(chart: Chart, options: LineSeriesOptions) {
    super(chart, mergeDefaultOptions(options) as T);
  }

  override draw(): void {
    const options = this.options;
    if (!options.visible) {
      return;
    }

    const xAxis = this._chart._axis.bottom;
    if (!xAxis) {
      throw new Error("xAxis is not defined");
    }
    const yAxis = this._chart._axis.left;
    if (!yAxis) {
      throw new Error("yAxis is not defined");
    }

    const xScale = xAxis.scale;
    const yScale = yAxis.scale;

    const points = this._data.map((point) => {
      return [
        xScale.getPixelForValue(point.x),
        yScale.getPixelForValue(point.y),
      ];
    });

    const line = new zrender.Polyline({
      shape: {
        points,
      },
      style: {
        stroke: "black",
      },
    });

    this.group.add(line);
    this._chart.group.add(this.group);
  }
}
