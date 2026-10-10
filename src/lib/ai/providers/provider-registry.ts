import {
  IChatProvider,
  IEmbeddingProvider,
  ISpeechToTextProvider,
  ITextToSpeechProvider,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  StructuredRequest,
} from "./contracts";
import { GeminiProvider } from "./gemini-provider";
import { OllamaProvider } from "./ollama-provider";
import { VertexProvider } from "./vertex-provider";
import { aiTokenTracker } from "../metering/token-tracker";

export class ProviderRegistry implements IChatProvider, IEmbeddingProvider {
  readonly id = "gemini" as const;
  readonly dimension = 1536;

  private gemini: GeminiProvider;
  private ollama: OllamaProvider;
  private vertex: VertexProvider;

  constructor() {
    this.gemini = new GeminiProvider();
    this.ollama = new OllamaProvider();
    this.vertex = new VertexProvider();
  }

  getProvider(override?: "gemini" | "ollama" | "vertex"): IChatProvider {
    if (override === "ollama") return this.ollama;
    if (override === "vertex") return this.vertex;
    return this.gemini;
  }

  getSpeechToTextProvider(): ISpeechToTextProvider {
    return this.gemini;
  }

  getTextToSpeechProvider(): ITextToSpeechProvider {
    return this.gemini;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const institutionId = request.institutionId;

    // Check token budget if institutionId is present
    if (institutionId) {
      const budgetCheck = await aiTokenTracker.checkBudget(institutionId);
      if (budgetCheck.isExhausted) {
        console.warn(`[AI Metering] Token budget exhausted for tenant ${institutionId}, failing over to local Ollama`);
        const fallbackRes = await this.ollama.chat(request);
        return fallbackRes;
      }
    }

    // Tier 1: Gemini Primary
    try {
      const res = await this.gemini.chat(request);
      if (institutionId) {
        await aiTokenTracker.recordUsage(institutionId, res.inputTokens, res.outputTokens, res.cachedTokens);
      }
      return res;
    } catch (err1: any) {
      console.warn(`[AI Fallback] Gemini primary chat failed: ${err1.message}. Attempting fast tier fallback.`);

      // Tier 2: Gemini Fast Tier
      try {
        const fastReq = { ...request, modelTier: "fast" as const };
        const res = await this.gemini.chat(fastReq);
        if (institutionId) {
          await aiTokenTracker.recordUsage(institutionId, res.inputTokens, res.outputTokens, res.cachedTokens);
        }
        return res;
      } catch (err2: any) {
        console.warn(`[AI Fallback] Gemini fast tier failed: ${err2.message}. Failing over to Local Ollama.`);

        // Tier 3: Local Ollama
        const fallbackRes = await this.ollama.chat(request);
        if (institutionId) {
          await aiTokenTracker.recordUsage(institutionId, fallbackRes.inputTokens, fallbackRes.outputTokens);
        }
        return fallbackRes;
      }
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const institutionId = request.institutionId;

    if (institutionId) {
      const budgetCheck = await aiTokenTracker.checkBudget(institutionId);
      if (budgetCheck.isExhausted) {
        yield* this.ollama.chatStream(request);
        return;
      }
    }

    try {
      for await (const chunk of this.gemini.chatStream(request)) {
        if (chunk.usage && institutionId) {
          await aiTokenTracker.recordUsage(
            institutionId,
            chunk.usage.inputTokens,
            chunk.usage.outputTokens,
            chunk.usage.cachedTokens
          );
        }
        yield chunk;
      }
    } catch (err) {
      console.warn(`[AI Fallback] Gemini stream failed, falling over to Ollama: ${err}`);
      yield* this.ollama.chatStream(request);
    }
  }

  async generateStructured<T>(request: StructuredRequest<T>): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    const institutionId = request.institutionId;

    try {
      const res = await this.gemini.generateStructured<T>(request);
      if (institutionId) {
        await aiTokenTracker.recordUsage(institutionId, res.usage.inputTokens, res.usage.outputTokens);
      }
      return res;
    } catch (err) {
      console.warn(`[AI Fallback] Gemini structured generation failed: ${err}. Falling over to Ollama.`);
      const res = await this.ollama.generateStructured<T>(request);
      if (institutionId) {
        await aiTokenTracker.recordUsage(institutionId, res.usage.inputTokens, res.usage.outputTokens);
      }
      return res;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.gemini.embed(texts);
    } catch (err) {
      console.warn(`[AI Fallback] Gemini embed failed: ${err}. Falling over to Ollama nomic-embed-text.`);
      return await this.ollama.embed(texts);
    }
  }
}

export const aiProvider = new ProviderRegistry();

export const embeddingProvider = {
  embed: (texts: string[]) => aiProvider.embed(texts),
  dimension: 1536,
};
