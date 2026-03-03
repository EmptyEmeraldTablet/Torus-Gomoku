import { Game } from "./core/game";
import { BoardState } from "./core/types";
import { DEFAULT_COLS, DEFAULT_ROWS } from "./core/constants";

const canvas = document.getElementById("board-canvas") as HTMLCanvasElement | null;
const currentPlayerEl = document.getElementById("current-player");
const winnerEl = document.getElementById("winner");
const undoBtn = document.getElementById("undo-btn") as HTMLButtonElement | null;
const resetBtn = document.getElementById("reset-btn");
const boardSizeSelect = document.getElementById(
  "board-size",
) as HTMLSelectElement | null;
const applySizeBtn = document.getElementById(
  "apply-size-btn",
) as HTMLButtonElement | null;

if (!canvas) {
  throw new Error("Canvas element not found.");
}

const game = new Game(canvas, {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  onStateChange: updateStatus,
});

resetBtn?.addEventListener("click", () => {
  game.reset();
});

undoBtn?.addEventListener("click", () => {
  game.undo();
});

applySizeBtn?.addEventListener("click", () => {
  if (!boardSizeSelect) return;
  const size = Number.parseInt(boardSizeSelect.value, 10);
  if (Number.isFinite(size) && size > 0) {
    game.setBoardSize(size, size);
  }
});

window.addEventListener("resize", () => {
  game.resize();
});

function updateStatus(board: BoardState) {
  const currentLabel = board.currentPlayer === "black" ? "黑棋" : "白棋";
  if (currentPlayerEl) {
    currentPlayerEl.textContent = currentLabel;
    currentPlayerEl.setAttribute("data-player", board.currentPlayer);
  }

  if (winnerEl) {
    if (board.winner) {
      const winnerLabel = board.winner === "black" ? "黑棋" : "白棋";
      winnerEl.textContent = winnerLabel;
      winnerEl.setAttribute("data-player", board.winner);
    } else {
      winnerEl.textContent = "未决";
      winnerEl.setAttribute("data-player", "none");
    }
  }

  if (undoBtn) {
    undoBtn.disabled = board.moveHistory.length === 0;
  }

  if (boardSizeSelect) {
    const sizeValue = String(board.rows);
    if (boardSizeSelect.value !== sizeValue) {
      boardSizeSelect.value = sizeValue;
    }
  }
}
