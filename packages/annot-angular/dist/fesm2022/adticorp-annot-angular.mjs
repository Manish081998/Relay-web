import * as i0 from '@angular/core';
import { signal, Injectable, EventEmitter, Output, Input, ChangeDetectionStrategy, Component, inject, ViewChild, NgModule } from '@angular/core';
import * as i1 from '@angular/common';
import { CommonModule } from '@angular/common';
import * as i2 from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AnnotationStore, CommandStack, TOOL_IDS, DEFAULT_STYLE, SelectTool, FreehandHighlightTool, FreehandTool, TextTool, CommentTool, ShapeTool, EraserTool, StyleAnnotationsCommand, RemoveAnnotationsCommand, AddAnnotationCommand, importFromJson, importFromFile, exportToJson, downloadJson, desanitiseText } from '@adticorp/annot-core';
import { CanvasRenderer } from '@adticorp/annot-renderer';

/**
 * @file annotation-engine.service.ts
 * The central Angular service that wires together the core engine,
 * renderer, and all tool instances.
 *
 * It is provided at the component level (via `providers` on
 * AnnotatorComponent) so each annotator instance gets its own engine.
 *
 * RESPONSIBILITIES
 *  - Own the AnnotationStore and CommandStack
 *  - Create and hold all Tool instances
 *  - Bridge Angular (Signals / Observables) ↔ core engine events
 *  - Expose an imperative API for Angular components
 */
class AnnotationEngineService {
    // ─── Store & Commands ────────────────────────────────────────────────────
    store = new AnnotationStore();
    commandStack = new CommandStack();
    // ─── Signals ─────────────────────────────────────────────────────────────
    activeToolId = signal(TOOL_IDS.SELECT);
    selectedIds = signal(new Set());
    activeStyle = signal({ ...DEFAULT_STYLE });
    canUndo = signal(false);
    canRedo = signal(false);
    annotations = signal([]);
    // ─── Tools ───────────────────────────────────────────────────────────────
    tools = new Map([
        [TOOL_IDS.SELECT, new SelectTool()],
        [TOOL_IDS.HIGHLIGHT, new FreehandHighlightTool()],
        [TOOL_IDS.FREEHAND, new FreehandTool()],
        [TOOL_IDS.TEXT, new TextTool()],
        [TOOL_IDS.COMMENT, new CommentTool()],
        [TOOL_IDS.RECTANGLE, new ShapeTool('rectangle')],
        [TOOL_IDS.ELLIPSE, new ShapeTool('ellipse')],
        [TOOL_IDS.ARROW, new ShapeTool('arrow')],
        [TOOL_IDS.LINE, new ShapeTool('line')],
        [TOOL_IDS.ERASER, new EraserTool()],
    ]);
    renderer = null;
    _docId = '';
    _author = 'Anonymous';
    unsubs = [];
    // ─── Initialise renderer ─────────────────────────────────────────────────
    /**
     * Call this from AnnotatorComponent.ngAfterViewInit once the
     * host container element is available.
     */
    init(container, adapter, docId, author) {
        this._docId = docId;
        this._author = author;
        if (this.renderer) {
            this.renderer.destroy();
        }
        this.renderer = new CanvasRenderer({
            container,
            store: this.store,
            adapter,
            author,
            docId,
        });
        this.renderer.onExecuteCommand = (cmd) => this.executeCommand(cmd);
        this.renderer.onSelectionChange = (ids) => {
            this.selectedIds.set(ids);
        };
        // Sync tool to renderer
        const initialTool = this.tools.get(this.activeToolId());
        this.renderer.setActiveTool(initialTool);
        // Wire text tool's edit callback so it opens the textarea in the renderer
        const textTool = this.tools.get(TOOL_IDS.TEXT);
        if (textTool) {
            textTool.onRequestTextEdit = (id) => this.renderer?.showTextEditor(id);
        }
        // Wire comment tool's edit callback so it opens the comment popup in the renderer
        const commentTool = this.tools.get(TOOL_IDS.COMMENT);
        if (commentTool) {
            commentTool.onRequestCommentEdit = (id) => this.renderer?.showCommentEditor(id);
        }
        // Subscribe to store for signals
        this.unsubs.push(this.store.on('add', () => this.syncAnnotations()), this.store.on('update', () => this.syncAnnotations()), this.store.on('remove', () => this.syncAnnotations()), this.store.on('reset', () => this.syncAnnotations()));
        // Subscribe to command stack
        this.unsubs.push(this.commandStack.on((state) => {
            this.canUndo.set(state.canUndo);
            this.canRedo.set(state.canRedo);
        }));
        // Subscribe to pointer-event commands from renderer
        // (renderer calls execute() on the engine service via callback above)
    }
    // ─── Tool management ─────────────────────────────────────────────────────
    selectTool(id) {
        this.activeToolId.set(id);
        const tool = this.tools.get(id);
        if (tool && this.renderer) {
            this.renderer.setActiveTool(tool);
        }
    }
    getTool(id) {
        return this.tools.get(id);
    }
    // ─── Style ───────────────────────────────────────────────────────────────
    setStyle(patch) {
        this.activeStyle.set({ ...this.activeStyle(), ...patch });
        this.renderer?.setActiveStyle(this.activeStyle());
    }
    applyStyleToSelected(patch) {
        const ids = [...this.selectedIds()];
        if (ids.length === 0)
            return;
        this.executeCommand(new StyleAnnotationsCommand(this.store, ids, patch));
    }
    // ─── Selection ───────────────────────────────────────────────────────────
    selectAll(pageIndex) {
        const ids = new Set(this.store.getByPage(pageIndex).map(a => a.id));
        this.selectedIds.set(ids);
        this.renderer?.setSelectedIds(ids);
    }
    clearSelection() {
        this.selectedIds.set(new Set());
        this.renderer?.setSelectedIds(new Set());
    }
    deleteSelected() {
        const ids = [...this.selectedIds()];
        if (ids.length === 0)
            return;
        this.executeCommand(new RemoveAnnotationsCommand(this.store, ids));
        this.clearSelection();
    }
    // ─── Undo / Redo ─────────────────────────────────────────────────────────
    undo() { this.commandStack.undo(); }
    redo() { this.commandStack.redo(); }
    executeCommand(cmd) {
        this.commandStack.execute(cmd);
        this.syncAnnotations();
        this.renderer?.markBaseDirty();
        this.renderer?.markSelectionDirty();
        // Auto-return to Select after placing any annotation so it can be
        // immediately dragged without the user needing to switch tools manually.
        if (cmd instanceof AddAnnotationCommand && this.activeToolId() !== TOOL_IDS.SELECT) {
            this.selectTool(TOOL_IDS.SELECT);
        }
    }
    // ─── Document I/O ────────────────────────────────────────────────────────
    /** Load annotations from a JSON string (clears current state) */
    loadFromJson(json) {
        const { document: doc, warnings } = importFromJson(json);
        this.store.loadDocument(doc.docId, doc.annotations);
        this.commandStack.clear();
        this.clearSelection();
        if (warnings.length > 0) {
            console.warn('[AnnotationEngine] Import warnings:', warnings);
        }
    }
    /** Open a file picker and import JSON annotations */
    async importAnnotations() {
        const result = await importFromFile();
        this.loadFromJson(exportToJson(result.document.docId, result.document.annotations));
    }
    /** Export all annotations to a JSON string */
    exportToJson() {
        return exportToJson(this._docId, this.store.getAll());
    }
    /** Download annotations as a JSON file */
    downloadAnnotations(filename) {
        downloadJson(this._docId, this.store.getAll(), filename);
    }
    /** Save annotations to localStorage */
    saveToLocalStorage(key) {
        const k = key ?? `annot-${this._docId}`;
        localStorage.setItem(k, this.exportToJson());
    }
    /** Load annotations from localStorage */
    loadFromLocalStorage(key) {
        const k = key ?? `annot-${this._docId}`;
        const json = localStorage.getItem(k);
        if (!json)
            return false;
        try {
            this.loadFromJson(json);
            return true;
        }
        catch {
            return false;
        }
    }
    // ─── Page management ─────────────────────────────────────────────────────
    setActivePage(pageIndex) {
        this.renderer?.setActivePage(pageIndex);
    }
    // ─── Zoom helpers ─────────────────────────────────────────────────────────
    /** Call after host zoom/pan changes so renderer redraws */
    notifyViewportChanged() {
        this.renderer?.requestRedraw();
    }
    // ─── Text editor ─────────────────────────────────────────────────────────
    showTextEditor(annotationId) {
        this.renderer?.showTextEditor(annotationId);
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    syncAnnotations() {
        this.annotations.set(this.store.getAll());
    }
    ngOnDestroy() {
        this.renderer?.destroy();
        for (const unsub of this.unsubs)
            unsub();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotationEngineService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotationEngineService });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotationEngineService, decorators: [{
            type: Injectable
        }] });

