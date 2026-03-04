import { AIDifficulty, BoardState, Coord, PlayerColor } from "./types";
import { WIN_LENGTH } from "./constants";
import { mod } from "../utils/math";

type LineInfo = {
  count: number;
  openEnds: number;
};

const DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function pickAIMove(
  board: BoardState,
  aiPlayer: PlayerColor,
  difficulty: AIDifficulty,
): Coord | null {
  const opponent = aiPlayer === "black" ? "white" : "black";
  const emptyCount = countEmpty(board);
  if (emptyCount === 0) return null;

  const aiWins = findImmediateWins(board, aiPlayer);
  if (aiWins.length > 0) {
    return aiWins[Math.floor(Math.random() * aiWins.length)];
  }

  const oppWins = findImmediateWins(board, opponent);
  if (oppWins.length > 0) {
    return oppWins[Math.floor(Math.random() * oppWins.length)];
  }

  const candidates = getCandidates(board, 2);
  if (candidates.length === 0) {
    return randomEmpty(board);
  }

  if (difficulty === "easy") {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  if (difficulty === "medium") {
    return pickBestByHeuristic(board, candidates, aiPlayer, 0.9);
  }

  return pickByMinimax(board, candidates, aiPlayer, opponent);
}

function countEmpty(board: BoardState): number {
  let count = 0;
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      if (board.grid[r][c] === null) count += 1;
    }
  }
  return count;
}

function randomEmpty(board: BoardState): Coord {
  const empties: Coord[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      if (board.grid[r][c] === null) {
        empties.push({ row: r, col: c });
      }
    }
  }
  return empties[Math.floor(Math.random() * empties.length)];
}

function findImmediateWins(board: BoardState, player: PlayerColor): Coord[] {
  const wins: Coord[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      if (board.grid[r][c] !== null) continue;
      if (isWinningMove(board, r, c, player)) {
        wins.push({ row: r, col: c });
      }
    }
  }
  return wins;
}

function getCandidates(board: BoardState, radius: number): Coord[] {
  const positions = new Set<string>();
  let hasStone = false;
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      if (board.grid[r][c] === null) continue;
      hasStone = true;
      for (let dr = -radius; dr <= radius; dr += 1) {
        for (let dc = -radius; dc <= radius; dc += 1) {
          const nr = mod(r + dr, board.rows);
          const nc = mod(c + dc, board.cols);
          if (board.grid[nr][nc] !== null) continue;
          positions.add(`${nr},${nc}`);
        }
      }
    }
  }

  if (!hasStone) {
    return [];
  }

  return Array.from(positions).map((key) => {
    const [row, col] = key.split(",").map((value) => Number(value));
    return { row, col };
  });
}

