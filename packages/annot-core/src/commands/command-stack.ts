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
import { TypedEventEmitter } from '../events/event-emitter.js';

export const DEFAULT_MAX_HISTORY = 100;

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

export class CommandStack {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly emitter = new TypedEventEmitter<CommandStackEvents>();
  private isExecuting = false;

  constructor(private readonly maxHistory = DEFAULT_MAX_HISTORY) {}

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Execute a command and push it onto the undo stack */
  execute(cmd: Command): void {
    if (this.isExecuting) {
      throw new Error('CommandStack: nested execute() calls are not allowed');
    }
    this.isExecuting = true;
    try {
      cmd.execute();
    } finally {
      this.isExecuting = false;
    }

    // Attempt merge with top of undo stack
    if (
      this.undoStack.length > 0 &&
      cmd.mergeWith !== undefined &&
      cmd.mergeWith(this.undoStack[this.undoStack.length - 1])
    ) {
      // Command merged itself into the previous one; do not push again
    } else {
      this.undoStack.push(cmd);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift(); // drop oldest
      }
    }

    // Any new action clears redo stack
    this.redoStack.length = 0;
    this.notify();
  }

  undo(): void {
    if (!this.canUndo) return;
    const cmd = this.undoStack.pop()!;
    cmd.undo();
    this.redoStack.push(cmd);
    this.notify();
  }

  redo(): void {
    if (!this.canRedo) return;
    const cmd = this.redoStack.pop()!;
    cmd.execute();
    this.undoStack.push(cmd);
    this.notify();
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }

  get undoLabel(): string | null {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].label : null;
  }
  get redoLabel(): string | null {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1].label : null;
  }

  /** Subscribe to state changes (useful for toolbar enable/disable) */
  on(listener: (state: CommandStackState) => void): () => void {
    return this.emitter.on('change', listener);
  }

  /** Clear all history (e.g. after document close) */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notify();
  }

  getState(): CommandStackState {
    return {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoLabel: this.undoLabel,
      redoLabel: this.redoLabel,
      historyDepth: this.undoStack.length,
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private notify(): void {
    this.emitter.emit('change', this.getState());
  }
}
