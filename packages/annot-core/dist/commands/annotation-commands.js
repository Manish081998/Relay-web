/**
 * @file annotation-commands.ts
 * Concrete Command implementations for all annotation mutations.
 *
 * Pattern: each command holds a reference to the AnnotationStore
 * and the before/after state snapshots it needs to invert itself.
 * Annotations are treated as immutable value objects.
 */
// ─── Add ─────────────────────────────────────────────────────────────────────
export class AddAnnotationCommand {
    store;
    annotation;
    label;
    constructor(store, annotation) {
        this.store = store;
        this.annotation = annotation;
        this.label = `Add ${annotation.type}`;
    }
    execute() { this.store.add(this.annotation); }
    undo() { this.store.remove(this.annotation.id); }
}
// ─── Remove ──────────────────────────────────────────────────────────────────
export class RemoveAnnotationCommand {
    store;
    id;
    label;
    removedAnnotation = null;
    constructor(store, id) {
        this.store = store;
        this.id = id;
        this.label = 'Delete annotation';
    }
    execute() {
        this.removedAnnotation = this.store.getById(this.id) ?? null;
        if (this.removedAnnotation) {
            this.store.remove(this.id);
        }
    }
    undo() {
        if (this.removedAnnotation) {
            this.store.add(this.removedAnnotation);
        }
    }
}
// ─── Remove multiple ─────────────────────────────────────────────────────────
export class RemoveAnnotationsCommand {
    store;
    ids;
    label = 'Delete annotations';
    removed = [];
    constructor(store, ids) {
        this.store = store;
        this.ids = ids;
    }
    execute() {
        this.removed = [];
        for (const id of this.ids) {
            const a = this.store.getById(id);
            if (a) {
                this.removed.push(a);
                this.store.remove(id);
            }
        }
    }
    undo() {
        for (const a of [...this.removed].reverse()) {
            this.store.add(a);
        }
    }
}
// ─── Update (generic property change) ────────────────────────────────────────
export class UpdateAnnotationCommand {
    store;
    id;
    patch;
    label;
    before = null;
    constructor(store, id, patch, label) {
        this.store = store;
        this.id = id;
        this.patch = patch;
        this.label = label ?? 'Update annotation';
    }
    execute() {
        const current = this.store.getById(this.id);
        if (!current)
            return;
        this.before = current;
        this.store.update(this.id, this.patch);
    }
    undo() {
        if (this.before) {
            this.store.replace(this.before);
        }
    }
}
// ─── Move (nudge / drag) ──────────────────────────────────────────────────────
export class MoveAnnotationsCommand {
    store;
    ids;
    dx;
    dy;
    label = 'Move annotation';
    originalPositions = new Map();
    constructor(store, ids, dx, dy) {
        this.store = store;
        this.ids = ids;
        this.dx = dx;
        this.dy = dy;
    }
    execute() {
        for (const id of this.ids) {
            const a = this.store.getById(id);
            if (!a)
                continue;
            this.originalPositions.set(id, a);
            this.store.replace(translateAnnotation(a, this.dx, this.dy));
        }
    }
    undo() {
        for (const [id, original] of this.originalPositions) {
            this.store.replace(original);
        }
    }
    /** Accumulate small nudge steps into a single undo entry */
    mergeWith(previous) {
        if (!(previous instanceof MoveAnnotationsCommand))
            return false;
        if (!sameIds(previous.ids, this.ids))
            return false;
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
export class ResizeAnnotationCommand {
    store;
    after;
    label = 'Resize annotation';
    before = null;
    constructor(store, after) {
        this.store = store;
        this.after = after;
    }
    execute() {
        this.before = this.store.getById(this.after.id) ?? null;
        this.store.replace(this.after);
    }
    undo() {
        if (this.before)
            this.store.replace(this.before);
    }
}
// ─── Style change ─────────────────────────────────────────────────────────────
export class StyleAnnotationsCommand {
    store;
    ids;
    stylePatch;
    label = 'Change style';
    before = new Map();
    constructor(store, ids, stylePatch) {
        this.store = store;
        this.ids = ids;
        this.stylePatch = stylePatch;
    }
    execute() {
        for (const id of this.ids) {
            const a = this.store.getById(id);
            if (!a)
                continue;
            this.before.set(id, a);
            this.store.replace({
                ...a,
                style: { ...a.style, ...this.stylePatch },
                updatedAt: new Date().toISOString(),
            });
        }
    }
    undo() {
        for (const [_, original] of this.before) {
            this.store.replace(original);
        }
    }
}
// ─── Batch ────────────────────────────────────────────────────────────────────
/** Groups multiple commands into a single undo entry */
export class BatchCommand {
    label;
    commands;
    constructor(label, commands) {
        this.label = label;
        this.commands = commands;
    }
    execute() { for (const c of this.commands)
        c.execute(); }
    undo() { for (const c of [...this.commands].reverse())
        c.undo(); }
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function sameIds(a, b) {
    if (a.length !== b.length)
        return false;
    const setA = new Set(a);
    return b.every(id => setA.has(id));
}
/** Return a new annotation with all geometry translated by (dx, dy) */
function translateAnnotation(a, dx, dy) {
    const { geometry } = a;
    let newGeometry;
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
//# sourceMappingURL=annotation-commands.js.map