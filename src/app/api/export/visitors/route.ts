import {  } from "next/server";
import { db } from "@/db";
import { visitorPasses } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { csvFormatter } from "@/lib/export/csv-formatter";
import { excelFormatter } from "@/lib/export/excel-formatter";
import { pdfFormatter } from "@/lib/export/pdf-formatter";
import { ExportColumn } from "@/lib/export/types";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  const data = await db
    .select({
      id: visitorPasses.id,
      visitorName: visitorPasses.visitorName,
      visitorPhone: visitorPasses.visitorPhone,
      purpose: visitorPasses.purpose,
      validFrom: visitorPasses.validFrom,
      validUntil: visitorPasses.validUntil,
      status: visitorPasses.status,
    })
    .from(visitorPasses)
    .all();

  const columns: ExportColumn[] = [
    { key: "visitorName", header: "Visitor Name" },
    { key: "visitorPhone", header: "Contact Phone" },
    { key: "purpose", header: "Purpose of Visit" },
    { key: "validFrom", header: "Valid From" },
    { key: "validUntil", header: "Valid Until" },
    { key: "status", header: "Gate Status" },
  ];

  if (format === "xlsx" || format === "excel") {
    const result = await excelFormatter.generate({ type: "visitors", format: "xlsx", title: "Visitor Gatekeeper Audit Trail", columns, data });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="visitor-audit.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const result = await pdfFormatter.generate({ type: "visitors", format: "pdf", title: "Visitor Gatekeeper Audit Trail", columns, data });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="visitor-audit.pdf"`,
      },
    });
  }

  const result = csvFormatter.generate({ type: "visitors", format: "csv", title: "Visitor Gatekeeper Audit Trail", columns, data });
  return new Response(result.content as string, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitor-audit.csv"`,
    },
  });

}, "visitor:read");
