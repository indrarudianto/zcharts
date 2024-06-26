import * as zrender from "zrender";
import { LinearScale } from "../scales/linear";
import LogarithmicScale, { LogTick } from "../scales/logarithmic";
import { LineStyleOptions } from "../types/linestyle";
import { TextStyleOptions } from "../types/textstyle";
import { Tick } from "../types/tick";
import { Chart } from "./chart";
import { Layout } from "./layout";
import { Scale, ScaleOptions } from "./scale";

export type AxisPosition = "top" | "right" | "bottom" | "left";

export interface SplitLine {
  show: boolean;
  lineStyle: LineStyleOptions;
}

export type SplitLineOptions = Partial<SplitLine>;

export interface AxisTick {
  show: boolean;
  length: number;
  inside: boolean;
  interval: number;
  lineStyle: LineStyleOptions;
}

export type AxisTickOptions = Partial<AxisTick>;

export interface AxisLabel {
  show: boolean;
  inside: boolean;
  margin: number;
  textStyle: TextStyleOptions;
  formatter: (value: number) => string;
}

export type AxisLabelOptions = Partial<AxisLabel>;

export interface AxisLine {
  show: boolean;
  lineStyle: LineStyleOptions;
}

export type AxisLineOptions = Partial<AxisLine>;

export interface AxisProps {
  position: AxisPosition;
  inverse: boolean;
  splitLine: SplitLineOptions;
  axisTick: AxisTickOptions;
  axisLabel: AxisLabelOptions;
  axisLine: AxisLineOptions;
  min: number;
  max: number;
  type: "value" | "log";
  name: string;
  nameLocation: "start" | "center" | "end";
  nameGap: number;
  nameTextStyle: TextStyleOptions;
  beginAtZero: boolean;
  dataMin: number;
  dataMax: number;
}

export type AxisOptions = Partial<AxisProps>;

function mergeDefaultOptions(options: AxisOptions): AxisOptions {
  return zrender.util.merge(
    {
      inverse: false,
      splitLine: {
        show: false,
        lineStyle: {
          color: "#ccc",
          width: 1,
          type: "solid",
        },
      },
      axisTick: {
        show: true,
        length: 5,
        inside: false,
        inteval: "auto",
        lineStyle: {
          color: "#333",
          width: 1,
          type: "solid",
        },
      },
      axisLabel: {
        show: true,
        inside: false,
        margin: 8,
        textStyle: {
          color: "#333",
          fontSize: 12,
          fontFamily: "sans-serif",
        },
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: "#333",
          width: 1,
          type: "solid",
        },
      },
      type: "value",
      beginAtZero: true,
      name: "",
      nameLocation: "center",
      nameGap: 30,
      nameTextStyle: {
        color: "#333",
        fontSize: 12,
        fontFamily: "sans-serif",
      },
    },
    options,
    true
  );
}

export class Axis {
  readonly _chart: Chart;
  options: AxisOptions;
  group: zrender.Group;
  scale: Scale;
  position: AxisPosition;
  layout: Layout;
  _axisWidth: number = 30;
  _ticks: Tick[] = [];

  constructor(chart: Chart, options: AxisOptions) {
    this._chart = chart;
    this.options = mergeDefaultOptions(options);
    this.group = new zrender.Group();
    this.group.silent = true;

    const scaleOptions: ScaleOptions = {
      orientation:
        this.options.position === "bottom" || this.options.position === "top"
          ? "horizontal"
          : "vertical",
      userMin: this.options.min,
      userMax: this.options.max,
      dataMin: this.options.dataMin || 0,
      dataMax: this.options.dataMax || 1,
      ticks: {
        step: this.options.axisTick?.interval,
      },
      beginAtZero: this.options.beginAtZero,
      formatter: this.options.axisLabel?.formatter,
    };
    if (this.options.type === "value") {
      this.scale = new LinearScale(chart, this, scaleOptions);
    } else if (this.options.type === "log") {
      this.scale = new LogarithmicScale(chart, this, scaleOptions);
    } else {
      throw new Error(`Unsupported scale type: ${this.options.type}`);
    }

    this.position = options.position || "bottom";

    const box = chart._getLayout();

    if (options.position === "bottom") {
      this.layout = new Layout({
        x1: box.x1 + box.padding.left,
        y1: box.y2 - box.padding.bottom,
        x2: box.x2 - box.padding.right,
        y2: box.y2,
      });
    } else if (options.position === "left") {
      const x1 = box.x1;
      const y1 = box.y1 + box.padding.top;
      const x2 = box.x1 + box.padding.left;
      const y2 = box.y2 - box.padding.bottom;
      this.layout = new Layout({
        x1,
        y1,
        x2,
        y2,
      });
    } else {
      throw new Error(`Unsupported axis position: ${options.position}`);
    }
  }

  getWidth() {
    return this.layout.width;
  }

  getHeight() {
    return this.layout.height;
  }

  getScale(): Scale {
    return this.scale;
  }

