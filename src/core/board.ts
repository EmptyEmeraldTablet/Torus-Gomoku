import { BoardState, Player } from "./types";

export function createEmptyGrid(rows: number, cols: number): Player[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
}

export function createBoard(rows: number, cols: number): BoardState {
  return {
    rows,
    cols,
    grid: createEmptyGrid(rows, cols),
    currentPlayer: "black",
    winner: null,
    moveHistory: [],
  };
}
