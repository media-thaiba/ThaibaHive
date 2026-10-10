import { intentClassifier } from "../intent-classifier";

describe("IntentClassifier", () => {
  it("classifies dashboard navigation via fast-path", async () => {
    const result = await intentClassifier.classify({
      transcript: "Please go to my dashboard",
    });

    expect(result.intent).toBe("navigate");
    expect(result.parameters.path).toBe("/dashboard");
    expect(result.suggestedAction?.type).toBe("client_navigation");
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies document scanning intent via fast-path", async () => {
    const result = await intentClassifier.classify({
      transcript: "Open camera and scan receipt for student fees",
    });

    expect(result.intent).toBe("upload_document");
    expect(result.parameters.documentType).toBe("fee_receipt");
    expect(result.suggestedAction?.type).toBe("open_modal");
  });

  it("classifies approval actions via fast-path", async () => {
    const result = await intentClassifier.classify({
      transcript: "Approve leave request for Ayaan",
    });

    expect(result.intent).toBe("approve_action");
    expect(result.parameters.action).toBe("approve");
    expect(result.parameters.targetType).toBe("leave_request");
  });

  it("classifies campus policy queries", async () => {
    const result = await intentClassifier.classify({
      transcript: "What is the policy for staff emergency leaves?",
    });

    expect(result.intent).toBe("query_rag");
    expect(result.suggestedAction?.type).toBe("api_dispatch");
  });
});
