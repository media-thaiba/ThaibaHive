import { aiProvider } from "../ai/providers/provider-registry";
import { dlpSanitizer } from "../ai/guardrails/dlp-sanitizer";

export type VoiceIntentType =
  | "query_rag"
  | "navigate"
  | "approve_action"
  | "upload_document"
  | "create_task"
  | "summarize"
  | "general_chat";

export interface ClassifiedVoiceIntent {
  intent: VoiceIntentType;
  confidence: number;
  parameters: Record<string, any>;
  spokenResponse: string;
  suggestedAction?: {
    type: "client_navigation" | "open_modal" | "api_dispatch" | "none";
    payload?: any;
  };
}

export interface IntentClassificationRequest {
  transcript: string;
  context?: Record<string, any>;
  institutionId?: string;
}

export class IntentClassifier {
  /**
   * Fast-path deterministic classifier for common spoken campus navigation and commands.
   */
  private fastPathClassify(cleanText: string): ClassifiedVoiceIntent | null {
    const text = cleanText.toLowerCase();

    // 1. Navigation intents
    if (text.includes("go to") || text.includes("open") || text.includes("navigate to") || text.includes("show my")) {
      if (text.includes("dashboard") || text.includes("home")) {
        return {
          intent: "navigate",
          confidence: 0.98,
          parameters: { path: "/dashboard", title: "Dashboard" },
          spokenResponse: "Navigating to your dashboard.",
          suggestedAction: { type: "client_navigation", payload: { path: "/dashboard" } },
        };
      }
      if (text.includes("chat") || text.includes("message")) {
        return {
          intent: "navigate",
          confidence: 0.98,
          parameters: { path: "/chat", title: "Chat Center" },
          spokenResponse: "Opening your messages and chat channels.",
          suggestedAction: { type: "client_navigation", payload: { path: "/chat" } },
        };
      }
      if (text.includes("leave") || text.includes("time off")) {
        return {
          intent: "navigate",
          confidence: 0.98,
          parameters: { path: "/leaves", title: "Leaves" },
          spokenResponse: "Opening leave management.",
          suggestedAction: { type: "client_navigation", payload: { path: "/leaves" } },
        };
      }
      if (text.includes("timetable") || text.includes("schedule") || text.includes("classes")) {
        return {
          intent: "navigate",
          confidence: 0.98,
          parameters: { path: "/timetable", title: "Timetable" },
          spokenResponse: "Opening your class timetable.",
          suggestedAction: { type: "client_navigation", payload: { path: "/timetable" } },
        };
      }
    }

    // 2. Document upload intents
    if (text.includes("upload") || text.includes("scan receipt") || text.includes("scan medical") || text.includes("scan id")) {
      let docType = "general_document";
      if (text.includes("receipt") || text.includes("fee")) docType = "fee_receipt";
      if (text.includes("medical") || text.includes("sick")) docType = "medical_certificate";
      if (text.includes("id card") || text.includes("student id")) docType = "identity_card";

      return {
        intent: "upload_document",
        confidence: 0.95,
        parameters: { documentType: docType },
        spokenResponse: `Opening document capture for ${docType.replace("_", " ")}.`,
        suggestedAction: { type: "open_modal", payload: { modal: "document_upload", documentType: docType } },
      };
    }

    // 3. Approval actions
    if (text.includes("approve leave") || text.includes("reject leave") || text.includes("approve purchase")) {
      const isApprove = text.includes("approve");
      return {
        intent: "approve_action",
        confidence: 0.92,
        parameters: {
          action: isApprove ? "approve" : "reject",
          targetType: text.includes("leave") ? "leave_request" : "purchase_request",
        },
        spokenResponse: isApprove
          ? "Ready to approve the request. Please confirm."
          : "Ready to reject the request. Please confirm.",
        suggestedAction: { type: "open_modal", payload: { modal: "approval_confirm" } },
      };
    }

    // 4. Policy / Knowledge RAG questions
    if (
      text.includes("what is the policy") ||
      text.includes("how many leaves") ||
      text.includes("exam guidelines") ||
      text.includes("fee structure") ||
      text.includes("circular")
    ) {
      return {
        intent: "query_rag",
        confidence: 0.92,
        parameters: { query: cleanText },
        spokenResponse: "Searching campus policies and circulars.",
        suggestedAction: { type: "api_dispatch", payload: { endpoint: "/api/ai/rag/query", query: cleanText } },
      };
    }

    return null;
  }

  public async classify(request: IntentClassificationRequest): Promise<ClassifiedVoiceIntent> {
    const rawTranscript = request.transcript || "";
    const sanitized = dlpSanitizer.sanitizeInput(rawTranscript).sanitizedText;

    if (!sanitized || sanitized.trim() === "") {
      return {
        intent: "general_chat",
        confidence: 0.5,
        parameters: {},
        spokenResponse: "I'm listening. How can I help you today?",
        suggestedAction: { type: "none" },
      };
    }

    // Check fast-path heuristics
    const fastPath = this.fastPathClassify(sanitized);
    if (fastPath) {
      return fastPath;
    }

    // LLM-based structured intent extraction
    const prompt = `
Analyze the following campus voice transcript and classify the intent into one of:
["query_rag", "navigate", "approve_action", "upload_document", "create_task", "summarize", "general_chat"]

Transcript: "${sanitized}"
Session Context: ${JSON.stringify(request.context || {})}
`;

    const schema = {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: ["query_rag", "navigate", "approve_action", "upload_document", "create_task", "summarize", "general_chat"],
        },
        confidence: { type: "number" },
        parameters: { type: "object" },
        spokenResponse: { type: "string" },
        actionType: {
          type: "string",
          enum: ["client_navigation", "open_modal", "api_dispatch", "none"],
        },
      },
      required: ["intent", "confidence", "spokenResponse"],
    };

    try {
      const response = await aiProvider.generateStructured<{
        intent: VoiceIntentType;
        confidence: number;
        parameters?: Record<string, any>;
        spokenResponse: string;
        actionType?: "client_navigation" | "open_modal" | "api_dispatch" | "none";
      }>({
        prompt,
        systemInstruction: "You are an intelligent campus copilot voice intent classifier. Provide concise spoken voice responses suitable for text-to-speech output.",
        schema,
        modelTier: "fast",
        institutionId: request.institutionId,
      });

      const data = response.data;
      return {
        intent: data.intent || "general_chat",
        confidence: data.confidence || 0.85,
        parameters: data.parameters || {},
        spokenResponse: data.spokenResponse || "I've processed your request.",
        suggestedAction: {
          type: data.actionType || "none",
          payload: data.parameters,
        },
      };
    } catch {
      // Fallback response on error
      return {
        intent: "general_chat",
        confidence: 0.75,
        parameters: { query: sanitized },
        spokenResponse: `I heard: "${sanitized}". How would you like me to assist with this?`,
        suggestedAction: { type: "none" },
      };
    }
  }
}

export const intentClassifier = new IntentClassifier();
