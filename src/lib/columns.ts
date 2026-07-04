export type ColumnId = "type" | "colors" | "manaValue" | "price" | "popularity";

export interface ColumnDef {
  id: ColumnId;
  header: string;
}

export const COLUMNS: ColumnDef[] = [
  { id: "type", header: "Type" },
  { id: "colors", header: "Colours" },
  { id: "manaValue", header: "Mana Value" },
  { id: "price", header: "Price" },
  { id: "popularity", header: "Rank" },
];
