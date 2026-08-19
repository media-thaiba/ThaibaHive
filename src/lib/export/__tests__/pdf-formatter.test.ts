import { PdfFormatter } from "../pdf-formatter";
import { ExportOptions } from "../types";

describe("PdfFormatter", () => {
  const formatter = new PdfFormatter();

  it("should generate a valid PDF binary buffer with headers and footers", async () => {
    const options: ExportOptions<{ id: string; name: string; amount: number }> = {
      type: "payroll",
      format: "pdf",
      title: "Payroll Summary Report",
      institutionName: "North Campus",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      columns: [
        { key: "id", header: "Emp ID", width: 15 },
        { key: "name", header: "Employee Name", width: 30 },
        { key: "amount", header: "Net Salary", align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
      ],
      data: Array.from({ length: 50 }).map((_, i) => ({
        id: `EMP-${100 + i}`,
        name: `Employee ${i + 1}`,
        amount: 3000 + i * 50,
      })),
    };

    const result = await formatter.generate(options);

    expect(result.contentType).toBe("application/pdf");
    expect(result.filename).toMatch(/^payroll-export-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(Buffer.isBuffer(result.content)).toBe(true);

    const pdfBuffer = result.content as Buffer;
    expect(pdfBuffer.toString("ascii", 0, 5)).toBe("%PDF-");
    expect(pdfBuffer.length).toBeGreaterThan(500);
  });
});
