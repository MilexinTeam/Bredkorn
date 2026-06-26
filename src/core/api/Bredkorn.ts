import type { BredkornSetupOptions, Pos } from "./Bredkorn.types";
import {deepMerge, insertChar, hexToRgb, hexToRgbString, getFont, initFontTTF, cloneLines, cmpPos, normPos, normalizeSelection, isSamePos} from "../helper"
import {initKeyboard, handleKeyDown} from "../keybord"
import { initMouse } from "../mouse";
let linesDot = [
  {dot: false, r:0,g:0,b:0}
]

// ===============================
//  MAIN CLASS
// ===============================
function DrawEllipse(ctx : CanvasRenderingContext2D, x : number, y : number, xx : number, yy : number) {
    const width = xx - x;
    const height = yy - y;

    const cx = x + width / 2;   // środek X
    const cy = y + height / 2;  // środek Y

    const rx = Math.abs(width / 2);   // promień poziomy
    const ry = Math.abs(height / 2);  // promień pionowy

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
}

export class Bredkorn {
  private homeElement: HTMLElement;
  private options: BredkornSetupOptions;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private _theme: Record<string, any> = {};
  private panelWidth: number = 0;

  private scrollOffsetY = 0;
  private scrollOffsetX = 0;
  private lineLength = 1;

  private textarea!: HTMLTextAreaElement;
  public lines: string[] = [];

  private textWidthCache = new Map<string, number>();
  private needsRender = false;

  public cursorX: number = 0;
  public cursorY: number = 0;
  private lastTime: number = 0;
  private cursorPulse: number = 0;

  private selectionAnchor: Pos | null = null;
  private selectionActive: Pos | null = null;
  private isMouseSelecting = false;

  private undoStack: { lines: string[]; cursorX: number; cursorY: number; selA: Pos | null; selB: Pos | null }[] = [];
  private redoStack: typeof this.undoStack = [];

  constructor(element: HTMLElement, options: BredkornSetupOptions = {}) {
    if (!element) {
      throw new ReferenceError("Bredkorn: main element does not exist");
    }

    if (!element.isConnected) {
      throw new ReferenceError(
        "Bredkorn: the element is not connected to the DOM",
      );
    }

    this.homeElement = element;

    this.options = {
      theme: "cs-dark",
      ...options,
    };

    this.validateContainerSize();
  }

  // ===============================
  //  THEME LOADING
  // ===============================

private async loadThemeRecursive(themeName: string): Promise<any> {
  const mod = await this.loadModule(themeName);
  const data = JSON.parse(mod.default());

  // Jeśli theme dziedziczy po innym — ładujemy rodzica rekurencyjnie
  if (data.inherit) {
    const parentData = await this.loadThemeRecursive(data.inherit);
    return deepMerge(structuredClone(parentData), data);
  }

  // Jeśli nie ma inherit — to jest korzeń
  return data;
}
private addedThemes = [

];
public addTheme(name: string, data: any) {
  this.addedThemes.push({ name, data});

}
private async loadTheme() {
  this._theme = await this.loadThemeRecursive(this.options.theme as string);
}

  private async loadModule(name: string) {
    switch (name) {
      case "cs-dark":
        return await import("../../themes/cs-dark");
      case "cs-light":
        return await import("../../themes/cs-light");
      case "cs-blue":
        return await import("../../themes/cs-blue");
      case "cs-green":
        return await import("../../themes/cs-green");
      case "cs-dark-plus":
        return await import("../../themes/cs-dark-plus");
              case "cs-light-plus":
        return await import("../../themes/cs-light-plus");
        case "cs-dark-white":
          return await import("../../themes/cs-dark-white");
          break;
      default:
        if (this.addedThemes.some(t => t.name === name)) {
          return {
            default: () => JSON.stringify(this.addedThemes.find(t => t.name === name)?.data)
          }
        }
        else {
        return await import("../../themes/cs-dark");
        }
    }
  }

