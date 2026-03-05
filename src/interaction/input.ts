import { PlaceRequest, RenderMetrics } from "../core/types";
import { DRAG_THRESHOLD_PX } from "../core/constants";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  accumX: number;
  accumY: number;
  captured: boolean;
  didPan: boolean;
};

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private onMove: (dr: number, dc: number) => void;
  private onPlace: (placement: PlaceRequest) => void;
  private getMetrics: () => RenderMetrics;
  private drag: DragState | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onMove: (dr: number, dc: number) => void,
    onPlace: (placement: PlaceRequest) => void,
    getMetrics: () => RenderMetrics,
  ) {
    this.canvas = canvas;
    this.onMove = onMove;
    this.onPlace = onPlace;
    this.getMetrics = getMetrics;
    this.attachEvents();
  }

  private attachEvents() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.addEventListener("lostpointercapture", this.handleLostPointerCapture);
    this.canvas.addEventListener("contextmenu", (event) =>
      event.preventDefault(),
    );
    window.addEventListener("blur", this.handleWindowBlur);
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    const { x, y } = this.getPointerPosition(event);
    this.drag = {
      pointerId: event.pointerId,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      moved: false,
      accumX: 0,
      accumY: 0,
      captured: false,
      didPan: false,
    };
    if (event.pointerType !== "mouse") {
      this.capturePointer(event.pointerId);
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      this.cancelDrag(event.pointerId);
      return;
    }
    const { x, y } = this.getPointerPosition(event);
    const totalDx = x - this.drag.startX;
    const totalDy = y - this.drag.startY;
    const stepDx = x - this.drag.lastX;
    const stepDy = y - this.drag.lastY;

    if (!this.drag.moved) {
      if (
        Math.abs(totalDx) > DRAG_THRESHOLD_PX ||
        Math.abs(totalDy) > DRAG_THRESHOLD_PX
      ) {
        this.drag.moved = true;
        this.drag.accumX = totalDx;
        this.drag.accumY = totalDy;
        this.capturePointer(event.pointerId);
        event.preventDefault();
      }
    } else {
      event.preventDefault();
      this.drag.accumX += stepDx;
      this.drag.accumY += stepDy;
    }

    if (this.drag.moved) {
      const { cellSize } = this.getMetrics();
      if (cellSize <= 0) return;
      const moveCols = -Math.trunc(this.drag.accumX / cellSize);
      const moveRows = -Math.trunc(this.drag.accumY / cellSize);
      if (moveRows !== 0 || moveCols !== 0) {
        this.onMove(moveRows, moveCols);
        this.drag.didPan = true;
        this.drag.accumX += moveCols * cellSize;
        this.drag.accumY += moveRows * cellSize;
      }
    }

    this.drag.lastX = x;
    this.drag.lastY = y;
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const { x, y } = this.getPointerPosition(event);
    const totalDx = x - this.drag.startX;
    const totalDy = y - this.drag.startY;
    const totalDistance = Math.hypot(totalDx, totalDy);
    const { cellSize } = this.getMetrics();
    const clickTolerance = Math.max(DRAG_THRESHOLD_PX, cellSize * 0.25);
    const wasClick = !this.drag.didPan && totalDistance <= clickTolerance;

    if (wasClick) {
      const coord = this.screenToGrid(x, y);
      if (coord) {
        this.onPlace(coord);
      }
    }

    this.cancelDrag(event.pointerId);
  };

  private handlePointerCancel = (event: PointerEvent) => {
    this.cancelDrag(event.pointerId);
  };

  private handleLostPointerCapture = (event: PointerEvent) => {
    this.cancelDrag(event.pointerId);
  };

  private handleWindowBlur = () => {
    this.cancelDrag();
  };

  private capturePointer(pointerId: number) {
    if (!this.drag || this.drag.captured) return;
    try {
      this.canvas.setPointerCapture(pointerId);
      this.drag.captured = true;
    } catch {
      this.drag.captured = false;
    }
  }

  private cancelDrag(pointerId?: number) {
    if (!this.drag) return;
    if (pointerId !== undefined && this.drag.pointerId !== pointerId) return;
    if (this.drag.captured) {
      try {
        this.canvas.releasePointerCapture(this.drag.pointerId);
      } catch {
        // Ignore release errors when capture is already lost.
      }
    }
    this.drag = null;
  };

  private getPointerPosition(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private screenToGrid(x: number, y: number): PlaceRequest | null {
    const { boardX, boardY, cellSize, rows, cols } = this.getMetrics();
    if (cellSize <= 0 || rows <= 0 || cols <= 0) return null;
    const rawCol = Math.round((x - boardX) / cellSize);
    const rawRow = Math.round((y - boardY) / cellSize);
    if (
      rawRow < 0 ||
      rawRow > rows - 1 ||
      rawCol < 0 ||
      rawCol > cols - 1
    ) {
      return null;
    }
    const row = rawRow;
    const col = rawCol;
    const targetX = boardX + rawCol * cellSize;
    const targetY = boardY + rawRow * cellSize;
    const distance = Math.hypot(x - targetX, y - targetY);
    if (distance > cellSize * 0.6) {
      return null;
    }
    return {
      coord: { row, col },
      rawRow,
      rawCol,
    };
  }
}
