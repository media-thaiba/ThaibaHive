import {
  IChatProvider,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  StructuredRequest,
} from "./contracts";

export class VertexProvider implements IChatProvider {
  readonly id = "vertex" as const;

  private projectId: string;
  private location: string;
  private accessToken: string;

  constructor(projectId?: string, location?: string, accessToken?: string) {
    this.projectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || "thaibahive-prod";
    this.location = location || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    this.accessToken = accessToken || process.env.VERTEX_AI_TOKEN || "";
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.accessToken) {
      const prompt = request.messages[request.messages.length - 1]?.content || "";
      return {
        content: `[Vertex AI Mock] Response to: "${prompt.slice(0, 50)}..."`,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: 30,
        model: "gemini-1.5-pro-preview",
        provider: "vertex",
      };
    }

    const model = request.modelTier === "reasoning" ? "gemini-1.5-pro" : "gemini-1.5-flash";
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`;

    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) {
      throw new Error(`Vertex AI error (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      content: text,
      inputTokens: data.usageMetadata?.promptTokenCount || 20,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 20,
      model,
      provider: "vertex",
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const res = await this.chat(request);
    yield {
      delta: res.content,
      isComplete: true,
      usage: { inputTokens: res.inputTokens, outputTokens: res.outputTokens },
    };
  }

  async generateStructured<T>(request: StructuredRequest<T>): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    const res = await this.chat({
      messages: [{ role: "user", content: `${request.prompt}\n\nReturn JSON conforming to: ${JSON.stringify(request.schema)}` }],
      responseMimeType: "application/json",
    });

    try {
      return {
        data: JSON.parse(res.content) as T,
        usage: { inputTokens: res.inputTokens, outputTokens: res.outputTokens },
      };
    } catch {
      return {
        data: {} as T,
        usage: { inputTokens: 10, outputTokens: 10 },
      };
    }
  }
}
