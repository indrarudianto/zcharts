import * as zrender from "zrender";
import { Chart } from "./chart";
import { Layout } from "./layout";
import { Scale, ScaleOptions } from "./scale";
import { LinearScale } from "../scales/linear";
import { TextStyleOptions } from "../types/textstyle";
import { Tick } from "../types/tick";
import LogarithmicScale, { LogTick } from "../scales/logarithmic";

export type AxisPosition = "top" | "right" | "bottom" | "left";

export interface SplitLineOptions {
  show: boolean;
}

export interface AxisTickOptions {
  show: boolean;
  length: number;
  inside: boolean;
  interval: number;
}

export interface AxisLabelOptions {
  show: boolean;
  inside: boolean;
  margin: number;
}

export interface AxisProps {
  position: AxisPosition;
  inverse: boolean;
  splitLine: SplitLineOptions;
  axisTick: Partial<AxisTickOptions>;
  axisLabel: Partial<AxisLabelOptions>;
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
      splitLine: {
        show: false,
      },
      axisTick: {
        show: true,
        length: 5,
        inside: false,
        inteval: "auto",
      },
      axisLabel: {
        show: true,
        inside: false,
        margin: 8,
      },
      type: "value",
      beginAtZero: true,
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
            style: {
              stroke: "black",
            },
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
            style: {
              stroke: "black",
            },
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
            style: {
              stroke: "black",
            },
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
            style: {
              stroke: "black",
            },
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
            },
          });
          this.group.add(label);
        }
      });
    }
  }

  private _drawAxisLine() {
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

    const axisLine = new zrender.Line({
      shape: {
        x1,
        y1,
        x2,
        y2,
      },
      style: {
        stroke: "black",
      },
    });

    this.group.add(axisLine);
  }

  private _drawSplitLine() {
    const showSplitLine = this.options.splitLine?.show;
    if (!showSplitLine) {
      return;
    }

    const box = this.layout.getAvailableSpace();
    const ticks = this._ticks;
    const plotArea = this._chart._getPlotArea();

    if (this.position === "bottom") {
      const deltaPixel = box.width / (this.scale.max - this.scale.min);
      ticks.forEach((tick, index) => {
        if (index === 0) {
          return;
        }
        const x0 = box.x1 + (tick.value - this.scale.min) * deltaPixel;
        const line = new zrender.Line({
          shape: {
            x1: x0,
            y1: box.y1,
            x2: x0,
            y2: plotArea.y1,
          },
          style: {
            stroke: "black",
            lineDash: [5, 5],
          },
        });

        this.group.add(line);
      });
    } else if (this.position === "left") {
      const deltaPixel = box.height / (this.scale.max - this.scale.min);
      ticks.forEach((tick, index) => {
        // Exclude the first index
        if (index === 0) {
          return;
        }
        const y0 = box.y2 - (tick.value - this.scale.min) * deltaPixel;
        const line = new zrender.Line({
          shape: {
            x1: box.x2,
            y1: y0,
            x2: plotArea.x2,
            y2: y0,
          },
          style: {
            stroke: "black",
            lineDash: [5, 5],
          },
        });

        this.group.add(line);
      });
    }
  }

  private _drawAxisName() {
    const box = this._chart._getPlotArea();
    const options = this.options;

    if (this.position === "bottom") {
      const label = new zrender.Text({
        style: {
          text: this.options.name,
          x: box.x1 + box.width / 2,
          y: box.y2 + (options.nameGap || 25),
          align: "center",
          verticalAlign: "top",
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
        },
        rotation: Math.PI / 2,
        originX: x,
        originY: y,
      });
      this.group.add(label);
    }
  }
}