  // ===============================
  //  INIT
  // ===============================

  private validateContainerSize() {
    const width = this.homeElement.clientWidth;
    const height = this.homeElement.clientHeight;

    if (width === 0 || height === 0) {
      console.warn("Bredkorn: container has no width or height.");
    }
  }

  private pushUndo() {
    this.undoStack.push({
      lines: cloneLines(this.lines),
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      selA: this.selectionAnchor ? { ...this.selectionAnchor } : null,
      selB: this.selectionActive ? { ...this.selectionActive } : null,
    });
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
  }

  public doUndo() {
    const state = this.undoStack.pop();
    if (!state) return;
    this.redoStack.push({
      lines: cloneLines(this.lines),
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      selA: this.selectionAnchor ? { ...this.selectionAnchor } : null,
      selB: this.selectionActive ? { ...this.selectionActive } : null,
    });
    this.lines = cloneLines(state.lines);
    this.cursorX = state.cursorX;
    this.cursorY = state.cursorY;
    this.selectionAnchor = state.selA;
    this.selectionActive = state.selB;
    this.requestRender();
  }

  public doRedo() {
    const state = this.redoStack.pop();
    if (!state) return;
    this.undoStack.push({
      lines: cloneLines(this.lines),
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      selA: this.selectionAnchor ? { ...this.selectionAnchor } : null,
      selB: this.selectionActive ? { ...this.selectionActive } : null,
    });
    this.lines = cloneLines(state.lines);
    this.cursorX = state.cursorX;
    this.cursorY = state.cursorY;
    this.selectionAnchor = state.selA;
    this.selectionActive = state.selB;
    this.requestRender();
  }

  public clearSelection() {
    this.selectionAnchor = null;
    this.selectionActive = null;
  }

  public hasSelection(): boolean {
    if (!this.selectionAnchor || !this.selectionActive) return false;
    return !isSamePos(this.selectionAnchor, this.selectionActive);
  }

  public getSelectionRange(): [Pos, Pos] | null {
    if (!this.selectionAnchor || !this.selectionActive) return null;
    const [a, b] = normalizeSelection(this.lines, this.selectionAnchor, this.selectionActive);
    if (isSamePos(a, b)) return null;
    return [a, b];
  }

  public deleteSelection() {
    const range = this.getSelectionRange();
    if (!range) return;
    this.pushUndo();
    const [a, b] = range;

    if (a.line === b.line) {
      const line = this.lines[a.line];
      this.lines[a.line] = line.slice(0, a.col) + line.slice(b.col);
    } else {
      const first = this.lines[a.line].slice(0, a.col);
      const last = this.lines[b.line].slice(b.col);
      this.lines.splice(a.line, b.line - a.line + 1, first + last);
    }

    this.cursorY = a.line;
    this.cursorX = a.col;
    this.clearSelection();
  }

  public getSelectedText(): string {
    const range = this.getSelectionRange();
    if (!range) return "";
    const [a, b] = range;
    if (a.line === b.line) {
      return this.lines[a.line].slice(a.col, b.col);
    }
    const parts: string[] = [];
    parts.push(this.lines[a.line].slice(a.col));
    for (let i = a.line + 1; i < b.line; i++) {
      parts.push(this.lines[i]);
    }
    parts.push(this.lines[b.line].slice(0, b.col));
    return parts.join("\n");
  }

  private async copySelectionToClipboard(cut: boolean) {
    const text = this.getSelectedText();
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {}
    if (cut) {
      this.deleteSelection();
      this.requestRender();
    }
  }

