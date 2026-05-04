/**
 * @file toolbar.component.ts
 * Annotation toolbar – tool buttons, colour/stroke controls, zoom display,
 * and action buttons (Save, Import, Download, Undo, Redo).
 */
import { EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import type { ToolId, AnnotationStyle } from '@adticorp/annot-core';
import * as i0 from "@angular/core";
interface ToolDefinition {
    id: ToolId;
    label: string;
    icon: string;
    shortcut: string;
}
export declare class ToolbarComponent implements OnChanges {
    activeToolId: ToolId;
    activeStyle: AnnotationStyle;
    canUndo: boolean;
    canRedo: boolean;
    hasSelection: boolean;
    zoomPercent: number;
    toolSelect: EventEmitter<ToolId>;
    styleChange: EventEmitter<Partial<AnnotationStyle>>;
    undo: EventEmitter<void>;
    redo: EventEmitter<void>;
    save: EventEmitter<void>;
    download: EventEmitter<void>;
    import: EventEmitter<void>;
    deleteSelected: EventEmitter<void>;
    togglePanel: EventEmitter<void>;
    readonly tools: ToolDefinition[];
    readonly presetColours: string[];
    readonly colourPickerOpen: import("@angular/core").WritableSignal<boolean>;
    readonly strokeWidthOptions: number[];
    ngOnChanges(_changes: SimpleChanges): void;
    selectTool(id: ToolId): void;
    setColour(colour: string): void;
    setHighlightColour(colour: string): void;
    setStrokeWidth(w: number): void;
    setOpacity(val: number): void;
    toggleColourPicker(): void;
    private withOpacity;
    get opacityPercent(): number;
    static ɵfac: i0.ɵɵFactoryDeclaration<ToolbarComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<ToolbarComponent, "company-toolbar", never, { "activeToolId": { "alias": "activeToolId"; "required": false; }; "activeStyle": { "alias": "activeStyle"; "required": false; }; "canUndo": { "alias": "canUndo"; "required": false; }; "canRedo": { "alias": "canRedo"; "required": false; }; "hasSelection": { "alias": "hasSelection"; "required": false; }; "zoomPercent": { "alias": "zoomPercent"; "required": false; }; }, { "toolSelect": "toolSelect"; "styleChange": "styleChange"; "undo": "undo"; "redo": "redo"; "save": "save"; "download": "download"; "import": "import"; "deleteSelected": "deleteSelected"; "togglePanel": "togglePanel"; }, never, never, false, never>;
}
export {};
