import { ragCorpusIngestSchema, ragQuerySchema } from "@/lib/validation/schemas";

describe("RAG Validation Schemas", () => {
  describe("ragCorpusIngestSchema", () => {
    it("should validate valid corpus ingest", () => {
      const validInput = {
        documents: [
          {
            content: "This is a test document about fee policies.",
            sourceType: "policy",
            sourceId: "fee-policy-2024",
            title: "Fee Policy 2024",
          },
        ],
      };

      const result = ragCorpusIngestSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject empty documents array", () => {
      const invalidInput = { documents: [] };
      const result = ragCorpusIngestSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject too many documents", () => {
      const documents = Array.from({ length: 51 }, (_, i) => ({
        content: `Document ${i}`,
        sourceType: "policy" as const,
        sourceId: `policy-${i}`,
        title: `Policy ${i}`,
      }));

      const result = ragCorpusIngestSchema.safeParse({ documents });
      expect(result.success).toBe(false);
    });

    it("should reject invalid sourceType", () => {
      const invalidInput = {
        documents: [
          {
            content: "Test",
            sourceType: "invalid-type",
            sourceId: "test-1",
            title: "Test",
          },
        ],
      };

      const result = ragCorpusIngestSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("ragQuerySchema", () => {
    it("should validate valid query", () => {
      const validInput = {
        query: "What is the fee policy?",
        topK: 10,
        vectorWeight: 0.6,
        keywordWeight: 0.4,
        sourceTypes: ["policy", "circular"],
        minScore: 0.1,
      };

      const result = ragQuerySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should use defaults when optional fields omitted", () => {
      const minimalInput = { query: "test query" };
      const result = ragQuerySchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topK).toBe(10);
        expect(result.data.vectorWeight).toBe(0.6);
      }
    });

    it("should reject empty query", () => {
      const result = ragQuerySchema.safeParse({ query: "" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid weight values", () => {
      const invalidInput = { query: "test", vectorWeight: 1.5 };
      const result = ragQuerySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});