  public async pasteFromClipboard() {
    let text = "";
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
    } catch {
      return;
    }
    if (!text) return;
    this.pushUndo();
    if (this.hasSelection()) {
      this.deleteSelection();
    }
    const currentLine = this.lines[this.cursorY] ?? "";
    const before = currentLine.slice(0, this.cursorX);
    const after = currentLine.slice(this.cursorX);
    const parts = text.split("\n");
    if (parts.length === 1) {
      this.lines[this.cursorY] = before + parts[0] + after;
      this.cursorX = before.length + parts[0].length;
    } else {
      this.lines[this.cursorY] = before + parts[0];
      const middle = parts.slice(1, -1);
      const last = parts[parts.length - 1];
      const insertLines = [...middle, last + after];
      this.lines.splice(this.cursorY + 1, 0, ...insertLines);
      this.cursorY = this.cursorY + parts.length - 1;
      this.cursorX = last.length;
    }
    this.requestRender();
  }



  // ===============================
  //  MOUSE
  // ===============================

private screenToPos(x: number, y: number): Pos {
    const fontSize = 20;
    const margin = 10;

    // identycznie jak drawBackground()
    const lineHeight = fontSize + margin;
    const renderedLineHeight = lineHeight + 10;

    const firstLine = Math.floor(this.scrollOffsetY / lineHeight);

    const localLine = Math.floor(
        (y + (this.scrollOffsetY % lineHeight) - 20) /
        renderedLineHeight
    );

    const line = Math.max(
        0,
        Math.min(firstLine + localLine, this.lines.length - 1)
    );

    if (!this.ctx) {
        return { line, col: 0 };
    }

    const content = this.lines[line] ?? "";

    this.ctx.font = `${fontSize}px "DynamicFont"`;

    const textStartX = this.panelWidth + 10 - this.scrollOffsetX;

    let col = 0;

    for (let i = 0; i <= content.length; i++) {
        const width = this.getTextWidth(content.slice(0, i));

        if (x < textStartX + width) {
            col = Math.max(0, i - 1);
            break;
        }

        col = i;
    }

    return { line, col };
}

  


  // ===============================
  //  CURSOR RENDERING
  // ===============================

  private renderCursor(scale: number) {
    if (!this.ctx || !this.canvas) return;

    if (this.hasSelection()) return; // przy zaznaczeniu często ukrywa się kursor

    const ctx = this.ctx;
    const rect = this.homeElement.getBoundingClientRect();

    const fontSize = 20;
    const margin = 10;
    const lineHeight = fontSize + margin;

    const visibleLines = Math.floor(rect.height / lineHeight);
    const firstLine = Math.floor(this.scrollOffsetY / lineHeight);
    const lastLine = firstLine + visibleLines;

    if (this.cursorY < firstLine || this.cursorY >= lastLine) return;

    const baseY = -(this.scrollOffsetY % lineHeight) + 20;
    const lineOffset = this.cursorY - firstLine;
    const lineTop = baseY + lineOffset * (lineHeight + 10);

    const line = this.lines[this.cursorY] ?? "";
    ctx.font = `${fontSize}px "DynamicFont"`;
    const textBefore = line.slice(0, this.cursorX);
    const textWidth = this.getTextWidth(textBefore);

    const x = this.panelWidth + 10 + textWidth - this.scrollOffsetX;

    const fullH = lineHeight;
    const h = fullH * scale;
    const y = lineTop + (lineHeight - h) / 2;

    ctx.fillStyle = hexToRgbString(this._theme.colors.color);
    ctx.fillRect(x, y, 2, h);
  }

  private loop(time: number) {
    const delta = time - this.lastTime;
    this.lastTime = time;

    this.cursorPulse += delta;
    const period = 800;
    const phase = (this.cursorPulse % period) / period;
    const scale =
      phase < 0.5 ? 0.4 + 1.2 * phase : 1.0 - 1.2 * (phase - 0.5);

    this.drawBackground();
    this.renderCursor(scale);

    requestAnimationFrame((t) => this.loop(t));
  }

  public async init() {
    this.homeElement.style.overflow = "hidden";
    this.homeElement.style.position = "relative";

    await this.loadTheme();
    await initFontTTF();

    this.initCanvas();
    initKeyboard(this);
    initMouse(this);

    this.homeElement.style.borderRadius = String(
      this._theme.main.homeRounding,
    );

    if (this.lines.length === 0) {
      this.lines.push("");
    }

    this.requestRender();

    this.homeElement.addEventListener("wheel", (e) => {
      const rect = this.homeElement.getBoundingClientRect();
      const fontSize = 20;
      const margin = 10;
      const lineHeight = fontSize + margin;

      if (e.deltaX !== 0) {
        this.scrollOffsetX += e.deltaX;
        if (this.scrollOffsetX < 0) this.scrollOffsetX = 0;
        this.requestRender();
        return;
      }
      

const maxScroll = Math.max(0, this.lineLength * lineHeight - rect.height);

this.scrollOffsetY = Math.min(
  maxScroll,
  Math.max(0, this.scrollOffsetY + e.deltaY),
);

      this.requestRender();
      console.log("scroll", this.scrollOffsetY, "max", maxScroll);
    });

    window.addEventListener("resize", () => {
      this.ctx?.clearRect(
        0,
        0,
        this.canvas?.width || 0,
        this.canvas?.height || 0,
      );
      if (this.canvas && this.canvas.parentElement === this.homeElement) {
        this.homeElement.removeChild(this.canvas);
      }
      this.initCanvas();
      this.requestRender();
    });
this.addTextChangeCallback((lines) => {
  if (linesDot.length != lines.length) {
    linesDot.push({dot: false,r:0,g:0,b:0})
  }
})
    requestAnimationFrame((t) => this.loop(t));
    
  }

  private initCanvas() {
    const rect = this.homeElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    this.homeElement.appendChild(canvas);
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Bredkorn: failed to create 2D canvas context");

    ctx.scale(dpr, dpr);

    this.ctx = ctx;
    this.panelWidth = rect.width * 0.1;
  }

  // ===============================
  //  RENDERING
  // ===============================

  private getTextWidth(text: string): number {
    if (!this.ctx) return 0;
    const cached = this.textWidthCache.get(text);
    if (cached !== undefined) return cached;
    const w = this.ctx.measureText(text).width;
    this.textWidthCache.set(text, w);
    return w;
  }

  private requestRender() {
    if (this.needsRender) return;
    this.needsRender = true;
    requestAnimationFrame(() => {
      this.needsRender = false;
      this.drawBackground();
    });
  }
