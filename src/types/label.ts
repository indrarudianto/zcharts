export interface Label {
  show: boolean;
  position: "top" | "bottom" | "left" | "right";
  distance: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

export type LabelOptions = Partial<Label>;