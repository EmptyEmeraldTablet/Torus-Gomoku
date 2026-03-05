export type Coord = {
  row: number;
  col: number;
};

export type Player = "black" | "white" | null;
export type PlayerColor = Exclude<Player, null>;

export type GameMode = "pvp" | "pve";
export type AIDifficulty = "easy" | "medium" | "hard";

export type BoardState = {
  rows: number;
  cols: number;
  grid: Player[][];
  currentPlayer: PlayerColor;
  winner: PlayerColor | null;
  moveHistory: Coord[];
};

export type RenderMetrics = {
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  rows: number;
  cols: number;
};

export type PlaceRequest = {
  coord: Coord;
  rawRow: number;
  rawCol: number;
};
