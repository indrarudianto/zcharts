import * as zrender from "zrender";
import { Group, ZRenderType } from "zrender";
import { LineSeries } from "../series/line";
import { ScatterSeries } from "../series/scatter";
import { Bound } from "../types/geometric";
import { TextStyleOptions } from "../types/textstyle";
import { isFinite } from "../utils/common";
import { isNumber } from "../utils/math";
import { getZoomExtent } from "../utils/zoom";
import { Axis, AxisOptions, AxisPosition } from "./axis";
import { Layout, Padding } from "./layout";
import { Series, SeriesOptions } from "./series";
import { Tooltip, TooltipFormatterOptions } from "./tooltip";

export interface TitleOptions {
  text: string;
  margin?: number;
  textStyle?: TextStyleOptions;
  subtext?: string;
  subtextStyle?: TextStyleOptions;
}

export interface ResizeOptions {
  width?: number | string;
  height?: number | string;
}

export interface GridOptions {
  backgroundColor?: string;
  borderColor?: string;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  show?: boolean;
}

export interface TooltipOptions {
  show?: boolean;
  formatter?: (options: TooltipFormatterOptions) => string;
}

export interface ZoomOptions {
  enabled?: boolean;
  mode?: "x" | "y" | "xy";
}

export type AxisMap = Record<AxisPosition, Axis | undefined>;

const SeriesControllerMap: Record<string, typeof Series> = {
  line: LineSeries,
  scatter: ScatterSeries,
};

export function registerSeries(type: string, controller: typeof Series) {
  if (SeriesControllerMap[type]) {
    throw new Error(`Series type ${type} has been registered.`);
  }
  SeriesControllerMap[type] = controller;
}

export interface ChartOptions {
  title?: TitleOptions;
  locale?: string;
  backgroundColor?: string;
  grid?: GridOptions;
  xAxis?: AxisOptions;
  yAxis?: AxisOptions;
  series?: SeriesOptions[];
  tooltip?: TooltipOptions;
  zoom?: ZoomOptions;
}

export interface ChartInitOptions {
  renderer?: "canvas" | "svg";
  devicePixelRatio?: number;
  width?: number | string;
  height?: number | string;
}

const defaultOptions: ChartOptions = {
  locale: "en",
  title: {
    text: "",
    margin: 18,
    textStyle: {
      color: "#333",
      fontSize: 18,
      fontFamily: "sans-serif",
    },
    subtext: "",
    subtextStyle: {
      color: "#aaa",
      fontSize: 12,
      fontFamily: "sans-serif",
    },
  },
  backgroundColor: "transparent",
  grid: {
    show: false,
    borderColor: "#333",
    backgroundColor: "transparent",
    left: 80,
    right: 50,
    top: 50,
    bottom: 50,
  },
  tooltip: {
    show: true,
  },
  zoom: {
    enabled: true,
    mode: "xy",
  },
};

export class Chart {
  readonly dom: HTMLCanvasElement;
  readonly zr: ZRenderType;
  readonly group: Group;
  readonly seriesGroup: Group;
  options: ChartOptions;
  readonly _axis: AxisMap = {
    top: undefined,
    right: undefined,
    bottom: undefined,
    left: undefined,
  };
  readonly _series: Series[] = [];
  readonly tooltip: Tooltip;

  readonly __version__ = "0.1.0";

  // eslint-disable-next-line no-undef
  constructor(dom: HTMLCanvasElement, options?: ChartInitOptions) {
    this.dom = dom;
    this.options = {};
    this.tooltip = new Tooltip(this);

    // eslint-disable-next-line no-undef
    this.zr = zrender.init(dom, options);
    this.group = new zrender.Group();
    this.seriesGroup = new zrender.Group();

    this.zr.on("mousewheel", this._onWheel.bind(this));
  }

  setOption(options: ChartOptions): void {
    this.options = zrender.util.merge(defaultOptions, options, true);
  }

  getWidth(): number {
    const w = this.zr.getWidth();
    return w || 0;
  }

  getHeight(): number {
    const h = this.zr.getHeight();
    return h || 0;
  }

  resize(options?: ResizeOptions): void {
    this.zr.resize(options);
  }

  clear(): void {
    this.group.removeAll();
    this.zr.clear();
  }

  dispose(): void {
    this.zr.dispose();
  }

  resetZoom(): void {
    const xAxis = this._axis.bottom;
    const yAxis = this._axis.left;
    if (xAxis) {
      xAxis.getScale().reset();
      xAxis.draw();
    }
    if (yAxis) {
      yAxis.getScale().reset();
      yAxis.draw();
    }

    this._drawSeries();
  }

  private _onWheel(event: zrender.ElementEvent) {
    const { enabled, mode } = this.options.zoom || ({} as ZoomOptions);
    if (!enabled) return;

    const zoomXEnabled = mode?.includes("x");
    const zoomYEnabled = mode?.includes("y");

    const delta = event.wheelDelta;
    const scale = delta > 0 ? 1.1 : 0.9;
    const box = this._getPlotArea();
    const posX = event.offsetX;
    const posY = event.offsetY;
    if (posX < box.x1 || posX > box.x2 || posY < box.y1 || posY > box.y2) {
      return;
    }

    const xAxis = this._axis.bottom;
    const yAxis = this._axis.left;
    if (xAxis && zoomXEnabled) {
      const [minX, maxX] = xAxis.getScale().getExtent();
      const valueX = xAxis.getScale().getValueForPixel(posX);
      const isLogarithmic = xAxis.options.type === "log";
      const [newMinX, newMaxX] = getZoomExtent(
        valueX,
        minX,
        maxX,
        scale,
        isLogarithmic
      );
      xAxis.getScale().setExtent(newMinX, newMaxX);
      xAxis.draw();
    }
    if (yAxis && zoomYEnabled) {
      const [minY, maxY] = yAxis.getScale().getExtent();
      const valueY = yAxis.getScale().getValueForPixel(posY);
      const isLogarithmic = yAxis.options.type === "log";
      const [newMinY, newMaxY] = getZoomExtent(
        valueY,
        minY,
        maxY,
        scale,
        isLogarithmic
      );
      yAxis.getScale().setExtent(newMinY, newMaxY);
      yAxis.draw();
    }

    this._drawSeries();
  }

