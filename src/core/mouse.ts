export function initMouse(thisP : any) {
    thisP.homeElement.addEventListener("mousedown", (e) => {
      const rect = thisP.homeElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pos = thisP.screenToPos(x, y);
      thisP.cursorX = pos.col;
      thisP.cursorY = pos.line;

      if (e.shiftKey && thisP.selectionAnchor) {
        thisP.selectionActive = pos;
      } else {
        thisP.selectionAnchor = pos;
        thisP.selectionActive = pos;
      }

      thisP.isMouseSelecting = true;
      thisP.requestRender();
    });

    window.addEventListener("mousemove", (e) => {
      if (!thisP.isMouseSelecting) return;
      const rect = thisP.homeElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pos = thisP.screenToPos(x, y);
      thisP.cursorX = pos.col;
      thisP.cursorY = pos.line;
      thisP.selectionActive = pos;
      thisP.requestRender();
    });

    window.addEventListener("mouseup", () => {
      thisP.isMouseSelecting = false;
    });
  }