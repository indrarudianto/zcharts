export interface LineStyle {
  color: string;
  width: number;
  type: "solid" | "dashed" | "dotted";
}

export type LineStyleOptions = Partial<LineStyle>;
