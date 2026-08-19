import { ExcelFormatter } from "../excel-formatter";
import { ExportOptions } from "../types";

describe("ExcelFormatter", () => {
  const formatter = new ExcelFormatter();

  it("should generate a valid XLSX binary buffer with styled sheets", async () => {
    const options: ExportOptions<{ id: string; name: string; cost: number }> = {
      type: "assets",
      format: "xlsx",
      title: "Asset Inventory Report",
      institutionName: "Main Campus",
      dateFrom: "2026-01-01",
      dateTo: "2026-07-30",
      columns: [
        { key: "id", header: "Asset ID", width: 15 },
        { key: "name", header: "Asset Name", width: 25 },
        { key: "cost", header: "Purchase Cost", align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
      ],
      data: [
        { id: "AST-001", name: "Dell XPS 15", cost: 1500 },
        { id: "AST-002", name: "=DANGEROUS_FORMULA()", cost: 800 },
      ],
    };

    const result = await formatter.generate(options);

    expect(result.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(result.filename).toMatch(/^assets-export-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(Buffer.isBuffer(result.content)).toBe(true);
    expect((result.content as Buffer).length).toBeGreaterThan(100);
  });
});
