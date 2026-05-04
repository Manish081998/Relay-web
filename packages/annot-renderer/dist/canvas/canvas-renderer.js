/**
 * @file canvas-renderer.ts
 * Main renderer – coordinates layers, schedules RAF frames, and handles
 * incremental dirty-rect updates.
 *
 * RENDER STRATEGY
 * ┌────────────────────────────────────────────────────────────┐
 * │ Store event → mark base-layer dirty                         │
 * │ Selection change → mark selection-layer dirty              │
 * │ Pointer move (drawing) → mark overlay dirty                │
 * │                                                            │
 * │ requestAnimationFrame loop:                                │
 * │   if base dirty     → repaint base layer                   │
 * │   if selection dirty → repaint selection layer             │
 * │   always           → repaint overlay (active tool ink)     │
 * │                                                            │
 * │ Only layers that changed are repainted each frame.         │
 * └────────────────────────────────────────────────────────────┘
 *
 * PERFORMANCE FOR 500+ ANNOTATIONS
 * - Annotations are painted in draw-order from the store page list.
 * - Non-selected annotations go to the base layer (only redrawn
 *   when store data changes, not on every pointer move).
 * - Selected annotations + handles go to the selection layer.
 * - Active-tool overlay is cleared and redrawn every frame.
 * - Page-level AABB is used to skip off-screen pages.
 */
