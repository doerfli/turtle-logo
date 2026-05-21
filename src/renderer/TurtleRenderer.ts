import type { TurtleState, DrawCommand } from '../interpreter/executor';

// ─── SVG segment for export ────────────────────────────────────────────────

export interface SVGSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  width: number;
}

// ─── TurtleRenderer ────────────────────────────────────────────────────────

export class TurtleRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private segments: SVGSegment[] = [];

  // off-screen canvas that persists drawn lines
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.width  = canvas.width;
    this.height = canvas.height;
    this.ctx    = canvas.getContext('2d')!;
    this.offscreen = document.createElement('canvas');
    this.offscreen.width  = this.width;
    this.offscreen.height = this.height;
    this.offCtx = this.offscreen.getContext('2d')!;
    this.clear();
  }

  resize(w: number, h: number) {
    // Preserve drawn content when canvas resizes
    const tmp = document.createElement('canvas');
    tmp.width = this.offscreen.width;
    tmp.height = this.offscreen.height;
    tmp.getContext('2d')!.drawImage(this.offscreen, 0, 0);
    this.width = w;
    this.height = h;
    this.offscreen.width  = w;
    this.offscreen.height = h;
    this.offCtx.drawImage(tmp, 0, 0);
  }

  // world → canvas coords (center = 0,0, y-up)
  private toCanvas(wx: number, wy: number): [number, number] {
    return [this.width / 2 + wx, this.height / 2 - wy];
  }

  clear() {
    this.offCtx.fillStyle = '#1e1e2e';
    this.offCtx.fillRect(0, 0, this.width, this.height);
    this.segments = [];
  }

  applyDraw(cmd: DrawCommand) {
    if (cmd.type === 'clear') { this.clear(); return; }
    if (cmd.type === 'move') return;

    if (cmd.type === 'line') {
      const [x1, y1] = this.toCanvas(cmd.x1!, cmd.y1!);
      const [x2, y2] = this.toCanvas(cmd.x2!, cmd.y2!);
      this.offCtx.beginPath();
      this.offCtx.strokeStyle = cmd.color!;
      this.offCtx.lineWidth   = cmd.width!;
      this.offCtx.lineCap     = 'round';
      this.offCtx.lineJoin    = 'round';
      this.offCtx.moveTo(x1, y1);
      this.offCtx.lineTo(x2, y2);
      this.offCtx.stroke();

      this.segments.push({ x1: cmd.x1!, y1: cmd.y1!, x2: cmd.x2!, y2: cmd.y2!, color: cmd.color!, width: cmd.width! });
    }
  }

  render(state: TurtleState) {
    // Blit offscreen to display canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.offscreen, 0, 0);

    if (state.visible) this.drawTurtle(state);
  }

  private drawTurtle(state: TurtleState) {
    const [cx, cy] = this.toCanvas(state.x, state.y);
    const size = 12;
    const rad = ((state.heading - 90) * Math.PI) / 180;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rad);

    // Draw a simple arrow/triangle shape
    this.ctx.beginPath();
    this.ctx.moveTo(0, -size);
    this.ctx.lineTo(size * 0.6, size * 0.6);
    this.ctx.lineTo(0, size * 0.2);
    this.ctx.lineTo(-size * 0.6, size * 0.6);
    this.ctx.closePath();
    this.ctx.fillStyle = '#f5c542';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1.5;
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  // ── Export helpers ──────────────────────────────────────────────────────

  exportPNG(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }

  exportSVG(): string {
    const paths = this.segments.map(s => {
      const [x1, y1] = this.toCanvas(s.x1, s.y1);
      const [x2, y2] = this.toCanvas(s.x2, s.y2);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round"/>`;
    }).join('\n  ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}">
  <rect width="${this.width}" height="${this.height}" fill="#1e1e2e"/>
  ${paths}
</svg>`;
  }

  getSegments() { return this.segments; }
}
