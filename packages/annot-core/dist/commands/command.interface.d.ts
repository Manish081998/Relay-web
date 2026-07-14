/**
 * @file command.interface.ts
 * Command pattern interfaces for the undo/redo stack.
 *
 * Every user action that modifies annotation data must be
 * expressed as a Command so that it can be reversed.
 */
/** A reversible action */
export interface Command {
    /** Human-readable label shown in undo/redo history UI */
    readonly label: string;
    /** Apply the action */
    execute(): void;
    /** Reverse the action */
    undo(): void;
    /**
     * Optionally merge this command with the previous one on the stack
     * (e.g. accumulate small nudge steps into one undo entry).
     * Return true if merged (this command should NOT be pushed separately).
     */
    mergeWith?(previous: Command): boolean;
}
/** A no-op that satisfies the interface (useful as null-object) */
export declare class NullCommand implements Command {
    readonly label = "noop";
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=command.interface.d.ts.map