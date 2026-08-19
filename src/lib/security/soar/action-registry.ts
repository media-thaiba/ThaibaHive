/**
 * SOAR Action Registry
 * Sprint-040 — Action Handler Registration & Lookup
 */

import { SoarActionHandler } from './soar-types';

export class ActionRegistry {
  private static instance: ActionRegistry;
  private actions: Map<string, SoarActionHandler> = new Map();

  private constructor() {}

  public static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  public registerAction<TParams = any, TOutput = any>(handler: SoarActionHandler<TParams, TOutput>): void {
    if (!handler.name) {
      throw new Error('Action handler must have a valid name');
    }
    this.actions.set(handler.name, handler);
  }

  public getAction(name: string): SoarActionHandler | undefined {
    return this.actions.get(name);
  }

  public hasAction(name: string): boolean {
    return this.actions.has(name);
  }

  public listActions(): { name: string; description?: string; hasCompensate: boolean }[] {
    return Array.from(this.actions.values()).map(action => ({
      name: action.name,
      description: action.description,
      hasCompensate: typeof action.compensate === 'function',
    }));
  }

  public clear(): void {
    this.actions.clear();
  }
}

export const actionRegistry = ActionRegistry.getInstance();
