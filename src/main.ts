import { Game } from "./core/game";
import { AIDifficulty, BoardState, GameMode, PlayerColor } from "./core/types";
import { DEFAULT_COLS, DEFAULT_ROWS } from "./core/constants";

const canvas = document.getElementById("board-canvas") as HTMLCanvasElement | null;
const currentPlayerEl = document.getElementById("current-player");
const winnerEl = document.getElementById("winner");
const undoBtn = document.getElementById("undo-btn") as HTMLButtonElement | null;
const resetBtn = document.getElementById("reset-btn");
const modeSelect = document.getElementById("mode-select") as HTMLSelectElement | null;
const aiDifficultySelect = document.getElementById(
  "ai-difficulty",
) as HTMLSelectElement | null;
const aiColorSelect = document.getElementById("ai-color") as HTMLSelectElement | null;
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

window.requestAnimationFrame(() => {
  game.resize();
});

window.addEventListener("load", () => {
  game.resize();
});

let gameMode: GameMode = "pvp";
let aiDifficulty: AIDifficulty = "medium";
let aiPlayer: PlayerColor = "white";

applyAISettings();
updateAIControls();

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

modeSelect?.addEventListener("change", () => {
  if (!modeSelect) return;
  gameMode = modeSelect.value === "pve" ? "pve" : "pvp";
  applyAISettings();
  updateAIControls();
});

aiDifficultySelect?.addEventListener("change", () => {
  if (!aiDifficultySelect) return;
  const value = aiDifficultySelect.value as AIDifficulty;
  aiDifficulty = value === "hard" ? "hard" : value === "easy" ? "easy" : "medium";
  applyAISettings();
});

aiColorSelect?.addEventListener("change", () => {
  if (!aiColorSelect) return;
  aiPlayer = aiColorSelect.value === "black" ? "black" : "white";
  applyAISettings();
});

function updateStatus(board: BoardState) {
  const currentLabel = board.currentPlayer === "black" ? "黑棋" : "白棋";
  const roleLabel =
    gameMode === "pve" && board.currentPlayer === aiPlayer ? "AI" : "玩家";
  if (currentPlayerEl) {
    currentPlayerEl.textContent =
      gameMode === "pve" ? `${currentLabel}（${roleLabel}）` : currentLabel;
    currentPlayerEl.setAttribute("data-player", board.currentPlayer);
  }

  if (winnerEl) {
    if (board.winner) {
      const winnerLabel = board.winner === "black" ? "黑棋" : "白棋";
      const winnerRole =
        gameMode === "pve" && board.winner === aiPlayer ? "AI" : "玩家";
      winnerEl.textContent =
        gameMode === "pve" ? `${winnerLabel}（${winnerRole}）` : winnerLabel;
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

function applyAISettings() {
  game.configureAI({
    mode: gameMode,
    aiPlayer,
    difficulty: aiDifficulty,
  });
}

function updateAIControls() {
  const enabled = gameMode === "pve";
  if (aiDifficultySelect) {
    aiDifficultySelect.disabled = !enabled;
    if (aiDifficultySelect.value !== aiDifficulty) {
      aiDifficultySelect.value = aiDifficulty;
    }
  }
  if (aiColorSelect) {
    aiColorSelect.disabled = !enabled;
    if (aiColorSelect.value !== aiPlayer) {
      aiColorSelect.value = aiPlayer;
    }
  }
}
