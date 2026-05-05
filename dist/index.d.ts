interface BredkornSetupOptions {
    theme?: string;
}

declare class Bredkorn {
    private homeElement;
    private options;
    private canvas;
    private ctx;
    private _theme;
    private panelWidth;
    private scrollOffsetY;
    private scrollOffsetX;
    private lineLength;
    private textarea;
    lines: string[];
    private textWidthCache;
    private needsRender;
    cursorX: number;
    cursorY: number;
    private lastTime;
    private cursorPulse;
    private selectionAnchor;
    private selectionActive;
    private isMouseSelecting;
    private undoStack;
    private redoStack;
    constructor(element: HTMLElement, options?: BredkornSetupOptions);
    private loadThemeRecursive;
    private addedThemes;
    addTheme(name: string, data: any): void;
    private loadTheme;
    private loadModule;
    private validateContainerSize;
    private pushUndo;
    private doUndo;
    private doRedo;
    private clearSelection;
    private hasSelection;
    private getSelectionRange;
    private deleteSelection;
    private getSelectedText;
    private copySelectionToClipboard;
    private pasteFromClipboard;
    private initKeyboard;
    private handleKeyDown;
    private screenToPos;
    private initMouse;
    private renderCursor;
    private loop;
    init(): Promise<void>;
    private initCanvas;
    private getTextWidth;
    private requestRender;
    private drawBackground;
    setCursorPosition(x: number, y: number): void;
    setTheme: (v: string) => Promise<void>;
    redraw(): void;
    private textChangeCallbacks;
    private linesProxyInitialized;
    addTextChangeCallback(callback: (lines: string[]) => void): void;
}

export { Bredkorn, Bredkorn as default };
