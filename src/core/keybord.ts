import {deepMerge, insertChar, hexToRgb, hexToRgbString, getFont, initFontTTF, cloneLines, cmpPos, normPos, normalizeSelection, isSamePos} from "./helper"
export function initKeyboard(thisP : any) {
    const textarea = document.createElement("textarea");

    Object.assign(textarea.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      opacity: "0",
      pointerEvents: "auto",
      zIndex: "200",
      background: "transparent",
      resize: "none",
      border: "none",
      outline: "none",
    });

    textarea.autocapitalize = "off";
    textarea.autocomplete = "off";
    textarea.spellcheck = false;

    thisP.homeElement.style.position = "relative";
    thisP.homeElement.appendChild(textarea);

    textarea.value = "";
    textarea.focus();

    thisP.homeElement.addEventListener("mousedown", () => textarea.focus());
    textarea.addEventListener("blur", () =>
      requestAnimationFrame(() => textarea.focus()),
    );

    textarea.addEventListener("keydown", (e) => {
      handleKeyDown(thisP, e);
    });

    thisP.textarea = textarea;
  }

export function handleKeyDown(thisP: any, e: KeyboardEvent) {
    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    e.preventDefault();

    if (thisP.lines.length === 0) {
      thisP.lines.push("");
      thisP.cursorX = 0;
      thisP.cursorY = 0;
    }

    // skróty
    if (ctrl) {
      if (key === "a" || key === "A") {
        thisP.selectionAnchor = { line: 0, col: 0 };
        const lastLine = thisP.lines.length - 1;
        thisP.selectionActive = {
          line: lastLine,
          col: (thisP.lines[lastLine] ?? "").length,
        };
        thisP.cursorY = thisP.selectionActive.line;
        thisP.cursorX = thisP.selectionActive.col;
        thisP.requestRender();
        return;
      }
      if (key === "c" || key === "C") {
        thisP.copySelectionToClipboard(false);
        return;
      }
      if (key === "x" || key === "X") {
        thisP.copySelectionToClipboard(true);
        return;
      }
      if (key === "v" || key === "V") {
        thisP.pasteFromClipboard();
        return;
      }
      if (key === "z" || key === "Z") {
        thisP.doUndo();
        return;
      }
      if (key === "y" || key === "Y") {
        thisP.doRedo();
        return;
      }
    }

    const currentLine = thisP.lines[thisP.cursorY] ?? "";

    const moveCursor = (dx: number, dy: number, extend: boolean) => {
      let newY = thisP.cursorY + dy;
      newY = Math.max(0, Math.min(newY, thisP.lines.length - 1));
      let newX = thisP.cursorX + dx;
      newX = Math.max(0, Math.min(newX, (thisP.lines[newY] ?? "").length));

      const newPos: Pos = { line: newY, col: newX };

      if (extend) {
        if (!thisP.selectionAnchor) {
          thisP.selectionAnchor = { line: thisP.cursorY, col: thisP.cursorX };
        }
        thisP.selectionActive = newPos;
      } else {
        thisP.clearSelection();
      }

      thisP.cursorY = newY;
      thisP.cursorX = newX;
      thisP.requestRender();
    };

    // strzałki
    if (key === "ArrowLeft") {
      if (thisP.cursorX > 0) {
        moveCursor(-1, 0, shift);
      } else if (thisP.cursorY > 0) {
        const prevLen = thisP.lines[thisP.cursorY - 1].length;
        thisP.cursorY -= 1;
        thisP.cursorX = prevLen;
        if (shift) {
          if (!thisP.selectionAnchor) {
            thisP.selectionAnchor = { line: thisP.cursorY + 1, col: 0 };
          }
          thisP.selectionActive = { line: thisP.cursorY, col: thisP.cursorX };
        } else {
          thisP.clearSelection();
        }
        thisP.requestRender();
      }
      return;
    }

    if (key === "ArrowRight") {
      if (thisP.cursorX < currentLine.length) {
        moveCursor(1, 0, shift);
      } else if (thisP.cursorY < thisP.lines.length - 1) {
        thisP.cursorY += 1;
        thisP.cursorX = 0;
        if (shift) {
          if (!thisP.selectionAnchor) {
            thisP.selectionAnchor = { line: thisP.cursorY - 1, col: currentLine.length };
          }
          thisP.selectionActive = { line: thisP.cursorY, col: thisP.cursorX };
        } else {
          thisP.clearSelection();
        }
        thisP.requestRender();
      }
      return;
    }

    if (key === "ArrowUp") {
      if (thisP.cursorY > 0) {
        const targetY = thisP.cursorY - 1;
        const targetLen = thisP.lines[targetY].length;
        const newX = Math.min(thisP.cursorX, targetLen);
        if (shift) {
          if (!thisP.selectionAnchor) {
            thisP.selectionAnchor = { line: thisP.cursorY, col: thisP.cursorX };
          }
          thisP.selectionActive = { line: targetY, col: newX };
        } else {
          thisP.clearSelection();
        }
        thisP.cursorY = targetY;
        thisP.cursorX = newX;
        thisP.requestRender();
      }
      return;
    }

    if (key === "ArrowDown") {
      if (thisP.cursorY < thisP.lines.length - 1) {
        const targetY = thisP.cursorY + 1;
        const targetLen = thisP.lines[targetY].length;
        const newX = Math.min(thisP.cursorX, targetLen);
        if (shift) {
          if (!thisP.selectionAnchor) {
            thisP.selectionAnchor = { line: thisP.cursorY, col: thisP.cursorX };
          }
          thisP.selectionActive = { line: targetY, col: newX };
        } else {
          thisP.clearSelection();
        }
        thisP.cursorY = targetY;
        thisP.cursorX = newX;
        thisP.requestRender();
      }
      return;
    }

    // Enter
    if (key === "Enter") {
      thisP.pushUndo();
      if (thisP.hasSelection()) {
        thisP.deleteSelection();
      }
      const line = thisP.lines[thisP.cursorY];
      const before = line.slice(0, thisP.cursorX);
      const after = line.slice(thisP.cursorX);
      thisP.lines[thisP.cursorY] = before;
      thisP.lines.splice(thisP.cursorY + 1, 0, after);
      thisP.cursorY++;
      thisP.cursorX = 0;
      thisP.clearSelection();
      thisP.requestRender();
      return;
    }

    // Backspace
    if (key === "Backspace") {
      if (thisP.hasSelection()) {
        thisP.deleteSelection();
        thisP.requestRender();
        return;
      }
      if (thisP.cursorX === 0 && thisP.cursorY === 0) return;
      thisP.pushUndo();
      if (thisP.cursorX > 0) {
        const line = thisP.lines[thisP.cursorY];
        thisP.lines[thisP.cursorY] =
          line.slice(0, thisP.cursorX - 1) + line.slice(thisP.cursorX);
        thisP.cursorX--;
      } else {
        const prevLine = thisP.lines[thisP.cursorY - 1];
        const line = thisP.lines[thisP.cursorY];
        const newX = prevLine.length;
        thisP.lines[thisP.cursorY - 1] = prevLine + line;
        thisP.lines.splice(thisP.cursorY, 1);
        thisP.cursorY--;
        thisP.cursorX = newX;
      }
      thisP.clearSelection();
      thisP.requestRender();
      return;
    }

    // Tab
    if (key === "Tab") {
      thisP.pushUndo();
      const tabStr = "  "; // np. 2 spacje
      if (thisP.hasSelection()) {
        thisP.deleteSelection();
      }
      const line = thisP.lines[thisP.cursorY];
      thisP.lines[thisP.cursorY] =
        line.slice(0, thisP.cursorX) + tabStr + line.slice(thisP.cursorX);
      thisP.cursorX += tabStr.length;
      thisP.clearSelection();
      thisP.requestRender();
      return;
    }

    // zwykły znak
    if (key.length === 1 && !ctrl) {
      thisP.pushUndo();
      if (thisP.hasSelection()) {
        thisP.deleteSelection();
      }
      const line = thisP.lines[thisP.cursorY];
      thisP.lines[thisP.cursorY] = insertChar(line, thisP.cursorX, key);
      thisP.cursorX++;
      thisP.clearSelection();
      thisP.requestRender();
      return;
    }
  }