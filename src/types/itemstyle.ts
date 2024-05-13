export interface ItemStyle {
  color: string;
  borderColor: string;
  borderWidth: number;
  borderType: "solid" | "dashed" | "dotted";
}

export type ItemStyleOptions = Partial<ItemStyle>;
