import * as zrender from "zrender";
import { Chart } from "../model/chart";
import { Series, SeriesOptions } from "../model/series";
import { ItemStyleOptions } from "../types/itemstyle";
import { LabelOptions } from "../types/label";
import { generateRandomColor } from "../utils/color";
import { isNumber } from "../utils/math";

export interface ScatterSeriesOptions extends SeriesOptions {
  symbol?: "circle" | "rect" | "roundRect" | "triangle" | "diamond";
  symbolSize?: number | number[];
  itemStyle?: ItemStyleOptions;
  label?: LabelOptions;
}

function mergeDefaultOptions(
  options: ScatterSeriesOptions
): ScatterSeriesOptions {
  return zrender.util.merge(
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
    this._color = this.options.itemStyle?.color || generateRandomColor();
  }

  private _drawCircle(
    cx: number,
    cy: number,
    r: number,
    style: zrender.PathStyleProps
  ): zrender.Circle {
    const circle = new zrender.Circle({
      shape: {
        cx,
        cy,
        r,
      },
      style,
    });
    return circle;
  }

  private _drawRect(
    cx: number,
    cy: number,
    width: number,
    height: number,
    style: zrender.PathStyleProps
  ): zrender.Rect {
    const rect = new zrender.Rect({
      shape: {
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
      },
      style,
    });
    return rect;
  }

  private _drawRoundRect(
    cx: number,
    cy: number,
    width: number,
    height: number,
    radius: number,
    style: zrender.PathStyleProps
  ): zrender.Rect {
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
    return roundRect;
  }

  private _drawTriangle(
    cx: number,
    cy: number,
    length: number,
    style: zrender.PathStyleProps
  ): zrender.Polygon {
    const triangle = new zrender.Polygon({
      shape: {
        points: [
          [cx, cy - length],
          [cx + length, cy + length],
          [cx - length, cy + length],
        ],
      },
      style: style,
    });
    return triangle;
  }

  private _drawDiamond(
    cx: number,
    cy: number,
    length: number,
    style: zrender.PathStyleProps
  ): zrender.Polygon {
    const diamond = new zrender.Polygon({
      shape: {
        points: [
          [cx, cy - length],
          [cx + length, cy],
          [cx, cy + length],
          [cx - length, cy],
        ],
      },
      style,
    });
    return diamond;
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

    const { show: showTooltip } = this._chart.options.tooltip || {};

    const box = this._chart._getPlotArea();

    this.data
      .filter((point) => {
        return isNumber(point.x) && isNumber(point.y);
      })
      .forEach((point) => {
        const cx = xScale.getPixelForValue(point.x);
        const cy = yScale.getPixelForValue(point.y);

        if (cx < box.x1 || cx > box.x2 || cy < box.y1 || cy > box.y2) {
          return;
        }

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

        let obj: zrender.Path;
        if (options.symbol === "circle") {
          obj = this._drawCircle(cx, cy, symbolSize as number, itemStyle);
        } else if (options.symbol === "rect") {
          obj = this._drawRect(cx, cy, width, height, itemStyle);
        } else if (options.symbol === "roundRect") {
          obj = this._drawRoundRect(cx, cy, width, height, radius, itemStyle);
        } else if (options.symbol === "triangle") {
          obj = this._drawTriangle(cx, cy, width, itemStyle);
        } else if (options.symbol === "diamond") {
          obj = this._drawDiamond(cx, cy, width, itemStyle);
        } else {
          throw new Error("Invalid symbol type");
        }

        if (showTooltip) {
          obj.cursor = "default";

          obj.on("mouseover", (e: zrender.ElementEvent) => {
            this._chart.tooltip.show({
              x: e.offsetX,
              y: e.offsetY,
              color: this._color,
              seriesName: this.options.name,
              data: point,
            });
          });

          obj.on("mouseout", () => {
            this._chart.tooltip.hide();
          });
        } else {
          obj.silent = true;
        }

        this.group.add(obj);
      });

    this._chart.seriesGroup.add(this.group);
  }
}