/**
 * @file keyboard-handler.service.ts
 * Global keyboard shortcuts for the annotator.
 * Provided at the AnnotatorComponent level so shortcuts are scoped
 * to when the annotator is mounted.
 *
 * SHORTCUTS
 *  Ctrl+Z        → Undo
 *  Ctrl+Y / Ctrl+Shift+Z → Redo
 *  Ctrl+A        → Select all (on active page)
 *  Ctrl+C        → Copy selected (to clipboard)
 *  Ctrl+V        → Paste from clipboard
 *  Escape        → Clear selection / cancel drawing
 *  Delete / Backspace → Delete selected
 *  Arrow keys    → Nudge selected (1 unit; +Shift = 10 units)
 *  V             → Select tool
 *  H             → Highlight tool
 *  D / P         → Draw/Pen tool
 *  T             → Text tool
 *  C             → Comment tool
 *  R             → Rectangle tool
 *  E             → Ellipse tool
 *  A             → Arrow tool
 *  L             → Line tool
 *  X             → Eraser tool
 */
const TOOL_KEY_MAP = {
    v: TOOL_IDS.SELECT,
    h: TOOL_IDS.HIGHLIGHT,
    d: TOOL_IDS.FREEHAND,
    p: TOOL_IDS.FREEHAND,
    t: TOOL_IDS.TEXT,
    c: TOOL_IDS.COMMENT,
    r: TOOL_IDS.RECTANGLE,
    e: TOOL_IDS.ELLIPSE,
    a: TOOL_IDS.ARROW,
    l: TOOL_IDS.LINE,
    x: TOOL_IDS.ERASER,
};
class KeyboardHandlerService {
    engine;
    target;
    cleanups = [];
    /**
     * Attach keyboard listeners to the given element.
     * Call from AnnotatorComponent after engine is initialised.
     */
    attach(target, engine) {
        this.engine = engine;
        this.target = target;
        // Use keydown on document so we capture arrows without needing focus
        const onKeyDown = (e) => this.handleKeyDown(e);
        document.addEventListener('keydown', onKeyDown, { capture: true });
        this.cleanups.push(() => document.removeEventListener('keydown', onKeyDown, { capture: true }));
    }
    ngOnDestroy() {
        for (const fn of this.cleanups)
            fn();
        this.cleanups.length = 0;
    }
    handleKeyDown(e) {
        // Don't intercept when user is typing in an input
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
            return;
        const ctrl = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        // ── Undo / Redo ──────────────────────────────────────────────────────
        if (ctrl && key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.engine.undo();
            return;
        }
        if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
            e.preventDefault();
            this.engine.redo();
            return;
        }
        // ── Select All ───────────────────────────────────────────────────────
        if (ctrl && key === 'a') {
            e.preventDefault();
            const pageIndex = 0; // TODO: get from adapter
            this.engine.selectAll(pageIndex);
            return;
        }
        // ── Escape ───────────────────────────────────────────────────────────
        if (key === 'escape') {
            this.engine.clearSelection();
            this.engine.selectTool(TOOL_IDS.SELECT);
            return;
        }
        // ── Delete ───────────────────────────────────────────────────────────
        if ((key === 'delete' || key === 'backspace') && !ctrl) {
            e.preventDefault();
            this.engine.deleteSelected();
            return;
        }
        // ── Tool shortcuts (no modifier) ─────────────────────────────────────
        if (!ctrl && !e.altKey && !e.shiftKey) {
            const toolId = TOOL_KEY_MAP[key];
            if (toolId) {
                e.preventDefault();
                this.engine.selectTool(toolId);
                return;
            }
        }
        // ── Arrow nudge ──────────────────────────────────────────────────────
        // Arrow key handling is delegated to SelectTool.onKeyDown via the
        // renderer's keyboard event pass-through (handled in pointer-handler).
        // No action needed here; we just let the event propagate.
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: KeyboardHandlerService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: KeyboardHandlerService });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: KeyboardHandlerService, decorators: [{
            type: Injectable
        }] });

/**
 * @file toolbar.component.ts
 * Annotation toolbar – tool buttons, colour/stroke controls, zoom display,
 * and action buttons (Save, Import, Download, Undo, Redo).
 */
