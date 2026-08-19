import {  } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { csvFormatter } from "@/lib/export/csv-formatter";
import { excelFormatter } from "@/lib/export/excel-formatter";
import { pdfFormatter } from "@/lib/export/pdf-formatter";
import { ExportColumn } from "@/lib/export/types";
import { RegionalBenchmarkingService } from "@/lib/regional/regional-benchmarking-service";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const regionalGroupId = url.searchParams.get("regionalGroupId") || "rg_default";
  const metricDomain = (url.searchParams.get("metricDomain") || "all") as any;
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  const benchmarks = await RegionalBenchmarkingService.calculateBenchmarks({
    regionalGroupId,
    period: "30d",
    metricDomain,
  });

  const exportData = benchmarks.map((b) => ({
    rankPosition: `#${b.rankPosition}`,
    institutionId: b.institutionId,
    metricDomain: b.metricDomain,
    rawScore: b.rawScore,
    normalizedScore: b.normalizedScore,
    percentileRank: `${b.percentileRank}%`,
  }));

  const columns: ExportColumn[] = [
    { key: "rankPosition", header: "Rank" },
    { key: "institutionId", header: "Campus ID" },
    { key: "metricDomain", header: "Domain" },
    { key: "rawScore", header: "Raw Score" },
    { key: "normalizedScore", header: "Z-Score" },
    { key: "percentileRank", header: "Percentile Rank" },
  ];

  if (format === "xlsx" || format === "excel") {
    const result = await excelFormatter.generate({
      type: "regional_analytics",
      format: "xlsx",
      title: "Multi-Campus Regional Analytics & Benchmarking Ledger",
      columns,
      data: exportData,
    });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="regional-analytics-${regionalGroupId}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const result = await pdfFormatter.generate({
      type: "regional_analytics",
      format: "pdf",
      title: "Multi-Campus Regional Analytics & Benchmarking Ledger",
      columns,
      data: exportData,
    });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="regional-analytics-${regionalGroupId}.pdf"`,
      },
    });
  }

  const result = csvFormatter.generate({
    type: "regional_analytics",
    format: "csv",
    title: "Multi-Campus Regional Analytics & Benchmarking Ledger",
    columns,
    data: exportData,
  });

  return new Response(result.content as string, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="regional-analytics-${regionalGroupId}.csv"`,
    },
  });
}, "regional:view");
