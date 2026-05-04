/**
 * @file annotation-commands.ts
 * Concrete Command implementations for all annotation mutations.
 *
 * Pattern: each command holds a reference to the AnnotationStore
 * and the before/after state snapshots it needs to invert itself.
 * Annotations are treated as immutable value objects.
 */
import type { Command } from './command.interface.js';
import type { Annotation } from '../model/annotation.model.js';
import type { AnnotationStore } from '../store/annotation-store.js';
export declare class AddAnnotationCommand implements Command {
    private readonly store;
    private readonly annotation;
    readonly label: string;
    constructor(store: AnnotationStore, annotation: Annotation);
    execute(): void;
    undo(): void;
}
export declare class RemoveAnnotationCommand implements Command {
    private readonly store;
    private readonly id;
    readonly label: string;
    private removedAnnotation;
    constructor(store: AnnotationStore, id: string);
    execute(): void;
    undo(): void;
}
export declare class RemoveAnnotationsCommand implements Command {
    private readonly store;
    private readonly ids;
    readonly label = "Delete annotations";
    private removed;
    constructor(store: AnnotationStore, ids: ReadonlyArray<string>);
    execute(): void;
    undo(): void;
}
export declare class UpdateAnnotationCommand implements Command {
    private readonly store;
    private readonly id;
    private readonly patch;
    readonly label: string;
    private before;
    constructor(store: AnnotationStore, id: string, patch: Partial<Annotation>, label?: string);
    execute(): void;
    undo(): void;
}
export declare class MoveAnnotationsCommand implements Command {
    private readonly store;
    private readonly ids;
    private dx;
    private dy;
    readonly label = "Move annotation";
    private originalPositions;
    constructor(store: AnnotationStore, ids: ReadonlyArray<string>, dx: number, dy: number);
    execute(): void;
    undo(): void;
    /** Accumulate small nudge steps into a single undo entry */
    mergeWith(previous: Command): boolean;
}
export declare class ResizeAnnotationCommand implements Command {
    private readonly store;
    private readonly after;
    readonly label = "Resize annotation";
    private before;
    constructor(store: AnnotationStore, after: Annotation);
    execute(): void;
    undo(): void;
}
export declare class StyleAnnotationsCommand implements Command {
    private readonly store;
    private readonly ids;
    private readonly stylePatch;
    readonly label = "Change style";
    private before;
    constructor(store: AnnotationStore, ids: ReadonlyArray<string>, stylePatch: Partial<Annotation['style']>);
    execute(): void;
    undo(): void;
}
/** Groups multiple commands into a single undo entry */
export declare class BatchCommand implements Command {
    readonly label: string;
    private readonly commands;
    constructor(label: string, commands: ReadonlyArray<Command>);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=annotation-commands.d.ts.map