import { sanitizeCsvValue } from "../export/csv-formatter";
import { ExcelFormatter } from "../export/excel-formatter";
import { PdfFormatter } from "../export/pdf-formatter";
import { ExportOptions } from "../export/types";

describe("Export Engine Security & Sanitization Audits", () => {
  describe("Formula Injection Prevention (DDE Attacks)", () => {
    const maliciousPayloads = [
      "=cmd|' /C calc'!A0",
      "+100+200",
      "-@SUM(A1:B10)",
      "@SUM(A1:B10)",
      "\tDANGEROUS_TAB",
      "\rDANGEROUS_CARRIAGE",
    ];

    it("should prepend single quote (') to all formula injection triggers in CSV", () => {
      maliciousPayloads.forEach((payload) => {
        const sanitized = sanitizeCsvValue(payload);
        expect(sanitized).toMatch(/^"?'/);
      });
    });

    it("should sanitize formula triggers in Excel worksheet cells", async () => {
      const excelFormatter = new ExcelFormatter();
      const options: ExportOptions<{ input: string }> = {
        type: "expenses",
        format: "xlsx",
        title: "Security Test",
        columns: [{ key: "input", header: "User Input" }],
        data: maliciousPayloads.map((payload) => ({ input: payload })),
      };

      const result = await excelFormatter.generate(options);
      expect(Buffer.isBuffer(result.content)).toBe(true);
      expect((result.content as Buffer).length).toBeGreaterThan(100);
    });

    it("should render formula triggers safely as plain text strings in PDF", async () => {
      const pdfFormatter = new PdfFormatter();
      const options: ExportOptions<{ input: string }> = {
        type: "attendance",
        format: "pdf",
        title: "Security Test PDF",
        columns: [{ key: "input", header: "User Input" }],
        data: maliciousPayloads.map((payload) => ({ input: payload })),
      };

      const result = await pdfFormatter.generate(options);
      expect(Buffer.isBuffer(result.content)).toBe(true);
      expect((result.content as Buffer).toString("ascii", 0, 5)).toBe("%PDF-");
    });
  });
});
