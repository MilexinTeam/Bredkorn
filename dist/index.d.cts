interface BredkornSetupOptions {
    theme?: string;
}
type Pos = {
    line: number;
    col: number;
};

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
    doUndo(): void;
    doRedo(): void;
    clearSelection(): void;
    hasSelection(): boolean;
    getSelectionRange(): [Pos, Pos] | null;
    deleteSelection(): void;
    getSelectedText(): string;
    private copySelectionToClipboard;
    pasteFromClipboard(): Promise<void>;
    private screenToPos;
    private renderCursor;
    private loop;
    init(): Promise<void>;
    private initCanvas;
    private getTextWidth;
    private requestRender;
    private scrollbarPercent;
    private drawBackground;
    setCursorPosition(x: number, y: number): void;
    setTheme: (v: string) => Promise<void>;
    redraw(): void;
    private textChangeCallbacks;
    private linesProxyInitialized;
    addTextChangeCallback(callback: (lines: string[]) => void): void;
}

export { Bredkorn, Bredkorn as default };
