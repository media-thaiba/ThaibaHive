import {  } from "next/server";
import { db } from "@/db";
import { canteenTransactions } from "@/db/schema";
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
      id: canteenTransactions.id,
      passCode: canteenTransactions.passCode,
      userId: canteenTransactions.userId,
      totalAmount: canteenTransactions.totalAmount,
      status: canteenTransactions.status,
      createdAt: canteenTransactions.createdAt,
    })
    .from(canteenTransactions)
    .all();

  const columns: ExportColumn[] = [
    { key: "passCode", header: "Meal Pass Code" },
    { key: "userId", header: "User ID" },
    { key: "totalAmount", header: "Amount (INR)" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Date & Time" },
  ];

  if (format === "xlsx" || format === "excel") {
    const result = await excelFormatter.generate({ type: "canteen", format: "xlsx", title: "Canteen Sales & Meal Pass Ledger", columns, data });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="canteen-ledger.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const result = await pdfFormatter.generate({ type: "canteen", format: "pdf", title: "Canteen Sales & Meal Pass Ledger", columns, data });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="canteen-ledger.pdf"`,
      },
    });
  }

  const result = csvFormatter.generate({ type: "canteen", format: "csv", title: "Canteen Sales & Meal Pass Ledger", columns, data });
  return new Response(result.content as string, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="canteen-ledger.csv"`,
    },
  });

}, "canteen:read");
