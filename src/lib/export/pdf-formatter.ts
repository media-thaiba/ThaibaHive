import PDFDocument from "pdfkit";
import { ExportFormatter, ExportOptions, ExportResult } from "./types";
import * as fs from "fs";

export class PdfFormatter implements ExportFormatter {
  async generate<T = Record<string, unknown>>(options: ExportOptions<T>): Promise<ExportResult> {
    const { columns, data, type, title, institutionName, dateFrom, dateTo, metadata } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 36,
          size: "A4",
          layout: columns.length > 6 ? "landscape" : "portrait",
          bufferPages: true,
        });



        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          const dateStr = new Date().toISOString().split("T")[0];
          const filename = `${type}-export-${dateStr}.pdf`;

          resolve({
            content: pdfBuffer,
            contentType: "application/pdf",
            filename,
          });
        });
        doc.on("error", (err) => reject(err));

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

        // 1. Header Banner
        doc
          .rect(doc.page.margins.left, doc.page.margins.top, pageWidth, 40)
          .fill("#0F172A"); // Slate 900

        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text((title || `${type.toUpperCase()} EXPORT`).toUpperCase(), doc.page.margins.left + 12, doc.page.margins.top + 12, {
            width: pageWidth - 24,
            align: "left",
          });

        doc.y = doc.page.margins.top + 50;

        // 2. Metadata Subheader
        const metaTextParts: string[] = [];
        if (institutionName) metaTextParts.push(`Campus: ${institutionName}`);
        if (dateFrom || dateTo) metaTextParts.push(`Period: ${dateFrom || "Start"} to ${dateTo || "Present"}`);
        metaTextParts.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
        if (metadata) {
          Object.entries(metadata).forEach(([k, v]) => {
            if (v !== undefined) metaTextParts.push(`${k}: ${v}`);
          });
        }

        doc
          .fillColor("#475569")
          .fontSize(8.5)
          .font("Helvetica")
          .text(metaTextParts.join("  |  "), doc.page.margins.left, doc.y, {
            width: pageWidth,
            align: "left",
          });

        doc.moveDown(0.8);

        // Calculate Column Widths
        const totalDefinedWidth = columns.reduce((acc, col) => acc + (col.width || 20), 0);
        const colWidths = columns.map((col) => {
          const ratio = (col.width || 20) / totalDefinedWidth;
          return Math.max(Math.floor(pageWidth * ratio), 40);
        });

        const startX = doc.page.margins.left;
        let currentY = doc.y;

        // Helper to Draw Table Header
        const drawTableHeader = (y: number) => {
          doc.rect(startX, y, pageWidth, 20).fill("#1E293B"); // Slate 800

          let x = startX;
          columns.forEach((col, idx) => {
            const w = colWidths[idx];
            doc
              .fillColor("#FFFFFF")
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(col.header, x + 4, y + 5, {
                width: w - 8,
                align: col.align || "left",
                ellipsis: true,
              });
            x += w;
          });
          return y + 20;
        };

        currentY = drawTableHeader(currentY);

        // 3. Table Rows
        data.forEach((row, rowIdx) => {
          // Check page break overflow
          if (currentY + 20 > doc.page.height - doc.page.margins.bottom - 30) {
            doc.addPage();
            currentY = doc.page.margins.top;
            currentY = drawTableHeader(currentY);
          }

          const isEven = rowIdx % 2 === 0;
          if (!isEven) {
            doc.rect(startX, currentY, pageWidth, 18).fill("#F8FAFC"); // Slate 50
          }

          let x = startX;
          columns.forEach((col, idx) => {
            const w = colWidths[idx];
            const raw = (row as Record<string, unknown>)[col.key];
            const valStr = col.format ? String(col.format(raw, row)) : String(raw ?? "");

            doc
              .fillColor("#334155")
              .fontSize(8.5)
              .font("Helvetica")
              .text(valStr, x + 4, currentY + 4, {
                width: w - 8,
                align: col.align || (typeof raw === "number" ? "right" : "left"),
                ellipsis: true,
              });
            x += w;
          });

          // Row bottom border
          doc
            .moveTo(startX, currentY + 18)
            .lineTo(startX + pageWidth, currentY + 18)
            .strokeColor("#E2E8F0")
            .lineWidth(0.5)
            .stroke();

          currentY += 18;
        });

        // 4. Footers with Page Numbers
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);

          const footerY = doc.page.height - doc.page.margins.bottom + 10;
          doc
            .moveTo(doc.page.margins.left, footerY - 5)
            .lineTo(doc.page.height - doc.page.margins.left, footerY - 5)
            .strokeColor("#CBD5E1")
            .lineWidth(0.5)
            .stroke();

          doc
            .fillColor("#64748B")
            .fontSize(8)
            .font("Helvetica")
            .text(`ThaibaHive OS Export  |  Confidential`, doc.page.margins.left, footerY, {
              width: pageWidth / 2,
              align: "left",
            });

          doc
            .fillColor("#64748B")
            .fontSize(8)
            .font("Helvetica")
            .text(`Page ${i + 1} of ${totalPages}`, doc.page.margins.left + pageWidth / 2, footerY, {
              width: pageWidth / 2,
              align: "right",
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const pdfFormatter = new PdfFormatter();