  draw() {
    this.group.removeAll();

    const ticks = this.scale.buildTicks();
    this._ticks = ticks;

    this._drawAxisTick();
    this._drawAxisLine();
    this._drawSplitLine();
    this._drawAxisName();

    this._chart.group.add(this.group);
  }

  private _getTickLabelSize() {
    let width = 0;
    let height = 0;

    for (const tick of this._ticks) {
      const label = new zrender.Text({
        style: {
          text: this.scale.getLabelForValue(tick.value),
        },
      });

      const boundingRect = label.getBoundingRect();
      width = Math.max(width, boundingRect.width);
      height = Math.max(height, boundingRect.height);
    }

    return {
      width,
      height,
    };
  }

  private _drawAxisTick() {
    if (this.options.type === "value") {
      this._drawAxisTickLinear();
    } else if (this.options.type === "log") {
      this._drawAxisTickLog();
    }
  }

  private _drawAxisTickLinear() {
    const axisTickOptions = this.options.axisTick;
    const tickLabelOptions = this.options.axisLabel;

    const box = this.layout.getAvailableSpace();
    const ticks = this._ticks;
    const length = this.options.axisTick?.length || 5;
    const margin = this.options.axisLabel?.margin || 8;

    const tickLabelSize = this._getTickLabelSize();

    const tickStyle: zrender.PathStyleProps = {
      stroke: axisTickOptions?.lineStyle?.color,
      lineWidth: axisTickOptions?.lineStyle?.width,
    };

    const tickLabelStyle: zrender.TextStyleProps = {
      fill: tickLabelOptions?.textStyle?.color,
      fontSize: tickLabelOptions?.textStyle?.fontSize,
      fontFamily: tickLabelOptions?.textStyle?.fontFamily,
    };

    if (this.position === "bottom") {
      ticks.forEach((tick) => {
        const x1 = this.scale.getPixelForValue(tick.value);
        const y1 = box.y1;
        const x2 = x1;
        let y2 = box.y1 + length;

        if (axisTickOptions?.inside) {
          y2 = box.y1 - length;
        }

        if (axisTickOptions?.show) {
          const line = new zrender.Line({
            shape: {
              x1,
              y1,
              x2,
              y2,
            },
            style: tickStyle,
          });
          this.group.add(line);
        }

        const lx = x1;
        let ly = box.y1 + length + margin;
        if (tickLabelOptions?.inside) {
          ly = box.y1 - length - margin - tickLabelSize.height;
        }

        if (tickLabelOptions?.show) {
          const label = new zrender.Text({
            style: {
              text: this.scale.getLabelForValue(tick.value),
              x: lx,
              y: ly,
              align: "center",
              ...tickLabelStyle,
            },
          });
          this.group.add(label);
        }
      });
    } else if (this.position === "left") {
      ticks.forEach((tick) => {
        let x1 = box.x2 - length;
        const y1 = this.scale.getPixelForValue(tick.value);
        const x2 = box.x2;
        const y2 = y1;
        if (axisTickOptions?.inside) {
          x1 = box.x2 + length;
        }

        if (axisTickOptions?.show) {
          const line = new zrender.Line({
            shape: {
              x1,
              y1,
              x2,
              y2,
            },
            style: tickStyle,
          });
          this.group.add(line);
        }

        let lx = box.x2 - length - margin;
        const ly = y1 - tickLabelSize.height / 2; // Center the label
        if (tickLabelOptions?.inside) {
          lx = box.x2 + length + margin;
        }

        if (tickLabelOptions?.show) {
          const label = new zrender.Text({
            style: {
              text: this.scale.getLabelForValue(tick.value),
              x: lx,
              y: ly,
              align: "right",
              ...tickLabelStyle,
            },
          });
          this.group.add(label);
        }
      });
    }
  }

