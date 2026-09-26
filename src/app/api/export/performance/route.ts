import { db } from "@/db";
import { performanceReviews } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { csvFormatter } from "@/lib/export/csv-formatter";
import { excelFormatter } from "@/lib/export/excel-formatter";
import { pdfFormatter } from "@/lib/export/pdf-formatter";
import { ExportColumn } from "@/lib/export/types";
import { eq } from "drizzle-orm";

import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(async (request: Request, _session) => {
  const institutionId = (await getUserInstitutionScope()) || "inst_default";
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  const data = await db
    .select({
      id: performanceReviews.id,
      staffId: performanceReviews.staffId,
      evaluatorStaffId: performanceReviews.evaluatorStaffId,
      selfScore: performanceReviews.selfScore,
      managerScore: performanceReviews.managerScore,
      finalScore: performanceReviews.finalScore,
      grade: performanceReviews.grade,
      status: performanceReviews.status,
      createdAt: performanceReviews.createdAt,
    })
    .from(performanceReviews)
    .where(eq(performanceReviews.institutionId, institutionId))
    .all();

  const columns: ExportColumn[] = [
    { key: "staffId", header: "Staff ID" },
    { key: "selfScore", header: "Self Score" },
    { key: "managerScore", header: "Manager Score" },
    { key: "finalScore", header: "Final Score" },
    { key: "grade", header: "Grade" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Date" },
  ];

  if (format === "xlsx" || format === "excel") {
    const result = await excelFormatter.generate({
      type: "performance",
      format: "xlsx",
      title: "Staff Performance Appraisal Ledger",
      columns,
      data,
    });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="performance-appraisals.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const result = await pdfFormatter.generate({
      type: "performance",
      format: "pdf",
      title: "Staff Performance Appraisal Ledger",
      columns,
      data,
    });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="performance-appraisals.pdf"`,
      },
    });
  }

  const result = csvFormatter.generate({
    type: "performance",
    format: "csv",
    title: "Staff Performance Appraisal Ledger",
    columns,
    data,
  });

  return new Response(result.content as string, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="performance-appraisals.csv"`,
    },
  });
}, "performance:read");