function pickBestByHeuristic(
  board: BoardState,
  candidates: Coord[],
  aiPlayer: PlayerColor,
  defenseWeight: number,
): Coord {
  const opponent = aiPlayer === "black" ? "white" : "black";
  let bestScore = -Infinity;
  let bestMoves: Coord[] = [];
  for (const move of candidates) {
    const score =
      evaluateMove(board, move, aiPlayer) -
      evaluateMove(board, move, opponent) * defenseWeight;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function pickByMinimax(
  board: BoardState,
  candidates: Coord[],
  aiPlayer: PlayerColor,
  opponent: PlayerColor,
): Coord {
  const ranked = rankMoves(board, candidates, aiPlayer);
  const maxMoves = ranked.slice(0, 10);
  let bestScore = -Infinity;
  let bestMove = maxMoves[0];
  for (const move of maxMoves) {
    applyMove(board, move, aiPlayer);
    const score = minimax(board, 1, false, aiPlayer, opponent, -Infinity, Infinity);
    undoMove(board, move);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function minimax(
  board: BoardState,
  depth: number,
  maximizing: boolean,
  aiPlayer: PlayerColor,
  opponent: PlayerColor,
  alpha: number,
  beta: number,
): number {
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const player = maximizing ? aiPlayer : opponent;
  const candidates = getCandidates(board, 2);
  if (candidates.length === 0) {
    return evaluateBoard(board, aiPlayer);
  }
  const ranked = rankMoves(board, candidates, player).slice(0, 8);

  if (maximizing) {
    let best = -Infinity;
    for (const move of ranked) {
      applyMove(board, move, player);
      const score = isWinningMove(board, move.row, move.col, player)
        ? 1_000_000
        : minimax(board, depth - 1, false, aiPlayer, opponent, alpha, beta);
      undoMove(board, move);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of ranked) {
    applyMove(board, move, player);
    const score = isWinningMove(board, move.row, move.col, player)
      ? -1_000_000
      : minimax(board, depth - 1, true, aiPlayer, opponent, alpha, beta);
    undoMove(board, move);
    best = Math.min(best, score);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function evaluateBoard(board: BoardState, aiPlayer: PlayerColor): number {
  const opponent = aiPlayer === "black" ? "white" : "black";
  const candidates = getCandidates(board, 2);
  if (candidates.length === 0) return 0;
  const aiScore = maxCandidateScore(board, candidates, aiPlayer);
  const oppScore = maxCandidateScore(board, candidates, opponent);
  return aiScore - oppScore * 1.05;
}

function maxCandidateScore(
  board: BoardState,
  candidates: Coord[],
  player: PlayerColor,
): number {
  let best = 0;
  for (const move of candidates) {
    best = Math.max(best, evaluateMove(board, move, player));
  }
  return best;
}

function rankMoves(
  board: BoardState,
  candidates: Coord[],
  player: PlayerColor,
): Array<Coord & { score: number }> {
  return candidates
    .map((move) => ({
      ...move,
      score: evaluateMove(board, move, player),
    }))
    .sort((a, b) => b.score - a.score);
}

function evaluateMove(
  board: BoardState,
  move: Coord,
  player: PlayerColor,
): number {
  let score = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const info = evaluateLine(board, move.row, move.col, player, dr, dc);
    score += lineScore(info);
  }
  return score;
}

function evaluateLine(
  board: BoardState,
  row: number,
  col: number,
  player: PlayerColor,
  dr: number,
  dc: number,
): LineInfo {
  let count = 1;
  let openEnds = 0;
  const maxSteps = Math.max(board.rows, board.cols);

  for (let step = 1; step < maxSteps; step += 1) {
    const nr = mod(row + dr * step, board.rows);
    const nc = mod(col + dc * step, board.cols);
    if (nr === row && nc === col) break;
    const cell = board.grid[nr][nc];
    if (cell === player) {
      count += 1;
    } else {
      if (cell === null) openEnds += 1;
      break;
    }
  }

  for (let step = 1; step < maxSteps; step += 1) {
    const nr = mod(row - dr * step, board.rows);
    const nc = mod(col - dc * step, board.cols);
    if (nr === row && nc === col) break;
    const cell = board.grid[nr][nc];
    if (cell === player) {
      count += 1;
    } else {
      if (cell === null) openEnds += 1;
      break;
    }
  }

  return { count, openEnds };
}

function lineScore(info: LineInfo): number {
  if (info.count >= WIN_LENGTH) return 1_000_000;
  if (info.count === 4) {
    return info.openEnds === 2 ? 18_000 : 6_000;
  }
  if (info.count === 3) {
    return info.openEnds === 2 ? 1_800 : 600;
  }
  if (info.count === 2) {
    return info.openEnds === 2 ? 200 : 60;
  }
  return info.openEnds === 2 ? 30 : 10;
}

function isWinningMove(
  board: BoardState,
  row: number,
  col: number,
  player: PlayerColor,
): boolean {
  const current = board.grid[row][col];
  if (current !== null && current !== player) return false;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    const maxSteps = Math.max(board.rows, board.cols);
    for (let step = 1; step < maxSteps; step += 1) {
      const nr = mod(row + dr * step, board.rows);
      const nc = mod(col + dc * step, board.cols);
      if (nr === row && nc === col) break;
      if (board.grid[nr][nc] === player) count += 1;
      else break;
    }
    for (let step = 1; step < maxSteps; step += 1) {
      const nr = mod(row - dr * step, board.rows);
      const nc = mod(col - dc * step, board.cols);
      if (nr === row && nc === col) break;
      if (board.grid[nr][nc] === player) count += 1;
      else break;
    }
    if (count >= WIN_LENGTH) return true;
  }
  return false;
}

function applyMove(board: BoardState, move: Coord, player: PlayerColor) {
  board.grid[move.row][move.col] = player;
}

function undoMove(board: BoardState, move: Coord) {
  board.grid[move.row][move.col] = null;
}