  private _drawAxisTickLog() {
    const axisTickOptions = this.options.axisTick;
    const tickLabelOptions = this.options.axisLabel;

    const box = this.layout.getAvailableSpace();
    const ticks = this._ticks as LogTick[];
    const length = this.options.axisTick?.length || 5;
    const margin = this.options.axisLabel?.margin || 8;

    const tickLabelSize = this._getTickLabelSize();

    const tickStyle: zrender.PathStyleProps = {
      stroke: axisTickOptions?.lineStyle?.color,
      lineWidth: axisTickOptions?.lineStyle?.width,
    };

    const tickLabelStyle: zrender.TextStyleProps = {
      fill: tickLabelOptions?.textStyle?.color,
      fontSize: tickLabelOptions?.textStyle?.fontSize,
      fontFamily: tickLabelOptions?.textStyle?.fontFamily,
    };

    if (this.position === "bottom") {
      ticks.forEach((tick) => {
        const x1 = this.scale.getPixelForValue(tick.value);
        const y1 = box.y1;
        const x2 = x1;
        let y2 = box.y1 + length;

        if (axisTickOptions?.inside) {
          y2 = box.y1 - length;
        }

        if (axisTickOptions?.show) {
          const line = new zrender.Line({
            shape: {
              x1,
              y1,
              x2,
              y2,
            },
            style: tickStyle,
          });
          this.group.add(line);
        }

        if (!tick.major) {
          return;
        }

        const lx = x1;
        let ly = box.y1 + length + margin;
        if (tickLabelOptions?.inside) {
          ly = box.y1 - length - margin - tickLabelSize.height;
        }

        if (tickLabelOptions?.show) {
          const label = new zrender.Text({
            style: {
              text: this.scale.getLabelForValue(tick.value),
              x: lx,
              y: ly,
              align: "center",
              ...tickLabelStyle,
            },
          });
          this.group.add(label);
        }
      });
    } else if (this.position === "left") {
      ticks.forEach((tick) => {
        let x1 = box.x2 - length;
        const y1 = this.scale.getPixelForValue(tick.value);
        const x2 = box.x2;
        const y2 = y1;
        if (axisTickOptions?.inside) {
          x1 = box.x2 + length;
        }

        if (axisTickOptions?.show) {
          const line = new zrender.Line({
            shape: {
              x1,
              y1,
              x2,
              y2,
            },
            style: tickStyle,
          });
          this.group.add(line);
        }

        if (!tick.major) {
          return;
        }

        let lx = box.x2 - length - margin;
        const ly = y1 - tickLabelSize.height / 2; // Center the label
        if (tickLabelOptions?.inside) {
          lx = box.x2 + length + margin;
        }

        if (tickLabelOptions?.show) {
          const label = new zrender.Text({
            style: {
              text: this.scale.getLabelForValue(tick.value),
              x: lx,
              y: ly,
              align: "right",
              ...tickLabelStyle,
            },
          });
          this.group.add(label);
        }
      });
    }
  }

  private _drawAxisLine() {
    const options = this.options.axisLine;
    if (!options?.show) {
      return;
    }
    const box = this.layout.getAvailableSpace();

    let x1, x2, y1, y2;
    if (this.position === "bottom" || this.position === "top") {
      x1 = box.x1;
      x2 = box.x2;
      y1 = box.y1;
      y2 = box.y1;
    } else if (this.position === "left" || this.position === "right") {
      x1 = box.x2;
      x2 = box.x2;
      y1 = box.y1;
      y2 = box.y2;
    }

    const style: zrender.PathStyleProps = {
      stroke: options.lineStyle?.color,
      lineWidth: options.lineStyle?.width,
      lineDash: options.lineStyle?.type === "dashed" ? [5, 5] : [],
    };

    const axisLine = new zrender.Line({
      shape: {
        x1,
        y1,
        x2,
        y2,
      },
      style,
    });

    this.group.add(axisLine);
  }

  private _drawSplitLine() {
    const options = this.options.splitLine;
    if (!options?.show) {
      return;
    }

    const style: zrender.PathStyleProps = {
      stroke: options.lineStyle?.color,
      lineWidth: options.lineStyle?.width,
      lineDash: options.lineStyle?.type === "dashed" ? [5, 5] : [],
    };

    const box = this.layout.getAvailableSpace();
    const ticks = this._ticks;
    const plotArea = this._chart._getPlotArea();

    if (this.position === "bottom") {
      ticks.forEach((tick, index) => {
        if (index === 0) {
          return;
        }
        const x1 = this.scale.getPixelForValue(tick.value);
        const y1 = box.y1;
        const x2 = x1;
        const y2 = plotArea.y1;
        const line = new zrender.Line({
          shape: {
            x1,
            y1,
            x2,
            y2,
          },
          style,
        });

        this.group.add(line);
      });
    } else if (this.position === "left") {
      ticks.forEach((tick, index) => {
        // Exclude the first index
        if (index === 0) {
          return;
        }
        const x1 = box.x2;
        const y1 = this.scale.getPixelForValue(tick.value);
        const x2 = plotArea.x2;
        const y2 = y1;
        const line = new zrender.Line({
          shape: {
            x1,
            y1,
            x2,
            y2,
          },
          style,
        });

        this.group.add(line);
      });
    }
  }

  private _drawAxisName() {
    const box = this._chart._getPlotArea();
    const options = this.options;

    if (!options.name) {
      return;
    }

    const textStyle: zrender.TextStyleProps = {
      fill: options.nameTextStyle?.color,
      fontSize: options.nameTextStyle?.fontSize,
      fontFamily: options.nameTextStyle?.fontFamily,
    };

    if (this.position === "bottom") {
      const label = new zrender.Text({
        style: {
          text: this.options.name,
          x: box.x1 + box.width / 2,
          y: box.y2 + (options.nameGap || 25),
          align: "center",
          verticalAlign: "top",
          ...textStyle,
        },
      });
      this.group.add(label);
    } else if (this.position === "left") {
      const x = box.x1 - (options.nameGap || 35);
      const y = box.y1 + box.height / 2;
      const label = new zrender.Text({
        style: {
          text: this.options.name,
          x,
          y,
          align: "center",
          verticalAlign: "bottom",
          ...textStyle,
        },
        rotation: Math.PI / 2,
        originX: x,
        originY: y,
      });
      this.group.add(label);
    }
  }
}
