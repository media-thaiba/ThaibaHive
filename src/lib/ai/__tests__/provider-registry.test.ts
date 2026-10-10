import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ProviderRegistry } from "../providers/provider-registry";
import { GeminiProvider } from "../providers/gemini-provider";
import { OllamaProvider } from "../providers/ollama-provider";
import { VertexProvider } from "../providers/vertex-provider";

describe("ProviderRegistry & Tiered Fallback Chain", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it("initializes Gemini as primary provider with 1536 embedding dimension", () => {
    expect(registry.id).toBe("gemini");
    expect(registry.dimension).toBe(1536);
  });

  it("resolves specific provider overrides correctly", () => {
    expect(registry.getProvider("gemini")).toBeInstanceOf(GeminiProvider);
    expect(registry.getProvider("ollama")).toBeInstanceOf(OllamaProvider);
    expect(registry.getProvider("vertex")).toBeInstanceOf(VertexProvider);
  });

  it("handles chat execution in mock/offline mode gracefully", async () => {
    const response = await registry.chat({
      messages: [{ role: "user", content: "What is the fee policy?" }],
    });

    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    expect(response.inputTokens).toBeGreaterThan(0);
    expect(response.outputTokens).toBeGreaterThan(0);
  });

  it("streams chat chunks asynchronously with delta and completion flag", async () => {
    const stream = registry.chatStream({
      messages: [{ role: "user", content: "Explain attendance requirements" }],
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].isComplete).toBe(true);
  });

  it("generates structured data matching JSON schema", async () => {
    const result = await registry.generateStructured({
      prompt: "Extract name: Alice, age: 10",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
      },
    });

    expect(result).toBeDefined();
    expect(result.usage).toBeDefined();
    expect(result.usage.inputTokens).toBeGreaterThan(0);
  });

  it("embeds texts into standard 1536-dimensional vectors", async () => {
    const embeddings = await registry.embed(["Academic Calendar", "Leave Policy"]);

    expect(embeddings.length).toBe(2);
    expect(embeddings[0].length).toBe(1536);
    expect(embeddings[1].length).toBe(1536);
  });
});
