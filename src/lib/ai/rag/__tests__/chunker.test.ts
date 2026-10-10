import { structureAwareChunker } from "../chunker";

describe("StructureAwareChunker", () => {
  it("should chunk a simple markdown document", async () => {
    const content = `# Header 1
${"Some content here. ".repeat(200)}

## Header 2
${"More content with a list. ".repeat(100)}

## Header 3
${"Final content that should be long enough to create multiple chunks. ".repeat(100)}`;

    console.log("[Test] Content length:", content.length);
    const chunks = await structureAwareChunker.chunkDocument(content, {
      sourceType: "policy",
      sourceId: "test-policy-1",
      institutionId: "inst-1",
      title: "Test Policy",
    });

    console.log("[Test] Chunks returned:", chunks.length);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata.sourceType).toBe("policy");
    expect(chunks[0].metadata.institutionId).toBe("inst-1");
    expect(chunks[0].metadata.title).toBe("Test Policy");
    expect(chunks[0].metadata.headingPath.length).toBeGreaterThan(0);
  });

  it("should handle table context extraction", async () => {
    const content = `| Name | Age |
| ---- | --- |
| Alice | 30 |
| Bob | 25 |

Some text after the table.`;

    const chunks = await structureAwareChunker.chunkDocument(content, {
      sourceType: "general",
      sourceId: "test-table",
      institutionId: "inst-1",
      title: "Test Table",
    });

    expect(chunks.length).toBeGreaterThan(0);
    const tableChunk = chunks.find(c => c.metadata.tableContext !== undefined);
    expect(tableChunk).toBeDefined();
    if (tableChunk) {
      expect(tableChunk.metadata.tableContext?.headers).toEqual(["Name", "Age"]);
    }
  });

  it("should handle empty content", async () => {
    const chunks = await structureAwareChunker.chunkDocument("", {
      sourceType: "general",
      sourceId: "empty",
      institutionId: "inst-1",
      title: "Empty",
    });

    expect(chunks.length).toBe(0);
  });

  it("should chunk policy document", async () => {
    const chunks = await structureAwareChunker.chunkPolicyDocument(
      "# Policy\nContent here.",
      "inst-1",
      "policy-1",
      "Test Policy"
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata.sourceType).toBe("policy");
  });
});