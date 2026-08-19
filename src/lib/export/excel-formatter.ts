import ExcelJS from "exceljs";
import { ExportFormatter, ExportOptions, ExportResult } from "./types";
import {  } from "./csv-formatter";

export class ExcelFormatter implements ExportFormatter {
  async generate<T = Record<string, unknown>>(options: ExportOptions<T>): Promise<ExportResult> {
    const { columns, data, type, title, institutionName, dateFrom, dateTo, metadata } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ThaibaHive Institution OS";
    workbook.created = new Date();

    const sheetName = (title || type).slice(0, 31).replace(/[*?:/\\\[\]]/g, " ");
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    // 1. Title & Metadata Banner
    let currentRowIdx = 1;

    worksheet.mergeCells(`A${currentRowIdx}:${getColLetter(columns.length)}${currentRowIdx}`);
    const titleCell = worksheet.getCell(`A${currentRowIdx}`);
    titleCell.value = (title || `${type.toUpperCase()} EXPORT`).toUpperCase();
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Slate 900
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(currentRowIdx).height = 30;
    currentRowIdx++;

    // Subheader metadata if present
    const metaParts: string[] = [];
    if (institutionName) metaParts.push(`Campus: ${institutionName}`);
    if (dateFrom || dateTo) metaParts.push(`Period: ${dateFrom || "Start"} to ${dateTo || "Present"}`);
    metaParts.push(`Generated: ${new Date().toISOString().split("T")[0]}`);

    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => {
        if (v !== undefined) metaParts.push(`${k}: ${v}`);
      });
    }

    if (metaParts.length > 0) {
      worksheet.mergeCells(`A${currentRowIdx}:${getColLetter(columns.length)}${currentRowIdx}`);
      const metaCell = worksheet.getCell(`A${currentRowIdx}`);
      metaCell.value = metaParts.join("  |  ");
      metaCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF475569" } }; // Slate 600
      metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; // Slate 50
      metaCell.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getRow(currentRowIdx).height = 20;
      currentRowIdx++;
    }

    // Blank row separator
    currentRowIdx++;

    // 2. Table Headers
    const headerRow = worksheet.getRow(currentRowIdx);
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate 800
      cell.alignment = {
        horizontal: col.align || "left",
        vertical: "middle",
      };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
      };
    });
    headerRow.height = 24;
    currentRowIdx++;

    // 3. Data Rows
    data.forEach((row, rowIdx) => {
      const dataRow = worksheet.getRow(currentRowIdx);
      const isEven = rowIdx % 2 === 0;

      columns.forEach((col, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        const raw = (row as Record<string, unknown>)[col.key];

        let formattedVal: unknown = raw;
        if (col.format) {
          formattedVal = col.format(raw, row);
        }

        // Prevent Excel formula injection
        if (typeof formattedVal === "string" && /^[=+\-@\t\r]/.test(formattedVal)) {
          cell.value = "'" + formattedVal;
        } else if (formattedVal === null || formattedVal === undefined) {
          cell.value = "";
        } else {
          cell.value = formattedVal as ExcelJS.CellValue;
        }

        cell.font = { name: "Arial", size: 9.5 };
        cell.alignment = {
          horizontal: col.align || (typeof raw === "number" ? "right" : "left"),
          vertical: "middle",
        };

        // Zebra striping
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
        };

        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      dataRow.height = 20;
      currentRowIdx++;
    });

    // 4. Auto column width calculation
    columns.forEach((col, idx) => {
      let maxLen = col.header.length;
      data.forEach((row) => {
        const raw = (row as Record<string, unknown>)[col.key];
        const valStr = col.format ? String(col.format(raw, row)) : String(raw ?? "");
        if (valStr.length > maxLen) maxLen = valStr.length;
      });

      const worksheetCol = worksheet.getColumn(idx + 1);
      worksheetCol.width = Math.min(Math.max(maxLen + 4, col.width || 12), 50);
    });

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${type}-export-${dateStr}.xlsx`;

    return {
      content: Buffer.from(buffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename,
    };
  }
}

function getColLetter(colIdx: number): string {
  let temp: number;
  let letter = "";
  while (colIdx > 0) {
    temp = (colIdx - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    colIdx = (colIdx - temp - 1) / 26;
  }
  return letter || "A";
}

export const excelFormatter = new ExcelFormatter();
