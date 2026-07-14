/**
 * @file annotation-commands.ts
 * Concrete Command implementations for all annotation mutations.
 *
 * Pattern: each command holds a reference to the AnnotationStore
 * and the before/after state snapshots it needs to invert itself.
 * Annotations are treated as immutable value objects.
 */

import type { Command } from './command.interface.js';
import type { Annotation, Point } from '../model/annotation.model.js';
import type { AnnotationStore } from '../store/annotation-store.js';

// ─── Add ─────────────────────────────────────────────────────────────────────

export class AddAnnotationCommand implements Command {
  readonly label: string;
  constructor(
    private readonly store: AnnotationStore,
    private readonly annotation: Annotation,
  ) {
    this.label = `Add ${annotation.type}`;
  }
  execute(): void { this.store.add(this.annotation); }
  undo(): void { this.store.remove(this.annotation.id); }
}

// ─── Remove ──────────────────────────────────────────────────────────────────

export class RemoveAnnotationCommand implements Command {
  readonly label: string;
  private removedAnnotation: Annotation | null = null;

  constructor(
    private readonly store: AnnotationStore,
    private readonly id: string,
  ) {
    this.label = 'Delete annotation';
  }

  execute(): void {
    this.removedAnnotation = this.store.getById(this.id) ?? null;
    if (this.removedAnnotation) {
      this.store.remove(this.id);
    }
  }

  undo(): void {
    if (this.removedAnnotation) {
      this.store.add(this.removedAnnotation);
    }
  }
}

// ─── Remove multiple ─────────────────────────────────────────────────────────

export class RemoveAnnotationsCommand implements Command {
  readonly label = 'Delete annotations';
  private removed: Annotation[] = [];

  constructor(
    private readonly store: AnnotationStore,
    private readonly ids: ReadonlyArray<string>,
  ) {}

  execute(): void {
    this.removed = [];
    for (const id of this.ids) {
      const a = this.store.getById(id);
      if (a) { this.removed.push(a); this.store.remove(id); }
    }
  }

  undo(): void {
    for (const a of [...this.removed].reverse()) {
      this.store.add(a);
    }
  }
}

// ─── Update (generic property change) ────────────────────────────────────────

export class UpdateAnnotationCommand implements Command {
  readonly label: string;
  private before: Annotation | null = null;

  constructor(
    private readonly store: AnnotationStore,
    private readonly id: string,
    private readonly patch: Partial<Annotation>,
    label?: string,
  ) {
    this.label = label ?? 'Update annotation';
  }

  execute(): void {
    const current = this.store.getById(this.id);
    if (!current) return;
    this.before = current;
    this.store.update(this.id, this.patch);
  }

  undo(): void {
    if (this.before) {
      this.store.replace(this.before);
    }
  }
}

// ─── Move (nudge / drag) ──────────────────────────────────────────────────────

export class MoveAnnotationsCommand implements Command {
  readonly label = 'Move annotation';
  private originalPositions = new Map<string, Annotation>();

  constructor(
    private readonly store: AnnotationStore,
    private readonly ids: ReadonlyArray<string>,
    private dx: number,
    private dy: number,
  ) {}

  execute(): void {
    for (const id of this.ids) {
      const a = this.store.getById(id);
      if (!a) continue;
      this.originalPositions.set(id, a);
      this.store.replace(translateAnnotation(a, this.dx, this.dy));
    }
  }

  undo(): void {
    for (const [id, original] of this.originalPositions) {
      this.store.replace(original);
    }
  }

  /** Accumulate small nudge steps into a single undo entry */
  mergeWith(previous: Command): boolean {
    if (!(previous instanceof MoveAnnotationsCommand)) return false;
    if (!sameIds(previous.ids, this.ids)) return false;
    // Merge: absorb this delta into previous, keep previous.originalPositions
    previous.dx += this.dx;
    previous.dy += this.dy;
    // Re-execute the previous command with the new cumulative delta
    for (const [id, original] of previous.originalPositions) {
      this.store.replace(translateAnnotation(original, previous.dx, previous.dy));
    }
    return true;
  }
}

// ─── Resize ───────────────────────────────────────────────────────────────────

export class ResizeAnnotationCommand implements Command {
  readonly label = 'Resize annotation';
  private before: Annotation | null = null;

  constructor(
    private readonly store: AnnotationStore,
    private readonly after: Annotation,
  ) {}

  execute(): void {
    this.before = this.store.getById(this.after.id) ?? null;
    this.store.replace(this.after);
  }

  undo(): void {
    if (this.before) this.store.replace(this.before);
  }
}

// ─── Style change ─────────────────────────────────────────────────────────────

export class StyleAnnotationsCommand implements Command {
  readonly label = 'Change style';
  private before = new Map<string, Annotation>();

  constructor(
    private readonly store: AnnotationStore,
    private readonly ids: ReadonlyArray<string>,
    private readonly stylePatch: Partial<Annotation['style']>,
  ) {}

  execute(): void {
    for (const id of this.ids) {
      const a = this.store.getById(id);
      if (!a) continue;
      this.before.set(id, a);
      this.store.replace({
        ...a,
        style: { ...a.style, ...this.stylePatch },
        updatedAt: new Date().toISOString(),
      });
    }
  }

  undo(): void {
    for (const [_, original] of this.before) {
      this.store.replace(original);
    }
  }
}

// ─── Batch ────────────────────────────────────────────────────────────────────

/** Groups multiple commands into a single undo entry */
export class BatchCommand implements Command {
  constructor(
    readonly label: string,
    private readonly commands: ReadonlyArray<Command>,
  ) {}

  execute(): void { for (const c of this.commands) c.execute(); }
  undo(): void { for (const c of [...this.commands].reverse()) c.undo(); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sameIds(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every(id => setA.has(id));
}

/** Return a new annotation with all geometry translated by (dx, dy) */
function translateAnnotation(a: Annotation, dx: number, dy: number): Annotation {
  const { geometry } = a;
  let newGeometry: typeof geometry;

  switch (geometry.kind) {
    case 'rect':
      newGeometry = { kind: 'rect', rect: { ...geometry.rect, x: geometry.rect.x + dx, y: geometry.rect.y + dy } };
      break;
    case 'path': {
      const pts = geometry.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
      newGeometry = {
        kind: 'path',
        points: pts,
        closed: geometry.closed,
        bounds: { ...geometry.bounds, x: geometry.bounds.x + dx, y: geometry.bounds.y + dy },
      };
      break;
    }
    case 'point':
      newGeometry = { kind: 'point', point: { x: geometry.point.x + dx, y: geometry.point.y + dy } };
      break;
    case 'line':
      newGeometry = {
        kind: 'line',
        startPoint: { x: geometry.startPoint.x + dx, y: geometry.startPoint.y + dy },
        endPoint: { x: geometry.endPoint.x + dx, y: geometry.endPoint.y + dy },
        hasArrowHead: geometry.hasArrowHead,
        hasArrowTail: geometry.hasArrowTail,
      };
      break;
  }

  return { ...a, geometry: newGeometry, updatedAt: new Date().toISOString() };
}
