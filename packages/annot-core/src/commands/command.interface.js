/**
 * @file command.interface.ts
 * Command pattern interfaces for the undo/redo stack.
 *
 * Every user action that modifies annotation data must be
 * expressed as a Command so that it can be reversed.
 */
/** A no-op that satisfies the interface (useful as null-object) */
export class NullCommand {
    label = 'noop';
    execute() { }
    undo() { }
}
//# sourceMappingURL=command.interface.js.map