private scrollbarPercent = 0
  private drawBackground() {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const rect = this.homeElement.getBoundingClientRect();

    this.lineLength = this.lines.length;

    ctx.fillStyle = hexToRgbString(this._theme.main.bgColor);
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = hexToRgbString(this._theme.main.lineNumberBgColor);
    ctx.fillRect(0, 0, this.panelWidth, rect.height);

    const fontSize = 20;
    const margin = 10;
    const lineHeight = fontSize + margin;

    ctx.font = `${fontSize}px "DynamicFont"`;
    ctx.textBaseline = "middle";

    const visibleLines = Math.floor(rect.height / lineHeight);
    const firstLine = Math.floor(this.scrollOffsetY / lineHeight);
    const lastLine = Math.min(firstLine + visibleLines, this.lineLength);

    let y = -(this.scrollOffsetY % lineHeight) + 20;
    let lineCursor = y;

    const selRange = this.getSelectionRange();

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.panelWidth, 0, rect.width - this.panelWidth, rect.height);
    ctx.clip();

    for (let i = firstLine; i < lastLine; i++) {
      ctx.fillStyle = hexToRgbString(this._theme.main.lineBgColor);
      ctx.fillRect(
        this.panelWidth,
        lineCursor,
        rect.width - this.panelWidth,
        lineHeight,
      );

      ctx.restore();
      ctx.save();

      ctx.fillStyle = hexToRgbString(this._theme.main.lineNumberBgColor);
      ctx.fillRect(0, lineCursor, this.panelWidth, lineHeight);

      const numText = String(i + 1);
      const numWidth = this.getTextWidth(numText);
      const numY = lineCursor + lineHeight / 2;

      
const dotSize = Math.min(Math.max(this.panelWidth * 0.15, 8), 18);
const gap = dotSize * 0.45;

const dotX = this.panelWidth / 2 - numWidth / 2 - gap - dotSize;
const dotY = numY - dotSize / 2;
if (linesDot[i].dot) {
ctx.fillStyle = `rgb(${linesDot[i].r}, ${linesDot[i].g}, ${linesDot[i].b})`;

DrawEllipse(
    ctx,
    dotX,
    dotY,
    dotX + dotSize,
    dotY + dotSize
);
}
      ctx.fillStyle = hexToRgbString(this._theme.colors.lineNumberColor);
      ctx.fillText(numText, this.panelWidth / 2 - numWidth / 2, numY);

      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.panelWidth, 0, rect.width - this.panelWidth, rect.height);
      ctx.clip();

      const content = this.lines[i] ?? "";
      const textY = lineCursor + lineHeight / 2;

      // zaznaczenie
      if (selRange) {
        const [a, b] = selRange;
        if (i >= a.line && i <= b.line) {
          let startCol = 0;
          let endCol = content.length;
          if (i === a.line) startCol = a.col;
          if (i === b.line) endCol = b.col;
          if (endCol > startCol) {
            const before = content.slice(0, startCol);
            const selected = content.slice(startCol, endCol);
            const charWidth = this.getTextWidth("M") || 1;
            const selX =
              this.panelWidth +
              10 -
              this.scrollOffsetX +
              this.getTextWidth(before);
            const selW = this.getTextWidth(selected) || (endCol - startCol) * charWidth;
            ctx.fillStyle = hexToRgbString(this._theme.main.FocusedTextBg);
            ctx.fillRect(selX, lineCursor, selW, lineHeight);
          }
        }
      }

      ctx.fillStyle = hexToRgbString(this._theme.colors.color);
      ctx.fillText(
        content,
        this.panelWidth + 10 - this.scrollOffsetX,
        textY,
      );

      lineCursor += lineHeight + 10;
    }

    ctx.restore();
  }

  // ===============================
  //  API
  // ===============================
