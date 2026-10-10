export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelTier?: "fast" | "reasoning" | "vision";
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, any>;
  institutionId?: string;
}

export interface ChatResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  model: string;
  provider: string;
  finishReason?: string;
}

export interface ChatStreamChunk {
  delta: string;
  isComplete: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
  };
}

export interface StructuredRequest<T = any> {
  prompt: string;
  systemInstruction?: string;
  schema: Record<string, any>;
  modelTier?: "fast" | "reasoning" | "vision";
  imageBuffer?: Buffer;
  imageMimeType?: string;
  institutionId?: string;
  initialData?: Partial<T>;
}

export interface IChatProvider {
  readonly id: "gemini" | "ollama" | "vertex";
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
  generateStructured<T>(request: StructuredRequest<T>): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }>;
}

export interface IEmbeddingProvider {
  readonly id: string;
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface TranscriptionResult {
  transcript: string;
  confidence?: number;
  durationSeconds?: number;
  language?: string;
  words?: Array<{ word: string; startMs: number; endMs: number }>;
}

export interface ISpeechToTextProvider {
  readonly id: string;
  transcribe(request: { audioBuffer: Buffer; mimeType: string; language?: string; institutionId?: string }): Promise<TranscriptionResult>;
}

export interface ITextToSpeechProvider {
  readonly id: string;
  synthesize(request: { text: string; voiceId?: string; speed?: number; pitch?: number; format?: string; institutionId?: string }): Promise<{ audioBuffer: Buffer; durationMs?: number }>;
}
