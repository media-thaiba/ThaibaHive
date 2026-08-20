import { DialogManager, DialogTurnResponse } from './dialog-manager';
import { HumanHandoffManager } from './human-handoff';

export class ChatGateway {
  private static instance: ChatGateway;
  private dialogManager: DialogManager;
  private handoffManager: HumanHandoffManager;

  private constructor() {
    this.dialogManager = DialogManager.getInstance();
    this.handoffManager = HumanHandoffManager.getInstance();
  }

  public static getInstance(): ChatGateway {
    if (!ChatGateway.instance) {
      ChatGateway.instance = new ChatGateway();
    }
    return ChatGateway.instance;
  }

  public async handleInboundMessage(
    sessionId: string,
    stakeholderId: string,
    messageText: string,
    institutionId = 'global'
  ): Promise<DialogTurnResponse> {
    const response = await this.dialogManager.processUserMessage(
      sessionId,
      stakeholderId,
      messageText,
      institutionId
    );

    if (response.sessionStatus === 'agent_pending') {
      await this.handoffManager.escalateSession(
        sessionId,
        stakeholderId,
        'Stakeholder requested human counselor or low confidence intent match',
        0,
        institutionId
      );
    }

    return response;
  }
}