import { LayerManager } from './layer-manager.js';
import { PointerHandler } from '../interaction/pointer-handler.js';
import { paintAnnotation, paintSelectionBorder, paintSelectionHandles, } from './annotation-painters.js';
import { selectionBounds, DEFAULT_STYLE, } from '@adticorp/annot-core';
export class CanvasRenderer {
    layers;
    store;
    adapter;
    author;
    docId;
    activeTool = null;
    selectedIds = new Set();
    activeStyle = { ...DEFAULT_STYLE };
    activePage = 0;
    baseDirty = true;
    selectionDirty = true;
    rafId = null;
    destroyed = false;
    pointerHandler = null;
    // Subscriptions to clean up
    unsubs = [];
    // Text editor overlay element
    textEditorEl = null;
    // Comment editor overlay element
    commentEditorEl = null;
    commentOutsideHandler = null;
    // External command handler (set by Angular service)
    onExecuteCommand;
    onSelectionChange;
    constructor(opts) {
        this.store = opts.store;
        this.adapter = opts.adapter;
        this.author = opts.author ?? 'Anonymous';
        this.docId = opts.docId;
        // Measure initial size
        const rect = opts.container.getBoundingClientRect();
        this.layers = new LayerManager({
            container: opts.container,
            width: Math.max(rect.width, 1),
            height: Math.max(rect.height, 1),
        });
        this.subscribeToStore();
        this.subscribeToAdapter();
        this.startRafLoop();
        this.observeContainerSize(opts.container);
        this.attachPointerHandler();
    }
    // ─── Public API ──────────────────────────────────────────────────────────
    setActiveTool(tool) {
        if (this.activeTool) {
            this.activeTool.deactivate(this.buildContext());
        }
        this.activeTool = tool;
        this.activeTool.activate(this.buildContext());
        this.updateCursor();
        this.markOverlayDirty();
    }
    setSelectedIds(ids) {
        this.selectedIds = new Set(ids);
        this.baseDirty = true; // deselected annotations must repaint on base layer
        this.selectionDirty = true;
        this.onSelectionChange?.(this.selectedIds);
    }
    setActiveStyle(style) {
        this.activeStyle = style;
    }
    setActivePage(page) {
        this.activePage = page;
    }
    markBaseDirty() { this.baseDirty = true; }
    markSelectionDirty() { this.selectionDirty = true; }
    markOverlayDirty() { }
    requestRedraw() { this.baseDirty = true; this.selectionDirty = true; }
    /** Show a textarea editor over a text annotation */
    showTextEditor(annotationId) {
        this.hideTextEditor();
        const a = this.store.getById(annotationId);
        if (!a || a.geometry.kind !== 'rect')
            return;
        // Track whether this annotation was freshly placed (empty text) so we can
        // remove it silently if the user closes the editor without typing anything.
        const isNew = !(a.meta.text?.trim());
        const { zoom, panX, panY } = this.adapter.getViewportTransform();
        const r = a.geometry.rect;
        const sx = r.x * zoom + panX;
        const sy = r.y * zoom + panY;
        const sw = r.width * zoom;
        const sh = r.height * zoom;
        const ta = document.createElement('textarea');
        ta.value = a.meta.text ?? '';
        ta.style.cssText = `
      position: absolute;
      left: ${sx}px; top: ${sy}px;
      width: ${sw}px; height: ${sh}px;
      font-size: ${(a.style.fontSize ?? 14) * zoom}px;
      font-family: ${a.style.fontFamily ?? 'Arial, sans-serif'};
      color: ${a.style.fontColor ?? '#000'};
      background: rgba(255,255,255,0.9);
      border: 2px solid #007AFF;
      outline: none;
      resize: none;
      padding: 4px;
      box-sizing: border-box;
      z-index: 10;
      overflow: hidden;
    `;
        const removeIfEmpty = () => {
            if (!ta.value.trim() && isNew) {
                this.store.remove(annotationId);
                this.selectedIds.delete(annotationId);
                this.onSelectionChange?.(this.selectedIds);
                this.baseDirty = true;
                this.selectionDirty = true;
            }
        };
        ta.addEventListener('blur', () => {
            if (ta.value.trim()) {
                this.commitTextEdit(annotationId, ta.value);
            }
            else {
                removeIfEmpty();
            }
            this.hideTextEditor();
        });
        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                removeIfEmpty();
                this.hideTextEditor();
            }
            if (e.key === 'Enter' && e.ctrlKey) {
                ta.blur();
            }
        });
        this.layers.overlay.canvas.parentElement.appendChild(ta);
        this.textEditorEl = ta;
        ta.focus();
        ta.select();
    }
    hideTextEditor() {
        if (this.textEditorEl) {
            this.textEditorEl.remove();
            this.textEditorEl = null;
        }
    }
    /** Show a floating comment popup over a comment pin annotation */
    showCommentEditor(annotationId) {
        this.hideCommentEditor();
        const a = this.store.getById(annotationId);
        if (!a || a.geometry.kind !== 'point')
            return;
        const { zoom, panX, panY } = this.adapter.getViewportTransform();
        const sp = {
            x: a.geometry.point.x * zoom + panX,
            y: a.geometry.point.y * zoom + panY,
        };
        // Use the canvas container's bounding rect to convert container-local
        // coordinates to page-level coordinates. Append to body so the popup
        // is never clipped by the container's overflow:hidden.
        const containerRect = this.layers.overlay.canvas.getBoundingClientRect();
        const pageX = containerRect.left + sp.x + 14;
        const pageY = containerRect.top + sp.y - 8 + window.scrollY;
        const popup = document.createElement('div');
        popup.style.cssText = `
      position: absolute;
      left: ${pageX}px;
      top: ${pageY}px;
      width: 240px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      padding: 8px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
        const ta = document.createElement('textarea');
        ta.value = a.meta.text ?? '';
        ta.placeholder = 'Add a comment…';
        ta.rows = 4;
        ta.style.cssText = `
      width: 100%;
      font-size: 13px;
      font-family: Arial, sans-serif;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 6px;
      box-sizing: border-box;
      resize: none;
      outline: none;
    `;
        const btnRow = document.createElement('div');
        btnRow.style.cssText = `display: flex; justify-content: flex-end; gap: 6px;`;
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `font-size:12px; padding:3px 10px; cursor:pointer; border:1px solid #ccc; border-radius:4px; background:#f5f5f5;`;
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = `font-size:12px; padding:3px 10px; cursor:pointer; border:none; border-radius:4px; background:#007AFF; color:#fff;`;
        const removeIfEmpty = () => {
            this.store.remove(annotationId);
            this.selectedIds.delete(annotationId);
            this.onSelectionChange?.(this.selectedIds);
            this.baseDirty = true;
            this.selectionDirty = true;
        };
        const save = () => {
            if (ta.value.trim()) {
                this.commitCommentEdit(annotationId, ta.value);
            }
            else {
                removeIfEmpty();
            }
            this.hideCommentEditor();
        };
        const cancel = () => {
            removeIfEmpty();
            this.hideCommentEditor();
        };
        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', cancel);
        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cancel();
            }
            if (e.key === 'Enter' && e.ctrlKey) {
                save();
            }
        });
        // Dismiss and remove the pin when the user clicks anywhere outside the popup.
        // Deferred by one tick so this listener doesn't fire on the same click
        // that placed the comment pin.
        setTimeout(() => {
            this.commentOutsideHandler = (e) => {
                if (!popup.contains(e.target)) {
                    save(); // saves text if present, removes pin if empty
                }
            };
            document.addEventListener('pointerdown', this.commentOutsideHandler);
        }, 0);
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(saveBtn);
        popup.appendChild(ta);
        popup.appendChild(btnRow);
        document.body.appendChild(popup);
        this.commentEditorEl = popup;
        ta.focus();
    }
    hideCommentEditor() {
        if (this.commentOutsideHandler) {
            document.removeEventListener('pointerdown', this.commentOutsideHandler);
            this.commentOutsideHandler = null;
        }
        if (this.commentEditorEl) {
            this.commentEditorEl.remove();
            this.commentEditorEl = null;
        }
    }
    destroy() {
        this.destroyed = true;
        if (this.rafId !== null)
            cancelAnimationFrame(this.rafId);
        for (const unsub of this.unsubs)
            unsub();
        this.unsubs.length = 0;
        this.pointerHandler?.destroy();
        this.pointerHandler = null;
        this.layers.destroy();
        this.hideTextEditor();
        this.hideCommentEditor();
    }
    // ─── Render loop ─────────────────────────────────────────────────────────
    startRafLoop() {
        const loop = () => {
            if (this.destroyed)
                return;
            this.render();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }
    render() {
        if (this.baseDirty) {
            this.paintBase();
            this.baseDirty = false;
        }
        if (this.selectionDirty) {
            this.paintSelection();
            this.selectionDirty = false;
        }
        // Overlay is always cleared and repainted (cheap, tool-specific)
        this.paintOverlay();
    }
    paintBase() {
        const { ctx } = this.layers.base;
        this.layers.clear(this.layers.base);
        const { zoom, panX, panY } = this.adapter.getViewportTransform();
        const opts = { zoom, panX, panY };
        const visiblePages = this.adapter.getVisiblePageIndices();
        for (const pageIndex of visiblePages) {
            const annotations = this.store.getByPage(pageIndex);
            for (const a of annotations) {
                if (this.selectedIds.has(a.id))
                    continue; // selected → drawn on selection layer
                paintAnnotation(ctx, a, opts);
            }
        }
    }
    paintSelection() {
        const { ctx } = this.layers.selection;
        this.layers.clear(this.layers.selection);
        if (this.selectedIds.size === 0)
            return;
        const { zoom, panX, panY } = this.adapter.getViewportTransform();
        const opts = { zoom, panX, panY, isSelected: true };
        const selectedAnnotations = [];
        for (const id of this.selectedIds) {
            const a = this.store.getById(id);
            if (a) {
                selectedAnnotations.push(a);
                paintAnnotation(ctx, a, opts);
            }
        }
        // Draw selection bounding box + handles
        const bounds = selectionBounds(selectedAnnotations);
        if (bounds) {
            const sr = {
                x: bounds.x * zoom + panX,
                y: bounds.y * zoom + panY,
                width: bounds.width * zoom,
                height: bounds.height * zoom,
            };
            paintSelectionBorder(ctx, sr);
            paintSelectionHandles(ctx, sr);
        }
    }
    paintOverlay() {
        const { ctx } = this.layers.overlay;
        this.layers.clear(this.layers.overlay);
        if (this.activeTool?.drawOverlay) {
            this.activeTool.drawOverlay(ctx, this.buildContext());
        }
    }
    // ─── Context ─────────────────────────────────────────────────────────────
    buildContext() {
        return {
            store: this.store,
            adapter: this.adapter,
            author: this.author,
            pageIndex: this.activePage,
            docId: this.docId,
            selectedIds: this.selectedIds,
            activeStyle: this.activeStyle,
            setSelectedIds: (ids) => this.setSelectedIds(ids),
            requestRedraw: () => this.requestRedraw(),
            execute: (cmd) => {
                if (this.onExecuteCommand)
                    this.onExecuteCommand(cmd);
                else
                    cmd.execute();
                this.baseDirty = true;
                this.selectionDirty = true;
            },
        };
    }
    // ─── Pointer handling ─────────────────────────────────────────────────────
    attachPointerHandler() {
        this.pointerHandler = new PointerHandler({
            target: this.layers.overlay.canvas,
            adapter: this.adapter,
            getActiveTool: () => this.activeTool,
            getContext: () => this.buildContext(),
            onCommand: (cmd) => {
                if (this.onExecuteCommand)
                    this.onExecuteCommand(cmd);
                else
                    cmd.execute();
                this.baseDirty = true;
                this.selectionDirty = true;
            },
            onCursorChange: (cursor) => {
                this.layers.overlay.canvas.style.cursor = cursor;
            },
        });
    }
    // ─── Store subscriptions ──────────────────────────────────────────────────
    subscribeToStore() {
        this.unsubs.push(this.store.on('add', () => { this.baseDirty = true; }), this.store.on('update', () => { this.baseDirty = true; this.selectionDirty = true; }), this.store.on('remove', () => { this.baseDirty = true; this.selectionDirty = true; }), this.store.on('reset', () => { this.baseDirty = true; this.selectionDirty = true; }));
    }
    subscribeToAdapter() {
        if (this.adapter.onViewportChange) {
            this.unsubs.push(this.adapter.onViewportChange(() => {
                this.baseDirty = true;
                this.selectionDirty = true;
            }));
        }
    }
    // ─── Container resize ─────────────────────────────────────────────────────
    observeContainerSize(el) {
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                this.layers.resize(width, height);
                this.baseDirty = true;
                this.selectionDirty = true;
            }
        });
        ro.observe(el);
        this.unsubs.push(() => ro.disconnect());
    }
    // ─── Cursor ───────────────────────────────────────────────────────────────
    updateCursor() {
        const container = this.layers.base.canvas.parentElement;
        if (!container)
            return;
        container.style.cursor = this.activeTool?.cursor ?? 'default';
    }
    // ─── Text edit commit ─────────────────────────────────────────────────────
    commitTextEdit(annotationId, text) {
        // Sanitise and update store
        const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this.store.update(annotationId, { meta: { text: safe } });
    }
    commitCommentEdit(annotationId, text) {
        const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this.store.update(annotationId, { meta: { text: safe } });
        this.baseDirty = true;
    }
}
//# sourceMappingURL=canvas-renderer.js.map