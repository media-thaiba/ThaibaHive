import {
  IChatProvider,
  IEmbeddingProvider,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  StructuredRequest,
} from "./contracts";

export class GeminiProvider implements IChatProvider, IEmbeddingProvider {
  readonly id = "gemini" as const;
  readonly dimension = 1536;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
    this.baseUrl = baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  }

  private getModelName(tier?: "fast" | "reasoning" | "vision"): string {
    switch (tier) {
      case "reasoning":
        return "gemini-2.5-pro";
      case "vision":
        return "gemini-2.5-flash";
      case "fast":
      default:
        return "gemini-2.5-flash";
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = this.getModelName(request.modelTier);
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    const systemMessage = request.messages.find((m) => m.role === "system");
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, any> = {
      contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
        responseMimeType: request.responseMimeType,
        responseSchema: request.responseSchema,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (!this.apiKey) {
      // Mock / Offline development mode fallback
      const prompt = request.messages[request.messages.length - 1]?.content || "";
      return {
        content: `[Gemini Offline Mock] Response to: "${prompt.slice(0, 50)}..."`,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: 25,
        model,
        provider: "gemini",
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join("") || "";
    const usageMetadata = data.usageMetadata || {};

    return {
      content: text,
      inputTokens: usageMetadata.promptTokenCount || Math.ceil(JSON.stringify(request.messages).length / 4),
      outputTokens: usageMetadata.candidatesTokenCount || Math.ceil(text.length / 4),
      cachedTokens: usageMetadata.cachedContentTokenCount || 0,
      model,
      provider: "gemini",
      finishReason: candidate?.finishReason,
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const model = this.getModelName(request.modelTier);
    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const systemMessage = request.messages.find((m) => m.role === "system");
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, any> = {
      contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (!this.apiKey) {
      // Mock stream for test/offline environments
      const fullText = "[Gemini Offline Mock] Streaming response token by token.";
      const words = fullText.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield {
          delta: (i > 0 ? " " : "") + words[i],
          isComplete: i === words.length - 1,
          usage: i === words.length - 1 ? { inputTokens: 10, outputTokens: words.length } : undefined,
        };
      }
      return;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Stream error (${res.status}): ${errorText}`);
    }

    if (!res.body) throw new Error("No response body available for streaming");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.replace(/^data: /, "");
          try {
            const data = JSON.parse(jsonStr);
            const textDelta = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
            const isFinish = Boolean(data.candidates?.[0]?.finishReason);

            yield {
              delta: textDelta,
              isComplete: isFinish,
              usage: data.usageMetadata
                ? {
                    inputTokens: data.usageMetadata.promptTokenCount || 0,
                    outputTokens: data.usageMetadata.candidatesTokenCount || 0,
                    cachedTokens: data.usageMetadata.cachedContentTokenCount || 0,
                  }
                : undefined,
            };
          } catch {
            // Ignore parse errors on partial SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateStructured<T>(request: StructuredRequest<T>): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    const model = this.getModelName(request.modelTier || "vision");
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    const parts: any[] = [{ text: request.prompt }];

    if (request.imageBuffer && request.imageMimeType) {
      parts.unshift({
        inlineData: {
          mimeType: request.imageMimeType,
          data: request.imageBuffer.toString("base64"),
        },
      });
    }

    const body: Record<string, any> = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: request.schema,
      },
    };

    if (request.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: request.systemInstruction }],
      };
    }

    if (!this.apiKey) {
      // Mock structured data fallback
      return {
        data: {} as T,
        usage: { inputTokens: 50, outputTokens: 20 },
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Structured Generation error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "{}";
    const usageMetadata = data.usageMetadata || {};

    const parsedData = JSON.parse(rawText) as T;
    return {
      data: parsedData,
      usage: {
        inputTokens: usageMetadata.promptTokenCount || Math.ceil(request.prompt.length / 4),
        outputTokens: usageMetadata.candidatesTokenCount || Math.ceil(rawText.length / 4),
      },
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      // Mock 1536-dim normalized float vectors
      return texts.map(() => Array.from({ length: 1536 }, () => Math.random() * 0.05));
    }

    const url = `${this.baseUrl}/models/text-embedding-004:batchEmbedContents?key=${this.apiKey}`;
    const requests = texts.map((text) => ({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
      outputDimensionality: 1536,
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Embedding error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return (data.embeddings || []).map((e: any) => e.values);
  }
}
