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

import { Injectable, OnDestroy } from '@angular/core';
import { TOOL_IDS } from '@adticorp/annot-core';
import type { ToolId } from '@adticorp/annot-core';
import type { AnnotationEngineService } from './annotation-engine.service';

const TOOL_KEY_MAP: Record<string, ToolId> = {
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

@Injectable()
export class KeyboardHandlerService implements OnDestroy {
  private engine!: AnnotationEngineService;
  private target!: HTMLElement;
  private readonly cleanups: Array<() => void> = [];

  /**
   * Attach keyboard listeners to the given element.
   * Call from AnnotatorComponent after engine is initialised.
   */
  attach(target: HTMLElement, engine: AnnotationEngineService): void {
    this.engine = engine;
    this.target = target;

    // Use keydown on document so we capture arrows without needing focus
    const onKeyDown = (e: KeyboardEvent): void => this.handleKeyDown(e);
    document.addEventListener('keydown', onKeyDown, { capture: true });
    this.cleanups.push(() => document.removeEventListener('keydown', onKeyDown, { capture: true }));
  }

  ngOnDestroy(): void {
    for (const fn of this.cleanups) fn();
    this.cleanups.length = 0;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Don't intercept when user is typing in an input
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
}
