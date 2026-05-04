/**
 * @file command-stack.ts
 * Undo/redo stack with configurable depth.
 *
 * Rules:
 * - Executing a new command clears the redo stack.
 * - Commands may opt-in to merge with the previous command.
 * - Stack is capped at MAX_HISTORY_SIZE to prevent memory leaks.
 */
import type { Command } from './command.interface.js';
import type { EventMap } from '../events/event-emitter.js';
export declare const DEFAULT_MAX_HISTORY = 100;
export interface CommandStackEvents extends EventMap {
    change: CommandStackState;
}
export interface CommandStackState {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly undoLabel: string | null;
    readonly redoLabel: string | null;
    readonly historyDepth: number;
}
export declare class CommandStack {
    private readonly maxHistory;
    private readonly undoStack;
    private readonly redoStack;
    private readonly emitter;
    private isExecuting;
    constructor(maxHistory?: number);
    /** Execute a command and push it onto the undo stack */
    execute(cmd: Command): void;
    undo(): void;
    redo(): void;
    get canUndo(): boolean;
    get canRedo(): boolean;
    get undoLabel(): string | null;
    get redoLabel(): string | null;
    /** Subscribe to state changes (useful for toolbar enable/disable) */
    on(listener: (state: CommandStackState) => void): () => void;
    /** Clear all history (e.g. after document close) */
    clear(): void;
    getState(): CommandStackState;
    private notify;
}
//# sourceMappingURL=command-stack.d.ts.map