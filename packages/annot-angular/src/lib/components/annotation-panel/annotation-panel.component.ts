/**
 * @file annotation-panel.component.ts
 * Sidebar that lists all annotations, shows comment text, and lets
 * users jump to an annotation or delete it.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { NgIf, NgFor, TitleCasePipe } from '@angular/common';
import type { Annotation } from '@adticorp/annot-core';
import { desanitiseText } from '@adticorp/annot-core';

@Component({
  standalone: true,
  imports: [NgIf, NgFor, TitleCasePipe],
  selector: 'company-annotation-panel',
  templateUrl: './annotation-panel.component.html',
  styleUrls: ['./annotation-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationPanelComponent {
  @Input() annotations: ReadonlyArray<Annotation> = [];
  @Input() selectedIds: ReadonlySet<string> = new Set();

  @Output() annotationClick = new EventEmitter<string>();
  @Output() annotationDelete = new EventEmitter<string>();

  readonly filterText = signal('');

  get filteredAnnotations(): ReadonlyArray<Annotation> {
    const q = this.filterText().toLowerCase().trim();
    if (!q) return this.annotations;
    return this.annotations.filter(a =>
      a.type.includes(q) ||
      a.author.toLowerCase().includes(q) ||
      (a.meta.text ?? '').toLowerCase().includes(q) ||
      (a.meta.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }

  isSelected(a: Annotation): boolean {
    return this.selectedIds.has(a.id);
  }

  getDisplayText(a: Annotation): string {
    const raw = a.meta.text ?? '';
    if (!raw) return '';
    return desanitiseText(raw).slice(0, 80);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      highlight: '▬', freehand: '✏', text: 'T', comment: '💬',
      rectangle: '▭', ellipse: '○', arrow: '→', line: '╱',
    };
    return icons[type] ?? '●';
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  trackById(_: number, a: Annotation): string { return a.id; }

  onFilter(val: string): void { this.filterText.set(val); }
}
