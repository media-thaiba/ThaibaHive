export interface ReasoningToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ReasoningToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ReasoningRequest {
  prompt: string;
  systemPrompt?: string;
  tools?: ReasoningToolDefinition[];
  context?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
  tokenBudgetCap?: number; // v1.2: Per-run max token budget
  costBudgetUsd?: number;  // v1.2: Per-run max cost cap in USD
  institutionId?: string;
  traceId?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costEstimateUsd?: number;
}

export class TokenBudgetExceededError extends Error {
  constructor(message: string, public totalTokens: number, public budgetCap: number) {
    super(message);
    this.name = "TokenBudgetExceededError";
  }
}

export class CostBudgetExceededError extends Error {
  constructor(message: string, public totalCostUsd: number, public costCapUsd: number) {
    super(message);
    this.name = "CostBudgetExceededError";
  }
}

export interface ReasoningResponse {
  content: string;
  toolCalls?: ReasoningToolCall[];
  tokenUsage?: TokenUsage;
  cached?: boolean;
  provider: string;
  model: string;
}

export interface ReasoningPort {
  reason(request: ReasoningRequest): Promise<ReasoningResponse>;
}

export class StubReasoningPort implements ReasoningPort {
  private defaultResponse: ReasoningResponse;
  private cannedResponses: Map<string, ReasoningResponse> = new Map();
  private mockHandler?: (request: ReasoningRequest) => Promise<ReasoningResponse> | ReasoningResponse;

  constructor(defaultResponse?: Partial<ReasoningResponse>) {
    this.defaultResponse = {
      content: defaultResponse?.content || "Deterministic stub reasoning output.",
      toolCalls: defaultResponse?.toolCalls || [],
      tokenUsage: defaultResponse?.tokenUsage || { promptTokens: 10, completionTokens: 20, totalTokens: 30, costEstimateUsd: 0.0001 },
      provider: "stub",
      model: "stub-model-v1",
      cached: false,
    };
  }

  public setCannedResponse(promptSubstring: string, response: ReasoningResponse): void {
    this.cannedResponses.set(promptSubstring, response);
  }

  public setMockHandler(fn: (request: ReasoningRequest) => Promise<ReasoningResponse> | ReasoningResponse): void {
    this.mockHandler = fn;
  }

  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    let result: ReasoningResponse;
    if (this.mockHandler) {
      result = await this.mockHandler(request);
    } else {
      let matched: ReasoningResponse | undefined;
      for (const [key, response] of this.cannedResponses.entries()) {
        if (request.prompt.includes(key)) {
          matched = response;
          break;
        }
      }
      result = matched || this.defaultResponse;
    }

    if (request.tokenBudgetCap && result.tokenUsage && result.tokenUsage.totalTokens > request.tokenBudgetCap) {
      throw new TokenBudgetExceededError(
        `Token budget cap exceeded: used ${result.tokenUsage.totalTokens} tokens, cap is ${request.tokenBudgetCap}`,
        result.tokenUsage.totalTokens,
        request.tokenBudgetCap
      );
    }

    if (request.costBudgetUsd !== undefined && result.tokenUsage?.costEstimateUsd !== undefined && result.tokenUsage.costEstimateUsd > request.costBudgetUsd) {
      throw new CostBudgetExceededError(
        `Cost budget cap exceeded: estimated cost $${result.tokenUsage.costEstimateUsd.toFixed(4)}, cap is $${request.costBudgetUsd.toFixed(4)}`,
        result.tokenUsage.costEstimateUsd,
        request.costBudgetUsd
      );
    }

    return result;
  }
}

export class OllamaReasoningPort implements ReasoningPort {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private failureCount: number = 0;
  private maxConsecutiveFailures: number = 3;
  private circuitOpenUntil: number = 0;

  constructor(options?: { baseUrl?: string; model?: string; timeoutMs?: number }) {
    this.baseUrl = options?.baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    this.model = options?.model || process.env.OLLAMA_MODEL || "qwen2.5:latest";
    this.timeoutMs = options?.timeoutMs || 15000;
  }

  public isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    if (this.isCircuitOpen()) {
      throw new Error(`Circuit breaker open for OllamaReasoningPort until ${new Date(this.circuitOpenUntil).toISOString()}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...(request.systemPrompt ? [{ role: "system", content: request.systemPrompt }] : []),
            { role: "user", content: request.prompt },
          ],
          stream: false,
          options: {
            temperature: request.temperature ?? 0.2,
            num_predict: request.maxTokens ?? (request.tokenBudgetCap ? Math.min(2048, request.tokenBudgetCap) : 2048),
          },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.failureCount = 0; // reset circuit breaker on success

      const content = data.message?.content || "";
      const promptTokens = data.prompt_eval_count || 50;
      const completionTokens = data.eval_count || 100;
      const totalTokens = promptTokens + completionTokens;
      const costEstimateUsd = 0; // Local model has 0 direct API cost

      if (request.tokenBudgetCap && totalTokens > request.tokenBudgetCap) {
        throw new TokenBudgetExceededError(
          `Token budget cap exceeded: used ${totalTokens} tokens, cap is ${request.tokenBudgetCap}`,
          totalTokens,
          request.tokenBudgetCap
        );
      }

      if (request.costBudgetUsd !== undefined && costEstimateUsd > request.costBudgetUsd) {
        throw new CostBudgetExceededError(
          `Cost budget cap exceeded: estimated cost $${costEstimateUsd.toFixed(4)}, cap is $${request.costBudgetUsd.toFixed(4)}`,
          costEstimateUsd,
          request.costBudgetUsd
        );
      }

      return {
        content,
        tokenUsage: {
          promptTokens,
          completionTokens,
          totalTokens,
          costEstimateUsd,
        },
        provider: "ollama",
        model: this.model,
      };
    } catch (error) {
      clearTimeout(timeout);
      this.failureCount += 1;
      if (this.failureCount >= this.maxConsecutiveFailures) {
        this.circuitOpenUntil = Date.now() + 60000; // 60s cooldown
      }
      throw error;
    }
  }
}


export class FallbackReasoningChain implements ReasoningPort {
  private primary: ReasoningPort;
  private fallback: ReasoningPort;
  private onFallbackTriggered?: (error: any, request: ReasoningRequest) => void;

  constructor(primary: ReasoningPort, fallback: ReasoningPort, onFallbackTriggered?: (error: any, request: ReasoningRequest) => void) {
    this.primary = primary;
    this.fallback = fallback;
    this.onFallbackTriggered = onFallbackTriggered;
  }

  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    try {
      return await this.primary.reason(request);
    } catch (error) {
      if (this.onFallbackTriggered) {
        this.onFallbackTriggered(error, request);
      }
      return await this.fallback.reason(request);
    }
  }
}
