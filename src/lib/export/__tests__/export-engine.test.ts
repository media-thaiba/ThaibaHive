import { csvFormatter } from "../csv-formatter";
import { excelFormatter } from "../excel-formatter";
import { pdfFormatter } from "../pdf-formatter";
import { ExportOptions } from "../types";

describe("Export Engine Formatter Suite (EXP-009)", () => {
  const mockOptions: ExportOptions<{ id: string; name: string; amount: number }> = {
    type: "payroll",
    format: "csv",
    title: "Payroll Summary Export",
    institutionName: "Main Campus",
    dateFrom: "2026-07-01",
    dateTo: "2026-07-31",
    columns: [
      { key: "id", header: "Emp ID" },
      { key: "name", header: "Employee Name" },
      { key: "amount", header: "Amount", align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
    ],
    data: [
      { id: "EMP-001", name: "Alice Smith", amount: 2500 },
      { id: "EMP-002", name: "Bob Jones", amount: 3200 },
    ],
  };

  it("should format CSV cleanly with BOM bytes", () => {
    const csvResult = csvFormatter.generate(mockOptions);
    expect(csvResult.contentType).toContain("text/csv");
    expect(csvResult.filename).toMatch(/payroll-export-.*\.csv$/);
    expect(csvResult.content.toString().startsWith("\uFEFF")).toBe(true);
  });

  it("should format Excel (.xlsx) buffer cleanly", async () => {
    const xlsxOptions = { ...mockOptions, format: "xlsx" as const };
    const xlsxResult = await excelFormatter.generate(xlsxOptions);
    expect(xlsxResult.contentType).toContain("spreadsheetml");
    expect(xlsxResult.filename).toMatch(/payroll-export-.*\.xlsx$/);
    expect(Buffer.isBuffer(xlsxResult.content)).toBe(true);
  });

  it("should format PDF (.pdf) buffer cleanly", async () => {
    const pdfOptions = { ...mockOptions, format: "pdf" as const };
    const pdfResult = await pdfFormatter.generate(pdfOptions);
    expect(pdfResult.contentType).toBe("application/pdf");
    expect(pdfResult.filename).toMatch(/payroll-export-.*\.pdf$/);
    expect((pdfResult.content as Buffer).toString("ascii", 0, 5)).toBe("%PDF-");
  });
});
