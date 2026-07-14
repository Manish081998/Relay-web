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

import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
} from '@angular/core';
import { NgIf } from '@angular/common';
import type { ViewportAdapter, Annotation, AnnotationStyle, ToolId } from '@adticorp/annot-core';
import { TOOL_IDS, DEFAULT_STYLE } from '@adticorp/annot-core';
import { AnnotationEngineService } from '../../services/annotation-engine.service';
import { KeyboardHandlerService } from '../../services/keyboard-handler.service';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { AnnotationPanelComponent } from '../annotation-panel/annotation-panel.component';

@Component({
  standalone: true,
  imports: [NgIf, ToolbarComponent, AnnotationPanelComponent],
  selector: 'company-annotator',
  templateUrl: './annotator.component.html',
  styleUrls: ['./annotator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AnnotationEngineService,
    KeyboardHandlerService,
  ],
})
export class AnnotatorComponent implements AfterViewInit, OnDestroy, OnChanges {
  // ─── Inputs ──────────────────────────────────────────────────────────────

  /** Adapter that provides coordinate conversion and viewport info */
  @Input({ required: true }) adapter!: ViewportAdapter;

  /** Document identifier (used for storage keys and export filenames) */
  @Input() docId = 'doc-1';

  /** Author name stamped on new annotations */
  @Input() author = 'Anonymous';

  /** Initial annotations to load (e.g. from server) */
  @Input() set initialAnnotations(value: ReadonlyArray<Annotation> | null) {
    if (value?.length && this.engineReady) {
      this.engine.store.loadDocument(this.docId, value);
    }
    this._pendingAnnotations = value ?? null;
  }

  /** Whether the toolbar is visible */
  @Input() showToolbar = true;

  /** Whether the annotation panel sidebar is visible */
  @Input() showPanel = true;

  /** Whether to auto-save to localStorage */
  @Input() autoSave = false;

  /** Make the annotation host background transparent (for overlay-on-content use cases) */
  @Input() transparent = false;

  // ─── Outputs ─────────────────────────────────────────────────────────────

  /** Emits whenever any annotation is added / updated / removed */
  @Output() annotationsChange = new EventEmitter<ReadonlyArray<Annotation>>();

  /** Emits the JSON string when user clicks Save */
  @Output() save = new EventEmitter<string>();

  // ─── View refs ───────────────────────────────────────────────────────────

  @ViewChild('overlayContainer') overlayContainerRef!: ElementRef<HTMLDivElement>;

  // ─── Services ─────────────────────────────────────────────────────────────

  readonly engine = inject(AnnotationEngineService);
  private readonly keyboard = inject(KeyboardHandlerService);

  // ─── State ───────────────────────────────────────────────────────────────

  readonly TOOL_IDS = TOOL_IDS;
  private engineReady = false;
  private _pendingAnnotations: ReadonlyArray<Annotation> | null = null;
  readonly panelOpen = signal(true);

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.engineReady) return;
    if (changes['docId'] || changes['author']) {
      // Re-init required – handled by parent replacing adapter
    }
    if (changes['adapter'] && this.engineReady) {
      this.engine.notifyViewportChanged();
    }
  }

  ngOnDestroy(): void {
    if (this.autoSave) {
      this.engine.saveToLocalStorage();
    }
  }

  // ─── Toolbar handlers ─────────────────────────────────────────────────────

  onToolSelect(toolId: ToolId): void {
    this.engine.selectTool(toolId);
  }

  onStyleChange(patch: Partial<AnnotationStyle>): void {
    this.engine.setStyle(patch);
  }

  onUndo(): void { this.engine.undo(); }
  onRedo(): void { this.engine.redo(); }

  onSave(): void {
    const json = this.engine.exportToJson();
    if (this.autoSave) this.engine.saveToLocalStorage();
    this.save.emit(json);
  }

  onDownload(): void { this.engine.downloadAnnotations(); }

  async onImport(): Promise<void> {
    await this.engine.importAnnotations();
  }

  onDeleteSelected(): void { this.engine.deleteSelected(); }

  togglePanel(): void { this.panelOpen.update(v => !v); }

  onAnnotationClick(annotationId: string): void {
    this.engine.selectedIds.set(new Set([annotationId]));
    this.engine.renderer?.setSelectedIds(new Set([annotationId]));
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private emitAnnotations(): void {
    this.annotationsChange.emit(this.engine.store.getAll());
    if (this.autoSave) this.engine.saveToLocalStorage();
  }
}
