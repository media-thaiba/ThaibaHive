import { randomUUID } from "crypto";

export interface PendingVoiceAction {
  id: string;
  actionType: string;
  params: Record<string, string>;
  prompt: string;
  createdAt: number;
}

export class VoiceFeedbackLoop {
  private static instance: VoiceFeedbackLoop;
  private pendingActions: Map<string, {
    action: PendingVoiceAction;
    resolve: (confirmed: boolean) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  private constructor() {}

  public static getInstance(): VoiceFeedbackLoop {
    if (!VoiceFeedbackLoop.instance) {
      VoiceFeedbackLoop.instance = new VoiceFeedbackLoop();
    }
    return VoiceFeedbackLoop.instance;
  }

  public async requestConfirmation(
    actionType: string,
    params: Record<string, string>,
    promptText?: string
  ): Promise<{ id: string; prompt: string; confirmationPromise: Promise<boolean> }> {
    const id = randomUUID();
    const prompt = promptText || `Are you sure you want to execute ${actionType.replace("_", " ")}? Please say confirm to proceed.`;
    
    const confirmationPromise = new Promise<boolean>((resolve) => {
      // 10 seconds timeout auto-rejection
      const timeout = setTimeout(() => {
        this.resolveAction(id, false);
      }, 10000);

      this.pendingActions.set(id, {
        action: { id, actionType, params, prompt, createdAt: Date.now() },
        resolve,
        timeout,
      });
    });

    return {
      id,
      prompt,
      confirmationPromise,
    };
  }

  public handleResponse(actionId: string, voiceInput: string): boolean {
    const entry = this.pendingActions.get(actionId);
    if (!entry) return false;

    const clean = voiceInput.toLowerCase().trim();
    
    // Positive responses
    if (
      clean === "confirm" ||
      clean === "yes" ||
      clean === "proceed" ||
      clean === "confirm failover" ||
      clean.includes("confirm")
    ) {
      this.resolveAction(actionId, true);
      return true;
    }

    // Negative / Abort responses
    if (
      clean === "cancel" ||
      clean === "no" ||
      clean === "abort" ||
      clean.includes("cancel") ||
      clean.includes("abort")
    ) {
      this.resolveAction(actionId, false);
      return true;
    }

    return false;
  }

  private resolveAction(id: string, confirmed: boolean): void {
    const entry = this.pendingActions.get(id);
    if (entry) {
      clearTimeout(entry.timeout);
      this.pendingActions.delete(id);
      entry.resolve(confirmed);
    }
  }

  public getPendingActions(): PendingVoiceAction[] {
    return Array.from(this.pendingActions.values()).map((e) => e.action);
  }

  public clear(): void {
    for (const entry of this.pendingActions.values()) {
      clearTimeout(entry.timeout);
      entry.resolve(false);
    }
    this.pendingActions.clear();
  }
}
