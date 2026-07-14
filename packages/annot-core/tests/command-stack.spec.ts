/**
 * @file command-stack.spec.ts
 * Unit tests for the CommandStack (undo/redo engine).
 */

import { CommandStack } from '../src/commands/command-stack';
import type { Command } from '../src/commands/command.interface';

/** Simple test command that tracks call counts */
class CountingCommand implements Command {
  executeCount = 0;
  undoCount = 0;
  constructor(readonly label: string) {}
  execute(): void { this.executeCount++; }
  undo(): void { this.undoCount++; }
}

/** Command that throws during execute */
class FailingCommand implements Command {
  readonly label = 'fail';
  execute(): never { throw new Error('execute failed'); }
  undo(): void { /* nothing */ }
}

describe('CommandStack', () => {
  let stack: CommandStack;

  beforeEach(() => { stack = new CommandStack(10); });

  test('starts with empty state', () => {
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoLabel).toBeNull();
    expect(stack.redoLabel).toBeNull();
  });

  test('execute() calls execute on command', () => {
    const cmd = new CountingCommand('test');
    stack.execute(cmd);
    expect(cmd.executeCount).toBe(1);
  });

  test('after execute, canUndo is true', () => {
    stack.execute(new CountingCommand('a'));
    expect(stack.canUndo).toBe(true);
    expect(stack.undoLabel).toBe('a');
  });

  test('undo() calls undo on command and moves to redo', () => {
    const cmd = new CountingCommand('cmd');
    stack.execute(cmd);
    stack.undo();
    expect(cmd.undoCount).toBe(1);
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
    expect(stack.redoLabel).toBe('cmd');
  });

  test('redo() re-executes the command', () => {
    const cmd = new CountingCommand('cmd');
    stack.execute(cmd);
    stack.undo();
    stack.redo();
    expect(cmd.executeCount).toBe(2); // initial + redo
    expect(stack.canRedo).toBe(false);
  });

  test('new execute clears redo stack', () => {
    const a = new CountingCommand('a');
    const b = new CountingCommand('b');
    stack.execute(a);
    stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.execute(b);
    expect(stack.canRedo).toBe(false);
    expect(stack.canUndo).toBe(true);
    expect(stack.undoLabel).toBe('b');
  });

  test('stack is capped at maxHistory', () => {
    const smallStack = new CommandStack(3);
    for (let i = 0; i < 5; i++) {
      smallStack.execute(new CountingCommand(`cmd-${i}`));
    }
    // Only last 3 remain
    expect(smallStack.undoLabel).toBe('cmd-4');
    // Undo 3 times should exhaust the stack
    smallStack.undo(); smallStack.undo(); smallStack.undo();
    expect(smallStack.canUndo).toBe(false);
  });

  test('undo when canUndo is false is a no-op', () => {
    expect(() => stack.undo()).not.toThrow();
  });

  test('redo when canRedo is false is a no-op', () => {
    expect(() => stack.redo()).not.toThrow();
  });

  test('clear() empties both stacks', () => {
    stack.execute(new CountingCommand('a'));
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  test('on() listener fires on state changes', () => {
    const states: boolean[] = [];
    const unsub = stack.on(s => states.push(s.canUndo));
    stack.execute(new CountingCommand('x'));
    stack.undo();
    unsub();
    stack.execute(new CountingCommand('y')); // should not trigger after unsub
    expect(states).toEqual([true, false]);
  });

  test('failing execute does not push to undo stack', () => {
    expect(() => stack.execute(new FailingCommand())).toThrow();
    expect(stack.canUndo).toBe(false);
  });

  test('getState() returns consistent snapshot', () => {
    const cmd = new CountingCommand('snapshot');
    stack.execute(cmd);
    const state = stack.getState();
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
    expect(state.undoLabel).toBe('snapshot');
    expect(state.historyDepth).toBe(1);
  });

  test('merge – consecutive moves collapse into one undo', () => {
    class MergingCommand implements Command {
      accumulator = 0;
      constructor(readonly label: string, private delta: number) {}
      execute(): void { this.accumulator += this.delta; }
      undo(): void { this.accumulator -= this.delta; }
      mergeWith(prev: Command): boolean {
        if (!(prev instanceof MergingCommand)) return false;
        prev.delta += this.delta;
        prev.accumulator += this.delta;
        return true;
      }
    }

    const c1 = new MergingCommand('move', 1);
    const c2 = new MergingCommand('move', 1);
    const c3 = new MergingCommand('move', 1);
    stack.execute(c1);
    stack.execute(c2); // merges into c1
    stack.execute(c3); // merges into c1 again

    expect(stack.getState().historyDepth).toBe(1); // only one entry
    stack.undo();
    expect(stack.canUndo).toBe(false);
  });
});