const TOOLS = [
    { id: TOOL_IDS.SELECT, label: 'Select', icon: '⬡', shortcut: 'V' },
    { id: TOOL_IDS.HIGHLIGHT, label: 'Highlight', icon: '▬', shortcut: 'H' },
    { id: TOOL_IDS.FREEHAND, label: 'Draw', icon: '✏', shortcut: 'D' },
    { id: TOOL_IDS.TEXT, label: 'Text', icon: 'T', shortcut: 'T' },
    { id: TOOL_IDS.COMMENT, label: 'Comment', icon: '💬', shortcut: 'C' },
    { id: TOOL_IDS.RECTANGLE, label: 'Rectangle', icon: '▭', shortcut: 'R' },
    { id: TOOL_IDS.ELLIPSE, label: 'Ellipse', icon: '○', shortcut: 'E' },
    { id: TOOL_IDS.ARROW, label: 'Arrow', icon: '→', shortcut: 'A' },
    { id: TOOL_IDS.LINE, label: 'Line', icon: '╱', shortcut: 'L' },
    { id: TOOL_IDS.ERASER, label: 'Eraser', icon: '⌫', shortcut: 'X' },
];
const PRESET_COLOURS = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
    '#007AFF', '#5856D6', '#FF2D55', '#000000',
    '#8E8E93', '#FFFFFF',
];
class ToolbarComponent {
    activeToolId = TOOL_IDS.SELECT;
    activeStyle;
    canUndo = false;
    canRedo = false;
    hasSelection = false;
    zoomPercent = 100;
    toolSelect = new EventEmitter();
    styleChange = new EventEmitter();
    undo = new EventEmitter();
    redo = new EventEmitter();
    save = new EventEmitter();
    download = new EventEmitter();
    import = new EventEmitter();
    deleteSelected = new EventEmitter();
    togglePanel = new EventEmitter();
    tools = TOOLS;
    presetColours = PRESET_COLOURS;
    colourPickerOpen = signal(false);
    strokeWidthOptions = [1, 2, 3, 4, 6, 8, 12];
    ngOnChanges(_changes) {
        // ChangeDetectionStrategy.OnPush handles re-render
    }
    selectTool(id) {
        this.toolSelect.emit(id);
    }
    setColour(colour) {
        this.styleChange.emit({ strokeColor: colour, fillColor: this.withOpacity(colour, 0.2) });
        this.colourPickerOpen.set(false);
    }
    setHighlightColour(colour) {
        this.styleChange.emit({ fillColor: this.withOpacity(colour, 0.4), strokeColor: 'transparent' });
        this.colourPickerOpen.set(false);
    }
    setStrokeWidth(w) {
        this.styleChange.emit({ strokeWidth: w });
    }
    setOpacity(val) {
        this.styleChange.emit({ opacity: val / 100 });
    }
    toggleColourPicker() {
        this.colourPickerOpen.update(v => !v);
    }
    withOpacity(hex, alpha) {
        // Parse and convert hex to rgba
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    get opacityPercent() {
        return Math.round((this.activeStyle?.opacity ?? 1) * 100);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: ToolbarComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: ToolbarComponent, selector: "company-toolbar", inputs: { activeToolId: "activeToolId", activeStyle: "activeStyle", canUndo: "canUndo", canRedo: "canRedo", hasSelection: "hasSelection", zoomPercent: "zoomPercent" }, outputs: { toolSelect: "toolSelect", styleChange: "styleChange", undo: "undo", redo: "redo", save: "save", download: "download", import: "import", deleteSelected: "deleteSelected", togglePanel: "togglePanel" }, usesOnChanges: true, ngImport: i0, template: "<!-- toolbar.component.html -->\n<div class=\"annot-toolbar\" role=\"toolbar\" aria-label=\"Annotation tools\">\n\n  <!-- \u2500\u2500 File actions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group\">\n    <button class=\"toolbar-btn\" title=\"Import annotations (JSON)\" (click)=\"import.emit()\">\n      <span class=\"icon\">\uD83D\uDCC2</span>\n      <span class=\"label\">Open</span>\n    </button>\n    <button class=\"toolbar-btn\" title=\"Save annotations (Ctrl+S)\" (click)=\"save.emit()\">\n      <span class=\"icon\">\uD83D\uDCBE</span>\n      <span class=\"label\">Save</span>\n    </button>\n    <button class=\"toolbar-btn\" title=\"Download annotations as JSON\" (click)=\"download.emit()\">\n      <span class=\"icon\">\u2B07</span>\n      <span class=\"label\">Download</span>\n    </button>\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Undo / Redo \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group\">\n    <button\n      class=\"toolbar-btn\"\n      title=\"Undo (Ctrl+Z)\"\n      [disabled]=\"!canUndo\"\n      (click)=\"undo.emit()\">\n      <span class=\"icon\">\u21A9</span>\n    </button>\n    <button\n      class=\"toolbar-btn\"\n      title=\"Redo (Ctrl+Y)\"\n      [disabled]=\"!canRedo\"\n      (click)=\"redo.emit()\">\n      <span class=\"icon\">\u21AA</span>\n    </button>\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Tools \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group tools-group\" role=\"radiogroup\" aria-label=\"Annotation tools\">\n    <button\n      *ngFor=\"let tool of tools\"\n      class=\"toolbar-btn tool-btn\"\n      role=\"radio\"\n      [attr.aria-checked]=\"activeToolId === tool.id\"\n      [class.active]=\"activeToolId === tool.id\"\n      [title]=\"tool.label + ' (' + tool.shortcut + ')'\"\n      (click)=\"selectTool(tool.id)\">\n      <span class=\"icon\">{{ tool.icon }}</span>\n      <span class=\"label\">{{ tool.label }}</span>\n    </button>\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Colour & Style \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group style-group\">\n\n    <!-- Colour swatch / picker trigger -->\n    <div class=\"colour-picker-wrapper\">\n      <button\n        class=\"toolbar-btn colour-btn\"\n        title=\"Stroke colour\"\n        (click)=\"toggleColourPicker()\">\n        <span\n          class=\"colour-swatch\"\n          [style.background]=\"activeStyle?.strokeColor\">\n        </span>\n        <span class=\"label\">Colour</span>\n      </button>\n\n      <!-- Colour dropdown -->\n      <div class=\"colour-picker-dropdown\" *ngIf=\"colourPickerOpen()\">\n        <div class=\"colour-grid\">\n          <button\n            *ngFor=\"let c of presetColours\"\n            class=\"colour-option\"\n            [style.background]=\"c\"\n            [title]=\"c\"\n            (click)=\"setColour(c)\">\n          </button>\n        </div>\n        <label class=\"custom-colour-label\">\n          Custom\n          <input\n            type=\"color\"\n            [value]=\"activeStyle?.strokeColor\"\n            (change)=\"setColour($any($event.target).value)\">\n        </label>\n      </div>\n    </div>\n\n    <!-- Stroke width -->\n    <div class=\"stroke-width-group\">\n      <label class=\"toolbar-label\">Width</label>\n      <select\n        class=\"toolbar-select\"\n        [value]=\"activeStyle?.strokeWidth\"\n        (change)=\"setStrokeWidth(+$any($event.target).value)\">\n        <option *ngFor=\"let w of strokeWidthOptions\" [value]=\"w\">{{ w }}px</option>\n      </select>\n    </div>\n\n    <!-- Opacity -->\n    <div class=\"opacity-group\">\n      <label class=\"toolbar-label\">Opacity</label>\n      <input\n        type=\"range\"\n        class=\"opacity-slider\"\n        min=\"10\" max=\"100\" step=\"5\"\n        [value]=\"opacityPercent\"\n        (input)=\"setOpacity(+$any($event.target).value)\"\n        title=\"Opacity\">\n      <span class=\"opacity-value\">{{ opacityPercent }}%</span>\n    </div>\n\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Selection actions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group\">\n    <button\n      class=\"toolbar-btn danger-btn\"\n      title=\"Delete selected (Del)\"\n      [disabled]=\"!hasSelection\"\n      (click)=\"deleteSelected.emit()\">\n      <span class=\"icon\">\uD83D\uDDD1</span>\n      <span class=\"label\">Delete</span>\n    </button>\n  </div>\n\n  <!-- \u2500\u2500 Spacer + Panel toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-spacer\"></div>\n\n  <div class=\"toolbar-group\">\n    <button class=\"toolbar-btn\" title=\"Toggle annotations panel\" (click)=\"togglePanel.emit()\">\n      <span class=\"icon\">\u2630</span>\n      <span class=\"label\">Annotations</span>\n    </button>\n  </div>\n\n</div>\n", styles: [":host{display:block;flex-shrink:0}.annot-toolbar{display:flex;flex-direction:row;align-items:center;gap:2px;padding:4px 8px;background:#f8f8f8;border-bottom:1px solid #d1d1d6;min-height:44px;flex-wrap:wrap;-webkit-user-select:none;user-select:none}.toolbar-group{display:flex;flex-direction:row;align-items:center;gap:2px;flex-wrap:nowrap}.tools-group{gap:1px}.style-group{gap:8px}.toolbar-separator{width:1px;height:28px;background:#d1d1d6;margin:0 4px}.toolbar-spacer{flex:1}.toolbar-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 8px;min-width:36px;min-height:36px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:#1c1c1e;transition:background .1s,border-color .1s}.toolbar-btn .icon{font-size:16px;line-height:1;display:block}.toolbar-btn .label{display:block;font-size:10px;line-height:1;white-space:nowrap}.toolbar-btn:hover{background:#e5e5ea;border-color:#c7c7cc}.toolbar-btn:active{background:#d1d1d6}.toolbar-btn.active{background:#007aff;border-color:#007aff;color:#fff}.toolbar-btn:disabled{opacity:.4;cursor:not-allowed}.toolbar-btn.danger-btn:not(:disabled):hover{background:#ff3b30;border-color:#ff3b30;color:#fff}.colour-picker-wrapper{position:relative}.colour-btn{min-width:54px}.colour-swatch{display:block;width:20px;height:20px;border-radius:4px;border:1px solid rgba(0,0,0,.2)}.colour-picker-dropdown{position:absolute;top:100%;left:0;z-index:100;background:#fff;border:1px solid #d1d1d6;border-radius:8px;box-shadow:0 4px 16px #00000026;padding:8px;min-width:160px}.colour-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:8px}.colour-option{width:24px;height:24px;border-radius:4px;border:1px solid rgba(0,0,0,.15);cursor:pointer;transition:transform .1s}.colour-option:hover{transform:scale(1.15);border-color:#007aff}.custom-colour-label{display:flex;align-items:center;gap:6px;font-size:11px;color:#636366;cursor:pointer}.custom-colour-label input[type=color]{width:24px;height:24px;border:none;border-radius:4px;padding:0;cursor:pointer}.toolbar-label{font-size:10px;color:#636366;white-space:nowrap}.toolbar-select{font-size:12px;padding:2px 4px;border:1px solid #c7c7cc;border-radius:4px;background:#fff;cursor:pointer;height:28px}.opacity-group{display:flex;align-items:center;gap:4px}.opacity-slider{width:80px;height:4px;cursor:pointer;accent-color:#007aff}.opacity-value{font-size:11px;color:#636366;min-width:32px}\n"], dependencies: [{ kind: "directive", type: i1.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i2.NgSelectOption, selector: "option", inputs: ["ngValue", "value"] }, { kind: "directive", type: i2.ɵNgSelectMultipleOption, selector: "option", inputs: ["ngValue", "value"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: ToolbarComponent, decorators: [{
            type: Component,
            args: [{ selector: 'company-toolbar', changeDetection: ChangeDetectionStrategy.OnPush, template: "<!-- toolbar.component.html -->\n<div class=\"annot-toolbar\" role=\"toolbar\" aria-label=\"Annotation tools\">\n\n  <!-- \u2500\u2500 File actions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group\">\n    <button class=\"toolbar-btn\" title=\"Import annotations (JSON)\" (click)=\"import.emit()\">\n      <span class=\"icon\">\uD83D\uDCC2</span>\n      <span class=\"label\">Open</span>\n    </button>\n    <button class=\"toolbar-btn\" title=\"Save annotations (Ctrl+S)\" (click)=\"save.emit()\">\n      <span class=\"icon\">\uD83D\uDCBE</span>\n      <span class=\"label\">Save</span>\n    </button>\n    <button class=\"toolbar-btn\" title=\"Download annotations as JSON\" (click)=\"download.emit()\">\n      <span class=\"icon\">\u2B07</span>\n      <span class=\"label\">Download</span>\n    </button>\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Undo / Redo \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group\">\n    <button\n      class=\"toolbar-btn\"\n      title=\"Undo (Ctrl+Z)\"\n      [disabled]=\"!canUndo\"\n      (click)=\"undo.emit()\">\n      <span class=\"icon\">\u21A9</span>\n    </button>\n    <button\n      class=\"toolbar-btn\"\n      title=\"Redo (Ctrl+Y)\"\n      [disabled]=\"!canRedo\"\n      (click)=\"redo.emit()\">\n      <span class=\"icon\">\u21AA</span>\n    </button>\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Tools \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group tools-group\" role=\"radiogroup\" aria-label=\"Annotation tools\">\n    <button\n      *ngFor=\"let tool of tools\"\n      class=\"toolbar-btn tool-btn\"\n      role=\"radio\"\n      [attr.aria-checked]=\"activeToolId === tool.id\"\n      [class.active]=\"activeToolId === tool.id\"\n      [title]=\"tool.label + ' (' + tool.shortcut + ')'\"\n      (click)=\"selectTool(tool.id)\">\n      <span class=\"icon\">{{ tool.icon }}</span>\n      <span class=\"label\">{{ tool.label }}</span>\n    </button>\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Colour & Style \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group style-group\">\n\n    <!-- Colour swatch / picker trigger -->\n    <div class=\"colour-picker-wrapper\">\n      <button\n        class=\"toolbar-btn colour-btn\"\n        title=\"Stroke colour\"\n        (click)=\"toggleColourPicker()\">\n        <span\n          class=\"colour-swatch\"\n          [style.background]=\"activeStyle?.strokeColor\">\n        </span>\n        <span class=\"label\">Colour</span>\n      </button>\n\n      <!-- Colour dropdown -->\n      <div class=\"colour-picker-dropdown\" *ngIf=\"colourPickerOpen()\">\n        <div class=\"colour-grid\">\n          <button\n            *ngFor=\"let c of presetColours\"\n            class=\"colour-option\"\n            [style.background]=\"c\"\n            [title]=\"c\"\n            (click)=\"setColour(c)\">\n          </button>\n        </div>\n        <label class=\"custom-colour-label\">\n          Custom\n          <input\n            type=\"color\"\n            [value]=\"activeStyle?.strokeColor\"\n            (change)=\"setColour($any($event.target).value)\">\n        </label>\n      </div>\n    </div>\n\n    <!-- Stroke width -->\n    <div class=\"stroke-width-group\">\n      <label class=\"toolbar-label\">Width</label>\n      <select\n        class=\"toolbar-select\"\n        [value]=\"activeStyle?.strokeWidth\"\n        (change)=\"setStrokeWidth(+$any($event.target).value)\">\n        <option *ngFor=\"let w of strokeWidthOptions\" [value]=\"w\">{{ w }}px</option>\n      </select>\n    </div>\n\n    <!-- Opacity -->\n    <div class=\"opacity-group\">\n      <label class=\"toolbar-label\">Opacity</label>\n      <input\n        type=\"range\"\n        class=\"opacity-slider\"\n        min=\"10\" max=\"100\" step=\"5\"\n        [value]=\"opacityPercent\"\n        (input)=\"setOpacity(+$any($event.target).value)\"\n        title=\"Opacity\">\n      <span class=\"opacity-value\">{{ opacityPercent }}%</span>\n    </div>\n\n  </div>\n\n  <div class=\"toolbar-separator\"></div>\n\n  <!-- \u2500\u2500 Selection actions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-group\">\n    <button\n      class=\"toolbar-btn danger-btn\"\n      title=\"Delete selected (Del)\"\n      [disabled]=\"!hasSelection\"\n      (click)=\"deleteSelected.emit()\">\n      <span class=\"icon\">\uD83D\uDDD1</span>\n      <span class=\"label\">Delete</span>\n    </button>\n  </div>\n\n  <!-- \u2500\u2500 Spacer + Panel toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"toolbar-spacer\"></div>\n\n  <div class=\"toolbar-group\">\n    <button class=\"toolbar-btn\" title=\"Toggle annotations panel\" (click)=\"togglePanel.emit()\">\n      <span class=\"icon\">\u2630</span>\n      <span class=\"label\">Annotations</span>\n    </button>\n  </div>\n\n</div>\n", styles: [":host{display:block;flex-shrink:0}.annot-toolbar{display:flex;flex-direction:row;align-items:center;gap:2px;padding:4px 8px;background:#f8f8f8;border-bottom:1px solid #d1d1d6;min-height:44px;flex-wrap:wrap;-webkit-user-select:none;user-select:none}.toolbar-group{display:flex;flex-direction:row;align-items:center;gap:2px;flex-wrap:nowrap}.tools-group{gap:1px}.style-group{gap:8px}.toolbar-separator{width:1px;height:28px;background:#d1d1d6;margin:0 4px}.toolbar-spacer{flex:1}.toolbar-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 8px;min-width:36px;min-height:36px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:#1c1c1e;transition:background .1s,border-color .1s}.toolbar-btn .icon{font-size:16px;line-height:1;display:block}.toolbar-btn .label{display:block;font-size:10px;line-height:1;white-space:nowrap}.toolbar-btn:hover{background:#e5e5ea;border-color:#c7c7cc}.toolbar-btn:active{background:#d1d1d6}.toolbar-btn.active{background:#007aff;border-color:#007aff;color:#fff}.toolbar-btn:disabled{opacity:.4;cursor:not-allowed}.toolbar-btn.danger-btn:not(:disabled):hover{background:#ff3b30;border-color:#ff3b30;color:#fff}.colour-picker-wrapper{position:relative}.colour-btn{min-width:54px}.colour-swatch{display:block;width:20px;height:20px;border-radius:4px;border:1px solid rgba(0,0,0,.2)}.colour-picker-dropdown{position:absolute;top:100%;left:0;z-index:100;background:#fff;border:1px solid #d1d1d6;border-radius:8px;box-shadow:0 4px 16px #00000026;padding:8px;min-width:160px}.colour-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:8px}.colour-option{width:24px;height:24px;border-radius:4px;border:1px solid rgba(0,0,0,.15);cursor:pointer;transition:transform .1s}.colour-option:hover{transform:scale(1.15);border-color:#007aff}.custom-colour-label{display:flex;align-items:center;gap:6px;font-size:11px;color:#636366;cursor:pointer}.custom-colour-label input[type=color]{width:24px;height:24px;border:none;border-radius:4px;padding:0;cursor:pointer}.toolbar-label{font-size:10px;color:#636366;white-space:nowrap}.toolbar-select{font-size:12px;padding:2px 4px;border:1px solid #c7c7cc;border-radius:4px;background:#fff;cursor:pointer;height:28px}.opacity-group{display:flex;align-items:center;gap:4px}.opacity-slider{width:80px;height:4px;cursor:pointer;accent-color:#007aff}.opacity-value{font-size:11px;color:#636366;min-width:32px}\n"] }]
        }], propDecorators: { activeToolId: [{
                type: Input
            }], activeStyle: [{
                type: Input
            }], canUndo: [{
                type: Input
            }], canRedo: [{
                type: Input
            }], hasSelection: [{
                type: Input
            }], zoomPercent: [{
                type: Input
            }], toolSelect: [{
                type: Output
            }], styleChange: [{
                type: Output
            }], undo: [{
                type: Output
            }], redo: [{
                type: Output
            }], save: [{
                type: Output
            }], download: [{
                type: Output
            }], import: [{
                type: Output
            }], deleteSelected: [{
                type: Output
            }], togglePanel: [{
                type: Output
            }] } });

/**
 * @file annotation-panel.component.ts
 * Sidebar that lists all annotations, shows comment text, and lets
 * users jump to an annotation or delete it.
 */
class AnnotationPanelComponent {
    annotations = [];
    selectedIds = new Set();
    annotationClick = new EventEmitter();
    annotationDelete = new EventEmitter();
    filterText = signal('');
    get filteredAnnotations() {
        const q = this.filterText().toLowerCase().trim();
        if (!q)
            return this.annotations;
        return this.annotations.filter(a => a.type.includes(q) ||
            a.author.toLowerCase().includes(q) ||
            (a.meta.text ?? '').toLowerCase().includes(q) ||
            (a.meta.tags ?? []).some(t => t.toLowerCase().includes(q)));
    }
    isSelected(a) {
        return this.selectedIds.has(a.id);
    }
    getDisplayText(a) {
        const raw = a.meta.text ?? '';
        if (!raw)
            return '';
        return desanitiseText(raw).slice(0, 80);
    }
    getTypeIcon(type) {
        const icons = {
            highlight: '▬', freehand: '✏', text: 'T', comment: '💬',
            rectangle: '▭', ellipse: '○', arrow: '→', line: '╱',
        };
        return icons[type] ?? '●';
    }
    formatDate(iso) {
        try {
            return new Date(iso).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            });
        }
        catch {
            return iso;
        }
    }
    trackById(_, a) { return a.id; }
    onFilter(val) { this.filterText.set(val); }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotationPanelComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: AnnotationPanelComponent, selector: "company-annotation-panel", inputs: { annotations: "annotations", selectedIds: "selectedIds" }, outputs: { annotationClick: "annotationClick", annotationDelete: "annotationDelete" }, ngImport: i0, template: "<!-- annotation-panel.component.html -->\n<div class=\"panel\">\n\n  <!-- Header -->\n  <div class=\"panel-header\">\n    <h3 class=\"panel-title\">Annotations</h3>\n    <span class=\"panel-count\">{{ filteredAnnotations.length }}</span>\n  </div>\n\n  <!-- Search -->\n  <div class=\"panel-search\">\n    <input\n      class=\"search-input\"\n      type=\"search\"\n      placeholder=\"Filter annotations\u2026\"\n      [value]=\"filterText()\"\n      (input)=\"onFilter($any($event.target).value)\"\n      aria-label=\"Filter annotations\">\n  </div>\n\n  <!-- List -->\n  <div class=\"panel-list\" role=\"list\">\n\n    <ng-container *ngIf=\"filteredAnnotations.length > 0; else emptyState\">\n      <div\n        *ngFor=\"let a of filteredAnnotations; trackBy: trackById\"\n        class=\"panel-item\"\n        role=\"listitem\"\n        [class.panel-item--selected]=\"isSelected(a)\"\n        (click)=\"annotationClick.emit(a.id)\"\n        tabindex=\"0\"\n        (keydown.enter)=\"annotationClick.emit(a.id)\"\n        [attr.aria-label]=\"a.type + ' annotation by ' + a.author\">\n\n        <!-- Type icon + colour strip -->\n        <div class=\"item-icon\" [style.background]=\"a.style.strokeColor\">\n          {{ getTypeIcon(a.type) }}\n        </div>\n\n        <!-- Content -->\n        <div class=\"item-body\">\n          <div class=\"item-header\">\n            <span class=\"item-type\">{{ a.type | titlecase }}</span>\n            <span class=\"item-page\">p.{{ a.pageIndex + 1 }}</span>\n          </div>\n          <div class=\"item-author\">{{ a.author }}</div>\n          <div class=\"item-text\" *ngIf=\"getDisplayText(a)\">\n            {{ getDisplayText(a) }}\n          </div>\n          <div class=\"item-date\">{{ formatDate(a.updatedAt) }}</div>\n\n          <!-- Tags -->\n          <div class=\"item-tags\" *ngIf=\"a.meta.tags?.length\">\n            <span class=\"tag\" *ngFor=\"let tag of a.meta.tags\">{{ tag }}</span>\n          </div>\n\n          <!-- Status -->\n          <span\n            class=\"status-badge\"\n            *ngIf=\"a.meta.status\"\n            [class.status-resolved]=\"a.meta.status === 'resolved'\"\n            [class.status-wontfix]=\"a.meta.status === 'wontfix'\">\n            {{ a.meta.status }}\n          </span>\n        </div>\n\n        <!-- Delete button -->\n        <button\n          class=\"item-delete\"\n          title=\"Delete annotation\"\n          (click)=\"$event.stopPropagation(); annotationDelete.emit(a.id)\">\n          \u00D7\n        </button>\n\n      </div>\n    </ng-container>\n\n    <ng-template #emptyState>\n      <div class=\"empty-state\">\n        <p>No annotations yet.</p>\n        <p class=\"hint\">Select a drawing tool from the toolbar to start annotating.</p>\n      </div>\n    </ng-template>\n\n  </div>\n</div>\n", styles: [":host{display:flex;flex-direction:column;height:100%;overflow:hidden;background:#fff}.panel{display:flex;flex-direction:column;height:100%}.panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;border-bottom:1px solid #f2f2f7;flex-shrink:0}.panel-title{font-size:13px;font-weight:600;margin:0;color:#1c1c1e}.panel-count{font-size:11px;background:#e5e5ea;color:#636366;border-radius:10px;padding:1px 8px;font-weight:500}.panel-search{padding:8px 12px;flex-shrink:0;border-bottom:1px solid #f2f2f7}.search-input{width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #d1d1d6;border-radius:8px;font-size:12px;outline:none;background:#f2f2f7}.search-input:focus{border-color:#007aff;background:#fff}.panel-list{flex:1;overflow-y:auto;padding:4px 0}.panel-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;cursor:pointer;position:relative;border-bottom:1px solid #f2f2f7;transition:background .1s}.panel-item:hover{background:#f2f2f7}.panel-item:hover .item-delete{opacity:1}.panel-item:focus-visible{outline:2px solid #007aff;outline-offset:-2px}.panel-item--selected{background:#e8f0fe}.panel-item--selected:hover{background:#d4e3fd}.item-icon{flex-shrink:0;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;margin-top:1px}.item-body{flex:1;min-width:0}.item-header{display:flex;justify-content:space-between;align-items:baseline;gap:4px;margin-bottom:2px}.item-type{font-size:12px;font-weight:600;color:#1c1c1e}.item-page{font-size:10px;color:#8e8e93}.item-author{font-size:11px;color:#8e8e93;margin-bottom:2px}.item-text{font-size:12px;color:#3a3a3c;word-break:break-word;line-height:1.4;margin-bottom:3px}.item-date{font-size:10px;color:#aeaeb2}.item-tags{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}.tag{font-size:10px;background:#e5e5ea;color:#636366;border-radius:4px;padding:1px 5px}.status-badge{display:inline-block;font-size:10px;border-radius:4px;padding:1px 6px;background:#007aff;color:#fff;margin-top:3px}.status-badge.status-resolved{background:#34c759}.status-badge.status-wontfix{background:#8e8e93}.item-delete{flex-shrink:0;opacity:0;background:none;border:none;cursor:pointer;font-size:16px;color:#8e8e93;width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;padding:0;margin-top:2px;transition:opacity .1s,color .1s}.item-delete:hover{color:#ff3b30;background:#fff}.empty-state{padding:32px 16px;text-align:center;color:#8e8e93}.empty-state p{margin:4px 0;font-size:13px}.empty-state .hint{font-size:11px;line-height:1.5}\n"], dependencies: [{ kind: "directive", type: i1.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "pipe", type: i1.TitleCasePipe, name: "titlecase" }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotationPanelComponent, decorators: [{
            type: Component,
            args: [{ selector: 'company-annotation-panel', changeDetection: ChangeDetectionStrategy.OnPush, template: "<!-- annotation-panel.component.html -->\n<div class=\"panel\">\n\n  <!-- Header -->\n  <div class=\"panel-header\">\n    <h3 class=\"panel-title\">Annotations</h3>\n    <span class=\"panel-count\">{{ filteredAnnotations.length }}</span>\n  </div>\n\n  <!-- Search -->\n  <div class=\"panel-search\">\n    <input\n      class=\"search-input\"\n      type=\"search\"\n      placeholder=\"Filter annotations\u2026\"\n      [value]=\"filterText()\"\n      (input)=\"onFilter($any($event.target).value)\"\n      aria-label=\"Filter annotations\">\n  </div>\n\n  <!-- List -->\n  <div class=\"panel-list\" role=\"list\">\n\n    <ng-container *ngIf=\"filteredAnnotations.length > 0; else emptyState\">\n      <div\n        *ngFor=\"let a of filteredAnnotations; trackBy: trackById\"\n        class=\"panel-item\"\n        role=\"listitem\"\n        [class.panel-item--selected]=\"isSelected(a)\"\n        (click)=\"annotationClick.emit(a.id)\"\n        tabindex=\"0\"\n        (keydown.enter)=\"annotationClick.emit(a.id)\"\n        [attr.aria-label]=\"a.type + ' annotation by ' + a.author\">\n\n        <!-- Type icon + colour strip -->\n        <div class=\"item-icon\" [style.background]=\"a.style.strokeColor\">\n          {{ getTypeIcon(a.type) }}\n        </div>\n\n        <!-- Content -->\n        <div class=\"item-body\">\n          <div class=\"item-header\">\n            <span class=\"item-type\">{{ a.type | titlecase }}</span>\n            <span class=\"item-page\">p.{{ a.pageIndex + 1 }}</span>\n          </div>\n          <div class=\"item-author\">{{ a.author }}</div>\n          <div class=\"item-text\" *ngIf=\"getDisplayText(a)\">\n            {{ getDisplayText(a) }}\n          </div>\n          <div class=\"item-date\">{{ formatDate(a.updatedAt) }}</div>\n\n          <!-- Tags -->\n          <div class=\"item-tags\" *ngIf=\"a.meta.tags?.length\">\n            <span class=\"tag\" *ngFor=\"let tag of a.meta.tags\">{{ tag }}</span>\n          </div>\n\n          <!-- Status -->\n          <span\n            class=\"status-badge\"\n            *ngIf=\"a.meta.status\"\n            [class.status-resolved]=\"a.meta.status === 'resolved'\"\n            [class.status-wontfix]=\"a.meta.status === 'wontfix'\">\n            {{ a.meta.status }}\n          </span>\n        </div>\n\n        <!-- Delete button -->\n        <button\n          class=\"item-delete\"\n          title=\"Delete annotation\"\n          (click)=\"$event.stopPropagation(); annotationDelete.emit(a.id)\">\n          \u00D7\n        </button>\n\n      </div>\n    </ng-container>\n\n    <ng-template #emptyState>\n      <div class=\"empty-state\">\n        <p>No annotations yet.</p>\n        <p class=\"hint\">Select a drawing tool from the toolbar to start annotating.</p>\n      </div>\n    </ng-template>\n\n  </div>\n</div>\n", styles: [":host{display:flex;flex-direction:column;height:100%;overflow:hidden;background:#fff}.panel{display:flex;flex-direction:column;height:100%}.panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;border-bottom:1px solid #f2f2f7;flex-shrink:0}.panel-title{font-size:13px;font-weight:600;margin:0;color:#1c1c1e}.panel-count{font-size:11px;background:#e5e5ea;color:#636366;border-radius:10px;padding:1px 8px;font-weight:500}.panel-search{padding:8px 12px;flex-shrink:0;border-bottom:1px solid #f2f2f7}.search-input{width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #d1d1d6;border-radius:8px;font-size:12px;outline:none;background:#f2f2f7}.search-input:focus{border-color:#007aff;background:#fff}.panel-list{flex:1;overflow-y:auto;padding:4px 0}.panel-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;cursor:pointer;position:relative;border-bottom:1px solid #f2f2f7;transition:background .1s}.panel-item:hover{background:#f2f2f7}.panel-item:hover .item-delete{opacity:1}.panel-item:focus-visible{outline:2px solid #007aff;outline-offset:-2px}.panel-item--selected{background:#e8f0fe}.panel-item--selected:hover{background:#d4e3fd}.item-icon{flex-shrink:0;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;margin-top:1px}.item-body{flex:1;min-width:0}.item-header{display:flex;justify-content:space-between;align-items:baseline;gap:4px;margin-bottom:2px}.item-type{font-size:12px;font-weight:600;color:#1c1c1e}.item-page{font-size:10px;color:#8e8e93}.item-author{font-size:11px;color:#8e8e93;margin-bottom:2px}.item-text{font-size:12px;color:#3a3a3c;word-break:break-word;line-height:1.4;margin-bottom:3px}.item-date{font-size:10px;color:#aeaeb2}.item-tags{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}.tag{font-size:10px;background:#e5e5ea;color:#636366;border-radius:4px;padding:1px 5px}.status-badge{display:inline-block;font-size:10px;border-radius:4px;padding:1px 6px;background:#007aff;color:#fff;margin-top:3px}.status-badge.status-resolved{background:#34c759}.status-badge.status-wontfix{background:#8e8e93}.item-delete{flex-shrink:0;opacity:0;background:none;border:none;cursor:pointer;font-size:16px;color:#8e8e93;width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;padding:0;margin-top:2px;transition:opacity .1s,color .1s}.item-delete:hover{color:#ff3b30;background:#fff}.empty-state{padding:32px 16px;text-align:center;color:#8e8e93}.empty-state p{margin:4px 0;font-size:13px}.empty-state .hint{font-size:11px;line-height:1.5}\n"] }]
        }], propDecorators: { annotations: [{
                type: Input
            }], selectedIds: [{
                type: Input
            }], annotationClick: [{
                type: Output
            }], annotationDelete: [{
                type: Output
            }] } });

/**
 * @file annotator.component.ts
 * Root host component for the annotation overlay.
 *
 * Usage:
 *   <company-annotator
 *     [adapter]="myAdapter"
 *     [docId]="documentId"
 *     [author]="currentUser"
 *     (annotationsChange)="onAnnotationsChange($event)">
 *   </company-annotator>
 *
 * The component is position:relative and fills its parent.
 * The host app should give it a defined size (width/height or flex).
 */
class AnnotatorComponent {
    // ─── Inputs ──────────────────────────────────────────────────────────────
    /** Adapter that provides coordinate conversion and viewport info */
    adapter;
    /** Document identifier (used for storage keys and export filenames) */
    docId = 'doc-1';
    /** Author name stamped on new annotations */
    author = 'Anonymous';
    /** Initial annotations to load (e.g. from server) */
    set initialAnnotations(value) {
        if (value?.length && this.engineReady) {
            this.engine.store.loadDocument(this.docId, value);
        }
        this._pendingAnnotations = value ?? null;
    }
    /** Whether the toolbar is visible */
    showToolbar = true;
    /** Whether the annotation panel sidebar is visible */
    showPanel = true;
    /** Whether to auto-save to localStorage */
    autoSave = false;
    /** Make the annotation host background transparent (for overlay-on-content use cases) */
    transparent = false;
    // ─── Outputs ─────────────────────────────────────────────────────────────
    /** Emits whenever any annotation is added / updated / removed */
    annotationsChange = new EventEmitter();
    /** Emits the JSON string when user clicks Save */
    save = new EventEmitter();
    // ─── View refs ───────────────────────────────────────────────────────────
    overlayContainerRef;
    // ─── Services ─────────────────────────────────────────────────────────────
    engine = inject(AnnotationEngineService);
    keyboard = inject(KeyboardHandlerService);
    // ─── State ───────────────────────────────────────────────────────────────
    TOOL_IDS = TOOL_IDS;
    engineReady = false;
    _pendingAnnotations = null;
    panelOpen = signal(true);
    // ─── Lifecycle ───────────────────────────────────────────────────────────
    ngAfterViewInit() {
        const container = this.overlayContainerRef.nativeElement;
        this.engine.init(container, this.adapter, this.docId, this.author);
        this.keyboard.attach(container, this.engine);
        this.engineReady = true;
        // Load any annotations that arrived before init
        if (this._pendingAnnotations?.length) {
            this.engine.store.loadDocument(this.docId, this._pendingAnnotations);
            this._pendingAnnotations = null;
        }
        // Load from localStorage if autoSave enabled
        if (this.autoSave) {
            this.engine.loadFromLocalStorage();
        }
        // Wire annotation change output
        this.engine.store.on('add', () => this.emitAnnotations());
        this.engine.store.on('update', () => this.emitAnnotations());
        this.engine.store.on('remove', () => this.emitAnnotations());
        this.engine.store.on('reset', () => this.emitAnnotations());
    }
    ngOnChanges(changes) {
        if (!this.engineReady)
            return;
        if (changes['docId'] || changes['author']) {
            // Re-init required – handled by parent replacing adapter
        }
        if (changes['adapter'] && this.engineReady) {
            this.engine.notifyViewportChanged();
        }
    }
    ngOnDestroy() {
        if (this.autoSave) {
            this.engine.saveToLocalStorage();
        }
    }
    // ─── Toolbar handlers ─────────────────────────────────────────────────────
    onToolSelect(toolId) {
        this.engine.selectTool(toolId);
    }
    onStyleChange(patch) {
        this.engine.setStyle(patch);
    }
    onUndo() { this.engine.undo(); }
    onRedo() { this.engine.redo(); }
    onSave() {
        const json = this.engine.exportToJson();
        if (this.autoSave)
            this.engine.saveToLocalStorage();
        this.save.emit(json);
    }
    onDownload() { this.engine.downloadAnnotations(); }
    async onImport() {
        await this.engine.importAnnotations();
    }
    onDeleteSelected() { this.engine.deleteSelected(); }
    togglePanel() { this.panelOpen.update(v => !v); }
    onAnnotationClick(annotationId) {
        this.engine.selectedIds.set(new Set([annotationId]));
        this.engine.renderer?.setSelectedIds(new Set([annotationId]));
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    emitAnnotations() {
        this.annotationsChange.emit(this.engine.store.getAll());
        if (this.autoSave)
            this.engine.saveToLocalStorage();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotatorComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: AnnotatorComponent, selector: "company-annotator", inputs: { adapter: "adapter", docId: "docId", author: "author", initialAnnotations: "initialAnnotations", showToolbar: "showToolbar", showPanel: "showPanel", autoSave: "autoSave", transparent: "transparent" }, outputs: { annotationsChange: "annotationsChange", save: "save" }, providers: [
            AnnotationEngineService,
            KeyboardHandlerService,
        ], viewQueries: [{ propertyName: "overlayContainerRef", first: true, predicate: ["overlayContainer"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<!-- annotator.component.html -->\n<div class=\"annot-host\"\n     [class.annot-host--panel-open]=\"showPanel && panelOpen()\"\n     [class.annot-host--transparent]=\"transparent\">\n\n  <!-- \u2500\u2500 Main canvas area \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"annot-main\">\n\n    <!-- Toolbar -->\n    <company-toolbar\n      *ngIf=\"showToolbar\"\n      [activeToolId]=\"engine.activeToolId()\"\n      [activeStyle]=\"engine.activeStyle()\"\n      [canUndo]=\"engine.canUndo()\"\n      [canRedo]=\"engine.canRedo()\"\n      [hasSelection]=\"engine.selectedIds().size > 0\"\n      (toolSelect)=\"onToolSelect($event)\"\n      (styleChange)=\"onStyleChange($event)\"\n      (undo)=\"onUndo()\"\n      (redo)=\"onRedo()\"\n      (save)=\"onSave()\"\n      (download)=\"onDownload()\"\n      (import)=\"onImport()\"\n      (deleteSelected)=\"onDeleteSelected()\"\n      (togglePanel)=\"togglePanel()\">\n    </company-toolbar>\n\n    <!-- Overlay container \u2013 canvases are appended here by the renderer -->\n    <div\n      #overlayContainer\n      class=\"annot-overlay-container\"\n      role=\"application\"\n      aria-label=\"Document annotation area\"\n      tabindex=\"0\">\n    </div>\n\n  </div>\n\n  <!-- \u2500\u2500 Annotations panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <company-annotation-panel\n    *ngIf=\"showPanel && panelOpen()\"\n    class=\"annot-panel\"\n    [annotations]=\"engine.annotations()\"\n    [selectedIds]=\"engine.selectedIds()\"\n    (annotationClick)=\"onAnnotationClick($event)\"\n    (annotationDelete)=\"engine.deleteSelected()\">\n  </company-annotation-panel>\n\n</div>\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;height:100%;overflow:hidden;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:13px;color:#1c1c1e}.annot-host{display:flex;flex-direction:row;width:100%;height:100%;overflow:hidden;background:#f2f2f7}.annot-host--transparent{background:transparent}.annot-main{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;position:relative}company-toolbar{position:relative;z-index:20;flex-shrink:0}.annot-panel{width:260px;min-width:220px;max-width:320px;height:100%;border-left:1px solid #d1d1d6;background:#fff;overflow-y:auto;flex-shrink:0}.annot-overlay-container{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;cursor:default;outline:none;background:transparent}.annot-overlay-container:focus-visible{outline:2px solid #007aff;outline-offset:-2px}\n"], dependencies: [{ kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: ToolbarComponent, selector: "company-toolbar", inputs: ["activeToolId", "activeStyle", "canUndo", "canRedo", "hasSelection", "zoomPercent"], outputs: ["toolSelect", "styleChange", "undo", "redo", "save", "download", "import", "deleteSelected", "togglePanel"] }, { kind: "component", type: AnnotationPanelComponent, selector: "company-annotation-panel", inputs: ["annotations", "selectedIds"], outputs: ["annotationClick", "annotationDelete"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotatorComponent, decorators: [{
            type: Component,
            args: [{ selector: 'company-annotator', changeDetection: ChangeDetectionStrategy.OnPush, providers: [
                        AnnotationEngineService,
                        KeyboardHandlerService,
                    ], template: "<!-- annotator.component.html -->\n<div class=\"annot-host\"\n     [class.annot-host--panel-open]=\"showPanel && panelOpen()\"\n     [class.annot-host--transparent]=\"transparent\">\n\n  <!-- \u2500\u2500 Main canvas area \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"annot-main\">\n\n    <!-- Toolbar -->\n    <company-toolbar\n      *ngIf=\"showToolbar\"\n      [activeToolId]=\"engine.activeToolId()\"\n      [activeStyle]=\"engine.activeStyle()\"\n      [canUndo]=\"engine.canUndo()\"\n      [canRedo]=\"engine.canRedo()\"\n      [hasSelection]=\"engine.selectedIds().size > 0\"\n      (toolSelect)=\"onToolSelect($event)\"\n      (styleChange)=\"onStyleChange($event)\"\n      (undo)=\"onUndo()\"\n      (redo)=\"onRedo()\"\n      (save)=\"onSave()\"\n      (download)=\"onDownload()\"\n      (import)=\"onImport()\"\n      (deleteSelected)=\"onDeleteSelected()\"\n      (togglePanel)=\"togglePanel()\">\n    </company-toolbar>\n\n    <!-- Overlay container \u2013 canvases are appended here by the renderer -->\n    <div\n      #overlayContainer\n      class=\"annot-overlay-container\"\n      role=\"application\"\n      aria-label=\"Document annotation area\"\n      tabindex=\"0\">\n    </div>\n\n  </div>\n\n  <!-- \u2500\u2500 Annotations panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <company-annotation-panel\n    *ngIf=\"showPanel && panelOpen()\"\n    class=\"annot-panel\"\n    [annotations]=\"engine.annotations()\"\n    [selectedIds]=\"engine.selectedIds()\"\n    (annotationClick)=\"onAnnotationClick($event)\"\n    (annotationDelete)=\"engine.deleteSelected()\">\n  </company-annotation-panel>\n\n</div>\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;height:100%;overflow:hidden;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:13px;color:#1c1c1e}.annot-host{display:flex;flex-direction:row;width:100%;height:100%;overflow:hidden;background:#f2f2f7}.annot-host--transparent{background:transparent}.annot-main{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;position:relative}company-toolbar{position:relative;z-index:20;flex-shrink:0}.annot-panel{width:260px;min-width:220px;max-width:320px;height:100%;border-left:1px solid #d1d1d6;background:#fff;overflow-y:auto;flex-shrink:0}.annot-overlay-container{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;cursor:default;outline:none;background:transparent}.annot-overlay-container:focus-visible{outline:2px solid #007aff;outline-offset:-2px}\n"] }]
        }], propDecorators: { adapter: [{
                type: Input,
                args: [{ required: true }]
            }], docId: [{
                type: Input
            }], author: [{
                type: Input
            }], initialAnnotations: [{
                type: Input
            }], showToolbar: [{
                type: Input
            }], showPanel: [{
                type: Input
            }], autoSave: [{
                type: Input
            }], transparent: [{
                type: Input
            }], annotationsChange: [{
                type: Output
            }], save: [{
                type: Output
            }], overlayContainerRef: [{
                type: ViewChild,
                args: ['overlayContainer']
            }] } });

/**
 * @file annot-angular.module.ts
 * NgModule that declares and exports all annotation components.
 *
 * Import this module in any Angular application that wants to use
 * the annotation library:
 *
 *   @NgModule({
 *     imports: [AnnotAngularModule],
 *   })
 *   export class AppModule {}
 */
const DECLARATIONS = [
    AnnotatorComponent,
    ToolbarComponent,
    AnnotationPanelComponent,
];
class AnnotAngularModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, declarations: [AnnotatorComponent,
            ToolbarComponent,
            AnnotationPanelComponent], imports: [CommonModule, FormsModule], exports: [AnnotatorComponent,
            ToolbarComponent,
            AnnotationPanelComponent] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, imports: [CommonModule, FormsModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: DECLARATIONS,
                    imports: [CommonModule, FormsModule],
                    exports: DECLARATIONS,
                }]
        }] });

/**
 * Generated bundle index. Do not edit.
 */

export { AnnotAngularModule, AnnotationEngineService, AnnotationPanelComponent, AnnotatorComponent, KeyboardHandlerService, ToolbarComponent };
//# sourceMappingURL=adticorp-annot-angular.mjs.map