public addDotForLine(line, r, g,b) {
  if (!linesDot[line])
    throw new Error("Error: line do not exist")
  linesDot[line].dot = true
  linesDot[line].r = r
  linesDot[line].g = g
  linesDot[line].b = b
}
  public setCursorPosition(x: number, y: number) {
    const p = normPos(this.lines, { line: y, col: x });
    this.cursorY = p.line;
    this.cursorX = p.col;
    this.clearSelection();
    this.requestRender();
  }

  public setTheme = async (v: string) => {
    this.options.theme = v;
    await this.loadTheme();
    this.textWidthCache.clear();
    this.homeElement.style.borderRadius = String(
      this._theme.main.homeRounding,
    );
    this.requestRender();
  };
  public redraw() {
    this.drawBackground()
  }
private textChangeCallbacks: Array<(lines: string[]) => void> = []
private linesProxyInitialized = false

public addTextChangeCallback(callback: (lines: string[]) => void): void {
    this.textChangeCallbacks.push(callback)

    // Proxy ustawiamy tylko raz
    if (!this.linesProxyInitialized) {
        this.lines = new Proxy(this.lines, {
            set: (target, prop, value) => {
                target[prop] = value

                // wywołanie wszystkich callbacków
                for (const cb of this.textChangeCallbacks) {
                    cb(this.lines)
                }

                return true
            }
        })

        this.linesProxyInitialized = true
    }
}
}
console.log("Bredkorn Loaded", JSON.stringify(Bredkorn))
export default Bredkorn