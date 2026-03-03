import { createBoard, createEmptyGrid } from "./board";
import { DEFAULT_COLS, DEFAULT_ROWS, WIN_LENGTH } from "./constants";
import { BoardState, PlaceRequest, PlayerColor, WrapTransition } from "./types";
import { mod } from "../utils/math";
import { CameraController } from "../interaction/camera";
import { Renderer } from "../rendering/renderer";
import { InputHandler } from "../interaction/input";

type GameOptions = {
  rows?: number;
  cols?: number;
  onStateChange?: (board: BoardState) => void;
};

export class Game {
  private board: BoardState;
  private camera: CameraController;
  private renderer: Renderer;
  private input: InputHandler;
  private onStateChange?: (board: BoardState) => void;
  private rafHandle = 0;
  private wrapTransition: WrapTransition | null = null;

  constructor(canvas: HTMLCanvasElement, options: GameOptions = {}) {
    const rows = options.rows ?? DEFAULT_ROWS;
    const cols = options.cols ?? DEFAULT_COLS;
    this.board = createBoard(rows, cols);
    this.camera = new CameraController(rows, cols);
    this.renderer = new Renderer(canvas, rows, cols);
    this.onStateChange = options.onStateChange;
    this.input = new InputHandler(
      canvas,
      this.onMove,
      this.onPlace,
      () => this.renderer.getMetrics(),
    );
    this.notifyState();
    this.render();
  }

  resize() {
    this.renderer.resize();
    this.render();
  }

  reset() {
    this.board.grid = createEmptyGrid(this.board.rows, this.board.cols);
    this.board.currentPlayer = "black";
    this.board.winner = null;
    this.board.moveHistory = [];
    this.camera.reset();
    this.wrapTransition = null;
    this.notifyState();
    this.render();
  }

  undo() {
    if (this.board.moveHistory.length === 0) return;
    const last = this.board.moveHistory.pop();
    if (!last) return;
    const lastPlayer = this.board.grid[last.row][last.col];
    this.board.grid[last.row][last.col] = null;
    if (lastPlayer) {
      this.board.currentPlayer = lastPlayer;
    }
    this.board.winner = null;
    this.wrapTransition = null;
    this.notifyState();
    this.render();
  }

  setBoardSize(rows: number, cols: number) {
    const nextRows = Math.max(WIN_LENGTH, Math.floor(rows));
    const nextCols = Math.max(WIN_LENGTH, Math.floor(cols));
    this.board = createBoard(nextRows, nextCols);
    this.camera = new CameraController(nextRows, nextCols);
    this.renderer.setBoardSize(nextRows, nextCols);
    this.wrapTransition = null;
    this.notifyState();
    this.render();
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.board);
    }
  }

  private onMove = (dr: number, dc: number) => {
    this.camera.move(dr, dc);
    this.render();
  };

  private onPlace = (placement: PlaceRequest) => {
    if (this.board.winner) return;
    const gridCoord = placement.coord;
    const r = mod(
      gridCoord.row + this.camera.offsetRow,
      this.board.rows,
    );
    const c = mod(
      gridCoord.col + this.camera.offsetCol,
      this.board.cols,
    );
    if (this.board.grid[r][c] !== null) return;

    const placedPlayer = this.board.currentPlayer;
    this.board.grid[r][c] = placedPlayer;
    this.board.moveHistory.push({ row: r, col: c });

    if (placement.wrapRow || placement.wrapCol) {
      this.wrapTransition = {
        to: { row: r, col: c },
        wrapRow: placement.wrapRow,
        wrapCol: placement.wrapCol,
        player: placedPlayer,
        start: performance.now(),
        duration: 420,
      };
    }

    if (this.checkWin(r, c)) {
      this.board.winner = placedPlayer;
    } else {
      this.board.currentPlayer =
        this.board.currentPlayer === "black" ? "white" : "black";
    }

    this.notifyState();
    this.render();
  };

  private checkWin(row: number, col: number): boolean {
    const player = this.board.grid[row][col] as PlayerColor | null;
    if (!player) return false;
    const directions: Array<[number, number]> = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dr, dc] of directions) {
      let count = 1;
      for (let step = 1; step < WIN_LENGTH; step += 1) {
        const nr = mod(row + dr * step, this.board.rows);
        const nc = mod(col + dc * step, this.board.cols);
        if (nr === row && nc === col) break;
        if (this.board.grid[nr][nc] === player) count += 1;
        else break;
      }
      for (let step = 1; step < WIN_LENGTH; step += 1) {
        const nr = mod(row - dr * step, this.board.rows);
        const nc = mod(col - dc * step, this.board.cols);
        if (nr === row && nc === col) break;
        if (this.board.grid[nr][nc] === player) count += 1;
        else break;
      }
      if (count >= WIN_LENGTH) return true;
    }
    return false;
  }

  private render() {
    if (this.rafHandle) return;
    this.rafHandle = window.requestAnimationFrame((now) => {
      this.rafHandle = 0;
      this.renderer.draw(this.board, this.camera, this.wrapTransition, now);
      if (this.wrapTransition) {
        if (now - this.wrapTransition.start < this.wrapTransition.duration) {
          this.render();
        } else {
          this.wrapTransition = null;
        }
      }
    });
  }
}
