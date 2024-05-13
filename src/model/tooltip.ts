import * as zrender from "zrender";
import { Chart } from "./chart";
import { DataPoint } from "./series";
import { formatNumber } from "../utils/intl";

export interface TooltipShowOptions {
  x: number;
  y: number;
  color: string;
  data: DataPoint;
  seriesName?: string;
}

export interface TooltipFormatterOptions {
  color: string;
  data: DataPoint;
  seriesName?: string;
}

export class Tooltip {
  private _chart: Chart;
  private readonly _group: zrender.Group;

  constructor(chart: Chart) {
    this._chart = chart;
    this._group = new zrender.Group();
  }

  public show(options: TooltipShowOptions): void {
    const locale = this._chart.options.locale || "en-US";
    const { show, formatter } = this._chart.options.tooltip || {};
    if (!show) {
      return;
    }
    const { x, y, color, seriesName, data } = options;
    let textFormatted = "";
    if (formatter && typeof formatter === "function") {
      textFormatted = formatter({
        color,
        data,
        seriesName,
      });
    } else {
      if (typeof seriesName === "string" && seriesName.length > 0) {
        textFormatted = `${seriesName}\n`;
      }
      textFormatted += `${formatNumber(data.x, locale)}, ${formatNumber(
        data.y,
        locale
      )}`;
    }

    const text = new zrender.Text({
      style: {
        text: textFormatted,
        fill: "#fff",
        x: x + 5,
        y: y + 5,
        backgroundColor: "#000",
        padding: 5,
      },
    });

    const rect = text.getBoundingRect();
    if (x + rect.width + 10 > this._chart.getWidth()) {
      text.setStyle({
        x: x - rect.width,
      });
    }

    this._group.add(text);
    this._chart.zr.add(this._group);
  }

  public hide(): void {
    this._group.removeAll();
    this._chart.zr.remove(this._group);
  }
}
