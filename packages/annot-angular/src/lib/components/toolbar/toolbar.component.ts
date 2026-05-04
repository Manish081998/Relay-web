/**
 * @file toolbar.component.ts
 * Annotation toolbar – tool buttons, colour/stroke controls, zoom display,
 * and action buttons (Save, Import, Download, Undo, Redo).
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { TOOL_IDS } from '@adticorp/annot-core';
import type { ToolId, AnnotationStyle } from '@adticorp/annot-core';

interface ToolDefinition {
  id: ToolId;
  label: string;
  icon: string;       // Unicode / SVG path label for demo; replace with icon lib
  shortcut: string;
}

const TOOLS: ToolDefinition[] = [
  { id: TOOL_IDS.SELECT,    label: 'Select',    icon: '⬡', shortcut: 'V' },
  { id: TOOL_IDS.HIGHLIGHT, label: 'Highlight', icon: '▬', shortcut: 'H' },
  { id: TOOL_IDS.FREEHAND,  label: 'Draw',      icon: '✏', shortcut: 'D' },
  { id: TOOL_IDS.TEXT,      label: 'Text',      icon: 'T', shortcut: 'T' },
  { id: TOOL_IDS.COMMENT,   label: 'Comment',   icon: '💬', shortcut: 'C' },
  { id: TOOL_IDS.RECTANGLE, label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { id: TOOL_IDS.ELLIPSE,   label: 'Ellipse',   icon: '○', shortcut: 'E' },
  { id: TOOL_IDS.ARROW,     label: 'Arrow',     icon: '→', shortcut: 'A' },
  { id: TOOL_IDS.LINE,      label: 'Line',      icon: '╱', shortcut: 'L' },
  { id: TOOL_IDS.ERASER,    label: 'Eraser',    icon: '⌫', shortcut: 'X' },
];

const PRESET_COLOURS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#007AFF', '#5856D6', '#FF2D55', '#000000',
  '#8E8E93', '#FFFFFF',
];

@Component({
  standalone: true,
  imports: [NgIf, NgFor],
  selector: 'company-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent implements OnChanges {
  @Input() activeToolId: ToolId = TOOL_IDS.SELECT;
  @Input() activeStyle!: AnnotationStyle;
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() hasSelection = false;
  @Input() zoomPercent = 100;

  @Output() toolSelect = new EventEmitter<ToolId>();
  @Output() styleChange = new EventEmitter<Partial<AnnotationStyle>>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() import = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() togglePanel = new EventEmitter<void>();

  readonly tools = TOOLS;
  readonly presetColours = PRESET_COLOURS;

  readonly colourPickerOpen = signal(false);
  readonly strokeWidthOptions = [1, 2, 3, 4, 6, 8, 12];

  ngOnChanges(_changes: SimpleChanges): void {
    // ChangeDetectionStrategy.OnPush handles re-render
  }

  selectTool(id: ToolId): void {
    this.toolSelect.emit(id);
  }

  setColour(colour: string): void {
    this.styleChange.emit({ strokeColor: colour, fillColor: this.withOpacity(colour, 0.2) });
    this.colourPickerOpen.set(false);
  }

  setHighlightColour(colour: string): void {
    this.styleChange.emit({ fillColor: this.withOpacity(colour, 0.4), strokeColor: 'transparent' });
    this.colourPickerOpen.set(false);
  }

  setStrokeWidth(w: number): void {
    this.styleChange.emit({ strokeWidth: w });
  }

  setOpacity(val: number): void {
    this.styleChange.emit({ opacity: val / 100 });
  }

  toggleColourPicker(): void {
    this.colourPickerOpen.update(v => !v);
  }

  private withOpacity(hex: string, alpha: number): string {
    // Parse and convert hex to rgba
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  get opacityPercent(): number {
    return Math.round((this.activeStyle?.opacity ?? 1) * 100);
  }
}
