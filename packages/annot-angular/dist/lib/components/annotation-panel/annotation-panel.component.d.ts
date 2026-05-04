/**
 * @file annotation-panel.component.ts
 * Sidebar that lists all annotations, shows comment text, and lets
 * users jump to an annotation or delete it.
 */
import { EventEmitter } from '@angular/core';
import type { Annotation } from '@adticorp/annot-core';
import * as i0 from "@angular/core";
export declare class AnnotationPanelComponent {
    annotations: ReadonlyArray<Annotation>;
    selectedIds: ReadonlySet<string>;
    annotationClick: EventEmitter<string>;
    annotationDelete: EventEmitter<string>;
    readonly filterText: import("@angular/core").WritableSignal<string>;
    get filteredAnnotations(): ReadonlyArray<Annotation>;
    isSelected(a: Annotation): boolean;
    getDisplayText(a: Annotation): string;
    getTypeIcon(type: string): string;
    formatDate(iso: string): string;
    trackById(_: number, a: Annotation): string;
    onFilter(val: string): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<AnnotationPanelComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<AnnotationPanelComponent, "company-annotation-panel", never, { "annotations": { "alias": "annotations"; "required": false; }; "selectedIds": { "alias": "selectedIds"; "required": false; }; }, { "annotationClick": "annotationClick"; "annotationDelete": "annotationDelete"; }, never, never, false, never>;
}
