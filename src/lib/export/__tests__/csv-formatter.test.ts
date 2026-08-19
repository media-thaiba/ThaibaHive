import { CsvFormatter, sanitizeCsvValue } from "../csv-formatter";
import { ExportOptions } from "../types";

describe("CsvFormatter", () => {
  describe("sanitizeCsvValue", () => {
    it("should handle null and undefined", () => {
      expect(sanitizeCsvValue(null)).toBe("");
      expect(sanitizeCsvValue(undefined)).toBe("");
    });

    it("should pass standard strings unchanged", () => {
      expect(sanitizeCsvValue("John Doe")).toBe("John Doe");
      expect(sanitizeCsvValue(12345)).toBe("12345");
    });

    it("should escape commas, quotes, and newlines per RFC 4180", () => {
      expect(sanitizeCsvValue("Hello, World")).toBe('"Hello, World"');
      expect(sanitizeCsvValue('Quote "test"')).toBe('"Quote ""test"""');
      expect(sanitizeCsvValue("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("should prepend single quote to formula triggers (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCsvValue("=1+1")).toBe("'=1+1");
      expect(sanitizeCsvValue("+100")).toBe("'+100");
      expect(sanitizeCsvValue("-50")).toBe("'-50");
      expect(sanitizeCsvValue("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvValue("\tTabbed")).toBe("'\tTabbed");
      expect(sanitizeCsvValue("\rCarriage")).toBe('"\'\rCarriage"');
    });

    it("should quote sanitized formula values if they contain commas", () => {
      expect(sanitizeCsvValue("=SUM(A1, B1)")).toBe('"\'=SUM(A1, B1)"');
    });
  });

  describe("generate", () => {
    const formatter = new CsvFormatter();

    it("should generate CSV with UTF-8 BOM and headers", () => {
      const options: ExportOptions<{ id: string; name: string; amount: number }> = {
        type: "expenses",
        format: "csv",
        title: "Expense Report",
        columns: [
          { key: "id", header: "Claim ID" },
          { key: "name", header: "Employee Name" },
          { key: "amount", header: "Amount", format: (v) => `$${Number(v).toFixed(2)}` },
        ],
        data: [
          { id: "CLM-001", name: "Alice", amount: 150.5 },
          { id: "CLM-002", name: "=DANGEROUS()", amount: 200 },
        ],
      };

      const result = formatter.generate(options);

      expect(result.contentType).toBe("text/csv; charset=utf-8");
      expect(result.filename).toMatch(/^expenses-export-\d{4}-\d{2}-\d{2}\.csv$/);

      const contentStr = result.content.toString();
      expect(contentStr.startsWith("\uFEFF")).toBe(true);

      const lines = contentStr.replace("\uFEFF", "").trim().split("\n");
      expect(lines[0]).toBe("Claim ID,Employee Name,Amount");
      expect(lines[1]).toBe("CLM-001,Alice,$150.50");
      expect(lines[2]).toBe("CLM-002,'=DANGEROUS(),$200.00");
    });
  });
});
