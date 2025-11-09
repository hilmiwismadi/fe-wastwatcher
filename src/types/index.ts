export interface TrashData {
  organic: number;
  anorganic: number;
  residue: number;
  empty?: number;
}

export interface ChartData {
  time: string;
  value: number;
  fullTimestamp?: string; // Full timestamp for tooltip display
}

export interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

export interface CurrentSpecific {
  organic: { weight: number; volume: number };
  anorganic: { weight: number; volume: number };
  residue: { weight: number; volume: number };
}

export type ToggleType = "weight" | "volume";