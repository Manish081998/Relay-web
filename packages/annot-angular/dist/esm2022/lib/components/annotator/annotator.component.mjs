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
import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy, inject, signal, } from '@angular/core';
import { TOOL_IDS } from '@adticorp/annot-core';
import { AnnotationEngineService } from '../../services/annotation-engine.service';
import { KeyboardHandlerService } from '../../services/keyboard-handler.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
import * as i2 from "../toolbar/toolbar.component";
import * as i3 from "../annotation-panel/annotation-panel.component";
export class AnnotatorComponent {
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
        ], viewQueries: [{ propertyName: "overlayContainerRef", first: true, predicate: ["overlayContainer"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<!-- annotator.component.html -->\n<div class=\"annot-host\"\n     [class.annot-host--panel-open]=\"showPanel && panelOpen()\"\n     [class.annot-host--transparent]=\"transparent\">\n\n  <!-- \u2500\u2500 Main canvas area \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <div class=\"annot-main\">\n\n    <!-- Toolbar -->\n    <company-toolbar\n      *ngIf=\"showToolbar\"\n      [activeToolId]=\"engine.activeToolId()\"\n      [activeStyle]=\"engine.activeStyle()\"\n      [canUndo]=\"engine.canUndo()\"\n      [canRedo]=\"engine.canRedo()\"\n      [hasSelection]=\"engine.selectedIds().size > 0\"\n      (toolSelect)=\"onToolSelect($event)\"\n      (styleChange)=\"onStyleChange($event)\"\n      (undo)=\"onUndo()\"\n      (redo)=\"onRedo()\"\n      (save)=\"onSave()\"\n      (download)=\"onDownload()\"\n      (import)=\"onImport()\"\n      (deleteSelected)=\"onDeleteSelected()\"\n      (togglePanel)=\"togglePanel()\">\n    </company-toolbar>\n\n    <!-- Overlay container \u2013 canvases are appended here by the renderer -->\n    <div\n      #overlayContainer\n      class=\"annot-overlay-container\"\n      role=\"application\"\n      aria-label=\"Document annotation area\"\n      tabindex=\"0\">\n    </div>\n\n  </div>\n\n  <!-- \u2500\u2500 Annotations panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n  <company-annotation-panel\n    *ngIf=\"showPanel && panelOpen()\"\n    class=\"annot-panel\"\n    [annotations]=\"engine.annotations()\"\n    [selectedIds]=\"engine.selectedIds()\"\n    (annotationClick)=\"onAnnotationClick($event)\"\n    (annotationDelete)=\"engine.deleteSelected()\">\n  </company-annotation-panel>\n\n</div>\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;height:100%;overflow:hidden;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:13px;color:#1c1c1e}.annot-host{display:flex;flex-direction:row;width:100%;height:100%;overflow:hidden;background:#f2f2f7}.annot-host--transparent{background:transparent}.annot-main{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;position:relative}company-toolbar{position:relative;z-index:20;flex-shrink:0}.annot-panel{width:260px;min-width:220px;max-width:320px;height:100%;border-left:1px solid #d1d1d6;background:#fff;overflow-y:auto;flex-shrink:0}.annot-overlay-container{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;cursor:default;outline:none;background:transparent}.annot-overlay-container:focus-visible{outline:2px solid #007aff;outline-offset:-2px}\n"], dependencies: [{ kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: i2.ToolbarComponent, selector: "company-toolbar", inputs: ["activeToolId", "activeStyle", "canUndo", "canRedo", "hasSelection", "zoomPercent"], outputs: ["toolSelect", "styleChange", "undo", "redo", "save", "download", "import", "deleteSelected", "togglePanel"] }, { kind: "component", type: i3.AnnotationPanelComponent, selector: "company-annotation-panel", inputs: ["annotations", "selectedIds"], outputs: ["annotationClick", "annotationDelete"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdG9yLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9saWIvY29tcG9uZW50cy9hbm5vdGF0b3IvYW5ub3RhdG9yLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9saWIvY29tcG9uZW50cy9hbm5vdGF0b3IvYW5ub3RhdG9yLmNvbXBvbmVudC5odG1sIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBRUgsT0FBTyxFQUNMLFNBQVMsRUFDVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFNWixTQUFTLEVBQ1QsdUJBQXVCLEVBQ3ZCLE1BQU0sRUFDTixNQUFNLEdBRVAsTUFBTSxlQUFlLENBQUM7QUFFdkIsT0FBTyxFQUFFLFFBQVEsRUFBaUIsTUFBTSxzQkFBc0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQzs7Ozs7QUFZakYsTUFBTSxPQUFPLGtCQUFrQjtJQUM3Qiw0RUFBNEU7SUFFNUUsb0VBQW9FO0lBQ3pDLE9BQU8sQ0FBbUI7SUFFckQsdUVBQXVFO0lBQzlELEtBQUssR0FBRyxPQUFPLENBQUM7SUFFekIsNkNBQTZDO0lBQ3BDLE1BQU0sR0FBRyxXQUFXLENBQUM7SUFFOUIscURBQXFEO0lBQ3JELElBQWEsa0JBQWtCLENBQUMsS0FBdUM7UUFDckUsSUFBSSxLQUFLLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUssSUFBSSxJQUFJLENBQUM7SUFDM0MsQ0FB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d0IsbUJBQW1CO3NCQUFqRCxTQUFTO3VCQUFDLGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgYW5ub3RhdG9yLmNvbXBvbmVudC50c1xuICogUm9vdCBob3N0IGNvbXBvbmVudCBmb3IgdGhlIGFubm90YXRpb24gb3ZlcmxheS5cbiAqXG4gKiBVc2FnZTpcbiAqICAgPGNvbXBhbnktYW5ub3RhdG9yXG4gKiAgICAgW2FkYXB0ZXJdPVwibXlBZGFwdGVyXCJcbiAqICAgICBbZG9jSWRdPVwiZG9jdW1lbnRJZFwiXG4gKiAgICAgW2F1dGhvcl09XCJjdXJyZW50VXNlclwiXG4gKiAgICAgKGFubm90YXRpb25zQ2hhbmdlKT1cIm9uQW5ub3RhdGlvbnNDaGFuZ2UoJGV2ZW50KVwiPlxuICogICA8L2NvbXBhbnktYW5ub3RhdG9yPlxuICpcbiAqIFRoZSBjb21wb25lbnQgaXMgcG9zaXRpb246cmVsYXRpdmUgYW5kIGZpbGxzIGl0cyBwYXJlbnQuXG4gKiBUaGUgaG9zdCBhcHAgc2hvdWxkIGdpdmUgaXQgYSBkZWZpbmVkIHNpemUgKHdpZHRoL2hlaWdodCBvciBmbGV4KS5cbiAqL1xuXG5pbXBvcnQge1xuICBDb21wb25lbnQsXG4gIElucHV0LFxuICBPdXRwdXQsXG4gIEV2ZW50RW1pdHRlcixcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgT25EZXN0cm95LFxuICBPbkNoYW5nZXMsXG4gIFNpbXBsZUNoYW5nZXMsXG4gIEVsZW1lbnRSZWYsXG4gIFZpZXdDaGlsZCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIGluamVjdCxcbiAgc2lnbmFsLFxuICBlZmZlY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHR5cGUgeyBWaWV3cG9ydEFkYXB0ZXIsIEFubm90YXRpb24sIEFubm90YXRpb25TdHlsZSwgVG9vbElkIH0gZnJvbSAnQGFkdGljb3JwL2Fubm90LWNvcmUnO1xuaW1wb3J0IHsgVE9PTF9JRFMsIERFRkFVTFRfU1RZTEUgfSBmcm9tICdAYWR0aWNvcnAvYW5ub3QtY29yZSc7XG5pbXBvcnQgeyBBbm5vdGF0aW9uRW5naW5lU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Fubm90YXRpb24tZW5naW5lLnNlcnZpY2UnO1xuaW1wb3J0IHsgS2V5Ym9hcmRIYW5kbGVyU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2tleWJvYXJkLWhhbmRsZXIuc2VydmljZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2NvbXBhbnktYW5ub3RhdG9yJyxcbiAgdGVtcGxhdGVVcmw6ICcuL2Fubm90YXRvci5jb21wb25lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL2Fubm90YXRvci5jb21wb25lbnQuc2NzcyddLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgcHJvdmlkZXJzOiBbXG4gICAgQW5ub3RhdGlvbkVuZ2luZVNlcnZpY2UsXG4gICAgS2V5Ym9hcmRIYW5kbGVyU2VydmljZSxcbiAgXSxcbn0pXG5leHBvcnQgY2xhc3MgQW5ub3RhdG9yQ29tcG9uZW50IGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95LCBPbkNoYW5nZXMge1xuICAvLyDilIDilIDilIAgSW5wdXRzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gIC8qKiBBZGFwdGVyIHRoYXQgcHJvdmlkZXMgY29vcmRpbmF0ZSBjb252ZXJzaW9uIGFuZCB2aWV3cG9ydCBpbmZvICovXG4gIEBJbnB1dCh7IHJlcXVpcmVkOiB0cnVlIH0pIGFkYXB0ZXIhOiBWaWV3cG9ydEFkYXB0ZXI7XG5cbiAgLyoqIERvY3VtZW50IGlkZW50aWZpZXIgKHVzZWQgZm9yIHN0b3JhZ2Uga2V5cyBhbmQgZXhwb3J0IGZpbGVuYW1lcykgKi9cbiAgQElucHV0KCkgZG9jSWQgPSAnZG9jLTEnO1xuXG4gIC8qKiBBdXRob3IgbmFtZSBzdGFtcGVkIG9uIG5ldyBhbm5vdGF0aW9ucyAqL1xuICBASW5wdXQoKSBhdXRob3IgPSAnQW5vbnltb3VzJztcblxuICAvKiogSW5pdGlhbCBhbm5vdGF0aW9ucyB0byBsb2FkIChlLmcuIGZyb20gc2VydmVyKSAqL1xuICBASW5wdXQoKSBzZXQgaW5pdGlhbEFubm90YXRpb25zKHZhbHVlOiBSZWFkb25seUFycmF5PEFubm90YXRpb24+IHwgbnVsbCkge1xuICAgIGlmICh2YWx1ZT8ubGVuZ3RoICYmIHRoaXMuZW5naW5lUmVhZHkpIHtcbiAgICAgIHRoaXMuZW5naW5lLnN0b3JlLmxvYWREb2N1bWVudCh0aGlzLmRvY0lkLCB2YWx1ZSk7XG4gICAgfVxuICAgIHRoaXMuX3BlbmRpbmdBbm5vdGF0aW9ucyA9IHZhbHVlID8/IG51bGw7XG4gIH1cblxuICAvKiogV2hldGhlciB0aGUgdG9vbGJhciBpcyB2aXNpYmxlICovXG4gIEBJbnB1dCgpIHNob3dUb29sYmFyID0gdHJ1ZTtcblxuICAvKiogV2hldGhlciB0aGUgYW5ub3RhdGlvbiBwYW5lbCBzaWRlYmFyIGlzIHZpc2libGUgKi9cbiAgQElucHV0KCkgc2hvd1BhbmVsID0gdHJ1ZTtcblxuICAvKiogV2hldGhlciB0byBhdXRvLXNhdmUgdG8gbG9jYWxTdG9yYWdlICovXG4gIEBJbnB1dCgpIGF1dG9TYXZlID0gZmFsc2U7XG5cbiAgLyoqIE1ha2UgdGhlIGFubm90YXRpb24gaG9zdCBiYWNrZ3JvdW5kIHRyYW5zcGFyZW50IChmb3Igb3ZlcmxheS1vbi1jb250ZW50IHVzZSBjYXNlcykgKi9cbiAgQElucHV0KCkgdHJhbnNwYXJlbnQgPSBmYWxzZTtcblxuICAvLyDilIDilIDilIAgT3V0cHV0cyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAvKiogRW1pdHMgd2hlbmV2ZXIgYW55IGFubm90YXRpb24gaXMgYWRkZWQgLyB1cGRhdGVkIC8gcmVtb3ZlZCAqL1xuICBAT3V0cHV0KCkgYW5ub3RhdGlvbnNDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFJlYWRvbmx5QXJyYXk8QW5ub3RhdGlvbj4+KCk7XG5cbiAgLyoqIEVtaXRzIHRoZSBKU09OIHN0cmluZyB3aGVuIHVzZXIgY2xpY2tzIFNhdmUgKi9cbiAgQE91dHB1dCgpIHNhdmUgPSBuZXcgRXZlbnRFbWl0dGVyPHN0cmluZz4oKTtcblxuICAvLyDilIDilIDilIAgVmlldyByZWZzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gIEBWaWV3Q2hpbGQoJ292ZXJsYXlDb250YWluZXInKSBvdmVybGF5Q29udGFpbmVyUmVmITogRWxlbWVudFJlZjxIVE1MRGl2RWxlbWVudD47XG5cbiAgLy8g4pSA4pSA4pSAIFNlcnZpY2VzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gIHJlYWRvbmx5IGVuZ2luZSA9IGluamVjdChBbm5vdGF0aW9uRW5naW5lU2VydmljZSk7XG4gIHByaXZhdGUgcmVhZG9ubHkga2V5Ym9hcmQgPSBpbmplY3QoS2V5Ym9hcmRIYW5kbGVyU2VydmljZSk7XG5cbiAgLy8g4pSA4pSA4pSAIFN0YXRlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gIHJlYWRvbmx5IFRPT0xfSURTID0gVE9PTF9JRFM7XG4gIHByaXZhdGUgZW5naW5lUmVhZHkgPSBmYWxzZTtcbiAgcHJpdmF0ZSBfcGVuZGluZ0Fubm90YXRpb25zOiBSZWFkb25seUFycmF5PEFubm90YXRpb24+IHwgbnVsbCA9IG51bGw7XG4gIHJlYWRvbmx5IHBhbmVsT3BlbiA9IHNpZ25hbCh0cnVlKTtcblxuICAvLyDilIDilIDilIAgTGlmZWN5Y2xlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLm92ZXJsYXlDb250YWluZXJSZWYubmF0aXZlRWxlbWVudDtcbiAgICB0aGlzLmVuZ2luZS5pbml0KGNvbnRhaW5lciwgdGhpcy5hZGFwdGVyLCB0aGlzLmRvY0lkLCB0aGlzLmF1dGhvcik7XG4gICAgdGhpcy5rZXlib2FyZC5hdHRhY2goY29udGFpbmVyLCB0aGlzLmVuZ2luZSk7XG4gICAgdGhpcy5lbmdpbmVSZWFkeSA9IHRydWU7XG5cbiAgICAvLyBMb2FkIGFueSBhbm5vdGF0aW9ucyB0aGF0IGFycml2ZWQgYmVmb3JlIGluaXRcbiAgICBpZiAodGhpcy5fcGVuZGluZ0Fubm90YXRpb25zPy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZW5naW5lLnN0b3JlLmxvYWREb2N1bWVudCh0aGlzLmRvY0lkLCB0aGlzLl9wZW5kaW5nQW5ub3RhdGlvbnMpO1xuICAgICAgdGhpcy5fcGVuZGluZ0Fubm90YXRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb2FkIGZyb20gbG9jYWxTdG9yYWdlIGlmIGF1dG9TYXZlIGVuYWJsZWRcbiAgICBpZiAodGhpcy5hdXRvU2F2ZSkge1xuICAgICAgdGhpcy5lbmdpbmUubG9hZEZyb21Mb2NhbFN0b3JhZ2UoKTtcbiAgICB9XG5cbiAgICAvLyBXaXJlIGFubm90YXRpb24gY2hhbmdlIG91dHB1dFxuICAgIHRoaXMuZW5naW5lLnN0b3JlLm9uKCdhZGQnLCAoKSA9PiB0aGlzLmVtaXRBbm5vdGF0aW9ucygpKTtcbiAgICB0aGlzLmVuZ2luZS5zdG9yZS5vbigndXBkYXRlJywgKCkgPT4gdGhpcy5lbWl0QW5ub3RhdGlvbnMoKSk7XG4gICAgdGhpcy5lbmdpbmUuc3RvcmUub24oJ3JlbW92ZScsICgpID0+IHRoaXMuZW1pdEFubm90YXRpb25zKCkpO1xuICAgIHRoaXMuZW5naW5lLnN0b3JlLm9uKCdyZXNldCcsICgpID0+IHRoaXMuZW1pdEFubm90YXRpb25zKCkpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmdpbmVSZWFkeSkgcmV0dXJuO1xuICAgIGlmIChjaGFuZ2VzWydkb2NJZCddIHx8IGNoYW5nZXNbJ2F1dGhvciddKSB7XG4gICAgICAvLyBSZS1pbml0IHJlcXVpcmVkIOKAkyBoYW5kbGVkIGJ5IHBhcmVudCByZXBsYWNpbmcgYWRhcHRlclxuICAgIH1cbiAgICBpZiAoY2hhbmdlc1snYWRhcHRlciddICYmIHRoaXMuZW5naW5lUmVhZHkpIHtcbiAgICAgIHRoaXMuZW5naW5lLm5vdGlmeVZpZXdwb3J0Q2hhbmdlZCgpO1xuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmF1dG9TYXZlKSB7XG4gICAgICB0aGlzLmVuZ2luZS5zYXZlVG9Mb2NhbFN0b3JhZ2UoKTtcbiAgICB9XG4gIH1cblxuICAvLyDilIDilIDilIAgVG9vbGJhciBoYW5kbGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICBvblRvb2xTZWxlY3QodG9vbElkOiBUb29sSWQpOiB2b2lkIHtcbiAgICB0aGlzLmVuZ2luZS5zZWxlY3RUb29sKHRvb2xJZCk7XG4gIH1cblxuICBvblN0eWxlQ2hhbmdlKHBhdGNoOiBQYXJ0aWFsPEFubm90YXRpb25TdHlsZT4pOiB2b2lkIHtcbiAgICB0aGlzLmVuZ2luZS5zZXRTdHlsZShwYXRjaCk7XG4gIH1cblxuICBvblVuZG8oKTogdm9pZCB7IHRoaXMuZW5naW5lLnVuZG8oKTsgfVxuICBvblJlZG8oKTogdm9pZCB7IHRoaXMuZW5naW5lLnJlZG8oKTsgfVxuXG4gIG9uU2F2ZSgpOiB2b2lkIHtcbiAgICBjb25zdCBqc29uID0gdGhpcy5lbmdpbmUuZXhwb3J0VG9Kc29uKCk7XG4gICAgaWYgKHRoaXMuYXV0b1NhdmUpIHRoaXMuZW5naW5lLnNhdmVUb0xvY2FsU3RvcmFnZSgpO1xuICAgIHRoaXMuc2F2ZS5lbWl0KGpzb24pO1xuICB9XG5cbiAgb25Eb3dubG9hZCgpOiB2b2lkIHsgdGhpcy5lbmdpbmUuZG93bmxvYWRBbm5vdGF0aW9ucygpOyB9XG5cbiAgYXN5bmMgb25JbXBvcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbmdpbmUuaW1wb3J0QW5ub3RhdGlvbnMoKTtcbiAgfVxuXG4gIG9uRGVsZXRlU2VsZWN0ZWQoKTogdm9pZCB7IHRoaXMuZW5naW5lLmRlbGV0ZVNlbGVjdGVkKCk7IH1cblxuICB0b2dnbGVQYW5lbCgpOiB2b2lkIHsgdGhpcy5wYW5lbE9wZW4udXBkYXRlKHYgPT4gIXYpOyB9XG5cbiAgb25Bbm5vdGF0aW9uQ2xpY2soYW5ub3RhdGlvbklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmVuZ2luZS5zZWxlY3RlZElkcy5zZXQobmV3IFNldChbYW5ub3RhdGlvbklkXSkpO1xuICAgIHRoaXMuZW5naW5lLnJlbmRlcmVyPy5zZXRTZWxlY3RlZElkcyhuZXcgU2V0KFthbm5vdGF0aW9uSWRdKSk7XG4gIH1cblxuICAvLyDilIDilIDilIAgUHJpdmF0ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICBwcml2YXRlIGVtaXRBbm5vdGF0aW9ucygpOiB2b2lkIHtcbiAgICB0aGlzLmFubm90YXRpb25zQ2hhbmdlLmVtaXQodGhpcy5lbmdpbmUuc3RvcmUuZ2V0QWxsKCkpO1xuICAgIGlmICh0aGlzLmF1dG9TYXZlKSB0aGlzLmVuZ2luZS5zYXZlVG9Mb2NhbFN0b3JhZ2UoKTtcbiAgfVxufVxuIiwiPCEtLSBhbm5vdGF0b3IuY29tcG9uZW50Lmh0bWwgLS0+XG48ZGl2IGNsYXNzPVwiYW5ub3QtaG9zdFwiXG4gICAgIFtjbGFzcy5hbm5vdC1ob3N0LS1wYW5lbC1vcGVuXT1cInNob3dQYW5lbCAmJiBwYW5lbE9wZW4oKVwiXG4gICAgIFtjbGFzcy5hbm5vdC1ob3N0LS10cmFuc3BhcmVudF09XCJ0cmFuc3BhcmVudFwiPlxuXG4gIDwhLS0g4pSA4pSAIE1haW4gY2FudmFzIGFyZWEg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAIC0tPlxuICA8ZGl2IGNsYXNzPVwiYW5ub3QtbWFpblwiPlxuXG4gICAgPCEtLSBUb29sYmFyIC0tPlxuICAgIDxjb21wYW55LXRvb2xiYXJcbiAgICAgICpuZ0lmPVwic2hvd1Rvb2xiYXJcIlxuICAgICAgW2FjdGl2ZVRvb2xJZF09XCJlbmdpbmUuYWN0aXZlVG9vbElkKClcIlxuICAgICAgW2FjdGl2ZVN0eWxlXT1cImVuZ2luZS5hY3RpdmVTdHlsZSgpXCJcbiAgICAgIFtjYW5VbmRvXT1cImVuZ2luZS5jYW5VbmRvKClcIlxuICAgICAgW2NhblJlZG9dPVwiZW5naW5lLmNhblJlZG8oKVwiXG4gICAgICBbaGFzU2VsZWN0aW9uXT1cImVuZ2luZS5zZWxlY3RlZElkcygpLnNpemUgPiAwXCJcbiAgICAgICh0b29sU2VsZWN0KT1cIm9uVG9vbFNlbGVjdCgkZXZlbnQpXCJcbiAgICAgIChzdHlsZUNoYW5nZSk9XCJvblN0eWxlQ2hhbmdlKCRldmVudClcIlxuICAgICAgKHVuZG8pPVwib25VbmRvKClcIlxuICAgICAgKHJlZG8pPVwib25SZWRvKClcIlxuICAgICAgKHNhdmUpPVwib25TYXZlKClcIlxuICAgICAgKGRvd25sb2FkKT1cIm9uRG93bmxvYWQoKVwiXG4gICAgICAoaW1wb3J0KT1cIm9uSW1wb3J0KClcIlxuICAgICAgKGRlbGV0ZVNlbGVjdGVkKT1cIm9uRGVsZXRlU2VsZWN0ZWQoKVwiXG4gICAgICAodG9nZ2xlUGFuZWwpPVwidG9nZ2xlUGFuZWwoKVwiPlxuICAgIDwvY29tcGFueS10b29sYmFyPlxuXG4gICAgPCEtLSBPdmVybGF5IGNvbnRhaW5lciDigJMgY2FudmFzZXMgYXJlIGFwcGVuZGVkIGhlcmUgYnkgdGhlIHJlbmRlcmVyIC0tPlxuICAgIDxkaXZcbiAgICAgICNvdmVybGF5Q29udGFpbmVyXG4gICAgICBjbGFzcz1cImFubm90LW92ZXJsYXktY29udGFpbmVyXCJcbiAgICAgIHJvbGU9XCJhcHBsaWNhdGlvblwiXG4gICAgICBhcmlhLWxhYmVsPVwiRG9jdW1lbnQgYW5ub3RhdGlvbiBhcmVhXCJcbiAgICAgIHRhYmluZGV4PVwiMFwiPlxuICAgIDwvZGl2PlxuXG4gIDwvZGl2PlxuXG4gIDwhLS0g4pSA4pSAIEFubm90YXRpb25zIHBhbmVsIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAtLT5cbiAgPGNvbXBhbnktYW5ub3RhdGlvbi1wYW5lbFxuICAgICpuZ0lmPVwic2hvd1BhbmVsICYmIHBhbmVsT3BlbigpXCJcbiAgICBjbGFzcz1cImFubm90LXBhbmVsXCJcbiAgICBbYW5ub3RhdGlvbnNdPVwiZW5naW5lLmFubm90YXRpb25zKClcIlxuICAgIFtzZWxlY3RlZElkc109XCJlbmdpbmUuc2VsZWN0ZWRJZHMoKVwiXG4gICAgKGFubm90YXRpb25DbGljayk9XCJvbkFubm90YXRpb25DbGljaygkZXZlbnQpXCJcbiAgICAoYW5ub3RhdGlvbkRlbGV0ZSk9XCJlbmdpbmUuZGVsZXRlU2VsZWN0ZWQoKVwiPlxuICA8L2NvbXBhbnktYW5ub3RhdGlvbi1wYW5lbD5cblxuPC9kaXY+XG4iXX0=