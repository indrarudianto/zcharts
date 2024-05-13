import * as zrender from "zrender";
import { Series, SeriesOptions } from "../model/series";
import { Chart } from "../model/chart";
import { ItemStyleOptions } from "../types/itemstyle";
import { LabelOptions } from "../types/label";

export interface ScatterSeriesOptions extends SeriesOptions {
  symbol?: "circle" | "rect" | "roundRect" | "triangle" | "diamond";
  symbolSize?: number | number[];
  itemStyle?: ItemStyleOptions;
  label?: LabelOptions;
}

function mergeDefaultOptions(
  options: ScatterSeriesOptions
): ScatterSeriesOptions {
  return zrender.util.defaults(
    {
      visible: true,
      symbol: "circle",
      symbolSize: 5,
      itemStyle: {
        borderColor: "#000",
        borderWidth: 0,
        borderType: "solid",
      },
      label: {
        show: false,
        position: "top",
        distance: 5,
        color: "inherit",
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

export class ScatterSeries<
  T extends ScatterSeriesOptions = ScatterSeriesOptions
> extends Series<T> {
  private _color: string;

  constructor(chart: Chart, options: ScatterSeriesOptions) {
    super(chart, mergeDefaultOptions(options) as T);
    this._color = this.options.itemStyle?.color || this._chart._getColor();
  }

  private _drawCircle(
    cx: number,
    cy: number,
    r: number,
    style: zrender.PathStyleProps
  ): void {
    const circle = new zrender.Circle({
      shape: {
        cx,
        cy,
        r,
      },
      style,
    });
    this.group.add(circle);
  }

  private _drawRect(
    cx: number,
    cy: number,
    width: number,
    height: number,
    style: zrender.PathStyleProps
  ): void {
    const rect = new zrender.Rect({
      shape: {
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
      },
      style,
    });
    this.group.add(rect);
  }

  private _drawRoundRect(
    cx: number,
    cy: number,
    width: number,
    height: number,
    radius: number,
    style: zrender.PathStyleProps
  ): void {
    const roundRect = new zrender.Rect({
      shape: {
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
        r: radius,
      },
      style,
    });
    this.group.add(roundRect);
  }

  private _drawTriangle(cx: number, cy: number): void {
    const triangle = new zrender.Polygon({
      shape: {
        points: [
          [cx, cy - 5],
          [cx + 5, cy + 5],
          [cx - 5, cy + 5],
        ],
      },
      style: {
        fill: "blue",
      },
    });
    this.group.add(triangle);
  }

  private _drawDiamond(cx: number, cy: number): void {
    const diamond = new zrender.Polygon({
      shape: {
        points: [
          [cx, cy - 5],
          [cx + 5, cy],
          [cx, cy + 5],
          [cx - 5, cy],
        ],
      },
      style: {
        fill: "blue",
      },
    });
    this.group.add(diamond);
  }

  override draw(): void {
    const options = this.options as ScatterSeriesOptions;
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

    this.data.forEach((point) => {
      const cx = xScale.getPixelForValue(point.x);
      const cy = yScale.getPixelForValue(point.y);

      const itemStyle = zrender.util.defaults(
        {
          fill: this._color,
        },
        options.itemStyle || {},
        true
      );

      let symbolSize = options.symbolSize;

      const defaultSize = 5;
      let width = defaultSize;
      let height = defaultSize;
      let radius = defaultSize / 2;

      if (Array.isArray(symbolSize)) {
        if (symbolSize.length === 1) {
          symbolSize = [symbolSize[0], symbolSize[0]];
        } else if (symbolSize.length === 2) {
          width = symbolSize[0];
          height = symbolSize[1];
        } else if (symbolSize.length === 3) {
          width = symbolSize[0];
          height = symbolSize[1];
          radius = symbolSize[2];
        }
      }

      if (options.symbol === "circle") {
        this._drawCircle(cx, cy, symbolSize as number, itemStyle);
      } else if (options.symbol === "rect") {
        this._drawRect(cx, cy, width, height, itemStyle);
      } else if (options.symbol === "roundRect") {
        this._drawRoundRect(cx, cy, width, height, radius, itemStyle);
      }
    });

    this._chart.group.add(this.group);
  }
}