  _getLayout(): Layout {
    const width = this.getWidth();
    const height = this.getHeight();
    const x1 = 0;
    const y1 = 0;
    const x2 = width;
    const y2 = height;

    const grid = this.options.grid || ({} as GridOptions);

    const paddingTop = grid.top || 0;
    const paddingRight = grid.right || 0;
    const paddingBottom = grid.bottom || 0;
    const paddingLeft = grid.left || 0;

    const padding: Padding = {
      top: paddingTop,
      right: paddingRight,
      bottom: paddingBottom,
      left: paddingLeft,
    };

    return new Layout({ x1, y1, x2, y2, padding });
  }

  _getPlotArea(): Layout {
    const grid = this.options.grid || ({} as GridOptions);

    const paddingTop = grid.top || 0;
    const paddingRight = grid.right || 0;
    const paddingBottom = grid.bottom || 0;
    const paddingLeft = grid.left || 0;

    const width = this.getWidth();
    const height = this.getHeight();
    const x1 = 0 + paddingLeft;
    const y1 = 0 + paddingTop;
    const x2 = width - paddingRight;
    const y2 = height - paddingBottom;

    return new Layout({
      x1,
      y1,
      x2,
      y2,
    });
  }

  _drawAxis(): void {
    const { xmin, xmax, ymin, ymax } = this._getSeriesBounds();
    const xAxisOptions = this.options.xAxis || ({} as AxisOptions);
    const xAxis = new Axis(this, {
      dataMin: xmin,
      dataMax: xmax,
      ...xAxisOptions,
      position: "bottom",
    });
    this._axis.bottom = xAxis;
    xAxis.draw();

    const yAxisOptions = this.options.yAxis || ({} as AxisOptions);
    const yAxis = new Axis(this, {
      dataMin: ymin,
      dataMax: ymax,
      ...yAxisOptions,
      position: "left",
    });
    this._axis.left = yAxis;
    yAxis.draw();
  }

  _drawBackground(): void {
    if (!this.options.backgroundColor) return;
    this.zr.setBackgroundColor(this.options.backgroundColor);
  }

  _drawGrid(): void {
    const options = this.options.grid || ({} as GridOptions);
    if (!options.show) return;

    const box = this._getPlotArea();
    const { backgroundColor, borderColor } = options;
    const rect = new zrender.Rect({
      shape: {
        x: box.x1,
        y: box.y1,
        width: box.width,
        height: box.height,
      },
      style: {
        fill: backgroundColor,
        stroke: borderColor,
      },
    });
    rect.silent = true;
    this.group.add(rect);
  }

  _getSeriesBounds(): Bound {
    const series = this.options.series || [];
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;

    series.forEach((s) => {
      const data = s.data || [];
      data
        .filter((d) => {
          return isNumber(d.x) && isNumber(d.y);
        })
        .forEach((d) => {
          xmin = Math.min(xmin, d.x);
          xmax = Math.max(xmax, d.x);
          ymin = Math.min(ymin, d.y);
          ymax = Math.max(ymax, d.y);
        });
    });

    xmin = isFinite(xmin) ? xmin : 0;
    xmax = isFinite(xmax) ? xmax : 1;
    ymin = isFinite(ymin) ? ymin : 0;
    ymax = isFinite(ymax) ? ymax : 1;

    return { xmin, xmax, ymin, ymax };
  }

  _drawSeries(): void {
    this.seriesGroup.removeAll();
    const series = this.options.series || [];

    series.forEach((s) => {
      const type = s.type || "line";
      const options = s;

      const Controller = SeriesControllerMap[type];
      if (!Controller) {
        throw new Error(`Series type ${type} is not supported.`);
      }

      const controller = new Controller(this, options);
      controller.draw();
    });

    this.group.add(this.seriesGroup);
  }

  _drawTitle(): void {
    const title = this.options.title;
    if (!title) return;

    const box = this._getPlotArea();
    const margin = title.margin || 20;
    const { text, textStyle } = title;
    const textShape = new zrender.Text({
      style: {
        text,
        x: box.x1 + box.width / 2,
        y: box.y1 - margin,
        fill: textStyle?.color,
        textFont: `${textStyle?.fontSize}px ${textStyle?.fontFamily}`,
        align: "center",
        verticalAlign: "bottom",
      },
    });
    textShape.silent = true;
    this.group.add(textShape);

    if (!title.subtext) {
      return;
    }

    const subtext = title.subtext;
    const subtextStyle = title.subtextStyle || {};
    const subtextShape = new zrender.Text({
      style: {
        text: subtext,
        x: box.x1 + box.width / 2,
        y: box.y1 - margin,
        fill: subtextStyle.color,
        textFont: `${subtextStyle.fontSize}px ${subtextStyle.fontFamily}`,
        align: "center",
        verticalAlign: "top",
      },
    });
    subtextShape.silent = true;
    this.group.add(subtextShape);
  }

  toDataURL(type?: string | undefined, quality?: any): string {
    return this.dom.toDataURL(type, quality);
  }

  draw(): void {
    this.group.removeAll();
    this.zr.clear();
    this.zr.add(this.group);

    this._drawBackground();
    this._drawAxis();
    this._drawGrid();
    this._drawSeries();
    this._drawTitle();
  }
}
