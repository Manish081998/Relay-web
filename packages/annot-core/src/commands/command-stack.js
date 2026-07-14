/**
 * @file command-stack.ts
 * Undo/redo stack with configurable depth.
 *
 * Rules:
 * - Executing a new command clears the redo stack.
 * - Commands may opt-in to merge with the previous command.
 * - Stack is capped at MAX_HISTORY_SIZE to prevent memory leaks.
 */
import { TypedEventEmitter } from '../events/event-emitter.js';
export const DEFAULT_MAX_HISTORY = 100;
export class CommandStack {
    maxHistory;
    undoStack = [];
    redoStack = [];
    emitter = new TypedEventEmitter();
    isExecuting = false;
    constructor(maxHistory = DEFAULT_MAX_HISTORY) {
        this.maxHistory = maxHistory;
    }
    // ─── Public API ──────────────────────────────────────────────────────────
    /** Execute a command and push it onto the undo stack */
    execute(cmd) {
        if (this.isExecuting) {
            throw new Error('CommandStack: nested execute() calls are not allowed');
        }
        this.isExecuting = true;
        try {
            cmd.execute();
        }
        finally {
            this.isExecuting = false;
        }
        // Attempt merge with top of undo stack
        if (this.undoStack.length > 0 &&
            cmd.mergeWith !== undefined &&
            cmd.mergeWith(this.undoStack[this.undoStack.length - 1])) {
            // Command merged itself into the previous one; do not push again
        }
        else {
            this.undoStack.push(cmd);
            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift(); // drop oldest
            }
        }
        // Any new action clears redo stack
        this.redoStack.length = 0;
        this.notify();
    }
    undo() {
        if (!this.canUndo)
            return;
        const cmd = this.undoStack.pop();
        cmd.undo();
        this.redoStack.push(cmd);
        this.notify();
    }
    redo() {
        if (!this.canRedo)
            return;
        const cmd = this.redoStack.pop();
        cmd.execute();
        this.undoStack.push(cmd);
        this.notify();
    }
    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
    get undoLabel() {
        return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].label : null;
    }
    get redoLabel() {
        return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1].label : null;
    }
    /** Subscribe to state changes (useful for toolbar enable/disable) */
    on(listener) {
        return this.emitter.on('change', listener);
    }
    /** Clear all history (e.g. after document close) */
    clear() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
        this.notify();
    }
    getState() {
        return {
            canUndo: this.canUndo,
            canRedo: this.canRedo,
            undoLabel: this.undoLabel,
            redoLabel: this.redoLabel,
            historyDepth: this.undoStack.length,
        };
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    notify() {
        this.emitter.emit('change', this.getState());
    }
}
//# sourceMappingURL=command-stack.js.map