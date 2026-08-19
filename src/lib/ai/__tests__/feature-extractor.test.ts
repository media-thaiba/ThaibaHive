import { extractStudentFeatures } from "../feature-extractor";

describe("Sprint-008 Feature Extractor Pipeline", () => {
  it("extracts empty feature vector array when no students exist", async () => {
    const features = await extractStudentFeatures("inst_non_existent");
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBe(0);
  });
});
