"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 10;
const ROWS = 20;
const CELL = 20;

const SHAPES: { cells: number[][]; color: string }[] = [
  { cells: [[1, 1, 1, 1]], color: "#36c5f0" }, // I
  { cells: [[1, 1], [1, 1]], color: "#ffcc00" }, // O
  { cells: [[0, 1, 0], [1, 1, 1]], color: "#a85cd6" }, // T
  { cells: [[0, 1, 1], [1, 1, 0]], color: "#2ed06a" }, // S
  { cells: [[1, 1, 0], [0, 1, 1]], color: "#e34850" }, // Z
  { cells: [[1, 0, 0], [1, 1, 1]], color: "#4a7dff" }, // J
  { cells: [[0, 0, 1], [1, 1, 1]], color: "#ff9933" }, // L
];

type Piece = { shape: number[][]; color: string; row: number; col: number };

function randomPiece(): Piece {
  const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    shape: s.cells.map((r) => [...r]),
    color: s.color,
    row: 0,
    col: Math.floor((COLS - s.cells[0].length) / 2),
  };
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const out: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = shape[r][c];
    }
  }
  return out;
}

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
  );
  const pieceRef = useRef<Piece>(randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const runningRef = useRef(false);
  runningRef.current = running && !gameOver;

  const collides = useCallback((piece: Piece): boolean => {
    const board = boardRef.current;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const br = piece.row + r;
        const bc = piece.col + c;
        if (bc < 0 || bc >= COLS || br >= ROWS) return true;
        if (br >= 0 && board[br][bc]) return true;
      }
    }
    return false;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#0d0d12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cell = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, 4);
    };

    const board = boardRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const col = board[r][c];
        if (col) cell(c, r, col);
      }
    }
    const p = pieceRef.current;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] && p.row + r >= 0) cell(p.col + c, p.row + r, p.color);
      }
    }
    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
  }, []);

  const lockPiece = useCallback(() => {
    const board = boardRef.current;
    const p = pieceRef.current;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] && p.row + r >= 0) {
          board[p.row + r][p.col + c] = p.color;
        }
      }
    }
    // clear full lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      setLines((l) => l + cleared);
      setScore((s) => s + [0, 100, 300, 500, 800][cleared]);
    }
    const next = randomPiece();
    pieceRef.current = next;
    if (collides(next)) {
      setGameOver(true);
      setRunning(false);
    }
  }, [collides]);

  const move = useCallback(
    (dr: number, dc: number): boolean => {
      const p = pieceRef.current;
      const moved = { ...p, row: p.row + dr, col: p.col + dc };
      if (!collides(moved)) {
        pieceRef.current = moved;
        draw();
        return true;
      }
      return false;
    },
    [collides, draw],
  );

  const tick = useCallback(() => {
    if (!runningRef.current) return;
    if (!move(1, 0)) lockPiece();
    draw();
  }, [move, lockPiece, draw]);

  const doRotate = useCallback(() => {
    const p = pieceRef.current;
    const rotated = { ...p, shape: rotate(p.shape) };
    for (const kick of [0, -1, 1, -2, 2]) {
      const candidate = { ...rotated, col: rotated.col + kick };
      if (!collides(candidate)) {
        pieceRef.current = candidate;
        draw();
        return;
      }
    }
  }, [collides, draw]);

  const hardDrop = useCallback(() => {
    while (move(1, 0)) {
      /* descend */
    }
    lockPiece();
    draw();
  }, [move, lockPiece, draw]);

  const start = () => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    pieceRef.current = randomPiece();
    setScore(0);
    setLines(0);
    setGameOver(false);
    setRunning(true);
  };

  useEffect(() => {
    if (!running || gameOver) return;
    const speed = Math.max(120, 550 - Math.floor(lines / 5) * 60);
    const t = setInterval(tick, speed);
    return () => clearInterval(t);
  }, [running, gameOver, lines, tick]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!runningRef.current) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          move(0, -1);
          break;
        case "ArrowRight":
          e.preventDefault();
          move(0, 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          move(1, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          doRotate();
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, doRotate, hardDrop]);

  return (
    <div className="tetris-wrap">
      <div className="tetris-hud">
        <span>ניקוד: <strong>{score}</strong></span>
        <span>שורות: <strong>{lines}</strong></span>
      </div>
      <div className="tetris-stage">
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className="tetris-canvas"
          aria-label="לוח טטריס"
        />
        {(!running || gameOver) && (
          <div className="tetris-overlay">
            {gameOver && <p className="tetris-over-text">המשחק נגמר!</p>}
            {gameOver && <p className="tetris-over-score">ניקוד סופי: {score}</p>}
            <button type="button" className="tetris-start-btn" onClick={start}>
              {gameOver ? "שחק שוב" : "התחל משחק"}
            </button>
            <p className="tetris-help">חצים להזזה וסיבוב · רווח להפלה</p>
          </div>
        )}
      </div>
      {/* dir=ltr keeps the visual order fixed so each arrow matches its movement direction */}
      <div className="tetris-controls" aria-label="כפתורי שליטה" dir="ltr">
        <button type="button" onClick={() => move(0, -1)} aria-label="שמאלה">←</button>
        <button type="button" onClick={doRotate} aria-label="סובב">⟳</button>
        <button type="button" onClick={() => move(1, 0)} aria-label="למטה">↓</button>
        <button type="button" onClick={hardDrop} aria-label="הפל">⤓</button>
        <button type="button" onClick={() => move(0, 1)} aria-label="ימינה">→</button>
      </div>
    </div>
  );
}
