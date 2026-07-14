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
import { OnDestroy } from '@angular/core';
import type { AnnotationEngineService } from './annotation-engine.service';
import * as i0 from "@angular/core";
export declare class KeyboardHandlerService implements OnDestroy {
    private engine;
    private target;
    private readonly cleanups;
    /**
     * Attach keyboard listeners to the given element.
     * Call from AnnotatorComponent after engine is initialised.
     */
    attach(target: HTMLElement, engine: AnnotationEngineService): void;
    ngOnDestroy(): void;
    private handleKeyDown;
    static ɵfac: i0.ɵɵFactoryDeclaration<KeyboardHandlerService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<KeyboardHandlerService>;
}
